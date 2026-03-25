import os

from fastapi import APIRouter

from backend.models.schemas import ChallengeResult, ChallengeSubmitRequest
from backend.services.code_execution_service import CodeExecutionService

router = APIRouter(prefix="/api", tags=["code_challenges"])

_service = CodeExecutionService()


async def _ai_review(code: str, language: str, passed: bool) -> str | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        prompt = (
            f"Review this {language} code submission. It {'passed' if passed else 'failed'} the test cases.\n"
            f"Give a concise code review (3-5 bullet points) covering: style, performance, and alternative approaches.\n\n"
            f"```{language}\n{code}\n```"
        )
        response = client.models.generate_content(model=model, contents=prompt)
        return response.text
    except Exception:
        return None


@router.post("/challenges/submit")
async def submit_challenge(body: ChallengeSubmitRequest):
    """Execute a code challenge submission against test cases, with optional AI review."""
    result = await _service.execute_challenge(body.code, body.language, body.test_cases)
    review = await _ai_review(body.code, body.language, result.all_passed)
    return {
        "all_passed": result.all_passed,
        "test_case_results": [r.model_dump() for r in result.test_case_results],
        "execution_time_ms": result.execution_time_ms,
        "error": result.error,
        "ai_review": review,
    }
