export interface FeedbackSubmission {
  id: string;
  client_name: string;
  client_email?: string;
  rating: number; // 1–5
  quality: number; // 1–5
  communication: number; // 1–5
  recommend_score: number; // 1–10
  testimonial: string;
  improvements: string;
  submitted_at: string;
}
