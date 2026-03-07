export type { PlaybookQuiz, PlaybookStep, Playbook, PlaybookProgress, AllProgress } from "./types";
export { loadProgress, saveProgress } from "./storage";
export { getPlaybooksByCategory, getCompletionPercent } from "./helpers";

import { briefAndStrategy } from "./brief-and-strategy";
import { design } from "./design";
import { development } from "./development";
import { qaAndLaunch } from "./qa-and-launch";
import { performanceTesting } from "./performance-testing";
import { retainerTesting } from "./retainer-testing";
import type { Playbook } from "./types";

export const playbooks: Playbook[] = [
  briefAndStrategy,
  design,
  development,
  qaAndLaunch,
  performanceTesting,
  retainerTesting,
];
