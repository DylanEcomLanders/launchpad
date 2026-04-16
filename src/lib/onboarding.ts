/* ── Onboarding Submissions Data Layer ── */

import { createStore } from "@/lib/supabase-store";

export interface OnboardingSubmission {
  id: string;
  status: "pending" | "in-progress" | "approved" | "rejected" | "archived";
  created_at: string;
  updated_at: string;
  deleted_at?: string;

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
  product_url?: string;
  page_type?: string;
  traffic_source?: string;
  amazon_asins?: string;
  specific_direction?: string;
  meta_page_name?: string;

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

  // Success Metrics & Priorities
  primary_goal: string;
  success_definition: string;
  timeline_expectations: string;

  // Risk & Bottlenecks
  conversion_challenges: string;
  common_objections: string;
  compliance_restrictions: string;
  previous_agencies: string;

  // Workflow & Communication
  primary_contact: string;
  approval_decision_maker: string;
  timezone: string;

  // Final
  additional_info: string;
  uploaded_files?: { filename: string; url: string; originalName: string }[];

  // PM fields (filled internally)
  pm_notes?: string;
  pm_checklist?: {
    shopify_access_requested: boolean;
    shopify_access_confirmed: boolean;
    info_verified: boolean;
    brand_assets_received: boolean;
    slack_channel_created: boolean;
  };
  assigned_portal_id?: string;
  assigned_by?: string;
  assigned_at?: string;
}

export const onboardingStore = createStore<OnboardingSubmission>({
  table: "onboarding_submissions",
  lsKey: "launchpad-onboarding-submissions",
});
