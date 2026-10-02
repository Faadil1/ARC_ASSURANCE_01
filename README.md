# ARC_ASSURANCE_01

> Internal project identifier. **Name Lock is OPEN.** This is not the final product name.

Arc Microgrants 2026 project for continuous assurance of autonomous paid work.

## Concept Lock

Core mechanism:

```
PRECOMMIT TEST
→ REAL WORK
→ HIDDEN CANARY
→ DETERMINISTIC VERIFY
→ PAY / BLOCK / CIRCUIT BREAKER
```

The project is intentionally narrow. The MVP must prove that acceptance criteria existed before execution, that a provider produced real work, and that a real Arc mainnet financial consequence followed the deterministic result.

## Truth boundary

The project must never present a local stub, simulated payment, testnet-only flow, or fabricated provider outcome as Arc mainnet evidence.

## Current status

- Project: **ACTIVE**
- Macro stage: **DESIGN**
- Concept Lock: **LOCKED**
- Product Name: **OPEN**
- Formal G0 / PRD_READY: **NOT PROVEN** — PR #1 remains open/unmerged
- Pre-Build Reality: **PROVEN** for problem reality via PR #8
- External User/Operator Product Evidence: **BLOCKED**
- T0_FINAL_PRE_TRANSFER_REVALIDATION: **PROVEN**
- T0 wallet funding receipt: **PROVEN**
- T0 mainnet deployment: **PROVEN**
- T0 policy registration: **PROVEN**
- T0 real contract funding (0.010 USDC): **PROVEN**
- T0 configured payout (0.001 USDC): **PROVEN**
- T0 remaining-funds refund (0.009 USDC): **PROVEN**
- T0 completion: **PROVEN**
- T0 operational cycle: **CLOSED / PROVEN**
- G1 T0_MAINNET_CUSTODY: **PROVEN**
- Formal sequencing blocker: **G0 PRD_READY remains NOT PROVEN**
- Next PRD product gate after G0: **G2 PRECOMMIT**
- Integrated Live Core Loop / DELIVER: **BLOCKED**

The default branch `main` is still the bootstrap line and must not be treated as
the current project-state surface until G0 is merged. Current operational state
is carried by PR #44 on `ops/t0-funding-readiness`.

Execution receipts are bound to
`4f7f3b254a29e6023d539a85e5b126a7f21e1955`; current branch head must be
resolved dynamically from PR #44.

## Collaboration

- **Faadil Boussari** — product / repo lead
- **Opeyemi (opeblow)** — technical collaborator
- **ChatGPT** — PRD, architecture assurance, evidence/gate review, handover continuity

For current state, read in this order: `docs/internal/CANONICAL-STATE.yaml`, `docs/internal/BUILD-LIFECYCLE-COVERAGE.yaml`, `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`, `docs/internal/HANDOVER.md`, then `docs/internal/REALITY-LEDGER.md`. See `product/PRD.md` and `docs/internal/WORKSPLIT.md` for product/work ownership.
