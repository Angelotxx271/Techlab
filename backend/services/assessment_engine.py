from backend.models.schemas import Exercise, ExerciseType, EvaluationResult


class AssessmentEngine:
    """Evaluates exercise submissions and returns feedback."""

    def evaluate(self, exercise: Exercise, user_answer: str) -> EvaluationResult:
        """Evaluate a user's answer against the exercise's correct answer.

        Supports: multiple_choice, true_false, fill_in_blank,
        code_completion, and code_challenge (deferred).
        """
        if exercise.type == ExerciseType.code_challenge:
            return EvaluationResult(
                correct=False,
                feedback="Code challenges are evaluated by running test cases. Please use the challenge submission endpoint.",
            )

        correct = self._check_answer(exercise, user_answer)

        if correct:
            return EvaluationResult(
                correct=True,
                feedback="Correct! Well done.",
            )

        expected = self._format_expected(exercise)
        return EvaluationResult(
            correct=False,
            feedback=f"Incorrect. The correct answer is: {expected}",
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _check_answer(self, exercise: Exercise, user_answer: str) -> bool:
        if exercise.type in (ExerciseType.multiple_choice, ExerciseType.true_false):
            return self._exact_match_ci(user_answer, exercise.correct_answer)

        if exercise.type == ExerciseType.fill_in_blank:
            return self._fill_in_blank_match(user_answer, exercise.correct_answer)

        if exercise.type == ExerciseType.code_completion:
            return self._code_completion_match(user_answer, exercise.correct_answer)

        return False

    @staticmethod
    def _exact_match_ci(user_answer: str, correct: str | list[str]) -> bool:
        """Case-insensitive exact match (for MC / true-false)."""
        if isinstance(correct, list):
            return any(user_answer.strip().lower() == c.lower() for c in correct)
        return user_answer.strip().lower() == correct.strip().lower()

    @staticmethod
    def _fill_in_blank_match(user_answer: str, correct: str | list[str]) -> bool:
        """Case-insensitive, whitespace-stripped. Accepts any from a list."""
        cleaned = user_answer.strip().lower()
        if isinstance(correct, list):
            return any(cleaned == c.strip().lower() for c in correct)
        return cleaned == correct.strip().lower()

    @staticmethod
    def _code_completion_match(user_answer: str, correct: str | list[str]) -> bool:
        """Whitespace-stripped, case-sensitive comparison."""
        cleaned = user_answer.strip()
        if isinstance(correct, list):
            return any(cleaned == c.strip() for c in correct)
        return cleaned == correct.strip()

    @staticmethod
    def _format_expected(exercise: Exercise) -> str:
        if isinstance(exercise.correct_answer, list):
            return " or ".join(exercise.correct_answer)
        return exercise.correct_answer
