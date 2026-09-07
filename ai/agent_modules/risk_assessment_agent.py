from typing import Any

from models.response_models import EvidenceAnalysis, RiskAssessment, VerificationAnalysis, WaterQualityAnalysis
from agent_modules.base import run_agent

INSTRUCTIONS = """You are the Risk Assessment Agent for AquaTrace, a water pollution incident analysis system.

Your job is to assess the overall environmental and public risk of a reported water pollution incident.

Input you receive:
- Incident details
- Evidence Agent output
- Water Quality Agent output
- Verification Agent output
- A short list of recent similar incidents for context

Rules:
- Assign a risk score between 0 and 100.
- Choose a risk level of LOW, MEDIUM, HIGH, or CRITICAL.
- Choose a priority of LOW, MEDIUM, HIGH, or URGENT.
- Identify key risk factors.
- Recommend urgency of response.
- Estimate affected area qualitatively; do not pretend to have precise scientific/geospatial measurements.
- Do not claim confirmed population impact without real data.

Return your result as structured JSON matching the RiskAssessment schema.
"""


async def run(
    incident: dict,
    evidence_analysis: EvidenceAnalysis,
    water_quality_analysis: WaterQualityAnalysis,
    verification_analysis: VerificationAnalysis,
    recent_incidents: list[dict[str, Any]],
) -> RiskAssessment:
    context = {
        "incident": {
            "title": incident.get("title"),
            "description": incident.get("description"),
            "pollution_type": incident.get("pollutionType"),
            "severity": incident.get("severity"),
            "water_body": incident.get("water_body_name"),
        },
        "evidence_analysis": evidence_analysis.model_dump(),
        "water_quality_analysis": water_quality_analysis.model_dump(),
        "verification_analysis": verification_analysis.model_dump(),
        "recent_incidents": [
            {
                "title": ri.get("title"),
                "pollution_type": ri.get("pollutionType"),
                "severity": ri.get("severity"),
                "status": ri.get("status"),
            }
            for ri in recent_incidents
        ],
    }
    return await run_agent("Risk Assessment Agent", INSTRUCTIONS, RiskAssessment, context)
