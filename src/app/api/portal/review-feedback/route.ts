import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/portal/review-feedback
 * Record a client's approval or change-request for a design review version.
 *
 * Body: { token, reviewId, versionId, action, comment?, submittedBy? }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { token, reviewId, versionId, action, comment, submittedBy } = body;

  if (!token || !reviewId || !versionId || !action) {
    return NextResponse.json(
      { error: "token, reviewId, versionId, and action are required" },
      { status: 400 }
    );
  }

  if (!["approved", "changes_requested"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'approved' or 'changes_requested'" },
      { status: 400 }
    );
  }

  // Validate token → portal
  let portalId: string | null = null;
  try {
    const { data, error } = await supabase
      .from("client_portals")
      .select("id")
      .eq("token", token)
      .single();
    if (error) throw error;
    portalId = data?.id ?? null;
  } catch {
    return NextResponse.json(
      { error: "Portal not found" },
      { status: 404 }
    );
  }

  if (!portalId) {
    return NextResponse.json(
      { error: "Portal not found" },
      { status: 404 }
    );
  }

  // Validate review belongs to portal
  try {
    const { data, error } = await supabase
      .from("design_reviews")
      .select("id")
      .eq("id", reviewId)
      .eq("portal_id", portalId)
      .single();
    if (error || !data) throw error;
  } catch {
    return NextResponse.json(
      { error: "Review not found" },
      { status: 404 }
    );
  }

  // Record feedback
  const { data: feedback, error: insertError } = await supabase
    .from("design_review_feedback")
    .insert({
      version_id: versionId,
      review_id: reviewId,
      action,
      comment: comment || "",
      submitted_by: submittedBy || "Client",
    })
    .select()
    .single();

  if (insertError) {
    console.error("[portal/review-feedback] Insert error:", insertError);
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  // Update review status to match latest action
  const newStatus = action === "approved" ? "approved" : "changes_requested";
  await supabase
    .from("design_reviews")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", reviewId);

  return NextResponse.json({ success: true, feedback });
}
