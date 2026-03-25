import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


class TestCatalogEndpoint:
    def test_get_catalog_returns_200(self):
        response = client.get("/api/catalog")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0

    def test_catalog_categories_have_required_fields(self):
        response = client.get("/api/catalog")
        for cat in response.json()["categories"]:
            assert "id" in cat
            assert "name" in cat
            assert "paths" in cat


class TestPathEndpoint:
    def test_get_existing_path_returns_200(self):
        response = client.get("/api/paths/docker")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "docker"
        assert "modules" in data

    def test_get_nonexistent_path_returns_404(self):
        response = client.get("/api/paths/nonexistent")
        assert response.status_code == 404


class TestModuleEndpoint:
    def test_get_existing_module_returns_200(self):
        response = client.get("/api/paths/docker/modules/01-containers-basics")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "01-containers-basics"
        assert data["pathId"] == "docker"
        assert "exercises" in data
        assert len(data["exercises"]) > 0

    def test_get_nonexistent_module_returns_404(self):
        response = client.get("/api/paths/docker/modules/nonexistent")
        assert response.status_code == 404

    def test_get_module_for_nonexistent_path_returns_404(self):
        response = client.get("/api/paths/nonexistent/modules/01-intro")
        assert response.status_code == 404


class TestEvaluateEndpoint:
    def test_correct_answer_returns_correct_true(self):
        payload = {
            "exercise_id": "ex1",
            "exercise": {
                "id": "ex1",
                "type": "multiple_choice",
                "question": "What is 1+1?",
                "options": ["1", "2", "3"],
                "correct_answer": "2",
                "difficulty": "beginner",
            },
            "user_answer": "2",
            "skill_level": "beginner",
        }
        response = client.post("/api/exercises/evaluate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is True
        assert "feedback" in data

    def test_incorrect_answer_returns_correct_false(self):
        payload = {
            "exercise_id": "ex1",
            "exercise": {
                "id": "ex1",
                "type": "true_false",
                "question": "Python is compiled.",
                "correct_answer": "false",
                "difficulty": "beginner",
            },
            "user_answer": "true",
            "skill_level": "beginner",
        }
        response = client.post("/api/exercises/evaluate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is False
        assert "feedback" in data

    def test_invalid_body_returns_422(self):
        response = client.post("/api/exercises/evaluate", json={"bad": "data"})
        assert response.status_code == 422


class TestExplainEndpoint:
    def test_explain_returns_200_with_fallback(self):
        payload = {
            "topic": "Docker",
            "concept": "containers",
            "skill_level": "beginner",
        }
        response = client.post("/api/explain", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "explanation" in data
        assert isinstance(data["explanation"], str)
        assert len(data["explanation"]) > 0
        assert "fallback" in data
        assert isinstance(data["fallback"], bool)

    def test_explain_with_advanced_skill_level(self):
        payload = {
            "topic": "FastAPI",
            "concept": "dependency injection",
            "skill_level": "advanced",
        }
        response = client.post("/api/explain", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "explanation" in data
        assert "fallback" in data

    def test_explain_invalid_body_returns_422(self):
        response = client.post("/api/explain", json={"bad": "data"})
        assert response.status_code == 422


class TestHintEndpoint:
    def test_hint_returns_200_with_fallback(self):
        payload = {
            "exercise": {
                "id": "ex1",
                "type": "multiple_choice",
                "question": "What is Docker?",
                "options": ["A container runtime", "A database", "A language"],
                "correct_answer": "A container runtime",
                "difficulty": "beginner",
            },
            "attempt_number": 1,
            "skill_level": "beginner",
        }
        response = client.post("/api/hint", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "hint" in data
        assert isinstance(data["hint"], str)
        assert len(data["hint"]) > 0
        assert "fallback" in data
        assert isinstance(data["fallback"], bool)

    def test_hint_progressive_attempt(self):
        payload = {
            "exercise": {
                "id": "ex1",
                "type": "true_false",
                "question": "Docker uses VMs.",
                "correct_answer": "false",
                "difficulty": "intermediate",
            },
            "attempt_number": 3,
            "skill_level": "intermediate",
        }
        response = client.post("/api/hint", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "hint" in data
        assert "fallback" in data

    def test_hint_invalid_body_returns_422(self):
        response = client.post("/api/hint", json={"bad": "data"})
        assert response.status_code == 422


class TestChallengeSubmitEndpoint:
    def test_submit_python_challenge_all_pass(self):
        payload = {
            "exercise_id": "ch1",
            "code": "print(int(input()) + int(input()))",
            "language": "python",
            "test_cases": [
                {"id": "tc1", "input": "2\n3", "expected_output": "5"},
                {"id": "tc2", "input": "0\n0", "expected_output": "0"},
            ],
        }
        response = client.post("/api/challenges/submit", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["all_passed"] is True
        assert len(data["test_case_results"]) == 2
        assert all(r["passed"] for r in data["test_case_results"])
        assert data["execution_time_ms"] is not None
        assert data["error"] is None

    def test_submit_python_challenge_partial_fail(self):
        payload = {
            "exercise_id": "ch2",
            "code": "print(42)",
            "language": "python",
            "test_cases": [
                {"id": "tc1", "input": "", "expected_output": "42"},
                {"id": "tc2", "input": "", "expected_output": "99"},
            ],
        }
        response = client.post("/api/challenges/submit", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["all_passed"] is False
        assert data["test_case_results"][0]["passed"] is True
        assert data["test_case_results"][1]["passed"] is False
        assert data["execution_time_ms"] is None

    def test_submit_unsupported_language(self):
        payload = {
            "exercise_id": "ch3",
            "code": "puts 'hello'",
            "language": "ruby",
            "test_cases": [
                {"id": "tc1", "input": "", "expected_output": "hello"},
            ],
        }
        response = client.post("/api/challenges/submit", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["all_passed"] is False
        assert "Unsupported language" in data["error"]

    def test_submit_syntax_error_returns_error_in_result(self):
        payload = {
            "exercise_id": "ch4",
            "code": "def broken(",
            "language": "python",
            "test_cases": [
                {"id": "tc1", "input": "", "expected_output": "ok"},
            ],
        }
        response = client.post("/api/challenges/submit", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["all_passed"] is False
        assert data["test_case_results"][0]["passed"] is False
        assert "Error" in data["test_case_results"][0]["actual_output"]

    def test_submit_invalid_body_returns_422(self):
        response = client.post("/api/challenges/submit", json={"bad": "data"})
        assert response.status_code == 422


class TestInstructorGuidanceEndpoint:
    def _make_payload(self, **overrides):
        base = {
            "progress": {
                "completed_modules": {"docker": ["01-containers-basics"]},
                "current_module": {"docker": "02-images-and-compose"},
                "exercise_accuracy": {"01-containers-basics": 0.8},
                "interests": ["docker", "fastapi"],
                "skill_level": "beginner",
            },
            "goals": ["learn containers"],
        }
        base.update(overrides)
        return base

    def test_guidance_returns_200_with_valid_payload(self):
        response = client.post("/api/instructor/guidance", json=self._make_payload())
        assert response.status_code == 200
        data = response.json()
        assert "progress_summary" in data
        assert "weak_areas" in data
        assert "recommendations" in data
        assert "motivational_message" in data
        assert isinstance(data["progress_summary"], str)
        assert len(data["progress_summary"]) > 0
        assert isinstance(data["motivational_message"], str)
        assert len(data["motivational_message"]) > 0

    def test_guidance_detects_weak_areas(self):
        payload = self._make_payload()
        payload["progress"]["exercise_accuracy"]["01-containers-basics"] = 0.3
        response = client.post("/api/instructor/guidance", json=payload)
        assert response.status_code == 200
        data = response.json()
        weak_ids = [w["module_id"] for w in data["weak_areas"]]
        assert "01-containers-basics" in weak_ids
        review_recs = [r for r in data["recommendations"] if r["type"] == "review_module"]
        assert len(review_recs) >= 1

    def test_guidance_with_empty_progress(self):
        payload = {
            "progress": {
                "completed_modules": {},
                "current_module": {},
                "exercise_accuracy": {},
                "interests": [],
                "skill_level": "beginner",
            },
            "goals": [],
        }
        response = client.post("/api/instructor/guidance", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["progress_summary"], str)
        assert len(data["progress_summary"]) > 0

    def test_guidance_invalid_body_returns_422(self):
        response = client.post("/api/instructor/guidance", json={"bad": "data"})
        assert response.status_code == 422
