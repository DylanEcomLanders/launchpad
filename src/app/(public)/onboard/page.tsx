"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

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

// Section = one step. title + a short editorial intro + its required fields
// (which drive the segmented progress + the overall completion meter).
const SECTIONS: { title: string; intro: string; required: (keyof FormData)[] }[] = [
  { title: "Brand & Business", intro: "Tell us who you are and who you're for. Takes about 10 minutes, and everything saves as you go.", required: ["company_name", "website_url", "brief_description", "target_customer", "top_competitors", "usps", "main_products", "current_metrics"] },
  { title: "Project Specifics", intro: "What are we building, and where's the traffic coming from?", required: [] },
  { title: "Creative & Messaging", intro: "The words, proof, and tone that make it convert.", required: ["brand_assets_link", "core_value_props", "reviews_testimonials", "words_to_avoid", "tone_of_voice"] },
  { title: "Access & Data", intro: "So we can get in and see what's really happening.", required: ["myshopify_url", "analytics_software", "existing_landing_pages", "tracking_pixels", "other_integrations"] },
  { title: "Success Metrics & Priorities", intro: "How we'll know this worked.", required: ["primary_goal", "success_definition", "timeline_expectations"] },
  { title: "Risk & Bottlenecks", intro: "What's held you back before, so we don't repeat it.", required: ["conversion_challenges", "common_objections", "compliance_restrictions", "previous_agencies"] },
  { title: "Workflow & Communication", intro: "How we'll work together, day to day.", required: ["primary_contact", "approval_decision_maker", "timezone"] },
  { title: "Final Uploads & Extras", intro: "Anything else we should have, then send it our way.", required: ["additional_info"] },
];
const LAST = SECTIONS.length - 1;
const REQUIRED_FIELDS: (keyof FormData)[] = SECTIONS.flatMap((s) => s.required);

const DRAFT_KEY = "el-onboarding-draft-v1";

/* Driven by the app's design tokens so the client form matches the rest of
 * Launchpad (dark surface, hairline borders, 4px radii, monochrome). */
const inputClass =
  "w-full rounded border border-border bg-surface px-4 py-3 text-base text-foreground transition placeholder:text-subtle focus:border-foreground/30 focus:outline-none";
const textareaClass = `${inputClass} min-h-[120px] resize-y leading-relaxed`;
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

  const sectionComplete = (i: number) => SECTIONS[i].required.every((k) => form[k].trim());

  const goto = (i: number) => {
    setStep(Math.max(0, Math.min(LAST, i)));
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky top: brand + segmented progress (doubles as step nav) */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-xl space-y-3 px-6 py-3.5">
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

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
        }}
        className="mx-auto max-w-xl px-6 py-14 sm:py-16"
      >
        {restored && (
          <div className="mb-10 flex items-center justify-between gap-3 border-b border-border-faint pb-5 text-sm text-muted">
            <span>We saved your progress from last time.</span>
            <button
              type="button"
              onClick={handleClear}
              className="flex-none text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground/60"
            >
              Start over
            </button>
          </div>
        )}

        {/* Step heading */}
        <div className="mb-10">
          <span className="text-xs uppercase tracking-[0.2em] text-subtle" style={mono}>
            {String(step + 1).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{SECTIONS[step].title}</h2>
          <p className="mt-2.5 leading-relaxed text-muted">{SECTIONS[step].intro}</p>
        </div>

        {/* Fields */}
        <div className="space-y-8">
          {step === 0 && (
            <>
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
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Product URL(s): the page(s) being built or rebuilt">
                <textarea className={textareaClass} value={form.product_url} onChange={set("product_url")} placeholder="e.g. https://ecomlanders.com/products/example" />
              </Field>
              <Row>
                <Field label="Page type (select all that apply)">
                  <ChipMultiSelect value={form.page_type} onChange={(v) => setForm((f) => ({ ...f, page_type: v }))} options={["PDP", "Advertorial", "Hero Lander", "Listicle", "Homepage", "Bundle Builder", "Collection Page", "Cart / Checkout", "Other"]} />
                </Field>
                <Field label="Traffic source (select all that apply)">
                  <ChipMultiSelect value={form.traffic_source} onChange={(v) => setForm((f) => ({ ...f, traffic_source: v }))} options={["Meta (cold)", "Google", "Email", "Organic", "TikTok", "Mixed", "Other"]} />
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
            </>
          )}

          {step === 2 && (
            <>
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
            </>
          )}

          {step === 3 && (
            <>
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
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Primary goal of this project (e.g. increase CR, raise AOV, scale revenue, CLTV growth)" required>
                <textarea className={textareaClass} value={form.primary_goal} onChange={set("primary_goal")} />
              </Field>
              <Field label="What success looks like to you in your own words?" required>
                <textarea className={textareaClass} value={form.success_definition} onChange={set("success_definition")} />
              </Field>
              <Field label="Timeline expectations (hard launch dates, campaign deadlines, seasonal promotions)" required>
                <textarea className={textareaClass} value={form.timeline_expectations} onChange={set("timeline_expectations")} />
              </Field>
            </>
          )}

          {step === 5 && (
            <>
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
            </>
          )}

          {step === 6 && (
            <>
              <Field label="Who will be our primary point of contact? (name, are they in Slack?)" required>
                <textarea className={textareaClass} value={form.primary_contact} onChange={set("primary_contact")} />
              </Field>
              <Field label="Who makes final approval decisions?" required>
                <textarea className={textareaClass} value={form.approval_decision_maker} onChange={set("approval_decision_maker")} />
              </Field>
              <Field label="Which timezone do your team work out of?" required>
                <textarea className={textareaClass} value={form.timezone} onChange={set("timezone")} />
              </Field>
            </>
          )}

          {step === 7 && (
            <>
              <div>
                <label className={labelClass}>Upload any additional assets not already provided</label>
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
              <Field label="Any other information you think we should know before starting?" required>
                <textarea className={textareaClass} value={form.additional_info} onChange={set("additional_info")} />
              </Field>
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

        <p className="mt-10 text-center text-xs text-subtle">
          Your answers save on this device as you type. Nothing is sent until you submit.
        </p>
      </form>
    </div>
  );
}
