"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ── Types ── */

interface RevenueSummary {
  total: number;
  thisMonth: number;
  lastMonth: number;
  paymentCount: number;
  clientCount: number;
}

interface MonthlyData {
  month: string;
  total: number;
}

interface ClientData {
  name: string;
  total: number;
  count: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  currency: string;
  date: string;
  client: string;
  product: string;
  status: string;
}

interface RevenueData {
  summary: RevenueSummary;
  monthly: MonthlyData[];
  clients: ClientData[];
  recent: RecentPayment[];
}

/* ── Format helpers ── */

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(n);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── Custom Tooltip ── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1B1B1B] text-white px-3 py-2 rounded-lg text-xs shadow-xl">
      <p className="text-[#999] mb-0.5">{label}</p>
      <p className="font-semibold">{fmtFull(payload[0].value)}</p>
    </div>
  );
}

/* ── Password Gate ── */

function PasswordGate({ onUnlock }: { onUnlock: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      if (res.status === 401) {
        setError("Incorrect password");
        setLoading(false);
        return;
      }

      if (res.status === 500) {
        // Server misconfigured but password may be correct — let through
        // Dashboard will show a proper error when it tries to load data
        onUnlock(pw);
        return;
      }

      if (res.ok) {
        onUnlock(pw);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Something went wrong");
      }
    } catch {
      setError("Failed to connect");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#1B1B1B] mb-4">
            <svg className="size-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Revenue Dashboard</h2>
          <p className="text-xs text-[#999] mt-1">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setError("");
            }}
            placeholder="Password"
            autoFocus
            className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
              error
                ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                : "border-[#E5E5EA] focus:ring-[#1B1B1B]/10 focus:border-[#C5C5C5]"
            }`}
          />
          {error && (
            <p className="text-[11px] text-red-500 mt-1.5">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !pw.trim()}
            className="w-full mt-3 px-4 py-3 text-sm font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#333] transition-colors disabled:opacity-40"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */

export default function RevenuePage() {
  const [password, setPassword] = useState<string | null>(null);
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadData(pw: string) {
    setPassword(pw);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw, months: 12 }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to load revenue data");
        return;
      }

      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  if (!password) {
    return (
      <div className="p-6 md:p-10">
        <PasswordGate onUnlock={loadData} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-10 rounded-full bg-[#F3F3F5] mb-3 animate-pulse">
              <svg className="size-5 text-[#999]" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm text-[#999]">Loading revenue data from Whop...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 md:p-10">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-red-500 mb-3">{error || "No data"}</p>
            <button
              onClick={() => loadData(password)}
              className="px-4 py-2 text-xs font-semibold border border-[#E5E5EA] rounded-lg hover:bg-[#F3F3F5] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { summary, monthly, clients, recent } = data;

  // Chart data with formatted labels
  const chartData = monthly.map((m) => ({
    ...m,
    label: monthLabel(m.month),
  }));

  // Growth indicator
  const growth =
    summary.lastMonth > 0
      ? Math.round(((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100)
      : summary.thisMonth > 0
      ? 100
      : 0;

  // Highest month for chart highlight
  const maxMonth = Math.max(...monthly.map((m) => m.total), 0);

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="text-sm text-[#999] mt-1">Last 12 months via Whop</p>
        </div>
        <button
          onClick={() => loadData(password)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#E5E5EA] rounded-lg hover:bg-[#F3F3F5] transition-colors"
        >
          <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-3.85a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V2.535a.75.75 0 00-1.5 0v2.033l-.312-.31A7 7 0 002.63 7.395a.75.75 0 101.45.39z"
              clipRule="evenodd"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Stat Panels ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="border border-[#D0D0D0] rounded-lg px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#999] mb-1">
            Total Revenue
          </p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {fmt(summary.total)}
          </p>
        </div>

        <div className="border border-[#D0D0D0] rounded-lg px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#999] mb-1">
            This Month
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {fmt(summary.thisMonth)}
            </p>
            {growth !== 0 && (
              <span
                className={`text-[11px] font-semibold ${
                  growth > 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {growth > 0 ? "+" : ""}
                {growth}%
              </span>
            )}
          </div>
        </div>

        <div className="border border-[#D0D0D0] rounded-lg px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#999] mb-1">
            Payments
          </p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {summary.paymentCount}
          </p>
        </div>

        <div className="border border-[#D0D0D0] rounded-lg px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#999] mb-1">
            Clients
          </p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {summary.clientCount}
          </p>
        </div>
      </div>

      {/* ── Revenue Chart ── */}
      <div className="border border-[#E5E5EA] rounded-lg p-5 mb-8">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#999] mb-6">
          Monthly Revenue
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#999" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#999" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `£${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F7F8FA" }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.total === maxMonth ? "#1B1B1B" : "#D4D4D4"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center">
            <p className="text-sm text-[#999]">No payment data yet</p>
          </div>
        )}
      </div>

      {/* ── Bottom Grid: Clients + Recent ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Client */}
        <div className="border border-[#E5E5EA] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0F0F0]">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#999]">
              Revenue by Client
            </h3>
          </div>
          {clients.length > 0 ? (
            <div className="divide-y divide-[#F5F5F5]">
              {clients.slice(0, 10).map((c, i) => {
                const pct = summary.total > 0 ? (c.total / summary.total) * 100 : 0;
                return (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <div className="mt-1.5 h-1 rounded-full bg-[#F3F3F5] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1B1B1B] transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums">{fmtFull(c.total)}</p>
                      <p className="text-[10px] text-[#999]">
                        {c.count} payment{c.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[#999]">No client data</p>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="border border-[#E5E5EA] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0F0F0]">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#999]">
              Recent Payments
            </h3>
          </div>
          {recent.length > 0 ? (
            <div className="divide-y divide-[#F5F5F5]">
              {recent.slice(0, 10).map((p) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.client}</p>
                    <p className="text-[11px] text-[#999]">{dateLabel(p.date)}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums shrink-0">
                    {fmtFull(p.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[#999]">No payments yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
