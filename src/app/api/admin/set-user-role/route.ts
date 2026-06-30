/* ── POST /api/admin/set-user-role ──
 *
 * Change an app_users row's role (admin / cro / team). This is the
 * promote/demote control behind the Team Access page + the Person
 * page's access-level picker.
 *
 * Why a service-role route rather than a client-side update: role is
 * security-sensitive (it gates every admin/finance surface), and the
 * anon key's RLS on app_users blocks the write from a team-role
 * session anyway. Gated to a verified admin cookie so only admins can
 * elevate or demote.
 *
 * Body: { id, role }
 * Returns { ok: true }.
 *
 * Note: the affected user picks up the new role on their NEXT sign-in
 * (role is resolved + cached at sign-in). Tell them to sign out / in.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient, AdminAuthConfigError } from "@/lib/auth/admin-supabase";
import { authedRole } from "@/lib/auth/role";

const VALID_ROLES = new Set(["admin", "cro", "team"]);

interface Body {
  id?: string;
  role?: string;
}

export async function POST(req: NextRequest) {
  if (authedRole(req, ["admin"]) !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id?.trim();
  const role = body.role?.trim();
  if (!id || !role || !VALID_ROLES.has(role)) {
    return NextResponse.json(
      { error: "id and a valid role (admin / cro / team) are required" },
      { status: 400 },
    );
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

  const { error } = await supa.from("app_users").update({ role }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
