// ── Types ────────────────────────────────────────────────────────

export interface PlaybookQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
}

export interface PlaybookStep {
  id: string;
  title: string;
  content: string; // markdown
  tip?: string;
  quiz?: PlaybookQuiz;
}

export interface Playbook {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  steps: PlaybookStep[];
}

export interface PlaybookProgress {
  currentStep: number;
  completedSteps: number[];
  quizAnswers: Record<string, number>;
  startedAt: string;
  completedAt?: string;
}

export type AllProgress = Record<string, PlaybookProgress>;
