from fastapi import APIRouter

from backend.models.schemas import InstructorGuidance, InstructorGuidanceRequest
from backend.services.ai_instructor_service import AIInstructorService

router = APIRouter(prefix="/api/instructor", tags=["ai-instructor"])

_instructor = AIInstructorService()


@router.post("/guidance", response_model=InstructorGuidance)
async def get_instructor_guidance(body: InstructorGuidanceRequest):
    """Return AI Instructor guidance based on learner progress and goals."""
    return await _instructor.generate_guidance(
        progress=body.progress,
        goals=body.goals,
    )
