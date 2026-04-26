import QuizStepClient from "./step-client";

interface Params {
  step: string;
}

export default async function QuizStepPage({ params }: { params: Promise<Params> }) {
  const { step } = await params;
  return <QuizStepClient step={step} />;
}
