/* ── POST /api/admin/invite-user ──
 *
 * Admin invites a new team member. Server-side because it needs the
 * service-role key to call auth.admin.inviteUserByEmail.
 *
 * Body: { email, name, podMemberId? }
 *
 * What it does:
 *   1. Checks the caller's launchpad-role cookie is "admin"
 *   2. Adds the email to app_users (allowlist) if not already there
 *   3. Calls supabase.auth.admin.inviteUserByEmail with redirect to
 *      /login/reset-password so the user lands on the set-password
 *      form, not a logged-in shell.
 *
 * Result: the user gets an email with a link. Click → land on the
 * reset-password page → set a password → land on the app. No magic
 * link round-trip needed.
 *
 * Access control: only emails on app_users can sign in afterwards
 * (every sign-in path pre-checks). Self-signup in Supabase Auth is
 * not exposed in our UI - if you want belt-and-braces, also disable
 * signup in the Supabase Auth settings dashboard.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient } from "@/lib/auth/admin-supabase";

interface InviteBody {
  email?: string;
  name?: string;
  podMemberId?: string | null;
}

export async function POST(req: NextRequest) {
  /* Admin gate - the cookie is set by AuthGate when Dylan logs in with
   * the shared admin password OR by magic link as an admin role. */
  const role = req.cookies.get("launchpad-role")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  if (!email || !name) {
    return NextResponse.json(
      { error: "email and name are required" },
      { status: 400 },
    );
  }

  const client = adminAuthClient();

  /* 1. Add to app_users allowlist. Insert is idempotent-ish - the
   * unique-email constraint will reject duplicates which we treat as
   * "already on the list, fine". */
  const { error: insertErr } = await client.from("app_users").insert({
    email,
    name,
    role: "team",
    pod_member_id: body.podMemberId ?? null,
    invited_by: "admin",
  });
  /* 23505 = unique violation in Postgres. Anything else is a real
   * failure. PGRST errors come through with a code, plain pg errors
   * have a numeric code. */
  if (insertErr) {
    const code = (insertErr as { code?: string }).code;
    if (code !== "23505") {
      return NextResponse.json(
        { error: insertErr.message || "Allowlist insert failed" },
        { status: 500 },
      );
    }
  }

  /* 2. Send the invite email via Supabase Auth. inviteUserByEmail
   * creates the Auth user (if not already present) and emails them an
   * invite link. We point the link at the reset-password page so they
   * set a password as their first action; landing on /me would skip
   * that step. */
  const origin = new URL(req.url).origin;
  const { error: inviteErr } = await client.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${origin}/login/reset-password` },
  );
  if (inviteErr) {
    return NextResponse.json(
      { error: inviteErr.message || "Invite failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
