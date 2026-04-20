/* ── Changelog & Roadmap data layer (Supabase + localStorage fallback) ── */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { createStore } from "@/lib/supabase-store";

export type ChangeType = "added" | "improved" | "fixed" | "removed";
export type RoadmapPriority = "next" | "planned" | "exploring";

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  id: string;
  date: string;
  version: string;
  title: string;
  changes: ChangeItem[];
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  priority: RoadmapPriority;
  addedBy?: string;
  addedAt: string;
}

// ── Storage keys ──

const CHANGELOG_KEY = "launchpad-changelog";
const ROADMAP_KEY = "launchpad-roadmap";

// ── Seed data ──

const seedChangelog: ChangelogEntry[] = [
  {
    id: "cl-36",
    date: "20 Apr 2026",
    version: "0.30.0",
    title: "Offer Engine + Team Handover + Branded Proposal",
    changes: [
      { type: "improved", text: "Team portal view (/portal/[token]/team) — Handover now renders per-gate with progress dots in the sidebar, matching the admin cockpit. Clicking a gate opens its checklist inline (not as a modal popup). Deep-linkable via ?project=<id>&gate=<key>" },
      { type: "improved", text: "Slack gate-notify — links now point to the team portal view with project + gate deep-link (e.g. /portal/.../team?project=X&gate=design_handoff), not the admin cockpit. Dev clicking the Slack link lands directly on the gate form" },
      { type: "added", text: "Offer Engine — paste call notes + fill offer inputs, Claude drafts a personalised Conversion Engine proposal and saves it to /proposal/[brand-slug]. Template modelled on the Yorkshire Dental Suite format (retainer + pilot). Numbers Claude can't verify stay as [needs input] so nothing invented slips through. Tool at /tools/offer-engine, linked from the Sales Process wiki entry. Requires offer_proposals Supabase table (SQL in supabase/offer_proposals.sql)" },
      { type: "added", text: "Sendable branded proposal page at /proposal/yorkshire-dental-suite — bespoke layout bypassing the [token] route, formal SOW format with numbered sections, two-tone headers, even stat boxes, Highest Return badge, signoff order (Ajay first, Dylan second), custom OG tags for Slack/social previews" },
      { type: "improved", text: "Proposal copy reformatted as formal SOW with numbered sections, all em dashes stripped for cleaner tone" },
      { type: "fixed", text: "Proposal header logo alignment — shrunk ECL mark to 20px and tightened text line-height so the logo and 'Ecomlanders × Yorkshire Dental Suite' lockup sit on the same centerline" },
      { type: "fixed", text: "Ajay's surname corrected (Daniel → Jani)" },
      { type: "added", text: "Payment Link — recurring subscriptions now supported with Conversion Engine preset. Whop errors surface with full detail for debugging" },
      { type: "added", text: "Generate LinkedIn from X — blue button on the LinkedIn caption block rewrites the X caption for LinkedIn in one click" },
      { type: "improved", text: "Clear Drafts — only removes drafts, keeps Ready to Post and Scheduled posts intact. Non-draft posts now require confirmation before deletion" },
      { type: "added", text: "CRO onboarding fields — product URL, page type, traffic source, ASINs, Meta page, strategic direction" },
      { type: "improved", text: "Quick Links — black floating pill with Report Issue shortcut. Old issue tracker removed" },
      { type: "improved", text: "Onboarding confirmation copy updated — brief received, Slack updates, access request flow" },
      { type: "added", text: "Onboarding badge — red count circle in sidebar, polls every 5 minutes so you can see pending briefs at a glance" },
    ],
  },
  {
    id: "cl-35",
    date: "15 Apr 2026",
    version: "0.29.0",
    title: "Project Flows — Assembly Lines + Onboarding Inbox",
    changes: [
      { type: "added", text: "Project Flows (Layer 1) added to Operations Wiki — four assembly-line flows: Design Only, Design & Dev, D&D+CRO, Conversion Partnership. Each is a linear runbook with hard gates" },
      { type: "added", text: "Onboarding Inbox — global intake and triage process that sits above all flows. Every project starts here before entering a flow" },
      { type: "added", text: "Three gates enforced across all flows: Design→Dev Handoff, Dev Self-QA, Launch Prep. Each references the specific SOP from Layer 2" },
      { type: "added", text: "Conversion Partnership flow — sprint-based loop with roadmap layer, monthly cadence, partnership health indicators" },
      { type: "improved", text: "Wiki sidebar now shows PROJECT FLOWS section above all existing categories with dark label styling" },
    ],
  },
  {
    id: "cl-34",
    date: "14 Apr 2026",
    version: "0.28.0",
    title: "Retainer Wiki Overhaul — Conversion Partnership Model",
    changes: [
      { type: "improved", text: "Full retainer wiki rewrite — all 9 sections rebuilt around the new Conversion Partnership model (£8K+/mo, team-led roadmap, two-stage audit close)" },
      { type: "improved", text: "Sales Process — two-stage audit approach with proof vs evidence framework. Initial audit (warm-up) → Deep dive (close)" },
      { type: "improved", text: "Delivery Framework — full scope of work including AOV optimisation, post-purchase flows, 60-90 day visual roadmap on Miro" },
      { type: "improved", text: "Revenue Projector — partnership economics at scale (5 retainers = £540K/yr), ad spend multiplier, team economics breakdown" },
      { type: "improved", text: "Positioning — conversion layer concept (ad agency + email agency + conversion agency), premium pricing language, dropshipper-to-brand bridge angle" },
      { type: "improved", text: "FAQ — expanded with premium pricing objection handling, internal playbook for scope creep and churn prevention" },
    ],
  },
  {
    id: "cl-33",
    date: "14 Apr 2026",
    version: "0.27.0",
    title: "Sidebar Cleanup + Floating Notes",
    changes: [
      { type: "improved", text: "Sidebar restructured — main nav grouped under 'Delivery' section header. Cleaner hierarchy" },
      { type: "added", text: "Floating Notes — notes moved from sidebar to a persistent floating icon (top-right). Accessible from any page with Cmd+Shift+N shortcut. Shows action item count badge" },
      { type: "improved", text: "Training section cleaned up — removed Design System, Playbooks, QA Checklist, Dev Self-Check. Kept Ops Wiki, Retainer Wiki (single link), Design Library, Feedback" },
      { type: "improved", text: "CRO Lab section now shows WIP badge to indicate work-in-progress status" },
      { type: "improved", text: "Finance section defaults to collapsed to reduce sidebar noise" },
      { type: "improved", text: "Retainer Wiki is now a single nav link instead of a dropdown — the wiki itself has internal navigation" },
    ],
  },
  {
    id: "cl-32",
    date: "14 Apr 2026",
    version: "0.26.0",
    title: "Operations Wiki + Login Redesign",
    changes: [
      { type: "added", text: "Operations Wiki — searchable wiki with 16 SOPs across Design, Development, CRO, Operations, QA, and Client categories. Same architecture as Retainer Wiki: sidebar nav, full-text search, markdown content, tool links" },
      { type: "added", text: "Design Library link in sidebar — opens Figma design library in new tab. Sidebar now supports external links with icon indicator" },
      { type: "improved", text: "Login screen redesign — full-bleed cinematic landscape background with frosted glass card, ECL logo, smooth transitions" },
      { type: "improved", text: "PDF upload support for bulk caption import — client-side PDF text extraction via pdfjs-dist CDN" },
    ],
  },
  {
    id: "cl-31",
    date: "12 Apr 2026",
    version: "0.25.1",
    title: "Calendar Ready-to-Post Flow",
    changes: [
      { type: "improved", text: "New Ready to Post workflow — bulk import creates grey Draft posts, add media and mark Ready to Post (blue), then schedule only blue posts to Typefully. Scheduled posts show at 50% opacity (green)" },
      { type: "improved", text: "Studio now has explicit Ready to Post toggle button — posts stay as drafts until you mark them ready. Save Draft keeps current status, Ready to Post turns post blue" },
      { type: "improved", text: "Schedule button shows count of Ready to Post posts and only picks up blue posts. Drafts and already-scheduled posts are excluded from scheduling" },
      { type: "improved", text: "Scheduled post cards render at 50% opacity in both month and week calendar views for clear visual hierarchy: Grey (draft) → Blue (ready) → Green 50% (scheduled)" },
    ],
  },
  {
    id: "cl-30",
    date: "10 Apr 2026",
    version: "0.25.0",
    title: "Deck Builder",
    changes: [
      { type: "added", text: "Deck Builder — generate branded HTML discovery decks with unique shareable URLs. Input brand name, traffic, CVR, AOV, conversion matrix scores, priorities, and pricing. Outputs a dark-themed 8-slide presentation: Cover, Problem, Funnel Analysis, Revenue Gap, 90-Day Roadmap, How We Work, The Offer, Next Steps" },
      { type: "added", text: "Public deck viewer at /deck/[id] — clients see an animated slide deck with score bars, revenue gap calculations, two-tier pricing, and navigation dots. No login required" },
      { type: "added", text: "Bulk caption import — upload a .txt file of posts (separated by ---) and Launchpad auto-populates the calendar. 3 posts per day at optimal times, X caption pre-filled, both platforms targeted. Open each to add media and generate LinkedIn version" },
      { type: "improved", text: "Bulk upload modal now has two modes: Import Captions (text file) and Upload Images. Default set to 3 posts per day for the Grok workflow" },
    ],
  },
  {
    id: "cl-29",
    date: "7 Apr 2026",
    version: "0.24.0",
    title: "Typefully Sync",
    changes: [
      { type: "added", text: "Typefully Sync button on the calendar — reconciles local state with Typefully. Clears stale draft references, flips orphaned scheduled posts back to Saved, and imports drafts/scheduled posts that exist in Typefully but not in Launchpad" },
      { type: "added", text: "Per-platform Typefully draft IDs stored on each post — scheduling now skips any platform that already has a live draft so you can't double-schedule X or LinkedIn for the same post" },
      { type: "removed", text: "Voice Profile UI panel on the calendar — the backend ignores it now that TOV v3 is hardcoded as the single source of truth. Removed the gear button and slide-in panel to stop the confusion" },
      { type: "added", text: "Leads database under Pipeline — minimal table (Name, Brand, URL, Rev Estimate, Status). Inline editing, status filter tabs (New / Reached Out / Responded), click-to-edit rows" },
      { type: "added", text: "Scout — native lead discovery agent. Pick a niche, hit Run, and it web-searches for DTC brands in the £80-120K/mo range, researches funnels, finds decision-makers, and saves qualified leads directly to Leads. Live progress feed, Slack reporting, duplicate detection. Same quality as the Claude Agent version at a fraction of the cost" },
      { type: "added", text: "Retainer Wiki — command centre for the retainer offer. Docs + toolkit in one place: offer tiers, 2-call sales process, onboarding framework, delivery cadence, conversion matrix, revenue projector, slide deck generator, positioning guide. Sidebar nav with Process / Toolkit / Reference sections, full-text search, and tool links" },
    ],
  },
  {
    id: "cl-28",
    date: "6 Apr 2026",
    version: "0.23.0",
    title: "Lead Funnel System",
    changes: [
      { type: "added", text: "Sales dashboard analytics — funnel performance (views, submissions, CVR), lead source breakdown with bar charts, pipeline health visualisation" },
      { type: "added", text: "Funnel event tracking — page views and form submissions tracked per funnel with source attribution" },
      { type: "added", text: "Pipeline source badges — kanban cards now show funnel and source tags so you can see where each lead came from" },
      { type: "improved", text: "Dashboard empty states — helpful messages with action links when no data exists yet instead of blank sections" },
      { type: "improved", text: "Recent leads on dashboard now show funnel and source badges inline" },
      { type: "added", text: "Lead Magnets hub — view all lead magnet pages with pre-generated tracked links per team member and platform (X, LinkedIn, TikTok, Email). Copy any link with one click and see per-link view/lead stats" },
      { type: "improved", text: "Sidebar restructured — Funnels (Calendar, Funnel Planner, Lead Magnets), Content (Articles, Portfolio), Pipeline, Revenue, Resources" },
      { type: "improved", text: "Audit landing page — footer now overlays bottom of portfolio strip with gradient fade for cleaner visual transition" },
      { type: "added", text: "Audit Portfolio manager — upload, reorder, and delete portfolio images from Launchpad settings. Images stored in Supabase Storage" },
      { type: "improved", text: "Portfolio v2 sync simplified — paste a Figma frame link (right-click → Copy link to selection) for desktop and mobile. No more separate file URL or frame names; file key + node ID extracted automatically" },
      { type: "improved", text: "Caption generation voice — baked the social-copywriter skill into the system prompt: write forwards not backwards, no emojis, no hashtags, no analogies, varied openings, earned takeaways" },
      { type: "improved", text: "Article generation voice — same social-copywriter principles applied to long-form Twitter/X articles" },
      { type: "fixed", text: "Audit page portfolio strip loaded in ~15s — now server-rendered with Supabase image transforms (320×944 @ q70) plus eager/lazy loading hints. Should be near-instant" },
      { type: "fixed", text: "Calendar Schedule to Typefully — posts ticked for both X and LinkedIn now actually schedule to both. Legacy posts without an explicit platforms array were falling back to X-only" },
      { type: "improved", text: "Post studio simplified — every post defaults to both X and LinkedIn (always repurposed). Removed the Post-To selector and Type selector. Just Format and Length now" },
      { type: "added", text: "Calendar Reset button — if you delete a draft in Typefully and want to reschedule from Launchpad, open the post and hit Reset to flip it back to draft status" },
      { type: "fixed", text: "Legacy posts scheduling to X only — existing posts are now auto-backfilled on load so every post targets both X and LinkedIn by default" },
      { type: "fixed", text: "Caption variants rendering as a blob — the preview now uses whitespace-pre-wrap so line breaks actually show up instead of collapsing into one paragraph" },
      { type: "improved", text: "Caption variants now forced to be structurally different — Sharp Opinion, Observation, Tactical Breakdown (or similar) instead of 3 rewordings of the same post. Image context is used as a hook, not literally described. Temperature bumped so variants genuinely diverge" },
      { type: "improved", text: "Stopped the caption model recycling Dylan's signature phrases (shite, whack, proper, cheat code, i'll wait) on every post. Reference examples now explicitly marked as rhythm-only, with hard rules against reusing their vocabulary" },
      { type: "improved", text: "Captions now pull from the idea/angle you type, not the image. The image is attached to the Typefully post but no longer sent to the caption model, so it stops drifting off-topic and describing what it sees" },
      { type: "improved", text: "Removed the duplicate platform switcher above the caption variants — only the top tab bar controls X vs LinkedIn now" },
      { type: "improved", text: "Voice Profile is now a single uploaded document — drop in a markdown or text file (or paste it) and the whole thing becomes the voice context for every caption. No more tone/avoid/rules/examples fields" },
      { type: "fixed", text: "Voice Profile doc was being ignored — captions felt the same regardless of upload because the hardcoded base prompt (Dylan's example tweets, banned phrases) was always prepended. Now the uploaded doc fully replaces the base prompt and is the single source of truth for tone and structure" },
      { type: "fixed", text: "Generating LinkedIn captions no longer wipes the X caption you've already written — Generate now only fetches variants for the active platform tab and leaves the other one untouched" },
      { type: "improved", text: "Caption model now sees the uploaded image again as supporting visual context (not the source of truth) — image informs the post, the idea/brief still drives it" },
      { type: "improved", text: "Studio shows X and LinkedIn captions stacked side-by-side instead of platform tabs. One Generate fills both from the same idea + image. Each caption has its own Regenerate button. Content creation in one screen, no tab switching" },
      { type: "added", text: "Multi-image posts — upload up to 4 images per post (Typefully cap). Drag in multiple at once, remove individually, all uploaded to Typefully on schedule" },
      { type: "fixed", text: "Typefully scheduler creating 3-4 duplicate drafts per post — the retry-on-failure loop was firing again even when the original request had actually succeeded. Removed retries; now one attempt per draft" },
      { type: "added", text: "Bulk upload — drop up to 50 images and the calendar auto-creates one draft post per image, spread across days with content types rotated so you don't cluster the same kind back-to-back. Pick start date, posts per day (1-3), skip weekends. Captions stay empty so you can fill them in after. Massively faster content creation" },
      { type: "added", text: "New 'Saved' post status (blue) — sits between Draft and Scheduled. Saving a post with a caption now marks it Saved (ready to schedule) instead of Draft, so it's protected from cleanup and won't be wiped by bulk upload, draft refresh, or any other operation that touches drafts" },
      { type: "fixed", text: "Typefully scheduling now only marks posts as Scheduled if EVERY targeted platform draft succeeded. Partial failures stay Saved so you can retry without double-scheduling the platforms that already worked. Plus a hard guard against double-firing the schedule button" },
      { type: "fixed", text: "Bulk upload now respects existing posts on each date — won't overwrite or stack onto saved/scheduled slots. Skips past full days automatically" },
      { type: "improved", text: "Caption + article voice rewritten to Dylan TOV v3 — tighter register ('someone explaining something at a desk, not presenting on a stage'), stronger 'write forwards not backwards' rule, Baymard/Shopify as the only allowed cited sources, and a 10-point self-check before every output. Same prompt across captions and articles so voice stays consistent" },
      { type: "removed", text: "Uploaded voice profile no longer overrides the base TOV. TOV v3 is now hardcoded as the single source of truth for captions — edit the prompt file directly to change voice" },
    ],
  },
  {
    id: "cl-27",
    date: "6 Apr 2026",
    version: "0.22.0",
    title: "Content Studio Redesign",
    changes: [
      { type: "improved", text: "Redesigned post studio — single unified editor replaces 5-step wizard. Platforms, idea, format, captions, image, and schedule all on one page" },
      { type: "added", text: "Caption length control — choose Short, Medium, or Long before generating. Long captions now produce real thought-leadership posts with frameworks and examples" },
      { type: "added", text: "Multi-platform posts — tick X and LinkedIn on the same post, get tailored captions for each, schedule both in one click" },
      { type: "improved", text: "Caption generation quality — improved AI prompt with deeper instructions for each length level and platform-specific guidance" },
      { type: "fixed", text: "Typefully timezone — posts now schedule at the correct local time instead of 1 hour late (BST/UTC conversion fix)" },
      { type: "improved", text: "Simplified status — only Draft and Scheduled. Sending to Typefully auto-sets to Scheduled" },
      { type: "removed", text: "Removed Instagram and TikTok from content calendar — focused on X and LinkedIn for now" },
      { type: "added", text: "Voice profile system — per-creator tone, avoid list, writing rules, example posts, and voice notes that feed directly into caption generation" },
      { type: "added", text: "Self-improving captions — when you edit a generated caption before saving, the before/after is tracked and fed into future generations so the AI learns your style" },
      { type: "fixed", text: "Calendar grid now fills the full viewport height — no more grey dead space below the week/month grid" },
      { type: "fixed", text: "Typefully now sends correct per-platform captions instead of duplicating one caption to both X and LinkedIn" },
      { type: "fixed", text: "Images now upload to Typefully correctly — pasted screenshots auto-set format to image, and upload runs regardless of post format" },
      { type: "fixed", text: "Typefully now creates separate drafts per platform — guarantees X and LinkedIn each get their own caption and image instead of one shared draft" },
      { type: "fixed", text: "Typefully image uploads now work — correct API field names, server-side S3 upload, and media processing wait before attaching to drafts" },
      { type: "added", text: "Audit lead magnet landing page at /audit — public page with form that auto-creates pipeline entries with source attribution" },
      { type: "added", text: "UTM/ref tracking on lead magnet pages — ?ref=x-dylan-bio tags the lead source automatically" },
      { type: "improved", text: "Agency Funnels renamed to Funnels in sidebar" },
    ],
  },
  {
    id: "cl-26",
    date: "6 Apr 2026",
    version: "0.21.1",
    title: "Screenshot Paste & Scheduling Accuracy",
    changes: [
      { type: "added", text: "Paste screenshots directly into post drafts — Cmd+V anywhere in the studio panel drops the image in and auto-generates captions" },
      { type: "improved", text: "Post scheduling now uses natural minute values (e.g. 08:23, 12:36, 17:08) based on analytics instead of rounding to the hour" },
      { type: "added", text: "Auto-adapt captions across platforms — write for X, click the LinkedIn tab and it auto-generates a LinkedIn version. Cached per tab so edits are preserved when switching" },
      { type: "fixed", text: "Typefully scheduling now uploads images and sends them with the draft — previously only the caption text was sent" },
      { type: "fixed", text: "Calendar timezone bug — dates were off by one day in BST/non-UTC timezones due to toISOString() conversion" },
    ],
  },
  {
    id: "cl-25",
    date: "5 Apr 2026",
    version: "0.21.0",
    title: "Slack Notification Engine & Payment Automation",
    changes: [
      { type: "added", text: "Payment webhook now creates a draft portal and posts an approval message to #ops with 'Approve & Send to Client' button — no more manual channel creation on payment" },
      { type: "added", text: "Portal approval loop — PM reviews draft portal in Launchpad, clicks approve in Slack, bot posts portal link to client's external channel" },
      { type: "improved", text: "QA gate notifications now include a 'View in Portal' link pointing to the specific client portal" },
      { type: "added", text: "Deadline warning cron — daily check posts to internal Slack channels when a phase is due in 2 days or overdue" },
      { type: "added", text: "Monday Breakdown — weekly #ops digest with deadlines, blockers, retainer mission statement status, and active project counts" },
      { type: "added", text: "Friday Digest — end-of-week #ops summary with completed phases, in-progress work, blockers, overdue items, and retainer report upload status" },
      { type: "added", text: "Notification settings panel in Business Settings — toggle each Slack notification on/off with a clean switch UI" },
      { type: "improved", text: "All automated Slack messages now use the Ecomlanders bot token instead of personal account — branded, consistent identity" },
      { type: "improved", text: "Sales Engine dashboard redesigned — pipeline overview, active clients, content this week, follow-up tracker, and quick actions replace old social analytics view" },
    ],
  },
  {
    id: "cl-24",
    date: "5 Apr 2026",
    version: "0.20.0",
    title: "Portal Process Wiring — Phases, Handoff & Task Sync",
    changes: [
      { type: "improved", text: "Phase movement now properly gated — only one phase in-progress at a time, must complete previous before advancing, completing a phase auto-starts the next" },
      { type: "improved", text: "Phase dots show disabled state with tooltip when transition is blocked (e.g. 'Complete the previous phase first')" },
      { type: "improved", text: "Design & Dev Handoff completely redesigned — clean version timeline with Figma + Staging links (no iframes), inline status toggles, version notes, and feedback history per version" },
      { type: "added", text: "Typed scope items (deliverables) auto-populate to the task board — design items go to Design Tasks, everything else to Dev Tasks" },
      { type: "added", text: "Task board tasks now link back to portal via portalId and deliverableId fields" },
      { type: "improved", text: "Client Details panel restyled — consistent input fields, clean tag chips with remove buttons, proper focus states, and unified spacing across Designers, Developers, Slack channels, and Touchpoint fields" },
      { type: "added", text: "Content Calendar PIN gate — personal PINs for Dylan and Ajay, auto-sets creator on unlock, numpad UI with shake animation on wrong code, lock button to switch users" },
      { type: "added", text: "Typefully integration — 'Schedule to Typefully' button on the calendar toolbar pushes the entire week's posts to Typefully in one click, with batch scheduling, auto-status update, and success toast" },
      { type: "improved", text: "Context cleaner moved to client-level 'Context' tab (between Projects and Settings) — paste transcripts from any call, clean with AI, choose which project to save to or keep as general client context, all entries aggregated in one view" },
      { type: "improved", text: "Portal team view restructured — merged Timeline + Deliverables into 'Scope & Timeline', merged Designs + Development into 'Build' with version history for both, renamed Internal to 'Handover' showing all 3 QA gates vertically without role picker" },
      { type: "added", text: "Team members can upload new design versions (with Figma URL) and development versions (with Staging URL) directly from the Build tab — auto-creates or appends to existing reviews" },
      { type: "improved", text: "QA gate labels simplified — 'CRO Design', 'Design Handoff', 'Dev to Senior Dev QA'; all gates always accessible without prerequisite locks" },
    ],
  },
  {
    id: "cl-23",
    date: "5 Apr 2026",
    version: "0.19.2",
    title: "Weekly Draft Volume & Day-Grouped Review",
    changes: [
      { type: "improved", text: "Weekly Draft now generates 3-4 posts per day (21-28 total) evenly spread across all 7 days, with content types matched to their best-performing days and times" },
      { type: "improved", text: "Weekly Draft review drawer groups posts by day with headers, post counts, and per-day select/deselect toggles for faster review" },
      { type: "added", text: "Drag and drop posts between days on both month and week views — grab any card and drop it onto a different day" },
      { type: "added", text: "Delete posts directly from calendar cards — hover to reveal X button, no need to open the post first" },
      { type: "added", text: "Clear All button in header to wipe all posts at once (with confirmation)" },
      { type: "improved", text: "Redesigned post edit panel — platform tabs always at top, clean caption area, inline settings rows (Format / Type / Schedule / Status) with consistent styling and dividers" },
      { type: "added", text: "Suggested posting times — when editing a post, analytics-based time suggestions appear below the schedule picker showing best times for that platform + day, click to apply" },
      { type: "fixed", text: "Clicking calendar post cards now reliably opens the edit view instead of sometimes triggering the new post wizard" },
      { type: "improved", text: "Idea-first content flow — posts show the angle/idea at the top, hit Generate Caption to create variants from it, pick one, then edit. No caption shown until you generate one" },
      { type: "improved", text: "Weekly Draft now generates at least 3 article posts per week for authority building" },
      { type: "added", text: "Ajay/Dylan creator toggle — prominent switcher with avatar initials in the header, filters the entire calendar by person" },
      { type: "fixed", text: "Posts without a creator field (from previous sessions) now auto-migrate to Ajay on load, preventing ghost posts appearing on reload" },
      { type: "fixed", text: "Weekly Draft now replaces existing drafts for that week instead of stacking — no more 500 accumulated draft posts on reload" },
      { type: "fixed", text: "Weekly Draft hard-capped to exactly 3 posts per day (21 total) — server-side enforcement so AI can never exceed the limit" },
      { type: "fixed", text: "saveAll store layer now deletes removed rows from Supabase — previously only upserted, causing deleted posts to reappear on reload" },
      { type: "fixed", text: "Load-time cleanup caps drafts to 3 per day per creator and permanently removes excess from Supabase" },
      { type: "fixed", text: "Changelog now always reflects latest code entries — seed data in code overrides stale Supabase entries so version stays current" },
      { type: "improved", text: "Premium page transitions — staggered fade-in-up animations on page load across dashboard, calendar, and sales engine with backdrop fades on slide-in panels" },
    ],
  },
  {
    id: "cl-22",
    date: "4 Apr 2026",
    version: "0.19.1",
    title: "Unified Sidebar Navigation",
    changes: [
      { type: "improved", text: "Portal list page — left sidebar navigation replaces horizontal tabs (Overview, Retainers, Testing, Tickets, Delivery, Clients), with Trash + New Portal buttons in sidebar footer" },
      { type: "improved", text: "Admin client detail page — left sidebar with Projects, Tickets, Funnels, Settings tabs; action buttons (Flag, Client, Team, Preview, Save) moved to sidebar footer" },
      { type: "improved", text: "Client portal — sidebar nav now persists when drilled into a project (Back + project name + nav links) instead of horizontal top tabs" },
      { type: "improved", text: "Consistent left sidebar navigation pattern across all portal views — portal list, client detail, drilled-in project, and client-facing portal" },
      { type: "improved", text: "Portal list sidebar cleaned up — tabs now: Overview, Client Portals, Retainer Portals, Testing Lab, Tickets. Removed Delivery tab. New Portal button moved to top of sidebar" },
      { type: "improved", text: "Action buttons (Flag, Client, Team, Preview, Save) moved to top header bar with divider — Flag red, Client/Team/Preview black, Save green" },
      { type: "improved", text: "Client Settings (team, Slack, designers, devs) removed from project drilled-in sidebar — lives only at client level under Settings tab" },
      { type: "added", text: "Content Calendar — weekly grid (6am-8pm time slots x 7 days) and month overview for planning social content across LinkedIn, Instagram, and X" },
      { type: "added", text: "Caption Studio — slide-in panel with platform/type selectors, date/time picker, AI caption generation (3 variants via Claude), slot scoring, and status workflow" },
      { type: "added", text: "Idea Engine — AI-powered content idea generator that considers current content mix, posting gaps, and platform neglect to suggest 5 actionable ideas" },
      { type: "added", text: "Content analytics layer — optimal slot indicators (green dots), gap detection (3+ day warnings), platform neglect alerts, content mix bar with promotional threshold warning" },
      { type: "added", text: "Pipeline sidebar — toggle to view all posts grouped by status (Idea → Scripted → Media Ready → Approved → Exported)" },
      { type: "added", text: "Insights bar — 4 metric cards: Posts this week, Best performing day, Top content type, Gap alert" },
      { type: "improved", text: "Content Calendar redesigned — clean Untitled UI-inspired month view as default with event cards inside day cells, header bar with date badge, Today button, Month/Week toggle, and Add post button" },
      { type: "added", text: "Post format selector — Text, Image, Article, Video post types with format icons on calendar event cards" },
      { type: "added", text: "Image upload in Caption Studio — drag-and-drop or click to upload, image preview with replace/remove, AI captions generated based on the uploaded image via Claude vision" },
      { type: "added", text: "Weekly Draft generator — AI analyses past performance (top content types, platforms, days, engagement scores) and generates 7-10 optimised draft posts for the current week, placed at optimal time slots with full captions ready to edit" },
      { type: "added", text: "Content repurposing — write once on X, hit Repurpose to auto-generate LinkedIn (longer, professional), Instagram (image caption), and TikTok (video hook/script) variants linked together as a content group" },
      { type: "added", text: "Platform tabs in Caption Studio — linked posts show tabs to switch between platform variants, each with independent status tracking" },
      { type: "added", text: "TikTok added as a platform — video-first format with hook-style caption generation" },
      { type: "improved", text: "Calendar event cards show link icon for repurposed content groups" },
      { type: "improved", text: "Image upload auto-generates captions — drop an image and AI writes captions based on it immediately, no extra button click" },
      { type: "improved", text: "All new posts default to X (Twitter) first — write the sharpest take, then repurpose outward" },
      { type: "improved", text: "Weekly Draft now generates ideas/angles at optimal slots, not full captions — click through each to write content and repurpose" },
      { type: "improved", text: "Caption Studio is now a step-by-step flow — Format → Content Type → Media → Caption → Schedule — one choice at a time, no option overload" },
      { type: "improved", text: "Calendar cards colour-coded by status — grey for ideas/drafts, blue for scripted, purple for media ready, green for approved/exported" },
    ],
  },
  {
    id: "cl-21",
    date: "3 Apr 2026",
    version: "0.19.0",
    title: "QA Gates, Deadline Buffer & Sales Context Cleaning",
    changes: [
      { type: "improved", text: "QA gates now open as full popup forms instead of inline checklists — cleaner submit flow for designers and devs" },
      { type: "added", text: "Three-column gate status overview — CRO Brief, Design Handoff, Dev QA shown at a glance on each project card (green = submitted)" },
      { type: "added", text: "Slack notification on gate submit — posts to internal Slack channel notifying the next person to pick up work" },
      { type: "added", text: "Dual Slack channels per portal — separate Internal (team) and External (client) channel IDs in client details panel" },
      { type: "added", text: "Gate status pills on project list cards — quick visual indicator of handoff progress without opening a project" },
      { type: "added", text: "Deadline Buffer setting — adds configurable extra business days to all client-facing deadlines (default 3 days, under-promise/over-deliver)" },
      { type: "improved", text: "Context cleaning AI now strips all pricing/costs and focuses on actionable deliverables with a Key Deliverables summary section" },
      { type: "improved", text: "Design handoff is now a proper form — Figma link, Loom walkthrough (required), extra assets, font files, plus confirmation checkboxes" },
      { type: "improved", text: "Portal admin layout — sidebar nav when drilled into a project with compact team/Slack/touchpoint details, content area no longer pushed down" },
      { type: "improved", text: "Portal tabs simplified from 8 to 3 — Overview (QA gates + phases + context), Build (Updates + Designs + Dev), Results (Testing + Funnels + Reports)" },
      { type: "improved", text: "Header action bar — Save (green), Client link, Team link, Preview, Flag Blocked all as consistent black/green buttons at top" },
      { type: "improved", text: "Overview redesign — touchpoint card (dark, editable), status card side-by-side, timeline-style phases with dot indicators, cleaner scope list" },
      { type: "improved", text: "Sidebar renamed from 'Team' to 'Client Settings' — team, Slack channels, touchpoint info grouped as client config" },
      { type: "added", text: "Blocker system with timeline shift — flag blocker (modal with type/reason), auto-snapshot phase dates, resolve with adjustable business-day shift, full timeline preview before confirming" },
      { type: "added", text: "Blocker history — resolved blockers logged with days lost, original vs adjusted dates shown on timeline, '+Xd adjusted' badge on timeline header" },
      { type: "improved", text: "Client portal shows diplomatic 'Timeline adjusted' notice when dates shift — no blame language, just 'dates updated to reflect latest schedule'" },
      { type: "improved", text: "Admin portal restyled to match client portal — unified border colours (#E8E8E8), removed shadows, section headers no longer uppercase, consistent card rounding and hover states" },
      { type: "improved", text: "Client portal — sidebar nav now persists when drilled into a project (Back + project name + nav links), matching admin portal style for cohesive navigation" },
    ],
  },
  {
    id: "cl-20",
    date: "31 Mar 2026",
    version: "0.18.0",
    title: "Funnel Builder — Execution System Upgrade",
    changes: [
      { type: "added", text: "Lead Magnet node type — format (PDF/video/tool/quiz), opt-in CVR, content slots" },
      { type: "added", text: "Email Sequence node type — email count, open rate, click rate metrics" },
      { type: "added", text: "Funnel stage tagging (TOFU/MOFU/BOFU) on every node type with visual badges" },
      { type: "added", text: "Content slots per page/lead magnet node — 5-item checklist (headline, hook, offer, CTA, social proof) with completion badge" },
      { type: "added", text: "Funnel health score (0-100) — weighted from live status (40%), CVR vs benchmarks (40%), content completion (20%)" },
      { type: "added", text: "Cold Traffic Lead Gen template — paid ad → VSL → lead magnet → email sequence → discovery call" },
      { type: "added", text: "Warm Retargeting template — retargeting ad → case study → offer → application" },
      { type: "added", text: "Content Engine template — organic → blog → lead magnet → email sequence → offer" },
      { type: "improved", text: "Node palette now has Lead Gen section with Lead Magnet and Email Sequence drag items" },
      { type: "improved", text: "Node editor includes stage selector, content checklist, and lead magnet/email sequence specific fields" },
    ],
  },
  {
    id: "cl-19",
    date: "30 Mar 2026",
    version: "0.17.0",
    title: "Weekly Report Upload & Branded Client Display",
    changes: [
      { type: "added", text: "Report upload tool — upload .docx files, auto-extract content, preview with EcomLanders branding before publishing" },
      { type: "added", text: "Reports tab in admin portal — manage, preview, publish/unpublish, and delete reports per client" },
      { type: "added", text: "Reports tab in client portal — timeline of published reports with branded read view" },
      { type: "added", text: "Branded report renderer — shared component with EcomLanders header, typography, and footer" },
      { type: "added", text: "Client-side .docx extraction via mammoth.js (dynamic import, no client bundle impact)" },
    ],
  },
  {
    id: "cl-18",
    date: "23 Mar 2026",
    version: "0.16.1",
    title: "Funnel Playbook — CRO Knowledge Base",
    changes: [
      { type: "added", text: "Funnel Playbook — complete 10-layer DTC sales funnel knowledge base under CRO Lab" },
      { type: "added", text: "14 deep-dive modules covering traffic, ad creative, landing pages, PDP, cart, checkout, post-purchase, retention, offers, and analytics" },
      { type: "added", text: "Audit Mode — filters any module to show only audit questions for rapid client store reviews" },
      { type: "added", text: "Test Ideas Mode — filters to show ICE-scored A/B test hypotheses per funnel layer" },
      { type: "added", text: "In-module search with real-time results" },
      { type: "added", text: "Master Audit Checklist (130+ scored questions), Test Hypothesis Bank (90+ ideas), and CRO Glossary as reference docs" },
    ],
  },
  {
    id: "cl-17",
    date: "22 Mar 2026",
    version: "0.16.0",
    title: "Social Analytics, Pipeline Kanban & Sales Engine Restructure",
    changes: [
      { type: "added", text: "Social Analytics dashboard — 90-day tweet data with weekly performance charts (views/engagement/likes/posts)" },
      { type: "added", text: "AI Content Intelligence — analyses tweets to identify top themes, hook patterns, content gaps, and post ideas" },
      { type: "added", text: "X/Twitter direct API integration — profile stats, tweet metrics, Supabase caching (6hr TTL)" },
      { type: "added", text: "Top Hooks ranking — best performing opening lines by engagement rate" },
      { type: "added", text: "Best posting days + hours analysis with visual bar chart" },
      { type: "added", text: "Kanban Pipeline — drag leads across stages (New → Audit Sent → Engaged → Call Booked → Proposal → Won/Lost)" },
      { type: "added", text: "Audit-to-pipeline connection — Run Audit button on leads, auto-link audit to lead" },
      { type: "added", text: "CRO audit speed benchmarks — each metric shows goal with pass/warn/fail color coding" },
      { type: "added", text: "Editable audit detail page — inline editing for all fields (summary, scorecard, issues, priorities)" },
      { type: "improved", text: "Sales Engine restructured: Social Analytics hero nav, Content/Pipeline/Revenue sections" },
      { type: "improved", text: "Pipeline stages updated: New Lead → Audit Sent → Engaged → Call Booked → Proposal Sent → Won/Lost" },
      { type: "improved", text: "Launchpad sidebar: Project Kickoff hero CTA, Portals + Tickets as main nav links" },
      { type: "improved", text: "Mobile layout fixes across both dashboards — responsive headers, scrollable tables" },
      { type: "improved", text: "Speed data separated from CRO issues in audits — own dedicated section" },
      { type: "fixed", text: "Audit page type detection — no more 'this is a PDP not a homepage' false flags" },
      { type: "fixed", text: "Sales Engine 404s — all tools properly mapped to /sales-engine/ routes" },
    ],
  },
  {
    id: "cl-16",
    date: "22 Mar 2026",
    version: "0.15.0",
    title: "CRO Audit Engine & Client Portal Polish",
    changes: [
      { type: "added", text: "CRO Audit Engine: enter a URL → Firecrawl scrapes → Claude generates comprehensive audit" },
      { type: "added", text: "Interactive audit reports: public branded URLs at /audit/[token] with scorecard, issues, priority order" },
      { type: "added", text: "WhatsApp + Book a Call CTAs on public audit pages" },
      { type: "added", text: "Audit knowledge base: editable CRO framework in Settings, fed into every audit" },
      { type: "added", text: "Audit dashboard in Sales Engine: generate, review, publish, track views" },
      { type: "added", text: "Full-page screenshots via Firecrawl for audit analysis" },
      { type: "improved", text: "Client portal: bordered project cards with View CTA button" },
      { type: "improved", text: "Client portal: tabs replace sidebar when drilled into a project" },
      { type: "improved", text: "Admin portal: inline editable client details (designers, developers, Slack, touchpoint)" },
      { type: "improved", text: "Auto-calculated touchpoints from configurable days (Mon/Wed/Fri default)" },
      { type: "improved", text: "Admin portal overview: ticket panels, minimal client list, touchpoints grid" },
      { type: "improved", text: "Ticket save reliability: direct Supabase upsert" },
      { type: "fixed", text: "Ticket type persisting to Supabase on triage" },
      { type: "fixed", text: "Team member ID orphan cleanup" },
    ],
  },
  {
    id: "cl-15",
    date: "22 Mar 2026",
    version: "0.14.0",
    title: "Portal Dashboard Revamp, Slack Tickets & Auto Touchpoints",
    changes: [
      { type: "added", text: "Admin portal dashboard: 5 tabs (Overview, Testing, Tickets, Delivery, Clients)" },
      { type: "added", text: "Slack /ticket command: clients log issues via Slack modal with title, description, priority, attachments" },
      { type: "added", text: "Ticket triage flow: set design/dev type → auto-creates ClickUp task with correct assignees" },
      { type: "added", text: "Tickets tab: full table view with client, type, priority, age columns" },
      { type: "added", text: "Delivery tab: blocked clients, phase progress bars, clients by stage" },
      { type: "added", text: "Team directory in Settings: Slack IDs, ClickUp IDs, role-based assignment" },
      { type: "added", text: "Auto-calculated touchpoints: configurable Mon/Wed/Fri in Settings, no manual date entry" },
      { type: "added", text: "Copy Checker: rebuilt as flag-based system (red flags, warnings, passing) instead of subjective scoring" },
      { type: "added", text: "Business Settings: touchpoint days toggle alongside working days" },
      { type: "improved", text: "Admin portal detail: client details as vertical editable list (designers, developers, Slack, touchpoint)" },
      { type: "improved", text: "Portal creation: two-step Retainer vs Project selection with tailored fields" },
      { type: "improved", text: "Overview: minimal client list with dividers, 3-column touchpoints, ticket count panels" },
      { type: "improved", text: "Ticket save: direct Supabase upsert for reliability" },
      { type: "improved", text: "Copy Link and Preview as proper CTA buttons" },
      { type: "fixed", text: "Ticket type persists to Supabase on triage" },
      { type: "fixed", text: "Team member ID orphan auto-cleanup" },
      { type: "fixed", text: "Settings save to Supabase (was only saving to localStorage)" },
    ],
  },
  {
    id: "cl-14",
    date: "21 Mar 2026",
    version: "0.13.0",
    title: "Sales Engine — Separate Growth Dashboard",
    changes: [
      { type: "added", text: "Sales Engine: new dashboard at /sales-engine with own sidebar and layout" },
      { type: "added", text: "App switcher in both sidebars to toggle between Launchpad and Sales Engine" },
      { type: "added", text: "Pipeline CRM: Kanban board with drag-and-drop deal management (lead → won)" },
      { type: "added", text: "Content Calendar: plan, draft, schedule content with board view and account filtering (Dylan/Ajay)" },
      { type: "added", text: "Migrated tools: Content Engine, Hooks, Repurpose, Leads, Outreach, Revenue, Audit Engine, Portfolio, Price Lists" },
      { type: "added", text: "Command Centre dashboard with pipeline value, content stats, follow-up tracking" },
      { type: "added", text: "Deal form with stage, value, owner, source, follow-up date, notes" },
      { type: "added", text: "Content form with platform, account, funnel stage, schedule date, body editor" },
    ],
  },
  {
    id: "cl-13",
    date: "20 Mar 2026",
    version: "0.12.0",
    title: "Retainer vs Project Portal Modes",
    changes: [
      { type: "added", text: "Two portal modes: Retainer Client (weekly test cycle) and Project Client (linear page build)" },
      { type: "added", text: "New portal creation flow — two-card selection for client type with tailored fields" },
      { type: "added", text: "Retainer creation includes testing tier (T1/T2/T3) and optional Intelligems API key" },
      { type: "added", text: "client_type field on PortalData — drives entire portal UX (retainer vs regular)" },
      { type: "added", text: "Auto-migration for existing portals — detects retainer from project_type" },
      { type: "improved", text: "Admin portal default tab is Testing for retainer clients, Overview for project clients" },
      { type: "improved", text: "Tab order adapts to client type — Testing first for retainers" },
      { type: "improved", text: "Client portal sidebar adapts — retainers see Testing instead of Timeline" },
      { type: "improved", text: "Portal cards show Retainer/Project badge with client type" },
      { type: "fixed", text: "Changelog entries now auto-merge from seed data into localStorage" },
    ],
  },
  {
    id: "cl-12",
    date: "20 Mar 2026",
    version: "0.11.0",
    title: "Multi-Project Portals & Client Evolution",
    changes: [
      { type: "added", text: "Multi-project per client — one portal holds all work (page builds, retainers, audits)" },
      { type: "added", text: "PortalProject type with per-project phases, scope, deliverables, documents" },
      { type: "added", text: "Project selector pills in admin portal — switch between projects for the same client" },
      { type: "added", text: "Add Project modal — create page builds or retainers within an existing portal" },
      { type: "added", text: "Retainer view — weekly test cadence with tier selector (replaces linear timeline)" },
      { type: "added", text: "Client portal project selector — clients with 2+ projects can switch between them" },
      { type: "added", text: "Funnels tab in admin portal — view/create funnels linked to client" },
      { type: "added", text: "Funnels tab in client portal — read-only view of funnel nodes" },
      { type: "added", text: "Auto-migration — legacy single-project portals automatically get projects[0] on load" },
      { type: "improved", text: "Testing tab dashboard redesign — card layout with big RPV lift numbers instead of dense table" },
      { type: "improved", text: "Results summary — winners/underperformed/inconclusive as big number cards" },
      { type: "improved", text: "Client dashboard adapts per project type (retainer shows test stats, build shows progress)" },
    ],
  },
  {
    id: "cl-11",
    date: "19 Mar 2026",
    version: "0.10.0",
    title: "Intelligems Integration & Portal Improvements",
    changes: [
      { type: "added", text: "Intelligems API integration — auto-pulls live A/B test data (CVR, AOV, RPV, visitors, orders, revenue) per client" },
      { type: "added", text: "API proxy route for secure Intelligems data fetching from client portals" },
      { type: "added", text: "Intelligems API key field per portal in admin Testing tab" },
      { type: "added", text: "Live test cards with variation metrics table, lift indicators, and baseline comparisons" },
      { type: "added", text: "Portal soft-delete with trash bin — deleted portals recoverable for 30 days" },
      { type: "added", text: "Two-step delete confirmation on portal cards" },
      { type: "added", text: "Designs tab always visible in client portal with placeholder state" },
      { type: "improved", text: "Development tab — page reviews with staging URLs, version tracking, and inline feedback" },
      { type: "improved", text: "Scope tab shows deliverable type alongside description" },
      { type: "added", text: "Intelligems cherry-pick — select which tests are yours, only selected show in client portal" },
      { type: "improved", text: "Client Development tab — clean version-controlled staging links with Review Page buttons, no iframe" },
      { type: "fixed", text: "Page reviews not appearing after creation — activeReviewId sync issue" },
      { type: "fixed", text: "Deleted portals reappearing — now uses Supabase soft-delete with deleted_at column" },
      { type: "added", text: "Page Copy Audit tool — paste brief + screenshots, AI analyses copy section by section against DTC framework with VOC research" },
      { type: "added", text: "DTC Copywriting Guide training data — 7-part framework covering mindset, tone, page architecture, trust building, advanced techniques" },
      { type: "added", text: "Figma API + Claude Vision integration for reading page designs" },
      { type: "added", text: "VOC scraping — Trustpilot + Reddit research with brief-aware product filtering" },
      { type: "added", text: "Clipboard paste support (Cmd+V) for screenshots in copy audit" },
      { type: "improved", text: "Copy audit output is suggestive not prescriptive — explains why copy is weak and gives directional guidance" },
      { type: "improved", text: "Brief-first workflow — must lock brief before analysing, AI respects multi-angle vs single-angle briefs" },
      { type: "improved", text: "Team Hub promoted to top-level nav below Mission Control" },
      { type: "improved", text: "Admin Development tab simplified to clean version control (no iframe/pin viewer)" },
      { type: "added", text: "Business Settings page — configurable deliverable turnaround times, revision/support durations, working days" },
      { type: "added", text: "Centralised date helpers in src/lib/dates.ts — all tools now share addBusinessDays with configurable working days" },
      { type: "improved", text: "Sidebar version bumped to v0.10" },
      { type: "improved", text: "Copy Checker rebuild — replaced subjective 1-10 scoring with flag-based system (red flags, warnings, passing)" },
      { type: "added", text: "Banned phrase detection — hardcoded list of weak DTC phrases auto-flagged as red flags" },
      { type: "added", text: "Structural checklists per section type — Hero, Benefits, Trust, CTA, FAQ" },
      { type: "added", text: "VOC gaps panel — shows customer language not used on the page" },
      { type: "improved", text: "Chat refocused as senior CRO advisor for nuanced creative guidance" },
      { type: "fixed", text: "Design review V1 auto-loads after creation (no more create V1 prompt)" },
      { type: "fixed", text: "Intelligems now fetches ALL tests in parallel batches (was capped/sequential)" },
      { type: "removed", text: "Wins tab removed from client portal" },
      { type: "added", text: "Phase dates editable via date pickers in admin portal" },
      { type: "added", text: "startDate/endDate fields on PortalPhase type" },
    ],
  },
  {
    id: "cl-10",
    date: "18 Mar 2026",
    version: "0.9.0",
    title: "Funnel Builder, Business Settings & Full Supabase Migration",
    changes: [
      { type: "added", text: "Visual Funnel Builder — drag-and-drop e-commerce funnel mapping with React Flow canvas, custom traffic/page nodes, arrow connections" },
      { type: "added", text: "4 funnel templates — Standard DTC, Quiz Funnel, Advertorial, Organic Content" },
      { type: "added", text: "Funnel performance mode — overlay traffic, CVR, AOV, drop-off metrics on each node with colour-coded indicators" },
      { type: "added", text: "Traffic warmth selector — tag traffic sources as Cold/Warm/Hot with colour badges" },
      { type: "added", text: "Ad preview + page URL links on funnel nodes — clickable links to view ad creatives or live pages" },
      { type: "added", text: "Undo/redo in Funnel Builder — Cmd+Z / Cmd+Shift+Z with 50-level history" },
      { type: "added", text: "PNG export for funnels" },
      { type: "added", text: "Business Settings page — configurable deliverable turnaround times, revision/support phase durations, working day toggles" },
      { type: "added", text: "Centralised date helpers — all date formatting and business day logic in one module" },
      { type: "improved", text: "Full Supabase migration — all data layers now persist to Supabase with localStorage fallback (prospects, roadmap, portfolio, settings, pulse, content DB, feedback, outreach, funnels)" },
      { type: "improved", text: "Generic supabase-store helper for consistent data persistence pattern" },
      { type: "improved", text: "Funnel node cards restyled — more spacious, separated header bar, hover shadows, pill-style preview links" },
      { type: "improved", text: "Ecomlanders logomark favicon" },
    ],
  },
  {
    id: "cl-9",
    date: "18 Mar 2026",
    version: "0.8.1",
    title: "Project Kickoff → Portal Pipeline & Data Persistence",
    changes: [
      { type: "added", text: "Project Kickoff now creates a client portal — one-click 'Create Client Portal' button auto-populates phases, scope, documents, and touchpoints from the kickoff form" },
      { type: "added", text: "CRO test results — A/B testing with week-based grouping, CVR/AOV/RPV snapshots with % lift indicators, Figma design preview popups" },
      { type: "improved", text: "Current phase synced with timeline — admin uses dropdown selector from phases, auto-updates when phase status changes" },
      { type: "improved", text: "Client portal timeline — complete phase tags now green, online/offline indicator green/red" },
      { type: "improved", text: "Touchpoint date format — shows '19 Mar' instead of ISO dates" },
      { type: "fixed", text: "Supabase data persistence — added missing wins, testing_tier, blocker columns. Portals now persist across all browsers and devices" },
      { type: "fixed", text: "localStorage-only portals now visible in portal list even when Supabase is configured" },
      { type: "removed", text: "Removed 'What You're Getting' scope box from client dashboard" },
      { type: "improved", text: "Renamed 'Project Documents' to 'Project Kickoff' in sidebar" },
    ],
  },
  {
    id: "cl-8",
    date: "18 Mar 2026",
    version: "0.8.0",
    title: "Client Portal Overhaul",
    changes: [
      { type: "improved", text: "Portal overview redesigned — removed stat cards, added Client Portal pre-header, submit request button, deliverables list, and documents section" },
      { type: "improved", text: "Sidebar simplified — removed avatar icon, just shows client name" },
      { type: "improved", text: "Updates tab — 2-column grid layout with video icon for Loom updates" },
      { type: "improved", text: "Scope tab — now shows deliverables with status indicators" },
      { type: "improved", text: "Requests — inline form replaced with popup modal" },
      { type: "improved", text: "Documents — type text labels replaced with icons, preview in popup, downloadable" },
      { type: "improved", text: "Designs — Figma preview with 'Review & Comment in Figma' overlay link" },
      { type: "improved", text: "Reduced corner radius and switched card backgrounds from grey to white" },
      { type: "improved", text: "Portal overview — 'What You're Getting' shows scope items instead of phase-grouped deliverables" },
      { type: "added", text: "Project blocker flags — mark projects as blocked (client/internal/external) with reason and timestamp on admin dashboard" },
      { type: "added", text: "CRO testing section — testing tiers (T1/T2/T3), tests by status (scheduled/live/complete), result tracking with CVR/AOV/RPV snapshots, Figma design previews" },
      { type: "added", text: "Development nav section placeholder" },
      { type: "added", text: "Next Touchpoint card on portal overview" },
    ],
  },
  {
    id: "cl-7",
    date: "17 Mar 2026",
    version: "0.7.0",
    title: "Design System Overhaul & Nav Restructure",
    changes: [
      { type: "improved", text: "De-blued entire UI — replaced all blue-tinted greys with pure neutral greys across 50+ files" },
      { type: "improved", text: "Sidebar restructured — icons on section headers only, cleaner indented sub-items" },
      { type: "improved", text: "Mission Control — removed Overdue section (redundant with Needs Attention), feed contained in scrollable box, Deadlines This Week shows day numbers and task counts" },
      { type: "improved", text: "Portfolio — all Figma embeds preloaded for instant tab switching" },
      { type: "improved", text: "Scrollbars — minimal 2px thin scrollbar globally" },
      { type: "improved", text: "Border radius tightened — rounded-xl to rounded-lg across tool pages" },
      { type: "improved", text: "Nav renamed — Lead Scraper, Audit Engine, Content Engine, Dev Hours Log, Invoice Generator, Project Documents, Client Portals" },
      { type: "removed", text: "Ops Radar removed from sidebar (data folded into Mission Control, page still accessible)" },
      { type: "removed", text: "Outreach removed from sidebar (will be merged into Lead Scraper)" },
    ],
  },
  {
    id: "cl-6",
    date: "17 Mar 2025",
    version: "0.6.0",
    title: "Voice Note Cleanup — All Phases",
    changes: [
      { type: "added", text: "Changelog page to track all Launchpad updates" },
      { type: "improved", text: "Mission Control — stats strip (Active Projects, Overdue Tasks, Open Issues, Ad Hoc Requests), Needs Attention section, and Important/All feed filter" },
      { type: "improved", text: "Ops Radar — compact week strip, severity-coded overdue section (expandable by client), color-coded team load bars" },
      { type: "improved", text: "Client Portal — Next Touchpoint card, deliverables grouped by phase, removed assignee input, QA/Dev Check launch buttons" },
      { type: "improved", text: "Content Analytics — visual card grid with performance heatmap, top performer highlights" },
      { type: "improved", text: "QA Checklist & Dev Self-Check — linked to client portals via dropdown, pre-fill support" },
      { type: "improved", text: "Sidebar — removed unfinished tools from nav, moved QA/Dev Check under Team Tools" },
      { type: "removed", text: "Funnel Planner, Content Repurposer, Hook Generator, Upsell Scanner hidden from sidebar (routes still exist)" },
    ],
  },
  {
    id: "cl-5",
    date: "14 Mar 2025",
    version: "0.5.0",
    title: "Issues Tracker & Portal Enhancements",
    changes: [
      { type: "added", text: "Issues tracker — centralised bug & issue reporting system" },
      { type: "added", text: "Ad Hoc Requests on client portals (renamed from Requests)" },
      { type: "improved", text: "Client Portal — Requests renamed to Ad Hoc, promoted in portal overview" },
      { type: "improved", text: "Ops Radar — team load split into Design / Dev / PM sections" },
    ],
  },
  {
    id: "cl-4",
    date: "10 Mar 2025",
    version: "0.4.0",
    title: "Content Analytics & Ops Radar",
    changes: [
      { type: "added", text: "Content Analytics — Twitter sync via TwitterAPI.io with AI categorisation" },
      { type: "added", text: "Ops Radar — ClickUp integration for task tracking" },
      { type: "added", text: "Team timezone clocks in sidebar footer" },
    ],
  },
  {
    id: "cl-3",
    date: "5 Mar 2025",
    version: "0.3.0",
    title: "Client Portal System",
    changes: [
      { type: "added", text: "Client Portal — create, manage, and share project portals" },
      { type: "added", text: "Portal public view with branded token-based URLs" },
      { type: "added", text: "Deliverables tracking with phase management" },
      { type: "added", text: "QA Checklist tool for pre-launch quality checks" },
      { type: "added", text: "Dev Self-Check tool for developer sign-off" },
    ],
  },
  {
    id: "cl-2",
    date: "28 Feb 2025",
    version: "0.2.0",
    title: "Finance & Strategy Tools",
    changes: [
      { type: "added", text: "Price Calculator with tier-based pricing" },
      { type: "added", text: "Dev Hours tracker" },
      { type: "added", text: "Invoice Generator" },
      { type: "added", text: "Proposals tool with AI-assisted generation" },
      { type: "added", text: "Project Setup / Kickoff wizard" },
      { type: "added", text: "Portfolio showcase page" },
    ],
  },
  {
    id: "cl-1",
    date: "20 Feb 2025",
    version: "0.1.0",
    title: "Initial Launch",
    changes: [
      { type: "added", text: "Launchpad dashboard with sidebar navigation" },
      { type: "added", text: "Mission Control home page with workflow lanes" },
      { type: "added", text: "Slack activity feed integration" },
    ],
  },
];

const seedRoadmap: RoadmapItem[] = [
  { id: "rm-1", title: "Approval Workflow", description: "Branded link → Figma → approve/revise → Slack notification. Full client approval flow.", priority: "next", addedAt: "2025-03-17" },
  { id: "rm-2", title: "Client Portal — Live Data", description: "Connect portal deliverables and phases to ClickUp tasks so status updates automatically.", priority: "next", addedAt: "2025-03-17" },
  { id: "rm-3", title: "Wins & Results Tabs", description: "Dedicated sections on client portals to showcase results, metrics, and case study data.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-4", title: "Funnel Planner", description: "Visual funnel builder for mapping out client acquisition and conversion flows.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-5", title: "Content Repurposer", description: "Take top-performing content and generate variations for different platforms.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-6", title: "Hook Generator", description: "AI-powered hook and headline generator for ads, emails, and landing pages.", priority: "exploring", addedAt: "2025-03-17" },
  { id: "rm-7", title: "Upsell Scanner", description: "Analyse client accounts to surface upsell and cross-sell opportunities.", priority: "exploring", addedAt: "2025-03-17" },
  { id: "rm-8", title: "Portfolio Performance", description: "Speed and load time monitoring for portfolio sites.", priority: "exploring", addedAt: "2025-03-17" },
];

// ═══════════════════════════════════════════════════════════════════
// Roadmap store (data jsonb pattern)
// ═══════════════════════════════════════════════════════════════════

const roadmapStore = createStore<RoadmapItem>({
  table: "roadmap_items",
  lsKey: ROADMAP_KEY,
});

// ═══════════════════════════════════════════════════════════════════
// Row mappers
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChangelogRow(row: any): ChangelogEntry {
  return {
    id: row.id,
    date: row.date || "",
    version: row.version || "",
    title: row.title || "",
    changes: row.changes || [],
  };
}

// ── Local helpers ──

function ensureSeeded<T extends { id: string }>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    const stored = JSON.parse(raw) as T[];
    // Merge any new seed entries not already in localStorage
    const storedIds = new Set(stored.map((s) => s.id));
    const newEntries = seed.filter((s) => !storedIds.has(s.id));
    if (newEntries.length > 0) {
      const merged = [...newEntries, ...stored];
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    }
    return stored;
  } catch {
    return seed;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Changelog — Read
// ═══════════════════════════════════════════════════════════════════

export async function getChangelog(): Promise<ChangelogEntry[]> {
  // Seed data in code is always the source of truth for changelog.
  // Merge: seed entries win over Supabase for matching IDs (so code updates are reflected),
  // and any Supabase-only entries (user-created) are kept too.
  let dbEntries: ChangelogEntry[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) dbEntries = data.map(mapChangelogRow);
    } catch {
      /* fall through */
    }
  }

  // Build merged list: seed entries always override DB entries with same ID
  const seedIds = new Set(seedChangelog.map(s => s.id));
  const dbOnly = dbEntries.filter(e => !seedIds.has(e.id));
  const merged = [...seedChangelog, ...dbOnly];

  // Persist any new/updated seed entries to Supabase
  if (isSupabaseConfigured() && dbEntries.length > 0) {
    const dbMap = new Map(dbEntries.map(e => [e.id, e]));
    for (const entry of seedChangelog) {
      const existing = dbMap.get(entry.id);
      if (!existing) {
        // New seed entry — insert
        supabase.from("changelog").insert({
          id: entry.id, date: entry.date, version: entry.version,
          title: entry.title, changes: entry.changes,
          created_at: new Date().toISOString(),
        }).then(() => {});
      } else if (JSON.stringify(existing.changes) !== JSON.stringify(entry.changes)) {
        // Updated seed entry — update
        supabase.from("changelog").update({
          date: entry.date, version: entry.version,
          title: entry.title, changes: entry.changes,
        }).eq("id", entry.id).then(() => {});
      }
    }
  }

  return merged;
}

// ═══════════════════════════════════════════════════════════════════
// Changelog — Create
// ═══════════════════════════════════════════════════════════════════

export async function addChangelogEntry(
  entry: Omit<ChangelogEntry, "id">
): Promise<ChangelogEntry> {
  const id = `cl-${Date.now()}`;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .insert({
          id,
          date: entry.date,
          version: entry.version,
          title: entry.title,
          changes: entry.changes,
        })
        .select()
        .single();
      if (error) throw error;
      return mapChangelogRow(data);
    } catch {
      /* fall through */
    }
  }
  const entries = ensureSeeded(CHANGELOG_KEY, seedChangelog);
  const newEntry: ChangelogEntry = { ...entry, id };
  entries.unshift(newEntry);
  localStorage.setItem(CHANGELOG_KEY, JSON.stringify(entries));
  return newEntry;
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Read
// ═══════════════════════════════════════════════════════════════════

export async function getRoadmap(): Promise<RoadmapItem[]> {
  const items = await roadmapStore.getAll();
  if (items.length > 0) return items;
  // Seed if empty
  await roadmapStore.saveAll(seedRoadmap);
  return seedRoadmap;
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Create
// ═══════════════════════════════════════════════════════════════════

export async function addRoadmapItem(
  item: Omit<RoadmapItem, "id" | "addedAt">
): Promise<RoadmapItem> {
  const newItem: RoadmapItem = {
    ...item,
    id: `rm-${Date.now()}`,
    addedAt: new Date().toISOString().slice(0, 10),
  };
  return roadmapStore.create(newItem);
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteRoadmapItem(id: string): Promise<void> {
  await roadmapStore.remove(id);
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Update priority
// ═══════════════════════════════════════════════════════════════════

export async function updateRoadmapPriority(
  id: string,
  priority: RoadmapPriority
): Promise<void> {
  await roadmapStore.update(id, { priority } as Partial<RoadmapItem>);
}
