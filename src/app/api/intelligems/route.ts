import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.intelligems.io/v25-10-beta";

/**
 * Proxy for Intelligems API.
 * GET /api/intelligems?key=xxx             → list experiences
 * GET /api/intelligems?key=xxx&id=abc      → get experience details + analytics
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const id = req.nextUrl.searchParams.get("id");

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const headers = {
    "intelligems-access-token": key,
    "Content-Type": "application/json",
  };

  try {
    if (id) {
      // Fetch experience details + analytics in parallel
      const [expRes, analyticsRes] = await Promise.all([
        fetch(`${BASE}/experiences/${id}`, { headers }),
        fetch(`${BASE}/analytics/resource/${id}`, { headers }),
      ]);

      if (!expRes.ok || !analyticsRes.ok) {
        return NextResponse.json(
          { error: "Intelligems API error" },
          { status: expRes.status }
        );
      }

      const [expData, analyticsData] = await Promise.all([
        expRes.json(),
        analyticsRes.json(),
      ]);

      return NextResponse.json({
        experience: expData.experience || expData,
        analytics: analyticsData,
      });
    }

    // List all experiences
    const res = await fetch(`${BASE}/experiences-list`, { headers });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Intelligems API error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch from Intelligems" },
      { status: 500 }
    );
  }
}
