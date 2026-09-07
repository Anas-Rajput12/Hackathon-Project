from typing import Literal, Optional

from pydantic import BaseModel, Field

from models.response_models import (
    EvidenceAnalysis,
    WaterQualityAnalysis,
    VerificationAnalysis,
    RiskAssessment,
    ResolutionPlan,
)


class AnalyzeRequest(BaseModel):
    incidentId: str = Field(..., description="AquaTrace incident ID to analyze.")


class AgentOutput(BaseModel):
    agent: str
    status: Literal["PENDING", "RUNNING", "COMPLETED", "FAILED"]
    output: dict
    confidence: Optional[float] = None


class AnalyzeResponse(BaseModel):
    incidentId: str
    status: Literal["PENDING", "RUNNING", "COMPLETED", "FAILED"]
    pipeline: list[AgentOutput]
    final: Optional[dict] = None


class AnalysisStatusResponse(BaseModel):
    incidentId: str
    overall_status: Literal["PENDING", "RUNNING", "COMPLETED", "FAILED", "NOT_FOUND"]
    pipeline: list[AgentOutput]
    final: Optional[dict] = None
