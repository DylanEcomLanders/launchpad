"use client";

// Generic multi-choice step. Renders a question + options, auto-advances
// 200ms after a tap so the flow feels punchy on mobile (Meta ads = thumbs
// flying, every extra click hurts completion rate).

import { useEffect, useState } from "react";
import { QuizProgressBar } from "./progress-bar";
import { OptionCard } from "./option-card";

interface Option<T extends string> {
  id: T;
  label: string;
}

interface QuizStepProps<T extends string> {
  step: number;
  total: number;
  question: string;
  options: readonly Option<T>[];
  value?: T;
  onSelect: (id: T) => void;
  onBack?: () => void;
}

export function QuizStep<T extends string>({
  step,
  total,
  question,
  options,
  value,
  onSelect,
  onBack,
}: QuizStepProps<T>) {
  const [pending, setPending] = useState<T | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  // Subtle fade between steps — runs on every step change.
  useEffect(() => {
    setFadeIn(false);
    const id = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(id);
  }, [step]);

  const handleSelect = (id: T) => {
    if (pending) return; // ignore double-taps during the auto-advance window
    setPending(id);
    // Brief delay so the user sees the selected state before we move on.
    setTimeout(() => onSelect(id), 200);
  };

  return (
    <div className={`w-full max-w-md mx-auto transition-opacity duration-150 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
      <QuizProgressBar current={step} total={total} />

      <h1
        className="mt-8 text-2xl md:text-[2rem] font-bold text-[#1B1B1B] leading-[1.15] tracking-tight text-center"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {question}
      </h1>

      <div className="mt-8 space-y-2.5" style={{ fontFamily: "var(--font-body)" }}>
        {options.map((opt) => (
          <OptionCard
            key={opt.id}
            label={opt.label}
            selected={(pending ?? value) === opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={pending !== null}
          />
        ))}
      </div>

      {onBack && (
        <div className="mt-8 flex items-center justify-center">
          <button
            type="button"
            onClick={onBack}
            disabled={pending !== null}
            className="text-xs font-medium text-[#999] hover:text-[#1B1B1B] transition-colors disabled:opacity-50"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
