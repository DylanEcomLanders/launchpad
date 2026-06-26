/* ── /api/admin/sync-company ──
 *
 * One-shot upsert for the four company_* tables. Used to push
 * localStorage rows (admin's browser cache from before the migration
 * landed) up into Supabase so other users can see them.
 *
 * Body: { people?: Row[], invoices?: Row[], open_roles?: Row[], candidates?: Row[] }
 * where Row is { id, ...rest }. We split id off into the row's id
 * column and store the rest in the data JSONB column.
 *
 * Uses service role so it bypasses RLS. Gated to admin/cro cookie
 * role so a random team-role visitor can't blast the tables.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient, AdminAuthConfigError } from "@/lib/auth/admin-supabase";

interface Row {
  id: string;
  [key: string]: unknown;
}

interface Body {
  people?: Row[];
  invoices?: Row[];
  open_roles?: Row[];
  candidates?: Row[];
}

const TABLES: Array<{ key: keyof Body; table: string }> = [
  { key: "people", table: "company_people" },
  { key: "invoices", table: "company_invoices" },
  { key: "open_roles", table: "company_open_roles" },
  { key: "candidates", table: "company_candidates" },
];

export async function POST(req: NextRequest) {
  const role = req.cookies.get("launchpad-role")?.value;
  if (role !== "admin" && role !== "cro") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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

  const results: Record<string, { synced: number; error?: string }> = {};

  for (const { key, table } of TABLES) {
    const rows = body[key];
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      results[table] = { synced: 0 };
      continue;
    }
    const payload = rows
      .filter((r) => r && typeof r === "object" && typeof r.id === "string")
      .map((r) => {
        const { id, ...rest } = r;
        return { id, data: rest, created_at: new Date().toISOString() };
      });
    if (payload.length === 0) {
      results[table] = { synced: 0 };
      continue;
    }
    const { error } = await supa.from(table).upsert(payload, { onConflict: "id" });
    if (error) {
      results[table] = { synced: 0, error: error.message };
    } else {
      results[table] = { synced: payload.length };
    }
  }

  return NextResponse.json({ ok: true, results });
}
