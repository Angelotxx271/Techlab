from fastapi import APIRouter

from backend.models.schemas import ConceptChatRequest, ExplainRequest, HintRequest
from backend.services.ai_tutor_service import AITutorService

router = APIRouter(prefix="/api", tags=["ai"])

_tutor = AITutorService()


@router.post("/explain")
async def explain_concept(body: ExplainRequest):
    """Generate an AI-powered explanation for a concept at a given skill level."""
    result = await _tutor.generate_explanation(
        topic=body.topic,
        concept=body.concept,
        skill_level=body.skill_level,
    )
    return {"explanation": result["content"], "fallback": result["fallback"]}


@router.post("/hint")
async def get_hint(body: HintRequest):
    """Generate a progressive hint for an exercise without revealing the answer."""
    result = await _tutor.generate_hint(
        exercise=body.exercise,
        attempt_number=body.attempt_number,
        skill_level=body.skill_level,
    )
    return {"hint": result["content"], "fallback": result["fallback"]}


@router.post("/chat")
async def concept_chat(body: ConceptChatRequest):
    """Chat with the AI tutor about a concept."""
    result = await _tutor.chat_about_concept(
        topic=body.topic,
        concept=body.concept,
        skill_level=body.skill_level,
        messages=[{"role": m.role, "content": m.content} for m in body.messages],
    )
    return {"reply": result["content"], "fallback": result["fallback"]}
