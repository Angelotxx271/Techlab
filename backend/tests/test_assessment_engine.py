import pytest
from backend.models.schemas import Exercise, ExerciseType, SkillLevel
from backend.services.assessment_engine import AssessmentEngine

engine = AssessmentEngine()


def _exercise(type: ExerciseType, correct_answer, **kwargs):
    return Exercise(
        id="ex-1",
        type=type,
        question="Test question",
        correct_answer=correct_answer,
        difficulty=SkillLevel.beginner,
        **kwargs,
    )


# --- Multiple choice ---

class TestMultipleChoice:
    def test_correct_exact(self):
        ex = _exercise(ExerciseType.multiple_choice, "Option A", options=["Option A", "Option B"])
        result = engine.evaluate(ex, "Option A")
        assert result.correct is True
        assert result.feedback

    def test_correct_case_insensitive(self):
        ex = _exercise(ExerciseType.multiple_choice, "Option A", options=["Option A", "Option B"])
        result = engine.evaluate(ex, "option a")
        assert result.correct is True

    def test_incorrect(self):
        ex = _exercise(ExerciseType.multiple_choice, "Option A", options=["Option A", "Option B"])
        result = engine.evaluate(ex, "Option B")
        assert result.correct is False
        assert result.feedback
        assert "Option A" in result.feedback


# --- True / False ---

class TestTrueFalse:
    def test_correct(self):
        ex = _exercise(ExerciseType.true_false, "true")
        result = engine.evaluate(ex, "True")
        assert result.correct is True

    def test_incorrect(self):
        ex = _exercise(ExerciseType.true_false, "true")
        result = engine.evaluate(ex, "false")
        assert result.correct is False
        assert result.feedback


# --- Fill in blank ---

class TestFillInBlank:
    def test_correct_single(self):
        ex = _exercise(ExerciseType.fill_in_blank, "Docker")
        result = engine.evaluate(ex, "  docker  ")
        assert result.correct is True

    def test_correct_list(self):
        ex = _exercise(ExerciseType.fill_in_blank, ["Docker", "docker-engine"])
        result = engine.evaluate(ex, "docker-engine")
        assert result.correct is True

    def test_incorrect(self):
        ex = _exercise(ExerciseType.fill_in_blank, "Docker")
        result = engine.evaluate(ex, "Podman")
        assert result.correct is False
        assert result.feedback


# --- Code completion ---

class TestCodeCompletion:
    def test_correct(self):
        ex = _exercise(ExerciseType.code_completion, "print('hello')")
        result = engine.evaluate(ex, "print('hello')")
        assert result.correct is True

    def test_case_sensitive(self):
        ex = _exercise(ExerciseType.code_completion, "Print('hello')")
        result = engine.evaluate(ex, "print('hello')")
        assert result.correct is False

    def test_strips_whitespace(self):
        ex = _exercise(ExerciseType.code_completion, "x = 1")
        result = engine.evaluate(ex, "  x = 1  ")
        assert result.correct is True


# --- Code challenge (deferred) ---

class TestCodeChallenge:
    def test_returns_redirect_message(self):
        ex = _exercise(ExerciseType.code_challenge, "n/a")
        result = engine.evaluate(ex, "some code")
        assert result.correct is False
        assert "challenge" in result.feedback.lower()


# --- Feedback content ---

class TestFeedback:
    def test_correct_has_reinforcement(self):
        ex = _exercise(ExerciseType.multiple_choice, "A", options=["A", "B"])
        result = engine.evaluate(ex, "A")
        assert result.correct is True
        assert len(result.feedback) > 0

    def test_incorrect_has_nonempty_feedback(self):
        ex = _exercise(ExerciseType.multiple_choice, "A", options=["A", "B"])
        result = engine.evaluate(ex, "B")
        assert result.correct is False
        assert len(result.feedback) > 0
