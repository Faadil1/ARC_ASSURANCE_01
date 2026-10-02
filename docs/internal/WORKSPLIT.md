# ARC_ASSURANCE_01 — Work Split

**Status:** v0.1  
**Rule:** one owner per critical surface; collaboration happens through explicit interfaces and PR review, not overlapping edits.

## 1. Roles

### Faadil — Product / repo / integration lead

Owns:

- product scope and Name Lock;
- PRD/product decision approval;
- repo governance and merge decisions;
- hero demo narrative;
- minimal viewer/product UI;
- integration across contract/provider/verifier surfaces;
- mainnet evidence capture and truth-boundary review;
- final Arc Microgrants submission package.

Faadil does **not** silently redefine the contract interface after Opeyemi begins implementation; interface changes go through a documented decision/PR.

### Opeyemi (`opeblow`) — Smart contract / execution technical lead

Owns:

- Arc mainnet T0 custody spike;
- Solidity contract implementation;
- contract unit/invariant tests;
- deployment scripts/configuration;
- EIP-712 provider-output binding;
- on-chain event semantics;
- duplicate/replay/payout/breaker safety tests;
- technical documentation required to reproduce deployment.

Opeyemi should not own the final product copy, naming, or submission truth claims.

### Assistant — Architecture assurance / evidence / continuity

Owns:

- PRD maintenance;
- canonical-state and handover maintenance;
- acceptance/gate review;
- architecture review;
- evidence checklist and claim-boundary review;
- PR review support;
- verifier/test-vector specification;
- competitor/Arc capability re-checks when external facts materially affect architecture;
- keeping repo state sufficient for a new conversation/contributor to take over.

The assistant may contribute files/PRs through GitHub but does not substitute simulated evidence for human/mainnet execution.

---

## 2. Interface ownership

**Review policy:** a listed reviewer is recommended by default. Review becomes mandatory only when a gate or change explicitly touches a surface for which that reviewer is the accountable technical owner. G0 / PRD_READY does not require collaborator approval; Faadil owner sign-off plus a clean merge is sufficient.

| Surface | Primary owner | Reviewer |
|---|---|---|
| PRD / scope / product laws | Faadil + Assistant | Opeyemi |
| Contract ABI/state machine | Opeyemi | Assistant + Faadil |
| T0 mainnet custody proof | Opeyemi | Faadil + Assistant |
| Provider HTTP service | Faadil | Opeyemi |
| Canonical serializer/scorer | Faadil | Opeyemi + Assistant |
| Provider EIP-712 schema | Opeyemi | Faadil + Assistant |
| Verifier CLI | Faadil | Opeyemi + Assistant |
| Minimal viewer | Faadil | Opeyemi |
| Contract tests/invariants | Opeyemi | Assistant |
| Mainnet evidence pack | Faadil | Assistant |
| Canonical state/handover | Assistant | Faadil |
| Submission copy | Faadil + Assistant | Opeyemi for technical claims |

---

## 3. Priority plan

### P0 — prove the foundation

#### P0.1 PRD_READY
**Owner:** Assistant / Faadil  
Deliverables:
- PRD v0.1;
- canonical state;
- handover;
- work split;
- truth-boundary rules.

#### P0.2 Collaborator access
**Owner:** Opeyemi / Faadil  
Deliverable:
- `opeblow` has repository write permission and can create branches/PRs.

Current state: **PROVEN / NON-BLOCKING FOR G0**.

Collaborator access is useful for parallel technical ownership but is not an exit criterion for G0 / PRD_READY.

#### P0.3 Pre-Build Reality evidence gap
**Owner:** Faadil + Assistant  
Deliver:
- at least one external real operator/user signal;
- at least one concrete negative-event pattern with observable impact;
- update Reality Ledger and Conditional Gateway Registry.

This gate blocks DELIVER promotion, but does not block T0 as a DESIGN technical spike.

#### P0.4 T0 Arc mainnet custody spike
**Owner:** Opeyemi  
Branch: `feat/t0-mainnet-custody`

Prove:
- correct Arc chain assertion;
- real USDC can enter contract custody;
- configured payout works;
- remaining funds can refund;
- transaction references recorded.

No product UI should block T0.

#### P0.5 Canonical test vectors
**Owner:** Faadil  
Branch: `feat/canonical-scorer`

Deliver:
- canonical structured-extraction schema;
- serializer;
- known-answer fixtures;
- scorer tests;
- canary generation/reveal format.

---

### P1 — prove the causal loop

#### P1.1 Assurance state machine
**Owner:** Opeyemi  
Branch: `feat/assurance-contract`

Implement:
- policy;
- funding;
- commit;
- output lock;
- reveal;
- resolve;
- payout/withhold;
- breaker;
- refund/close.

#### P1.2 Provider service
**Owner:** Faadil  
Branch: `feat/provider-service`

Implement a real HTTP extraction service with explicit fault-injection mode.

#### P1.3 Provider signature binding
**Owner:** Opeyemi  
Integrated into contract/provider interface.

#### P1.4 Verifier CLI
**Owner:** Faadil  
Branch: `feat/verifier-cli`

Reconstruct:
- commitment ordering;
- signature;
- reveal;
- deterministic score;
- financial result.

#### P1.5 Adversarial/invariant test pass
**Owner:** Opeyemi  
Cover:
- duplicate payout;
- duplicate reveal;
- replay;
- wrong chain/domain;
- wrong salt;
- wrong output;
- breaker threshold;
- refund safety.

---

### P2 — package the proof

#### P2.1 Minimal viewer
**Owner:** Faadil  
Branch: `feat/evidence-viewer`

Display only chain-backed, high-signal states first:
- funded;
- committed;
- PASS/payment;
- FAIL/no payment;
- breaker;
- protected/refunded balance.

#### P2.2 Hero mainnet run
**Owner:** Faadil + Opeyemi  
No single-owner merge until both independently verify the run.

#### P2.3 Evidence pack
**Owner:** Faadil + Assistant

Must include:
- contract address;
- relevant transaction/event references;
- provider output/signature evidence;
- reveal material;
- verifier command/result;
- disclosure of controlled fault injection;
- exact “onchain proves / does not prove” boundary.

#### P2.4 Submission readiness
**Owner:** Faadil + Assistant  
Reviewer: Opeyemi for technical accuracy.

---

## 4. Branch / PR order

Recommended sequence:

1. `docs/prd-v0.1`
2. `feat/t0-mainnet-custody`
3. `feat/canonical-scorer`
4. `feat/assurance-contract`
5. `feat/provider-service`
6. `feat/verifier-cli`
7. `feat/evidence-viewer`
8. `release/arc-microgrant-submission`

Parallelism is allowed only where interfaces are frozen.

Good parallel pair:
- Opeyemi: contract/T0
- Faadil: canonical scorer/provider fixture work

Bad parallel pair:
- two people independently editing the same ABI/state machine.

---

## 5. PR contract

Every PR must state:

- problem solved;
- canonical gate advanced;
- files/surfaces owned;
- security/financial impact;
- tests run;
- whether Arc mainnet proof remains required;
- whether truth-boundary language changed.

A merged implementation milestone is not complete until `CANONICAL-STATE.yaml` and `HANDOVER.md` are updated.

---

## 6. Protected human actions

The following remain explicit human-controlled actions unless intentionally delegated later:

- funding a real mainnet wallet;
- signing/deploying a mainnet contract from a human-controlled key;
- approving meaningful mainnet value movements;
- changing collaborator permissions;
- final Arc Microgrants submission.

Automation may prepare commands/evidence, but must not misrepresent these actions as completed.

---

## 7. Immediate next actions

1. Faadil owner-signs G0 and merges the PRD/state/work-split PR when technically clean.
2. Opeyemi review is recommended but non-blocking for G0.
3. Opeyemi owns technical review where later changes materially affect his smart-contract / settlement surfaces.
4. Opeyemi begins `feat/t0-mainnet-custody`.
5. Faadil begins `feat/canonical-scorer` in parallel.
6. No evidence viewer or major visual design work until T0 is green.


---

## 8. Gateway ownership rule

Every owner must update or explicitly preserve the relevant entries in:

- `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`
- `docs/internal/REALITY-LEDGER.md`

A PR is incomplete if it materially changes scope/runtime/evidence but leaves the registry stale.

Primary gateway accountability:

- **Faadil:** Rules/Eligibility, Sponsor-Native Advantage, Pre-Build Reality, Distinctiveness, Judge Coverage, Submission Integrity, user/operator evidence.
- **Opeyemi:** Technical Reality, Wallets, Contracts, LIVE_GATEWAY, Security/Secrets, Negative Path, External Dependency/Failure, Runtime/Commit Binding.
- **Assistant:** registry completeness, Truth Boundary, Evidence Integrity, Product Depth v1.2.1, Judge Performance Assurance, Reality Ledger consistency.
