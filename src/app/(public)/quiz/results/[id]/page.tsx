import { notFound } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fromRow, type QuizSubmissionRow } from "@/lib/quiz/types";
import ResultsClient from "./results-client";

interface Params {
  id: string;
}

export default async function QuizResultsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) return notFound();

  // The route param is the result_page_id (separate UUID from the row id)
  // so we don't expose the primary key. Lookup by that token.
  const { data, error } = await supabase
    .from("quiz_submissions")
    .select("*")
    .eq("result_page_id", id)
    .single();

  if (error || !data) return notFound();

  return <ResultsClient submission={fromRow(data as QuizSubmissionRow)} />;
}
