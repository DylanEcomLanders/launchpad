/* ── /api/me/resolve-person ──
 *
 * Server-side Person lookup bypassing RLS. Client posts the signed-in
 * AppUser's identifiers (email, name, pod_member_id); we use the
 * service-role client to read company_people, then match against the
 * same three lanes as the /me/invoices client matcher:
 *   1. pod_member_id (only when non-empty)
 *   2. email (trim + lowercase)
 *   3. full_name (trim + lowercase)
 *
 * Exists because team-role users can't read company_people directly
 * via the anon key under the current RLS posture; without this route
 * they'd see "we couldn't link your account" even when their Person
 * row is perfectly set up.
 *
 * Returns { person: { id, full_name, email } | null }.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient, AdminAuthConfigError } from "@/lib/auth/admin-supabase";

interface Body {
  email?: string;
  name?: string;
  pod_member_id?: string | null;
}

interface PersonData {
  full_name?: string;
  email?: string;
  pod_member_id?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim().toLowerCase();
  const pod = body.pod_member_id || null;

  if (!email && !name && !pod) {
    return NextResponse.json({ person: null });
  }

  let supa;
  try {
    supa = adminAuthClient();
  } catch (err) {
    if (err instanceof AdminAuthConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  const { data, error } = await supa
    .from("company_people")
    .select("id,data");
  if (error) {
    return NextResponse.json(
      { error: error.message, stage: "select_company_people" },
      { status: 500 },
    );
  }

  type Row = { id: string; data: PersonData };
  const rows = (data ?? []) as Row[];

  const byPod = pod
    ? rows.find((r) => r.data?.pod_member_id === pod)
    : undefined;
  const byEmail = !byPod && email
    ? rows.find((r) => r.data?.email?.trim().toLowerCase() === email)
    : undefined;
  const byName = !byPod && !byEmail && name
    ? rows.find((r) => r.data?.full_name?.trim().toLowerCase() === name)
    : undefined;

  const matched = byPod ?? byEmail ?? byName;

  /* Diagnostic: when no match, return a snapshot so the UI can show
   * exactly what we looked at vs what we looked for. Stops the
   * back-and-forth where we keep guessing why a match failed.
   * Sample is the first 5 rows' normalised email/name/pod. */
  const diagnostic = {
    query: { email: email || null, name: name || null, pod },
    peopleCount: rows.length,
    sample: rows.slice(0, 5).map((r) => ({
      id: r.id,
      email: r.data?.email?.trim().toLowerCase() || null,
      name: r.data?.full_name?.trim().toLowerCase() || null,
      pod_member_id: r.data?.pod_member_id ?? null,
    })),
    matchedBy: byPod ? "pod" : byEmail ? "email" : byName ? "name" : null,
  };

  if (!matched) {
    return NextResponse.json({ person: null, diagnostic });
  }

  return NextResponse.json({
    person: {
      id: matched.id,
      full_name: matched.data.full_name ?? "",
      email: matched.data.email ?? "",
      /* The person record is the TRUTH for which pod member this human is.
       * app_users.pod_member_id is only a copy, stamped once when their login
       * was provisioned: assigning someone to a pod afterwards never reached
       * it, and a second login for the same human missed it entirely. Callers
       * derive from this instead, so a pod change takes effect immediately
       * with no re-provisioning and no SQL. */
      pod_member_id: matched.data.pod_member_id ?? null,
    },
    diagnostic,
  });
}
