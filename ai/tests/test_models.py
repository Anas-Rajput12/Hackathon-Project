import pytest
from pydantic import ValidationError

from models.response_models import (
    EvidenceAnalysis,
    WaterQualityAnalysis,
    VerificationAnalysis,
    RiskAssessment,
    ResolutionPlan,
    FinalAnalysis,
)
from models.request_models import AnalyzeRequest, AgentOutput, AnalyzeResponse


def test_evidence_analysis_validates_confidence():
    with pytest.raises(ValidationError):
        EvidenceAnalysis(
            evidence_summary="ok",
            confidence=2.0,
        )

    out = EvidenceAnalysis(evidence_summary="ok", confidence=0.7)
    assert out.confidence == 0.7
    assert out.demo is False


def test_risk_assessment_validates_ranges():
    with pytest.raises(ValidationError):
        RiskAssessment(
            risk_score=120.0,
            risk_level="HIGH",
            priority="URGENT",
            recommended_urgency="now",
            affected_area_estimate="local",
        )

    with pytest.raises(ValidationError):
        RiskAssessment(
            risk_score=50.0,
            risk_level="INVALID",
            priority="HIGH",
            recommended_urgency="now",
            affected_area_estimate="local",
        )

    out = RiskAssessment(
        risk_score=80.0,
        risk_level="HIGH",
        priority="URGENT",
        recommended_urgency="now",
        affected_area_estimate="local",
    )
    assert out.demo is False


def test_final_analysis_demo_default():
    fa = FinalAnalysis(
        overall_risk_level="LOW",
        overall_confidence=0.5,
        summary="test",
    )
    assert fa.demo is False

    fa_demo = FinalAnalysis(
        overall_risk_level="HIGH",
        overall_confidence=0.5,
        summary="demo",
        demo=True,
    )
    assert fa_demo.demo is True


def test_analyze_request_requires_incident_id():
    req = AnalyzeRequest(incidentId="abc")
    assert req.incidentId == "abc"

    with pytest.raises(ValidationError):
        AnalyzeRequest()


def test_agent_output_defaults():
    out = AgentOutput(agent="evidence", status="COMPLETED", output={"a": 1})
    assert out.confidence is None
