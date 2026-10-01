# System Reconciliation — 2026-10-01

Central canon was re-read from `Faadil1/faadil-agent-system@main`. Adoption
starts at this material touch. Earlier project history is not rewritten.

## Actual project state

- Lifecycle state: **ACTIVE**
- Macro stage: **DESIGN**
- Operational track: **T0_MAINNET_CUSTODY**
- Formal G0 PRD_READY: **not proven** because PR #1 remains open/unmerged
- G1 T0_MAINNET_CUSTODY: **ACTIVE / NOT PROVEN**
- DELIVER: **BLOCKED**
- Submission/release: **not current**

T0 may continue as the DESIGN technical-risk spike. Pre-Build Reality problem
evidence is **PROVEN** via PR #8; DELIVER remains blocked by formal G0 plus
unproven live product-depth/runtime gates.

## Last genuinely proven state

- T0 exact-source local revalidation: 40/40 Arc Foundry tests.
- Dedicated Arc public wallet readiness: PROVEN read-only.
- Human authorization for a **0.50 USDC wallet top-up only**: PROVEN.
- T0 gas rehearsal and fee ceiling: proven only in their stated LOCAL /
  time-bound classes.

No real T0 deployment, contract custody, payout, refund or completion receipt
exists yet.

## New central mechanisms adopted prospectively

- System Control Plane v1.
- Integration-First / Maximum Product Exploitation v1.3.
- Lifecycle Coverage Manifest.
- Claim → Runtime → Evidence Graph.
- Reference Intelligence routing.
- Engineering Quality active-project backfill.
- Rule Lifecycle and Cross-Project Learning boundaries.

## Product Reality / Product Exploitation

No PRD scope change is required. The existing PRD already makes real Arc
financial causality, load-bearing integration and independent verification
mandatory.

The Product Exploitation Loop is **not triggered yet**. T0 is a technical-risk
spike, not a first live integrated product vertical slice. The loop activates
after the first live integrated product slice.

## Evidence Graph

Required now because payment, live integration, recovery and future terminal
claims need causal traceability.

Canonical graph:

`docs/internal/CLAIM-RUNTIME-EVIDENCE-GRAPH.yaml`

Local proof remains local. Read-only live observations remain read-only. Missing
deployment/runtime/receipt edges remain missing.

## Reference Intelligence

The narrow current match is the registered AI-ABC risk-tiered action /
human-approval pattern.

It remains:

- `CLASSIFIED`
- `REFERENCE_ONLY`
- `CANDIDATE_PATTERN`
- authority `NONE`

The project already has stricter protected-human-action rules, so no durable
project or global rule is adopted from the reference.

## Engineering Quality

Central active-project rollout requires a current receipt.

The current T0 operational scope now has:

`docs/internal/ENGINEERING-QUALITY-RECEIPT-T0.json`

Verdict:

`PASS_WITH_ACCEPTED_DEBT`

The separate integrated AssuranceVault line still requires its own current
Engineering Quality receipt before its next integrated deployment or
BUILD_CANDIDATE_READY-sensitive transition.

## Contradictions preserved rather than hidden

1. PR #1 remains open/unmerged, so formal G0 is not retroactively promoted.
2. Pre-Build Reality problem evidence is PROVEN in PR #8. External User/Operator
   **Product** Evidence remains a separate BLOCKED gate and must not be conflated
   with problem reality.
3. T0 and integrated AssuranceVault remain separate open PR stacks.
4. The old T0 post-audit `BLOCKED` marker is superseded by later exact-source
   40/40 evidence.
5. Historical machine funding snapshots correctly say
   `funding_authorized=false`; the later human top-up authorization is a
   separate protected decision.
6. Product Reality v1.3 and the System Control Plane are adopted now, not
   backdated into earlier work.

## Rule Lifecycle / learning

Project Rule Lifecycle decision: **NO_CHANGE**.

Cross-project learning promotion: **NONE**.

One active project does not create a new universal rule.

## Exact next gate — post-revalidation correction

`T0_FINAL_PRE_TRANSFER_REVALIDATION` is **PROVEN** on execution evidence head
`4f7f3b254a29e6023d539a85e5b126a7f21e1955`.

Proof:

- T0 Revalidation `36891632445` — SUCCESS — 40/40 tests;
- T0 Read-Only Fee Budget `36891632622` — SUCCESS;
- wallet EOA = true, pending nonce = 0, balance = 0;
- fresh contingency peak <= 0.25 USDC;
- destination exact-match = true.

The operational next gate is therefore:

`T0_WALLET_TOPUP` — **ACTIVE / HUMAN / PROTECTED**.

Automation must not move value. After the already-authorized external human
top-up, the only next machine action is the read-only
`POST_FUNDING_WALLET_RECEIPT` check, evidence recording, then STOP for a separate
deployment authorization.

The product-level gate `G1_T0_MAINNET_CUSTODY` remains **ACTIVE / NOT PROVEN**.
Contract deployment and execution are still unauthorized.


## State precedence correction — 2026-10-01

To eliminate branch/head ambiguity:

- active state branch: `ops/t0-funding-readiness`
- active state PR: **#44**
- `main`: bootstrap-only until formal G0 is merged
- execution evidence head: `4f7f3b254a29e6023d539a85e5b126a7f21e1955`
- first state-recording commit after that execution: `90d79ee7d2f891366a9962af90f440768b4347e3`
- current branch head: resolve dynamically from PR #44; do not hard-code it as the execution head

Current-state reading order:

1. `docs/internal/CANONICAL-STATE.yaml`
2. `docs/internal/BUILD-LIFECYCLE-COVERAGE.yaml`
3. `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`
4. `docs/internal/HANDOVER.md`
5. `docs/internal/REALITY-LEDGER.md`

Older contradictory prose remains historical evidence only; it cannot override
these current-state records.
