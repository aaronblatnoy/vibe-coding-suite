---
description: "init-pro — a richer /init: standard CLAUDE.md initialization PLUS scaffolds the lifecycle/ working flow (brainstorms, pending/plans, archive/plans)."
---

Initialize this project the pro way — a richer `/init`. Do BOTH steps, then report what you created/updated.

## 1. Standard project initialization (CLAUDE.md)

Analyze this codebase thoroughly and create — or refine, if one already exists — a `CLAUDE.md` at the repo root that lets a future Claude Code session be productive immediately. Cover:

- **Big picture** — what the project is, the core domain concepts, and the load-bearing invariants (the things that, when violated, cause the most bugs).
- **Architecture** — the main components / services / packages and how they fit together; key directories.
- **Common commands** — build, test, run, lint, migrate, etc., *verified* from package.json / Makefile / scripts (not guessed).
- **Conventions & gotchas** — naming, patterns, non-obvious rules, things that bite newcomers.
- **What NOT to do** — invariants to never violate (security / privacy / data-handling rules, read-only boundaries, etc.).

Keep it concise and high-signal — prefer what *isn't* obvious from a glance at the tree. If a good `CLAUDE.md` already exists, improve it; don't clobber useful content.

## 2. Scaffold the lifecycle working flow

Create the standard **brainstorm → plan → execute** folders (idempotent — never overwrite existing ones), each with a `.gitkeep` so they persist in git:

- `lifecycle/brainstorms/` — exploratory idea docs (written by the **feature-brainstormer** agent).
- `lifecycle/pending/plans/` — active buildout phase plans (written by **phase-plan-architect**).
- `lifecycle/archive/plans/` — plans that have been executed (moved here by **phase-plan-executor** on a successful build).

Then add a short **"Working flow"** section to `CLAUDE.md` documenting this brainstorm → plan → execute lifecycle and which agent owns each folder, so the convention is discoverable by future sessions.

Use `.gitkeep` files for the empty dirs. Report the CLAUDE.md changes + the folders created.
