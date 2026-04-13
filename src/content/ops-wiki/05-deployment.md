# Deployment & Go-Live Checklist

## Pre-Launch Checklist

Complete every item before going live. No exceptions.

### Tracking & Analytics
- [ ] Google Analytics 4 is installed and receiving data
- [ ] GA4 events configured: page_view, add_to_cart, begin_checkout, purchase
- [ ] Meta Pixel installed (if running FB/IG ads)
- [ ] Google Ads conversion tracking installed (if running Google Ads)
- [ ] UTM parameters tested on key landing page URLs
- [ ] Shopify native analytics verified working

### SEO & Meta
- [ ] Page title set (under 60 characters)
- [ ] Meta description written (under 155 characters)
- [ ] OG image uploaded (1200x630)
- [ ] OG title and description set
- [ ] Canonical URL is correct
- [ ] robots.txt is not blocking the page
- [ ] Sitemap includes the new page
- [ ] Schema markup added where relevant (Product, FAQ, Review)

### Redirects
- [ ] Old URLs redirected to new pages (if replacing existing pages)
- [ ] All internal links point to correct URLs
- [ ] No broken links (run a link checker)
- [ ] 404 page is styled and helpful

### Performance
- [ ] PageSpeed Insights score: 80+ mobile, 90+ desktop
- [ ] LCP under 2.5 seconds on mobile
- [ ] CLS under 0.1
- [ ] All images optimised (WebP, compressed, lazy-loaded)
- [ ] No render-blocking resources (JS deferred, critical CSS inlined)
- [ ] Third-party scripts audited and minimised

### Content & Legal
- [ ] All copy is final and proofread
- [ ] Privacy policy link in footer
- [ ] Terms of service link accessible
- [ ] Cookie consent banner functional (if required for market)
- [ ] Accessibility: page passes basic WCAG AA checks

### Functionality
- [ ] All CTAs work and link to correct destinations
- [ ] Forms submit correctly and trigger confirmation
- [ ] Add-to-cart works (if applicable)
- [ ] Checkout flow works end-to-end (test purchase on dev)
- [ ] Email notifications trigger correctly
- [ ] Mobile menu works
- [ ] Search works (if applicable)

## Go-Live Steps

Follow this sequence exactly.

### 1. Final Client Approval
- Send a final preview link with a Loom walkthrough
- Get explicit written approval (email or message) — verbal is not enough
- Confirm the go-live date and time with the client

### 2. Backup
- Download a full backup of the current live theme
- Export current theme settings
- Screenshot the current homepage and key pages (for comparison)

### 3. Publish
- Publish the new theme during low-traffic hours (early morning, ideally 6-8 AM in the store's primary timezone)
- If it's a single landing page, push the template and sections to the live theme
- Do NOT publish during a sale, product launch, or campaign peak

### 4. Immediate Post-Publish Checks (first 15 minutes)
- [ ] Homepage loads correctly
- [ ] New landing page loads correctly
- [ ] Navigation works
- [ ] Add-to-cart works
- [ ] Checkout works
- [ ] Mobile version renders correctly
- [ ] No console errors
- [ ] Tracking fires correctly (check GA4 real-time, check Pixel helper)

### 5. Notify Stakeholders
- Message the client confirming go-live
- Share the live URL
- Remind them of the 24-hour monitoring window

## Post-Launch Monitoring

### First 24 Hours
- Check GA4 for any traffic anomalies
- Monitor conversion rate vs. the previous period
- Check for any 404 errors in Search Console or server logs
- Review heatmap data (if Hotjar/MS Clarity installed)
- Be available for any urgent client feedback

### First 48 Hours
- Compare CVR, bounce rate, and session duration vs. baseline
- Check mobile vs. desktop performance split
- Review any customer complaints or support tickets related to the page
- Fix any minor issues flagged by the client

### First Week
- Full performance review:
  - Conversion rate comparison (before vs. after)
  - Page speed metrics (has anything degraded?)
  - User behaviour analysis (scroll depth, click patterns)
- Schedule a review call with the client to share findings
- Document what went well and what could improve for the next project

## Rollback Plan

If something goes seriously wrong after go-live:

### Severity: Critical (site broken, checkout down, major visual issues)
1. Immediately revert to the backup theme
2. Notify the client that you've rolled back
3. Diagnose the issue on the unpublished theme
4. Fix, test, and re-deploy

### Severity: Moderate (minor visual bugs, non-critical functionality)
1. Assess impact — if it's not hurting conversions, fix forward
2. Push a hotfix directly to the live theme (small, targeted changes only)
3. Notify the client of the issue and the fix timeline

### Severity: Low (cosmetic, no impact on functionality or conversions)
1. Log the issue
2. Fix in the next update cycle
3. No rollback needed

> **Always have the backup theme ready to publish for the first 48 hours after go-live.** Do not delete or overwrite it until the client confirms everything is stable.

## Client Sign-Off Process

### Pre-Launch Sign-Off
Send this to the client before go-live:

```
Subject: [Project Name] — Ready for Launch Approval

Hi [Client],

The [project] is ready to go live. Here's the final preview:
[Preview URL]

Please confirm:
1. All content is correct and approved
2. You're happy with the design on desktop and mobile
3. The go-live date of [date] works for you

Once you reply with approval, we'll proceed with deployment.
```

### Post-Launch Sign-Off
Send 1 week after launch:

```
Subject: [Project Name] — Post-Launch Review

Hi [Client],

It's been a week since we launched [project]. Here's a quick summary:
- [Key metric comparison]
- [Any issues found and resolved]
- [Recommendations for optimisation]

If everything looks good on your end, we'll consider this project complete. 
Any further changes will fall under a new scope or your retainer hours.
```

> **Get the post-launch sign-off in writing.** This closes the project formally and prevents scope creep weeks later.
