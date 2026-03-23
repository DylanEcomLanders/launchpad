# 06 - Checkout

> The checkout does not exist to sell. The selling is done. The checkout exists to capture the transaction with the least possible friction while maintaining the trust you spent the entire funnel building. Every unnecessary field, every surprise cost, every moment of confusion is a leak in a bucket you spent real money filling.

---

## The Job of the Checkout

### What This Element Does

The checkout has exactly one job: convert intent into a completed transaction. By the time a customer reaches checkout, they have already decided to buy. They found your product, read the copy, looked at the reviews, added to cart, and clicked "Checkout." The decision is made. Your only job now is to not screw it up.

This is a critical mental model shift. Most brands treat checkout as another selling opportunity. It is not. It is a transaction capture mechanism. Every element that does not directly serve "take money, confirm order, deliver goods" is a potential exit point.

### The Psychology Behind It

Checkout is where **payment pain** peaks. Behavioral economists have documented this extensively: the act of paying activates the same neural regions associated with physical pain (the insula). This is not metaphorical. Handing over money literally hurts.

Design mitigates payment pain in several ways:
- **Speed**: The faster the transaction, the less time the pain has to register. Apple Pay completes in under 2 seconds. That is not a convenience feature. It is a pain-reduction mechanism.
- **Abstraction**: Credit cards hurt less than cash. Digital wallets hurt less than credit cards. The more abstracted the payment, the less the pain signal fires.
- **Anchoring**: Showing the order summary with the value proposition (what they are getting) alongside the price reframes the transaction as an exchange rather than a loss.
- **Trust**: Anxiety about fraud, about whether the product will arrive, about whether it will work as promised -- all of these compound on top of payment pain. Trust signals at checkout are not decoration. They are anxiety medication.

The average DTC checkout abandonment rate sits between 68-72%, and it has been remarkably stable for years. That number is not a benchmark to accept. It is a diagnosis. It means roughly 7 out of 10 people who begin the checkout process do not complete it. The reasons are well-documented: unexpected costs (shipping, taxes, fees) account for roughly 48% of abandonments. Forced account creation causes 24-34%. Complicated or too-long checkout processes cause 17-22%. Trust concerns around payment security account for 15-19%.

Every percentage point you recover from that 70% abandonment rate drops straight to the bottom line with zero additional ad spend.

### What Good Looks Like

**Ridge Wallet** runs an exceptionally clean Shopify checkout. Express checkout options (Shop Pay, Apple Pay, Google Pay, PayPal) sit above the fold on mobile. Guest checkout is the default. The form is tight -- email, shipping, payment. No surprises. Shipping cost is visible before you enter any information because they have already communicated their free shipping threshold throughout the funnel.

**Gymshark** handles high-volume checkout with a streamlined single-page experience. They support region-specific payment methods (Klarna in the UK and Europe, Afterpay in Australia) and display delivery estimates prominently. The checkout feels fast because it is fast -- minimal fields, smart defaults, express options front and center.

**DRMTLGY** uses a clean checkout with a well-placed order bump for their SPF product. The bump sits between shipping and payment, priced at a trivial add-on relative to the skincare order. Take rate on that bump reportedly runs 15-20%.

### What Bad Looks Like

A supplement brand I audited had 14 form fields on their checkout page, including separate fields for "first name" and "last name" on the billing address even though "billing same as shipping" was checked. They also had a mandatory phone number field with no explanation for why it was needed. Their checkout abandonment rate was 81%.

A fashion brand forced account creation before checkout with a modal that said "Create an account to continue." No guest checkout option. No Shop Pay. No express checkout. They were losing an estimated 30% of their checkout traffic to that single modal.

Another brand -- a home goods store -- hid shipping costs until the final step of a three-step checkout. Customers would enter their email, fill in their shipping address, and then discover a $12.99 shipping fee on a $35 order. The rage-quit rate at that step was staggering. Their session recordings showed users literally scrolling up and down looking for where to go back before just closing the tab.

### How to Audit It

1. Go buy something from the store yourself. On mobile. Time it from "Begin Checkout" to "Order Confirmed." If it takes more than 90 seconds on mobile, something is broken.
2. Count every single form field. Every one. Include the ones hidden behind "billing same as shipping" toggles.
3. Check what happens when you enter an invalid email or leave a required field blank. Does it catch it inline, or does it wait until you hit submit and then scroll you to the top?
4. Check what payment methods are available. No Apple Pay on mobile is leaving money on the table.
5. Look at the checkout on a 375px wide screen. Can you complete every field without horizontal scrolling? Are the tap targets large enough?

### Test Hypotheses

- **H1**: Enabling Shop Pay and Apple Pay as express checkout options will increase mobile checkout completion rate by 8-15%. (ICE: 9/9/10)
- **H2**: Removing the forced account creation modal and defaulting to guest checkout will reduce checkout abandonment by 15-25%. (ICE: 10/10/10)

---

## Checkout Friction

### What This Element Does

Every form field is a micro-decision. Every micro-decision is a potential exit point. Checkout friction is the cumulative drag of all the steps, fields, clicks, and cognitive load standing between "I want to buy this" and "Order confirmed." Your job is to eliminate every gram of friction that does not directly serve completing the transaction.

### The Psychology Behind It

This is the **Zeigarnik effect** in reverse. People feel tension from incomplete tasks, which can motivate them to finish. But there is a threshold. If the perceived effort to complete exceeds the perceived reward of completing, people abandon. Every field you add raises the perceived effort. Every moment of confusion, every error message, every page load pushes the customer closer to that threshold.

There is also **decision fatigue**. By the time someone reaches checkout, they have already made dozens of micro-decisions throughout your funnel: which product, which variant, which size, add to cart, review cart, proceed to checkout. They are cognitively depleted. The checkout must demand as little additional cognitive effort as possible.

### What Good Looks Like

**Graza** keeps their checkout extremely lean. Email first (so they can recover the abandonment), then shipping, then payment. Defaults are smart -- country auto-detected from IP, "billing same as shipping" pre-checked, express checkout options prominent. The entire experience feels like it was designed by someone who has personally abandoned a hundred checkouts and is angry about every one of them.

The best checkouts share these traits:
- **8 or fewer visible fields** (email, first name, last name, address line 1, city, state/province, postcode, phone -- and phone should be optional)
- **Address auto-complete** via Google Places API or similar. When a customer starts typing their address and it auto-fills, you have just eliminated 4-5 fields worth of effort.
- **Postcode lookup** (especially critical in the UK market where Royal Mail PAF data can auto-fill the entire address from a postcode)
- **Inline validation** that catches errors as they happen, not after form submission. The field border goes red, a small error message appears below the field, and the customer fixes it immediately rather than submitting, scrolling back up, hunting for the error, and losing momentum.
- **Auto-advancing fields**: when the postcode field is filled and the city/state auto-populate, the cursor advances to the next field automatically.

### What Bad Looks Like

A skincare brand had "Company Name" as a required field in their checkout. For a DTC skincare brand selling $28 moisturizers to consumers. They were asking 22-year-olds buying face cream what company they work for. That field had a 100% rage-click rate in their session recordings.

Another failure pattern: error handling that clears the entire form on submission failure. Customer fills in 12 fields, hits "Complete Order," the payment fails (expired card), and the page reloads with every field empty. That customer is gone forever.

The "Create Account" checkbox that is pre-checked with a password field that appears is another classic friction adder. The customer did not come here to create a relationship with your brand. They came here to buy a product. Let them buy the product.

### How to Audit It

1. Count total fields visible on the checkout page. Best-in-class is 7-8. Anything above 12 is a problem.
2. Try to complete checkout with browser auto-fill. Does it work cleanly? Do fields get misassigned?
3. Intentionally enter an invalid email. Does the error show inline or on submit?
4. Intentionally leave the address field blank and submit. What happens?
5. Check if "Company" or "Address Line 2" are required or optional. They should always be optional and ideally hidden behind a "Add apartment, suite, etc." link.
6. On mobile, tap into the phone number field. Does a numeric keypad appear? Tap into the email field. Does an email-optimized keyboard appear (with @ and .com)?
7. Look at the address entry. Is Google Places auto-complete enabled? If not, you are making customers type their full address manually, which on mobile is a 30-second friction event.

### Test Hypotheses

- **H3**: Adding Google Places address auto-complete will reduce checkout completion time by 20-30 seconds and increase completion rate by 3-5%. (ICE: 8/8/9)
- **H4**: Hiding "Address Line 2" behind an expandable link (instead of showing it as a visible field) will reduce perceived form complexity and increase completion rate by 1-2%. (ICE: 7/9/10)
- **H5**: Switching from submit-then-error validation to inline real-time validation will reduce form abandonment by 5-10%. (ICE: 8/7/8)

---

## Guest Checkout vs Account Creation

### What This Element Does

This is the decision about whether to require, encourage, or bypass account creation during the checkout flow. It is one of the most consequential UX decisions in all of ecommerce.

### The Psychology Behind It

Forced account creation introduces a completely new task into a task the customer has already mentally committed to (buying). It is a context switch. The customer was in "buying mode" and you have just yanked them into "admin mode" -- choose a password, confirm the password, maybe verify an email. The cognitive cost is enormous relative to the benefit (which, from the customer's perspective, is zero at the moment of purchase).

The Baymard Institute has consistently found that forced account creation is the second-largest cause of checkout abandonment after unexpected costs. Their data shows 24% of US online shoppers have abandoned a checkout specifically because the site wanted them to create an account. Other studies put this as high as 34%.

The reason is simple: the customer perceives no value in creating an account at that moment. They want the product. They do not want a "relationship" with your brand. That may change later -- after they receive the product, love it, and want to reorder. But at the moment of first purchase, account creation is all cost and no perceived benefit.

### What Good Looks Like

**The right pattern**: Guest checkout as the default, with post-purchase account creation on the thank-you page or in the order confirmation email. "Want to track your order and reorder easily? Set a password for your account." At this point, the customer has already bought. The transaction is complete. The anxiety is gone. They are in a positive emotional state (dopamine hit from the purchase). The friction of setting a password feels trivial compared to the value of tracking their order.

**Olipop** handles this well -- you can check out as a guest, and Shop Pay handles repeat purchases without needing a traditional account. The account creation ask comes post-purchase when it is contextually relevant.

**Shop Pay** and **Google auto-fill** have largely made this debate moot for Shopify brands. Shop Pay recognizes returning customers by email and auto-fills everything. No password needed. No account creation screen. The customer enters their email, gets a 6-digit code on their phone, and every field populates. This is the future of checkout identity.

### What Bad Looks Like

A fashion brand running on a custom platform required full account creation with email verification before checkout could proceed. Not just "enter a password" -- they sent a verification email, and the customer had to click the link in the email, return to the site, and then continue checkout. Their checkout funnel analytics showed a 40% drop between "Create Account" and "Enter Shipping Info." Forty percent of people who were ready to buy left because they were asked to verify an email.

Another anti-pattern: showing a login/register modal as the first step of checkout, with the guest checkout option in small gray text at the bottom. Psychologically, this frames account creation as the "normal" path and guest checkout as the exception. It should be the opposite.

### How to Audit It

1. Start a checkout. What is the first thing you see? If it is a login/register screen, that is a problem.
2. Is guest checkout the most prominent option?
3. Is Shop Pay or another express checkout option available before any identity question is asked?
4. If you do create an account, what information is required? If it is more than email + password, it is too much.
5. After completing a guest checkout, is there a clear, low-friction path to create an account post-purchase?
6. For returning customers, does the site recognize them (via Shop Pay, cookies, or email recognition) and reduce friction accordingly?

### Test Hypotheses

- **H6**: Removing the account creation step from checkout and moving it to the post-purchase thank-you page will increase checkout completion rate by 10-15%. (ICE: 9/9/9)
- **H7**: Making Shop Pay the most prominent checkout option (above guest checkout) will increase mobile conversion rate by 5-10% for returning customers. (ICE: 8/8/9)

---

## Payment Methods

### What This Element Does

Payment methods are the actual mechanism by which money changes hands. Every payment method you do not offer is a segment of customers you cannot serve. This is not about preference -- it is about capability. A customer who only has PayPal cannot pay with a credit card. A customer on an iPhone who trusts Apple Pay will abandon a checkout that does not offer it.

### The Psychology Behind It

Payment method selection taps into two psychological forces: **trust** and **habit**. Customers trust the payment methods they have used before and are suspicious of ones they have not. A customer who always uses PayPal feels safe with PayPal because they know the dispute resolution process, they know their card details are not being shared with the merchant, and they know the interface. Asking that customer to enter their raw card number into a checkout form they have never seen before introduces trust anxiety.

Habit is equally powerful. A customer who uses Apple Pay for everything has muscle memory: double-click side button, Face ID, done. Asking that customer to type in 16 digits, an expiry date, and a CVV feels like going from a Tesla to a horse and cart.

### What Good Looks Like

**Ridge Wallet** displays express checkout options in a clear hierarchy: Shop Pay, Apple Pay, Google Pay, and PayPal, all above the fold on mobile. Below that, the manual card entry option. This ordering is intentional -- the fastest, lowest-friction options are first.

**Gymshark** adapts payment methods by region. UK customers see Klarna prominently. European customers see region-specific options. Australian customers see Afterpay. This is not over-engineering -- it is recognizing that payment habits are deeply regional.

The optimal payment method stack for a DTC brand selling globally:

1. **Shop Pay** (if on Shopify): Fastest checkout in DTC. Recognizes customers by email, auto-fills everything. Shopify reports Shop Pay has a 1.72x higher conversion rate than regular checkout.
2. **Apple Pay / Google Pay**: One to two taps on mobile. No form filling whatsoever. This is the single biggest mobile conversion lever available to most brands. Apple Pay alone can lift mobile checkout CVR by 5-12%.
3. **PayPal**: Still the second most popular online payment method globally. Roughly 30% of online shoppers have used PayPal in the past year. Not offering it is leaving revenue on the table.
4. **BNPL (Klarna / Afterpay / Clearpay)**: For AOVs above $50-60, BNPL can increase conversion by 20-30% and increase AOV by 30-50%. The effect is strongest in the $80-$250 range. Below $40, the installment amounts are too small to matter. Above $500, customers tend to use traditional credit.
5. **Manual card entry**: Visa, Mastercard, Amex as the baseline. Always show the card logos.

**Regional preferences matter enormously**:
- Netherlands: iDEAL dominates with 60%+ of online payments
- Belgium: Bancontact is the leading payment method
- Germany: Direct bank transfer (Sofort/Klarna) and invoice-based payment are preferred over credit cards
- Nordics: Klarna is practically a utility
- Brazil: Pix and Boleto are essential
- Japan: Konbini (convenience store payment) is still widely used

If you are selling internationally and only offering Visa/Mastercard/PayPal, you are invisible to large segments of those markets.

### What Bad Looks Like

A UK supplement brand I audited had no Apple Pay, no Google Pay, no PayPal, and no Klarna. Card only. On a store where 74% of traffic was mobile. Their mobile checkout CVR was 0.8%. After adding Apple Pay and Klarna, it went to 1.4% within 30 days. That is a 75% lift from adding two payment buttons.

Another failure: displaying BNPL options but not explaining them. A checkbox that says "Klarna" with no explanation of what that means, no "4 interest-free payments of $22.50" messaging. Customers who do not already know Klarna scroll right past it. The value proposition of BNPL needs to be spelled out at checkout: "4 interest-free payments of [amount]."

The display order matters too. Putting manual card entry first and express checkout options below the fold is backwards. The hierarchy should reflect friction: lowest friction first (Shop Pay, Apple Pay), medium friction second (PayPal, Klarna), highest friction last (manual card entry).

### How to Audit It

1. What payment methods are available? List them all.
2. Are Apple Pay and Google Pay enabled? Test on an actual iPhone and Android device.
3. Is PayPal available?
4. Is BNPL available? If AOV is above $50, it should be.
5. What order are payment methods displayed in? Lowest friction should be first.
6. Are BNPL installment amounts displayed? ("4 payments of $X")
7. If selling internationally, are region-specific methods available?
8. Are the payment method logos/buttons visible without scrolling on mobile?
9. Does the express checkout section load quickly, or is there a visible delay while Shop Pay/Apple Pay initialize?

### Test Hypotheses

- **H8**: Adding Apple Pay and Google Pay to the express checkout section will increase mobile checkout completion by 8-15%. (ICE: 9/9/9)
- **H9**: Adding Klarna/Afterpay BNPL options with visible installment amounts will increase conversion by 10-20% on orders above $60 AOV. (ICE: 8/8/8)
- **H10**: Moving express checkout options above the fold on mobile (if currently below) will increase express checkout usage by 20-30%. (ICE: 8/9/10)

---

## Form Design

### What This Element Does

Form design is the structural architecture of how information is collected during checkout. Field order, layout, input types, label placement, progress indicators -- these are not aesthetic choices. They are engineering decisions that directly determine completion rate.

### The Psychology Behind It

**Cognitive load theory** applies directly. The human working memory can hold approximately 4 chunks of information simultaneously. A checkout form with 12 visible fields overwhelms working memory. The customer cannot see the whole task, cannot estimate how long it will take, and feels a vague sense of dread. Chunking the checkout into steps (information, shipping, payment) keeps each step within working memory limits.

**The endowed progress effect** explains why progress bars work. When people feel they have already made progress on a task, they are more motivated to complete it. A progress bar that shows "Step 2 of 3" tells the customer they are already 33% done. They have invested effort. Abandoning now means that effort is wasted (loss aversion).

**Serial position effect** determines field order. Customers are most attentive at the beginning of the form and most likely to make errors toward the middle. Place the most critical field first (email -- for abandonment recovery) and the most complex field (payment) last, when the customer has already invested significant effort and is least likely to abandon.

### What Good Looks Like

The canonical field order for DTC checkout:

1. **Email** (first, always -- this enables abandoned checkout recovery even if they leave immediately after)
2. **Shipping address** (name, address, city, state, postcode, country)
3. **Shipping method** (ideally with delivery date estimates, not just "Standard" and "Express")
4. **Payment** (last, after maximum commitment)

**Single-page vs multi-step checkout** is one of the most debated topics in checkout optimization. The data is nuanced:
- **Multi-step** (Shopify's default 3-step) performs better when the form is complex or the customer is unfamiliar with the brand. Each step feels manageable. The progress bar provides motivation.
- **Single-page** performs better for returning customers, low-complexity orders, and when express checkout handles most of the work. The customer can see the entire task at once, which reduces uncertainty.
- Shopify's own data shows their one-page checkout performs comparably to the three-page version for most stores, with slight advantages for high-AOV stores.

The real answer: express checkout (Shop Pay, Apple Pay) makes this debate largely irrelevant. If 40-60% of your customers use express checkout, the form design only matters for the remaining 40-60%.

**Input masking and field sizing**: Credit card fields should be sized to fit 16-19 digits. Expiry should be MM/YY format with auto-slash. CVV should be 3-4 digits with a small field that communicates "short input expected." Phone fields should show a numeric keypad on mobile. Email fields should trigger the email keyboard (with @ and .com). Postcode fields should be appropriately sized for the country (5 digits in the US, 6-7 characters in the UK).

**Label placement**: Labels above the field perform best in most testing. Inline/placeholder labels (text inside the field that disappears on focus) look clean but create usability problems -- the customer loses context once they start typing. Floating labels (inline text that moves above the field on focus) are a reasonable compromise and are the Shopify default.

### What Bad Looks Like

A home goods brand used dropdown selects for country and state instead of type-ahead fields. On mobile, selecting "United States" from a dropdown of 200+ countries requires scrolling through a native picker. That is 15-20 seconds of friction for one field. A type-ahead where the customer types "Uni" and "United States" appears is 2 seconds.

Another failure: no progress indicator on a multi-step checkout. The customer fills in their email, hits "Continue," and has no idea how many more steps there are. Are there 2? Are there 5? The uncertainty increases anxiety and abandonment.

The "express checkout" section matters enormously. On mobile, the express checkout buttons (Shop Pay, Apple Pay, Google Pay) should be visible above the fold immediately when the checkout loads. If the customer has to scroll past the email field and the "or" divider to find Apple Pay, you have already lost the conversion opportunity. The best checkouts put express options at the very top.

### How to Audit It

1. What is the first field on the checkout page? It should be email.
2. Is there a progress indicator on multi-step checkouts?
3. On mobile, are express checkout buttons visible without scrolling?
4. Tap into the phone field on mobile. Does a numeric keypad appear?
5. Tap into the email field. Does an email-optimized keyboard appear?
6. Are country and state fields type-ahead or dropdown?
7. Is "billing same as shipping" pre-checked?
8. How many total visible fields are there before the customer enters payment info?
9. What happens when you click "Continue" between steps? Is there a loading delay? Does the page jump?
10. Are field labels above the field, inline, or floating?

### Test Hypotheses

- **H11**: Switching from dropdown country/state selectors to type-ahead fields will reduce form completion time by 10-15 seconds on mobile and increase completion rate by 1-3%. (ICE: 7/7/9)
- **H12**: Adding delivery date estimates to the shipping method selection (e.g., "Arrives by March 27") instead of just "Standard Shipping (3-5 days)" will increase shipping step completion by 2-4%. (ICE: 7/7/8)

---

## Order Bumps

### What This Element Does

An order bump is a single, low-friction add-on offer presented during checkout, typically as a checkbox with a one-line description and a price. It is the highest-ROI element in the entire checkout because it converts at high rates on an audience that has already committed to purchasing, requires zero additional traffic spend, and goes straight to the bottom line as incremental revenue.

### The Psychology Behind It

Order bumps exploit several cognitive biases simultaneously:

- **Commitment and consistency** (Cialdini): The customer has already committed to buying. Adding a small item is consistent with that commitment. Saying no requires actively rejecting something, which feels inconsistent with the buying behavior they have already initiated.
- **Trivial cost framing**: A $9.99 add-on on a $65 order feels negligible. The customer is already spending $65 -- what is another $10? The price of the bump feels like a rounding error relative to the anchor (the cart total).
- **Loss aversion**: Good bump copy frames the offer as something the customer would be missing out on. "Add our best-selling SPF 30 for just $12 -- most customers add this to protect their results" implies that not adding it means worse results.

### What Good Looks Like

**DRMTLGY** places an order bump for their SPF product in their checkout. It sits between the shipping method and payment section. The copy is benefit-focused ("Protect your skin investment with SPF 30 -- add for just $12"). The checkbox is unchecked by default (pre-checking can feel manipulative and generate chargebacks). The price is roughly 15-20% of their average order, which is the sweet spot.

The best order bumps share these characteristics:
- **Complementary**: The bump product makes the main product better or more complete. Moisturizer buyer gets offered SPF. Wallet buyer gets offered a money clip. Coffee buyer gets offered a mug.
- **Priced trivially**: Under 20% of AOV. If AOV is $80, the bump should be $8-$16. The number needs to feel like it "rounds up" the order rather than significantly increasing it.
- **One line of copy**: This is not a sales page. It is a checkbox. "Add [Product] -- [one benefit] -- $X." That is it.
- **Visually lightweight**: A single row with a product thumbnail, one line of copy, a price, and a checkbox. No paragraphs. No feature lists. No reviews carousel.
- **Between shipping and payment**: This placement is critical. After shipping is confirmed (the customer has invested effort) but before payment (the number is not yet final). The bump modifies the total before the customer sees it on the payment step.

Achievable take rates: 10-25% depending on product fit, pricing, and copy. A well-optimized order bump on a high-traffic store can add $2-$5 to average order value, which at scale is transformative.

### What Bad Looks Like

A supplement brand I audited had THREE order bumps at checkout, each with a paragraph of copy, star ratings, and a "Learn More" expandable section. It looked like a product listing page had been injected into the checkout. The checkout page was so long on mobile that the payment section was 4 screens of scrolling below the fold. Their checkout completion rate was 22%.

Another anti-pattern: order bumps priced above 30-40% of AOV. A $45 bump on an $80 order does not feel trivial. It feels like a second purchase decision, and it introduces the hesitation and evaluation that the customer had already moved past.

Pre-checked order bump checkboxes are a dark pattern that generates customer complaints, chargebacks, and negative reviews. If a customer does not realize they added a $15 item and only discovers it on their credit card statement, you have created a trust violation that costs far more than the $15.

### How to Audit It

1. Is there an order bump in the checkout? If not, there should be.
2. Where is it placed? Between shipping and payment is optimal.
3. What is the bump product? Is it complementary to the main product?
4. What is the bump price relative to AOV? Under 20% is ideal.
5. Is the checkbox pre-checked? It should not be.
6. Is the copy one line or a paragraph?
7. On mobile, does the bump push the payment section significantly below the fold?
8. What is the current take rate? Under 10% means the offer or copy needs work. Over 25% is excellent.

### Test Hypotheses

- **H13**: Adding a complementary product as an order bump at checkout will increase AOV by $3-$6 with a take rate of 12-20%. (ICE: 9/9/9)
- **H14**: Testing order bump copy focused on loss aversion ("Don't miss out on...") vs benefit framing ("Complete your routine with...") will identify 2-5% take rate difference. (ICE: 7/7/8)
- **H15**: Reducing order bump price from 25% of AOV to 15% of AOV will increase take rate enough to offset the lower per-unit contribution. (ICE: 7/6/7)

---

## Progress Bars and Trust Signals

### What This Element Does

Progress bars set expectations and reduce uncertainty. Trust signals reduce anxiety about fraud, product quality, and fulfillment. Together, they keep the customer moving through checkout rather than freezing in doubt.

### The Psychology Behind It

**Uncertainty aversion**: Humans dislike not knowing how long a task will take more than they dislike the task itself. A progress bar that says "Step 2 of 3" eliminates uncertainty about the scope of the task. The customer knows what is left and can mentally commit.

**Trust transfer**: Trust badges work because they transfer trust from a known entity (Visa, Mastercard, Norton, the padlock icon) to an unknown entity (your store). A customer who does not know your brand but sees the Visa logo feels a subconscious reassurance: "Visa is involved, so my payment is protected."

**Proximity effect**: Trust signals are most effective when placed near the point of anxiety. A guarantee badge at the top of the page does less than the same badge next to the "Pay Now" button, because the anxiety peaks at the moment of payment.

### What Good Looks Like

**Ridge** displays a clean progress indicator at the top of their checkout (Information > Shipping > Payment) and places trust elements -- card logos and security messaging -- near the payment section where anxiety is highest.

Effective trust signals at checkout:
- **Payment method logos** (Visa, Mastercard, Amex, PayPal) near the card entry field. These are not just decorative -- they answer the question "Do you accept my card?"
- **SSL/security indicator**: The padlock icon and "Secure checkout" text. Most browsers already show this in the address bar, but a visible indicator within the checkout reassures customers who do not look at the URL bar.
- **Guarantee reminder**: A single line near the Pay button: "30-day money-back guarantee" or "Free returns within 30 days." This is not new information -- it should have been communicated earlier in the funnel. But restating it at the moment of maximum anxiety provides reassurance.
- **Delivery estimate**: "Arrives by [date]" near the order summary. Reduces uncertainty about when the product will arrive.

**Testimonial or review snippet at checkout**: This is controversial. Some CRO practitioners argue that introducing social proof at checkout re-opens the evaluation phase, which can actually increase abandonment. Others argue that a single, relevant testimonial reduces anxiety. The data is mixed. If you test it, keep it to a single short testimonial, placed in the order summary section, not inline with the form fields. A customer should never have to scroll past a testimonial to reach the next form field.

### What Bad Looks Like

A beauty brand had 8 trust badges at checkout. Eight. Including badges from organizations the customer had never heard of ("Verified by SafeShop360"). The badge bar was wider than the form and created visual clutter that actually reduced trust because it looked desperate. Two to three well-known badges is the ceiling. More than that triggers skepticism.

Another anti-pattern: no progress indicator on a multi-step checkout. The customer fills in their email, hits continue, fills in shipping, hits continue... and has no idea if payment is next or if there are three more steps. Each step without a progress bar feels like it could be followed by another unknown step, which creates the worst kind of uncertainty.

### How to Audit It

1. Is there a progress indicator? On multi-step, this is essential.
2. What trust badges are shown? Are they from recognizable entities?
3. Where are the trust signals placed? Near the payment section is optimal.
4. Is the guarantee or return policy restated near the Pay button?
5. Are there delivery date estimates visible?
6. Is there a testimonial at checkout? If so, is it relevant and brief?
7. On mobile, are trust badges visible without scrolling past the payment section?

### Test Hypotheses

- **H16**: Adding a "30-day money-back guarantee" text line directly below the Pay button will increase checkout completion by 2-4%. (ICE: 8/8/10)
- **H17**: Adding a single customer testimonial in the order summary sidebar will increase checkout completion by 1-3% (test carefully -- may have no effect or negative effect). (ICE: 5/5/9)

---

## Shipping Cost Reveal

### What This Element Does

Shipping cost reveal is when and how the customer learns what shipping will cost. It is the single biggest abandonment trigger in ecommerce. This is not an exaggeration. Unexpected shipping costs are the number one reason for checkout abandonment globally, cited by roughly 48% of people who abandon.

### The Psychology Behind It

**Reference price violation**: Throughout the shopping experience, the customer has been anchoring on the product price. That is the number in their head. When a shipping cost appears, the total suddenly exceeds their reference price. This is experienced as a loss -- they are paying more than they expected. The psychological pain is disproportionate to the actual amount because it feels like a hidden fee, a bait-and-switch.

**Fairness heuristic**: Customers perceive shipping charges as unfair in a way they do not perceive product prices. This is irrational but powerful. Amazon Prime has conditioned an entire generation to believe that shipping should be free. A $7.99 shipping charge on a $35 product feels like a penalty for buying, not a cost of doing business.

**Mental accounting**: Customers separate "product price" and "shipping cost" into different mental accounts. They evaluated the product and decided it was worth $35. Shipping was not part of that evaluation. Adding $7.99 to shipping does not feel like paying $42.99 for the product (which they might accept). It feels like paying $35 for the product AND being charged $7.99 for the privilege of receiving it.

### What Good Looks Like

**The gold standard**: Free shipping, communicated throughout the funnel, confirmed at checkout. No surprise. No threshold to meet. No calculation to do. The price you see on the product page is the price you pay.

When truly free shipping is not economically viable (and for many brands with low AOV and heavy products, it is not), the second-best option is a **free shipping threshold** communicated relentlessly from homepage to checkout:
- Homepage banner: "Free shipping on orders over $50"
- Product page: "Free shipping on orders over $50" near the add-to-cart button
- Cart: "You're $12 away from free shipping!" with a progress bar
- Checkout: "Free shipping" displayed in the shipping method section with no surprise

**Olipop** handles this well. Their free shipping threshold is communicated early and the cart shows progress toward it. By the time you reach checkout, you already know whether you qualify for free shipping.

**Graza** builds shipping into product pricing and offers free shipping above a reasonable threshold. There are no surprises at checkout because expectations have been set long before.

For brands that must charge shipping:
- Show shipping costs on the product page or cart page, not the checkout page. The customer should never learn the shipping cost for the first time at checkout.
- Use flat-rate shipping ("$5 flat rate shipping") rather than calculated shipping. Flat rate is predictable. Calculated shipping introduces uncertainty and forces the customer to enter their address before they know what they will pay.
- Display the shipping cost in the cart, before they click "Checkout." If the customer sees "$5 flat rate shipping" in their cart and then proceeds to checkout, the shipping cost is expected, not a surprise.

### What Bad Looks Like

The worst pattern -- and I have seen it on hundreds of stores -- is hiding shipping costs until the final step of checkout. The customer adds to cart, sees a subtotal of $47.00, clicks checkout, enters their email, enters their full shipping address, selects a shipping method, and THEN sees that the total is $59.99 because there is a $12.99 shipping fee. They have invested 2-3 minutes and are now being told the price is 27% higher than they thought.

The calculated shipping model without early disclosure is equally bad. "Shipping calculated at checkout" on the product page tells the customer nothing. They cannot even estimate whether the total will be acceptable until they have already committed to the checkout process.

A pet food brand charged $14.99 shipping on a $29.99 bag of dog food. The shipping was 50% of the product price. Their checkout abandonment at the shipping method step was 73%. When they switched to "Free shipping on orders over $49" and added a second bag at a discount to clear the threshold, their AOV went from $32 to $58 and their checkout completion rate increased by 35%.

### How to Audit It

1. Go to the product page. Is shipping cost or free shipping threshold mentioned?
2. Add to cart. Is shipping cost visible in the cart, or does it say "Calculated at checkout"?
3. Proceed to checkout. At what step do you first see the total including shipping?
4. If shipping is not free, is it flat-rate or calculated? Flat-rate is better for setting expectations.
5. Is there a free shipping threshold? If so, is it communicated on the product page and in the cart?
6. If there is a threshold, does the cart show progress toward it?
7. What percentage of orders qualify for free shipping? If it is below 60%, the threshold may be too high.
8. How does the shipping cost compare to the product price? If shipping is more than 15-20% of the product price, it will cause significant abandonment.

### Test Hypotheses

- **H18**: Implementing a free shipping threshold with a cart progress bar will increase AOV by 15-25% and reduce checkout abandonment by 5-10%. (ICE: 9/9/8)
- **H19**: Switching from "Calculated at checkout" to flat-rate shipping displayed in the cart will reduce checkout abandonment by 8-12%. (ICE: 9/8/9)
- **H20**: Absorbing shipping cost into product price and offering "Free Shipping" will increase checkout completion by 5-10% even if the product price increases by the same amount. (ICE: 7/7/7)

---

## Mobile Checkout

### What This Element Does

Mobile checkout is the checkout experience on screens under 768px wide. It is where the majority of DTC traffic arrives and where the majority of DTC revenue is lost.

### The Psychology Behind It

Mobile checkout compounds every friction point. Fields are harder to fill on a virtual keyboard. Screens are smaller, so forms feel longer. Attention is more fragile -- the customer is on a bus, in a queue, on a lunch break. They are one notification, one text message, one moment of hesitation away from switching apps.

The conversion gap between desktop and mobile in DTC is staggering. Typical numbers: desktop checkout CVR of 3-5%, mobile checkout CVR of 1.5-2.5%. This gap represents the single largest revenue leak in most DTC businesses. A store doing $5M/year with 73% mobile traffic and a 50% mobile-desktop CVR gap is leaving $1.5-2M on the table annually from mobile checkout friction alone.

### What Good Looks Like

**Gymshark's** mobile checkout is designed for thumbs. Express checkout options sit at the top, comfortably within thumb reach. Fields are large (minimum 44px tap targets, ideally 48px). The keyboard type matches the field (numeric for phone, email-optimized for email). The "Continue" button is full-width and sticky at the bottom of the viewport so it is always accessible.

The best mobile checkouts share these traits:
- **Express checkout above the fold**: Apple Pay, Google Pay, Shop Pay visible immediately without scrolling. This is the single biggest mobile CVR lever. If a customer can complete checkout with Face ID and two taps instead of filling in 8+ fields on a phone keyboard, the conversion rate difference is enormous.
- **Large tap targets**: 48px minimum height for buttons and form fields. Anything smaller causes mis-taps, frustration, and abandonment.
- **Appropriate keyboards**: `inputmode="numeric"` for phone and postcode fields. `inputmode="email"` for email. `autocomplete` attributes on every field so the browser can auto-fill.
- **Sticky CTA button**: The "Continue" or "Pay Now" button should be visible at all times, either at the bottom of the viewport or scrolling with the page. The customer should never have to scroll to find the next action.
- **Minimal scrolling**: The fewer times the customer has to scroll between fields, the better. Address auto-complete can eliminate 60-70% of field-filling on mobile.
- **No horizontal scrolling**: Ever. Test on actual devices, not just browser resizing.

### What Bad Looks Like

A jewelry brand had form fields that were 32px tall on mobile. Tapping into the "City" field consistently activated the "State" dropdown instead. Their session recordings showed customers attempting to fill in the city field 2-3 times before succeeding. Some customers attempted 4 times and then left.

Another brand used a multi-step checkout where each step required scrolling past the order summary (which was displayed at the top of every step on mobile) to reach the form fields. The order summary occupied 40% of the viewport. On every step, the customer had to scroll past it to start filling fields. This is a layout problem that is invisible on desktop (where the order summary sits in a sidebar) but devastating on mobile (where it stacks vertically).

The most common mobile checkout failure: not having Apple Pay enabled. It is free to enable on Shopify. It requires no design changes. It reduces mobile checkout to two taps and a Face ID scan. Not having it enabled is leaving the single easiest conversion win on the table.

### How to Audit It

1. Pull up the checkout on an actual iPhone and Android device (not browser dev tools -- actual devices).
2. Is Apple Pay visible above the fold without scrolling?
3. Tap into the email field. Does an email keyboard appear?
4. Tap into the phone field. Does a numeric keypad appear?
5. How many screens of scrolling are required to complete the checkout from start to finish?
6. Are all tap targets at least 44px tall? (Use the browser inspector to verify.)
7. Is there any horizontal scrolling?
8. Does the "Continue" / "Pay Now" button require scrolling to reach?
9. Complete the entire checkout on your phone with one hand. Note every point of friction.
10. Check if auto-fill works correctly on mobile. Chrome and Safari auto-fill should populate name, address, and payment fields.
11. Time the checkout from "Begin Checkout" to "Order Confirmed" on mobile. Under 90 seconds for manual entry is good. Under 30 seconds with express checkout is excellent.

### Test Hypotheses

- **H21**: Enabling Apple Pay on mobile (if not currently enabled) will increase mobile checkout CVR by 8-15%. (ICE: 10/9/10)
- **H22**: Increasing form field height from 36px to 48px on mobile will reduce mis-tap errors and increase checkout completion by 2-4%. (ICE: 7/7/9)
- **H23**: Making the "Pay Now" button sticky at the bottom of the mobile viewport will increase checkout completion by 1-3%. (ICE: 7/7/9)

---

## Shopify Checkout Specifics

### What This Element Does

Shopify's checkout is the most widely used checkout in DTC ecommerce. Understanding its capabilities and constraints is essential because most DTC brands are on Shopify, and the checkout is the one part of Shopify that non-Plus merchants cannot fully customize.

### What You CAN Change (All Plans)

- **Express checkout options**: Enable/disable Shop Pay, Apple Pay, Google Pay, PayPal, Amazon Pay, and BNPL options (Klarna, Afterpay) via Settings > Payments.
- **Logo and colors**: Basic branding in Settings > Checkout > Checkout appearance. You can change the main banner, background color, accent colors, and button colors.
- **Policies**: Link to refund policy, privacy policy, and terms of service in the checkout footer.
- **Tipping**: Enable/disable and configure tip options.
- **Order notes**: Enable/disable an order notes field.
- **Email marketing opt-in**: Configure the email/SMS marketing checkbox.
- **Address auto-complete**: Shopify has built-in address auto-complete. Make sure it is not disabled.

### What You CAN'T Change (Without Plus)

- **Core field layout**: You cannot rearrange fields, remove fields, or add custom fields to checkout on standard Shopify plans.
- **Step structure**: The multi-step vs single-page layout is controlled by Shopify. Non-Plus merchants got access to one-page checkout in 2023, but customization beyond that is limited.
- **Custom scripts**: No custom JavaScript in checkout without Plus.
- **Order bumps**: Native order bumps require Shopify Plus or a third-party app that uses the checkout extensibility API.
- **Trust badges in checkout**: Adding custom trust badges in the checkout itself (not just the cart) requires Plus or an app.

### Shopify Plus: Checkout Extensibility

Shopify Plus unlocks the Checkout Extensibility framework, which replaced checkout.liquid in 2024. This allows:
- **Custom UI extensions**: Add order bumps, trust badges, testimonials, upsells, custom fields, and loyalty point displays directly in the checkout using checkout UI extensions.
- **Shopify Functions**: Custom discount logic, payment method filtering, shipping rate customization -- all running server-side.
- **Post-purchase page**: A full post-purchase upsell/cross-sell page between "Pay" and "Thank You." This is one of the highest-ROI features of Plus.
- **Branding API**: Deep customization of checkout appearance including custom fonts, rounded corners, section styling, and form element styling.
- **Web pixels**: Custom tracking and analytics in the checkout.

### Shop Pay

Shop Pay deserves special attention because it is the fastest-converting checkout option in the Shopify ecosystem. Key facts:
- Shop Pay stores customer information (name, address, payment) and retrieves it via a 6-digit SMS code sent to the customer's phone. No password, no login.
- Shopify reports that Shop Pay converts at 1.72x the rate of regular checkout. On mobile, the advantage is even higher.
- Shop Pay works across all Shopify stores. A customer who has used Shop Pay on one store has their information available on every Shopify store.
- Over 100 million buyers have used Shop Pay.
- For mobile-first DTC brands, Shop Pay is arguably more important than any on-site optimization you can make.

### One-Page vs Three-Page Checkout

Shopify's traditional checkout was three pages: Information > Shipping > Payment. In 2023, Shopify introduced one-page checkout for all merchants. Key points:
- Shopify's own testing showed that one-page checkout was 4% faster to complete on average.
- For most stores, the conversion rate difference between one-page and three-page is small (1-3%). The bigger factor is whether express checkout is prominently displayed.
- One-page checkout is particularly advantageous for stores with simple shipping (one option, free shipping) where the shipping step adds no value.
- Three-page can perform slightly better for stores with complex shipping options (multiple carriers, in-store pickup, local delivery) where the shipping step requires meaningful decision-making.

### How to Audit It

1. Is Shop Pay enabled? If not, enable it immediately.
2. What express checkout options are enabled? Apple Pay, Google Pay, and PayPal should all be active.
3. Is the store on Plus? If so, are they using checkout extensibility for order bumps, trust badges, or post-purchase offers?
4. Is one-page checkout enabled?
5. Are address auto-complete and auto-fill working correctly?
6. What does the checkout look like on mobile? Is it branded consistently with the rest of the site?
7. Is BNPL enabled if AOV warrants it?

### Test Hypotheses

- **H24**: Enabling Shop Pay (if not already enabled) will increase overall checkout CVR by 5-10% with an even larger effect on mobile. (ICE: 10/9/10)
- **H25**: Switching from three-page to one-page checkout on a store with free shipping will reduce checkout completion time by 10-15 seconds and increase CVR by 1-3%. (ICE: 7/7/9)

---

## Checkout Errors and Recovery

### What This Element Does

Errors during checkout -- payment failures, out-of-stock items, session timeouts, address validation failures -- are inevitable. How you handle them determines whether the customer retries or abandons.

### The Psychology Behind It

An error during checkout triggers a **threat response**. The customer was in a flow state (filling fields, progressing toward completion) and has been interrupted. The interruption creates confusion ("What happened?"), anxiety ("Is my card compromised?"), and frustration ("I have to start over?"). The error handling UX must address all three emotions: clarify what happened, reassure that nothing is wrong, and make recovery effortless.

**Payment failure** is the most sensitive error because it involves money. A vague error message like "Payment failed. Please try again." creates maximum anxiety. The customer does not know if they were charged, if their card is blocked, or if the store is a scam. A specific, reassuring message like "Your card was not charged. The payment could not be processed -- this often happens with expired cards or incorrect card numbers. Please check your details and try again." addresses all three concerns.

### What Good Looks Like

**Payment failure recovery**:
- Clear message explaining what happened ("Your payment was not processed")
- Reassurance that no charge was made
- Specific guidance on what to try ("Check your card number and expiry date, or try a different payment method")
- All form fields retain their values -- the customer only needs to fix the payment field
- Alternative payment methods prominently displayed as a recovery path

**Out-of-stock during checkout**:
- Immediate notification with the specific item that is out of stock
- Offer to continue with remaining items or suggest a similar product
- Do not clear the entire cart -- preserve everything that is still available

**Session/cart expiration**:
- A 30-minute timer is reasonable. Under 15 minutes is too aggressive and will lose customers who stepped away.
- Warning message before expiration: "Your cart will expire in 5 minutes. Complete your purchase to keep your items."
- If the cart does expire, make re-adding items trivial -- ideally a one-click "Restore Cart" option.

**Abandoned checkout email**: This is the safety net for all checkout failures and abandonments. Best practices:
- **First email**: Within 1 hour. This catches customers who were interrupted (phone call, lost signal, bus arrived). Subject line should be straightforward: "You left something behind" or "Complete your order." Include the product image and a direct link back to checkout with their cart restored.
- **Second email**: 24 hours later. Can include a mild urgency signal: "Your cart is reserved for 48 hours."
- **Third email**: 48-72 hours later. This is where a small incentive (5-10% discount or free shipping) can recover price-sensitive abandoners. Some brands skip the discount and use social proof instead.
- Recovery rates: A well-optimized abandoned checkout sequence recovers 5-15% of abandoned checkouts. The first email alone typically recovers 3-8%.

### What Bad Looks Like

A fashion brand's payment error page displayed "Error 500: Internal Server Error" with no explanation, no recovery path, and no retained form data. The customer had to start checkout from scratch. Their session recordings showed 100% abandonment after this error.

Another brand sent their first abandoned checkout email 24 hours after abandonment. By that point, 60%+ of recoverable customers had either bought elsewhere or lost interest. The 1-hour window for the first email is critical because the purchase intent is still warm.

Cart expiration without warning is another failure. A supplement brand expired carts after 10 minutes with no warning. Customers who paused to verify a discount code with a friend or check their bank balance returned to an empty cart. No recovery option. Just "Your cart is empty."

### How to Audit It

1. Attempt a checkout with an expired credit card. What error message appears? Is it specific and helpful?
2. Attempt a checkout with an intentionally wrong card number. Same test.
3. Are form fields retained after a payment error, or does the customer have to re-enter everything?
4. Add an item to cart, begin checkout, wait 30 minutes. What happens?
5. Is there an abandoned checkout email sequence? Check timing: is the first email within 1 hour?
6. Does the abandoned checkout email include a direct link to the pre-populated checkout?
7. Does the email sequence include the product image and name?
8. What is the current abandoned checkout email recovery rate?
9. If an item goes out of stock during checkout, how is the customer notified?

### Test Hypotheses

- **H26**: Reducing abandoned checkout first email timing from 24 hours to 1 hour will increase email recovery rate by 30-50%. (ICE: 9/9/10)
- **H27**: Adding a 10% discount code in the third abandoned checkout email (72 hours) will recover an additional 2-4% of abandoned checkouts. (ICE: 7/8/9)
- **H28**: Improving payment error messaging to include specific guidance and alternative payment options will reduce payment-step abandonment by 5-8%. (ICE: 7/7/8)

---

## Interconnections

### Cart to Checkout

Every expectation set in the cart must be honored at checkout. If the cart says "Free Shipping," the checkout cannot show a shipping charge. If the cart shows a delivery estimate, the checkout must show the same estimate. If the cart displays a discount, the checkout must apply the same discount. Any discrepancy between cart and checkout reads as deception, and deception at the moment of payment is fatal.

The transition from cart to checkout should be seamless. The URL should change, but the experience should feel continuous. Same branding, same order summary, same totals. If your checkout looks radically different from your store (different fonts, different colors, different layout), the customer's subconscious threat detection fires: "Am I still on the same site? Is this safe?"

### Checkout to Post-Purchase

A smooth, fast checkout creates a dopamine hit. The customer feels good about their purchase decision, good about how easy it was, good about themselves. This emotional high point is the most valuable moment in the entire customer lifecycle for three reasons:

1. **Post-purchase upsell**: The customer is in "buying mode" and riding a positive emotion. A well-placed upsell on the thank-you page or a post-purchase page (Shopify Plus) converts at 5-15%. This is dramatically higher than any cold upsell because trust is maximized and buying friction is eliminated (you already have their payment info).
2. **Account creation**: This is the moment to ask for account creation. The customer has just bought. They want to track their order. Creating an account now is framed as a benefit, not a burden.
3. **Referral or sharing**: Customers are most likely to share or refer immediately after purchase, when excitement peaks. A thank-you page with a referral incentive ("Give your friends 15%, get $10 credit") capitalizes on this window.

### Offer Architecture to Checkout

The checkout is where your offer architecture is tested. Free shipping thresholds, order bumps, BNPL options, and discount codes all converge at checkout. The customer sees the final math and makes a final judgment: "Is this total acceptable?"

This is why offer architecture decisions (covered in Module 02) must be made with the checkout experience in mind. A free shipping threshold that works on the product page but creates sticker shock at checkout is a failed threshold. An order bump that pushes the total above a psychological price point ($99.99 to $112.98) may actually decrease conversion. The checkout is the audit of your entire pricing and offer strategy.

---

## How to Audit a Checkout

### The Complete Checkout Audit Checklist

Run through these questions on every checkout audit. Do it on mobile first, then desktop.

**Pre-Checkout Expectations**
1. Is the shipping cost or free shipping threshold communicated before the customer reaches checkout?
2. Does the cart total match the checkout total (no surprise fees)?
3. Is the transition from cart to checkout visually seamless (consistent branding)?

**Express Checkout**
4. Is Shop Pay enabled?
5. Is Apple Pay enabled and functional on iOS?
6. Is Google Pay enabled and functional on Android?
7. Is PayPal available?
8. Are express checkout options visible above the fold on mobile without scrolling?

**Guest vs Account**
9. Can you complete checkout without creating an account?
10. Is guest checkout the default/most prominent option?
11. Is there a post-purchase account creation opportunity?

**Form Design**
12. Is email the first field?
13. How many total form fields are visible? (Target: 8 or fewer)
14. Is address auto-complete enabled?
15. Does "billing same as shipping" default to checked?
16. Is inline validation working (errors caught per-field, not on submit)?
17. On mobile, do appropriate keyboards appear for each field type?
18. Are tap targets at least 44px on mobile?

**Payment Methods**
19. Are BNPL options available (if AOV warrants)?
20. Are payment method logos displayed near the card entry field?
21. Are BNPL installment amounts shown?

**Order Bumps**
22. Is there an order bump? If so, where is it placed?
23. Is the bump product complementary? Is the price under 20% of AOV?
24. Is the checkbox unchecked by default?

**Trust Signals**
25. Are payment logos visible near the payment section?
26. Is the guarantee/return policy restated near the Pay button?
27. Is there a progress indicator on multi-step checkout?

**Shipping**
28. Are shipping options clear with delivery date estimates?
29. Is shipping cost visible before the payment step?

**Error Handling**
30. What happens when a payment fails? Is the message clear and specific?
31. Are form fields retained after an error?

**Recovery**
32. Is there an abandoned checkout email sequence?
33. Does the first email send within 1 hour?
34. Does the email include the product image and a direct checkout link?

### The "Buy Something Yourself" Test

This is the most important audit step. Buy something from the store. On your phone. Use your own money. Time the experience. Note every moment of confusion, every unnecessary field, every missing payment method. If you feel any friction, your customers feel 10x more because they do not have the context you do. They do not know the brand. They do not know the product. They are one hesitation away from closing the tab.

---

## Test Hypotheses Summary

All test hypotheses from this module consolidated, ranked by expected impact:

| # | Hypothesis | ICE Score | Priority |
|---|-----------|-----------|----------|
| H2 | Remove forced account creation, default to guest checkout | 10/10/10 | Immediate |
| H1 | Enable Shop Pay + Apple Pay as express checkout | 9/9/10 | Immediate |
| H24 | Enable Shop Pay if not already enabled | 10/9/10 | Immediate |
| H21 | Enable Apple Pay on mobile | 10/9/10 | Immediate |
| H26 | Reduce abandoned checkout email timing to 1 hour | 9/9/10 | Immediate |
| H8 | Add Apple Pay + Google Pay to express checkout | 9/9/9 | Immediate |
| H6 | Move account creation to post-purchase | 9/9/9 | High |
| H13 | Add order bump at checkout | 9/9/9 | High |
| H18 | Free shipping threshold with cart progress bar | 9/9/8 | High |
| H19 | Switch to flat-rate shipping displayed in cart | 9/8/9 | High |
| H9 | Add BNPL with visible installment amounts | 8/8/8 | High |
| H10 | Move express checkout above fold on mobile | 8/9/10 | High |
| H3 | Add Google Places address auto-complete | 8/8/9 | Medium |
| H7 | Make Shop Pay the most prominent checkout option | 8/8/9 | Medium |
| H5 | Switch to inline real-time validation | 8/7/8 | Medium |
| H16 | Add guarantee text below Pay button | 8/8/10 | Medium |
| H27 | Add 10% discount in third abandoned checkout email | 7/8/9 | Medium |
| H22 | Increase mobile field height to 48px | 7/7/9 | Medium |
| H23 | Sticky Pay button on mobile | 7/7/9 | Medium |
| H25 | Switch to one-page checkout (free shipping stores) | 7/7/9 | Medium |
| H28 | Improve payment error messaging | 7/7/8 | Medium |
| H12 | Add delivery date estimates to shipping methods | 7/7/8 | Medium |
| H4 | Hide "Address Line 2" behind expandable link | 7/9/10 | Low |
| H11 | Type-ahead for country/state selectors | 7/7/9 | Low |
| H14 | Test order bump copy: loss aversion vs benefit framing | 7/7/8 | Low |
| H20 | Absorb shipping into product price | 7/7/7 | Low |
| H15 | Reduce order bump price from 25% to 15% of AOV | 7/6/7 | Low |
| H17 | Add testimonial to checkout order summary | 5/5/9 | Low |

The first four hypotheses (enabling express checkout and removing forced account creation) are the only ones I would call "zero-risk, immediate-action" items. They are configuration changes with no design work, no development, and no downside. If a store does not have Shop Pay, Apple Pay, and guest checkout enabled, nothing else in this module matters until those are fixed.

---

*Next module: [07 - Post-Purchase and Thank You Page](07-post-purchase.md)*
*Previous module: [05 - Cart](05-cart.md)*
