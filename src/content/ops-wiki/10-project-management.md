# Project Management & Delivery Rhythm

## Weekly Rhythm

Consistency in how we work makes everything more predictable — for us and for clients.

### Monday: Planning
- Review all active projects and their status
- Check the week's deliverables and deadlines
- Assign or re-prioritise tasks based on current capacity
- Flag any blockers (waiting on client feedback, missing assets, etc.)
- Send weekly plan to the team by 10am

### Tuesday - Thursday: Execution
- Heads-down build and design time
- Internal reviews happen during this window
- Client calls scheduled in this window (avoid Mondays and Fridays)
- Daily async standup: each team member posts a quick update
  - What I did yesterday
  - What I'm doing today
  - Any blockers

### Friday: Review & Wrap
- Review everything delivered this week
- QA any work before sending to clients
- Send weekly client updates (see `14-client-comms.md`)
- Update task boards and project timelines
- Flag anything at risk for next week

## Task Board Usage

### Status Columns

| Column | Meaning |
|--------|---------|
| **Backlog** | Scoped but not yet started. Not assigned to a sprint |
| **To Do** | Assigned to this week's sprint. Ready to start |
| **In Progress** | Currently being worked on |
| **In Review** | Internal review (peer review, design review, QA) |
| **Client Review** | Sent to client, waiting for feedback |
| **Done** | Approved and complete |

### Task Naming Convention
```
[Client] — [Deliverable] — [Specific Task]
```
Examples:
- `Hydra — Landing Page — Hero Section Build`
- `Glow — Homepage — Design Review Round 2`
- `Bolt — CRO Audit — Data Collection`

### Task Requirements
Every task must have:
- A clear owner (one person responsible)
- A due date
- A description or link to the relevant brief/handoff doc
- Estimated hours (for capacity planning)

> **If a task doesn't have an owner and a due date, it won't get done.** Unassigned tasks are wishes, not work.

## Communication Cadence

| Audience | Frequency | Channel | Content |
|----------|-----------|---------|---------|
| Internal team | Daily | Async standup (Slack/ClickUp) | Yesterday, today, blockers |
| Internal team | Weekly (Monday) | Planning meeting or async brief | Week plan, priorities |
| Client (retainer) | Weekly (Friday) | Email + Loom if needed | Progress update, next steps |
| Client (project) | Per milestone | Email + Loom | Deliverable for review |
| Client (urgent) | Same day | Slack or email | Issue notification + resolution plan |

## Retainer Monthly Rhythm

For clients on monthly retainers, follow this 4-week cycle:

### Week 1: Strategy & Planning
- Review last month's performance data
- Identify optimisation opportunities
- Prioritise work for the month (use ICE scoring — see `07-testing-framework.md`)
- Present the monthly plan to the client for alignment
- Gather any new requests or priorities from the client

### Week 2-3: Build & Execute
- Execute on the prioritised plan
- Design, build, and test changes
- Run any planned A/B tests
- Internal QA before shipping

### Week 4: Launch & Review
- Deploy changes to live
- Monitor post-launch performance
- Compile monthly report (see `08-reporting.md`)
- Send report to client
- Schedule monthly review call (30 minutes)

> **Retainer hours must be logged against specific tasks.** No vague "general work" entries. The client should be able to see exactly what their hours were spent on.

## Capacity Planning

### Hours Per Person Per Week
- **Available hours:** 40 hours/week
- **Productive hours:** 30-32 hours/week (meetings, admin, context switching eat the rest)
- **Billable target:** 25-28 hours/week

### Project Hour Estimates

| Project Type | Typical Hours |
|-------------|---------------|
| Landing Page (design + build) | 30-50 hours |
| Homepage Redesign | 40-60 hours |
| Collection Page | 20-35 hours |
| CRO Audit (standard) | 10-16 hours |
| Monthly Retainer (typical) | 15-25 hours |

### Capacity Rules
- No person should be assigned more than 2 active projects simultaneously
- If someone is over capacity, raise it in Monday planning — don't wait until they're drowning
- Buffer 20% of weekly capacity for urgent requests and revisions
- Track actual hours vs. estimated hours to improve future estimates

## Escalation Process

### Level 1: Team Lead
**When:** Task is blocked, deadline at risk, client is unresponsive, unclear requirements.
**Action:** Raise in daily standup or message the team lead directly. Response expected within 4 hours.

### Level 2: Account Lead
**When:** Scope disagreement with client, budget concerns, timeline needs to shift, client relationship issue.
**Action:** Message the account lead with a summary of the issue and your recommended resolution. Response expected within 1 business day.

### Level 3: Agency Owner
**When:** Contract dispute, client threatening to leave, team conflict, financial decision needed.
**Action:** Direct message with full context. Response expected within 4 hours.

### Escalation Rules
- **Always escalate with a proposed solution**, not just the problem
- **Escalate early.** A problem flagged on Monday is manageable. The same problem flagged on Friday is a crisis
- **Document escalations.** Add a note to the project log so there's a record
- **Never surprise a client.** If a deadline is at risk, tell them before it's missed, not after

> **The cost of escalating too early is almost zero. The cost of escalating too late can be a lost client.** When in doubt, escalate.
