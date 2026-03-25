from fastapi import APIRouter

from backend.services.content_service import ContentService

router = APIRouter(prefix="/api", tags=["modules"])


@router.get("/paths/{path_id}/modules/{module_id}")
async def get_module(path_id: str, module_id: str):
    """Returns module content and exercises."""
    return ContentService.get_module(path_id, module_id)
