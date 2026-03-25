import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch metrics for a single Intelligems test by ID.
 * POST { apiKey, testId }
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey, testId } = await req.json();

    if (!apiKey || !testId) {
      return NextResponse.json({ error: "apiKey and testId required" }, { status: 400 });
    }

    // Fetch test details
    const detailRes = await fetch(`https://api.intelligems.io/v25-10-beta/experiences-list`, {
      headers: { "intelligems-access-token": apiKey },
    });

    if (!detailRes.ok) {
      return NextResponse.json({ error: "Failed to fetch test list" }, { status: 500 });
    }

    const detailData = await detailRes.json();
    const test = (detailData.experiencesList || []).find((t: any) => t.id === testId);

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Fetch analytics for this test
    const analyticsRes = await fetch(`https://api.intelligems.io/v25-10-beta/analytics/resource/${testId}`, {
      headers: { "intelligems-access-token": apiKey },
    });

    if (!analyticsRes.ok) {
      return NextResponse.json({
        test: { name: test.name, status: test.status },
        metrics: null,
        error: "Analytics unavailable",
      });
    }

    const analyticsData = await analyticsRes.json();
    const metrics = analyticsData.metrics || [];

    // Map variations
    const variations = metrics.map((m: any) => ({
      name: m.variation_name || m.variation_id?.slice(0, 8) || "Unknown",
      cvr: ((m.conversion_rate?.value || m.conversion_rate || 0) * 100).toFixed(1) + "%",
      aov: "$" + (m.net_revenue_per_order?.value || m.net_revenue_per_order || m.avg_product_revenue_per_unit?.value || 0).toFixed(2),
      rpv: "$" + (m.net_revenue_per_visitor?.value || m.net_revenue_per_visitor || 0).toFixed(2),
      visitors: m.n_visitors?.value || m.n_visitors || 0,
      orders: m.n_orders?.value || m.n_orders || 0,
      revenue: m.net_revenue?.value || m.net_revenue || 0,
    }));

    // Build A/B snapshot (first variation = A, second = B)
    const varA = variations[0];
    const varB = variations[1];

    return NextResponse.json({
      test: {
        name: test.name,
        status: test.status, // "started", "ended", "pending"
      },
      metrics: {
        cvr: varA && varB ? { a: varA.cvr, b: varB.cvr } : null,
        aov: varA && varB ? { a: varA.aov, b: varB.aov } : null,
        rpv: varA && varB ? { a: varA.rpv, b: varB.rpv } : null,
      },
      variations,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
