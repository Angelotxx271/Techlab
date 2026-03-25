"""Tests for AIInstructorService – fallback mode (no LLM_API_KEY)."""

import pytest
from datetime import datetime, timezone, timedelta

from backend.models.schemas import (
    InstructorGuidance,
    LearnerProgressPayload,
    NextStepRecommendation,
    SkillLevel,
    WeakArea,
)
from backend.services.ai_instructor_service import AIInstructorService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _no_api_key(monkeypatch):
    """Ensure LLM_API_KEY is unset so every test exercises fallback mode."""
    monkeypatch.delenv("LLM_API_KEY", raising=False)


@pytest.fixture
def service():
    return AIInstructorService()


@pytest.fixture
def empty_progress():
    return LearnerProgressPayload(
        completed_modules={},
        current_module={},
        exercise_accuracy={},
        interests=["docker", "fastapi"],
        skill_level=SkillLevel.beginner,
    )


@pytest.fixture
def active_progress():
    return LearnerProgressPayload(
        completed_modules={
            "docker": ["01-containers-basics"],
            "fastapi": ["01-intro"],
        },
        current_module={"docker": "02-images-and-compose", "fastapi": "02-routes-and-models"},
        exercise_accuracy={
            "01-containers-basics": 0.85,
            "01-intro": 0.45,  # weak area — below 60%
        },
        interests=["docker", "fastapi", "aws"],
        skill_level=SkillLevel.intermediate,
    )


@pytest.fixture
def stale_progress():
    """Progress with last activity > 3 days ago."""
    ts = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    return LearnerProgressPayload(
        completed_modules={"docker": ["01-containers-basics"]},
        current_module={"docker": "02-images-and-compose"},
        exercise_accuracy={"01-containers-basics": 0.9},
        interests=["docker"],
        skill_level=SkillLevel.beginner,
        last_activity_timestamp=ts,
    )


@pytest.fixture
def recent_progress():
    """Progress with last activity within 3 days."""
    ts = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
    return LearnerProgressPayload(
        completed_modules={"docker": ["01-containers-basics"]},
        current_module={"docker": "02-images-and-compose"},
        exercise_accuracy={"01-containers-basics": 0.9},
        interests=["docker"],
        skill_level=SkillLevel.beginner,
        last_activity_timestamp=ts,
    )


# ---------------------------------------------------------------------------
# generate_guidance tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_guidance_returns_valid_structure(service, active_progress):
    result = await service.generate_guidance(active_progress, goals=["learn docker"])
    assert isinstance(result, InstructorGuidance)
    assert len(result.progress_summary) > 0
    assert len(result.motivational_message) > 0


@pytest.mark.asyncio
async def test_guidance_empty_progress(service, empty_progress):
    result = await service.generate_guidance(empty_progress, goals=[])
    assert isinstance(result, InstructorGuidance)
    assert len(result.progress_summary) > 0
    assert len(result.motivational_message) > 0
    assert result.weak_areas == []


@pytest.mark.asyncio
async def test_guidance_detects_weak_areas(service, active_progress):
    result = await service.generate_guidance(active_progress, goals=[])
    weak_ids = [wa.module_id for wa in result.weak_areas]
    assert "01-intro" in weak_ids
    # Module with 85% accuracy should NOT be a weak area
    assert "01-containers-basics" not in weak_ids


@pytest.mark.asyncio
async def test_guidance_weak_area_has_review_recommendation(service, active_progress):
    result = await service.generate_guidance(active_progress, goals=[])
    review_recs = [r for r in result.recommendations if r.type == "review_module"]
    review_module_ids = [r.module_id for r in review_recs]
    # Every weak area should have a corresponding review recommendation
    for wa in result.weak_areas:
        assert wa.module_id in review_module_ids


@pytest.mark.asyncio
async def test_guidance_includes_continue_path_recs(service, active_progress):
    result = await service.generate_guidance(active_progress, goals=[])
    continue_recs = [r for r in result.recommendations if r.type == "continue_path"]
    assert len(continue_recs) > 0


@pytest.mark.asyncio
async def test_guidance_suggests_new_paths_from_interests(service, active_progress):
    result = await service.generate_guidance(active_progress, goals=[])
    new_path_recs = [r for r in result.recommendations if r.type == "start_new_path"]
    new_path_ids = [r.path_id for r in new_path_recs]
    # "aws" is in interests but not started
    assert "aws" in new_path_ids


@pytest.mark.asyncio
async def test_guidance_re_engagement_when_stale(service, stale_progress):
    result = await service.generate_guidance(stale_progress, goals=[])
    assert result.re_engagement_message is not None
    assert len(result.re_engagement_message) > 0


@pytest.mark.asyncio
async def test_guidance_no_re_engagement_when_recent(service, recent_progress):
    result = await service.generate_guidance(recent_progress, goals=[])
    assert result.re_engagement_message is None


@pytest.mark.asyncio
async def test_guidance_no_re_engagement_when_no_timestamp(service, empty_progress):
    result = await service.generate_guidance(empty_progress, goals=[])
    assert result.re_engagement_message is None


# ---------------------------------------------------------------------------
# suggest_next_step tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_next_step_returns_valid_structure(service, active_progress):
    result = await service.suggest_next_step(active_progress, "01-containers-basics")
    assert isinstance(result, NextStepRecommendation)
    assert result.type in ("continue_path", "review_module", "start_new_path")
    assert len(result.path_id) > 0
    assert len(result.reason) > 0


@pytest.mark.asyncio
async def test_next_step_suggests_review_for_weak_area(service, active_progress):
    """When weak areas exist, next step should suggest reviewing them."""
    result = await service.suggest_next_step(active_progress, "01-containers-basics")
    # 01-intro has 45% accuracy, so review should be suggested
    assert result.type == "review_module"
    assert result.module_id == "01-intro"


@pytest.mark.asyncio
async def test_next_step_continues_path_when_no_weak_areas(service):
    progress = LearnerProgressPayload(
        completed_modules={"docker": ["01-containers-basics"]},
        current_module={"docker": "02-images-and-compose"},
        exercise_accuracy={"01-containers-basics": 0.9},
        interests=["docker"],
        skill_level=SkillLevel.intermediate,
    )
    result = await service.suggest_next_step(progress, "01-containers-basics")
    assert result.type == "continue_path"
    assert result.path_id == "docker"


@pytest.mark.asyncio
async def test_next_step_suggests_new_path_from_interests(service):
    progress = LearnerProgressPayload(
        completed_modules={"docker": ["01-containers-basics"]},
        current_module={},
        exercise_accuracy={"01-containers-basics": 0.9},
        interests=["docker", "fastapi"],
        skill_level=SkillLevel.beginner,
    )
    result = await service.suggest_next_step(progress, "01-containers-basics")
    assert result.type == "start_new_path"
    assert result.path_id == "fastapi"


# ---------------------------------------------------------------------------
# generate_motivation tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_motivation_empty_progress(service, empty_progress):
    result = await service.generate_motivation(empty_progress)
    assert isinstance(result, str)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_motivation_active_progress(service, active_progress):
    result = await service.generate_motivation(active_progress)
    assert isinstance(result, str)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_motivation_varies_by_completion_count(service):
    """Different completion counts should produce different messages."""
    p1 = LearnerProgressPayload(
        completed_modules={},
        current_module={},
        exercise_accuracy={},
        interests=[],
        skill_level=SkillLevel.beginner,
    )
    p2 = LearnerProgressPayload(
        completed_modules={"a": ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10"]},
        current_module={},
        exercise_accuracy={},
        interests=[],
        skill_level=SkillLevel.advanced,
    )
    msg1 = await service.generate_motivation(p1)
    msg2 = await service.generate_motivation(p2)
    assert msg1 != msg2


# ---------------------------------------------------------------------------
# Recommendation structural validity
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_all_recommendations_have_valid_type(service, active_progress):
    result = await service.generate_guidance(active_progress, goals=["learn aws"])
    valid_types = {"continue_path", "review_module", "start_new_path"}
    for rec in result.recommendations:
        assert rec.type in valid_types
        assert len(rec.path_id) > 0
        assert len(rec.reason) > 0


# ---------------------------------------------------------------------------
# LLM failure fallback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_llm_failure_falls_back(monkeypatch):
    """When the API key is set but the LLM call fails, fallback is returned."""
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    svc = AIInstructorService()

    # Patch _call_llm to simulate failure
    async def _fail(self, prompt):
        return None

    monkeypatch.setattr(AIInstructorService, "_call_llm", _fail)

    progress = LearnerProgressPayload(
        completed_modules={"docker": ["01-containers-basics"]},
        current_module={"docker": "02-images-and-compose"},
        exercise_accuracy={"01-containers-basics": 0.5},
        interests=["docker"],
        skill_level=SkillLevel.beginner,
    )
    result = await svc.generate_guidance(progress, goals=[])
    assert isinstance(result, InstructorGuidance)
    assert len(result.progress_summary) > 0
    assert len(result.motivational_message) > 0


@pytest.mark.asyncio
async def test_llm_failure_next_step_falls_back(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    svc = AIInstructorService()

    async def _fail(self, prompt):
        return None

    monkeypatch.setattr(AIInstructorService, "_call_llm", _fail)

    progress = LearnerProgressPayload(
        completed_modules={"docker": ["01-containers-basics"]},
        current_module={"docker": "02-images-and-compose"},
        exercise_accuracy={"01-containers-basics": 0.9},
        interests=["docker"],
        skill_level=SkillLevel.beginner,
    )
    result = await svc.suggest_next_step(progress, "01-containers-basics")
    assert isinstance(result, NextStepRecommendation)
    assert len(result.reason) > 0


@pytest.mark.asyncio
async def test_llm_failure_motivation_falls_back(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    svc = AIInstructorService()

    async def _fail(self, prompt):
        return None

    monkeypatch.setattr(AIInstructorService, "_call_llm", _fail)

    progress = LearnerProgressPayload(
        completed_modules={"docker": ["01-containers-basics"]},
        current_module={},
        exercise_accuracy={},
        interests=[],
        skill_level=SkillLevel.beginner,
    )
    result = await svc.generate_motivation(progress)
    assert isinstance(result, str)
    assert len(result) > 0
