import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const SETTINGS_ID = "business-settings-singleton";

async function getTeam() {
  const { data } = await supabase
    .from("business_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .limit(1);
  return data?.[0]?.data?.team || [];
}

async function saveTeam(team: any[]) {
  const { data } = await supabase
    .from("business_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .limit(1);
  const current = data?.[0]?.data || {};
  await supabase.from("business_settings").update({
    data: { ...current, team },
    updated_at: new Date().toISOString(),
  }).eq("id", SETTINGS_ID);
}

// GET — fetch NDA for a team member by token (token = member ID)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  const team = await getTeam();
  const member = team.find((m: any) => m.id === token);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    nda: {
      memberName: member.name,
      memberRole: member.role,
      signed: !!member.nda_signed,
      signedDate: member.nda_signed_date || null,
      signedName: member.nda_signed_name || null,
      signatureImage: member.nda_signature_image || null,
    },
  });
}

// POST — sign the NDA
export async function POST(req: NextRequest) {
  const { token, signedName, signatureImage } = await req.json();
  if (!token || !signedName) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const team = await getTeam();
  const idx = team.findIndex((m: any) => m.id === token);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  team[idx] = {
    ...team[idx],
    nda_signed: true,
    nda_signed_date: new Date().toISOString().split("T")[0],
    nda_signed_name: signedName,
    nda_signature_image: signatureImage || "",
  };

  await saveTeam(team);
  return NextResponse.json({ ok: true });
}
