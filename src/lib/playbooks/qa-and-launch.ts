import type { Playbook } from "./types";

/* ================================================================
   4. QA & LAUNCH
   From pre-launch checks to post-launch support and offboarding
   ================================================================ */
export const qaAndLaunch: Playbook = {
  id: "qa-and-launch",
  title: "QA & Launch",
  description:
    "Pre-launch procedures, final checks, going live, post-launch monitoring, and offboarding",
  category: "How We Work",
  estimatedMinutes: 20,
  steps: [
    {
      id: "ql-1",
      title: "Pre-Launch Procedure",
      content: `The client has approved the build. We're preparing for launch.

**Pre-launch is a structured process, not a rush to go live.**

**What happens in pre-launch:**
- Final review of all pages on the live theme (not just preview)
- All third-party apps configured and tested
- Domain and DNS settings verified
- SSL certificate confirmed
- Payment gateway tested with test transactions
- Email notifications configured and tested
- Redirects set up (if migrating from another platform)
- Analytics and tracking installed

**Who's involved:**
The developer leads pre-launch, but the PM oversees the checklist to make sure nothing is missed. This is a collaborative effort.

**Timeline:**
Pre-launch should be completed at least 24 hours before the planned go-live time. Never rush a launch.`,
      tip: "The pre-launch checklist exists for a reason. Even if you've done this 100 times, go through it line by line.",
      quiz: {
        question: "How far in advance should pre-launch be completed before going live?",
        options: [
          "1 hour before",
          "At least 24 hours before the planned go-live time",
          "It doesn't matter — just do it when you can",
          "1 week before",
        ],
        correctIndex: 1,
        hint: "Give yourself buffer — never rush a launch.",
      },
    },
    {
      id: "ql-2",
      title: "Pre-Launch Checklist Confirmed & Final Checks",
      content: `Every item on the pre-launch checklist must be confirmed before we go live.

**The checklist includes:**
- All pages reviewed and approved
- Forms tested (contact, newsletter signup, etc.)
- Cart and checkout flow tested end-to-end
- Mobile experience verified on real devices
- Cross-browser testing completed
- Performance scores checked (Core Web Vitals, Lighthouse)
- SEO basics verified (meta titles, descriptions, alt text, sitemap)
- 404 page configured
- Favicon and social sharing images set
- Legal pages in place (Privacy Policy, Terms, Cookie Policy)
- Accessibility basics checked

**Final sign-off:**
The PM and developer both confirm every item is checked. If anything is incomplete, launch is delayed until it's resolved. No "we'll fix it after launch" exceptions.

**Documentation:**
The completed checklist is saved in the project's ClickUp space as a record.`,
      quiz: {
        question: "What happens if a checklist item is incomplete at launch time?",
        options: [
          "Launch anyway and fix it later",
          "Launch is delayed until it's resolved — no exceptions",
          "Only fix it if the client notices",
          "Remove it from the checklist",
        ],
        correctIndex: 1,
        hint: "We don't launch with known issues.",
      },
    },
    {
      id: "ql-3",
      title: "Heatmapping & A/B Testing Software Confirmed",
      content: `Before going live, we ensure tracking and optimisation tools are in place.

**What needs to be set up:**
- Heatmapping tool installed and configured (tracking user behaviour from day one)
- A/B testing software ready (if applicable to the project)
- Google Analytics / GA4 configured and verified
- Any conversion tracking pixels installed (Meta, Google Ads, etc.)
- Event tracking set up for key interactions (add to cart, checkout, form submissions)

**Why this happens before launch:**
If we install tracking after launch, we lose valuable data from the first days — often the most interesting period as real users interact with the new site for the first time.

**Who owns this:**
The developer installs the tools. The CRO team (if involved) confirms the configuration is correct and tracking is firing properly.

**Verification:**
Test that all tracking is actually recording data. Don't just install the code — confirm it's working.`,
      tip: "Always test tracking in a real browser (not just checking the code is there) — extensions and privacy settings can block trackers in unexpected ways.",
      quiz: {
        question: "Why must heatmapping and tracking be set up before launch?",
        options: [
          "It's not important — we can add it later",
          "So we capture data from day one and don't lose insights from the launch period",
          "The client insists on it",
          "It makes the site load faster",
        ],
        correctIndex: 1,
        hint: "The first days of a live site generate valuable data — don't miss it.",
      },
    },
    {
      id: "ql-4",
      title: "Page Goes Live!",
      content: `Everything is checked, confirmed, and verified. It's time to launch.

**Launch process:**
- Final confirmation from the PM and client that we're good to go
- Theme published / pages made live
- DNS changes propagated (if applicable)
- SSL confirmed working on the live domain
- Quick smoke test on the live site — click through key pages and flows
- Announcement to the internal team: "We're live!"

**Immediately after going live:**
- Test the checkout flow on the live site
- Verify tracking is firing on the live domain
- Check mobile and desktop experience
- Monitor for any immediate errors or issues

**Celebrate (briefly):**
Launching a project is a milestone. Acknowledge the team's work. Then get ready for the monitoring phase.`,
      tip: "Always do a live checkout test immediately after launch — it's the most critical flow and the first thing to break.",
      quiz: {
        question: "What should you do immediately after the site goes live?",
        options: [
          "Close the project and move on",
          "Test the checkout flow, verify tracking, and check mobile/desktop experience on the live site",
          "Send the client a final invoice",
          "Delete the staging environment",
        ],
        correctIndex: 1,
        hint: "Going live is the start of monitoring, not the end of work.",
      },
    },
    {
      id: "ql-5",
      title: "24-48 Hours Post-Launch Monitoring & Quick Bug Fixes",
      content: `The first 24-48 hours after launch are critical. We monitor closely.

**What to monitor:**
- Site uptime and load times
- Any error reports or broken functionality
- Real user behaviour (heatmaps, session recordings if available)
- Checkout and payment processing working correctly
- Third-party integrations functioning properly
- Client-reported issues

**Quick bug fixes:**
Any bugs discovered in this window get fixed immediately. This is priority work — drop other tasks if needed. A live site with bugs is an emergency.

**Communication:**
- Keep the client informed of any issues found and fixed
- Post updates in the internal Slack channel
- Log all post-launch fixes in ClickUp for the record

**The 24-48 hour commitment:**
The developer who built the site owns this monitoring window. Be available, be responsive, and fix things fast.`,
      quiz: {
        question: "How should bugs discovered in the first 24-48 hours after launch be handled?",
        options: [
          "Add them to the backlog for next sprint",
          "Fixed immediately — a live site with bugs is an emergency",
          "Wait for the client to report them formally",
          "Ignore them if they're minor",
        ],
        correctIndex: 1,
        hint: "Post-launch bugs are emergencies, not backlog items.",
      },
    },
    {
      id: "ql-6",
      title: "30 Days Shopify Support from Launch Date",
      content: `Every project includes 30 days of Shopify support from the launch date.

**What's covered in the 30-day support window:**
- Bug fixes related to the delivered work
- Minor adjustments and tweaks
- Questions about how to use the Shopify admin
- Help with content updates the client needs
- Troubleshooting any issues that arise with the delivered features

**What's NOT covered:**
- New features or functionality not in the original scope
- Redesign of approved pages
- Integration of new third-party apps not in the original brief
- Ongoing maintenance beyond the 30-day window

**How the client requests support:**
Through the project Slack channel or designated support process. Requests are logged in ClickUp and prioritised.

**Why 30 days:**
It gives the client a safety net while they settle into managing their new site. Most post-launch issues surface within the first month.`,
      tip: "Log all 30-day support requests in ClickUp — it helps identify patterns and improves our QA process for future projects.",
      quiz: {
        question: "How long does post-launch Shopify support last?",
        options: [
          "7 days",
          "14 days",
          "30 days from launch date",
          "Unlimited — we support forever",
        ],
        correctIndex: 2,
        hint: "It's a specific timeframe — enough for the client to settle in.",
      },
    },
    {
      id: "ql-7",
      title: "Offboarding & Upselling",
      content: `The 30-day support window is closing. Time to wrap up the project properly.

**Offboarding:**
- Final project review with the client — how did it go?
- Handover of all assets, documentation, and access details
- Any outstanding support items resolved
- Project retrospective with the internal team (what went well, what to improve)
- ClickUp project archived (not deleted)

**Upselling opportunities:**
This is a natural conversation, not a hard sell. Consider:
- **Performance testing / CRO** — "Now that you're live, we can start optimising for conversions"
- **Retainer support** — "Would ongoing monthly support give you peace of mind?"
- **Additional features** — features that came up during the project but were out of scope
- **A/B testing** — "Let's test and improve what we've built"

**Why offboarding matters:**
A clean offboarding leaves the client feeling looked after. They're more likely to come back and more likely to refer others.

**The final message:**
Send a personal thank-you message to the client. Acknowledge the project and the collaboration. End on a high note.`,
      tip: "The best upsells come from genuine insights discovered during the project. If you noticed something that could improve their conversions, mention it.",
      quiz: {
        question: "What is the purpose of the offboarding process?",
        options: [
          "Just to close the ClickUp project",
          "A clean wrap-up including client review, asset handover, team retrospective, and natural upselling conversation",
          "To send the final invoice",
          "To remove the client from Slack",
        ],
        correctIndex: 1,
        hint: "Offboarding is about wrapping up properly AND opening the door for future work.",
      },
    },
  ],
};
