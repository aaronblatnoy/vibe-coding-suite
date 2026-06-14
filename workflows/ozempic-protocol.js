export const meta = {
  name: 'ozempic-protocol',
  description: 'Measure a bounded surface (codebase / prompt / docs / config / knowledge tree) for bloat, fan out REAL parallel auditors, and propose a prioritized slim-down with concrete before/after numbers. Optional tactical apply.',
  whenToUse: 'Find and trim bloat from a measurable surface by measurement (not vibe), with genuinely parallel auditors. Pass args.target (a path/glob/description). Pass args.apply=true to ship the safe tactical trims.',
  phases: [
    { title: 'Map', detail: 'measure the target, rank the biggest offenders' },
    { title: 'Audit', detail: 'one parallel auditor per offender, bloat with numbers' },
    { title: 'Synthesize', detail: 'dedupe, rank, split tactical vs architectural, totals' },
    { title: 'Apply', detail: 'ship the safe tactical trims (only if args.apply)' },
  ],
}

// ---- structured outputs (validated at the tool layer) ----
const MAP_SCHEMA = {
  type: 'object',
  required: ['offenders'],
  properties: {
    total_bytes: { type: 'number' },
    total_tokens_est: { type: 'number' },
    note: { type: 'string' },
    offenders: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'bytes'],
        properties: {
          path: { type: 'string' },
          bytes: { type: 'number' },
          lines: { type: 'number' },
          tokens_est: { type: 'number' },
          kind: { type: 'string' },
        },
      },
    },
  },
}

const AUDIT_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    current_bytes: { type: 'number' },
    current_tokens_est: { type: 'number' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'category', 'saving_tokens_est'],
        properties: {
          title: { type: 'string' },
          category: { type: 'string', enum: ['tactical', 'architectural'] },
          saving_bytes_est: { type: 'number' },
          saving_tokens_est: { type: 'number' },
          evidence: { type: 'string' },
          fix_summary: { type: 'string' },
          do_not_cut: { type: 'boolean' },
        },
      },
    },
  },
}

const APPLY_SCHEMA = {
  type: 'object',
  required: ['bytes_before', 'bytes_after'],
  properties: {
    bytes_before: { type: 'number' },
    bytes_after: { type: 'number' },
    applied: { type: 'array', items: { type: 'string' } },
    skipped: { type: 'array', items: { type: 'string' } },
  },
}

// args may be a bare string (the target) or { target, apply }
const target = (args && typeof args === 'object' ? args.target : args) || '.'
const APPLY = !!(args && typeof args === 'object' && args.apply)

// ---- Map: one scout measures the surface and ranks offenders ----
phase('Map')
const map = await agent(
  `You are the measurement scout for an OZEMPIC bloat audit. Target: ${target}

Measure it PRECISELY with Bash — do not estimate by vibe:
  - bytes: \`du -b\` / \`wc -c\`; lines: \`wc -l\`; enumerate with \`find\`/\`git ls-files\`.
  - token estimate ≈ chars / 4 (note it's an estimate).
If the target is a single file (e.g. a system prompt), the "offenders" are its
largest SECTIONS/rules, not sub-files. If it's a tree, offenders are the biggest files.
Return up to 20 offenders ranked by token weight, with real byte/line/token numbers,
plus the total. Measure, don't guess.`,
  { label: 'measure', phase: 'Map', schema: MAP_SCHEMA }
)
log(`mapped ${map.offenders.length} offenders, ~${map.total_tokens_est || '?'} tokens total`)

// ---- Audit: one REAL parallel agent per offender ----
phase('Audit')
const audited = await parallel(
  map.offenders.map((o) => () =>
    agent(
      `OZEMPIC auditor for: ${o.path}  (${o.bytes} bytes, ~${o.tokens_est || '?'} tokens)

Read it. Find bloat with MEASURED savings — not opinions:
  - duplication / copy-paste, over-specification, dead or unused content,
    redundant restatement, verbose phrasing, examples that don't earn their tokens.
Classify EACH finding:
  - "tactical"      = safe local trim, ZERO behavior/meaning change (ship directly).
  - "architectural" = a shape change (consolidation, cross-file dedup, restructure) → needs a plan, do NOT apply here.
For each finding give: title, category, estimated bytes & tokens saved, the evidence
(quote/line), and a one-line fix. Set do_not_cut=true on anything load-bearing you'd
explicitly preserve. Preserve all behavior; when unsure, mark architectural, not tactical.`,
      { label: `audit:${o.path}`, phase: 'Audit', schema: AUDIT_SCHEMA }
    ).then((r) => ({ path: o.path, ...r }))
  )
)

const findings = audited
  .filter(Boolean)
  .flatMap((a) => (a.findings || []).map((f) => ({ ...f, path: a.path })))
  .filter((f) => !f.do_not_cut)
  .sort((a, b) => (b.saving_tokens_est || 0) - (a.saving_tokens_est || 0))

const tactical = findings.filter((f) => f.category === 'tactical')
const architectural = findings.filter((f) => f.category === 'architectural')
const totalTok = findings.reduce((s, f) => s + (f.saving_tokens_est || 0), 0)
const totalBytes = findings.reduce((s, f) => s + (f.saving_bytes_est || 0), 0)
log(`${findings.length} findings — ${tactical.length} tactical, ${architectural.length} architectural, ~${totalTok} tokens saveable`)

// ---- Synthesize: deterministic ranking + a written report ----
phase('Synthesize')
const report = await agent(
  `Synthesize an OZEMPIC slim-down report from these measured findings (already ranked by token saving):

TARGET: ${target}   (~${map.total_tokens_est || '?'} tokens total)
TACTICAL (safe to ship): ${JSON.stringify(tactical).slice(0, 9000)}
ARCHITECTURAL (need a plan): ${JSON.stringify(architectural).slice(0, 5000)}

Produce a prioritized, de-duplicated slim-down:
  1. Lead with the highest-leverage cuts (concrete before/after byte+token numbers).
  2. Keep TACTICAL (ship directly) separate from ARCHITECTURAL (recommend handing to
     phase-plan-architect — do not pretend they're safe one-liners).
  3. State the total saveable and the % of the surface it represents.
  4. Call out anything you would NOT cut (load-bearing).
  5. No silent caps — if you set aside low-value findings, say how many.`,
  { label: 'synthesize', phase: 'Synthesize' }
)

const result = {
  target,
  totals: { tokens_saveable: totalTok, bytes_saveable: totalBytes, findings: findings.length },
  tactical_count: tactical.length,
  architectural_count: architectural.length,
  report,
}

// ---- Apply (opt-in): ship the tactical trims, one agent per file (distinct files → no edit conflict) ----
if (APPLY && tactical.length) {
  phase('Apply')
  const byFile = {}
  for (const f of tactical) (byFile[f.path] ||= []).push(f)
  const applied = await parallel(
    Object.entries(byFile).map(([path, fs]) => () =>
      agent(
        `Apply ONLY these TACTICAL (safe, zero-behavior-change) trims to ${path}:
${JSON.stringify(fs).slice(0, 5000)}

Use the Edit tool. Do NOT touch anything load-bearing or architectural, and do not
change behavior/meaning. If any trim turns out to be unsafe on inspection, skip it and
report it under "skipped". Report bytes_before and bytes_after for ${path}.`,
        { label: `apply:${path}`, phase: 'Apply', schema: APPLY_SCHEMA }
      ).then((r) => ({ path, ...r }))
    )
  )
  result.applied = applied.filter(Boolean)
  const saved = result.applied.reduce((s, a) => s + ((a.bytes_before || 0) - (a.bytes_after || 0)), 0)
  log(`applied tactical trims across ${result.applied.length} files — ${saved} bytes removed`)
}

return result
