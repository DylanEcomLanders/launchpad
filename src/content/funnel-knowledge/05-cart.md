# Layer 5: Cart

## The Job of the Cart

The cart has one job: **maintain purchase momentum and transition the visitor to checkout without leaking conversion.** It has a secondary job: **increase AOV through strategic upsells — but only when this doesn't compromise the primary job.**

The cart sits at the most dangerous inflection point in the funnel. The visitor has committed (add-to-cart) but hasn't paid. They're in a liminal state — desire is high, but so is second-guessing. Every element in the cart either reinforces the purchase decision or creates a reason to pause, reconsider, or leave.

**Benchmark:** Cart-to-checkout initiation rate for DTC: 55-65%. If you're below 50%, the cart is actively killing your funnel.

---

## Cart Abandonment: What Actually Causes It

Cart abandonment is the most studied and least understood metric in ecommerce. The global cart abandonment rate hovers around 69-72%, but this number is misleading — it includes window shoppers, price comparison visitors, and people who use the cart as a wishlist.

The **real** question is: of people who genuinely intend to purchase, what stops them?

### The Abandonment Hierarchy (ordered by impact)

1. **Unexpected costs revealed (48% of abandonment)**
   - Shipping costs appearing for the first time in the cart
   - Tax calculations that significantly increase the total
   - The psychological contract was "£39.99" and suddenly it's "£47.98"
   - **This is the #1 conversion killer in all of ecommerce.** If you do nothing else, fix this.

2. **Required account creation (24-34%)**
   - "Create an account to continue" is a wall between desire and purchase
   - Even "Sign in or create account" creates friction
   - Guest checkout is not optional — it's required for conversion

3. **Complicated checkout process (17-22%)**
   - Too many steps, too many fields, too many decisions
   - Progress is unclear — "How much more of this is there?"
   - Cart → Checkout transition is confusing or broken on mobile

4. **Couldn't see total order cost upfront (16-20%)**
   - Related to #1 but subtly different — some carts don't show a running total
   - "We'll calculate shipping at checkout" is a conversion killer

5. **Didn't trust the site with card info (15-19%)**
   - Missing trust signals (SSL, payment badges, guarantee)
   - Site looks cheap, outdated, or unprofessional
   - No recognisable payment method (no PayPal, no Apple Pay)

6. **Delivery was too slow (12-16%)**
   - Expected delivery date not shown, or too far out
   - Amazon Prime has reset expectations — 3-5 business days feels slow for some categories

7. **Too many upsells / distractions (8-12%)**
   - Aggressive upsell pop-ups that interrupt the purchase flow
   - Cross-sell carousels that send people back to browsing
   - "Before you go..." modals that feel desperate

---

## Cart Design: The Fundamental Tension

Every cart faces the same design tension: **simplicity vs. revenue maximisation.**

A completely clean cart with nothing but items + checkout button converts the highest percentage of visitors to checkout. But it leaves AOV upside on the table.

A cart packed with upsells, cross-sells, progress bars, and messaging maximises potential AOV but can overwhelm and leak conversion.

**The right answer:** Start with a clean cart. Add ONE element at a time. Measure cart-to-checkout rate after each addition. Stop when the marginal conversion loss exceeds the marginal AOV gain. For most DTC brands, this means 1-2 upsell elements maximum.

---

## Cart Format: Drawer vs Full-Page vs Mini Cart

### Slide-Out Cart Drawer (Recommended for most DTC)
**What it is:** Cart slides in from the right side without navigating away from the current page.

**Why it works:**
- Doesn't break the browsing flow — visitor can close and continue shopping
- Reduces friction: fewer page loads between add-to-cart and checkout
- Keeps the purchase context visible (they can see the PDP behind the drawer)
- Mobile-native: feels like a natural app interaction

**When it fails:**
- When it's too narrow to display product images and details clearly
- When upsells are crammed in and make it feel cluttered
- When the "X" to close is too small on mobile (fat finger problem)

**Best-in-class examples:** Ridge, Gymshark, Allbirds — clean drawer with product thumbnail, quantity, price, and a prominent checkout CTA.

### Full-Page Cart
**What it is:** Dedicated /cart page with full-width layout.

**Why it works:**
- More space for upsells, cross-sells, and messaging
- Better for complex orders (multiple items, variants, customisation)
- Can include detailed shipping estimates, promo code fields, and trust messaging

**When it fails:**
- Creates an extra click between PDP and checkout
- Higher abandonment because the visitor is now "in the cart" — the browsing spell is broken
- Often poorly designed on mobile (too much scroll, CTA below the fold)

**When to use it:** High-AOV products, stores with complex configuration (e.g., custom bundles), B2B-adjacent DTC.

### Mini Cart (Header Dropdown)
**What it is:** Small dropdown from the cart icon showing items.

**Why it works:** Minimal, fast, doesn't interrupt browsing.

**When it fails:** Too small for anything useful — hard to show upsells, trust signals, or order details. Works only as a "quick peek" before navigating to a proper cart.

**Verdict:** Use a cart drawer for most DTC brands. Use a full-page cart only if you have a strong AOV/upsell strategy that needs the space.

---

## Essential Cart Elements

### Product Line Items
**What to show:**
- Product image (thumbnail, minimum 60x60px, ideally 80x80px)
- Product name and variant (color, size)
- Unit price (and crossed-out original if on sale)
- Quantity selector (with +/- buttons, not just a dropdown)
- Line item total
- Remove button (but don't make it the most prominent element)

**What good looks like:**
- Clean, scannable layout
- Variant details clearly visible (don't make them guess which size they picked)
- Quantity selector is easy to use on mobile (large touch targets)
- Each line item has enough visual weight to feel "real" — tiny thumbnails make the purchase feel insignificant

**What bad looks like:**
- No product image (the visitor can't confirm what they're buying)
- Variant details hidden or truncated
- Quantity selector is a tiny dropdown that's impossible to use on mobile
- Remove button is a red "X" that screams "delete this" — it should be subtle, not prominent

### Order Summary
**What to show:**
- Subtotal
- Shipping estimate (or "FREE" — this is a moment to celebrate, not hide)
- Tax (if applicable, show it; don't surprise them at checkout)
- Discount applied (show the code and the savings amount)
- **Order total — the number they will pay**

**Critical rule:** The total in the cart should match (or be very close to) the total at checkout. Any surprise increase between cart and checkout payment is an abandonment trigger.

### Checkout CTA
**Placement:** Fixed at the bottom of the cart (especially on mobile). The CTA must ALWAYS be visible without scrolling.

**Copy:** "Checkout" or "Proceed to Checkout" — not "Continue" (ambiguous) or "Buy Now" (premature, they haven't entered payment yet).

**Design:** Full-width on mobile, high contrast, unmissable. This is the single most important button on the page.

**Secondary CTA:** "Continue Shopping" or a link back — but make it visually subordinate. You want them to check out, not go back to browsing.

### Express Checkout Buttons
**What:** Apple Pay, Google Pay, Shop Pay, PayPal Express — displayed ABOVE the standard checkout CTA.

**Why:** These reduce the entire checkout to 1-2 taps. For mobile users, this can increase conversion 10-30%.

**Placement:** Top of cart drawer or immediately below the order total. These should be the first thing the visitor sees after reviewing their items.

**What bad looks like:** Express checkout buttons buried below upsells, or not present at all. If you're on Shopify and haven't enabled Shop Pay + Apple Pay, you're leaving significant revenue on the table.

---

## In-Cart Upsells

### When They Help
- When they're contextually relevant to what's in the cart
- When they increase order value without requiring the visitor to leave the cart
- When they're priced as "add-ons" (< 20-30% of cart value)
- When they're presented as helpful ("Customers also bought...") not pushy

### When They Leak Conversion
- When they require the visitor to make complex decisions (choose size, color, variant)
- When they link to other PDPs (now you've sent them back to browsing)
- When there are too many options (choice paralysis)
- When they feel manipulative or unrelated to the purchase

### High-Performing Upsell Patterns

**1. "Frequently Bought Together" (1-2 products)**
- Show products that genuinely pair with what's in the cart
- One-click add (no variant selection needed)
- Show the combined savings
- Example: Ridge wallet → "Add Keycase — £29 (Save 15% when bundled)"

**2. Free Shipping Progress Bar**
- "You're £12 away from FREE shipping!"
- With a visual progress bar showing how close they are
- This is the single most effective AOV lever in the cart
- Works because it reframes the upsell as "saving money" (avoiding shipping cost) rather than "spending more"
- Optimal threshold: 20-30% above current AOV

**3. Warranty / Protection Plan**
- Especially effective for electronics, accessories, premium products
- Simple checkbox: "Add 2-year protection — £4.99"
- Take rates: 15-25% for well-positioned product protection
- Pure margin — often fulfilled through third-party providers

**4. Subscription Upsell**
- "Subscribe & Save 15%"
- Works for consumables: supplements, food, skincare, coffee
- Show the per-unit savings and emphasise flexibility ("cancel anytime")
- Don't auto-enrol — let them choose

**5. Sample / Travel Size Add-On**
- Low-price, low-commitment add-on
- "Try our new [product] — just £3.99"
- Works as both revenue and product discovery

### What Bad Looks Like
- Full-width product carousels in the cart with 8+ products
- Upsell modals that pop up and block the checkout CTA
- Upsells that require variant selection (now they're shopping again, not checking out)
- Upsell text that's bigger and more prominent than the checkout button
- Discount code field that sends them to Google to find a code (put the code IN the cart if you're running a promo)

---

## Progress Indicators

### Free Shipping Threshold Bar
**The most effective progress indicator in the cart.**

**Mechanics:**
- Show a progress bar: "You're £X away from free shipping!"
- When threshold is met: "You've unlocked FREE shipping!" (celebrate it)
- The threshold should be 20-30% above your average AOV
- Example: If AOV is £50, set free shipping at £65

**Psychology:** Loss aversion. The visitor feels like they're "losing" free shipping if they don't add a bit more. This reframes spending as saving.

**Impact:** Well-implemented free shipping thresholds increase AOV by 12-25% with minimal conversion impact.

**What bad looks like:**
- Threshold set too high (AOV is £40, threshold is £100 — feels unachievable)
- Threshold set too low (below current AOV — no incentive to add more)
- No visual progress indicator (just text saying "Free shipping over £65")
- Not updating dynamically as items are added/removed

### Discount Indicator
- "You're saving £12.50 on this order!" — reinforce the value of their purchase
- Show the discount prominently near the total
- If a promo code is applied, show the code name and the savings amount

---

## Trust Signals in the Cart

### What to Include
1. **Payment method logos** — Visa, Mastercard, Amex, PayPal, Apple Pay, Klarna
2. **Security language** — "Secure checkout" with a lock icon (near the CTA)
3. **Guarantee reminder** — "30-day money-back guarantee" (one line, near total)
4. **Return policy** — "Free returns within 30 days" (if you offer it)
5. **Delivery estimate** — "Estimated delivery: Wed 26 - Fri 28 March"

### What NOT to Include
- Walls of trust badges that make the cart look like a used car dealership
- Generic "100% Satisfaction Guaranteed" without specifics
- SSL certificate details that no customer understands

### Placement
Trust signals should be near the order total and checkout CTA — this is where anxiety peaks. A small "Secure checkout" badge next to the checkout button does more than five trust badges scattered around the page.

---

## Mobile Cart Behaviour

### Why Most DTC Brands Lose Here

Mobile represents 70%+ of traffic for most DTC brands, but mobile cart behaviour is fundamentally different from desktop:

1. **Screen real estate is tiny** — everything competes for space
2. **Thumb reach matters** — the checkout CTA must be in the natural thumb zone (bottom of screen)
3. **Scrolling is the enemy** — if the visitor has to scroll past upsells to find the checkout button, you'll lose them
4. **Fat fingers** — tap targets must be large (minimum 44x44px), and interactive elements must have spacing

### Mobile Cart Checklist
- [ ] Checkout CTA is fixed at the bottom of the screen (sticky)
- [ ] Product images are large enough to recognise (minimum 60px)
- [ ] Quantity selectors are tap-friendly (+/- buttons, not dropdowns)
- [ ] Order total is visible without scrolling
- [ ] Upsells don't push the checkout CTA below the fold
- [ ] Remove button is accessible but not accidentally tappable
- [ ] Free shipping progress bar is visible near the top
- [ ] Express checkout (Apple Pay, Shop Pay) is above the standard CTA
- [ ] Cart drawer opens smoothly without jarring page jumps

### What Bad Looks Like on Mobile
- Checkout CTA is below two rows of upsell products — requires scrolling
- Quantity selector is a dropdown that opens a tiny picker wheel
- Product names are truncated to "Premium Org..." with no way to see the full name
- Cart takes 2+ seconds to load after tapping the cart icon
- Upsell images are so large they push everything else down

---

## The Cart-to-Checkout Drop-Off

### What the Data Shows
- Average cart-to-checkout drop-off: 35-45%
- This means for every 100 people who add to cart, only 55-65 initiate checkout
- Of those, only 28-35% complete the purchase
- **Compound effect:** From ATC to purchase, you lose 75-85% of visitors

### Where They Go
1. **Saved for later** — Many visitors use the cart as a consideration list, not a purchase list. They'll come back (maybe). This is especially true on mobile.
2. **Shipping shock** — They saw the total with shipping and bailed. This is the #1 fixable cause.
3. **Decision reversal** — Seeing all items together triggers re-evaluation. "Do I really need all of this?"
4. **Distraction** — Phone notification, child crying, cat on keyboard. Cart abandonment emails exist for this reason.
5. **Comparison shopping** — They've added to cart to "save" the configuration, then go check competitor prices.

### How to Reduce the Drop-Off
1. **Show shipping costs early** — On the PDP if possible, definitely in the cart
2. **Use a free shipping threshold** — Give them a reason to add more, not leave
3. **Minimise cart complexity** — Every additional element is a potential distraction
4. **Enable express checkout** — Apple Pay, Shop Pay reduce the journey to 1-2 taps
5. **Implement cart abandonment flows** — Email within 1 hour, SMS within 2 hours
6. **Sticky checkout CTA** — Never let the checkout button scroll out of view
7. **Show delivery estimates** — "Get it by Wednesday" reduces uncertainty

---

## Promo Code Field: The Necessary Evil

### The Problem
A visible promo code field sends 5-15% of visitors to Google to search for a discount code. Some never come back. Others find a code that shouldn't work and get frustrated. The promo code field is a conversion leak.

### The Solutions

**Option 1: Auto-apply active promotions**
- If you're running a site-wide 15% off, apply it automatically in the cart
- Show "15% Holiday Sale Applied — You're saving £8.50"
- No code field needed

**Option 2: Collapsed/hidden code field**
- Show a small "Have a promo code?" link that expands to show the field
- Don't make it a prominent input field visible by default
- This reduces the "I should find a code" trigger

**Option 3: URL-based codes**
- Apply codes via URL parameters from email/SMS campaigns
- The code is pre-applied when they reach the cart
- No manual entry needed

**What bad looks like:**
- A giant, empty promo code field prominently displayed above the checkout CTA
- No validation message when an expired code is entered (just... nothing happens)
- Code field that requires clicking "Apply" with no feedback for 3+ seconds

---

## How to Audit a Cart

### The 15-Question Cart Audit

1. Does the cart show product images, names, variants, quantities, and prices clearly?
2. Is the order total (including shipping and tax) visible without scrolling?
3. Are there any surprise costs that weren't visible on the PDP?
4. Is the checkout CTA visible at all times (sticky on mobile)?
5. Are express checkout options (Apple Pay, Shop Pay, PayPal) available and prominent?
6. Is there a free shipping threshold indicator? Is the threshold set correctly (20-30% above AOV)?
7. Are upsells relevant, limited (1-2 max), and one-click add?
8. Do upsells push the checkout CTA below the fold on mobile?
9. Is there a promo code field? Is it hidden by default?
10. Are trust signals present near the checkout CTA?
11. Is the cart format (drawer/page) appropriate for the product type and traffic?
12. Can users easily modify quantity or remove items?
13. Is the cart loading fast (< 1 second)?
14. Does the cart show a delivery estimate?
15. On mobile: are all interactive elements tap-friendly (44x44px minimum)?

### The "Add and Checkout" Test
Add a product to the cart and try to check out. Time it. Count the clicks. Count the decisions you have to make. If it takes more than 3 clicks and 10 seconds from add-to-cart to checkout initiation, there's friction to remove.

---

## Test Hypotheses for Cart Optimisation

| # | Hypothesis | ICE Score Guidance | Layer |
|---|-----------|-------------------|-------|
| 1 | Adding a free shipping progress bar at the top of the cart drawer will increase AOV by 10-15% | I:8 C:8 E:9 = 25 | Cart |
| 2 | Replacing the full-page cart with a slide-out drawer will increase cart-to-checkout rate by 5-10% | I:7 C:7 E:7 = 21 | Cart |
| 3 | Adding Apple Pay / Shop Pay express checkout buttons above the standard CTA will increase checkout initiation by 8-15% | I:8 C:8 E:8 = 24 | Cart |
| 4 | Reducing cart upsells from 4 products to 1 relevant product will increase cart-to-checkout rate by 3-5% | I:6 C:7 E:9 = 22 | Cart |
| 5 | Making the checkout CTA sticky (fixed bottom) on mobile will increase cart-to-checkout rate by 5-8% | I:7 C:8 E:9 = 24 | Cart |
| 6 | Collapsing the promo code field behind a "Have a code?" link will reduce cart abandonment by 3-5% | I:5 C:6 E:9 = 20 | Cart |
| 7 | Adding a delivery date estimate ("Get it by Wednesday") in the cart will increase checkout initiation by 3-6% | I:6 C:7 E:7 = 20 | Cart |
| 8 | Adding a one-click warranty/protection add-on (< 15% of cart value) will increase AOV by 5-8% with 15-25% take rate | I:7 C:7 E:7 = 21 | Cart |
| 9 | Showing "You're saving £X" in the cart when a discount is applied will increase checkout completion by 2-4% | I:5 C:6 E:9 = 20 | Cart |
| 10 | Auto-applying the active site-wide promo code instead of requiring manual entry will increase cart-to-checkout rate by 4-7% | I:6 C:7 E:6 = 19 | Cart |

---

## Interconnections

### PDP → Cart
Expectations set on the PDP must be honoured in the cart:
- If the PDP says "Free shipping," the cart must show free shipping
- If the PDP shows a price, the cart line item must match
- If the PDP shows "Subscribe & Save 15%," the cart must clearly show the subscription is applied

### Cart → Checkout
The cart-to-checkout transition is where intent meets friction:
- The total in the cart should match the total at checkout (or be very close)
- If the cart shows express checkout, the checkout should honour that path
- Trust signals in the cart prime expectations for a secure checkout

### Offer Architecture → Cart
The cart is where offer architecture becomes real:
- Free shipping thresholds drive AOV behavior in the cart
- Bundle pricing and subscription offers must be clearly displayed
- Upsell strategy is executed in the cart (but designed in offer architecture)
