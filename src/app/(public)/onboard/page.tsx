"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { ArrowRightIcon, CheckIcon } from "@heroicons/react/24/outline";

interface FormData {
  // Brand & Business
  company_name: string;
  website_url: string;
  brief_description: string;
  target_customer: string;
  top_competitors: string;
  usps: string;
  main_products: string;
  current_metrics: string;
  // Project Specifics
  product_url: string;
  page_type: string;
  traffic_source: string;
  amazon_asins: string;
  specific_direction: string;
  meta_page_name: string;
  // Creative & Messaging
  brand_assets_link: string;
  core_value_props: string;
  reviews_testimonials: string;
  words_to_avoid: string;
  tone_of_voice: string;
  // Access & Data
  myshopify_url: string;
  analytics_software: string;
  existing_landing_pages: string;
  tracking_pixels: string;
  other_integrations: string;
  // Success Metrics
  primary_goal: string;
  success_definition: string;
  timeline_expectations: string;
  // Risk & Bottlenecks
  conversion_challenges: string;
  common_objections: string;
  compliance_restrictions: string;
  previous_agencies: string;
  // Workflow
  primary_contact: string;
  approval_decision_maker: string;
  timezone: string;
  // Final
  additional_info: string;
  // Added: creative latitude (Brand), dev stack (Development)
  brand_flexibility: string;
  dev_apps: string;
  dev_apps_other: string;
}

const emptyForm: FormData = {
  company_name: "", website_url: "", brief_description: "", target_customer: "",
  top_competitors: "", usps: "", main_products: "", current_metrics: "",
  product_url: "", page_type: "", traffic_source: "", amazon_asins: "",
  specific_direction: "", meta_page_name: "",
  brand_assets_link: "", core_value_props: "", reviews_testimonials: "",
  words_to_avoid: "", tone_of_voice: "",
  myshopify_url: "", analytics_software: "", existing_landing_pages: "",
  tracking_pixels: "", other_integrations: "",
  primary_goal: "", success_definition: "", timeline_expectations: "",
  conversion_challenges: "", common_objections: "", compliance_restrictions: "",
  previous_agencies: "",
  primary_contact: "", approval_decision_maker: "", timezone: "",
  additional_info: "",
  brand_flexibility: "", dev_apps: "", dev_apps_other: "",
};

// Section = one step. title + a short editorial intro + its required fields
// (which drive the segmented progress + the overall completion meter).
const SECTIONS: { title: string; intro: string; required: (keyof FormData)[] }[] = [
  { title: "Brand information", intro: "Who you are, how you sound, and how much room we have to be creative.", required: ["company_name", "website_url", "brief_description", "target_customer", "usps", "main_products", "tone_of_voice", "brand_flexibility"] },
  { title: "Access", intro: "Get us into your store and tools, and tell us who we're working with.", required: ["myshopify_url", "primary_contact"] },
  { title: "Design", intro: "What we're building, and the direction that feels like you.", required: [] },
  { title: "Development", intro: "Your stack and setup, so our dev team are ready before day one.", required: [] },
  { title: "Insights", intro: "Your goals, your numbers, and what's held you back before.", required: ["primary_goal", "success_definition"] },
];

// Apps our dev team plan around. Client ticks what they use + keep, adds any others.
const APP_OPTIONS = [
  "Klaviyo", "Recharge", "Skio", "Yotpo", "Okendo", "Loox", "Judge.me", "Gorgias",
  "Rebuy", "ReConvert", "Postscript", "Attentive", "Triple Whale", "Tapcart", "Smile.io", "Stamped",
];
const LAST = SECTIONS.length - 1;
const REQUIRED_FIELDS: (keyof FormData)[] = SECTIONS.flatMap((s) => s.required);

const DRAFT_KEY = "el-onboarding-draft-v1";

/* Driven by the app's design tokens so the client form matches the rest of
 * Launchpad (dark surface, hairline borders, 4px radii, monochrome). */
const inputClass =
  "w-full rounded border border-border bg-surface px-4 py-3 text-base text-foreground transition placeholder:text-subtle focus:border-foreground/30 focus:outline-none";
const textareaClass = `${inputClass} min-h-[84px] resize-y leading-relaxed`;
const labelClass = "block text-sm font-medium text-foreground mb-2";
const mono = { fontFamily: "var(--font-mono)" } as const;
const requiredStar = <span className="text-status-late ml-0.5">*</span>;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}{required && requiredStar}</label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

// A labelled group of fields inside a step, so a section reads as a few small
// clusters rather than one long stack of boxes.
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle" style={mono}>{title}</p>
      {children}
    </section>
  );
}

function ChipMultiSelect({ value, onChange, options }: { value: string; onChange: (next: string) => void; options: string[] }) {
  const selected = value.split(",").map((s) => s.trim()).filter(Boolean);
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(next.join(", "));
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
              on ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// 1-10 scale (used for the brand creative-latitude question).
function Scale({ value, onChange, lowLabel, highLabel }: { value: string; onChange: (v: string) => void; lowLabel?: string; highLabel?: string }) {
  const nums = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {nums.map((n) => {
          const on = value === String(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(on ? "" : String(n))}
              className={`flex-1 rounded border py-2.5 text-sm font-medium tabular-nums transition-colors ${
                on ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-2xs text-subtle">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

export default function OnboardingFormPage() {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ filename: string; url: string; originalName: string }[]>([]);
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const fileRef = useRef<HTMLInputElement>(null);

  // Restore any in-progress draft so returning clients never re-type from scratch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { form?: Partial<FormData>; files?: typeof uploadedFiles };
        if (saved.form) {
          setForm((prev) => ({ ...prev, ...saved.form }));
          if (Object.values(saved.form).some((v) => v)) setRestored(true);
        }
        if (Array.isArray(saved.files)) setUploadedFiles(saved.files);
      }
    } catch {}
    // Prefill from the checkout link (?company=&contact=), but never overwrite a
    // value the client already entered / restored above.
    try {
      const q = new URLSearchParams(window.location.search);
      const company = q.get("company") ?? "";
      const contact = q.get("contact") ?? "";
      if (company || contact) {
        setForm((prev) => ({
          ...prev,
          company_name: prev.company_name || company,
          primary_contact: prev.primary_contact || contact,
        }));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Autosave on every change once we've hydrated.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, files: uploadedFiles }));
    } catch {}
  }, [form, uploadedFiles, hydrated]);

  const sectionComplete = (i: number) => SECTIONS[i].required.every((k) => form[k].trim());
  const filledRequired = REQUIRED_FIELDS.filter((k) => form[k].trim()).length;
  const pct = Math.round((filledRequired / REQUIRED_FIELDS.length) * 100);
  // A section reads as complete when its required fields are filled; sections
  // with no required fields count once the client has visited and moved past them.
  const complete = (i: number) => (SECTIONS[i].required.length > 0 ? sectionComplete(i) : visited.has(i) && i !== step);

  const goto = (i: number) => {
    const n = Math.max(0, Math.min(LAST, i));
    setStep(n);
    setVisited((v) => new Set(v).add(n));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/design-brief/upload?bucket=Handover-files", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          setUploadedFiles((prev) => [...prev, { filename: data.filename, url: data.url, originalName: data.originalName }]);
        }
      } catch {}
    }
    setUploadingFiles(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClear = () => {
    if (!window.confirm("Clear everything you've entered and start over?")) return;
    setForm(emptyForm);
    setUploadedFiles([]);
    setRestored(false);
    setStep(0);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < LAST) {
      goto(step + 1);
      return;
    }
    if (!form.company_name.trim() || !form.website_url.trim()) {
      setError("Company name and website URL are required (in the first step).");
      setStep(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, uploaded_files: uploadedFiles }),
      });
      if (!res.ok) throw new Error("Failed");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <CheckCircleIcon className="mx-auto mb-5 size-12 text-status-ontrack" />
          <h1 className="mb-3 text-2xl font-semibold text-foreground">Brief received</h1>
          <p className="text-sm leading-relaxed text-muted">
            Your brief is now with the team and we&apos;ll be getting started shortly. All project updates will run
            through your Slack channel, where we&apos;ll request store access and any remaining details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* Mobile top bar: brand + segmented progress (doubles as step nav) */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md md:hidden">
        <div className="space-y-3 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/el-logo.svg" alt="Ecom Landers" className="h-4 w-4 brightness-0 invert" />
              <span className="text-xs text-subtle">Client Onboarding</span>
            </div>
            <span className="text-xs tabular-nums text-subtle">Step {step + 1} of {SECTIONS.length}</span>
          </div>
          <div className="flex gap-1">
            {SECTIONS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => goto(i)}
                title={`${i + 1}. ${s.title}`}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step || sectionComplete(i) ? "bg-foreground" : "bg-surface hover:bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Left contents rail (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border px-6 py-8 md:flex">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/el-logo.svg" alt="Ecom Landers" className="h-5 w-5 brightness-0 invert" />
          <span className="text-sm font-semibold tracking-tight text-foreground">Ecom Landers</span>
        </div>

        <p className="mt-9 mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-subtle" style={mono}>Contents</p>
        <nav className="-mx-2 flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
          {SECTIONS.map((s, i) => {
            const active = i === step;
            const done = complete(i);
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => goto(i)}
                className={`group flex w-full items-center gap-3 rounded px-2 py-2 text-left transition-colors ${active ? "bg-surface" : "hover:bg-surface/60"}`}
              >
                {done ? (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-foreground">
                    <CheckIcon className="size-3 text-background [stroke-width:3]" />
                  </span>
                ) : (
                  <span className={`w-5 shrink-0 text-center text-[11px] tabular-nums ${active ? "text-foreground" : "text-subtle"}`} style={mono}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <span className={`flex-1 text-[13px] leading-snug ${active ? "font-medium text-foreground" : done ? "text-foreground" : "text-muted group-hover:text-foreground"}`}>
                  {s.title}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-border-faint pt-5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-subtle">
            <span className="truncate">{form.company_name ? `Onboarding · ${form.company_name}` : "Client Onboarding"}</span>
            <span className="shrink-0 tabular-nums">{step + 1}/{SECTIONS.length}</span>
          </div>
          {restored && (
            <button type="button" onClick={handleClear} className="mt-3 text-[11px] text-subtle underline decoration-border underline-offset-2 hover:text-foreground">
              Saved from last time · start over
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
        }}
        className="mx-auto max-w-2xl px-6 py-14 md:px-16 md:py-20"
      >
        {/* Editorial hero */}
        <div className="mb-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-subtle" style={mono}>Client Onboarding</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-5xl" style={{ fontFamily: "var(--font-body)" }}>
            {SECTIONS[step].title}
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-muted">{SECTIONS[step].intro}</p>
        </div>

        {/* Fields */}
        <div className="space-y-10">
          {/* 01 Brand information */}
          {step === 0 && (
            <>
              <Group title="Basics">
                <Row>
                  <Field label="Company / brand name" required>
                    <input className={inputClass} value={form.company_name} onChange={set("company_name")} placeholder="e.g. Ecomlanders" />
                  </Field>
                  <Field label="Website" required>
                    <input className={inputClass} value={form.website_url} onChange={set("website_url")} placeholder="https://" />
                  </Field>
                </Row>
                <Field label="Brief description" required>
                  <textarea className={textareaClass} value={form.brief_description} onChange={set("brief_description")} placeholder="What does your brand do? Who do you serve?" />
                </Field>
                <Field label="Target customer" required>
                  <textarea className={textareaClass} value={form.target_customer} onChange={set("target_customer")} placeholder="Demographics, lifestyle, what makes them buy..." />
                </Field>
              </Group>

              <Group title="Positioning">
                <Field label="What sets you apart (USPs)" required>
                  <textarea className={textareaClass} value={form.usps} onChange={set("usps")} />
                </Field>
                <Field label="Main products / offers to focus on" required>
                  <textarea className={textareaClass} value={form.main_products} onChange={set("main_products")} />
                </Field>
                <Field label="Top competitors">
                  <input className={inputClass} value={form.top_competitors} onChange={set("top_competitors")} placeholder="URLs or brand names" />
                </Field>
              </Group>

              <Group title="Voice & guardrails">
                <Row>
                  <Field label="Tone of voice" required>
                    <input className={inputClass} value={form.tone_of_voice} onChange={set("tone_of_voice")} placeholder="Authoritative, playful, luxury..." />
                  </Field>
                  <Field label="Brand assets link">
                    <input className={inputClass} value={form.brand_assets_link} onChange={set("brand_assets_link")} placeholder="Drive, Dropbox, Figma..." />
                  </Field>
                </Row>
                <Field label="Value props to highlight">
                  <textarea className={textareaClass} value={form.core_value_props} onChange={set("core_value_props")} />
                </Field>
                <Row>
                  <Field label="Reviews or press (links)">
                    <input className={inputClass} value={form.reviews_testimonials} onChange={set("reviews_testimonials")} />
                  </Field>
                  <Field label="Words or claims to avoid">
                    <input className={inputClass} value={form.words_to_avoid} onChange={set("words_to_avoid")} />
                  </Field>
                </Row>
              </Group>

              <Group title="Creative freedom">
                <Field label="How much creative freedom do we have?" required>
                  <Scale
                    value={form.brand_flexibility}
                    onChange={(v) => setForm((f) => ({ ...f, brand_flexibility: v }))}
                    lowLabel="1 · Stick to brand"
                    highLabel="10 · Full creative freedom"
                  />
                </Field>
              </Group>
            </>
          )}

          {/* 02 Access */}
          {step === 1 && (
            <>
              <Group title="Store & tools">
                <Field label="myshopify.com URL & collaborator code" required>
                  <input className={inputClass} value={form.myshopify_url} onChange={set("myshopify_url")} placeholder="ecomlanders.myshopify.com / code: XXXX" />
                </Field>
                <Row>
                  <Field label="Analytics tools">
                    <input className={inputClass} value={form.analytics_software} onChange={set("analytics_software")} placeholder="Clarity, Intelligems, GA4..." />
                  </Field>
                  <Field label="Meta page name">
                    <input className={inputClass} value={form.meta_page_name} onChange={set("meta_page_name")} placeholder="To find running ads" />
                  </Field>
                </Row>
                <Row>
                  <Field label="Pixels / tags / surveys set up?">
                    <input className={inputClass} value={form.tracking_pixels} onChange={set("tracking_pixels")} placeholder="Yes / no + details" />
                  </Field>
                  <Field label="Other integrations">
                    <input className={inputClass} value={form.other_integrations} onChange={set("other_integrations")} placeholder="Email/SMS, reviews, loyalty..." />
                  </Field>
                </Row>
                <Field label="Existing pages / funnels to review (links)">
                  <input className={inputClass} value={form.existing_landing_pages} onChange={set("existing_landing_pages")} />
                </Field>
              </Group>

              <Group title="Who we're working with">
                <Field label="Primary point of contact" required>
                  <input className={inputClass} value={form.primary_contact} onChange={set("primary_contact")} placeholder="Name, and are they in Slack?" />
                </Field>
                <Row>
                  <Field label="Final approval decisions">
                    <input className={inputClass} value={form.approval_decision_maker} onChange={set("approval_decision_maker")} />
                  </Field>
                  <Field label="Team timezone">
                    <input className={inputClass} value={form.timezone} onChange={set("timezone")} placeholder="e.g. GMT / London" />
                  </Field>
                </Row>
              </Group>
            </>
          )}

          {/* 03 Design */}
          {step === 2 && (
            <>
              <Group title="Scope">
                <Field label="Page(s) being built or rebuilt (URLs)">
                  <input className={inputClass} value={form.product_url} onChange={set("product_url")} placeholder="https://..." />
                </Field>
                <Field label="Page type">
                  <ChipMultiSelect value={form.page_type} onChange={(v) => setForm((f) => ({ ...f, page_type: v }))} options={["PDP", "Advertorial", "Hero Lander", "Listicle", "Homepage", "Bundle Builder", "Collection Page", "Cart / Checkout", "Other"]} />
                </Field>
                <Field label="Anything to prioritise or exclude, creatively?">
                  <textarea className={textareaClass} value={form.specific_direction} onChange={set("specific_direction")} placeholder="Push the subscription offer, avoid competitor X..." />
                </Field>
              </Group>
            </>
          )}

          {/* 04 Development */}
          {step === 3 && (
            <>
              <Group title="Your stack">
                <Field label="Apps you use that we should keep">
                  <ChipMultiSelect value={form.dev_apps} onChange={(v) => setForm((f) => ({ ...f, dev_apps: v }))} options={APP_OPTIONS} />
                </Field>
                <Field label="Any others we didn't list?">
                  <input className={inputClass} value={form.dev_apps_other} onChange={set("dev_apps_other")} placeholder="Custom subscription app, headless setup..." />
                </Field>
              </Group>

              <Group title="Context">
                <Field label="Traffic sources">
                  <ChipMultiSelect value={form.traffic_source} onChange={(v) => setForm((f) => ({ ...f, traffic_source: v }))} options={["Meta (cold)", "Google", "Email", "Organic", "TikTok", "Mixed", "Other"]} />
                </Field>
                <Row>
                  <Field label="Amazon ASIN(s)">
                    <input className={inputClass} value={form.amazon_asins} onChange={set("amazon_asins")} placeholder="e.g. B09XYZ1234" />
                  </Field>
                  <Field label="Compliance / restrictions">
                    <input className={inputClass} value={form.compliance_restrictions} onChange={set("compliance_restrictions")} placeholder="Supplements, finance, skincare..." />
                  </Field>
                </Row>
              </Group>
            </>
          )}

          {/* 05 Insights */}
          {step === 4 && (
            <>
              <Group title="Goals">
                <Field label="Primary goal of this project" required>
                  <textarea className={textareaClass} value={form.primary_goal} onChange={set("primary_goal")} placeholder="Increase CR, raise AOV, scale revenue, CLTV..." />
                </Field>
                <Field label="What does success look like, in your words?" required>
                  <textarea className={textareaClass} value={form.success_definition} onChange={set("success_definition")} />
                </Field>
                <Row>
                  <Field label="Metrics to focus on">
                    <input className={inputClass} value={form.current_metrics} onChange={set("current_metrics")} placeholder="CVR, AOV, ROAS..." />
                  </Field>
                  <Field label="Timeline / key dates">
                    <input className={inputClass} value={form.timeline_expectations} onChange={set("timeline_expectations")} placeholder="Launches, campaigns, seasonal" />
                  </Field>
                </Row>
              </Group>

              <Group title="What's held you back">
                <Field label="Known conversion challenges">
                  <textarea className={textareaClass} value={form.conversion_challenges} onChange={set("conversion_challenges")} placeholder="Low mobile CR, cart abandonment, weak email capture..." />
                </Field>
                <Field label="Common customer objections">
                  <textarea className={textareaClass} value={form.common_objections} onChange={set("common_objections")} />
                </Field>
                <Field label="Past agencies: what worked / didn't">
                  <textarea className={textareaClass} value={form.previous_agencies} onChange={set("previous_agencies")} />
                </Field>
              </Group>

              <Group title="Extras">
                <div>
                <label className={labelClass}>Upload any extra assets or references</label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-border bg-surface py-10 transition-colors hover:border-foreground/40">
                  {uploadingFiles ? (
                    <div className="flex items-center gap-2">
                      <div className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
                      <span className="text-sm text-muted">Uploading...</span>
                    </div>
                  ) : (
                    <span className="text-sm text-subtle">Drop files here or click to upload</span>
                  )}
                  <input ref={fileRef} type="file" multiple onChange={handleFileUpload} disabled={uploadingFiles} className="hidden" />
                </label>
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2 text-xs">
                        <span className="truncate text-muted">{f.originalName}</span>
                        <button type="button" onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2 text-subtle hover:text-status-late">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                </div>
                <Field label="Anything else before we start?">
                  <textarea className={textareaClass} value={form.additional_info} onChange={set("additional_info")} />
                </Field>
              </Group>
            </>
          )}
        </div>

        {error && <p className="mt-6 text-sm font-medium text-status-late">{error}</p>}

        {/* Nav */}
        <div className="mt-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goto(step - 1)}
            disabled={step === 0}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
          >
            Back
          </button>
          {step < LAST ? (
            <button
              type="button"
              onClick={() => goto(step + 1)}
              className="inline-flex items-center gap-1.5 rounded bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Continue
              <ArrowRightIcon className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit brief"}
              {!submitting && <ArrowRightIcon className="size-4" />}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-14 flex items-center justify-between border-t border-border-faint pt-6 text-[11px] text-subtle">
          <span className="font-medium text-muted">Ecom Landers</span>
          <span>Saved on this device · nothing sent until you submit</span>
        </div>
      </form>
      </main>
    </div>
  );
}
