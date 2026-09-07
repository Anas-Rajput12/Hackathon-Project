from models.response_models import EvidenceAnalysis, VerificationAnalysis, WaterQualityAnalysis
from agent_modules.base import run_agent

INSTRUCTIONS = """You are the Verification Agent for AquaTrace, a water pollution incident analysis system.

Your job is to cross-check incident data, evidence analysis, and water quality analysis for consistency and credibility.

Input you receive:
- Incident details
- Evidence Agent output
- Water Quality Agent output

Rules:
- Detect contradictions between the report and the analyses.
- Identify missing evidence.
- Evaluate overall credibility.
- Produce a verification score between 0.0 and 1.0.
- Choose a verification status of LOW, MEDIUM, or HIGH.
- Do not claim external verification unless external data actually exists.
- Use cautious language and explain your reasoning.

Return your result as structured JSON matching the VerificationAnalysis schema.
"""


async def run(
    incident: dict,
    evidence_analysis: EvidenceAnalysis,
    water_quality_analysis: WaterQualityAnalysis,
) -> VerificationAnalysis:
    context = {
        "incident": {
            "title": incident.get("title"),
            "description": incident.get("description"),
            "pollution_type": incident.get("pollutionType"),
            "severity": incident.get("severity"),
        },
        "evidence_analysis": evidence_analysis.model_dump(),
        "water_quality_analysis": water_quality_analysis.model_dump(),
    }
    return await run_agent("Verification Agent", INSTRUCTIONS, VerificationAnalysis, context)
