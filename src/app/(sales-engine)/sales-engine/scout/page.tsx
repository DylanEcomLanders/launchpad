"use client";

import { useState, useRef } from "react";
import { MagnifyingGlassIcon, BoltIcon } from "@heroicons/react/24/outline";

interface LogEntry {
  type: "status" | "search" | "lead_found" | "lead_saved" | "text" | "done" | "error";
  data: any;
  ts: string;
}

export default function ScoutPage() {
  const [niche, setNiche] = useState("");
  const [count, setCount] = useState(10);
  const [slackChannel, setSlackChannel] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<{ total: number; saved: number; skipped: number; searches: number } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  function addLog(entry: LogEntry) {
    setLog(prev => [...prev, entry]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }

  async function runScout() {
    if (!niche.trim() || running) return;
    setRunning(true);
    setLog([]);
    setStats(null);

    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: niche.trim(),
          count,
          slackChannel: slackChannel.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        addLog({ type: "error", data: { message: err.error }, ts: new Date().toISOString() });
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              const entry: LogEntry = { type: eventType as any, data, ts: new Date().toISOString() };
              addLog(entry);
              if (eventType === "done") setStats(data);
            } catch { /* skip */ }
            eventType = "";
          }
        }
      }
    } catch (err) {
      addLog({ type: "error", data: { message: String(err) }, ts: new Date().toISOString() });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Scout</h1>
          <p className="text-sm text-subtle mt-1">
            Discover DTC brands, research funnels, find decision-makers. Results saved to Leads.
          </p>
        </div>

        {/* Config */}
        <div className="border border-foreground rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-subtle mb-1.5">Niche / Vertical</label>
              <input
                type="text"
                value={niche}
                onChange={e => setNiche(e.target.value)}
                placeholder="e.g. Supplements, Pet Food, Skincare"
                className="w-full px-3 py-2 text-sm border border-foreground rounded-lg focus:outline-none focus:border-surface"
                onKeyDown={e => e.key === "Enter" && runScout()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-subtle mb-1.5">Brand Count</label>
              <select
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-foreground rounded-lg focus:outline-none focus:border-surface"
              >
                {[5, 10, 15, 20, 25].map(n => (
                  <option key={n} value={n}>{n} brands</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-subtle mb-1.5">Slack Channel (optional)</label>
              <input
                type="text"
                value={slackChannel}
                onChange={e => setSlackChannel(e.target.value)}
                placeholder="#scout-reports"
                className="w-full px-3 py-2 text-sm border border-foreground rounded-lg focus:outline-none focus:border-surface"
              />
            </div>
          </div>

          <button
            onClick={runScout}
            disabled={running || !niche.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface text-foreground text-xs font-semibold rounded-lg hover:bg-border transition-colors disabled:opacity-40"
          >
            {running ? (
              <>
                <div className="animate-spin size-3.5 border-2 border-foreground/30 border-t-foreground rounded-full" />
                Scouting...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="size-3.5" />
                Run Scout
              </>
            )}
          </button>
        </div>

        {/* Results summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Brands Found", value: stats.total, color: "var(--foreground)" },
              { label: "Saved to Leads", value: stats.saved, color: "var(--color-success)" },
              { label: "Skipped (dupes)", value: stats.skipped, color: "var(--color-warning)" },
              { label: "Web Searches", value: stats.searches, color: "var(--color-info)" },
            ].map(s => (
              <div key={s.label} className="border border-foreground rounded-xl p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-subtle mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Live log */}
        {log.length > 0 && (
          <div className="border border-foreground rounded-xl overflow-hidden">
            <div className="bg-surface-raised px-4 py-2.5 border-b border-foreground flex items-center gap-2">
              <BoltIcon className="size-3.5 text-subtle" />
              <span className="text-xs font-medium text-subtle">Live Feed</span>
              {running && <div className="animate-pulse size-2 rounded-full bg-success" />}
            </div>
            <div ref={logRef} className="max-h-[500px] overflow-y-auto p-4 space-y-1.5 font-mono text-xs">
              {log.filter(l => l.type !== "text").map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-muted shrink-0 w-16">
                    {new Date(entry.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  {entry.type === "status" && (
                    <span className="text-subtle">{entry.data.message}</span>
                  )}
                  {entry.type === "search" && (
                    <span className="text-info">Web search #{entry.data.count}</span>
                  )}
                  {entry.type === "lead_found" && (
                    <span className="text-warning">
                      Found: {entry.data.brand} {entry.data.priority ? "★" : ""}
                    </span>
                  )}
                  {entry.type === "lead_saved" && (
                    <span className="text-success">Saved: {entry.data.brand}</span>
                  )}
                  {entry.type === "done" && (
                    <span className="text-success font-semibold">
                      Done — {entry.data.saved} leads saved, {entry.data.searches} searches
                    </span>
                  )}
                  {entry.type === "error" && (
                    <span className="text-danger">{entry.data.message}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
