"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LightBulbIcon,
  ArrowLeftIcon,
  TrophyIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  playbooks,
  getPlaybooksByCategory,
  getCompletionPercent,
  loadProgress,
  saveProgress,
  type Playbook,
  type PlaybookProgress,
  type AllProgress,
} from "@/lib/playbooks";

// ── Component ───────────────────────────────────────────────────

export default function PlaybooksPage() {
  const [activePlaybookId, setActivePlaybookId] = useState<string | null>(null);
  const [progress, setProgress] = useState<AllProgress>({});
  const [loaded, setLoaded] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    setProgress(loadProgress());
    setLoaded(true);
  }, []);

  // Save whenever progress changes
  useEffect(() => {
    if (loaded) saveProgress(progress);
  }, [progress, loaded]);

  const activePlaybook = useMemo(
    () => playbooks.find((p) => p.id === activePlaybookId) || null,
    [activePlaybookId]
  );

  const openPlaybook = useCallback((id: string) => {
    setActivePlaybookId(id);
    setProgress((prev) => {
      if (prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          currentStep: 0,
          completedSteps: [],
          quizAnswers: {},
          startedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const updateProgress = useCallback(
    (playbookId: string, updater: (p: PlaybookProgress) => PlaybookProgress) => {
      setProgress((prev) => ({
        ...prev,
        [playbookId]: updater(
          prev[playbookId] || {
            currentStep: 0,
            completedSteps: [],
            quizAnswers: {},
            startedAt: new Date().toISOString(),
          }
        ),
      }));
    },
    []
  );

  const resetPlaybook = useCallback((playbookId: string) => {
    setProgress((prev) => {
      const next = { ...prev };
      delete next[playbookId];
      return next;
    });
  }, []);

  if (!loaded) {
    return (
      <div className="relative min-h-screen">
        <DecorativeBlocks />
        <div className="relative z-10 flex items-center justify-center py-32">
          <ArrowPathIcon className="size-6 animate-spin text-[#AAAAAA]" />
        </div>
      </div>
    );
  }

  if (activePlaybook) {
    return (
      <PlaybookView
        playbook={activePlaybook}
        progress={progress[activePlaybook.id]}
        onBack={() => setActivePlaybookId(null)}
        onUpdateProgress={(updater) => updateProgress(activePlaybook.id, updater)}
        onReset={() => {
          resetPlaybook(activePlaybook.id);
          setActivePlaybookId(null);
        }}
      />
    );
  }

  return <PlaybookIndex progress={progress} onOpen={openPlaybook} onReset={resetPlaybook} />;
}

// ── Index View ──────────────────────────────────────────────────

function PlaybookIndex({
  progress,
  onOpen,
  onReset,
}: {
  progress: AllProgress;
  onOpen: (id: string) => void;
  onReset: (id: string) => void;
}) {
  const categories = getPlaybooksByCategory(playbooks);

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Playbooks
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            Interactive training for the team — learn our processes step by step
          </p>
        </div>

        {/* Playbook cards by category */}
        {Object.entries(categories).map(([category, pbs]) => (
          <div key={category} className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pbs.map((pb) => {
                const pbProgress = progress[pb.id];
                const percent = getCompletionPercent(pb, pbProgress);
                const isComplete = percent === 100;

                return (
                  <div
                    key={pb.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(pb.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(pb.id); }}
                    className="group relative bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 text-left transition-all duration-200 hover:border-[#CCCCCC] hover:bg-[#EBEBEB] cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-2.5 rounded-md border ${
                          isComplete
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-white border-[#E5E5E5]"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircleIcon className="size-5 text-emerald-600" />
                        ) : (
                          <BookOpenIcon className="size-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold mb-1">{pb.title}</h3>
                        <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
                          {pb.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="size-3" />
                            {pb.estimatedMinutes} min
                          </span>
                          <span>
                            {pb.steps.length} steps
                          </span>
                          {pbProgress && !isComplete && (
                            <span className="text-amber-600">
                              {pbProgress.completedSteps.length}/{pb.steps.length} done
                            </span>
                          )}
                          {isComplete && (
                            <span className="text-emerald-600">Complete</span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {pbProgress && (
                          <div className="mt-3 h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isComplete ? "bg-emerald-500" : "bg-[#0A0A0A]"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reset button (only show if started) */}
                    {pbProgress && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReset(pb.id);
                        }}
                        className="absolute top-3 right-3 p-1.5 text-[#CCCCCC] hover:text-red-500 transition-colors"
                        title="Reset progress"
                      >
                        <ArrowPathIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Playbook Step View ──────────────────────────────────────────

function PlaybookView({
  playbook,
  progress,
  onBack,
  onUpdateProgress,
  onReset,
}: {
  playbook: Playbook;
  progress: PlaybookProgress;
  onBack: () => void;
  onUpdateProgress: (updater: (p: PlaybookProgress) => PlaybookProgress) => void;
  onReset: () => void;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const currentStepIndex = progress.currentStep;
  const step = playbook.steps[currentStepIndex];
  const isLastStep = currentStepIndex === playbook.steps.length - 1;
  const isStepCompleted = progress.completedSteps.includes(currentStepIndex);
  const isPlaybookComplete = !!progress.completedAt;
  const overallPercent = getCompletionPercent(playbook, progress);

  // Reset quiz state when step changes
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);

    // If this step was already completed, pre-fill the quiz answer
    if (step?.quiz && progress.quizAnswers[step.id] !== undefined) {
      setSelectedAnswer(progress.quizAnswers[step.id]);
      setShowResult(true);
      setIsCorrect(progress.quizAnswers[step.id] === step.quiz.correctIndex);
    }
  }, [currentStepIndex, step, progress.quizAnswers]);

  function submitQuiz() {
    if (selectedAnswer === null || !step?.quiz) return;
    const correct = selectedAnswer === step.quiz.correctIndex;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      onUpdateProgress((p) => ({
        ...p,
        completedSteps: [...new Set([...p.completedSteps, currentStepIndex])],
        quizAnswers: { ...p.quizAnswers, [step.id]: selectedAnswer },
      }));
    }
  }

  function completeStepWithoutQuiz() {
    onUpdateProgress((p) => ({
      ...p,
      completedSteps: [...new Set([...p.completedSteps, currentStepIndex])],
    }));
  }

  function goNext() {
    if (isLastStep) {
      // Complete the playbook
      onUpdateProgress((p) => ({
        ...p,
        completedAt: new Date().toISOString(),
      }));
    } else {
      onUpdateProgress((p) => ({
        ...p,
        currentStep: currentStepIndex + 1,
      }));
    }
  }

  function goPrev() {
    if (currentStepIndex > 0) {
      onUpdateProgress((p) => ({
        ...p,
        currentStep: currentStepIndex - 1,
      }));
    }
  }

  // Completion screen
  if (isPlaybookComplete) {
    return (
      <div className="relative min-h-screen">
        <DecorativeBlocks />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-12 md:py-16">
          <div className="text-center py-16">
            <div className="inline-flex p-4 bg-emerald-50 border border-emerald-200 rounded-full mb-6">
              <TrophyIcon className="size-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Playbook Complete!
            </h1>
            <p className="text-[#6B6B6B] text-sm mb-2">
              You&apos;ve completed <strong>{playbook.title}</strong>
            </p>
            <p className="text-[#AAAAAA] text-xs mb-8">
              {playbook.steps.length} steps &middot; All knowledge checks passed
            </p>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onBack}
                className="px-6 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
              >
                Back to Playbooks
              </button>
              <button
                onClick={() => {
                  onReset();
                }}
                className="px-6 py-2.5 border border-[#E5E5E5] bg-white text-[#6B6B6B] text-sm font-medium rounded-md hover:bg-[#F5F5F5] transition-colors"
              >
                Retake
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canProceed = isStepCompleted || !step?.quiz;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            All Playbooks
          </button>
          <span className="text-xs text-[#AAAAAA]">
            Step {currentStepIndex + 1} of {playbook.steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold tracking-tight">{playbook.title}</h1>
            <span className="text-xs font-semibold tabular-nums text-[#AAAAAA]">
              {overallPercent}%
            </span>
          </div>
          <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden flex">
            {playbook.steps.map((_, i) => (
              <div
                key={i}
                className={`flex-1 transition-all duration-300 ${
                  i < playbook.steps.length - 1 ? "mr-[1px]" : ""
                } ${
                  progress.completedSteps.includes(i)
                    ? "bg-emerald-500"
                    : i === currentStepIndex
                    ? "bg-[#0A0A0A]"
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>
          {/* Step indicator dots */}
          <div className="flex items-center gap-1 mt-2">
            {playbook.steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  // Can only jump to completed steps or current
                  if (progress.completedSteps.includes(i) || i === currentStepIndex) {
                    onUpdateProgress((p) => ({ ...p, currentStep: i }));
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  progress.completedSteps.includes(i)
                    ? "bg-emerald-500 cursor-pointer"
                    : i === currentStepIndex
                    ? "bg-[#0A0A0A]"
                    : "bg-[#E5E5E5] cursor-not-allowed"
                }`}
                title={
                  progress.completedSteps.includes(i) || i === currentStepIndex
                    ? s.title
                    : "Complete previous steps first"
                }
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 mb-6">
          <h2 className="text-base font-bold mb-4">{step.title}</h2>
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={step.content} />
          </div>

          {/* Tip callout */}
          {step.tip && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <LightBulbIcon className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">{step.tip}</p>
            </div>
          )}
        </div>

        {/* Quiz */}
        {step.quiz && (
          <div
            className={`border rounded-lg p-6 mb-6 transition-colors ${
              showResult && isCorrect
                ? "bg-emerald-50 border-emerald-200"
                : showResult && !isCorrect
                ? "bg-red-50 border-red-200"
                : "bg-[#F5F5F5] border-[#E5E5E5]"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <LockClosedIcon className="size-4 text-[#6B6B6B]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Knowledge Check
              </h3>
            </div>
            <p className="text-sm font-semibold mb-4">{step.quiz.question}</p>

            <div className="space-y-2 mb-4">
              {step.quiz.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!showResult || !isCorrect) {
                      setSelectedAnswer(i);
                      setShowResult(false);
                    }
                  }}
                  disabled={showResult && isCorrect}
                  className={`w-full text-left px-4 py-3 rounded-md text-sm transition-all border ${
                    selectedAnswer === i
                      ? showResult && isCorrect && i === step.quiz!.correctIndex
                        ? "bg-emerald-100 border-emerald-300 font-medium"
                        : showResult && !isCorrect && i === selectedAnswer
                        ? "bg-red-100 border-red-300"
                        : "bg-white border-[#0A0A0A] font-medium"
                      : showResult && isCorrect && i === step.quiz!.correctIndex
                      ? "bg-emerald-100 border-emerald-300"
                      : "bg-white border-[#E5E5E5] hover:border-[#CCCCCC]"
                  } ${showResult && isCorrect ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        selectedAnswer === i
                          ? "bg-[#0A0A0A] border-[#0A0A0A] text-white"
                          : "border-[#CCCCCC] text-[#AAAAAA]"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                  </span>
                </button>
              ))}
            </div>

            {/* Submit / result */}
            {!showResult && (
              <button
                onClick={submitQuiz}
                disabled={selectedAnswer === null}
                className="w-full px-5 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Check Answer
              </button>
            )}

            {showResult && isCorrect && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                <CheckCircleIcon className="size-5" />
                Correct! You can proceed to the next step.
              </div>
            )}

            {showResult && !isCorrect && (
              <div>
                <p className="text-sm text-red-700 font-medium mb-2">
                  Not quite — try again!
                </p>
                {step.quiz.hint && (
                  <p className="text-xs text-red-600">
                    <strong>Hint:</strong> {step.quiz.hint}
                  </p>
                )}
                <button
                  onClick={() => {
                    setShowResult(false);
                    setSelectedAnswer(null);
                  }}
                  className="mt-3 px-4 py-2 bg-white border border-red-200 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mark as read (for steps without quiz) */}
        {!step.quiz && !isStepCompleted && (
          <button
            onClick={completeStepWithoutQuiz}
            className="w-full px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors mb-6"
          >
            <span className="flex items-center justify-center gap-2">
              <CheckCircleIcon className="size-4" />
              Mark as Read
            </span>
          </button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-[#6B6B6B] hover:text-[#0A0A0A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="size-3.5" />
            Previous
          </button>

          <button
            onClick={goNext}
            disabled={!canProceed || (!isStepCompleted && !!step?.quiz)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-md transition-colors ${
              canProceed && (isStepCompleted || !step?.quiz)
                ? "bg-[#0A0A0A] text-white hover:bg-accent-hover"
                : "bg-[#E5E5E5] text-[#AAAAAA] cursor-not-allowed"
            }`}
          >
            {isLastStep ? "Complete" : "Next"}
            {!isLastStep && <ChevronRightIcon className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Markdown Renderer ───────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  const html = content
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-base font-bold mt-6 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mt-6 mb-2">$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm leading-relaxed text-[#3A3A3A]">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm leading-relaxed text-[#3A3A3A]">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-3 text-[#3A3A3A]">')
    .replace(/\n/g, "<br/>");

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<p class="text-sm leading-relaxed mb-3 text-[#3A3A3A]">${html}</p>`,
      }}
    />
  );
}
