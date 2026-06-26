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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  if (!matched) {
    return NextResponse.json({ person: null });
  }

  return NextResponse.json({
    person: {
      id: matched.id,
      full_name: matched.data.full_name ?? "",
      email: matched.data.email ?? "",
    },
  });
}
