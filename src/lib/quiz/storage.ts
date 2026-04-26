// localStorage helpers for in-progress quiz answers.
// Step number stays in the URL so refresh + back behaviour Just Works;
// answers persist here so leaving and returning to /quiz/3 still has Q1+Q2.

import type { QuizAnswers } from "./types";

const KEY = "launchpad-quiz-answers";

export function loadAnswers(): QuizAnswers {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as QuizAnswers;
  } catch {
    return {};
  }
}

export function saveAnswers(answers: QuizAnswers) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(answers));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAnswers() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
