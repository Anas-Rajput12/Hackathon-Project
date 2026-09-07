import traceback
from typing import Any

from agent_modules import evidence_agent, water_quality_agent, verification_agent, risk_assessment_agent, resolution_agent
from core import db
from models.response_models import FinalAnalysis

AGENT_ORDER = [
    "evidence",
    "water_quality",
    "verification",
    "risk_assessment",
    "resolution",
]


def _safe_dump(obj: Any) -> dict:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if isinstance(obj, dict):
        return obj
    return {"value": str(obj)}


def _dependency_error(agent_name: str, dependencies: list[str]) -> str:
    return (
        f"{agent_name} was not run because its required upstream analysis "
        f"failed: {', '.join(dependencies)}."
    )


def _fail_agent(incident_id: str, agent_name: str, message: str) -> None:
    db.save_agent_analysis(
        incident_id,
        agent_name,
        "FAILED",
        {"incident_id": incident_id},
        {"error": message},
        None,
    )


async def run_incident_analysis(incident_id: str, force: bool = False) -> dict[str, Any]:
    incident = db.get_incident(incident_id)
    if not incident:
        raise ValueError(f"Incident {incident_id} not found")

    if db.has_running_analysis(incident_id):
        raise ValueError("Analysis already running for this incident")

    if force:
        db.clear_agent_analyses(incident_id)

    evidence = db.get_evidence(incident_id)
    recent_incidents = db.get_recent_incidents(limit=10)

    results: dict[str, Any] = {}
    failed_agents: list[str] = []

    # Evidence Agent
    evidence_id = db.save_agent_analysis(incident_id, "evidence", "RUNNING", {"incident_id": incident_id}, None, None)
    try:
        evidence_output = await evidence_agent.run(incident, evidence)
        db.update_agent_analysis(evidence_id, "COMPLETED", _safe_dump(evidence_output), evidence_output.confidence)
        results["evidence"] = evidence_output
    except Exception as e:
        traceback.print_exc()
        db.update_agent_analysis(evidence_id, "FAILED", {"error": str(e)}, None)
        failed_agents.append("evidence")

    # Water Quality Agent
    water_quality_id = db.save_agent_analysis(incident_id, "water_quality", "RUNNING", {"incident_id": incident_id}, None, None)
    if "evidence" not in results:
        message = _dependency_error("Water Quality Agent", ["Evidence Agent"])
        db.update_agent_analysis(water_quality_id, "FAILED", {"error": message}, None)
        failed_agents.append("water_quality")
    else:
        try:
            water_quality_output = await water_quality_agent.run(incident, results["evidence"])
            db.update_agent_analysis(water_quality_id, "COMPLETED", _safe_dump(water_quality_output), water_quality_output.confidence)
            results["water_quality"] = water_quality_output
        except Exception as e:
            traceback.print_exc()
            db.update_agent_analysis(water_quality_id, "FAILED", {"error": str(e)}, None)
            failed_agents.append("water_quality")

    # Verification Agent
    verification_id = db.save_agent_analysis(incident_id, "verification", "RUNNING", {"incident_id": incident_id}, None, None)
    verification_dependencies = ["Evidence Agent", "Water Quality Agent"]
    if not all(key in results for key in ["evidence", "water_quality"]):
        message = _dependency_error("Verification Agent", verification_dependencies)
        db.update_agent_analysis(verification_id, "FAILED", {"error": message}, None)
        failed_agents.append("verification")
    else:
        try:
            verification_output = await verification_agent.run(
                incident,
                results["evidence"],
                results["water_quality"],
            )
            db.update_agent_analysis(verification_id, "COMPLETED", _safe_dump(verification_output), verification_output.verification_score)
            results["verification"] = verification_output
        except Exception as e:
            traceback.print_exc()
            db.update_agent_analysis(verification_id, "FAILED", {"error": str(e)}, None)
            failed_agents.append("verification")

    # Risk Assessment Agent
    risk_id = db.save_agent_analysis(incident_id, "risk_assessment", "RUNNING", {"incident_id": incident_id}, None, None)
    risk_dependencies = ["Evidence Agent", "Water Quality Agent", "Verification Agent"]
    if not all(key in results for key in ["evidence", "water_quality", "verification"]):
        message = _dependency_error("Risk Assessment Agent", risk_dependencies)
        db.update_agent_analysis(risk_id, "FAILED", {"error": message}, None)
        failed_agents.append("risk_assessment")
    else:
        try:
            risk_output = await risk_assessment_agent.run(
                incident,
                results["evidence"],
                results["water_quality"],
                results["verification"],
                recent_incidents,
            )
            db.update_agent_analysis(risk_id, "COMPLETED", _safe_dump(risk_output), risk_output.risk_score / 100.0)
            results["risk_assessment"] = risk_output
        except Exception as e:
            traceback.print_exc()
            db.update_agent_analysis(risk_id, "FAILED", {"error": str(e)}, None)
            failed_agents.append("risk_assessment")

    # Resolution Agent
    resolution_id = db.save_agent_analysis(incident_id, "resolution", "RUNNING", {"incident_id": incident_id}, None, None)
    resolution_dependencies = ["Evidence Agent", "Water Quality Agent", "Verification Agent", "Risk Assessment Agent"]
    if not all(key in results for key in ["evidence", "water_quality", "verification", "risk_assessment"]):
        message = _dependency_error("Resolution Agent", resolution_dependencies)
        db.update_agent_analysis(resolution_id, "FAILED", {"error": message}, None)
        failed_agents.append("resolution")
    else:
        try:
            resolution_output = await resolution_agent.run(
                incident,
                results["evidence"],
                results["water_quality"],
                results["verification"],
                results["risk_assessment"],
            )
            db.update_agent_analysis(resolution_id, "COMPLETED", _safe_dump(resolution_output), _resolution_confidence(results))
            results["resolution"] = resolution_output
        except Exception as e:
            traceback.print_exc()
            db.update_agent_analysis(resolution_id, "FAILED", {"error": str(e)}, None)
            failed_agents.append("resolution")

    final = _build_final_analysis(results, failed_agents)

    if failed_agents:
        status = "FAILED"
    else:
        status = "COMPLETED"
        _maybe_create_risk_alerts(incident_id, results)

    db.save_agent_analysis(
        incident_id,
        "final",
        status,
        {"incident_id": incident_id, "failed_agents": failed_agents},
        final.model_dump(),
        final.overall_confidence,
    )

    return {
        "incidentId": incident_id,
        "status": status,
        "failed_agents": failed_agents,
        "final": final.model_dump(),
    }


def _resolution_confidence(results: dict) -> float:
    confidences = []
    for key in ["evidence", "water_quality", "verification", "risk_assessment"]:
        val = results.get(key)
        if val is None:
            continue
        if hasattr(val, "confidence"):
            confidences.append(val.confidence)
        elif hasattr(val, "verification_score"):
            confidences.append(val.verification_score)
        elif hasattr(val, "risk_score"):
            confidences.append(val.risk_score / 100.0)
    if not confidences:
        return 0.5
    return round(sum(confidences) / len(confidences), 2)


def _build_final_analysis(results: dict, failed_agents: list[str]) -> FinalAnalysis:
    risk = results.get("risk_assessment")
    verification = results.get("verification")

    risk_level = risk.risk_level if risk else "MEDIUM"
    confidence = _resolution_confidence(results)

    if failed_agents:
        summary = (
            f"AI analysis completed with {len(failed_agents)} agent failure(s) ({', '.join(failed_agents)}). "
            "No simulated fallback output was used; resolve the failed agents before relying on this assessment."
        )
    else:
        summary = (
            f"Overall assessment indicates a {risk_level} risk incident with {round(confidence * 100)}% confidence. "
            "Review agent outputs and recommended actions before making regulatory or enforcement decisions."
        )

    next_steps = []
    resolution = results.get("resolution")
    if resolution:
        next_steps = resolution.action_plan[:5]

    return FinalAnalysis(
        overall_risk_level=risk_level,
        overall_confidence=confidence,
        summary=summary,
        recommended_next_steps=next_steps,
        demo=False,
    )


def _maybe_create_risk_alerts(incident_id: str, results: dict) -> None:
    risk = results.get("risk_assessment")
    if not risk:
        return

    risk_level = risk.risk_level
    if risk_level not in ("HIGH", "CRITICAL"):
        return

    incident = db.get_incident(incident_id)
    title = incident.get("title", "Untitled incident") if incident else "Untitled incident"

    alert_type = "CRITICAL_POLLUTION" if risk_level == "CRITICAL" else "HIGH_RISK"
    alert_title = f"{risk_level}-risk incident requires {'urgent ' if risk_level == 'CRITICAL' else ''}review"
    alert_message = (
        f"AI analysis flagged '{title}' as {risk_level} risk. "
        "Please review the AI-generated assessment and confirm next steps."
    )

    users = db.get_authority_admin_users()
    for user in users:
        db.create_alert(user["id"], alert_type, alert_title, alert_message, incident_id)
