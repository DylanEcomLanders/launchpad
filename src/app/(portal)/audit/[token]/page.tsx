import { getAuditByToken, incrementViewCount } from "@/lib/cro-audit-engine/data";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";

const severityLabel: Record<string, string> = { critical: "CRITICAL", high: "HIGH", "quick-win": "QUICK WIN" };
const severityStyle: Record<string, string> = {
  critical: "bg-red-50 text-red-600 border border-red-200",
  high: "bg-amber-50 text-amber-600 border border-amber-200",
  "quick-win": "bg-emerald-50 text-emerald-600 border border-emerald-200",
};
const ratingStyle: Record<string, string> = {
  strong: "text-emerald-600 bg-emerald-50",
  average: "text-amber-600 bg-amber-50",
  weak: "text-red-500 bg-red-50",
};

export default async function PublicAuditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const audit = await getAuditByToken(token);

  if (!audit) {
    notFound();
  }

  // Only increment view count for published audits (not draft previews)
  if (audit.status === "published") {
    await incrementViewCount(token);
  }

  const date = new Date(audit.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const issueCount = audit.issues?.length || 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-8">
            <Logo height={16} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#CCC] mb-3">
            PREPARED BY ECOMLANDERS · CONFIDENTIAL
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A1A1A] mb-2">
            CRO Audit
          </h1>
          <p className="text-lg text-[#777] mb-4 capitalize">{audit.brand_name}</p>
          <p className="text-xs text-[#AAA]">
            {date} · Conversion Architecture Review · {issueCount} Issues Identified
          </p>
        </div>

        {/* Page Speed */}
        {audit.speed_data && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1A1A1A] mb-4 pb-2 border-b border-[#E8E8E8]">
              Page Speed (Mobile)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="border border-[#E8E8E8] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Performance</p>
                <p className={`text-2xl font-bold tabular-nums ${audit.speed_data.score >= 90 ? "text-emerald-600" : audit.speed_data.score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                  {audit.speed_data.score}<span className="text-sm text-[#AAA]">/100</span>
                </p>
              </div>
              <div className="border border-[#E8E8E8] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">First Paint</p>
                <p className="text-lg font-bold tabular-nums text-[#1A1A1A]">{audit.speed_data.fcp}</p>
              </div>
              <div className="border border-[#E8E8E8] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Largest Paint</p>
                <p className="text-lg font-bold tabular-nums text-[#1A1A1A]">{audit.speed_data.lcp}</p>
              </div>
              <div className="border border-[#E8E8E8] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Blocking Time</p>
                <p className="text-lg font-bold tabular-nums text-[#1A1A1A]">{audit.speed_data.tbt}</p>
              </div>
              <div className="border border-[#E8E8E8] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Layout Shift</p>
                <p className="text-lg font-bold tabular-nums text-[#1A1A1A]">{audit.speed_data.cls}</p>
              </div>
              <div className="border border-[#E8E8E8] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Speed Index</p>
                <p className="text-lg font-bold tabular-nums text-[#1A1A1A]">{audit.speed_data.si}</p>
              </div>
            </div>
          </section>
        )}

        {/* Executive Summary */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1A1A1A] mb-4 pb-2 border-b border-[#E8E8E8]">
            Executive Summary
          </h2>
          <div className="text-sm text-[#444] leading-[1.8] whitespace-pre-wrap">
            {audit.executive_summary}
          </div>
        </section>

        {/* Scorecard */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1A1A1A] mb-4 pb-2 border-b border-[#E8E8E8]">
            Scorecard
          </h2>
          <p className="text-xs text-[#AAA] mb-4">Current estimated performance by section.</p>
          <div className="border border-[#E8E8E8] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_100px] px-4 py-2 bg-[#FAFAFA] border-b border-[#E8E8E8]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Area</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-center">Rating</span>
            </div>
            {(audit.scorecard || []).map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px] px-4 py-3 border-b border-[#F0F0F0] last:border-0 items-center">
                <span className="text-sm text-[#1A1A1A]">{s.area}</span>
                <span className={`text-[10px] font-semibold uppercase text-center px-2 py-1 rounded-full ${ratingStyle[s.rating]}`}>
                  {s.rating}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Issues */}
        <section className="mb-12">
          {(audit.issues || []).map((issue, i) => (
            <div key={issue.id || i} className="mb-10">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-[#1A1A1A]">
                  Issue {i + 1} — {issue.title}
                </h3>
                <span className={`shrink-0 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full ${severityStyle[issue.severity]}`}>
                  {severityLabel[issue.severity]}
                </span>
              </div>
              <p className="text-sm text-[#999] italic mb-4">{issue.subtitle}</p>
              <div className="mb-4">
                <p className="text-xs font-semibold text-[#1A1A1A] mb-2">The problem:</p>
                <p className="text-sm text-[#444] leading-[1.8]">{issue.problem}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A] mb-2">The fix:</p>
                <p className="text-sm text-[#444] leading-[1.8]">{issue.fix}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Priority Order */}
        {audit.priority_order && audit.priority_order.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1A1A1A] mb-4 pb-2 border-b border-[#E8E8E8]">
              Recommended Priority Order
            </h2>
            <p className="text-xs text-[#AAA] mb-4">Do these in sequence. The first three have the most impact on immediate conversion rate.</p>
            <div className="space-y-2">
              {audit.priority_order.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-sm font-bold text-[#1A1A1A] shrink-0 w-6">{i + 1}.</span>
                  <p className="text-sm text-[#444] leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* What This Audit Is Not Saying */}
        {audit.not_saying && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1A1A1A] mb-4 pb-2 border-b border-[#E8E8E8]">
              What This Audit Is Not Saying
            </h2>
            <p className="text-sm text-[#444] leading-[1.8]">{audit.not_saying}</p>
          </section>
        )}

        {/* CTAs */}
        <section className="border-t border-[#E8E8E8] pt-10 mt-12">
          <p className="text-center text-sm text-[#777] mb-6">
            Want us to implement these changes and rebuild your homepage?
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href={audit.whatsapp_link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white text-sm font-medium rounded-xl hover:bg-[#20BD5A] transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              WhatsApp
            </a>
            <a
              href={audit.booking_link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl hover:bg-[#2D2D2D] transition-colors"
            >
              Book a Call
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-[#F0F0F0] text-center">
          <p className="text-[10px] text-[#CCC]">Powered by Ecomlanders</p>
        </div>
      </div>
    </div>
  );
}
