import { getQuoteByToken, markQuoteViewed } from "@/lib/quotes/data";
import { quoteTotals, formatGBP } from "@/lib/quotes/types";
import { Logo } from "@/components/logo";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata = { title: "Your proposal · Ecom Landers" };

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params;
  const quote = await getQuoteByToken(token);

  if (!quote || quote.trashed_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-raised px-6">
        <div className="text-center">
          <Logo height={18} className="mx-auto mb-6 text-foreground" />
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Proposal not found
          </h1>
          <p className="mt-2 text-sm text-subtle">
            This link may have expired or been removed. Please get in touch and
            we&apos;ll send a fresh one.
          </p>
        </div>
      </div>
    );
  }

  if (!quote.viewed_at) markQuoteViewed(quote.id);

  const d = quote.data;
  const totals = quoteTotals(d.lines);
  const dateStr = new Date(quote.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-surface-raised">
      {/* Branded header */}
      <header className="border-b border-border bg-white px-6 py-5 md:px-12">
        <Logo height={16} className="text-foreground" />
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-2xl px-6 py-14 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Proposal · {dateStr}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-[40px]">
            A conversion plan for {d.clientName}
          </h1>
          {d.intro && (
            <p className="mt-5 text-[17px] leading-relaxed text-border">{d.intro}</p>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-2xl px-6 py-12 md:py-16">
        {/* The plan / line items */}
        <h2 className="mb-1 font-heading text-lg font-semibold text-foreground">
          The plan
        </h2>
        <p className="mb-5 text-sm text-subtle">
          Here&apos;s exactly what&apos;s included and what it costs.
        </p>

        <div className="overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="divide-y divide-[#F2F2F4]">
            {d.lines.map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{l.description}</span>
                    {l.cadence === "monthly" && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-700">
                        Monthly
                      </span>
                    )}
                  </div>
                  {l.detail && (
                    <p className="mt-1 text-[13px] leading-relaxed text-subtle">
                      {l.detail}
                    </p>
                  )}
                  {l.qty > 1 && (
                    <p className="mt-1 text-xs text-muted">
                      {l.qty} × {formatGBP(l.unitPrice)}
                    </p>
                  )}
                </div>
                <div className="shrink-0 pt-0.5 text-right">
                  <span className="font-heading text-base font-semibold tabular-nums text-foreground">
                    {formatGBP(l.qty * l.unitPrice)}
                  </span>
                  {l.cadence === "monthly" && (
                    <span className="text-xs font-normal text-muted">/mo</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-border bg-[#FBFBFD] px-5 py-4">
            {totals.oneOff > 0 && (
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-subtle">One-off total</span>
                <span className="font-heading text-xl font-semibold tabular-nums text-foreground">
                  {formatGBP(totals.oneOff)}
                </span>
              </div>
            )}
            {totals.monthly > 0 && (
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-subtle">Monthly retainer</span>
                <span className="font-heading text-xl font-semibold tabular-nums text-foreground">
                  {formatGBP(totals.monthly)}
                  <span className="text-sm font-normal text-muted">/mo</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* What's included */}
        {d.includes && d.includes.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
              Every engagement includes
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {d.includes.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[#E8E8EC] bg-white px-4 py-3"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2.5 7.5 5.5 10.5 11.5 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-[14px] font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {d.footnote && (
          <p className="mt-10 text-[13px] leading-relaxed text-subtle">{d.footnote}</p>
        )}

        <p className="mt-12 text-center text-sm text-subtle">
          Happy with this? Just reply to the email it came from and we&apos;ll get you started.
        </p>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center md:px-12">
        <p className="text-xs text-muted">
          Ecom Landers — Shopify CRO &amp; Landing Page Agency
        </p>
      </footer>
    </div>
  );
}
