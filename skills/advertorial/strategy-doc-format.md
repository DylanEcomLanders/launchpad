# Strategy doc format (input contract)

This is the contract between the brief form and the runner. The pipeline renders
a strategy doc in exactly this shape from the `advertorial_briefs` row, then
hands it to the runner. Starter version - refine as IP matures, and bump VERSION
when you do.

## The four non-inventable inputs (generation is blocked without these)

1. **Product mechanism** - how the product actually works. Plain, specific,
   true. The runner may not invent mechanism.
2. **Review quotes** - real customer quotes with a source. Only quotes marked
   `verified` may be used. At least one verified quote is required. The runner
   may not invent, paraphrase into a stronger claim, or attribute.
3. **Approved claims (the claims fence)** - the exhaustive list of claims the
   client has approved. **The runner may not make any claim not on this list,
   and may not strengthen an approved claim.** This is the compliance spine.
4. **Offer** - price, anchor, guarantee, and whether urgency is real. If
   `urgency_real` is false, the runner uses no urgency devices at all.

## Strategy remainder

- **Angle** - the specific take this advertorial runs.
- **Awareness level** - unaware | problem | solution | product. Sets how much
  education the opening must do.
- **Ad scent** - the ad copy the reader just clicked. The headline must
  continue this thread; a mismatched headline is an automatic bin.
- **Audience** - who this is for, in their own terms.
- **Language** - UK or US English. Spelling and idiom must match.

## Compliance flags

`ingestible`, `wellness_claims`, `paid_social_imagery`. When any is true, the
matching gate in `templates/advertorial-story.md` is enforced and the
disclaimer footer is required.

## Rendered shape handed to the runner

```
ANGLE: ...
AWARENESS: ...
AD SCENT: "..."
AUDIENCE: ...
LANGUAGE: UK

PRODUCT MECHANISM:
...

VERIFIED REVIEWS (use only these, verbatim, with source):
- "..." - source
- "..." - source

APPROVED CLAIMS (you may not exceed or add to this list):
- ...
- ...

OFFER:
price: ... | anchor: ... | guarantee: ...
urgency_real: false   # if false, use no urgency devices

COMPLIANCE FLAGS: ingestible=true wellness_claims=true paid_social_imagery=false
```
