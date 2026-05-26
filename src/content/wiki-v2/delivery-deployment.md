---
title: Deployment
section: Delivery
subsection: Development
order: 623
---

Going live is the part of the project where mistakes are most expensive. Every page goes through the same pre-launch checks, the same go-live sequence, and the same post-launch monitoring window. No shortcuts.

## Pre-launch checklist

Every item before going live. No exceptions.

### Tracking & analytics

- [ ] GA4 installed and receiving data
- [ ] GA4 events: page_view, add_to_cart, begin_checkout, purchase
- [ ] Meta Pixel installed (if FB/IG ads running)
- [ ] Google Ads conversion tracking installed (if Google Ads running)
- [ ] UTM parameters tested on key URLs
- [ ] Shopify native analytics verified

### SEO & meta

- [ ] Page title set (under 60 chars)
- [ ] Meta description (under 155 chars)
- [ ] OG image uploaded (1200x630)
- [ ] OG title and description set
- [ ] Canonical URL correct
- [ ] robots.txt not blocking the page
- [ ] Sitemap includes the new page
- [ ] Schema markup where relevant (Product, FAQ, Review)

### Redirects

- [ ] Old URLs redirected to new pages
- [ ] All internal links point to correct URLs
- [ ] No broken links
- [ ] 404 page styled and helpful

### Performance

- [ ] PageSpeed: 80+ mobile, 90+ desktop
- [ ] LCP under 2.5s on mobile
- [ ] CLS under 0.1
- [ ] Images optimised (WebP, compressed, lazy-loaded)
- [ ] No render-blocking resources
- [ ] Third-party scripts audited

### Content & legal

- [ ] All copy final and proofread
- [ ] Privacy policy link in footer
- [ ] Terms of service link accessible
- [ ] Cookie consent (if required for market)
- [ ] Accessibility: passes basic WCAG AA

### Functionality

- [ ] All CTAs link to correct destinations
- [ ] Forms submit correctly and trigger confirmation
- [ ] Add-to-cart works
- [ ] Checkout flow works end-to-end (test purchase on dev)
- [ ] Email notifications trigger correctly
- [ ] Mobile menu works
- [ ] Search works

## Go-live sequence

Follow exactly.

1. **Final client approval** — preview link + Loom, explicit written approval (not verbal), go-live date confirmed.
2. **Backup** — download full backup of current live theme, export settings, screenshot current key pages.
3. **Publish** — during low-traffic hours (early morning, ideally 6-8 AM store-time). Never during a sale, launch, or campaign peak.
4. **First 15 minutes** — homepage loads, new page loads, navigation works, add-to-cart works, checkout works, mobile renders, no console errors, tracking fires (GA4 real-time + Pixel helper).
5. **Notify stakeholders** — message the client confirming go-live, share live URL, remind them of the 24-hour monitoring window.

## Post-launch monitoring

| Window | What we check |
| --- | --- |
| **First 24 hours** | GA4 anomalies, CVR vs previous period, 404s in Search Console, heatmap data, urgent client feedback |
| **First 48 hours** | CVR / bounce / session duration vs baseline, mobile vs desktop split, customer complaints, minor issue fixes |
| **First week** | Full performance review (CVR, page speed, user behaviour), schedule review call with client, document what went well |

## Rollback plan

> **Always keep the backup theme ready to publish for the first 48 hours after go-live. Don't delete or overwrite it until the client confirms everything is stable.**

| Severity | Examples | Response |
| --- | --- | --- |
| **Critical** | Site broken, checkout down, major visual issues | Immediately revert to backup. Notify client. Diagnose on the unpublished theme. Fix, test, re-deploy. |
| **Moderate** | Minor visual bugs, non-critical functionality | Assess impact. If not hurting CVR, fix forward with a hotfix to live (small, targeted changes only). Notify client. |
| **Low** | Cosmetic, no impact | Log it. Fix in the next update cycle. No rollback. |

## Sign-off

**Before launch**:

```
Subject: [Project] — Ready for Launch Approval

The [project] is ready to go live. Final preview: [URL]

Please confirm:
1. All content is correct and approved
2. You're happy with the design on desktop and mobile
3. The go-live date of [date] works

Once you reply with approval, we'll deploy.
```

**One week after launch**:

```
Subject: [Project] — Post-Launch Review

It's been a week since we launched [project]. Quick summary:
- [Key metric comparison]
- [Any issues found and resolved]
- [Recommendations for optimisation]

If everything looks good your end, we'll consider this project complete.
Further changes fall under a new scope or your retainer hours.
```

> **Get post-launch sign-off in writing.** Closes the project formally and prevents scope creep weeks later.
