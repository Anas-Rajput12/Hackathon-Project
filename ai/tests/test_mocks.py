from agent_modules.mock_outputs import (
    evidence_mock,
    water_quality_mock,
    verification_mock,
    risk_assessment_mock,
    resolution_mock,
)


def test_all_mocks_are_demo():
    assert evidence_mock().demo is True
    assert water_quality_mock().demo is True
    assert verification_mock().demo is True
    assert risk_assessment_mock().demo is True
    assert resolution_mock().demo is True


def test_mock_confidence_in_range():
    assert 0 <= evidence_mock().confidence <= 1
    assert 0 <= water_quality_mock().confidence <= 1
    assert 0 <= verification_mock().verification_score <= 1
    assert 0 <= risk_assessment_mock().risk_score <= 100
