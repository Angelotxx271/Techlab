"""AI Instructor Service — high-level learning strategy and progress coaching.

The AI Instructor is distinct from the AI Tutor:
- AI Tutor: in-module concept explanations, hints, and exercise feedback
- AI Instructor: cross-path progress analysis, weak-area detection, next-step
  recommendations, and motivational coaching

When ``GEMINI_API_KEY`` is not set or the API call fails, every method returns
deterministic fallback content so the feature degrades gracefully.
"""

import os
from datetime import datetime, timezone
from typing import Any

from backend.models.schemas import (
    InstructorGuidance,
    LearnerProgressPayload,
    NextStepRecommendation,
    WeakArea,
)

_WEAK_AREA_THRESHOLD = 0.6
_RE_ENGAGEMENT_DAYS = 3


def _identify_weak_areas(progress: LearnerProgressPayload) -> list[WeakArea]:
    """Return modules whose accuracy is below the threshold."""
    weak: list[WeakArea] = []
    for module_id, accuracy in progress.exercise_accuracy.items():
        if accuracy < _WEAK_AREA_THRESHOLD:
            path_id = _find_path_for_module(progress, module_id)
            weak.append(
                WeakArea(
                    path_id=path_id,
                    module_id=module_id,
                    module_title=module_id,
                    accuracy=accuracy,
                )
            )
    return weak


def _find_path_for_module(progress: LearnerProgressPayload, module_id: str) -> str:
    """Best-effort lookup of the path that owns *module_id*."""
    for path_id, modules in progress.completed_modules.items():
        if module_id in modules:
            return path_id
    for path_id, current in progress.current_module.items():
        if current == module_id:
            return path_id
    return "unknown"


def _build_recommendations(
    progress: LearnerProgressPayload,
    weak_areas: list[WeakArea],
    goals: list[str],
) -> list[NextStepRecommendation]:
    """Generate deterministic next-step recommendations."""
    recs: list[NextStepRecommendation] = []

    for wa in weak_areas:
        recs.append(
            NextStepRecommendation(
                type="review_module",
                path_id=wa.path_id,
                module_id=wa.module_id,
                reason=(
                    f"Your accuracy in {wa.module_id} is {wa.accuracy:.0%}, "
                    f"which is below 60%. Reviewing this module will strengthen "
                    f"your foundation."
                ),
            )
        )

    for path_id, module_id in progress.current_module.items():
        recs.append(
            NextStepRecommendation(
                type="continue_path",
                path_id=path_id,
                module_id=module_id,
                reason=f"Continue where you left off in {path_id}.",
            )
        )

    started_paths = set(progress.completed_modules.keys()) | set(
        progress.current_module.keys()
    )
    for interest in progress.interests:
        if interest not in started_paths:
            recs.append(
                NextStepRecommendation(
                    type="start_new_path",
                    path_id=interest,
                    reason=f"You expressed interest in {interest}. Start this path to broaden your skills.",
                )
            )

    return recs


def _build_progress_summary(progress: LearnerProgressPayload) -> str:
    total_completed = sum(len(m) for m in progress.completed_modules.values())
    paths_in_progress = len(progress.current_module)
    paths_completed_count = len(progress.completed_modules)

    if total_completed == 0 and paths_in_progress == 0:
        return (
            "You're just getting started! Pick a learning path that interests "
            "you and dive in."
        )

    parts: list[str] = []
    parts.append(
        f"You've completed {total_completed} module{'s' if total_completed != 1 else ''} "
        f"across {paths_completed_count} path{'s' if paths_completed_count != 1 else ''}."
    )
    if paths_in_progress:
        parts.append(
            f"You have {paths_in_progress} path{'s' if paths_in_progress != 1 else ''} "
            f"in progress."
        )
    return " ".join(parts)


def _build_motivational_message(progress: LearnerProgressPayload) -> str:
    total_completed = sum(len(m) for m in progress.completed_modules.values())

    if total_completed == 0:
        return "Every expert was once a beginner. Start your first module today!"
    if total_completed < 3:
        return "Great start! Keep the momentum going — consistency is key."
    if total_completed < 10:
        return (
            f"Impressive — {total_completed} modules completed! "
            "You're building a solid foundation."
        )
    return (
        f"Outstanding progress — {total_completed} modules completed! "
        "You're well on your way to mastery."
    )


def _check_re_engagement(progress: LearnerProgressPayload) -> str | None:
    if not progress.last_activity_timestamp:
        return None
    try:
        last_activity = datetime.fromisoformat(
            progress.last_activity_timestamp.replace("Z", "+00:00")
        )
        now = datetime.now(timezone.utc)
        delta = now - last_activity
        if delta.days > _RE_ENGAGEMENT_DAYS:
            return (
                f"Welcome back! It's been {delta.days} days since your last session. "
                "Pick up where you left off — even 15 minutes of practice makes a difference."
            )
    except (ValueError, TypeError):
        pass
    return None


def _fallback_guidance(
    progress: LearnerProgressPayload, goals: list[str]
) -> InstructorGuidance:
    weak_areas = _identify_weak_areas(progress)
    recommendations = _build_recommendations(progress, weak_areas, goals)
    return InstructorGuidance(
        progress_summary=_build_progress_summary(progress),
        weak_areas=weak_areas,
        recommendations=recommendations,
        motivational_message=_build_motivational_message(progress),
        re_engagement_message=_check_re_engagement(progress),
    )


def _fallback_next_step(
    progress: LearnerProgressPayload, completed_module: str
) -> NextStepRecommendation:
    path_id = _find_path_for_module(progress, completed_module)

    for module_id, accuracy in progress.exercise_accuracy.items():
        if accuracy < _WEAK_AREA_THRESHOLD and module_id != completed_module:
            return NextStepRecommendation(
                type="review_module",
                path_id=_find_path_for_module(progress, module_id),
                module_id=module_id,
                reason=(
                    f"Before moving on, consider reviewing {module_id} where "
                    f"your accuracy is {accuracy:.0%}."
                ),
            )

    if path_id in progress.current_module:
        next_mod = progress.current_module[path_id]
        if next_mod != completed_module:
            return NextStepRecommendation(
                type="continue_path",
                path_id=path_id,
                module_id=next_mod,
                reason=f"Continue with the next module in {path_id}.",
            )

    started = set(progress.completed_modules.keys()) | set(
        progress.current_module.keys()
    )
    for interest in progress.interests:
        if interest not in started:
            return NextStepRecommendation(
                type="start_new_path",
                path_id=interest,
                reason=f"You've shown interest in {interest}. Start this path next!",
            )

    return NextStepRecommendation(
        type="continue_path",
        path_id=path_id,
        reason="Keep going — you're making great progress on this path!",
    )


def _fallback_motivation(progress: LearnerProgressPayload) -> str:
    return _build_motivational_message(progress)


def _build_guidance_prompt(
    progress: LearnerProgressPayload, goals: list[str], weak_areas: list[WeakArea]
) -> str:
    weak_str = ", ".join(
        f"{wa.module_id} ({wa.accuracy:.0%})" for wa in weak_areas
    ) or "none detected"
    total = sum(len(m) for m in progress.completed_modules.values())
    goals_str = ", ".join(goals) if goals else "not specified"

    return (
        "You are an AI learning instructor providing high-level learning strategy.\n"
        "You are NOT an in-module tutor — focus on overall progress coaching.\n\n"
        f"Learner skill level: {progress.skill_level.value}\n"
        f"Modules completed: {total}\n"
        f"Weak areas (accuracy < 60%): {weak_str}\n"
        f"Learner goals: {goals_str}\n\n"
        "Provide:\n"
        "1. A brief progress summary (2-3 sentences)\n"
        "2. Specific recommendations for improvement\n"
        "3. A short motivational message\n"
        "Keep the total response under 200 words."
    )


def _build_next_step_prompt(
    progress: LearnerProgressPayload, completed_module: str
) -> str:
    total = sum(len(m) for m in progress.completed_modules.values())
    interests = ", ".join(progress.interests) if progress.interests else "general"

    return (
        "You are an AI learning instructor suggesting the next learning step.\n\n"
        f"The learner just completed module: {completed_module}\n"
        f"Skill level: {progress.skill_level.value}\n"
        f"Total modules completed: {total}\n"
        f"Interests: {interests}\n\n"
        "Suggest the single best next step. Be specific and concise (under 50 words)."
    )


def _build_motivation_prompt(progress: LearnerProgressPayload) -> str:
    total = sum(len(m) for m in progress.completed_modules.values())
    return (
        "You are an encouraging AI learning coach.\n\n"
        f"The learner has completed {total} modules at the "
        f"{progress.skill_level.value} level.\n\n"
        "Write a short, genuine motivational message (1-2 sentences). "
        "Be warm but not cheesy."
    )


class AIInstructorService:
    """Provides high-level learning strategy, progress analysis, and motivation.

    When ``GEMINI_API_KEY`` is not set or the API call fails, every method
    returns deterministic fallback content.
    """

    def __init__(self) -> None:
        self._api_key: str | None = os.environ.get("GEMINI_API_KEY")
        self._client = None
        if self._api_key:
            from google import genai
            self._client = genai.Client(api_key=self._api_key)

    async def generate_guidance(
        self, progress: LearnerProgressPayload, goals: list[str]
    ) -> InstructorGuidance:
        weak_areas = _identify_weak_areas(progress)
        recommendations = _build_recommendations(progress, weak_areas, goals)
        re_engagement = _check_re_engagement(progress)

        if not self._client:
            return _fallback_guidance(progress, goals)

        prompt = _build_guidance_prompt(progress, goals, weak_areas)
        llm_content = await self._call_gemini(prompt)

        if llm_content is None:
            return _fallback_guidance(progress, goals)

        return InstructorGuidance(
            progress_summary=llm_content,
            weak_areas=weak_areas,
            recommendations=recommendations,
            motivational_message=_build_motivational_message(progress),
            re_engagement_message=re_engagement,
        )

    async def suggest_next_step(
        self, progress: LearnerProgressPayload, completed_module: str
    ) -> NextStepRecommendation:
        if not self._client:
            return _fallback_next_step(progress, completed_module)

        prompt = _build_next_step_prompt(progress, completed_module)
        llm_content = await self._call_gemini(prompt)

        if llm_content is None:
            return _fallback_next_step(progress, completed_module)

        fallback = _fallback_next_step(progress, completed_module)
        return NextStepRecommendation(
            type=fallback.type,
            path_id=fallback.path_id,
            module_id=fallback.module_id,
            reason=llm_content,
        )

    async def generate_motivation(
        self, progress: LearnerProgressPayload
    ) -> str:
        if not self._client:
            return _fallback_motivation(progress)

        prompt = _build_motivation_prompt(progress)
        llm_content = await self._call_gemini(prompt)

        if llm_content is None:
            return _fallback_motivation(progress)

        return llm_content

    async def _call_gemini(self, prompt: str) -> str | None:
        """Call Gemini via the google-genai SDK.

        Returns the text response on success, or ``None`` on any failure
        so callers can fall back to deterministic content.
        """
        model = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")
        try:
            response = self._client.models.generate_content(
                model=model,
                contents=prompt,
            )
            return response.text
        except Exception:
            return None
