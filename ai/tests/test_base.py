import pytest

from agent_modules.base import _mock_for_agent


def test_mock_for_agent_sets_demo_when_requested():
    out = _mock_for_agent("Evidence Agent", demo=True)
    assert out.demo is True

    out_default = _mock_for_agent("Evidence Agent")
    assert out_default.demo is True  # mock outputs themselves are marked demo


def test_mock_for_agent_unknown_name_falls_back():
    out = _mock_for_agent("Does Not Exist", demo=True)
    assert out.demo is True
