export const meta = {
  name: 'audit-duo',
  description: 'Verify a claim/work-product to high confidence via TWO GENUINELY INDEPENDENT agents (separate contexts) that evaluate separately, then cross-examine until they converge — or HONESTLY report an unresolved split. No manufactured consensus.',
  whenToUse: 'Irreversible/critical correctness checks where one reviewer is not enough — PHI gates, migrations, proofs, security-sensitive merges. Pass args.claim (what to verify) + args.context (scope/files). Optional args.maxRounds (default 3).',
  phases: [
    { title: 'Independent', detail: 'two agents evaluate separately, neither sees the other' },
    { title: 'Cross-examine', detail: 'each rebuts the other until verdicts converge' },
    { title: 'Verdict', detail: 'consensus, or an honest unresolved split' },
  ],
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['verdict', 'confidence', 'reasoning'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'PASS_WITH_CONCERNS', 'FAIL'] },
    confidence: { type: 'number' }, // 0..1
    reasoning: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          evidence: { type: 'string' },
          location: { type: 'string' },
        },
      },
    },
  },
}

const claim = (args && typeof args === 'object' ? args.claim : args) || 'the change is correct'
const context = (args && typeof args === 'object' && args.context) || 'the current working tree'
const maxRounds = (args && typeof args === 'object' && args.maxRounds) || 3

const agree = (x, y) => !!x && !!y && x.verdict === y.verdict

// ---- Round 0: TWO genuinely independent evaluations — parallel, separate contexts, no peeking ----
phase('Independent')
let [a, b] = await parallel([
  () =>
    agent(
      `You are ALPHA, an independent verifier evaluating SEPARATELY (you cannot see any other reviewer's work).
CLAIM to verify: "${claim}"
Scope/context: ${context}

Read the ACTUAL code/artifacts — do NOT trust any summary. Lens: rigorously establish whether the claim genuinely HOLDS, checking the load-bearing cases yourself.
Return a verdict (PASS / PASS_WITH_CONCERNS / FAIL), a confidence 0..1, reasoning citing file:line, and concrete findings (with severity).`,
      { label: 'alpha:0', phase: 'Independent', schema: VERDICT_SCHEMA }
    ),
  () =>
    agent(
      `You are BETA, an independent verifier working SEPARATELY (you cannot see any other reviewer's work).
CLAIM to verify: "${claim}"
Scope/context: ${context}

Read the ACTUAL code/artifacts — do NOT trust any summary. Lens: adversarially try to REFUTE the claim — hunt for the failure mode, edge case, or leak path that breaks it. Default to skepticism; an unproven claim is FAIL.
Return a verdict (PASS / PASS_WITH_CONCERNS / FAIL), a confidence 0..1, reasoning citing file:line, and concrete findings (with severity).`,
      { label: 'beta:0', phase: 'Independent', schema: VERDICT_SCHEMA }
    ),
])
log(`round 0 — alpha=${a?.verdict} beta=${b?.verdict}`)

// ---- Cross-examine until verdicts converge (or maxRounds) ----
phase('Cross-examine')
let round = 0
while (!agree(a, b) && round < maxRounds) {
  round++
  const prevA = a
  const prevB = b
  ;[a, b] = await parallel([
    () =>
      agent(
        `You are ALPHA, round ${round}. CLAIM: "${claim}". Scope: ${context}
Your prior verdict: ${prevA?.verdict} — ${(prevA?.reasoning || '').slice(0, 1600)}
BETA (the other independent reviewer) disagrees: ${prevB?.verdict} — ${(prevB?.reasoning || '').slice(0, 1600)}
Re-examine the ACTUAL artifacts in light of BETA's argument. CONCEDE points that are right; defend only what the evidence supports; update your verdict if warranted — no ego, no digging in. Cite file:line.`,
        { label: `alpha:${round}`, phase: 'Cross-examine', schema: VERDICT_SCHEMA }
      ),
    () =>
      agent(
        `You are BETA, round ${round}. CLAIM: "${claim}". Scope: ${context}
Your prior verdict: ${prevB?.verdict} — ${(prevB?.reasoning || '').slice(0, 1600)}
ALPHA (the other independent reviewer) disagrees: ${prevA?.verdict} — ${(prevA?.reasoning || '').slice(0, 1600)}
Re-examine the ACTUAL artifacts in light of ALPHA's argument. CONCEDE what's genuinely fine; hold only real problems you can show; update your verdict if warranted. Skeptical but honest. Cite file:line.`,
        { label: `beta:${round}`, phase: 'Cross-examine', schema: VERDICT_SCHEMA }
      ),
  ])
  log(`round ${round} — alpha=${a?.verdict} beta=${b?.verdict}`)
}

// ---- Verdict: consensus, or an HONEST unresolved split (never manufacture agreement) ----
phase('Verdict')
const converged = agree(a, b)
const report = await agent(
  `Write the final consensus-verification verdict — be honest, do not rubber-stamp.
CLAIM: "${claim}"
${
    converged
      ? `The two INDEPENDENT verifiers CONVERGED after ${round} cross-examination round(s) on: ${a.verdict}.`
      : `The two INDEPENDENT verifiers did NOT converge after ${round} round(s): ALPHA=${a?.verdict}, BETA=${b?.verdict}. Report the unresolved disagreement PLAINLY — the claim is NOT verified; do not manufacture consensus.`
  }
ALPHA final: ${JSON.stringify(a).slice(0, 4500)}
BETA final:  ${JSON.stringify(b).slice(0, 4500)}

Produce: the verdict (or the honest split), the deduped concrete findings from BOTH reviewers ranked by severity with file:line, and the action each implies. If unresolved, state clearly that it should NOT be treated as verified and exactly what's in dispute.`,
  { label: 'verdict', phase: 'Verdict' }
)

return {
  claim,
  converged,
  rounds: round,
  verdict: converged ? a.verdict : `UNRESOLVED (alpha=${a?.verdict}, beta=${b?.verdict})`,
  alpha: a,
  beta: b,
  report,
}
