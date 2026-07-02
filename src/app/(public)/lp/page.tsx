import Link from "next/link";

const CTA_HREF = "/audit";
const WHATSAPP_HREF = "https://wa.me/";

function ImagePlaceholder({
  className = "",
  label,
  dark = false,
}: {
  className?: string;
  label?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center text-xs ${
        dark ? "bg-[#D9D9D9]/30 text-white/40" : "bg-[#D9D9D9] text-black/30"
      } ${className}`}
    >
      {label ?? "image"}
    </div>
  );
}

function Arrow({ color = "#CDF93A" }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 12L12 2M12 2H4M12 2V10"
        stroke={color}
        strokeWidth="2.52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrimaryCTA({ className = "" }: { className?: string }) {
  return (
    <Link
      href={CTA_HREF}
      className={`inline-flex items-center justify-center gap-[14px] px-[80px] py-[24px] bg-black rounded-[5.6px] text-white font-body font-medium text-[24px] tracking-[-0.28px] hover:bg-surface transition-colors ${className}`}
    >
      <span>START WITH YOUR FREE AUDIT</span>
      <Arrow />
    </Link>
  );
}

function SecondaryCTA({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-[10px] px-[57px] py-[17px] bg-white rounded-[4px] text-black font-body font-medium text-[16px] tracking-[-0.2px] hover:bg-white/90 transition-colors"
    >
      <span>{label}</span>
      <Arrow color="#000" />
    </Link>
  );
}

function WhatsappCTA({ label = "Whatsapp Us" }: { label?: string }) {
  return (
    <Link
      href={WHATSAPP_HREF}
      className="inline-flex items-center justify-center gap-[10px] px-[57px] py-[17px] bg-[#25D366] rounded-[4px] text-white font-body font-medium text-[16px] tracking-[-0.2px] hover:bg-[#1fc15c] transition-colors"
    >
      <span>{label}</span>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="white">
        <path d="M11 0C4.93 0 0 4.93 0 11c0 1.94.51 3.84 1.47 5.51L0 22l5.62-1.47A11 11 0 0 0 11 22c6.07 0 11-4.93 11-11S17.07 0 11 0zm6.45 15.55c-.27.76-1.34 1.43-2.21 1.58-.59.1-1.36.18-3.93-.83-3.31-1.32-5.44-4.66-5.6-4.88-.16-.22-1.34-1.79-1.34-3.41 0-1.62.85-2.42 1.15-2.75.27-.3.71-.43 1.13-.43.14 0 .26 0 .37.01.36.02.55.04.79.62.3.72 1.03 2.5 1.12 2.68.09.18.15.39.03.62-.11.24-.21.36-.39.55-.18.19-.35.34-.53.55-.16.18-.34.38-.13.74.21.36.93 1.53 1.99 2.46 1.37 1.2 2.5 1.59 2.91 1.76.31.13.67.1.9-.13.29-.31.65-.81 1.02-1.32.26-.36.59-.4.94-.27.36.13 2.27 1.08 2.66 1.27.39.19.65.29.74.45.09.16.09.93-.17 1.7z" />
      </svg>
    </Link>
  );
}

const HEADING =
  "font-heading font-semibold text-[60px] leading-[65px] tracking-[-2px] capitalize";
const EYEBROW =
  "font-body font-normal text-[24px] leading-[33px] tracking-[-0.26px] text-black/60";

export default function Page() {
  return (
    <div className="min-h-screen bg-white text-foreground font-body">
      <div className="mx-auto max-w-[1328px] border-x border-black/20">
        {/* ============ NAV ============ */}
        <nav className="flex items-center justify-between px-[40px] h-[118px] border-b border-black/20">
          <div className="flex items-center gap-[10px]">
            {/* Logo mark */}
            <div className="w-[38px] h-[38px] bg-surface rounded-[7.25px] flex items-center justify-center">
              <div className="w-3 h-3 bg-[#F2FF00] rounded-full" />
            </div>
            <span className="font-heading font-semibold text-[24px] tracking-[-0.5px]">
              ecomlanders
            </span>
          </div>
          <div className="flex items-center gap-[8px]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#3C8D2A" strokeWidth="1.5" />
              <path
                d="M10 5v5l3 2"
                stroke="#3C8D2A"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-body text-[18px] text-black/60 tracking-[-0.26px]">
              Price increase scheduled for Q3 2026
            </span>
          </div>
        </nav>

        {/* ============ HERO ============ */}
        <section className="relative px-[40px] pt-[110px] pb-[80px] border-b border-black/20">
          {/* Eyebrow */}
          <p className="text-center font-body text-[24px] text-black/60 tracking-[-0.26px] mb-[14px]">
            Your ads aren&apos;t the bottleneck. Your funnels are.
          </p>

          {/* Headline with lime sticker */}
          <div className="relative max-w-[998px] mx-auto">
            <h1 className={`${HEADING} text-[#2B2B2B] text-center`}>
              We&apos;re the post-click Partner adding{" "}
              <span className="inline-block relative align-baseline mx-1">
                <span className="relative z-10 inline-flex items-center gap-2 bg-[#CDF93A] border border-black rounded-[4px] px-3 py-1 shadow-[0_4px_4px_rgba(0,0,0,0.25)] rotate-[-1.41deg]">
                  <span className="inline-flex w-[34px] h-[34px] items-center justify-center rounded-full bg-[#2B2B2B] text-[#CDF93A]">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path
                        d="M9 14V4M4 9l5-5 5 5"
                        stroke="#CDF93A"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="font-heading font-semibold text-[46.59px] leading-[50px] tracking-[-1.55px] uppercase text-[#2B2B2B]">
                    35-50% more
                  </span>
                </span>
              </span>{" "}
              revenue per month without touching ad spend
            </h1>
          </div>

          {/* Sub copy */}
          <p className="max-w-[800px] mx-auto text-center font-body text-[24px] leading-[33px] tracking-[-0.26px] text-foreground mt-[120px]">
            Over 500 Shopify brands have used our exact methodology to scale
            their brands beyond their revenue targets without spending an extra
            penny on ads.
          </p>

          {/* CTA */}
          <div className="flex justify-center mt-[50px]">
            <PrimaryCTA />
          </div>

          {/* Yellow circle badge */}
          <div className="absolute right-[40px] top-[400px] w-[189px] h-[200px] rotate-[12.1deg] hidden lg:block">
            <ImagePlaceholder
              className="w-full h-full rounded-full"
              label="badge"
            />
          </div>

          {/* Feature row */}
          <div className="flex justify-center items-center gap-[32px] mt-[50px] flex-wrap">
            <FeatureItem
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 3v14M6 7h6a2 2 0 1 1 0 4H8a2 2 0 1 0 0 4h6"
                    stroke="#3C8D2A"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              }
              label="Free Audit Before You Sign"
            />
            <FeatureItem
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M2 9l5 5L16 4"
                    stroke="#3C8D2A"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              label="90 Day Conversion Rate Increase Guarantee"
            />
            <FeatureItem
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#3C8D2A" strokeWidth="1.5" />
                  <path
                    d="M10 5v5l3 2"
                    stroke="#3C8D2A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              }
              label="Tailored To Your Brand"
            />
          </div>

          {/* Video / preview frame */}
          <div className="mt-[60px] mx-auto w-[1022px] max-w-full aspect-[1022/602] border border-dashed border-black/40 rounded-[8px] relative overflow-hidden">
            <ImagePlaceholder className="w-full h-full" label="hero preview" />
            <div className="absolute inset-0 bg-black/10 backdrop-blur-md" />
            <button className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-[18px] px-[24px] py-[18px] bg-white border border-black rounded-full">
              <span className="font-body text-[24px] tracking-[-0.26px] uppercase">
                Click to see what we do
              </span>
              <svg width="24" height="21" viewBox="0 0 24 21" fill="none">
                <path d="M0 0L24 10.5L0 21V0Z" fill="black" />
              </svg>
            </button>
          </div>
        </section>

        {/* ============ TRUSTED BY ============ */}
        <section className="py-[80px] border-b border-black/20">
          <p className="text-center font-body text-[24px] text-black/60 tracking-[-0.26px] mb-[40px]">
            Success Stories
          </p>
          <h2 className={`${HEADING} text-center text-subtle max-w-[922px] mx-auto px-[40px]`}>
            Trusted by leading e-commerce brands doing £250k+/m
          </h2>

          {/* Marquee logos (edge-faded) */}
          <div
            className="mt-[80px] relative overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0, black 80px, black calc(100% - 80px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0, black 80px, black calc(100% - 80px), transparent 100%)",
            }}
          >
            <div className="flex gap-[60px] w-max animate-[marquee_40s_linear_infinite] items-center">
              {Array.from({ length: 24 }).map((_, i) => (
                <ImagePlaceholder
                  key={i}
                  className="h-[50px] w-[160px] shrink-0 rounded-[4px]"
                  label=""
                />
              ))}
            </div>
          </div>

          {/* Metric badges */}
          <div className="mt-[60px] px-[40px] grid grid-cols-6 gap-[20px] max-w-[1248px] mx-auto">
            {[
              "+ 124% CVR",
              "+56% RPV",
              "+ $453,872 MRR",
              "+ 214% CVR",
              "+ 46% AOV",
              "+$46,764 MRR",
            ].map((m) => (
              <div
                key={m}
                className="flex items-center justify-center px-[10px] py-[10px] bg-[#3C8D2A]/10 rounded-[4px]"
              >
                <span className="font-body font-medium text-[18px] text-[#3C8D2A] tracking-[-0.26px]">
                  {m}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 3 CASE STUDY CARDS ============ */}
        <section className="px-[40px] py-[80px] border-b border-black/20">
          <div className="grid grid-cols-3 gap-[24px]">
            {[
              {
                title:
                  "Puppymothers added $84,000 in monthly recurring revenue",
                dark: true,
              },
              {
                title:
                  "A Mens Supplement Brand Scaled From £400k/m To £1.6M/m",
              },
              {
                title:
                  "Contempee 10x'd their Investment with us in just 60 days",
              },
            ].map((c, i) => (
              <div
                key={i}
                className="relative h-[235px] rounded-[4px] overflow-hidden bg-[#D9D9D9]"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-black/20" />
                <div className="absolute inset-0 flex items-end p-[24px]">
                  <h3 className="font-heading font-semibold text-[28px] leading-[32px] tracking-[-0.78px] text-white capitalize">
                    {c.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials row */}
          <div className="mt-[60px] grid grid-cols-4 gap-[40px]">
            {[
              {
                quote:
                  "We had a fantastic experience working with Ecomlanders on our landing pages. The designs were not only visually beautiful but also strategically built, and we're already seeing strong performance from the pages they created...Highly recommend and we're looking forward to working with them again.",
                name: "Ticiana",
                role: "CMO | Crochetree",
                dark: true,
              },
              {
                quote:
                  "The guys at Ecomlanders were great, I didn't have much data to work with initially but they found a way to execute and create something top quality. They were super attentive and responsive, and i mean on the ball, constant updates, check ins etc so you are never in the dark either. Would recommend!",
                name: "Ossie",
                role: "Founder | Nocta Vince",
              },
              {
                quote:
                  "Really good communication very experienced conversion rate experts that will improve your stores overall profit.",
                name: "K.",
                role: "Founder | Supplement Brand",
              },
              {
                quote:
                  "They are talented, fast designers who have made some really nice pages for us on quick turnarounds. I'd recommend for anyone looking to test new landers. Have gotten several great page designs we've implemented effectively",
                name: "Zach H.",
                role: "Founder | Audien Hearing",
              },
            ].map((t, i) => (
              <div
                key={i}
                className={`relative p-[24px] rounded-[4px] ${
                  t.dark ? "bg-black/50 backdrop-blur-sm" : ""
                }`}
              >
                <p
                  className={`font-body text-[16px] leading-[28px] tracking-[-0.2px] ${
                    t.dark ? "text-white" : "text-black"
                  }`}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-[24px]">
                  <p
                    className={`font-body font-medium text-[16px] ${
                      t.dark ? "text-white" : "text-black"
                    }`}
                  >
                    {t.name}
                  </p>
                  <p
                    className={`font-body text-[15px] ${
                      t.dark ? "text-white/60" : "text-black/60"
                    }`}
                  >
                    {t.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 4-WEEK PROCESS ============ */}
        <section className="px-[40px] py-[80px] border-b border-black/20 bg-[#FDFDFD]">
          <p className="text-center font-body text-[24px] text-black/60 tracking-[-0.26px] mb-[40px]">
            How We Transform Your Brand
          </p>
          <h2 className={`${HEADING} text-center text-subtle max-w-[922px] mx-auto mb-[80px]`}>
            90 Days of compounded wins
          </h2>

          <div className="space-y-[40px]">
            <ProcessRow
              week="Week 1"
              title="Deep Audit & Strategy"
              body="Every successful engagement starts with the foundation. We dive deep into your heatmaps, customer data and page tear downs, finding the biggest leaks, and largest levers."
              imageLabel="audit visual"
              flip={false}
            />
            <ProcessRow
              week="Week 2"
              title="Full Throttle Design & Direction"
              body="Strategy is the back bone of our entire design process, each pixel is meticulous and has a role to play in improving your funnel. We create every conversion asset you'll need to scale effectively."
              imageLabel="design visual"
              flip
            />
            <ProcessRow
              week="Week 3"
              title="Custom Shopify Code"
              body="Tried, tested and trusted, our code is the result of thousands of development hours, meaning we can create exactly what you need in a completely bespoke and optimised way."
              imageLabel="code visual"
              flip={false}
            />
            <ProcessRow
              week="Week 4"
              title="Test, Learn, Iterate"
              body="Arguably the most important part of our process, the testing. We test aggressively, meaning your pages are exposed to real custom experiences fast, to keep our momentum in building your funnel."
              imageLabel="test visual"
              flip
            />
          </div>

          {/* Green dotted banner */}
          <div className="mt-[80px] relative h-[100px] bg-[#EBF4EA] flex items-center justify-center -mx-[40px]">
            <div className="flex items-center gap-[12px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#3C8D2A" strokeWidth="2" />
                <path
                  d="M12 7v5l3 2"
                  stroke="#3C8D2A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="font-heading font-semibold text-[32px] tracking-[-2px] text-[#2B2B2B] capitalize">
                Repeated Like Clockwork, Every 30 days
              </span>
            </div>
          </div>
        </section>

        {/* ============ CTA BLOCK 1 ============ */}
        <CTABlock />

        {/* ============ WORK MOSAIC ============ */}
        <section className="px-[40px] py-[80px] border-b border-black/20">
          <p className="text-center font-body text-[24px] text-black/60 tracking-[-0.26px] mb-[40px]">
            Real Brands - Real Results
          </p>
          <h2 className={`${HEADING} text-center text-foreground max-w-[922px] mx-auto mb-[60px]`}>
            We Skyrocket 8 & 9 Figure Brands beyond their KPIs
          </h2>

          <div className="grid grid-cols-4 gap-[24px]">
            <ImagePlaceholder className="h-[307px] rounded-[8px]" label="brand 1" />
            <ImagePlaceholder className="h-[307px] rounded-[8px] col-span-2" label="brand 2" />
            <ImagePlaceholder className="h-[307px] rounded-[8px]" label="brand 3" />
          </div>
        </section>

        {/* ============ TABS SECTION ============ */}
        <section className="px-[40px] py-[80px] border-b border-black/20 bg-[#FDFDFD]">
          <p className="text-center font-body text-[24px] text-black/60 tracking-[-0.26px] mb-[40px]">
            The Best Part?
          </p>
          <h2 className={`${HEADING} text-center text-subtle max-w-[1050px] mx-auto`}>
            not only do they perform - our pages Transform Your Brand Identity
          </h2>

          <div className="mt-[80px]">
            {/* Tabs */}
            <div className="flex border border-black/20 -mx-[1px]">
              {[
                { label: "Product Pages", active: true },
                { label: "Homepages" },
                { label: "Advertorials" },
                { label: "Listicles" },
                { label: "Cart & Checkout" },
                { label: "+ much more..." },
              ].map((t, i) => (
                <button
                  key={t.label}
                  className={`flex-1 h-[60px] px-[20px] border-r border-black/20 last:border-r-0 font-body text-[24px] tracking-[-0.26px] ${
                    t.active
                      ? "bg-surface text-white"
                      : "bg-[#FDFDFD] text-black/60"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Cards */}
            <div className="border-x border-b border-black/20 p-[24px] grid grid-cols-7 gap-[16px]">
              {Array.from({ length: 7 }).map((_, i) => (
                <ImagePlaceholder
                  key={i}
                  className="aspect-[193/390] rounded-[4px]"
                  label={`page ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-[60px] flex justify-center">
            <PrimaryCTA />
          </div>
        </section>

        {/* ============ FAQs ============ */}
        <section className="px-[40px] py-[80px] border-b border-black/20">
          <p className="text-center font-body text-[24px] text-black/60 tracking-[-0.26px] mb-[40px]">
            FAQs
          </p>
          <h2 className={`${HEADING} text-center text-subtle max-w-[1050px] mx-auto mb-[80px]`}>
            Got Questions? We&apos;ve Got Answers
          </h2>

          <div className="grid grid-cols-2 gap-x-[80px]">
            {[
              "Will this work for my brand specifically?",
              "How is this different from every other CRO agency?",
              "What does it actually cost?",
              "What if the tests don't win?",
              "How much of my team's time does this take?",
              "What happens after 90 days?",
              "Who actually does the work?",
              "How fast do we see results?",
            ].map((q) => (
              <div
                key={q}
                className="flex items-center justify-between py-[36px] border-b border-dashed border-black/20"
              >
                <span className="font-body font-medium text-[24px] tracking-[-0.2px]">
                  {q}
                </span>
                <span className="text-subtle text-[20px]">+</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============ CTA BLOCK 2 ============ */}
        <CTABlock />

        {/* ============ FOOTER ============ */}
        <footer className="bg-surface text-white">
          <div className="px-[40px] py-[80px]">
            <div className="flex items-start justify-between mb-[60px]">
              <div className="flex items-center gap-[12px]">
                <div className="w-[40px] h-[40px] bg-white rounded-[8px] flex items-center justify-center">
                  <div className="w-3 h-3 bg-[#F2FF00] rounded-full" />
                </div>
                <span className="font-heading font-semibold text-[24px]">
                  ecomlanders
                </span>
              </div>
              <ImagePlaceholder
                className="h-[45px] w-[127px] bg-white/10 rounded"
                label="Shopify Partner"
                dark
              />
            </div>

            <p className="font-heading font-medium text-[24px] tracking-[-0.6px] max-w-[698px] mb-[60px]">
              The Funnel Architects Behind Shopify&apos;s Fastest-Growing
              Brands.
            </p>

            <div className="grid grid-cols-3 gap-[60px] mb-[80px]">
              <div>
                <h4 className="font-heading font-medium text-[20px] tracking-[-0.6px] mb-[20px]">
                  Contact us
                </h4>
                <ul className="space-y-[16px] font-body text-[16px] text-white/90">
                  <li>Book a free call</li>
                  <li>Email us</li>
                  <li>Whatsapp us</li>
                </ul>
              </div>
              <div>
                <h4 className="font-heading font-medium text-[20px] tracking-[-0.6px] mb-[20px]">
                  Services
                </h4>
                <ul className="space-y-[16px] font-body text-[16px] text-white/90">
                  <li>CRO</li>
                  <li>UI / UX Design</li>
                  <li>Branding</li>
                  <li>Development</li>
                  <li>Platform migration</li>
                  <li>Support retainers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-heading font-medium text-[20px] tracking-[-0.6px] mb-[20px]">
                  About us
                </h4>
                <ul className="space-y-[16px] font-body text-[16px] text-white/90">
                  <li>Our work</li>
                  <li>Meet the team</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-[20px]">
                {["X", "IG", "WA"].map((s) => (
                  <div
                    key={s}
                    className="w-[33.6px] h-[33.6px] rounded-full bg-white/10 flex items-center justify-center text-xs"
                  >
                    {s}
                  </div>
                ))}
              </div>
              <p className="font-body text-[15px] text-white/75">
                © 2025 - Ecomlanders. All Rights Reserved.
              </p>
            </div>
          </div>

          {/* Huge wordmark */}
          <div className="overflow-hidden border-t border-white/10">
            <h2 className="font-heading font-bold text-white text-center leading-none py-[20px]" style={{ fontSize: "clamp(80px, 14vw, 240px)", letterSpacing: "-0.05em" }}>
              ecomlanders
            </h2>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-[8px]">
      {icon}
      <span className="font-body text-[18px] text-black tracking-[-0.26px]">
        {label}
      </span>
    </div>
  );
}

function ProcessRow({
  week,
  title,
  body,
  imageLabel,
  flip,
}: {
  week: string;
  title: string;
  body: string;
  imageLabel: string;
  flip: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-[40px] items-stretch">
      <div
        className={`${
          flip ? "order-2" : "order-1"
        } bg-[#F6F6F6] rounded-[4px] h-[350px] flex items-center justify-center`}
      >
        <ImagePlaceholder className="w-full h-full rounded-[4px]" label={imageLabel} />
      </div>
      <div className={`${flip ? "order-1" : "order-2"} flex flex-col justify-center`}>
        <p className="font-body text-[18px] text-black/50 tracking-[-0.2px] mb-[8px]">
          {week}
        </p>
        <h3 className="font-heading font-semibold text-[32px] tracking-[-2px] text-[#2B2B2B] capitalize mb-[16px]">
          {title}
        </h3>
        <p className="font-body text-[18px] leading-[30px] tracking-[-0.2px] text-black max-w-[463px]">
          {body}
        </p>
      </div>
    </div>
  );
}

function CTABlock() {
  return (
    <section
      id="book-a-call"
      className="relative overflow-hidden border-b border-black/10 bg-white"
    >
      {/* Soft radial wash for light/airy feel */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(40% 80% at 78% 60%, rgba(23, 192, 74, 0.06), transparent 62%), radial-gradient(40% 70% at 14% 22%, rgba(0, 0, 0, 0.03), transparent 70%)",
        }}
      />
      {/* Subtle dot field */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      <div className="relative z-10 px-[40px] py-[90px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-[60px] items-center max-w-[1200px] mx-auto">
          {/* Left: heading + description */}
          <div className="max-w-[540px]">
            <p className="font-body text-[12px] font-semibold uppercase tracking-[1.6px] text-black/50 mb-[14px]">
              Book a call
            </p>
            <h3 className="font-heading font-semibold text-[44px] leading-[1.05] tracking-[-1.5px] text-foreground mb-[18px]">
              Let&apos;s talk about your funnel
            </h3>
            <p className="font-body text-[16px] leading-[1.65] tracking-[-0.2px] text-black/65 max-w-[460px]">
              Tell us where revenue is leaking and we&apos;ll show you exactly
              where the biggest wins are. No pressure, no obligation.
            </p>
          </div>

          {/* Right: book card */}
          <aside className="ml-auto w-full max-w-[440px] bg-white border border-black/10 rounded-[14px] p-[34px] shadow-[0_30px_60px_-34px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.5)]">
            <div className="flex items-center gap-[14px] mb-[24px]">
              <div className="flex -space-x-[10px]">
                <div className="w-[40px] h-[40px] rounded-full bg-[#D9D9D9] border-2 border-white" />
                <div className="w-[40px] h-[40px] rounded-full bg-[#C4C4C4] border-2 border-white" />
              </div>
              <span className="font-heading text-[15px] font-medium text-foreground">
                Ajay &amp; Dylan, founders
              </span>
            </div>

            <p className="font-heading text-[19px] font-medium tracking-[-0.015em] text-foreground mb-[18px]">
              Pick whatever&apos;s easiest.
            </p>

            <Link
              href={WHATSAPP_HREF}
              className="flex items-center justify-between gap-[16px] w-full px-[24px] py-[17px] rounded-[12px] bg-[#17c04a] hover:bg-[#14a840] transition-colors text-white font-heading text-[16.5px] font-medium tracking-[-0.01em]"
            >
              <span>WhatsApp us</span>
              <svg width="21" height="21" viewBox="0 0 22 22" fill="white">
                <path d="M11 0C4.93 0 0 4.93 0 11c0 1.94.51 3.84 1.47 5.51L0 22l5.62-1.47A11 11 0 0 0 11 22c6.07 0 11-4.93 11-11S17.07 0 11 0zm6.45 15.55c-.27.76-1.34 1.43-2.21 1.58-.59.1-1.36.18-3.93-.83-3.31-1.32-5.44-4.66-5.6-4.88-.16-.22-1.34-1.79-1.34-3.41 0-1.62.85-2.42 1.15-2.75.27-.3.71-.43 1.13-.43.14 0 .26 0 .37.01.36.02.55.04.79.62.3.72 1.03 2.5 1.12 2.68.09.18.15.39.03.62-.11.24-.21.36-.39.55-.18.19-.35.34-.53.55-.16.18-.34.38-.13.74.21.36.93 1.53 1.99 2.46 1.37 1.2 2.5 1.59 2.91 1.76.31.13.67.1.9-.13.29-.31.65-.81 1.02-1.32.26-.36.59-.4.94-.27.36.13 2.27 1.08 2.66 1.27.39.19.65.29.74.45.09.16.09.93-.17 1.7z" />
              </svg>
            </Link>

            <div className="flex flex-wrap gap-x-[24px] gap-y-[12px] mt-[18px]">
              <Link
                href={CTA_HREF}
                className="inline-flex items-center gap-[7px] font-heading text-[14px] font-medium text-foreground hover:text-black/60 transition-colors"
              >
                <span>Book a call</span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-black/40"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="8 7 17 7 17 16" />
                </svg>
              </Link>
              <Link
                href="mailto:hello@ecomlanders.co"
                className="inline-flex items-center gap-[7px] font-heading text-[14px] font-medium text-foreground hover:text-black/60 transition-colors"
              >
                <span>Email us</span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-black/40"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
