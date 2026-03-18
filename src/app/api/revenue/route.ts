import { NextResponse } from "next/server";
import Whop from "@whop/sdk";

// ── Revenue data from Whop payments API ─────────────────────
// Returns aggregated revenue data: monthly totals, per-client breakdown,
// recent payments list. Protected by simple password check.

export async function POST(request: Request) {
  const dashPassword = process.env.REVENUE_DASH_PASSWORD || "ecomlanders2025";

  // Check password first — before env var validation
  let body: { password: string; months?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.password !== dashPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_COMPANY_ID;

  if (!apiKey || !companyId) {
    return NextResponse.json(
      { error: "Whop API keys not configured — add WHOP_API_KEY and WHOP_COMPANY_ID to env" },
      { status: 500 }
    );
  }

  const monthsBack = body.months || 12;
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  const client = new Whop({ apiKey });

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const allPayments: any[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    // Paginate through all payments
    while (hasMore) {
      const params: any = {
        company_id: companyId,
        statuses: ["paid"],
        created_after: since.toISOString(),
        first: 100,
        order: "created_at",
        direction: "desc",
      };
      if (cursor) params.after = cursor;

      const res = await client.payments.list(params);
      const items = (res as any).data || [];
      allPayments.push(...items);

      const pageInfo = (res as any).page_info;
      if (pageInfo?.has_next_page && pageInfo?.end_cursor) {
        cursor = pageInfo.end_cursor;
      } else {
        hasMore = false;
      }
    }

    // ── Aggregate monthly revenue ─────────────────────────────
    const monthlyMap = new Map<string, number>();
    const clientMap = new Map<string, { total: number; count: number; name: string }>();

    for (const p of allPayments) {
      const date = new Date(p.paid_at || p.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const amount = p.total ?? p.subtotal ?? 0;
      const currency = (p.currency || "gbp").toUpperCase();

      // Normalise to GBP pennies → pounds
      const amountGBP = currency === "GBP" ? amount / 100 : (p.usd_total ?? amount) / 100;

      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amountGBP);

      // Client breakdown
      const clientName =
        p.metadata?.client_name ||
        p.user?.name ||
        p.user?.username ||
        p.product?.title ||
        "Unknown";
      const existing = clientMap.get(clientName);
      if (existing) {
        existing.total += amountGBP;
        existing.count += 1;
      } else {
        clientMap.set(clientName, { total: amountGBP, count: 1, name: clientName });
      }
    }

    // ── Build sorted monthly array ────────────────────────────
    const monthly = Array.from(monthlyMap.entries())
      .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ── Client breakdown sorted by revenue ────────────────────
    const clients = Array.from(clientMap.values())
      .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    // ── Recent payments (last 20) ─────────────────────────────
    const recent = allPayments.slice(0, 20).map((p: any) => ({
      id: p.id,
      amount: Math.round((p.total ?? p.subtotal ?? 0) / 100 * 100) / 100,
      currency: (p.currency || "gbp").toUpperCase(),
      date: p.paid_at || p.created_at,
      client:
        p.metadata?.client_name ||
        p.user?.name ||
        p.user?.username ||
        "Unknown",
      product: p.product?.title || "—",
      status: p.status,
    }));

    // ── Summary stats ─────────────────────────────────────────
    const totalRevenue = monthly.reduce((sum, m) => sum + m.total, 0);
    const thisMonth = new Date();
    const thisMonthKey = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

    const thisMonthRev = monthlyMap.get(thisMonthKey) || 0;
    const lastMonthRev = monthlyMap.get(lastMonthKey) || 0;

    /* eslint-enable @typescript-eslint/no-explicit-any */

    return NextResponse.json({
      summary: {
        total: Math.round(totalRevenue * 100) / 100,
        thisMonth: Math.round(thisMonthRev * 100) / 100,
        lastMonth: Math.round(lastMonthRev * 100) / 100,
        paymentCount: allPayments.length,
        clientCount: clientMap.size,
      },
      monthly,
      clients,
      recent,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[revenue] Whop API failed:", errMsg);
    return NextResponse.json(
      { error: "Failed to fetch revenue data", detail: errMsg },
      { status: 502 }
    );
  }
}
