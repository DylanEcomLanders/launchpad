# Revenue Projector

## Overview

The Revenue Projector calculates how much revenue a brand is leaving on the table due to post-click conversion gaps. This is the number that sells the retainer — it makes the ROI mathematical, not hypothetical.

## The Formula

```
Monthly Revenue Gap = Monthly Traffic × (Benchmark CVR - Current CVR) × AOV
```

**Example:**
- Monthly traffic: 150,000 sessions
- Current CVR: 1.8%
- Benchmark CVR: 3.2% (DTC health/wellness average)
- AOV: £55

Gap = 150,000 × (0.032 - 0.018) × £55 = **£115,500/mo left on the table**

## Breakeven Calculation

```
Retainer Breakeven CVR Lift = Retainer Cost / (Monthly Traffic × AOV)
```

**Example:**
- Retainer: £9,000/mo
- Monthly traffic: 150,000
- AOV: £55

Breakeven = £9,000 / (150,000 × £55) = **0.11% CVR lift**

"The retainer pays for itself if we improve your conversion rate by 0.11%. Our average client sees 1-2% in the first 90 days."

## Data Sources

| Data Point | Primary Source | Fallback |
|-----------|---------------|----------|
| Monthly traffic | GA4 (ask on Call 1) | SimilarWeb estimate |
| Current CVR | GA4 / Shopify analytics | Industry benchmark - 30% |
| AOV | Shopify analytics | Calculate from site (price × typical basket) |
| Benchmark CVR | Industry data by vertical | Use 3.0% DTC average |

## Industry CVR Benchmarks

| Vertical | Average CVR | Top Quartile |
|----------|-------------|--------------|
| Health & Supplements | 2.8% | 4.5% |
| Beauty & Skincare | 3.1% | 5.0% |
| Fashion & Apparel | 2.2% | 3.8% |
| Food & Beverage | 3.5% | 5.5% |
| Pet | 3.0% | 4.8% |
| Home & Living | 2.0% | 3.5% |
| Fitness & Sport | 2.5% | 4.0% |

## Using the Tool

> **TODO:** Link to the Revenue Projector tool in Launchpad when built. Input: URL + traffic + CVR + AOV. Output: revenue gap, breakeven CVR lift, and visual chart for the sales deck.

## Presentation Tips

- Always frame as "recovered revenue" not "potential revenue" — it's money they're already earning but losing at checkout
- Show the breakeven number prominently — "0.1% lift pays for itself" is more powerful than "you could make £100K more"
- Use ranges not exact figures — "£80-120K/mo opportunity" sounds honest, a precise number sounds fabricated
- Compare retainer cost to one senior hire — "less than a junior marketer, but you get a full CRO team"
