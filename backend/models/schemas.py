from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import Optional


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class SkillLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class ExerciseType(str, Enum):
    multiple_choice = "multiple_choice"
    fill_in_blank = "fill_in_blank"
    code_completion = "code_completion"
    true_false = "true_false"
    code_challenge = "code_challenge"


from pydantic import Field

class Exercise(CamelModel):
    id: str
    type: ExerciseType
    question: str
    options: Optional[list[str]] = None
    code_template: Optional[str] = Field(None, alias="codeTemplate")
    correct_answer: str | list[str] = Field(alias="correctAnswer")
    difficulty: SkillLevel


class Flashcard(BaseModel):
    front: str
    back: str


class Analogy(BaseModel):
    title: str
    analogy: str
    explanation: str


class KeyTerm(BaseModel):
    term: str
    definition: str


class Module(BaseModel):
    id: str
    path_id: str
    title: str
    concept_explanation: str
    exercises: list[Exercise]
    flashcards: list[Flashcard] = []
    analogies: list[Analogy] = []
    key_terms: list[KeyTerm] = []


class EvaluateRequest(BaseModel):
    exercise_id: str
    exercise: Exercise
    user_answer: str
    skill_level: SkillLevel


class EvaluationResult(BaseModel):
    correct: bool
    feedback: str
    hint: Optional[str] = None


class ExplainRequest(BaseModel):
    topic: str
    concept: str
    skill_level: SkillLevel


class ChatMessage(BaseModel):
    role: str
    content: str


class ConceptChatRequest(BaseModel):
    topic: str
    concept: str
    skill_level: SkillLevel
    messages: list[ChatMessage]


class HintRequest(BaseModel):
    exercise: Exercise
    attempt_number: int
    skill_level: SkillLevel


# --- Code Challenge Models ---


class TestCase(BaseModel):
    id: str
    input: str
    expected_output: str
    is_hidden: bool = False


class ChallengeSubmitRequest(BaseModel):
    exercise_id: str
    code: str
    language: str
    test_cases: list[TestCase]


class TestCaseResult(BaseModel):
    test_case_id: str
    passed: bool
    expected_output: str
    actual_output: str


class ChallengeResult(BaseModel):
    all_passed: bool
    test_case_results: list[TestCaseResult]
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None


# --- AI Instructor Models ---


class WeakArea(BaseModel):
    path_id: str
    module_id: str
    module_title: str
    accuracy: float


class NextStepRecommendation(BaseModel):
    type: str
    path_id: str
    module_id: Optional[str] = None
    reason: str


class LearnerProgressPayload(BaseModel):
    completed_modules: dict[str, list[str]]
    current_module: dict[str, str]
    exercise_accuracy: dict[str, float]
    interests: list[str]
    skill_level: SkillLevel
    last_activity_timestamp: Optional[str] = None


class InstructorGuidanceRequest(BaseModel):
    progress: LearnerProgressPayload
    goals: list[str] = []


class InstructorGuidance(BaseModel):
    progress_summary: str
    weak_areas: list[WeakArea]
    recommendations: list[NextStepRecommendation]
    motivational_message: str
    re_engagement_message: Optional[str] = None
