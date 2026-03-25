import os
from typing import Any

from backend.models.schemas import Exercise, SkillLevel


_PROGRESSIVE_HINTS = [
    "Review the concept explanation for this topic.",
    "Think about the key terms mentioned in the question.",
    "Try to eliminate the options you know are incorrect.",
    "Re-read the question carefully and focus on what is being asked.",
    "Consider the most common use-case for this concept and how it applies here.",
]


def _fallback_explanation(topic: str, concept: str) -> dict[str, Any]:
    return {
        "content": (
            f"This concept covers {concept} in {topic}. "
            "Please refer to the module content for details."
        ),
        "fallback": True,
    }


def _fallback_hint(attempt_number: int) -> dict[str, Any]:
    idx = min(attempt_number, len(_PROGRESSIVE_HINTS)) - 1
    return {
        "content": _PROGRESSIVE_HINTS[max(idx, 0)],
        "fallback": True,
    }


def _fallback_feedback(exercise: Exercise, user_answer: str) -> dict[str, Any]:
    correct = exercise.correct_answer
    if isinstance(correct, list):
        correct = " or ".join(correct)
    return {
        "content": (
            f"The correct answer is {correct}. "
            "Review the concept explanation for more details."
        ),
        "fallback": True,
    }


_SKILL_CONTEXT = {
    SkillLevel.beginner: (
        "The learner is a beginner. Use plain language and a playful, encouraging tone — "
        "engaging but not childish. Open with ONE vivid real-world analogy (e.g. kitchen, "
        "city map, LEGO, sports) before tying it to the tech idea. Use short paragraphs "
        "and step-by-step breakdowns. Avoid jargon; define any unavoidable term in one phrase."
    ),
    SkillLevel.intermediate: (
        "The learner is intermediate. Use normal technical vocabulary with crisp examples. "
        "Include a quick mental model or metaphor early, then connect to how they would use "
        "this on a real project. Balance depth with scan-ability (short sections)."
    ),
    SkillLevel.advanced: (
        "The learner is advanced. Lead with architecture / invariants / failure modes, then "
        "production trade-offs (perf, security, ops). Optional: contrast with naive approaches. "
        "Be concise, high-signal, no filler."
    ),
}


def _build_explanation_prompt(topic: str, concept: str, skill_level: SkillLevel) -> str:
    style = (
        "Use 2–5 short paragraphs (bullets OK). Do not start with 'In this module' or "
        "'In today's world'. End with one sentence that sparks curiosity for the exercises ahead."
    )
    return (
        f"You are an expert tech educator who makes hard topics feel approachable.\n"
        f"{_SKILL_CONTEXT[skill_level]}\n\n"
        f"{style}\n\n"
        f"Explain \"{concept}\" in the context of the topic/path: {topic}. "
        f"Stay under 350 words."
    )


def _build_hint_prompt(
    exercise: Exercise, attempt_number: int, skill_level: SkillLevel
) -> str:
    return (
        f"You are a helpful tutor giving a hint for an exercise.\n"
        f"{_SKILL_CONTEXT[skill_level]}\n\n"
        f"The question is: {exercise.question}\n"
        f"This is hint #{attempt_number} for the learner. "
        f"Give a progressively more helpful hint without revealing the answer. "
        f"Do NOT include the correct answer in your response. "
        f"Keep the hint under 100 words."
    )


def _build_feedback_prompt(
    exercise: Exercise, user_answer: str, skill_level: SkillLevel
) -> str:
    correct = exercise.correct_answer
    if isinstance(correct, list):
        correct = " or ".join(correct)
    return (
        f"You are a supportive tutor giving feedback on an incorrect answer.\n"
        f"{_SKILL_CONTEXT[skill_level]}\n\n"
        f"Question: {exercise.question}\n"
        f"Learner's answer: {user_answer}\n"
        f"Correct answer: {correct}\n\n"
        f"Explain why the learner's answer is wrong and guide them toward "
        f"understanding the correct answer. Keep feedback under 150 words."
    )


class AITutorService:
    """Generates AI-powered explanations, hints, and feedback using Gemini.

    When ``GEMINI_API_KEY`` is not set or the API call fails, every method
    returns static fallback content with ``fallback: True``.
    """

    def __init__(self) -> None:
        self._api_key: str | None = os.environ.get("GEMINI_API_KEY")
        self._client = None
        if self._api_key:
            from google import genai
            self._client = genai.Client(api_key=self._api_key)

    async def generate_explanation(
        self, topic: str, concept: str, skill_level: SkillLevel
    ) -> dict[str, Any]:
        if not self._client:
            return _fallback_explanation(topic, concept)

        prompt = _build_explanation_prompt(topic, concept, skill_level)
        content = await self._call_gemini(prompt)
        if content is None:
            return _fallback_explanation(topic, concept)
        return {"content": content, "fallback": False}

    async def generate_hint(
        self, exercise: Exercise, attempt_number: int, skill_level: SkillLevel
    ) -> dict[str, Any]:
        if not self._client:
            return _fallback_hint(attempt_number)

        prompt = _build_hint_prompt(exercise, attempt_number, skill_level)
        content = await self._call_gemini(prompt)
        if content is None:
            return _fallback_hint(attempt_number)
        return {"content": content, "fallback": False}

    async def generate_feedback(
        self, exercise: Exercise, user_answer: str, skill_level: SkillLevel
    ) -> dict[str, Any]:
        if not self._client:
            return _fallback_feedback(exercise, user_answer)

        prompt = _build_feedback_prompt(exercise, user_answer, skill_level)
        content = await self._call_gemini(prompt)
        if content is None:
            return _fallback_feedback(exercise, user_answer)
        return {"content": content, "fallback": False}

    async def chat_about_concept(
        self, topic: str, concept: str, skill_level: SkillLevel, messages: list[dict]
    ) -> dict[str, Any]:
        if not self._client:
            return {"content": "AI chat is not available right now. Please try again later.", "fallback": True}

        system_msg = (
            f"You are an expert tech educator helping a learner understand \"{concept}\" "
            f"in the context of {topic}.\n"
            f"{_SKILL_CONTEXT[skill_level]}\n\n"
            "Answer the learner's question concisely (under 200 words). "
            "Use examples when helpful. Stay on-topic."
        )

        conversation = system_msg + "\n\n"
        for m in messages:
            role = "Learner" if m["role"] == "user" else "Tutor"
            conversation += f"{role}: {m['content']}\n\n"
        conversation += "Tutor:"

        content = await self._call_gemini(conversation)
        if content is None:
            return {"content": "I couldn't generate a response. Please try again.", "fallback": True}
        return {"content": content, "fallback": False}

    async def _call_gemini(self, prompt: str) -> str | None:
        """Call Gemini via the google-genai SDK.

        Returns the text response on success, or ``None`` on any failure
        so callers can fall back to static content.
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
