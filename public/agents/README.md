# Agent Avatars — Placeholder Pixel Art

These SVGs are **v0.5 placeholders**. Each agent has two sprites — an
idle pose and a working pose — and the UI swaps between them based on
`agent.status`.

## Files

| Idle | Working | Agent | Role | Prop |
| --- | --- | --- | --- | --- |
| `felix.svg` | `felix-working.svg` | Felix | Project Manager | Clipboard |
| `wren.svg` | `wren-working.svg` | Wren | Research Analyst | Magnifier |
| `juno.svg` | `juno-working.svg` | Juno | Copy Lead | Pen + notepad |
| `theo.svg` | `theo-working.svg` | Theo | Design QA | Tablet |
| `pip.svg` | `pip-working.svg` | Pip | Inbox Triage | Envelopes |
| `otis.svg` | `otis-working.svg` | Otis | Dev Engineer | Laptop |
| `mira.svg` | `mira-working.svg` | Mira | Analytics | Bar chart |
| `reuben.svg` | `reuben-working.svg` | Reuben | Personal Aide | Planner |

## Sprite states

- **Idle** (`{id}.svg`) — standing pose with the prop at rest (in hand at
  side, tucked away, etc.). Used when `agent.status === "IDLE"` plus any
  status that isn't WORKING.
- **Working** (`{id}-working.svg`) — same character with the prop in
  active use (clipboard raised, magnifier to eye, laptop open, etc.).
  Shown only while `agent.status === "WORKING"`.

The Mission Control [/run endpoint](/src/app/api/agents/%5BagentId%5D/run/route.ts)
flips status to WORKING for the duration of the simulated agent run, then
back to IDLE on completion — that's what makes the sprite swap visible
when you brief an agent.

## Animation

CSS in [globals.css](/src/app/globals.css) drives the bobbing:

- `agent-anim-idle`    → 2.6s gentle bob, applied when status is IDLE.
- `agent-anim-working` → 0.9s faster bob, applied when status is WORKING.
- BLOCKED / OFFLINE stay still.

Per-agent `animationDelay` is hashed from the agent id, so the eight NPCs
on the index page bob out of sync — gives the "milling around" feel.

## Replacement workflow

Real pixel art from a designer will land here. Drop it in with the same
filenames (idle + working pair per agent). If switching to PNG, update
the `avatarUrl` and `workingAvatarUrl` fields in
[src/lib/agents/types.ts](/src/lib/agents/types.ts) `NAMED_AGENTS` to
match the new extension. Recommended source size: **32×32 or 64×64**;
the UI applies `image-rendering: pixelated` and scales to ~96 px on the
cards and ~192 px on the detail page.

If you change agent ids (e.g. another rename pass), the seed function in
[src/lib/agents/data.ts](/src/lib/agents/data.ts) prunes any record
whose id is no longer in `NAMED_AGENTS`, so renames clean themselves up
on next page load.
