# Revenue Projector

## Overview

The Revenue Projector is the mathematical engine behind the sale. It calculates exactly how much revenue a brand is leaving on the table due to post-click conversion gaps. This is the number that makes the retainer feel like a no-brainer — the ROI becomes mathematical, not hypothetical.

**Rule:** Never present the partnership price without the revenue gap number next to it. The gap should always be 3-10x the retainer cost.

## The Core Formula

```
Monthly Revenue Gap = Monthly Traffic × (Benchmark CVR - Current CVR) × AOV
```

**Example — Health & Supplements Brand:**
- Monthly traffic: 150,000 sessions
- Current CVR: 1.8%
- Benchmark CVR: 3.2% (DTC health/wellness top quartile)
- AOV: £55

Gap = 150,000 × (0.032 - 0.018) × £55 = **£115,500/mo left on the table**

Annual gap = **£1,386,000** — this is the number that makes an £8K/mo retainer feel tiny.

## The Breakeven Calculation

This is the single most powerful number in the sales conversation.

```
Retainer Breakeven CVR Lift = Retainer Cost / (Monthly Traffic × AOV)
```

**Example:**
- Partnership: £9,000/mo
- Monthly traffic: 150,000
- AOV: £55

Breakeven = £9,000 / (150,000 × £55) = **0.11% CVR lift**

> "The partnership pays for itself if we improve your conversion rate by 0.11%. We average 1-2% in the first 90 days. That means the ROI is somewhere between 9x and 18x."

## The Ad Spend Multiplier

Layer in their ad spend to make it even more concrete:

```
Current CPA = Monthly Ad Spend / Current Monthly Orders
Potential CPA = Monthly Ad Spend / Potential Monthly Orders
Monthly CPA Savings = (Current CPA - Potential CPA) × Current Monthly Orders
```

**Example:**
- Ad spend: £50,000/mo
- Current orders: 2,700 (150K × 1.8%)
- Potential orders: 4,800 (150K × 3.2%)

Current CPA = £50,000 / 2,700 = **£18.52**
Potential CPA = £50,000 / 4,800 = **£10.42**

> "Right now you're paying £18.52 to acquire a customer. With a 3.2% CVR that drops to £10.42. Same ad spend, 78% more customers, and your CPA drops 44%."

## Data Sources

| Data Point | Primary Source | Fallback |
|-----------|---------------|----------|
| Monthly traffic | GA4 (get on Stage 2) | SimilarWeb estimate (Stage 1) |
| Current CVR | GA4 / Shopify analytics | Industry benchmark - 30% |
| AOV | Shopify analytics | Calculate from site (price × typical basket) |
| Benchmark CVR | Industry data by vertical | Use 3.0% DTC average |
| Ad spend | Client confirmation | Meta Ad Library activity level estimate |

## Industry CVR Benchmarks

| Vertical | Average CVR | Top Quartile | Gap Opportunity |
|----------|-------------|--------------|-----------------|
| Health & Supplements | 2.8% | 4.5% | 1.7% |
| Beauty & Skincare | 3.1% | 5.0% | 1.9% |
| Fashion & Apparel | 2.2% | 3.8% | 1.6% |
| Food & Beverage | 3.5% | 5.5% | 2.0% |
| Pet | 3.0% | 4.8% | 1.8% |
| Home & Living | 2.0% | 3.5% | 1.5% |
| Fitness & Sport | 2.5% | 4.0% | 1.5% |

## Partnership Economics at Scale

### Per-Client Value

| Scenario | Monthly Traffic | CVR Gap | AOV | Monthly Gap | Retainer | ROI Multiple |
|----------|----------------|---------|-----|------------|----------|-------------|
| Small brand | 50,000 | 1.2% | £45 | £27,000 | £8,000 | 3.4x |
| Mid brand | 150,000 | 1.4% | £55 | £115,500 | £9,000 | 12.8x |
| Large brand | 400,000 | 1.0% | £65 | £260,000 | £12,000 | 21.7x |

### Agency Revenue Scaling

| Retainers | Avg Monthly Fee | Monthly Recurring | Annual Revenue |
|-----------|----------------|-------------------|----------------|
| 1 | £8,500 | £8,500 | £102,000 |
| 3 | £9,000 | £27,000 | £324,000 |
| **5** | **£9,000** | **£45,000** | **£540,000** |
| 7 | £10,000 | £70,000 | £840,000 |
| 10 | £10,000 | £100,000 | £1,200,000 |

**The target:** 5 retainers at £9K average = £45K/mo = £540K/year. This is achievable within 6-9 months with the two-stage audit system generating 2-3 qualified prospects per month.

As case studies compound and pricing scales to £10-15K, 10 retainers becomes a £1M+ business.

### Team Economics

| Retainers | Revenue/mo | Team Required | Margin |
|-----------|-----------|---------------|--------|
| 1-2 | £8-18K | Dylan + 1 designer + 1 dev | ~60% |
| 3-5 | £27-45K | + strategist/PM + 1 designer | ~55% |
| 6-10 | £60-100K | + 1 designer + 1 dev + sales support | ~50% |

The delivery system (Launchpad + roadmap templates + design briefs) means scaling doesn't require linear team growth. The system handles the process — people handle the craft.

## Presentation Tips

- **Always frame as "recovered revenue"** not "potential revenue" — it's money they're already earning but losing at checkout
- **Show the breakeven number prominently** — "0.1% lift pays for itself" is more powerful than "you could make £100K more"
- **Use ranges not exact figures** — "£80-120K/mo opportunity" sounds honest, a precise number sounds fabricated
- **Compare retainer cost to one senior hire** — "less than a junior marketer, but you get a full CRO team"
- **Frame the gap as daily cost** — "Every day without this fix costs you roughly £3,800" creates urgency
- **Show the compound effect** — "Month 1: 0.5% lift. Month 3: 1.5% lift. Month 6: 2.5% lift. The results accelerate because each test informs the next."
