export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearnerProfile {
  skillLevel: SkillLevel;
  interests: string[];
  onboardingComplete: boolean;
  currentPosition?: string;
  learningGoals?: string[];
}

export interface TopicCategory {
  id: string;
  name: string;
  description: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedDuration: string;
  difficulty: SkillLevel;
  modules: ModuleSummary[];
}

export interface ModuleSummary {
  id: string;
  title: string;
  order: number;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface Analogy {
  title: string;
  analogy: string;
  explanation: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface Module {
  id: string;
  pathId: string;
  title: string;
  conceptExplanation: string;
  exercises: Exercise[];
  flashcards: Flashcard[];
  analogies: Analogy[];
  keyTerms: KeyTerm[];
}

export type ExerciseType = 'multiple_choice' | 'fill_in_blank' | 'code_completion' | 'true_false' | 'code_challenge';

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  options?: string[];
  codeTemplate?: string;
  correctAnswer: string | string[];
  difficulty: SkillLevel;
}

export interface EvaluationResult {
  correct: boolean;
  feedback: string;
  hint?: string;
}

export interface LearnerProgress {
  completedModules: Record<string, string[]>;
  currentModule: Record<string, string>;
  exerciseAccuracy: Record<string, number>;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  difficultyOverride?: SkillLevel;
  lastActivityTimestamp?: string;
}

export type ChallengeLanguage = 'python' | 'javascript';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface CodeChallengeExercise extends Exercise {
  type: 'code_challenge';
  problemStatement: string;
  inputOutputSpec: string;
  starterTemplate: Record<ChallengeLanguage, string>;
  testCases: TestCase[];
  supportedLanguages: ChallengeLanguage[];
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
}

export interface ChallengeResult {
  allPassed: boolean;
  testCaseResults: TestCaseResult[];
  executionTimeMs?: number;
  error?: string;
}

export interface WeakArea {
  pathId: string;
  moduleId: string;
  moduleTitle: string;
  accuracy: number;
}

export interface NextStepRecommendation {
  type: 'continue_path' | 'review_module' | 'start_new_path';
  pathId: string;
  moduleId?: string;
  reason: string;
}

export interface InstructorGuidance {
  progressSummary: string;
  weakAreas: WeakArea[];
  recommendations: NextStepRecommendation[];
  motivationalMessage: string;
  reEngagementMessage?: string;
}
