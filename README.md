# Vibe Coding Suite

Hi my name is Aaron! I'm a student at NYU and a self-described vibe coding extraordinaire! I haven't had the chance to open-source most of my projects because I mainly deal with protected data, but I wanted to share my vibe coding suite, which consists of several subagents and workflows with the community. Godspeed!

---

## Agents

Agents are subagents you drop into `~/.claude/agents/`. Claude Code picks them up automatically and routes tasks to them based on their descriptions.

### Phase Plan Architect

Transforms a high-level feature request, augmentation, or coding instruction into a thorough multi-phase buildout plan saved as a `.txt` file. It reads the codebase first, understands the architecture, and produces a plan so detailed that implementation becomes mechanical. It does **not** write code — it writes the plan that makes writing code easy.

**Invoke:** "Plan out how we'd add Apple CalDAV support" or "I want to add group chat — write a buildout plan."

---

### Phase Plan Executor

Takes a multi-phase buildout plan and compiles it into a **dynamic Workflow script** — real, independent, parallel agents. It does not execute the plan itself (subagents can't spawn subagents); it designs the orchestration that does. The result is a Workflow script you run via the Workflow tool, where genuine fan-out actually happens.

**Invoke:** "Here's my 10-phase plan — execute all of it" or "Build this out with real parallelism."

---

### Safari Driver

Drives your running Safari browser from the terminal via `osascript` (AppleScript). No Selenium, no Playwright — it talks directly to the Safari app and reuses your live session, cookies, and auth state. Can read page content, scrape behind auth, fill forms, click elements, run arbitrary JavaScript in open tabs, and orchestrate multi-tab jobs. Can also spawn subagent teams for large or risky jobs.

**Invoke:** "Grab the article text from the Safari tab I'm reading" or "I'm logged into the admin dashboard — pull the user table."

---

## Workflows

Workflows are multi-agent orchestration scripts that live in `~/.claude/workflows/`. They fan out real, independent agents in parallel — not one model pretending to be many. Run them via the Workflow tool in Claude Code.

### Audit Duo

Verifies a claim or work product to high confidence using **two genuinely independent agents** that evaluate separately, then cross-examine each other until they converge — or honestly report an unresolved split. No manufactured consensus. Built for situations where a single reviewer isn't enough: PHI gates, migrations, proofs, security-sensitive merges.

**Phases:** Independent evaluation → Cross-examination → Consensus verdict

**Usage:** Pass `args.claim` (what to verify) + `args.context` (scope/files). Optional `args.maxRounds` (default 3).

---

### Ozempic Protocol (Workflow)

The workflow version of the Ozempic Protocol agent. Maps a bounded surface for bloat, fans out **real parallel auditors** (one per offender), dedupes findings, ranks by impact, and splits tactical vs. architectural. Optionally ships the safe tactical trims automatically.

**Phases:** Map → Audit (parallel) → Synthesize → Apply (optional)

**Usage:** Pass `args.target` (path/glob/description). Add `args.apply=true` to auto-apply tactical trims.

---

### Refractor Duo

High-rigor paired refactoring for changes that touch many files — renames, moves, signature changes, schema migrations. A **MAPPER** finds every site the change touches. A **BUILDER** applies the change consistently. An **independent CHECKER** re-scans from scratch for missed sites, orphan callers, and broken cross-references. BUILDER and CHECKER loop until the build is clean.

**Phases:** Map → Build → Check → Reconcile (loops until clean)

**Usage:** Pass `args.refactor` (the change in plain words) + `args.scope` (paths/repo). Optional `args.verify` (build/typecheck/test command) and `args.maxRounds` (default 3).

---

## Installation

Copy the files into your Claude Code config directory:

```bash
# Agents
cp agents/*.md ~/.claude/agents/

# Workflows
cp workflows/*.js ~/.claude/workflows/
```

Restart Claude Code and the agents and workflows will be available automatically.
