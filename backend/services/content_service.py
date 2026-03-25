import json
from pathlib import Path

from fastapi import HTTPException

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"


class ContentService:
    """Loads and serves JSON content files for the learning platform."""

    @staticmethod
    def get_catalog() -> dict:
        catalog_path = CONTENT_DIR / "catalog.json"
        if not catalog_path.exists():
            raise HTTPException(status_code=404, detail="Catalog not found")
        with open(catalog_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def get_path(path_id: str) -> dict:
        path_file = CONTENT_DIR / "paths" / path_id / "path.json"
        if not path_file.exists():
            raise HTTPException(
                status_code=404, detail=f"Learning path '{path_id}' not found"
            )
        with open(path_file, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def get_module(path_id: str, module_id: str) -> dict:
        module_file = (
            CONTENT_DIR / "paths" / path_id / "modules" / f"{module_id}.json"
        )
        if not module_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Module '{module_id}' not found in path '{path_id}'",
            )
        with open(module_file, "r", encoding="utf-8") as f:
            return json.load(f)
