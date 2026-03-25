from fastapi import APIRouter

from backend.services.content_service import ContentService

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/catalog")
async def get_catalog():
    """Returns full topic catalog with categories and paths."""
    return ContentService.get_catalog()


@router.get("/paths/{path_id}")
async def get_path(path_id: str):
    """Returns path metadata and module list."""
    return ContentService.get_path(path_id)
