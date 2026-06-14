export const meta = {
  name: 'refractor-duo',
  description: 'High-rigor paired refactor with two GENUINELY SEPARATE agents: a MAPPER finds every site (defs, refs, cross-refs, INDEX/frontmatter/imports/config), a BUILDER applies the change consistently, and an INDEPENDENT CHECKER re-scans from scratch to hunt every missed site / orphan caller / broken cross-ref and run the build — looping BUILDER↔CHECKER until clean. For renames, moves, signature changes, schema migrations.',
  whenToUse: 'Multi-file refactors where consistency matters and a missed reference breaks things — renames, moves, signature changes, schema/frontmatter migrations touching cross-references. Pass args.refactor (the change in plain words) + args.scope (paths/repo) + optional args.verify (a build/typecheck/test command) + optional args.maxRounds (default 3).',
  phases: [
    { title: 'Map', detail: 'find every site the change touches + a precise edit spec' },
    { title: 'Build', detail: 'BUILDER applies the change consistently across all sites' },
    { title: 'Check', detail: 'INDEPENDENT checker re-scans for misses/orphans/broken refs + runs build' },
    { title: 'Reconcile', detail: 'BUILDER fixes gaps, CHECKER re-verifies, until clean' },
  ],
}

const MAP_SCHEMA = {
  type: 'object',
  required: ['edit_spec', 'sites'],
  properties: {
    edit_spec: { type: 'string' },  // the EXACT transformation to apply identically everywhere
    verify_cmd: { type: 'string' }, // build/typecheck/test command, or "" if none
    sites: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'what'],
        properties: {
          path: { type: 'string' },
          what: { type: 'string' },   // definition | reference | cross-ref (import/INDEX/frontmatter/config/doc)
          detail: { type: 'string' },
        },
      },
    },
  },
}

const CHECK_SCHEMA = {
  type: 'object',
  required: ['clean', 'gaps'],
  properties: {
    clean: { type: 'boolean' },
    build_passed: { type: 'boolean' },
    notes: { type: 'string' },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'issue'],
        properties: {
          path: { type: 'string' },
          issue: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        },
      },
    },
  },
}

const refactor = (args && typeof args === 'object' ? args.refactor : args) || 'the requested refactor'
const scope = (args && typeof args === 'object' && args.scope) || 'the current repository'
const maxRounds = (args && typeof args === 'object' && args.maxRounds) || 3

// ---- Map: find EVERY site + a precise, identical edit spec ----
phase('Map')
const map = await agent(
  `You are the MAPPER for a high-rigor paired refactor.
REFACTOR: ${refactor}
SCOPE: ${scope}

Find EVERY site this change touches — refactors fail by MISSING a site, so be exhaustive with grep/git grep:
  - the definition(s), every reference/caller, AND the easy-to-miss cross-references:
    import paths, INDEX files, frontmatter, config, docs, string references, generated files.
Produce:
  - edit_spec: the EXACT transformation to apply identically at every site (e.g. "rename symbol X -> Y; update import path a/b -> a/c"),
  - verify_cmd: a build/typecheck/test command that would catch a broken refactor (or "" if none exists),
  - sites: the full list (path + what + detail). Do NOT edit anything — only map.`,
  { label: 'map', phase: 'Map', schema: MAP_SCHEMA }
)
log(`mapped ${map.sites.length} sites; verify_cmd=${map.verify_cmd || '(none)'}`)

// ---- Build: BUILDER applies the change consistently (one coherent actor) ----
phase('Build')
await agent(
  `You are the BUILDER in a paired refactor. Apply this change CONSISTENTLY across every site.
REFACTOR: ${refactor}
EDIT SPEC: ${map.edit_spec}
SITES (${map.sites.length}): ${JSON.stringify(map.sites).slice(0, 9000)}

Edit every site with the Edit tool, applying the SAME transformation everywhere — the new name/signature/shape MUST match exactly across all files, and cross-references (imports, INDEX, frontmatter, config) must be updated too. Change ONLY what the refactor requires; do not alter behavior. Report what you changed per file.`,
  { label: 'builder:0', phase: 'Build' }
)

// ---- Check: an INDEPENDENT checker re-scans from scratch + runs the build ----
phase('Check')
const checkPrompt = () =>
  `You are the CHECKER in a paired refactor — INDEPENDENT of the builder; do NOT trust the builder's report.
REFACTOR: ${refactor}
EDIT SPEC: ${map.edit_spec}
SCOPE: ${scope}

Re-scan the ENTIRE scope yourself with grep/git grep. Hunt for: any remaining OLD references the builder missed, orphan callers, broken cross-refs (imports/INDEX/frontmatter/config), inconsistent new names across files, and partial/duplicated edits.
${map.verify_cmd ? `Then RUN the verify command \`${map.verify_cmd}\` and report build_passed.` : 'No verify command exists; rely on exhaustive static checks.'}
Return clean=true ONLY if there are zero gaps AND (no verify_cmd OR it passed). Otherwise list EVERY gap with its path and the exact issue.`

let check = await agent(checkPrompt(), { label: 'checker:0', phase: 'Check', schema: CHECK_SCHEMA })
log(`check 0 — clean=${check?.clean} gaps=${check?.gaps?.length ?? '?'}`)

// ---- Reconcile: BUILDER fixes gaps, CHECKER re-verifies, until clean or maxRounds ----
phase('Reconcile')
let round = 0
while (check && !check.clean && round < maxRounds) {
  round++
  await agent(
    `You are the BUILDER, round ${round}. The INDEPENDENT checker found these gaps in the refactor — fix EACH one with the same edit_spec, introducing no new inconsistencies.
EDIT SPEC: ${map.edit_spec}
GAPS: ${JSON.stringify(check.gaps).slice(0, 7000)}
Edit the affected files and report what you fixed.`,
    { label: `builder:${round}`, phase: 'Reconcile' }
  )
  check = await agent(checkPrompt(), { label: `checker:${round}`, phase: 'Reconcile', schema: CHECK_SCHEMA })
  log(`check ${round} — clean=${check?.clean} gaps=${check?.gaps?.length ?? '?'}`)
}

return {
  refactor,
  clean: !!(check && check.clean),
  rounds: round,
  build_passed: check ? check.build_passed : undefined,
  remaining_gaps: check && !check.clean ? check.gaps : [],
  summary: check ? (check.notes || '') : 'checker did not return',
}
