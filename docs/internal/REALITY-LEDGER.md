# ARC_ASSURANCE_01 — Reality Ledger

Updated: 2026-09-28

This ledger records what is **OBSERVED**, **INFERRED**, or **UNKNOWN**. It is not a marketing document.

## OBSERVED

- The public repository `Faadil1/ARC_ASSURANCE_01` exists.
- PR #1 contains the draft PRD, work split, canonical state, handover, and contribution rules.
- Opeyemi has been invited as a collaborator; acceptance is still pending.
- The current product direction is a precommitted hidden-canary assurance mechanism for deterministic paid work.
- The critical MVP path intentionally excludes Circle Agent Wallets, Nanopayments, x402, ERC-8004, and ERC-8183.
- No canonical Arc mainnet product run has been completed yet.
- No live pass→pay / fail→no-pay / breaker→refund evidence exists yet.
- No external user/operator trial has been recorded yet.

## INFERRED

- Structured document extraction is a suitable MVP domain because acceptance can be represented deterministically.
- Arc mainnet can be a load-bearing settlement layer for the mechanism if T0 and the full financial-causality loop succeed.
- Hidden one-time canaries may reduce benchmark gaming relative to public fixed tests, but canary detectability remains a real risk.
- The strongest differentiation is likely continuous hidden verification with financial consequence, not generic payments, escrow, procurement, or policy gating.

## UNKNOWN

- Whether an external operator will find the problem painful enough to use the mechanism.
- Whether a real provider can reliably be kept unaware of which work item is the canary.
- Actual mainnet gas/operational cost for the final contract lifecycle.
- Whether judge/operator self-serve can be made clear without creator narration.
- Whether the mechanism remains distinctive after the next competitive-novelty refresh.
- Whether one or more external dependencies will fail in a way that requires architecture changes.

## Evidence classes

Use only:

- `LIVE`
- `LOCAL`
- `LOCAL_STUB`
- `PRESEEDED`
- `SIMULATED`
- `PARTIAL`
- `NOT_IMPLEMENTED`

A screenshot, replay, static fixture, or recorded transaction is evidence only for what it directly demonstrates.

## Current live-reality status

- Live Core Loop: **NOT_IMPLEMENTED**
- Load-Bearing Arc Integration: **NOT_IMPLEMENTED**
- Real Consequence: **NOT_IMPLEMENTED**
- External User/Operator Evidence: **NOT_IMPLEMENTED**
- Judge/Operator Self-Serve: **NOT_IMPLEMENTED**
- Clean-Room Reproduction: **NOT_IMPLEMENTED**
- Post-Vertical-Slice Depth Review: **NOT_IMPLEMENTED**


## Pre-Build Reality evidence delta — 2026-09-28

### OBSERVED

External sources now document:

- a Codex operator reporting 1,917 metered requests / 62.2M tokens / about $453 in one day after an autonomous session created its own metered runner;
- x402 issue #1062 reporting wallets debited while paid requests returned no data because settlement completed after facilitator timeout;
- Anthropic's April 23 engineering postmortem confirming user-visible Claude Code degradation, repetitive/forgetful behavior, and faster usage-limit drain;
- x402 issue #2911 showing that a green setup/health check does not prove the paid verify/settle path actually works.

Full source record:
- `docs/research/PRE-BUILD-REALITY-EVIDENCE.md`

### INFERRED

These incidents support the product problem:

```
authorization/payment success
!=
ongoing useful outcome
```

and justify continuous external assurance rather than relying only on initial authorization or static health checks.

### UNKNOWN

- Product-specific demand.
- Hidden-canary acceptance by real providers.
- Product usability by external operators.
- Willingness to pay / adoption / retention.
