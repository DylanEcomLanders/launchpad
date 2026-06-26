import Link from "next/link";
import { DecorativeBlocks } from "@/components/decorative-blocks";

export const metadata = {
  title: "Payment Structure · Ecom Landers",
};

const tiers = [
  {
    name: "Heavy",
    tag: "Full custom builds",
    examples: "PDP, homepage, quiz funnel. Full project — research, copy direction, design, dev, QA, launch.",
  },
  {
    name: "Medium",
    tag: "Editorial pages",
    examples: "Advertorials, listicles, long-form content. Custom design and dev but lighter than a full PDP.",
  },
  {
    name: "Light",
    tag: "Standalone pages",
    examples: "Collection, account, about pages. Standalone pages with custom design using existing patterns.",
  },
  {
    name: "Extras",
    tag: "Small functional pages",
    examples: "Cart, FAQ, contact, navigation, policies. Smaller pages, often templated.",
  },
];

const fees = [
  { tier: "Heavy", primaryDes: 250, secondaryDes: 150, primaryDev: 250, secondaryDev: 150, total: 800 },
  { tier: "Medium", primaryDes: 200, secondaryDes: 125, primaryDev: 200, secondaryDev: 125, total: 650 },
  { tier: "Light", primaryDes: 160, secondaryDes: 100, primaryDev: 160, secondaryDev: 100, total: 520 },
  { tier: "Extras", primaryDes: 80, secondaryDes: 50, primaryDev: 80, secondaryDev: 50, total: 260 },
];

const examples = [
  {
    tag: "Example 01",
    title: "1 Heavy page",
    scope: "Single PDP — one heavy page, no rebate, standard rates.",
    rows: [
      { label: "Primary des", value: "£250" },
      { label: "Secondary des", value: "£150" },
      { label: "Primary dev", value: "£250" },
      { label: "Secondary dev", value: "£150" },
    ],
    total: "£800",
    rebate: false,
  },
  {
    tag: "Example 02",
    title: "4 Heavy pages",
    scope: "Four heavy pages, same brand. 10% volume rebate on the per-page rates.",
    rows: [
      { label: "Primary des · 4 × £225", value: "£900" },
      { label: "Secondary des · 4 × £135", value: "£540" },
      { label: "Primary dev · 4 × £225", value: "£900" },
      { label: "Secondary dev · 4 × £135", value: "£540" },
    ],
    total: "£2,880",
    rebate: true,
  },
  {
    tag: "Example 03",
    title: "1 Medium page",
    scope: "One advertorial — medium tier rates. No rebate (single page).",
    rows: [
      { label: "Primary des", value: "£200" },
      { label: "Secondary des", value: "£125" },
      { label: "Primary dev", value: "£200" },
      { label: "Secondary dev", value: "£125" },
    ],
    total: "£650",
    rebate: false,
  },
];

export default function TeamPaymentsPage() {
  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-6 font-mono text-[10px] uppercase tracking-[0.16em] text-[#71757D]">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#1B1B1B]" />
              Internal · For pod members · v1
            </div>
            <div>Ecom Landers · Payment structure</div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-[#E5E5EA] mb-5">
            Payment structure.
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-[#4A4A4A] max-w-3xl">
            A reference covering the payment structure for everyone working in a pod. Per-page rates by tier, the volume rebate, the rush fee, how retainers work, what doesn&apos;t pay, and the invoicing process. Read it once. Bookmark it. Search it whenever you need to remember a specific rule.
          </p>
        </div>

        {/* 01 — Principle */}
        <Section num="01 / Principle" tag="How the model works" title="How the model works.">
          <p className="text-sm leading-relaxed text-[#4A4A4A] max-w-2xl">
            Every page you ship has a fee attached to it. Heavier pages pay more, lighter pages pay less, all four roles get paid for their work. Same rates across every project — no exceptions.
          </p>
        </Section>

        {/* 02 — Four tiers */}
        <Section num="02 / The tiers" tag="What counts as what" title="The four pricing tiers.">
          <p className="section-lede mb-6 text-sm leading-relaxed text-[#4A4A4A] max-w-2xl">
            Four tiers cover everything we build. The tier determines what the team earns per page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222222] border border-[#2A2A2A] rounded-lg overflow-hidden">
            {tiers.map((t) => (
              <div key={t.name} className="bg-[#181818] p-6 flex flex-col gap-2">
                <div className="text-2xl font-bold text-[#E5E5EA]">{t.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#71757D] mb-2">{t.tag}</div>
                <div className="pt-3 border-t border-dashed border-[#2A2A2A] text-xs leading-relaxed text-[#4A4A4A]">
                  {t.examples}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 03 — Per-role fees */}
        <Section num="03 / Per-role fees" tag="What each role earns per page" title="What each role earns per page.">
          <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A] max-w-2xl">
            The team total splits across the four roles. Primary owns the core deliverable and earns more. Secondary handles revisions, asset prep, and stress-tests the primary&apos;s work.
          </p>
          <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[100px_repeat(4,1fr)_110px] md:grid-cols-[140px_repeat(4,1fr)_120px] gap-3 px-5 py-3 bg-[#222222] text-[#E5E5EA] font-mono text-[9px] md:text-[10px] uppercase tracking-[0.12em] font-semibold items-center">
              <div>Tier</div>
              <div className="text-center">Primary des</div>
              <div className="text-center">Secondary des</div>
              <div className="text-center">Primary dev</div>
              <div className="text-center">Secondary dev</div>
              <div className="text-right">Team total</div>
            </div>
            {fees.map((f, i) => (
              <div
                key={f.tier}
                className={`grid grid-cols-[100px_repeat(4,1fr)_110px] md:grid-cols-[140px_repeat(4,1fr)_120px] gap-3 px-5 py-4 items-center text-sm md:text-base text-[#E5E5EA] ${
                  i < fees.length - 1 ? "border-b border-[#2A2A2A]" : ""
                }`}
              >
                <div className="font-semibold">{f.tier}</div>
                <div className="text-center">£{f.primaryDes}</div>
                <div className="text-center">£{f.secondaryDes}</div>
                <div className="text-center">£{f.primaryDev}</div>
                <div className="text-center">£{f.secondaryDev}</div>
                <div className="text-right font-bold text-[#E5E5EA]">£{f.total}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 04 — Volume rebate */}
        <Section num="04 / Volume rebate" tag="How 3+ page projects work" title="The volume rebate.">
          <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A] max-w-2xl">
            Clients get a volume discount on 3+ page projects. The team&apos;s per-page fee drops by 10% on those projects; the agency absorbs the rest of the discount. Both sides share the cost.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222222] border border-[#2A2A2A] rounded-lg overflow-hidden">
            <RebatePane
              tag="1-2 pages — no rebate"
              big="Full rates"
              rows={["Primary designer: £250", "Secondary designer: £150", "Primary dev: £250", "Secondary dev: £150"]}
            />
            <RebatePane
              accent
              tag="3+ pages — 10% rebate"
              big="10% off rates"
              rows={["Primary designer: £225", "Secondary designer: £135", "Primary dev: £225", "Secondary dev: £135"]}
            />
          </div>
          <Aside>
            The rebate applies when 3+ pages of the same tier ship in one project — most often Heavy or Medium bundles where pages share a brand. It doesn&apos;t apply to mixed-tier projects (e.g., a Heavy page plus an Extras cart page).
          </Aside>
        </Section>

        {/* 05 — Worked examples */}
        <Section num="05 / Worked examples" tag="Three real project shapes" title="Three worked examples.">
          <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A] max-w-2xl">
            Three project shapes with each role&apos;s take-home. The 4 Heavy pages example has the volume rebate applied.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#222222] border border-[#2A2A2A] rounded-lg overflow-hidden">
            {examples.map((ex) => (
              <div key={ex.tag} className="bg-[#181818] p-5 flex flex-col gap-2">
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#71757D]">{ex.tag}</div>
                <div className="text-lg font-bold text-[#E5E5EA] mb-1">{ex.title}</div>
                <div className="text-xs text-[#4A4A4A] mb-3 leading-relaxed">{ex.scope}</div>
                <div className="border border-[#2A2A2A] rounded overflow-hidden">
                  {ex.rows.map((r, i) => (
                    <div
                      key={r.label}
                      className={`flex justify-between items-baseline px-3 py-2 text-xs ${
                        ex.rebate ? "bg-[#0C0C0C]" : "bg-[#181818]"
                      } ${i < ex.rows.length - 1 ? "border-b border-[#2A2A2A]" : ""}`}
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#71757D]">{r.label}</span>
                      <span className="text-sm font-semibold text-[#E5E5EA]">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#71757D] text-right mt-2">
                  Team total · {ex.total}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 06 — Rush fee */}
        <Section num="06 / Rush fee" tag="What happens on compressed projects" title="The rush fee.">
          <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A] max-w-2xl">
            When a client needs a project faster than the Monday-kickoff cadence allows, it gets quoted as Rush — mid-week start, compressed timeline. A 50% surcharge is added; that surcharge goes straight to the team working the compressed hours.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222222] border border-[#2A2A2A] rounded-lg overflow-hidden">
            <div className="bg-[#181818] p-6 flex flex-col gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#71757D]">Standard project</div>
              <div className="text-3xl font-bold text-[#E5E5EA]">
                £250<span className="text-sm font-normal text-[#71757D]">/page</span>
              </div>
              <div className="text-xs leading-relaxed text-[#4A4A4A]">
                Your normal per-page rate. Monday kickoff, Thursday delivery in bucket window.
              </div>
            </div>
            <div className="bg-[#1B1B1B] p-6 flex flex-col gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#71757D]">Rush project — +50%</div>
              <div className="text-3xl font-bold text-white">
                £375<span className="text-sm font-normal text-[#71757D]">/page</span>
              </div>
              <div className="text-xs leading-relaxed text-[#9CA3AF]">
                Same role, same scope, half the timeline. The extra £125/page comes straight to you. Used sparingly, by exception — pod must have capacity for it.
              </div>
            </div>
          </div>
          <Aside>
            Rush is the only sanctioned override to Monday kickoffs. Sales can&apos;t quote mid-week starts without applying the Rush surcharge — the structure protects you from compressed work without compensation.
          </Aside>
        </Section>

        {/* 07 — Retainers */}
        <Section num="07 / Retainers" tag="How Conversion Partnership clients work" title="How retainer pay works.">
          <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A] max-w-2xl">
            Retainer clients are Dan&apos;s strategic clients. Any build work that lands on your pod board for a retainer client has already been scoped by Dan — you ship it, the standard per-page rate applies. Same tiers, same rebate, same model as one-off projects.
          </p>
          <h3 className="text-lg font-bold text-[#E5E5EA] mb-4 mt-8">
            What pays, what doesn&apos;t — inside a retainer
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222222] border border-[#2A2A2A] rounded-lg overflow-hidden">
            <div className="bg-[#181818] p-6">
              <div className="font-mono text-[18px] font-bold text-[#E5E5EA] leading-none mb-3">✓ Pays</div>
              <div className="text-base font-bold text-[#E5E5EA] mb-2">
                Build work coming from Dan&apos;s strategy
              </div>
              <ul className="space-y-1 mt-2">
                <li className="text-xs leading-relaxed text-[#4A4A4A]">· Any page or build that lands on your pod board</li>
                <li className="text-xs leading-relaxed text-[#4A4A4A]">· Paid at standard tier rates — same as one-off projects</li>
                <li className="text-xs leading-relaxed text-[#4A4A4A]">· Volume rebate applies the same way</li>
                <li className="text-xs leading-relaxed text-[#4A4A4A]">· Tier determined by page type, not by retainer status</li>
              </ul>
            </div>
            <div className="bg-[#0C0C0C] p-6">
              <div className="font-mono text-[18px] font-bold text-[#71757D] leading-none mb-3">✕ Doesn&apos;t pay</div>
              <div className="text-base font-bold text-[#E5E5EA] mb-2">
                Strategy and planning hours
              </div>
              <ul className="space-y-1 mt-2">
                <li className="text-xs leading-relaxed text-[#4A4A4A]">· Dan&apos;s roadmap work and strategy calls with the client</li>
                <li className="text-xs leading-relaxed text-[#4A4A4A]">· Test design conversations</li>
                <li className="text-xs leading-relaxed text-[#4A4A4A]">· Performance review meetings</li>
                <li className="text-xs leading-relaxed text-[#4A4A4A]">· Covered by the retainer fee — strategist&apos;s time, not pod&apos;s</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 08 — How and when */}
        <Section num="08 / How and when" tag="Invoicing and payment" title="Invoicing and payment.">
          <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A] max-w-2xl">
            Monthly cycle. We pay on the 28th of each month — invoice us at least 48 hours before that.
          </p>
          <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
            <ProcessRow
              num="01"
              what="Track what you ship in Launchpad."
              when="Your pod board shows every project that's shipped that month. Use it as your reference when calculating your invoice — don't trust memory, check the board."
            />
            <div className="border-t border-[#2A2A2A]" />
            <ProcessRow
              num="02"
              what="Calculate your fees."
              when="Total up the projects shipped that month — per-page rates, rebate where it applies, rush surcharge where it applies. Double-check before submitting."
            />
            <div className="border-t border-[#2A2A2A]" />
            <ProcessRow
              num="03"
              what="Submit via the invoice form by the 26th."
              when="Anything submitted by the 26th gets paid on the 28th. Anything later rolls to next month's cycle."
            />
          </div>

          {/* Invoice form CTA — now /me/invoices, the unified flow that
              ties the submission to the signed-in Person + lists past
              submissions. */}
          <Link
            href="/me/invoices"
            className="mt-5 flex items-center justify-between gap-4 p-5 rounded-lg bg-[#222222] text-[#E5E5EA] hover:bg-[#2A2A2A] transition-colors group"
          >
            <div className="flex flex-col gap-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#71757D]">Submit invoice</div>
              <div className="text-base md:text-lg font-bold text-white">Open the invoice form</div>
              <div className="text-xs text-[#9CA3AF] mt-1">Native form · attaches your PDF and lands with finance</div>
            </div>
            <div className="font-mono text-xs uppercase tracking-[0.14em] text-white flex items-center gap-2 group-hover:gap-3 transition-all shrink-0">
              Open
              <span aria-hidden>→</span>
            </div>
          </Link>
          <Aside>
            Double-check your numbers before sending. Once an invoice is paid, fixing errors is messier than catching them beforehand. If a project&apos;s pay looks off — wrong tier, missing rebate, rush surcharge missed — flag it to Alister before invoicing.
          </Aside>
        </Section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#2A2A2A] flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[#71757D]">
          <div className="text-sm tracking-normal normal-case text-[#4A4A4A] font-sans max-w-md">
            Questions on a specific project&apos;s pay, ask your pod&apos;s primary or Alister.
          </div>
          <div className="text-right">
            <div>Ecom Landers</div>
            <div className="mt-1">Payment structure · v1</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  num,
  tag,
  title,
  children,
}: {
  num: string;
  tag: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-16">
      <div className="flex items-baseline gap-5 mb-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#E5E5EA] font-semibold">{num}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#71757D]">{tag}</div>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-[#E5E5EA] mb-5">{title}</h2>
      {children}
    </section>
  );
}

function RebatePane({
  tag,
  big,
  rows,
  accent = false,
}: {
  tag: string;
  big: string;
  rows: string[];
  accent?: boolean;
}) {
  // Accent pane = dark anchor (LP pattern from /offer hero pricing card)
  const bg = accent ? "bg-[#1B1B1B]" : "bg-[#181818]";
  const tagColor = accent ? "text-[#71757D]" : "text-[#71757D]";
  const bigColor = accent ? "text-white" : "text-[#E5E5EA]";
  const rowColor = accent ? "text-white" : "text-[#E5E5EA]";
  const arrowColor = accent ? "text-[#71757D]" : "text-[#71757D]";
  const divider = accent ? "border-white/10" : "border-[#2A2A2A]";
  return (
    <div className={`p-6 flex flex-col gap-3 ${bg}`}>
      <div className={`font-mono text-[10px] uppercase tracking-[0.14em] ${tagColor}`}>{tag}</div>
      <div className={`text-3xl font-bold ${bigColor}`}>{big}</div>
      <ul className="mt-1 space-y-1.5">
        {rows.map((r) => (
          <li key={r} className={`text-xs py-1 border-b border-dashed last:border-b-0 ${rowColor} ${divider}`}>
            <span className={`font-semibold mr-1 ${arrowColor}`}>→</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProcessRow({ num, what, when }: { num: string; what: string; when: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[60px_1fr_1fr] gap-6 px-6 py-5 items-baseline bg-[#181818]">
      <div className="text-3xl font-bold text-[#E5E5EA] leading-none">{num}</div>
      <div className="text-base font-semibold text-[#E5E5EA] leading-snug">{what}</div>
      <div className="text-xs text-[#4A4A4A] leading-relaxed">{when}</div>
    </div>
  );
}

function Aside({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-sm leading-relaxed text-[#4A4A4A] py-3.5 px-5 bg-[#0C0C0C] border-l-[3px] border-[#1B1B1B]">
      {children}
    </p>
  );
}
