---
title: Performance
section: Delivery
subsection: Development
order: 624
---

Mobile performance is what matters. Over 70% of Shopify store traffic is mobile. If a page scores 98 on desktop and 45 on mobile, it's a failing page.

## Targets

Non-negotiable on every page we build.

| Metric | Target | Unacceptable |
| --- | --- | --- |
| LCP (Largest Contentful Paint) | Under 2.5s | Over 4.0s |
| CLS (Cumulative Layout Shift) | Under 0.1 | Over 0.25 |
| INP (Interaction to Next Paint) | Under 200ms | Over 500ms |
| Total page weight | Under 1.5MB | Over 3MB |
| PageSpeed mobile | 80+ | Under 60 |
| PageSpeed desktop | 90+ | Under 75 |

## Image rules

Images cause 60% of speed problems. Get this right.

### Format

| Use case | Format |
| --- | --- |
| Product photos | WebP |
| Lifestyle photography | WebP |
| Icons | SVG |
| Logos | SVG |
| Transparent backgrounds | WebP (PNG fallback) |
| Animated graphics | Avoid. CSS/JS animation, not GIFs |

### Size

| Context | Max width | Max file size |
| --- | --- | --- |
| Hero (full-width) | 1920px | 200KB |
| Product image | 800px | 100KB |
| Thumbnail | 400px | 40KB |
| Card image | 600px | 80KB |
| Background | 1920px | 150KB |
| OG image | 1200px | 100KB |

### Implementation

```liquid
{{ image | image_url: width: 800 | image_tag:
   loading: 'lazy',
   widths: '375, 550, 750, 1100, 1500',
   sizes: '(min-width: 1200px) 50vw, 100vw' }}
```

- **Lazy load everything below the fold.** Hero image is `loading="eager"` with `fetchpriority="high"`. Everything else: `loading="lazy"`.
- **Use Shopify's image CDN.** Don't upload pre-sized images. Use `image_url` with width params and let Shopify resize.
- **Always set width and height** attributes to prevent CLS.
- **Use `srcset` and `sizes`** so mobile doesn't download desktop-sized files.
- **Never use uncompressed PNGs** for photos. Compress before deploying.

## Code performance

### JavaScript

- Defer all JS via `defer` attribute. Nothing render-blocking.
- Inline critical JS only if under 1KB (above-fold interaction handlers).
- Remove unused JS. Many themes ship jQuery + libraries that aren't used.
- Event delegation over individual listeners.
- Debounce scroll/resize handlers.
- Never `document.write()`.

### CSS

- Inline critical above-the-fold CSS in `<style>` in `<head>`.
- Defer non-critical CSS via `rel="preload"`.
- Scope section CSS to the section file. Avoid massive global stylesheets.
- Remove unused CSS.
- Use CSS custom properties for repeated values.
- Avoid expensive CSS on mobile: large box shadows, complex filters, `backdrop-filter`.

### HTML

- Minimise DOM depth.
- Keep DOM under 1,500 elements. Over 3,000 is a problem.
- Semantic HTML over divs-with-ARIA.

## Shopify-specific

### App bloat is the biggest killer

> **Every Shopify app is a tax on page speed. Only keep the ones that drive measurable revenue. If an app adds 300ms and generates £0, remove it.**

Audit apps via Chrome DevTools > Network tab. Filter by JS and CSS. Identify which files come from `cdn.shopify.com/extensions/` or third-party domains. Measure total weight of app scripts.

Common offenders: review apps, chat widgets, currency converters, popup apps, upsell apps.

### Theme assets

- Audit `theme.liquid` — remove globally-loaded scripts only needed on specific pages.
- Conditionally load section assets — don't load FAQ JS on pages without FAQs.
- Use Shopify's `{% style %}` and `{% javascript %}` tags to scope assets.
- Preload critical fonts with `<link rel="preload">`.
- Limit web fonts to 2 families, 3-4 weights max.

### Liquid

- Avoid complex loops inside loops.
- Use `{% capture %}` for complex output instead of multiple `{{ }}` calls.
- Cache expensive Liquid operations in variables.

## Testing tools

| Tool | Use |
| --- | --- |
| PageSpeed Insights | Core Web Vitals, overall score |
| GTmetrix | Waterfall analysis |
| Chrome DevTools (Lighthouse) | Local dev testing |
| WebPageTest | Advanced testing, filmstrip comparison |
| Shopify Theme Inspector | Liquid render time profiling |

### Test properly

1. Mobile first. PageSpeed Insights with mobile selected.
2. Incognito window. Extensions skew results.
3. Run 3 times, take the median. Single runs are noisy.
4. Test from a location near the store's audience.
5. Clear cache. Real users don't have your assets cached.

## Ship vs optimise

**Optimise before shipping:**

- LCP over 4s on mobile
- CLS over 0.25 (visible layout jumps)
- Page weight over 3MB
- Render-blocking JS causing blank screen for 2+ seconds

**Ship now, optimise later:**

- PageSpeed 75 on mobile (aim for 80+ but don't block launch for 5 points)
- One non-critical image could be smaller
- A third-party app script is heavy but the client needs the app
- CSS could be more efficient but it works correctly

> **The best-performing page in the world converts zero visitors if it never launches.** Be fast enough, then focus on conversion. Speed supports conversion; it doesn't replace it.
