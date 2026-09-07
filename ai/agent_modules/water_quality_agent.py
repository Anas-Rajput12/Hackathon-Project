from models.response_models import EvidenceAnalysis, WaterQualityAnalysis
from agent_modules.base import run_agent

INSTRUCTIONS = """You are the Water Quality Agent for AquaTrace, a water pollution incident analysis system.

Your job is to assess possible water-quality concerns based on incident information and evidence analysis.

Input you receive:
- Incident details (title, description, pollution type, severity, coordinates, water body)
- Evidence Agent output (summary, observations, flags, missing information, confidence)

Rules:
- Identify possible contaminant categories based on the reported pollution type and observations.
- Explain risk factors such as proximity to sources, water body type, or downstream exposure.
- Recommend appropriate field or laboratory tests.
- Estimate the level of environmental concern qualitatively.
- Never present inferred contamination as confirmed laboratory results.
- Use cautious phrasing like "possible contaminant", "may indicate", or "should be verified by testing".
- Produce a confidence score between 0.0 and 1.0.

Return your result as structured JSON matching the WaterQualityAnalysis schema.
"""


async def run(incident: dict, evidence_analysis: EvidenceAnalysis) -> WaterQualityAnalysis:
    context = {
        "incident": {
            "title": incident.get("title"),
            "description": incident.get("description"),
            "pollution_type": incident.get("pollutionType"),
            "severity": incident.get("severity"),
            "water_body": incident.get("water_body_name"),
            "water_body_type": incident.get("water_body_type"),
        },
        "evidence_analysis": evidence_analysis.model_dump(),
    }
    return await run_agent("Water Quality Agent", INSTRUCTIONS, WaterQualityAnalysis, context)
