"use client";

// Single-step container — handles state, URL navigation, and submission.
// Step number lives in the URL so back-button + refresh don't lose progress;
// answers persist in localStorage between steps.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { QuizStep } from "@/components/quiz/quiz-step";
import { ContactFormStep } from "@/components/quiz/contact-form-step";
import {
  Q1_VERTICAL,
  Q2_REVENUE,
  Q3_TRAFFIC,
  Q4_PAIN,
  Q5_CRO,
  TOTAL_STEPS,
} from "@/lib/quiz/questions";
import { loadAnswers, saveAnswers, clearAnswers } from "@/lib/quiz/storage";
import type {
  QuizAnswers,
  Vertical,
  Revenue,
  TrafficSource,
  PainPoint,
  CroHistory,
} from "@/lib/quiz/types";

export default function QuizStepClient({ step }: { step: string }) {
  const router = useRouter();
  const stepNum = Number(step);
  const isValidStep = Number.isInteger(stepNum) && stepNum >= 1 && stepNum <= TOTAL_STEPS;

  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [source, setSource] = useState("direct");

  // Hydrate stored answers + capture utm/ref on first mount
  useEffect(() => {
    setAnswers(loadAnswers());
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("utm_source") || "direct";
    setSource(ref);
    setHydrated(true);
  }, []);

  // Track step view (one event per step the user actually lands on)
  useEffect(() => {
    if (!hydrated || !isValidStep) return;
    fetch("/api/leads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        funnel: "quiz",
        event_type: "view",
        source: `step-${stepNum}`,
        referrer: document.referrer || "",
      }),
    }).catch(() => {});
  }, [hydrated, isValidStep, stepNum]);

  // Force dark body bg to match audit-page chrome
  useEffect(() => {
    const body = document.body;
    const main = body.querySelector("main");
    const prevBodyBg = body.style.backgroundColor;
    const prevMainBg = main?.style.backgroundColor || "";
    body.style.backgroundColor = "#FFFFFF";
    if (main) main.style.backgroundColor = "#FFFFFF";
    return () => {
      body.style.backgroundColor = prevBodyBg;
      if (main) main.style.backgroundColor = prevMainBg;
    };
  }, []);

  // If they deep-link to a step they haven't reached yet (e.g. /quiz/3 with no
  // answers stored), bounce them to the earliest step they can answer.
  useEffect(() => {
    if (!hydrated || !isValidStep) return;
    const requiredForStep: Record<number, (keyof QuizAnswers)[]> = {
      1: [],
      2: ["vertical"],
      3: ["vertical", "revenue"],
      4: ["vertical", "revenue", "trafficSource"],
      5: ["vertical", "revenue", "trafficSource", "painPoint"],
      6: ["vertical", "revenue", "trafficSource", "painPoint", "croHistory"],
    };
    const required = requiredForStep[stepNum] ?? [];
    const firstMissing = required.findIndex((k) => !answers[k]);
    if (firstMissing !== -1) {
      router.replace(`/quiz/${firstMissing + 1}`);
    }
  }, [hydrated, isValidStep, stepNum, answers, router]);

  if (!isValidStep) {
    return <NotFound />;
  }

  const goNext = () => {
    if (stepNum < TOTAL_STEPS) router.push(`/quiz/${stepNum + 1}`);
  };
  const goBack = stepNum > 1 ? () => router.push(`/quiz/${stepNum - 1}`) : undefined;

  // Generic select-and-advance — used by Q1–Q5
  const select = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    saveAnswers(next);
    goNext();
  };

  // Final-step submit
  const submitContact = async (contact: {
    firstName: string;
    email: string;
    storeUrl: string;
    whatsapp?: string;
  }) => {
    if (submitting) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answers,
          ...contact,
          source,
          referrer: document.referrer || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't submit — try again?");
      // Track submission event
      fetch("/api/leads/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel: "quiz",
          event_type: "submission",
          source,
          referrer: document.referrer || "",
        }),
      }).catch(() => {});
      clearAnswers();
      router.replace(data.resultUrl);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="w-full border-b border-[#F0F0F0] bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-center">
          <Logo height={18} className="text-[#1B1B1B]" />
        </div>
      </nav>

      <div className="flex-1 flex items-start justify-center px-6 md:px-10 pt-10 md:pt-16 pb-20">
        {!hydrated ? null : stepNum === 1 ? (
          <QuizStep<Vertical>
            step={1}
            total={TOTAL_STEPS}
            question={Q1_VERTICAL.question}
            options={Q1_VERTICAL.options}
            value={answers.vertical}
            onSelect={(id) => select("vertical", id)}
            onBack={goBack}
          />
        ) : stepNum === 2 ? (
          <QuizStep<Revenue>
            step={2}
            total={TOTAL_STEPS}
            question={Q2_REVENUE.question}
            options={Q2_REVENUE.options}
            value={answers.revenue}
            onSelect={(id) => select("revenue", id)}
            onBack={goBack}
          />
        ) : stepNum === 3 ? (
          <QuizStep<TrafficSource>
            step={3}
            total={TOTAL_STEPS}
            question={Q3_TRAFFIC.question}
            options={Q3_TRAFFIC.options}
            value={answers.trafficSource}
            onSelect={(id) => select("trafficSource", id)}
            onBack={goBack}
          />
        ) : stepNum === 4 ? (
          <QuizStep<PainPoint>
            step={4}
            total={TOTAL_STEPS}
            question={Q4_PAIN.question}
            options={Q4_PAIN.options}
            value={answers.painPoint}
            onSelect={(id) => select("painPoint", id)}
            onBack={goBack}
          />
        ) : stepNum === 5 ? (
          <QuizStep<CroHistory>
            step={5}
            total={TOTAL_STEPS}
            question={Q5_CRO.question}
            options={Q5_CRO.options}
            value={answers.croHistory}
            onSelect={(id) => select("croHistory", id)}
            onBack={goBack}
          />
        ) : (
          <ContactFormStep
            step={6}
            total={TOTAL_STEPS}
            loading={submitting}
            error={submitError}
            onSubmit={submitContact}
            onBack={() => router.push("/quiz/5")}
          />
        )}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">That step doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-[#666]">
          Head back to <a href="/quiz" className="text-[#1B1B1B] underline">the start</a>.
        </p>
      </div>
    </div>
  );
}
