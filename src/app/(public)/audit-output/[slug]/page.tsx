"use client";

/* ── Discovery Audit output deck ──
 *
 * Public-shareable rendering of a discovery audit. Strategist sends
 * the URL to a warm lead; lead opens it without auth (slug is the
 * permission gate - we don't link them up publicly). Visually a
 * deck, not a doc: cover, exec summary, snapshot, findings sorted
 * by ICE, 30/60/90 plan, recommendation.
 */

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRightIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { discoveryAuditsStore, iceScore, STAGE_META } from "@/lib/discovery-audits/data";
import type { DiscoveryAudit } from "@/lib/discovery-audits/types";

export default function AuditOutputPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [audit, setAudit] = useState<DiscoveryAudit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await discoveryAuditsStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.output_slug === slug);
      setAudit(found ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-foreground mb-3">
            Audit not found
          </h1>
          <p className="text-sm text-muted">
            This link may have moved or been removed. Reach out and we&apos;ll
            send you the new one.
          </p>
        </div>
      </div>
    );
  }

  const sortedFindings = [...audit.findings].sort(
    (a, b) => iceScore(b) - iceScore(a),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Subtle background blob to match the Hero Offer chrome */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 100%, rgba(14,165,233,0.10) 0%, transparent 50%)",
        }}
      />

      {/* Print: Download PDF button, top right. Hidden in print. */}
      <div className="max-w-4xl mx-auto px-6 pt-6 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-surface-raised text-foreground hover:bg-surface-hover ring-1 ring-border"
        >
          <ArrowDownTrayIcon className="size-3.5" />
          Download PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Cover */}
        <header>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300/80 font-semibold mb-6">
            <DocumentMagnifyingGlassIcon className="size-3.5" />
            Discovery Audit · Ecom Landers
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold bg-gradient-to-br from-white via-emerald-100 to-cyan-200 bg-clip-text text-transparent leading-[1.05] mb-4">
            {audit.brand_name || "Untitled brand"}
          </h1>
          {audit.brand_url && (
            <a
              href={audit.brand_url.startsWith("http") ? audit.brand_url : `https://${audit.brand_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-muted hover:text-emerald-300"
            >
              {audit.brand_url} ↗
            </a>
          )}
          <div className="mt-6 flex items-center gap-4 flex-wrap text-[12px] text-subtle">
            {audit.revenue_band && <Pill>{audit.revenue_band}</Pill>}
            {audit.primary_device && <Pill>{audit.primary_device} first</Pill>}
            {audit.primary_traffic_source && <Pill>{audit.primary_traffic_source}</Pill>}
            {audit.ran_by && <Pill>By {audit.ran_by}</Pill>}
            {audit.sent_at && (
              <Pill>
                {new Date(audit.sent_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Pill>
            )}
          </div>
        </header>

        {/* Executive summary */}
        {audit.executive_summary.trim() && (
          <Slide title="Executive summary" accent="emerald" subtitle="The headline. 60 seconds.">
            <Prose body={audit.executive_summary} />
          </Slide>
        )}

        {/* Snapshot */}
        {(audit.current_conversion_rate || audit.current_aov || audit.funnel_overview) && (
          <Slide
            title="Current funnel snapshot"
            accent="cyan"
            subtitle="Where you are today, from the outside."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {audit.current_conversion_rate && (
                <Stat icon={<ChartBarIcon className="size-4" />} label="Conversion rate" value={audit.current_conversion_rate} />
              )}
              {audit.current_aov && (
                <Stat icon={<ChartBarIcon className="size-4" />} label="Average order value" value={audit.current_aov} />
              )}
            </div>
            {audit.funnel_overview.trim() && <Prose body={audit.funnel_overview} />}
          </Slide>
        )}

        {/* Findings */}
        {sortedFindings.length > 0 && (
          <Slide
            title={`Findings (${sortedFindings.length})`}
            accent="emerald"
            subtitle="Ranked by ICE: Impact × Confidence × Ease."
          >
            <ol className="space-y-4">
              {sortedFindings.map((f, i) => (
                <li
                  key={f.id}
                  className="bg-background rounded-2xl p-5 ring-1 ring-border"
                >
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-subtle font-semibold">
                      #{i + 1}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface text-muted">
                      {STAGE_META[f.stage].label}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300" title="ICE score">
                      ICE {iceScore(f)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {f.title || "Untitled finding"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                    <div className="space-y-3 min-w-0">
                      {f.observation && (
                        <div>
                          <SubLabel>What we see</SubLabel>
                          <Prose body={f.observation} compact />
                        </div>
                      )}
                      {f.recommended_fix && (
                        <div>
                          <SubLabel>What we&apos;d do</SubLabel>
                          <Prose body={f.recommended_fix} compact />
                        </div>
                      )}
                      {f.revenue_cost && (
                        <div>
                          <SubLabel>Estimated cost</SubLabel>
                          <p className="text-sm text-emerald-200 font-medium">
                            {f.revenue_cost}
                          </p>
                        </div>
                      )}
                    </div>
                    {f.screenshot_url && (
                      <div className="md:w-64 shrink-0">
                        <a
                          href={f.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden ring-1 ring-border hover:ring-emerald-500/40 transition-all"
                        >
                          <Image
                            src={f.screenshot_url}
                            alt={f.title}
                            width={256}
                            height={160}
                            unoptimized
                            className="w-full h-auto"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Slide>
        )}

        {/* 30/60/90 plan */}
        {(audit.plan_30.body || audit.plan_60.body || audit.plan_90.body) && (
          <Slide title="What we'd do, sequenced" accent="cyan" subtitle="First 90 days.">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Horizon label="First 30 days" body={audit.plan_30.body} />
              <Horizon label="Day 30 - 60" body={audit.plan_60.body} />
              <Horizon label="Day 60 - 90" body={audit.plan_90.body} />
            </div>
          </Slide>
        )}

        {/* Recommendation */}
        {(audit.recommended_tier || audit.recommendation_notes.trim()) && (
          <Slide
            title="How we'd work together"
            accent="sky"
            subtitle="The recommended starting point."
          >
            {audit.recommended_tier && (
              <div className="bg-gradient-to-br from-sky-500/15 to-blue-600/15 ring-1 ring-sky-500/30 rounded-2xl p-6 mb-4">
                <div className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold mb-2">
                  Recommended tier
                </div>
                <div className="text-3xl font-semibold bg-gradient-to-br from-sky-200 to-blue-100 bg-clip-text text-transparent">
                  {audit.recommended_tier}
                </div>
              </div>
            )}
            {audit.recommendation_notes.trim() && (
              <Prose body={audit.recommendation_notes} />
            )}
            <div className="mt-6 inline-flex items-center gap-2 text-[12px] text-emerald-300">
              The £{audit.fee.toLocaleString()} audit fee credits against your retainer if you move forward.
              <ArrowRightIcon className="size-3.5" />
            </div>
          </Slide>
        )}

        {/* Footer */}
        <footer className="pt-8 pb-4 text-center border-t border-border">
          <p className="text-[11px] text-subtle">
            Built by Ecom Landers · Conversion engine for Shopify brands
          </p>
          <Link
            href="/"
            className="text-[11px] text-subtle hover:text-emerald-300 transition-colors"
          >
            ecomlanders.app
          </Link>
        </footer>
      </div>
    </div>
  );
}

/* ─── building blocks ─── */
function Slide({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent: "emerald" | "cyan" | "sky";
  children: React.ReactNode;
}) {
  const accentDot: Record<typeof accent, string> = {
    emerald: "from-emerald-500 to-teal-600 shadow-[0_0_16px_rgba(16,185,129,0.55)]",
    cyan: "from-cyan-500 to-teal-600 shadow-[0_0_16px_rgba(6,182,212,0.55)]",
    sky: "from-sky-500 to-blue-600 shadow-[0_0_16px_rgba(14,165,233,0.55)]",
  };
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`size-2 rounded-full bg-gradient-to-br ${accentDot[accent]}`} />
        <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-foreground">
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="text-xl md:text-2xl text-foreground font-medium leading-snug mb-5 max-w-3xl">
          {subtitle}
        </p>
      )}
      <div>{children}</div>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-0.5 rounded-full bg-surface text-[11px] uppercase tracking-wider text-muted">
      {children}
    </span>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider font-semibold text-subtle mb-1.5">
      {children}
    </div>
  );
}

function Prose({ body, compact = false }: { body: string; compact?: boolean }) {
  return (
    <div
      className={`prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted prose-li:text-muted prose-strong:text-foreground prose-a:text-emerald-300 ${
        compact ? "prose-sm" : ""
      }`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-background rounded-xl p-4 ring-1 ring-border">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-subtle font-semibold mb-1">
        <span className="text-cyan-300">{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Horizon({ label, body }: { label: string; body: string }) {
  return (
    <div className="bg-background rounded-2xl p-5 ring-1 ring-border">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-300 mb-2">
        {label}
      </div>
      {body.trim() ? (
        <Prose body={body} compact />
      ) : (
        <p className="text-xs italic text-subtle">Not detailed.</p>
      )}
    </div>
  );
}
