"use client";

import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";
import type { OnboardingSubmission } from "@/lib/onboarding";
import { BRIEF_FIELDS, type EngagementBrief } from "@/lib/engagement-template";

/* The /engagements/[id] Brief panel. When the engagement was spawned
 * from an OnboardingSubmission, render the full intake form. Otherwise
 * fall back to the slim EngagementBrief snapshot off the Client row.
 * Default state: open, the brief is the most-referenced bit of context
 * on a delivery, no point burying it. */
export function BriefIntakePanel({
  brief,
  intake,
  open,
  onToggle,
}: {
  brief: EngagementBrief;
  intake: OnboardingSubmission | null;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="mb-5 rounded-lg border border-[#2A2A2A] bg-[#181818]">
      <div className="w-full flex items-baseline justify-between px-4 py-3">
        <button
          onClick={onToggle}
          className="flex items-baseline gap-3 hover:opacity-70 transition-opacity"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
            Brief
          </span>
          {intake ? (
            <span className="text-[11px] text-[#71757D]">
              Intake form · submitted {new Date(intake.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          ) : brief.primaryGoal ? (
            <span className="text-[12px] text-[#9CA3AF] truncate max-w-[600px]">
              {brief.primaryGoal}
            </span>
          ) : null}
        </button>
        <div className="flex items-center gap-3">
          {intake && (
            <Link
              href="/tools/onboarding-inbox"
              className="text-[11px] text-[#9CA3AF] hover:text-[#E5E5EA] inline-flex items-center gap-1"
              title="Open in inbox"
            >
              Inbox <ArrowTopRightOnSquareIcon className="size-3" />
            </Link>
          )}
          <button
            onClick={onToggle}
            className="text-[#71757D] hover:text-[#E5E5EA]"
            title={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </button>
        </div>
      </div>

      {open && intake && <IntakeBody intake={intake} />}
      {open && !intake && <BriefFallbackBody brief={brief} />}
    </section>
  );
}

function IntakeBody({ intake }: { intake: OnboardingSubmission }) {
  return (
    <div className="px-4 pb-4 pt-1 border-t border-[#2A2A2A] grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      <IntakeGroup title="PM checklist">
        {intake.pm_checklist ? (
          <ul className="space-y-1">
            {[
              ["shopify_access_requested", "Shopify access requested"],
              ["shopify_access_confirmed", "Shopify access confirmed"],
              ["info_verified", "Info verified"],
              ["brand_assets_received", "Brand assets received"],
              ["slack_channel_created", "Slack channel created"],
            ].map(([key, label]) => {
              const checked = (intake.pm_checklist as Record<string, boolean>)[key];
              return (
                <li key={key} className="text-[12px] flex items-center gap-2">
                  <span className={`inline-block size-3 rounded-full border ${checked ? "bg-[#1B5E20] border-[#1B5E20]" : "bg-[#181818] border-[#D4D4D8]"}`} />
                  <span className={checked ? "text-[#E5E5EA]" : "text-[#71757D]"}>{label}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12px] text-[#71757D]">No PM checklist captured.</p>
        )}
        {intake.pm_notes && (
          <p className="text-[12px] text-[#C7C9CD] mt-3 italic whitespace-pre-wrap">{intake.pm_notes}</p>
        )}
      </IntakeGroup>

      <IntakeGroup title="Access & Data">
        <IntakeField label="Shopify URL" value={intake.myshopify_url} />
        <IntakeField label="Analytics software" value={intake.analytics_software} />
        <IntakeField label="Tracking pixels" value={intake.tracking_pixels} />
        <IntakeField label="Other integrations" value={intake.other_integrations} />
        <IntakeField label="Existing landing pages" value={intake.existing_landing_pages} />
      </IntakeGroup>

      <IntakeGroup title="Brand & Business">
        <IntakeField label="Brief description" value={intake.brief_description} />
        <IntakeField label="Target customer" value={intake.target_customer} />
        <IntakeField label="Top competitors" value={intake.top_competitors} />
        <IntakeField label="Main products" value={intake.main_products} />
        <IntakeField label="Current metrics" value={intake.current_metrics} />
      </IntakeGroup>

      <IntakeGroup title="Creative & Messaging">
        <IntakeField label="Brand assets link" value={intake.brand_assets_link} link />
        <IntakeField label="Reviews / testimonials" value={intake.reviews_testimonials} />
        <IntakeField label="Tone of voice" value={intake.tone_of_voice} />
        <IntakeField label="Words to avoid" value={intake.words_to_avoid} />
        <IntakeField label="USPs" value={intake.usps} />
        <IntakeField label="Core value props" value={intake.core_value_props} />
      </IntakeGroup>

      <IntakeGroup title="Project specifics">
        <IntakeField label="Product URL" value={intake.product_url} />
        <IntakeField label="Page type" value={intake.page_type} />
        <IntakeField label="Traffic source" value={intake.traffic_source} />
        <IntakeField label="Amazon ASINs" value={intake.amazon_asins} />
        <IntakeField label="Meta page name" value={intake.meta_page_name} />
        <IntakeField label="Specific direction" value={intake.specific_direction} />
      </IntakeGroup>

      <IntakeGroup title="Success metrics">
        <IntakeField label="Primary goal" value={intake.primary_goal} />
        <IntakeField label="Success definition" value={intake.success_definition} />
        <IntakeField label="Timeline expectations" value={intake.timeline_expectations} />
      </IntakeGroup>

      <IntakeGroup title="Risk & Bottlenecks">
        <IntakeField label="Conversion challenges" value={intake.conversion_challenges} />
        <IntakeField label="Common objections" value={intake.common_objections} />
        <IntakeField label="Compliance restrictions" value={intake.compliance_restrictions} />
        <IntakeField label="Previous agencies" value={intake.previous_agencies} />
      </IntakeGroup>

      <IntakeGroup title="Workflow & Communication">
        <IntakeField label="Primary contact" value={intake.primary_contact} />
        <IntakeField label="Approval decision maker" value={intake.approval_decision_maker} />
        <IntakeField label="Timezone" value={intake.timezone} />
      </IntakeGroup>

      {(intake.uploaded_files?.length || 0) > 0 && (
        <IntakeGroup title="Uploaded files" wide>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {intake.uploaded_files?.map((f, i) => (
              <li key={i}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#181818] border border-[#2A2A2A] rounded text-[12px] text-[#C7C9CD] hover:border-white transition-colors"
                >
                  <DocumentArrowUpIcon className="size-3.5 text-[#71757D] shrink-0" />
                  <span className="truncate flex-1">{f.originalName}</span>
                  <ArrowTopRightOnSquareIcon className="size-3 text-[#71757D] shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </IntakeGroup>
      )}

      {intake.additional_info && (
        <IntakeGroup title="Additional info" wide>
          <p className="text-[12px] text-[#C7C9CD] whitespace-pre-wrap">{intake.additional_info}</p>
        </IntakeGroup>
      )}
    </div>
  );
}

function BriefFallbackBody({ brief }: { brief: EngagementBrief }) {
  return (
    <div className="px-4 pb-4 pt-1 border-t border-[#2A2A2A]">
      {(["core", "voice", "context"] as const).map((groupId) => {
        const groupFields = BRIEF_FIELDS.filter((f) => f.group === groupId);
        const groupLabel = groupId === "core" ? "Essentials" : groupId === "voice" ? "Voice + positioning" : "Context + risks";
        const populated = groupFields.filter((f) => brief[f.key]);
        if (populated.length === 0) return null;
        return (
          <div key={groupId} className="mt-4 first:mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-2">
              {groupLabel}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {populated.map((field) => {
                const value = brief[field.key];
                const isUrl = (field.key === "websiteUrl" || field.key === "shopifyUrl") && value;
                return (
                  <div key={field.key}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-0.5">
                      {field.label}
                    </p>
                    {isUrl ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#E5E5EA] hover:underline break-all">
                        {value}
                      </a>
                    ) : (
                      <p className="text-[12px] text-[#E5E5EA] whitespace-pre-line leading-snug">{value}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {!brief.primaryGoal && !brief.primaryContact && (
        <p className="text-[12px] text-[#71757D] italic mt-3">No brief captured. Link an onboarding submission to populate this panel.</p>
      )}
    </div>
  );
}

function IntakeGroup({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-2">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function IntakeField({
  label,
  value,
  link,
}: {
  label: string;
  value: string | undefined;
  link?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-medium text-[#71757D]">{label}</p>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-[#1976D2] hover:underline break-all"
        >
          {value}
        </a>
      ) : (
        <p className="text-[12px] text-[#C7C9CD] whitespace-pre-wrap break-words">{value}</p>
      )}
    </div>
  );
}
