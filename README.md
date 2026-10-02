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
- Formal G0 / PRD_READY: **PROVEN** — PR #1 merged to `main` at `1220fc5d39b2262f0b66d0ae4713629b10f3ca29`
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
- G0 sequencing blocker: **CLEARED**
- Integrated AssuranceVault deployment: **PROVEN** on Arc Mainnet at `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- Current PRD product gate: **G2 PRECOMMIT — DEPLOYMENT PROVEN / LIVE PRECOMMIT NOT PROVEN**
- Next protected gate: **G2_POLICY_CREATION_AUTHORIZATION — NOT GRANTED**
- Integrated Live Core Loop / DELIVER: **BLOCKED**

The default branch `main` now contains the merged G0 governance baseline. The
latest operational state still lives on PR #44 / `ops/t0-funding-readiness`
until the later stacked state is integrated.

The pre-transfer exact-source revalidation execution head is
`4f7f3b254a29e6023d539a85e5b126a7f21e1955`. The deployed executable runtime
was independently source-bound in the deployment receipt workflow, and each
mainnet lifecycle step is separately bound to its Arc transaction receipt.
Current branch head must be resolved dynamically from PR #44.

## Collaboration

- **Faadil Boussari** — product / repo lead
- **Opeyemi (opeblow)** — technical collaborator
- **ChatGPT** — PRD, architecture assurance, evidence/gate review, handover continuity

For current state, read in this order: `docs/internal/CANONICAL-STATE.yaml`, `docs/internal/BUILD-LIFECYCLE-COVERAGE.yaml`, `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`, `docs/internal/HANDOVER.md`, then `docs/internal/REALITY-LEDGER.md`. See `product/PRD.md` and `docs/internal/WORKSPLIT.md` for product/work ownership.
