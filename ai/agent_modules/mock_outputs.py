from models.response_models import (
    EvidenceAnalysis,
    WaterQualityAnalysis,
    VerificationAnalysis,
    RiskAssessment,
    ResolutionPlan,
)


def evidence_mock() -> EvidenceAnalysis:
    return EvidenceAnalysis(
        evidence_summary="Submitted evidence includes descriptions and any URLs provided. Visual or descriptive indicators are present but require laboratory confirmation.",
        observations=["reported discoloration or unusual discharge", "location and time appear consistent with report"],
        flags=["no independent laboratory verification available"],
        missing_information=["water sample laboratory results", "additional photos from different angles"],
        confidence=0.65,
        demo=True,
    )


def water_quality_mock() -> WaterQualityAnalysis:
    return WaterQualityAnalysis(
        quality_assessment="Based on the reported pollution type and description, there may be water quality concerns. This is an inference, not a laboratory result.",
        possible_contaminants=["suspended solids", "organic or chemical pollutants matching the reported type"],
        risk_factors=["proximity to reported source", "potential downstream exposure"],
        recommended_tests=["pH and conductivity", "targeted contaminant panel", "dissolved oxygen"],
        confidence=0.6,
        demo=True,
    )


def verification_mock() -> VerificationAnalysis:
    return VerificationAnalysis(
        verification_score=0.6,
        verification_status="MEDIUM",
        anomaly_flags=["insufficient independent evidence to fully corroborate"],
        missing_evidence=["laboratory analysis", "third-party field observation"],
        reasoning_summary="The report is internally consistent but lacks independent corroborating evidence. Confidence is moderate.",
        demo=True,
    )


def risk_assessment_mock() -> RiskAssessment:
    return RiskAssessment(
        risk_score=55.0,
        risk_level="MEDIUM",
        priority="HIGH",
        risk_factors=["reported severity", "potential environmental exposure", "uncertainty in extent"],
        recommended_urgency="Schedule field inspection and sampling promptly.",
        affected_area_estimate="Localized area near the reported coordinates; precise extent cannot be determined without field measurement.",
        demo=True,
    )


def resolution_mock() -> ResolutionPlan:
    return ResolutionPlan(
        action_plan=[
            "Deploy inspector to collect field observations and water samples",
            "Request laboratory analysis for reported contamination type",
            "Issue preliminary advisory if public exposure is possible",
        ],
        urgency="Prompt inspection recommended within 24-72 hours.",
        recommended_timeline="Initial response: 1-3 days. Full assessment depends on lab turnaround.",
        stakeholders=["assigned inspector", "reporting authority", "water quality laboratory"],
        escalation_reason="",
        summary="A practical first-response plan focused on verification and safe containment while awaiting laboratory results.",
        demo=True,
    )
