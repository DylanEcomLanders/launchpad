# Performance & Page Speed

## Target Metrics

These are the targets for every page we build or optimise. Non-negotiable.

| Metric | Target | Unacceptable |
|--------|--------|-------------|
| LCP (Largest Contentful Paint) | Under 2.5s | Over 4.0s |
| CLS (Cumulative Layout Shift) | Under 0.1 | Over 0.25 |
| FID (First Input Delay) | Under 100ms | Over 300ms |
| INP (Interaction to Next Paint) | Under 200ms | Over 500ms |
| Total Page Weight | Under 1.5MB | Over 3MB |
| PageSpeed Mobile Score | 80+ | Under 60 |
| PageSpeed Desktop Score | 90+ | Under 75 |

> **Mobile performance is what matters most.** Over 70% of Shopify store traffic is mobile. If a page scores 98 on desktop and 45 on mobile, it's a failing page.

## Image Optimisation

Images are the number one performance killer on Shopify stores. Get this right and you solve 60% of speed problems.

### Format Selection

| Use Case | Format | Why |
|----------|--------|-----|
| Product photos | WebP | Best balance of quality and compression |
| Lifestyle photography | WebP | Lossy compression is fine for photos |
| Icons | SVG | Scalable, tiny file size, crisp at any resolution |
| Logos | SVG | Same as above |
| Transparent backgrounds | WebP or PNG | WebP preferred, PNG as fallback |
| Animated graphics | Avoid if possible | Use CSS/JS animation instead of GIFs |

### Size Guidelines

| Context | Max Width | Max File Size |
|---------|----------|--------------|
| Hero (full-width) | 1920px | 200KB |
| Product image | 800px | 100KB |
| Thumbnail | 400px | 40KB |
| Card image | 600px | 80KB |
| Background | 1920px | 150KB |
| OG image | 1200px | 100KB |

### Implementation

```liquid
<!-- Responsive image with lazy loading -->
{{ image | image_url: width: 800 | image_tag: 
   loading: 'lazy', 
   widths: '375, 550, 750, 1100, 1500',
   sizes: '(min-width: 1200px) 50vw, 100vw' }}
```

### Rules
- **Lazy load everything below the fold.** The hero image should be `loading="eager"` with `fetchpriority="high"`. Everything else: `loading="lazy"`
- **Use Shopify's image CDN** — don't upload pre-sized images. Use `image_url` with width parameters and let Shopify resize and serve from their CDN
- **Specify width and height** attributes on all images to prevent CLS
- **Use `srcset` and `sizes`** for responsive images so mobile doesn't download desktop-sized files
- **Never use uncompressed PNGs** for photos. If someone uploads a 5MB PNG, compress it before deploying

## Code Performance

### JavaScript
- **Defer all JS:** Use `defer` attribute on script tags. Nothing should be render-blocking
  ```html
  <script src="script.js" defer></script>
  ```
- **Inline critical JS** if it's under 1KB (e.g., above-fold interaction handlers)
- **Remove unused JS.** Audit what's actually needed. Many themes ship jQuery + multiple libraries that aren't used
- **Event delegation** over individual event listeners
- **Debounce scroll/resize handlers** — don't fire expensive calculations on every pixel
- **Avoid `document.write()`** — it blocks parsing

### CSS
- **Critical CSS first:** Inline above-the-fold CSS in a `<style>` tag in the `<head>`
- **Defer non-critical CSS:** Load below-fold styles asynchronously
  ```html
  <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  ```
- **Scope section CSS** to the section file. Avoid one massive global stylesheet
- **Remove unused CSS.** Dead CSS still gets downloaded and parsed
- **Use CSS custom properties** for repeated values instead of duplicating declarations
- **Avoid expensive CSS:** Large box shadows, complex filters, and `backdrop-filter` on mobile are costly. Use them sparingly

### HTML
- **Minimise DOM depth.** Deep nesting slows down style calculations and layout
- **Keep DOM size reasonable.** Under 1,500 elements is ideal. Over 3,000 is a problem
- **Use semantic HTML** — it's lighter and more accessible than divs-with-ARIA

## Shopify-Specific Performance

### App Bloat
The biggest performance problem on most Shopify stores is installed apps injecting scripts.

**Before any performance work, audit the apps:**
1. Open Chrome DevTools > Network tab
2. Filter by JS and CSS
3. Identify which files belong to apps (usually from `cdn.shopify.com/extensions/` or third-party domains)
4. Measure the total weight of app scripts
5. Discuss with the client: Is this app worth 200KB of JavaScript?

**Common offenders:**
- Review apps (injecting full carousels and star widgets)
- Chat widgets (loading entire chat frameworks on every page)
- Currency converters
- Pop-up/overlay apps
- Upsell/cross-sell apps

> **Every Shopify app you install is a tax on page speed.** Only keep the ones that directly drive revenue. If an app adds 300ms to load time and generates $0 in measurable revenue, remove it.

### Theme Asset Optimisation
- **Audit `theme.liquid`** — remove any scripts or styles loaded globally that are only needed on specific pages
- **Conditionally load section assets** — don't load FAQ JS on pages that don't have an FAQ section
- **Use Shopify's built-in `{% style %}` and `{% javascript %}` tags** — they scope assets to the section
- **Preload critical fonts** with `<link rel="preload">`
- **Limit web fonts** to 2 families, 3-4 weights maximum. Every font weight is an HTTP request

### Liquid Performance
- **Avoid complex loops inside loops** — they multiply render time
- **Use `{% capture %}` for complex output** instead of multiple `{{ }}` calls
- **Cache expensive Liquid operations** in variables instead of recalculating
- **Don't use `forloop` for complex calculations** — keep Liquid logic simple

## Speed Testing Tools

| Tool | Use For | URL |
|------|---------|-----|
| PageSpeed Insights | Core Web Vitals, overall score | pagespeed.web.dev |
| GTmetrix | Waterfall analysis, detailed breakdown | gtmetrix.com |
| Chrome DevTools (Lighthouse) | Local testing during development | Built into Chrome |
| Chrome DevTools (Performance tab) | Debugging specific performance issues | Built into Chrome |
| WebPageTest | Advanced testing, filmstrip comparison | webpagetest.org |
| Shopify Theme Inspector | Liquid render time profiling | Chrome extension |

### How to Test Properly
1. **Test on mobile first** — use PageSpeed Insights with mobile selected
2. **Test from an incognito window** — extensions can skew results
3. **Test 3 times and take the median** — single runs can be noisy
4. **Test from a location near the store's audience** — a UK store tested from Australia will look slow
5. **Test with a cleared cache** — real users don't have your assets cached

## When to Optimise vs When to Ship

### Optimise Before Shipping
- LCP over 4 seconds on mobile
- CLS over 0.25 (visible layout jumps)
- Page weight over 3MB
- Render-blocking JavaScript causing blank screen for 2+ seconds

### Ship Now, Optimise Later
- PageSpeed score is 75 on mobile (aim for 80+ but don't block launch for 5 points)
- One non-critical image could be smaller
- A third-party app script is heavy but the client needs the app
- CSS could be more efficiently structured but it works correctly

### The Performance vs Perfectionism Line
A page that scores 85 on PageSpeed and ships this week is better than a page that scores 95 and ships next month. Performance matters, but it's not the only thing that matters. Hit the targets, ship the work, and optimise iteratively.

> **The best-performing page in the world converts zero visitors if it never launches.** Be fast enough, then focus on conversion. Speed supports conversion — it doesn't replace it.
