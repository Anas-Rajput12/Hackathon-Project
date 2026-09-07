from models.response_models import (
    EvidenceAnalysis,
    ResolutionPlan,
    RiskAssessment,
    VerificationAnalysis,
    WaterQualityAnalysis,
)
from agent_modules.base import run_agent

INSTRUCTIONS = """You are the Resolution / Negotiation Agent for AquaTrace, a water pollution incident analysis system.

Your job is to recommend practical next steps for authority and inspector users.

Input you receive:
- Incident details
- Evidence Agent output
- Water Quality Agent output
- Verification Agent output
- Risk Assessment output

Rules:
- Generate a practical action plan.
- Recommend next investigation steps.
- Recommend authority response.
- Identify relevant stakeholders.
- Suggest a timeline.
- Suggest escalation when appropriate.
- This agent recommends actions only. It must NOT autonomously perform legal or enforcement actions.
- Use cautious language; decisions remain with human authorities.

Return your result as structured JSON matching the ResolutionPlan schema.
"""


async def run(
    incident: dict,
    evidence_analysis: EvidenceAnalysis,
    water_quality_analysis: WaterQualityAnalysis,
    verification_analysis: VerificationAnalysis,
    risk_assessment: RiskAssessment,
) -> ResolutionPlan:
    context = {
        "incident": {
            "title": incident.get("title"),
            "description": incident.get("description"),
            "pollution_type": incident.get("pollutionType"),
            "severity": incident.get("severity"),
            "status": incident.get("status"),
            "water_body": incident.get("water_body_name"),
        },
        "evidence_analysis": evidence_analysis.model_dump(),
        "water_quality_analysis": water_quality_analysis.model_dump(),
        "verification_analysis": verification_analysis.model_dump(),
        "risk_assessment": risk_assessment.model_dump(),
    }
    return await run_agent("Resolution Agent", INSTRUCTIONS, ResolutionPlan, context)
