import pytest
from fastapi import HTTPException

from backend.services.content_service import ContentService


class TestGetCatalog:
    def test_returns_catalog_with_categories(self):
        catalog = ContentService.get_catalog()
        assert "categories" in catalog
        assert len(catalog["categories"]) > 0

    def test_each_category_has_required_fields(self):
        catalog = ContentService.get_catalog()
        for cat in catalog["categories"]:
            assert "id" in cat
            assert "name" in cat
            assert "description" in cat
            assert "paths" in cat


class TestGetPath:
    def test_returns_fastapi_path(self):
        path = ContentService.get_path("fastapi")
        assert path["id"] == "fastapi"
        assert "title" in path
        assert "modules" in path
        assert len(path["modules"]) > 0

    def test_returns_docker_path(self):
        path = ContentService.get_path("docker")
        assert path["id"] == "docker"

    def test_every_catalog_path_has_content(self):
        """Catalog path IDs must resolve so the UI never GETs /api/paths/:id 404."""
        catalog = ContentService.get_catalog()
        seen = set()
        for cat in catalog["categories"]:
            for path_id in cat["paths"]:
                if path_id in seen:
                    continue
                seen.add(path_id)
                path = ContentService.get_path(path_id)
                assert path["id"] == path_id
                assert path["modules"]
                for mod in path["modules"]:
                    ContentService.get_module(path_id, mod["id"])

    def test_raises_404_for_unknown_path(self):
        with pytest.raises(HTTPException) as exc_info:
            ContentService.get_path("nonexistent-path")
        assert exc_info.value.status_code == 404


class TestGetModule:
    def test_returns_fastapi_intro_module(self):
        module = ContentService.get_module("fastapi", "01-intro")
        assert module["id"] == "01-intro"
        assert module["pathId"] == "fastapi"
        assert "conceptExplanation" in module
        assert "exercises" in module
        assert len(module["exercises"]) > 0

    def test_returns_docker_module(self):
        module = ContentService.get_module("docker", "01-containers-basics")
        assert module["id"] == "01-containers-basics"

    def test_raises_404_for_unknown_module(self):
        with pytest.raises(HTTPException) as exc_info:
            ContentService.get_module("fastapi", "nonexistent-module")
        assert exc_info.value.status_code == 404

    def test_raises_404_for_unknown_path_in_module(self):
        with pytest.raises(HTTPException) as exc_info:
            ContentService.get_module("nonexistent-path", "01-intro")
        assert exc_info.value.status_code == 404
