# Launchpad Roadmap & Ideas

Last updated: 2026-03-14

---

## STATUS KEY
- DONE = live on ecomlanders.app
- NEEDS WORK = built but needs improvements
- WIP = partially built, in "In Development" nav section
- NOT STARTED = idea discussed, not yet built

---

## 1. CONTENT ANALYTICS (NEEDS WORK)
Tool: /tools/content-db | File: src/app/(dashboard)/tools/content-db/page.tsx

What it does now:
- Pulls tweets from twitterapi.io for Dylan and Ajay accounts
- Tabs to switch between accounts
- Shows posts with engagement metrics
- AI analysis of content patterns and winners

What needs improving:
- Only pulled ~9 tweets last time — need to pull more (pagination or higher count param)
- Better analysis output — identify winning formats, topics, posting times
- Content patterns section could be richer (top hooks, best-performing categories)
- Add date range filtering
- LinkedIn integration (removed for now, revisit when ready)
- Consider scheduled auto-sync instead of manual button

Key files:
- src/lib/content-database/types.ts
- src/lib/content-database/accounts.ts
- src/lib/content-database/cache.ts
- src/app/api/content-sync/route.ts (twitterapi.io integration)
- src/app/api/content-analyze/route.ts (Claude analysis)

ENV: TWITTER_API_KEY (twitterapi.io key, already on Vercel)

---

## 2. COPY ENGINE (NEEDS WORK)
Tool: /team/copy | File: src/app/(team)/team/copy/page.tsx

What it does now:
- 3 modes: Page, Advertorial, Listicle
- Brief-first workflow with context blocks (VOC, competitors, brand voice etc.)
- Section picker for page mode
- Generates copy using Claude

What needs improving:
- Prompt quality — outputs need to be sharper, more conversion-focused
- Find reference assets (winning page examples, swipe files) to feed into prompts
- Section-specific prompts could be better tuned
- Add ability to save/load briefs
- Consider hooking to Research tool output (auto-fill context blocks from research)

Key files:
- src/lib/copy-engine/types.ts
- src/app/(team)/team/copy/page.tsx
- src/app/api/copy-generate/ (API route)

---

## 3. RESEARCH & INTEL (DONE but could improve)
Tool: /team/research | File: src/app/(team)/team/research/page.tsx

What it does now:
- Designer/copywriter pastes full client brief
- Uses Anthropic web search for deep research
- Outputs: Product Deep Dive, Customer Voice, Competitor Intel, Objection Handling, Messaging Direction, CRO Notes
- Brand profile saving

What could improve:
- Research depth — some outputs are surface-level
- Better VOC extraction (real review language, not generic)
- Hook research output into Copy Engine context blocks

---

## 4. AUDIT MACHINE (NEEDS WORK)
Tool: /tools/store-intel | File: src/app/(dashboard)/tools/store-intel/page.tsx

What it does now:
- Crawls Shopify stores for CRO analysis
- Categorised findings: quick wins, dev issues, CRO gaps

What needs improving:
- Output needs to be more digestible — bullet points not paragraphs
- Should be formatted for Loom outreach (talking points)
- Quick wins / dev issues / CRO gaps clearly separated
- Single-page audit option for designers (not full store)
- Known apps detection could be better

Key files:
- src/lib/store-intel/types.ts
- src/app/api/store-intel/route.ts
- src/data/known-apps.ts

---

## 5. CLIENT PORTAL (WIP — paused)
Tool: /tools/client-portal | Files: src/app/(portal)/, src/lib/portal/

What's built:
- Portal view with Overview, Timeline, Scope, Results, Wins tabs
- Admin management page with Updates, Approvals, Designs, Wins
- Demo data seeding
- UK time banner
- Document preview modal
- Design review with Figma embed + versioning
- Approval/revision buttons with paper trail

What needs doing:
- Move from mock data to real client data (manual inputs until ClickUp is live)
- Roll out to actual clients
- Design approval flow: branded link, Figma embed, approve/revise buttons, team gets notified
- Async video updates (Loom embed)
- One-click approval workflow
- Wins board polish
- Results tab for A/B test data
- Connect to ClickUp when their workspace is ready

Key files:
- src/lib/portal/types.ts, data.ts, review-types.ts, reviews.ts
- src/app/(portal)/portal/[token]/portal-view.tsx
- src/app/(dashboard)/tools/client-portal/[id]/page.tsx

---

## 6. PROSPECT SCRAPER (WIP)
Tool: /tools/prospect-scraper | File: src/app/(dashboard)/tools/prospect-scraper/page.tsx

What's built:
- Natural language prompt for ICP criteria
- Scrapes for matching brands
- Saved prospects tab
- Outreach button linking to outreach generator

What needs improving:
- Better scraping results (Serper.dev search quality)
- Contact info extraction (emails, LinkedIn)
- Bulk prospect management
- Integration with outreach tool

---

## 7. OUTREACH GENERATOR (WIP)
Tool: /tools/outreach | File: src/app/(dashboard)/tools/outreach/page.tsx

What's built:
- Single email and Sequence modes
- Prefill from prospect scraper
- AI-generated email copy

What needs improving:
- Email sending capability (300+/day target)
- Sequence automation
- Template management
- Response tracking
- Integration with prospect scraper pipeline

---

## 8. CRO TEST MONITOR (WIP)
Tool: /tools/cro-monitor | File: src/app/(dashboard)/tools/cro-monitor/page.tsx

What's built:
- Dashboard with swimlanes: Needs Attention, Ongoing, Losers, Winners
- Pulsating green for live tests
- Weekly checklist concept (Monday launch, Friday review)
- Activity timeline
- Fake demo data

What needs improving:
- Real data integration (manual input or API)
- More breathing room in layout
- Collapsible sections per client

---

## 9. CRO AUDIT (WIP)
Tool: /tools/cro-audit | File: src/app/(dashboard)/tools/cro-audit/page.tsx

What's built:
- Upload screenshots of designs
- AI CRO analysis displayed on page (not PDF)

What needs improving:
- Better analysis prompts
- Comparison between versions
- Export option

---

## 10. PLAYBOOKS (WIP)
Tool: /tools/playbooks | File: src/app/(dashboard)/tools/playbooks/

What's built:
- 6 interactive flowcharts matching Miro processes
- Brief & Strategy, Design, Development, QA & Launch, Performance Testing, Retainer Testing

What needs improving:
- Content accuracy vs actual Miro boards
- Interactive learning elements (not just reading)
- Progress tracking for team members

Key files: src/lib/playbooks/ (6 flow files)

---

## 11. PROPOSALS (DONE — minor tweaks)
Tool: /tools/proposals | Files: src/app/(proposal)/

What's done:
- Gated links per prospect with tier selection
- Client-facing service builder with retainer discounts
- Shopify Draft Order checkout
- Webhook: creates private Slack channel, invites team, posts to ops
- Admin page with month filter and trash

Remaining ideas:
- Wise payment links (parked — no API support yet)
- Email field for Slack invite (Slack Connect limitation — manual for now)

---

## 12. SIDEBAR / NAV (NEEDS TIDYING)
File: src/components/sidebar.tsx

Current state:
- 4 sections: Operations, Finance, Strategy & Content, In Development
- "In Development" has 10 items — getting crowded

Ideas discussed:
- Funnel Planner, Content Repurposer, Hook Generator were removed from the codebase by user request but are still in the nav — NEED TO REMOVE from sidebar
- User wanted 3 workflow lanes at one point: Win Client, Deliver Project, Get Paid
- QA Checklist and Dev Self-Check should move to Team Tools (so team can access without seeing pricing)

---

## 13. PRICING PAGE / PRICE LISTS (DONE)
Tool: /tools/price-lists | Public: /pricing/[tier]

What's done:
- Client-facing interactive price list for tier 1 and tier 2
- Quantity selectors with min quantities (5 ads, 10 emails)
- Volume discounts for ads and emails
- Persistent summary bar
- Shareable links from admin

---

## 14. MISSION CONTROL / HOMEPAGE (NEEDS WORK)
Tool: / (homepage) | File: src/app/(dashboard)/page.tsx

What's built:
- Workflow lane cards
- Slack signal feed with filtering

What needs improving:
- Signal-based filtering quality (catching questions, important things)
- Remove noise from Slack feed
- More useful at-a-glance info

---

## 15. OTHER COMPLETED TOOLS
These are done and working:
- Project Setup (/tools/project-kickoff) — scope doc + roadmap + agreement combo
- Price Calculator (/tools/price-calculator) — internal with tier toggle
- Dev Hours (/tools/dev-hours + /tools/log-hours) — admin + public dev form
- Invoice Generator (/tools/invoice-generator)
- Payment Link (/tools/payment-link)
- Expenses (/tools/expenses)
- Portfolio (/tools/portfolio + /portfolio) — single Figma embed portfolio
- Feedback (/tools/feedback + /feedback) — post-project review form
- QA Checklist (/tools/qa-checklist + /team/qa)
- Dev Self-Check (/tools/dev-selfcheck + /team/dev-check)
- Design & Dev Accelerator (/team/design) — section gallery + component checklist

---

## 16. BIGGER VISION IDEAS (NOT STARTED)
These were discussed but not built:

### Prospecting Module
- Full pipeline: scrape ICP brands -> find contacts -> mass outreach -> track responses
- 300+ emails/day capability
- Think "tool not database" — ClickUp stays as SSOT

### Content Intelligence Module
- Hook Content Analytics + Copy Engine into a feedback loop
- Analyse what content performs -> generate more of what works
- Social scheduling (future)

### ClickUp Integration
- When ClickUp workspace is built out, connect to Launchpad
- Client portals auto-populated from ClickUp tasks
- Deadline tracking and accountability

### Wise Payment Integration
- Create payment links via API (not available yet)
- Alternative to Shopify Draft Orders for non-product payments

---

## 17. TECH DEBT & FIXES
- Supabase anon key is not valid JWT — app uses localStorage fallback everywhere
- Some tools still reference removed items (Funnel Planner, Content Repurposer, Hook Generator in sidebar)
- Ops Radar and Issues tools in sidebar — check if these are built or stubs
- HMR stale cache issues (recurring) — sometimes need to clear .next and restart
- Consider proper database (Supabase with valid key) for tools that need persistence beyond localStorage

---

## ENV VARS NEEDED
All should be on Vercel already:
- ANTHROPIC_API_KEY
- TWITTER_API_KEY (twitterapi.io)
- SLACK_BOT_TOKEN
- SHOPIFY_ACCESS_TOKEN
- SHOPIFY_STORE_DOMAIN
- SERPER_API_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- FIRECRAWL_API_KEY (credits exhausted — not currently used)
