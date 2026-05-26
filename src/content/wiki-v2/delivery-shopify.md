---
title: Shopify workflow
section: Delivery
subsection: Development
order: 621
---

We build clean, custom Shopify themes. The standard is set by the **Head Developer** and lives both in the work itself and in a shared **developer resources repo** that captures how we build, ship, and maintain Shopify projects.

## The developer resources repo

The repo isn't production code. It's a reference library and internal handbook with three things:

- **`developer-documents/`** — how we work day to day: project setup, env vars, git strategy, commit conventions, PR and code-review process, QA checklists, launch and post-launch processes.
- **`component-library/`** — reusable Liquid + CSS pairs to drop into a project and modify. UI components (buttons, forms, modals, navigation), Liquid logic patterns (conditional rendering, formatting helpers), and frontend patterns (layouts, interactions, animations).
- **`.vscode/`** — shared editor settings so diffs stay focused on logic, not formatting.

New devs onboarding to Shopify projects start here.

## Component conventions

Components are matched Liquid + CSS pairs, named consistently:

```
product-card.liquid
product-card.css
```

Predictable structure means anyone can find a component fast and know what's paired with what.

Every component should ship with:

- A short description of what it does
- Usage instructions
- Any assumptions or dependencies
- Notes on what's expected to be customised

> **Components are starting points, not black boxes. Drop them in, modify them, build on them.**

## Contribution rules

- New components added via **branch and pull request**, never directly to main.
- Pull requests reviewed before merging, even on the dev resources repo.
- Naming and structure conventions enforced (the same ones we follow in client themes).
- Update existing docs rather than duplicating them.

## Versioning

The repo doesn't follow strict semantic versioning. Changes are incremental and backwards-aware. Anything that changes a workflow is documented clearly so the rest of the team knows.

## Philosophy

The repo exists to **reduce cognitive load** and **capture shared Shopify knowledge** so devs can focus on solving client problems, not re-learning fundamentals.

If something feels useful but isn't documented, it probably belongs in the repo.

For anything not covered here or in the repo, the **Head Developer is the source of truth**.
