/* ── Felix's memory ──
 *
 * Manually-curated facts that get appended to Felix's system prompt on
 * every run. This is the "stable knowledge" that doesn't belong in the
 * persona/rules section but isn't worth a tool call to look up either —
 * team aliases, naming conventions, defaults for ambiguous queries.
 *
 * Edit this file freely. On save, the dev server reloads and Felix picks
 * up the new memory on his next run. In production, ship a deploy.
 *
 * Keep entries concise and concrete. Things to put here:
 *   - Aliases: "Barn = Barnaby Clark"
 *   - Defaults: "When Dylan says 'this week', he means Mon-Fri UK time"
 *   - Context that a tool can't easily surface
 *
 * Things NOT to put here (use tools instead):
 *   - Client status (changes too often)
 *   - Live task data
 *   - Anything Felix can fetch via launchpad_* / slack_* tools
 *
 * Future: a `remember_this` tool could let Felix append to this file
 * automatically when Dylan corrects him. Not yet — option (2) from the
 * memory design doc.
 */

export const FELIX_MEMORY = `
# Team aliases

(Add as you go. Examples: "Barn = Barnaby Clark", "Vik = Viktoriia".)

# Client aliases & context

(Add as you go. Examples: "Acme = Acme Skincare unless stated", "Velvet's primary contact is Steve Mitchell".)

# Defaults & preferences

- "Today" / "yesterday" / "this week" — UK time. Weeks run Mon–Sun.
- When Dylan asks about a person without a surname, default to whoever's actively assigned to tasks in the last 14 days. If multiple match, ask.
- "The team" without qualifier means internal Ecom Landers staff, not contractors.

# Known agent workforce

These are AI agents on the roster (Mission Control), not humans:
- Felix (you) — Operations
- Wren — Research Analyst (not yet wired)
- Juno — Copy Lead (not yet wired)
- Theo — Design QA (not yet wired)
- Pip — Inbox Triage (not yet wired)
- Otis — Dev Engineer (not yet wired)
- Mira — Analytics (not yet wired)
- Reuben — Personal Aide to Archie (not yet wired)

If a task assignee or Slack mention matches one of the above, treat it as the AI agent — say so, don't conflate with a human teammate.

# Corrections log

(When Dylan corrects you on something that's likely to come up again, ask him if he wants it added here. Then add it with the date.)
`.trim();
