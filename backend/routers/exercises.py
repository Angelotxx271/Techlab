from fastapi import APIRouter

from backend.models.schemas import EvaluateRequest, EvaluationResult
from backend.services.assessment_engine import AssessmentEngine

router = APIRouter(prefix="/api", tags=["exercises"])

_engine = AssessmentEngine()


@router.post("/exercises/evaluate", response_model=EvaluationResult)
async def evaluate_exercise(body: EvaluateRequest) -> EvaluationResult:
    """Evaluate a learner's exercise submission and return feedback."""
    return _engine.evaluate(body.exercise, body.user_answer)
