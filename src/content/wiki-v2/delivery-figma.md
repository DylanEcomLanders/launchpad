---
title: Figma workflow
section: Delivery
subsection: Design
order: 611
---

How we structure design files so the dev can pick them up without a phone call.

## File structure

**One Figma file per client.** If a client owns multiple brands, one file per brand.

Inside the file, version control is by labelled, dated areas. When a new scope of work kicks off, a new area gets added to the same file rather than spawning a separate file. Keeps everything in one place when you're looking back six months later.

## The design library

We maintain a Figma **design library** of reusable elements: components, type styles, common section patterns. It mirrors a matching **Shopify dev library** so when a design uses a library component, the dev has a corresponding piece of code to drop in.

The library is what keeps pages clean and effective without rebuilding common elements every time.

## Handoff to dev

A handoff isn't a Figma share. It's a package:

- **Loom walkthrough** of the design, calling out anything the file doesn't say out loud.
- **Figma comments** for specific notes pinned in context.
- **All assets** (images, video, icons) exported and shared.
- **Fonts** confirmed and provided where licensing requires it.

## Naming conventions

Layers, frames, and components should be **straightforward and descriptive**. If a frame is the hero section, call it `hero`. If a layer is a button, call it `button`. Use the Figma rename plugin when restructuring; don't leave a file full of `Group 23` and `Frame 412`.
