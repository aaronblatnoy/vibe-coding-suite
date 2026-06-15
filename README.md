# Aaron's Vibe Coding Suite

Hey everyone, my name is Aaron! I'm a student at NYU and a self-proclaimed vibe coder! I haven't had the chance to open-source most of my projects because I mainly deal with protected data, but I do want to share my vibe coding suite.

This suite consists of three types of tools:

- **Agents** — specialized workers who excel at some specific task (most of my subagents are project level, so they are not here).
- **Workflows** — dynamic scripts that coordinate multiple agents working together to tackle bigger, more complex jobs.
- **Commands** — slash commands that set up or automate a repeatable chore.

Several of these tools form a **brainstorm → plan → execute** pipeline: `/init-pro` scaffolds the working folders, **feature-brainstormer** explores an idea into `lifecycle/brainstorms/`, **phase-plan-architect** turns a brainstorm into a buildout plan in `lifecycle/pending/plans/`, and **phase-plan-executor** compiles that plan into a real parallel workflow and archives it to `lifecycle/archive/plans/` once it's built.

Feel free to use this suite for your own development!

---

## Agents

Agents are subagents you drop into `~/.claude/agents/`. Claude Code picks them up automatically and routes tasks to them based on their descriptions. These are  Claude instances that are good at some very specific task and/or have specialized knowledge. 

### Feature Brainstormer

Explores a feature, idea, or direction **without building it**. It investigates just enough to ground the idea in the real codebase + the project's constraints, maps the design space (options, tradeoffs, risks, dependencies, open questions), takes an honest position, and writes a single exploratory brainstorm doc to `lifecycle/brainstorms/` that you can revisit later. It never writes code, knowledge, or plans — its only artifact is the markdown brainstorm. This is the front of the brainstorm → plan → execute flow.

**Invoke:** "Brainstorm a no-show predictor and put it in the brainstorms folder" or "let's think about SMS reminders — just brainstorm it for now."

---

### Phase Plan Architect

Transforms a high-level feature request, augmentation, or coding instruction into a thorough multi-phase buildout plan saved as a `.txt` file in `lifecycle/pending/plans/`. It reads the codebase first, understands the architecture, and produces a plan so detailed that implementation becomes mechanical — and it can pick up a brainstorm from `lifecycle/brainstorms/` as its starting point. It does **not** write code — it writes the plan that makes writing code easy.

**Invoke:** "Plan out how we'd add Apple CalDAV support" or "I want to add group chat — write a buildout plan."

---

### Phase Plan Executor

Takes a multi-phase buildout plan and compiles it into a **dynamic Workflow script** — real, independent, parallel agents. It does not execute the plan itself (subagents can't spawn subagents); it designs the orchestration that does. It reads the plan from `lifecycle/pending/plans/`, and the workflow it designs archives the plan to `lifecycle/archive/plans/` once the build succeeds. The result is a Workflow script you run via the Workflow tool, where genuine fan-out actually happens.

**Invoke:** "Here's my 10-phase plan — execute all of it" or "Build this out with real parallelism."

---

### Safari Driver

Drives your running Safari browser from the terminal via `osascript` (AppleScript). No Selenium, no Playwright — it talks directly to the Safari app and reuses your live session, cookies, and auth state. Can read page content, scrape behind auth, fill forms, click elements, run arbitrary JavaScript in open tabs, and orchestrate multi-tab jobs. Can also spawn subagent teams for large or risky jobs.

**Invoke:** "Grab the article text from the Safari tab I'm reading" or "I'm logged into the admin dashboard — pull the user table."

---

### Annoying Compliance Officer

A hawkish, detail-obsessed reviewer for how **sensitive data** is handled — PHI, PII, client/customer data, secrets. It inventories every place sensitive data is read, stored, transmitted, logged, or exposed to a third party, then returns a verdict — **APPROVE / APPROVE-WITH-CONDITIONS / BLOCK** — with concrete fixes. It leans strict (unsure = unsafe until proven) but is reasonable: it approves genuinely-safe patterns like local/on-box LLMs, BAA-covered destinations, correct de-identification, encryption, and IDs-only logs. It only reviews — it never modifies code or data, and it won't echo the sensitive values it reviews into its own report.

**Invoke:** "Audit this feature for how it handles client data before I merge" or "we're about to send patient data to an external API — sign off on it?"

---

## Workflows

Workflows are multi-agent orchestration scripts that live in `~/.claude/workflows/`. They can fan out real, independent agents in parallel — not one model pretending to be many. Run them via the Workflow tool in Claude Code.

### Audit Duo

Verifies a claim or work product to high confidence using **two genuinely independent agents** that evaluate separately, then cross-examine each other until they converge — or honestly report an unresolved split. No manufactured consensus. Built for situations where a single reviewer isn't enough: PHI gates, migrations, proofs, security-sensitive merges.

**Phases:** Independent evaluation → Cross-examination → Consensus verdict

**Usage:** Pass `args.claim` (what to verify) + `args.context` (scope/files). Optional `args.maxRounds` (default 3).

---

### Ozempic Protocol

Maps a bounded surface for bloat, fans out **real parallel auditors** (one per offender), dedupes findings, ranks by impact, and splits tactical vs. architectural. Optionally ships the safe tactical trims automatically.

**Phases:** Map → Audit (parallel) → Synthesize → Apply (optional)

**Usage:** Pass `args.target` (path/glob/description). Add `args.apply=true` to auto-apply tactical trims.

---

### Refractor Trio

High-rigor three-agent refactoring for changes that touch many files — renames, moves, signature changes, schema migrations. A **MAPPER** finds every site the change touches. A **BUILDER** applies the change consistently. An **independent CHECKER** re-scans from scratch for missed sites, orphan callers, and broken cross-references. BUILDER and CHECKER loop until the build is clean.

**Phases:** Map → Build → Check → Reconcile (loops until clean)

**Usage:** Pass `args.refactor` (the change in plain words) + `args.scope` (paths/repo). Optional `args.verify` (build/typecheck/test command) and `args.maxRounds` (default 3).

---

## Commands

Slash commands live in `~/.claude/commands/`. Type `/<name>` in Claude Code to run one.

### /init-pro

A richer `/init`: it does the standard project initialization (analyze the codebase → write a thorough `CLAUDE.md`) **and** scaffolds the `lifecycle/` working folders — `brainstorms/`, `pending/plans/`, and `archive/plans/` — that the agents above use. Run it once per project to set up the brainstorm → plan → execute flow.

**Invoke:** `/init-pro`

---

## Installation

Copy the files into your Claude Code config directory:

```bash
# Agents
cp agents/*.md ~/.claude/agents/

# Workflows
cp workflows/*.js ~/.claude/workflows/

# Commands
cp commands/*.md ~/.claude/commands/
```

Restart Claude Code and the agents, workflows, and commands will be available automatically.
