"""Tests for AITutorService – fallback mode (no LLM_API_KEY)."""

import os
import pytest

from backend.models.schemas import Exercise, ExerciseType, SkillLevel
from backend.services.ai_tutor_service import AITutorService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _no_api_key(monkeypatch):
    """Ensure LLM_API_KEY is unset so every test exercises fallback mode."""
    monkeypatch.delenv("LLM_API_KEY", raising=False)


@pytest.fixture
def service():
    return AITutorService()


@pytest.fixture
def sample_exercise():
    return Exercise(
        id="ex-1",
        type=ExerciseType.multiple_choice,
        question="What is Docker?",
        options=["A container runtime", "A database", "A language", "An OS"],
        correct_answer="A container runtime",
        difficulty=SkillLevel.beginner,
    )


# ---------------------------------------------------------------------------
# generate_explanation tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_explanation_fallback_returns_content(service):
    result = await service.generate_explanation("Docker", "containers", SkillLevel.beginner)
    assert result["fallback"] is True
    assert "containers" in result["content"]
    assert "Docker" in result["content"]


@pytest.mark.asyncio
async def test_explanation_fallback_all_skill_levels(service):
    for level in SkillLevel:
        result = await service.generate_explanation("FastAPI", "routing", level)
        assert result["fallback"] is True
        assert isinstance(result["content"], str)
        assert len(result["content"]) > 0


# ---------------------------------------------------------------------------
# generate_hint tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hint_fallback_progressive(service, sample_exercise):
    hints = []
    for attempt in range(1, 6):
        result = await service.generate_hint(sample_exercise, attempt, SkillLevel.beginner)
        assert result["fallback"] is True
        assert isinstance(result["content"], str)
        assert len(result["content"]) > 0
        hints.append(result["content"])

    # Hints for higher attempts should be at least as long as earlier ones
    for i in range(1, len(hints)):
        assert len(hints[i]) >= len(hints[i - 1])


@pytest.mark.asyncio
async def test_hint_does_not_reveal_answer(service, sample_exercise):
    for attempt in range(1, 6):
        result = await service.generate_hint(sample_exercise, attempt, SkillLevel.beginner)
        assert result["content"] != sample_exercise.correct_answer


# ---------------------------------------------------------------------------
# generate_feedback tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_feedback_fallback_contains_correct_answer(service, sample_exercise):
    result = await service.generate_feedback(sample_exercise, "A database", SkillLevel.beginner)
    assert result["fallback"] is True
    assert "A container runtime" in result["content"]


@pytest.mark.asyncio
async def test_feedback_fallback_list_answer(service):
    ex = Exercise(
        id="ex-2",
        type=ExerciseType.fill_in_blank,
        question="Name a Python web framework.",
        correct_answer=["Django", "Flask"],
        difficulty=SkillLevel.intermediate,
    )
    result = await service.generate_feedback(ex, "Express", SkillLevel.intermediate)
    assert result["fallback"] is True
    assert "Django" in result["content"] or "Flask" in result["content"]


# ---------------------------------------------------------------------------
# LLM failure fallback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_llm_failure_falls_back(monkeypatch):
    """When the API key is set but the LLM call fails, fallback is returned."""
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    # Point to a non-routable address so the call fails fast
    monkeypatch.setenv("LLM_API_BASE_URL", "http://192.0.2.1:1")
    svc = AITutorService()

    result = await svc.generate_explanation("Docker", "images", SkillLevel.beginner)
    assert result["fallback"] is True
    assert "images" in result["content"]
