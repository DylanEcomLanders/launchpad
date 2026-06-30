/* ── POST /api/admin/set-user-credentials ──
 *
 * Admin-direct login provisioning. Bypasses the invite-by-email
 * flow when SMTP / deliverability is shaky or admin wants to hand
 * credentials over manually (e.g. paste them into Slack DM).
 *
 * Body: { email, password, name, podMemberId? }
 *
 * What it does:
 *   1. Checks the caller's launchpad-role cookie is "admin"
 *   2. Adds the email to app_users (allowlist) if missing
 *   3. Creates the Supabase Auth user with email + password +
 *      email_confirm=true (skip email verification) so the user
 *      can log in immediately. If an Auth user already exists for
 *      this email, updates their password instead.
 *
 * Result: admin hands the email+password to the team member; they
 * sign in at /login with those credentials. No email round-trip.
 *
 * Access control: only emails in app_users can sign in. Self-signup
 * in Supabase Auth is not exposed in our UI.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient } from "@/lib/auth/admin-supabase";
import { authedRole } from "@/lib/auth/role";

interface SetCredentialsBody {
  email?: string;
  password?: string;
  name?: string;
  podMemberId?: string | null;
  /* Access level for the allowlist row. Defaults to "team" (member).
   * Pass "admin" to provision a full-access login. */
  role?: "admin" | "cro" | "team";
}

const VALID_ROLES = new Set(["admin", "cro", "team"]);

export async function POST(req: NextRequest) {
  // C1 fix: require a verified admin role. authedRole prefers the signed
  // session cookie; the legacy unsigned cookie is only honoured while
  // AUTH_LEGACY_COOKIE !== "off" (transition). This is the most sensitive
  // route in the app (service-role user/password provisioning), so it
  // should be the first to have AUTH_LEGACY_COOKIE=off enforced.
  if (authedRole(req, ["admin"]) !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: SetCredentialsBody;
  try {
    body = (await req.json()) as SetCredentialsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const name = body.name?.trim();
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "email, password, and name are required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const role = VALID_ROLES.has(body.role ?? "") ? body.role! : "team";

  const client = adminAuthClient();

  /* 1. Add to app_users allowlist. Unique-email constraint makes
   * this idempotent - duplicates are treated as "already on list".
   * On a duplicate we still apply the chosen role so this doubles as
   * a promote/demote when the admin resets an existing person's
   * credentials and picks a different access level. */
  const { error: insertErr } = await client.from("app_users").insert({
    email,
    name,
    role,
    pod_member_id: body.podMemberId ?? null,
    invited_by: "admin",
  });
  if (insertErr) {
    const code = (insertErr as { code?: string }).code;
    if (code === "23505") {
      /* Already on the allowlist — update the role to match the
       * admin's selection so the picker is authoritative. */
      const { error: roleErr } = await client
        .from("app_users")
        .update({ role })
        .eq("email", email);
      if (roleErr) {
        return NextResponse.json(
          { error: roleErr.message || "Role update failed" },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { error: insertErr.message || "Allowlist insert failed" },
        { status: 500 },
      );
    }
  }

  /* 2. Check if an Auth user exists for this email. If yes, update
   * password; if no, create with password + skip-confirm. */
  const { data: existing, error: lookupErr } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (lookupErr) {
    return NextResponse.json(
      { error: lookupErr.message || "Auth lookup failed" },
      { status: 500 },
    );
  }
  const existingUser = existing?.users.find(
    (u) => u.email?.toLowerCase() === email,
  );

  if (existingUser) {
    const { error: updateErr } = await client.auth.admin.updateUserById(
      existingUser.id,
      { password, email_confirm: true },
    );
    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message || "Password update failed" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, mode: "updated" });
  }

  const { error: createErr } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createErr) {
    return NextResponse.json(
      { error: createErr.message || "Auth user create failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, mode: "created" });
}
