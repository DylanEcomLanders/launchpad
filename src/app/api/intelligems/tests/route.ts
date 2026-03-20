import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch tests from Intelligems API with analytics.
 * Only fetches active tests + last 5 ended tests to avoid rate limits.
 * POST { apiKey: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey) {
      return NextResponse.json({ error: "No API key" }, { status: 400 });
    }

    // Fetch experiments list
    const listRes = await fetch("https://api.intelligems.io/v25-10-beta/experiences-list", {
      headers: { "intelligems-access-token": apiKey },
    });
    if (!listRes.ok) {
      return NextResponse.json({ error: "Failed to fetch experiments" }, { status: listRes.status });
    }

    const listData = await listRes.json();
    const allExperiments = listData.experiencesList || [];

    // Only fetch analytics for active tests + last 5 ended (avoid rate limits)
    const active = allExperiments.filter((e: any) => e.status === "started");
    const ended = allExperiments.filter((e: any) => e.status === "ended").slice(0, 5);
    const experiments = [...active, ...ended];

    // Fetch analytics sequentially with 800ms delay to avoid 429s
    const tests = [];
    for (const exp of experiments) {
      try {
        const analyticsRes = await fetch(
          `https://api.intelligems.io/v25-10-beta/analytics/resource/${exp.id}`,
          { headers: { "intelligems-access-token": apiKey } }
        );
        if (!analyticsRes.ok) {
          // Still add the test without analytics if rate limited
          tests.push({
            id: exp.id,
            name: exp.name,
            status: exp.status,
            startedAt: exp.startedAt || exp.created_at || "",
            variations: [],
          });
          continue;
        }
        const analyticsData = await analyticsRes.json();
        const metrics = analyticsData.metrics || [];

        const variations = metrics.map((m: any, idx: number) => ({
          name: m.variation_name || `Variant ${idx === 0 ? "A" : "B"}`,
          cvr: m.conversion_rate ?? 0,
          aov: m.net_revenue_per_order ?? 0,
          rpv: m.net_revenue_per_visitor ?? 0,
          visitors: m.n_visitors ?? 0,
          orders: m.n_orders ?? 0,
          revenue: m.net_revenue ?? 0,
        }));

        tests.push({
          id: exp.id,
          name: exp.name,
          status: exp.status,
          startedAt: exp.startedAt || exp.created_at || "",
          variations,
        });
      } catch {
        tests.push({
          id: exp.id,
          name: exp.name,
          status: exp.status,
          startedAt: "",
          variations: [],
        });
      }

      // Rate limit: 800ms between each request
      await new Promise((r) => setTimeout(r, 800));
    }

    return NextResponse.json({ tests });
  } catch (err: any) {
    console.error("Intelligems API error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
