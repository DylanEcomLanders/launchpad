import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/portal/approve
 * Record a client approval for a deliverable or phase.
 *
 * Body: { token, approvalType, referenceId, approvedBy?, comment? }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { token, approvalType, referenceId, approvedBy, comment } = body;

  if (!token || !approvalType || !referenceId) {
    return NextResponse.json(
      { error: "token, approvalType, and referenceId are required" },
      { status: 400 }
    );
  }

  if (!["deliverable", "phase"].includes(approvalType)) {
    return NextResponse.json(
      { error: "approvalType must be 'deliverable' or 'phase'" },
      { status: 400 }
    );
  }

  // Look up portal by token
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

  // Check for duplicate approval
  const { data: existing } = await supabase
    .from("portal_approvals")
    .select("id")
    .eq("portal_id", portalId)
    .eq("approval_type", approvalType)
    .eq("reference_id", referenceId)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ already_approved: true, id: existing[0].id });
  }

  // Record approval
  const { data: approval, error: insertError } = await supabase
    .from("portal_approvals")
    .insert({
      portal_id: portalId,
      approval_type: approvalType,
      reference_id: referenceId,
      approved_by: approvedBy || "Client",
      comment: comment || "",
    })
    .select()
    .single();

  if (insertError) {
    console.error("[portal/approve] Insert error:", insertError);
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ approved: true, approval });
}
