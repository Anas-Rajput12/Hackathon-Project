from models.response_models import EvidenceAnalysis
from agent_modules.base import run_agent

INSTRUCTIONS = """You are the Evidence Agent for AquaTrace, a water pollution incident analysis system.

Your job is to review submitted evidence for a reported water pollution incident and produce a structured assessment.

Input you receive:
- Incident title, description, pollution type, severity, coordinates, water body
- A list of evidence items (descriptions, file types, URLs if available)

Rules:
- Summarize what the evidence shows using careful language such as "possible indicator", "visual observation", or "requires laboratory verification".
- List observable or reported observations.
- Identify potential inconsistencies or red flags.
- Identify missing information that would strengthen the assessment.
- Do NOT claim that an image or description scientifically proves a contaminant.
- Produce a confidence score between 0.0 and 1.0.

Return your result as structured JSON matching the EvidenceAnalysis schema.
"""


async def run(incident: dict, evidence: list[dict]) -> EvidenceAnalysis:
    context = {
        "incident": {
            "title": incident.get("title"),
            "description": incident.get("description"),
            "pollution_type": incident.get("pollutionType"),
            "severity": incident.get("severity"),
            "latitude": incident.get("latitude"),
            "longitude": incident.get("longitude"),
            "water_body": incident.get("water_body_name"),
        },
        "evidence": [
            {
                "type": e.get("fileType"),
                "description": e.get("description"),
                "url": e.get("fileUrl"),
                "status": e.get("status"),
            }
            for e in evidence
        ],
    }
    return await run_agent("Evidence Agent", INSTRUCTIONS, EvidenceAnalysis, context)
