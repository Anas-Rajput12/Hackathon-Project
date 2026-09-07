from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from core.auth import verify_service_secret
from core import db
from core.pipeline import run_incident_analysis
from models.request_models import AnalyzeRequest, AgentOutput, AnalyzeResponse, AnalysisStatusResponse

router = APIRouter(prefix="/analyze", tags=["analyze"])


def _to_agent_output(row: dict) -> AgentOutput:
    return AgentOutput(
        agent=row["agent_name"],
        status=row["status"],
        output=row.get("output") or {},
        confidence=row.get("confidence"),
    )


def _extract_final(rows: list[dict]) -> dict | None:
    for row in rows:
        if row.get("agent_name") == "final":
            return row.get("output") or {}
    return None


@router.post("/incident", response_model=AnalyzeResponse)
async def analyze_incident(
    body: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    secret: str = Depends(verify_service_secret),
) -> AnalyzeResponse:
    incident = db.get_incident(body.incidentId)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    if db.has_running_analysis(body.incidentId):
        rows = db.get_agent_analyses(body.incidentId)
        return AnalyzeResponse(
            incidentId=body.incidentId,
            status="RUNNING",
            pipeline=[_to_agent_output(r) for r in rows if r.get("agent_name") != "final"],
            final=_extract_final(rows),
        )

    # A prior process may have stopped after leaving RUNNING rows behind.
    # Clear that stale attempt before starting a fresh real analysis.
    db.clear_agent_analyses(body.incidentId)
    background_tasks.add_task(_run_pipeline_safe, body.incidentId)

    rows = db.get_agent_analyses(body.incidentId)
    return AnalyzeResponse(
        incidentId=body.incidentId,
        status="RUNNING",
        pipeline=[_to_agent_output(r) for r in rows if r.get("agent_name") != "final"],
        final=_extract_final(rows),
    )


def _run_pipeline_safe(incident_id: str) -> None:
    import asyncio
    try:
        asyncio.run(run_incident_analysis(incident_id))
    except Exception as error:
        # Persist background failures so the web client can show the real
        # reason instead of polling forever with an empty analysis.
        db.fail_running_analyses(incident_id, str(error))
        db.save_agent_analysis(
            incident_id,
            "final",
            "FAILED",
            {"incidentId": incident_id},
            {
                "overall_risk_level": "MEDIUM",
                "overall_confidence": 0,
                "summary": f"Real AI analysis failed: {error}",
                "recommended_next_steps": [],
                "error": str(error),
                "demo": False,
            },
            None,
        )


@router.get("/status/{incident_id}", response_model=AnalysisStatusResponse)
async def analysis_status(
    incident_id: str,
    secret: str = Depends(verify_service_secret),
) -> AnalysisStatusResponse:
    incident = db.get_incident(incident_id)
    if not incident:
        return AnalysisStatusResponse(
            incidentId=incident_id,
            overall_status="NOT_FOUND",
            pipeline=[],
        )

    rows = db.get_agent_analyses(incident_id)
    if not rows:
        return AnalysisStatusResponse(
            incidentId=incident_id,
            overall_status="PENDING",
            pipeline=[],
        )

    statuses = {r["status"] for r in rows}
    if "FAILED" in statuses:
        overall = "FAILED"
    elif "RUNNING" in statuses:
        overall = "RUNNING"
    elif statuses == {"COMPLETED"}:
        overall = "COMPLETED"
    else:
        overall = "PENDING"

    return AnalysisStatusResponse(
        incidentId=incident_id,
        overall_status=overall,
        pipeline=[_to_agent_output(r) for r in rows if r.get("agent_name") != "final"],
        final=_extract_final(rows),
    )
