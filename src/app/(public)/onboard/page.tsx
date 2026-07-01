"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

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
};

// Fields that drive the completion meter (everything marked required below).
const REQUIRED_FIELDS: (keyof FormData)[] = [
  "company_name", "website_url", "brief_description", "target_customer",
  "top_competitors", "usps", "main_products", "current_metrics",
  "brand_assets_link", "core_value_props", "reviews_testimonials",
  "words_to_avoid", "tone_of_voice", "myshopify_url", "analytics_software",
  "existing_landing_pages", "tracking_pixels", "other_integrations",
  "primary_goal", "success_definition", "timeline_expectations",
  "conversion_challenges", "common_objections", "compliance_restrictions",
  "previous_agencies", "primary_contact", "approval_decision_maker",
  "timezone", "additional_info",
];

const DRAFT_KEY = "el-onboarding-draft-v1";

// This is a public, client-facing page, so it must render identically no matter
// what theme the visitor has saved for the internal app. We use explicit,
// self-contained colours here instead of the app's semantic theme tokens.
const ink = "#16171A";
const accent = "#CDF93A";

const inputClass =
  "w-full rounded-xl border border-black/[0.09] bg-white px-4 py-3 text-[15px] text-[#16171A] shadow-[0_1px_2px_rgba(16,23,26,0.04)] transition placeholder:text-[#9CA3AF] focus:border-[#16171A] focus:outline-none focus:ring-4 focus:ring-[#16171A]/5";
const textareaClass = `${inputClass} min-h-[112px] resize-y leading-relaxed`;
const labelClass = "block text-sm font-medium text-[#16171A] mb-1.5";
const requiredStar = <span className="text-red-400 ml-0.5">*</span>;

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(16,23,26,0.04),0_12px_28px_-16px_rgba(16,23,26,0.12)] sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span
          className="grid size-7 flex-none place-items-center rounded-full text-xs font-bold"
          style={{ background: ink, color: accent }}
        >
          {n}
        </span>
        <h2
          className="text-lg font-bold tracking-tight text-[#16171A]"
          style={{ fontFamily: "var(--font-inter-tight)" }}
        >
          {title}
        </h2>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

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

function ChipMultiSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
}) {
  const selected = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
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
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              on
                ? "border-[#16171A] bg-[#16171A] text-white"
                : "border-black/10 bg-white text-[#4a4a4a] hover:border-[#16171A]/40"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingFormPage() {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ filename: string; url: string; originalName: string }[]>([]);
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
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
    setHydrated(true);
  }, []);

  // Autosave on every change once we've hydrated.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, files: uploadedFiles }));
    } catch {}
  }, [form, uploadedFiles, hydrated]);

  const filledRequired = REQUIRED_FIELDS.filter((k) => form[k].trim()).length;
  const progress = Math.round((filledRequired / REQUIRED_FIELDS.length) * 100);

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
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim() || !form.website_url.trim()) {
      setError("Company name and website URL are required.");
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
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F4] px-4">
        <div className="max-w-md text-center">
          <CheckCircleIcon className="mx-auto mb-4 size-16 text-emerald-500" />
          <h1 className="mb-3 text-2xl font-bold text-[#16171A]" style={{ fontFamily: "var(--font-inter-tight)" }}>
            Brief received
          </h1>
          <p className="text-sm leading-relaxed text-[#4a4a4a]">
            Your brief is now with the team and we'll be getting started shortly. All project updates will run through your Slack channel, where we'll request store access and any remaining details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#16171A]">
      {/* Header */}
      <header className="bg-[#16171A] px-4 pb-10 pt-9 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center gap-2.5">
            <img src="/el-logo.svg" alt="Ecom Landers" className="h-6 w-6 brightness-0 invert" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Ecom Landers</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-[2rem]" style={{ fontFamily: "var(--font-inter-tight)" }}>
            Client Onboarding
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
            Fill this out so we can hit the ground running. The more detail you give us, the faster we move. Takes around 10 minutes, and your answers save automatically as you go.
          </p>
        </div>
      </header>

      {/* Sticky progress */}
      <div className="sticky top-0 z-20 border-b border-black/[0.06] bg-[#F5F5F4]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: accent }}
            />
          </div>
          <span className="w-24 flex-none text-right text-xs font-semibold tabular-nums text-[#6B7280]">
            {progress}% complete
          </span>
        </div>
      </div>

      {/* Restored-draft notice */}
      {restored && (
        <div className="mx-auto max-w-2xl px-4 pt-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-[#4a4a4a] shadow-[0_1px_2px_rgba(16,23,26,0.04)]">
            <span>We saved your progress from last time. Pick up where you left off.</span>
            <button type="button" onClick={handleClear} className="flex-none font-medium text-[#16171A] underline decoration-black/20 underline-offset-2 hover:decoration-black/60">
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        {/* 1 — Brand & Business */}
        <Section n={1} title="Brand & Business">
          <Row>
            <Field label="Company / Brand Name" required>
              <input className={inputClass} value={form.company_name} onChange={set("company_name")} placeholder="e.g. Ecomlanders" />
            </Field>
            <Field label="Website URL" required>
              <input className={inputClass} value={form.website_url} onChange={set("website_url")} placeholder="e.g. https://ecomlanders.com" />
            </Field>
          </Row>
          <Field label="Brief description" required>
            <textarea className={textareaClass} value={form.brief_description} onChange={set("brief_description")} placeholder="What does your brand do? Who do you serve?" />
          </Field>
          <Field label="Who is your target customer? (demographics, lifestyle, purchasing triggers)" required>
            <textarea className={textareaClass} value={form.target_customer} onChange={set("target_customer")} placeholder="e.g. Women 25 to 45, health-conscious, active on Instagram..." />
          </Field>
          <Field label="Top 3 competitors (URLs or brand names)" required>
            <textarea className={textareaClass} value={form.top_competitors} onChange={set("top_competitors")} placeholder="e.g. https://ecomlanders.com, similar brand, another" />
          </Field>
          <Field label="What are your main USPs that set you apart?" required>
            <textarea className={textareaClass} value={form.usps} onChange={set("usps")} />
          </Field>
          <Field label="Main products/offers you want us to focus on" required>
            <textarea className={textareaClass} value={form.main_products} onChange={set("main_products")} />
          </Field>
          <Field label="What are the current metrics you want to focus on?" required>
            <textarea className={textareaClass} value={form.current_metrics} onChange={set("current_metrics")} placeholder="e.g. CVR, AOV, bounce rate, ad ROAS..." />
          </Field>
        </Section>

        {/* 2 — Project Specifics */}
        <Section n={2} title="Project Specifics">
          <Field label="Product URL(s): the page(s) being built or rebuilt">
            <textarea className={textareaClass} value={form.product_url} onChange={set("product_url")} placeholder="e.g. https://ecomlanders.com/products/example" />
          </Field>
          <Row>
            <Field label="Page type (select all that apply)">
              <ChipMultiSelect
                value={form.page_type}
                onChange={(v) => setForm((f) => ({ ...f, page_type: v }))}
                options={["PDP", "Advertorial", "Hero Lander", "Listicle", "Homepage", "Bundle Builder", "Collection Page", "Cart / Checkout", "Other"]}
              />
            </Field>
            <Field label="Traffic source (select all that apply)">
              <ChipMultiSelect
                value={form.traffic_source}
                onChange={(v) => setForm((f) => ({ ...f, traffic_source: v }))}
                options={["Meta (cold)", "Google", "Email", "Organic", "TikTok", "Mixed", "Other"]}
              />
            </Field>
          </Row>
          <Field label="Amazon ASIN(s), if applicable">
            <input className={inputClass} value={form.amazon_asins} onChange={set("amazon_asins")} placeholder="e.g. B09XYZ1234" />
          </Field>
          <Field label="Meta page name (so we can find running ads)">
            <input className={inputClass} value={form.meta_page_name} onChange={set("meta_page_name")} placeholder="e.g. Ecomlanders on Facebook/Meta" />
          </Field>
          <Field label="Specific direction: anything to prioritise or exclude">
            <textarea className={textareaClass} value={form.specific_direction} onChange={set("specific_direction")} placeholder="e.g. Focus on subscription push, avoid mentioning competitor X..." />
          </Field>
        </Section>

        {/* 3 — Creative & Messaging */}
        <Section n={3} title="Creative & Messaging">
          <Field label="Please provide a link to your brand assets (if available)" required>
            <input className={inputClass} value={form.brand_assets_link} onChange={set("brand_assets_link")} placeholder="Google Drive, Dropbox, etc." />
          </Field>
          <Field label="Core value props or benefits to highlight (bullet list)" required>
            <textarea className={textareaClass} value={form.core_value_props} onChange={set("core_value_props")} />
          </Field>
          <Field label="Any customer reviews/testimonials/press features we should use? (links)" required>
            <textarea className={textareaClass} value={form.reviews_testimonials} onChange={set("reviews_testimonials")} />
          </Field>
          <Field label="Words, claims, or imagery we MUST avoid (compliance/brand guardrails)" required>
            <textarea className={textareaClass} value={form.words_to_avoid} onChange={set("words_to_avoid")} />
          </Field>
          <Field label="Preferred brand tone of voice (authoritative, playful, luxury, etc.)" required>
            <textarea className={textareaClass} value={form.tone_of_voice} onChange={set("tone_of_voice")} />
          </Field>
        </Section>

        {/* 4 — Access & Data */}
        <Section n={4} title="Access & Data">
          <Field label="Please enter your myshopify.com URL & collaborator code" required>
            <input className={inputClass} value={form.myshopify_url} onChange={set("myshopify_url")} placeholder="e.g. ecomlanders.myshopify.com / code: XXXX" />
          </Field>
          <Field label="Do you have analytics software set up? (Clarity, Intelligems, etc.)" required>
            <textarea className={textareaClass} value={form.analytics_software} onChange={set("analytics_software")} />
          </Field>
          <Field label="Do you have existing landing pages/funnels we should review? (links)" required>
            <textarea className={textareaClass} value={form.existing_landing_pages} onChange={set("existing_landing_pages")} />
          </Field>
          <Field label="Are tracking pixels, tags, or survey tools already set up? (yes/no, details)" required>
            <textarea className={textareaClass} value={form.tracking_pixels} onChange={set("tracking_pixels")} />
          </Field>
          <Field label="Other integrations we should be aware of (email/SMS, reviews, loyalty, etc.)" required>
            <textarea className={textareaClass} value={form.other_integrations} onChange={set("other_integrations")} />
          </Field>
        </Section>

        {/* 5 — Success Metrics & Priorities */}
        <Section n={5} title="Success Metrics & Priorities">
          <Field label="Primary goal of this project (e.g. increase CR, raise AOV, scale revenue, CLTV growth)" required>
            <textarea className={textareaClass} value={form.primary_goal} onChange={set("primary_goal")} />
          </Field>
          <Field label="What success looks like to you in your own words?" required>
            <textarea className={textareaClass} value={form.success_definition} onChange={set("success_definition")} />
          </Field>
          <Field label="Timeline expectations (hard launch dates, campaign deadlines, seasonal promotions)" required>
            <textarea className={textareaClass} value={form.timeline_expectations} onChange={set("timeline_expectations")} />
          </Field>
        </Section>

        {/* 6 — Risk & Bottlenecks */}
        <Section n={6} title="Risk & Bottlenecks">
          <Field label="Known conversion challenges (low mobile CR, cart abandonment, low email capture, etc.)" required>
            <textarea className={textareaClass} value={form.conversion_challenges} onChange={set("conversion_challenges")} />
          </Field>
          <Field label="Most common objections or negative feedback from customers" required>
            <textarea className={textareaClass} value={form.common_objections} onChange={set("common_objections")} />
          </Field>
          <Field label="Any industry compliance/restrictions we need to know? (supplements, finance, skincare, etc.)" required>
            <textarea className={textareaClass} value={form.compliance_restrictions} onChange={set("compliance_restrictions")} />
          </Field>
          <Field label="Have you worked with agencies/consultants before? (what worked / didn't work)" required>
            <textarea className={textareaClass} value={form.previous_agencies} onChange={set("previous_agencies")} />
          </Field>
        </Section>

        {/* 7 — Workflow & Communication */}
        <Section n={7} title="Workflow & Communication">
          <Field label="Who will be our primary point of contact? (name, are they in Slack?)" required>
            <textarea className={textareaClass} value={form.primary_contact} onChange={set("primary_contact")} />
          </Field>
          <Field label="Who makes final approval decisions?" required>
            <textarea className={textareaClass} value={form.approval_decision_maker} onChange={set("approval_decision_maker")} />
          </Field>
          <Field label="Which timezone do your team work out of?" required>
            <textarea className={textareaClass} value={form.timezone} onChange={set("timezone")} />
          </Field>
        </Section>

        {/* 8 — Final Uploads & Extras */}
        <Section n={8} title="Final Uploads & Extras">
          <div>
            <label className={labelClass}>Upload any additional assets not already provided</label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 bg-[#FAFAF9] py-9 transition-colors hover:border-[#16171A]/40">
              {uploadingFiles ? (
                <div className="flex items-center gap-2">
                  <div className="size-5 animate-spin rounded-full border-2 border-black/15 border-t-[#16171A]" />
                  <span className="text-sm text-[#4a4a4a]">Uploading...</span>
                </div>
              ) : (
                <span className="text-sm text-[#6B7280]">Drop files here or click to upload</span>
              )}
              <input
                ref={fileRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploadingFiles}
                className="hidden"
              />
            </label>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-xs">
                    <span className="truncate text-[#4a4a4a]">{f.originalName}</span>
                    <button type="button" onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2 text-[#9CA3AF] hover:text-red-500">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Field label="Any other information you think we should know before starting?" required>
            <textarea className={textareaClass} value={form.additional_info} onChange={set("additional_info")} />
          </Field>
        </Section>

        {/* Error */}
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}

        {/* Submit */}
        <div className="space-y-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#16171A] py-4 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit brief"}
          </button>
          <p className="text-center text-xs text-[#9CA3AF]">
            Your answers are saved on this device as you type. Nothing is sent until you submit.
          </p>
        </div>
      </form>

      {/* Footer */}
      <div className="py-8 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">Ecom Landers</p>
      </div>
    </div>
  );
}
