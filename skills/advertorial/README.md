# Advertorial kit

The engine behind Advertorial Production. These files are **versioned source**:
the annotated Jobs and Rules in the template are the IP. Every generation job
records the kit version it ran against, so `used` vs `binned` rate can be tracked
per version.

## Files (to be committed here)

| File | Role |
|---|---|
| `shell.html` | Self-contained HTML/CSS shell, brand-themed via `:root` CSS variables only. All output writes into this. |
| `templates/advertorial-story.md` | Story/discovery format. Annotated Jobs + Rules + the three hard-coded compliance gates. |
| `strategy-doc-format.md` | The input contract, including the approved-claims fence. |
| `prompt.md` | The runner prompt. Output is (1) the complete HTML file and (2) a QA block. |

## Version convention (enforced)

`VERSION` starts at `1.0.0`. **When any kit file is edited, bump `VERSION`.**
Recurring bin reasons during dial-in become new Rules in
`templates/advertorial-story.md` and a version bump. Kit iteration happens on
`staging` like everything else; never edit a kit file without bumping VERSION.

## Kill switch

If bin rate exceeds 50% after the first month of real jobs post-promotion, the
kit gets revised before any rollout to more asset types. This is a documented
decision rule, not code-enforced.
