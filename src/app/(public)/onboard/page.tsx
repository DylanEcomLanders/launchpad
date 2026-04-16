"use client";

import { useState, useRef } from "react";
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

const inputClass = "w-full px-4 py-3 bg-white border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:border-[#1B1B1B] focus:ring-1 focus:ring-[#1B1B1B]/10 transition-all placeholder:text-[#CCC]";
const textareaClass = `${inputClass} min-h-[100px] resize-y`;
const labelClass = "block text-sm font-medium text-[#1A1A1A] mb-1.5";
const requiredStar = <span className="text-red-400 ml-0.5">*</span>;

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="pt-8 pb-4 first:pt-0">
      <h2 className="text-lg font-bold text-[#1A1A1A]">{title}</h2>
      <div className="h-px bg-[#E5E5EA] mt-3" />
    </div>
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

export default function OnboardingFormPage() {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ filename: string; url: string; originalName: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <CheckCircleIcon className="size-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Brief received!</h1>
          <p className="text-sm text-[#777] leading-relaxed">
            Your brief is now with the team and we'll be getting started shortly. All project updates will run through your Slack channel — we'll be requesting store access and any remaining details in there.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-[#1B1B1B] text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <img src="/el-logo.svg" alt="Ecom Landers" className="w-7 h-7 brightness-0 invert" />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Ecom Landers</span>
          </div>
          <h1 className="text-2xl font-bold">Client Onboarding</h1>
          <p className="text-sm text-white/60 mt-1">Fill this out so we can hit the ground running. The more detail, the faster we move.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-5">
          {/* ── Brand & Business ── */}
          <SectionHeader title="Brand & Business" />
          <Row>
            <Field label="Company / Brand Name" required>
              <input className={inputClass} value={form.company_name} onChange={set("company_name")} placeholder="e.g., Luma Nutrition" />
            </Field>
            <Field label="Website URL" required>
              <input className={inputClass} value={form.website_url} onChange={set("website_url")} placeholder="e.g., https://lumanutrition.com" />
            </Field>
          </Row>
          <Field label="Brief description" required>
            <textarea className={textareaClass} value={form.brief_description} onChange={set("brief_description")} placeholder="What does your brand do? Who do you serve?" />
          </Field>
          <Field label="Who is your target customer? (demographics, lifestyle, purchasing triggers)" required>
            <textarea className={textareaClass} value={form.target_customer} onChange={set("target_customer")} placeholder="e.g., Women 25-45, health-conscious, active on Instagram..." />
          </Field>
          <Field label="Top 3 competitors (URLs or brand names)" required>
            <textarea className={textareaClass} value={form.top_competitors} onChange={set("top_competitors")} placeholder="e.g., https://competitor1.com, Brand X, Brand Y" />
          </Field>
          <Field label="What are your main USPs that set you apart?" required>
            <textarea className={textareaClass} value={form.usps} onChange={set("usps")} />
          </Field>
          <Field label="Main products/offers you want us to focus on" required>
            <textarea className={textareaClass} value={form.main_products} onChange={set("main_products")} />
          </Field>
          <Field label="What are the current metrics you want to focus on?" required>
            <textarea className={textareaClass} value={form.current_metrics} onChange={set("current_metrics")} placeholder="e.g., CVR, AOV, bounce rate, ad ROAS..." />
          </Field>

          {/* ── Creative & Messaging ── */}
          <SectionHeader title="Creative & Messaging" />
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

          {/* ── Access & Data ── */}
          <SectionHeader title="Access & Data" />
          <Field label="Please enter your myshopify.com URL & collaborator code" required>
            <input className={inputClass} value={form.myshopify_url} onChange={set("myshopify_url")} placeholder="e.g., your-store.myshopify.com / code: XXXX" />
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

          {/* ── Success Metrics & Priorities ── */}
          <SectionHeader title="Success Metrics & Priorities" />
          <Field label="Primary goal of this project (e.g., increase CR, raise AOV, scale revenue, CLTV growth)" required>
            <textarea className={textareaClass} value={form.primary_goal} onChange={set("primary_goal")} />
          </Field>
          <Field label="What success looks like to you in your own words?" required>
            <textarea className={textareaClass} value={form.success_definition} onChange={set("success_definition")} />
          </Field>
          <Field label="Timeline expectations (hard launch dates, campaign deadlines, seasonal promotions)" required>
            <textarea className={textareaClass} value={form.timeline_expectations} onChange={set("timeline_expectations")} />
          </Field>

          {/* ── Risk & Bottlenecks ── */}
          <SectionHeader title="Risk & Bottlenecks" />
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

          {/* ── Workflow & Communication ── */}
          <SectionHeader title="Workflow & Communication" />
          <Field label="Who will be our primary point of contact? (name, are they in Slack?)" required>
            <textarea className={textareaClass} value={form.primary_contact} onChange={set("primary_contact")} />
          </Field>
          <Field label="Who makes final approval decisions?" required>
            <textarea className={textareaClass} value={form.approval_decision_maker} onChange={set("approval_decision_maker")} />
          </Field>
          <Field label="Which timezone do your team work out of?" required>
            <textarea className={textareaClass} value={form.timezone} onChange={set("timezone")} />
          </Field>

          {/* ── Final Uploads & Extras ── */}
          <SectionHeader title="Final Uploads & Extras" />
          <div>
            <label className={labelClass}>Upload any additional assets not already provided</label>
            <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-[#DDD] rounded-xl cursor-pointer hover:border-[#999] transition-colors">
              {uploadingFiles ? (
                <div className="flex items-center gap-2">
                  <div className="size-5 border-2 border-[#CCC] border-t-[#1B1B1B] rounded-full animate-spin" />
                  <span className="text-sm text-[#777]">Uploading...</span>
                </div>
              ) : (
                <span className="text-sm text-[#999]">Drop files here or click to upload</span>
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
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-white border border-[#E5E5EA] rounded-lg text-xs">
                    <span className="text-[#555] truncate">{f.originalName}</span>
                    <button type="button" onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-[#CCC] hover:text-red-500 ml-2">
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

          {/* Error */}
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#1B1B1B] text-white text-sm font-semibold rounded-xl hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-[10px] text-[#CCC]">Ecom Landers</p>
      </div>
    </div>
  );
}
