import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Gymshark — Case Study | Ecomlanders",
  description:
    "How we lifted Gymshark's monthly recurring revenue by 125% through CRO, development, and a new performance funnel.",
};

export default function CaseStudySamplePage() {
  return (
    <div className="min-h-screen bg-surface text-foreground font-body">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
          <Link href="/" className="text-foreground">
            <Logo height={22} />
          </Link>
          <nav className="hidden md:flex items-center gap-10 text-sm text-foreground">
            <Link href="/about" className="hover:opacity-70">About us</Link>
            <Link href="/case-studies" className="hover:opacity-70">Case Studies</Link>
            <Link href="/services" className="hover:opacity-70">Services</Link>
          </nav>
          <Link
            href="/audit"
            className="text-xs md:text-sm font-semibold px-4 py-2 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors inline-flex items-center gap-1.5"
          >
            Get In Touch
            <span className="text-[#D1FF4C]">↗</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-12">
        <div className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
          Case Study
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-end">
          <div className="md:col-span-7">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02]">
              Gymshark scales to <span className="bg-[#D1FF4C] px-2">+125% MRR</span> in 6 months.
            </h1>
            <p className="text-lg md:text-xl text-subtle mt-8 max-w-xl leading-relaxed">
              A ground-up rebuild of their core landing page funnel — backed by 14 winning A/B tests and a Shopify theme refactor that cut load time in half.
            </p>

            <div className="flex flex-wrap gap-2 mt-8">
              {["CRO", "Development", "Funnel Strategy", "Theme Build", "A/B Testing"].map((t) => (
                <span
                  key={t}
                  className="text-xs font-semibold px-3 py-1.5 bg-surface-raised text-foreground rounded-full border border-border"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="aspect-[4/3] rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-muted text-sm">
              {/* Hero image placeholder */}
              [ Hero image — store screenshot or shoot ]
            </div>
          </div>
        </div>
      </section>

      {/* Topline metrics */}
      <section className="border-y border-border bg-surface-raised">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {[
              { value: "+125%", label: "Monthly recurring revenue" },
              { value: "+38%", label: "Conversion rate" },
              { value: "−52%", label: "Page load time" },
              { value: "14", label: "Winning A/B tests" },
            ].map((m) => (
              <div key={m.label} className="bg-surface p-6 md:p-8">
                <div className="text-3xl md:text-5xl font-semibold tracking-tight">{m.value}</div>
                <div className="text-xs md:text-sm text-subtle mt-2 leading-snug">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand snapshot */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { label: "Brand", value: "Gymshark" },
            { label: "Vertical", value: "Apparel" },
            { label: "Engagement", value: "6 months" },
            { label: "Services", value: "CRO + Theme" },
          ].map((d) => (
            <div key={d.label}>
              <div className="text-xs uppercase tracking-[0.18em] text-muted mb-2">
                {d.label}
              </div>
              <div className="text-base md:text-lg font-semibold">{d.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Challenge */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
          <div className="md:col-span-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted mb-4">
              The Challenge
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              Paid traffic was scaling, conversions weren&rsquo;t.
            </h2>
          </div>
          <div className="md:col-span-7">
            <p className="text-base md:text-lg text-[#3D3D3D] leading-relaxed">
              Gymshark was pouring 6-figures a month into Meta but their landing page was built for branded organic traffic. Cold paid visitors hit a hero that assumed they already trusted the brand — bounce rates climbed past 70% on top campaigns and CAC was creeping up every quarter.
            </p>
            <p className="text-base md:text-lg text-[#3D3D3D] leading-relaxed mt-5">
              On the technical side, the legacy theme had accumulated 4 years of feature debt. First contentful paint sat at 4.2s on mobile. Core Web Vitals were failing. They needed both the funnel and the foundation rebuilt.
            </p>
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20 border-t border-border">
        <div className="text-xs uppercase tracking-[0.2em] text-muted mb-4">
          The Approach
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight max-w-3xl">
          Strip the funnel back to first principles, then build forward.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12">
          {[
            {
              n: "01",
              title: "Voice-of-customer research",
              body: "Mined 200+ post-purchase surveys, 40 reviews, and 12 user interviews to map the real buying motivations — not the ones the brand assumed.",
            },
            {
              n: "02",
              title: "Funnel rebuild",
              body: "New paid landing page architecture: cold-traffic hero, problem-aware messaging, social proof above the fold, sticky ATC, exit-intent capture.",
            },
            {
              n: "03",
              title: "Theme refactor + tests",
              body: "Rebuilt the Shopify theme on a performance-first foundation. Shipped 19 A/B tests across PDP, cart, and checkout — kept the 14 that won.",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-border bg-surface p-6 md:p-8"
            >
              <div className="text-xs font-semibold tracking-wider text-muted">
                {step.n}
              </div>
              <h3 className="text-xl font-semibold mt-4">{step.title}</h3>
              <p className="text-sm md:text-base text-subtle leading-relaxed mt-3">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Before / After visual */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20 border-t border-border">
        <div className="text-xs uppercase tracking-[0.2em] text-muted mb-4">
          Before &rarr; After
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight max-w-3xl mb-12">
          Same brand. Sharper funnel.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted mb-3">Before</div>
            <div className="aspect-[4/5] rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-muted text-sm">
              [ Before screenshot ]
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted mb-3">After</div>
            <div className="aspect-[4/5] rounded-2xl bg-foreground border border-foreground flex items-center justify-center text-background/40 text-sm">
              [ After screenshot ]
            </div>
          </div>
        </div>
      </section>

      {/* Detailed results */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20 border-t border-border">
        <div className="text-xs uppercase tracking-[0.2em] text-muted mb-4">
          The Results
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight max-w-3xl mb-12">
          Compounding wins across the whole funnel.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              kpi: "Monthly Recurring Revenue",
              from: "£840k",
              to: "£1.89M",
              delta: "+125%",
              note: "Revenue lift sustained for 4+ months post-launch.",
            },
            {
              kpi: "Conversion Rate",
              from: "1.8%",
              to: "2.49%",
              delta: "+38%",
              note: "Aggregate site CVR — held under increased paid spend.",
            },
            {
              kpi: "Page Load (LCP, mobile)",
              from: "4.2s",
              to: "2.0s",
              delta: "−52%",
              note: "All three Core Web Vitals moved into Good.",
            },
            {
              kpi: "Average Order Value",
              from: "£62",
              to: "£74",
              delta: "+19%",
              note: "Bundle upsells + post-purchase cross-sells.",
            },
          ].map((r) => (
            <div
              key={r.kpi}
              className="rounded-2xl border border-border bg-surface p-6 md:p-8"
            >
              <div className="text-xs uppercase tracking-wider text-muted mb-3">
                {r.kpi}
              </div>
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-muted mb-0.5">From</div>
                  <div className="text-2xl font-semibold text-subtle line-through decoration-muted">
                    {r.from}
                  </div>
                </div>
                <div className="text-2xl text-muted">→</div>
                <div>
                  <div className="text-xs text-muted mb-0.5">After</div>
                  <div className="text-2xl md:text-3xl font-semibold">{r.to}</div>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center text-sm font-semibold px-3 py-1.5 bg-[#D1FF4C] text-foreground rounded-full">
                    ↑ {r.delta}
                  </span>
                </div>
              </div>
              <p className="text-sm text-subtle leading-relaxed mt-5">{r.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-y border-border bg-surface-raised">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted mb-8">
            What the client said
          </div>
          <blockquote className="text-2xl md:text-4xl font-semibold tracking-tight leading-tight">
            &ldquo;Ecomlanders didn&rsquo;t just redesign our pages — they rebuilt how we think about paid traffic. Six months in, our blended ROAS is up nearly 2x.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3 mt-10">
            <div className="size-12 rounded-full bg-surface" />
            <div className="text-left">
              <div className="font-semibold text-sm">Sarah Whitman</div>
              <div className="text-xs text-subtle">Head of Growth, Gymshark</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Want results like this?
        </h2>
        <p className="text-base md:text-lg text-subtle mt-6 max-w-xl mx-auto">
          Get a free, no-bullshit audit of your store. We&rsquo;ll show you exactly what&rsquo;s leaking money — and what we&rsquo;d test first.
        </p>
        <Link
          href="/audit"
          className="inline-flex items-center gap-2 mt-10 px-8 py-4 bg-foreground text-background font-semibold rounded-full hover:bg-foreground/90 transition-colors"
        >
          Get a free audit
          <span className="text-[#D1FF4C]">↗</span>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <Logo height={20} className="text-foreground" />
          <div className="text-xs text-muted">
            © {new Date().getFullYear()} Ecomlanders. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
