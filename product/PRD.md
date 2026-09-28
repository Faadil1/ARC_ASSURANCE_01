# ARC_ASSURANCE_01 — Product Requirements Document

**Version:** 0.1  
**Status:** PRD_READY_CANDIDATE  
**Date:** 2026-09-28  
**Program:** Arc Microgrants 2026  
**Submission deadline:** 2026-10-14 23:59 ET  
**Product name:** OPEN — `ARC_ASSURANCE_01` is an internal identifier only.

---

## 1. Executive summary

ARC_ASSURANCE_01 is a continuous assurance primitive for autonomous paid work.

The product does **not** attempt to decide whether an AI agent is generally intelligent, trustworthy, or rational. It solves a narrower financial-control problem:

> A principal should be able to commit an objective acceptance test before work is performed, keep that test hidden from the provider, and make real settlement consequences depend on the deterministic result.

Core loop:

```
PRECOMMIT TEST
→ REAL WORK
→ HIDDEN CANARY
→ DETERMINISTIC VERIFY
→ PAY / BLOCK / CIRCUIT BREAKER
```

The MVP uses Arc mainnet and real USDC. The project succeeds only if it proves a real financial causal chain, not merely an audit log.

---

## 2. Problem

Autonomous software can increasingly initiate paid work. Existing payment rails can prove that money moved, but do not by themselves prove that:

- acceptance criteria existed before the provider produced the result;
- the buyer did not rewrite the test after seeing the result;
- a provider maintained production quality after initial authorization;
- a failed objective acceptance test caused a real financial consequence;
- a third party can independently reproduce the verdict.

The specific product risk is **bait-and-switch degradation**:

```
provider passes initial evaluation
→ provider receives ongoing work
→ quality drops
→ payments continue because authorization already happened
```

ARC_ASSURANCE_01 makes verification continuous rather than one-time.

---

## 3. Product thesis

### North Star

> Every autonomous settlement should depend on an acceptance test committed before the work and hidden from the provider.

### Product promise

The system should make the following statement independently verifiable:

> “The acceptance test existed first, the provider committed to this output, the hidden canary failed or passed deterministically, and the corresponding USDC settlement consequence followed.”

### What the product does **not** claim

The product does not claim that blockchain proves subjective quality, rational procurement, complete candidate coverage, or philosophical correctness of ground truth.

---

## 4. Target users and jobs-to-be-done

### Primary user — principal / agent operator

**JTBD:**  
“When I allow autonomous software to spend money on repeatable machine work, I need a control that keeps testing the work and automatically protects remaining budget when quality falls.”

### Secondary user — provider

**JTBD:**  
“When I perform machine-verifiable work, I want deterministic acceptance rules that cannot be rewritten after delivery.”

### Tertiary user — reviewer / auditor / judge

**JTBD:**  
“I need to independently verify the sequence of commitment, work, reveal, verdict, and payment from public evidence.”

---

## 5. MVP vertical

The MVP uses **structured document extraction** because acceptance can be deterministic.

Example canonical output:

```json
{
  "invoice_number": "A-1042",
  "subtotal": "184.20",
  "tax": "27.63",
  "total": "211.83",
  "currency": "CAD"
}
```

A canonical serializer and versioned scorer produce deterministic hashes and verdicts.

The vertical is intentionally narrow. The MVP does not generalize to subjective writing, strategy, design, negotiation, or open-ended research.

---

## 6. Locked product invariants

These are product laws unless explicitly reopened in the PRD/state files.

1. **PRECOMMITMENT FIRST** — the canary commitment must exist on Arc before the corresponding provider output is accepted.
2. **HIDDEN TEST** — the provider must not be told which work item is the canary before output commitment.
3. **DETERMINISTIC VERDICT** — MVP PASS/FAIL must not depend on an LLM judge.
4. **SIGNED OUTPUT** — the provider must cryptographically bind itself to the output before canary reveal.
5. **FINANCIAL CAUSALITY** — PASS/FAIL must affect real USDC settlement state.
6. **CIRCUIT BREAKER** — repeated configured failures must be able to stop future payouts and protect/refund remaining budget.
7. **ONE-TIME CANARY** — a revealed canary must not be reused as a hidden test.
8. **TRUTH BOUNDARY** — local stubs, simulation, testnet, screenshots, or generated receipts are never narrated as mainnet proof.
9. **NO SUBJECTIVE PROOF CLAIMS** — immutable does not mean correct; the product claims only what is cryptographically or deterministically verifiable.
10. **REPRODUCIBILITY** — a third party must be able to verify the evidence using the public repo and public chain data.

---

## 7. Primary flow

### 7.1 Policy creation

Principal defines:

- provider address;
- verifier/scorer version hash;
- total budget;
- unit payout;
- maximum failures;
- expiry;
- canary commitment rules.

### 7.2 Funding

Principal funds the assurance contract with real USDC on Arc mainnet.

### 7.3 Batch commitment

Before provider execution:

```
commitment = H(
  policyId,
  batchId,
  canaryIndex,
  inputHash,
  expectedOutputHash,
  scorerHash,
  salt
)
```

Only the hash is committed publicly.

### 7.4 Provider execution

Provider receives the work batch without knowing which item is the canary.

Each response is bound to:

- chain ID;
- contract address;
- policy ID;
- batch ID;
- work ID;
- input hash;
- output hash;
- nonce.

Provider signs the response.

### 7.5 Reveal and deterministic resolution

Principal reveals:

- canary index;
- expected canonical output / expected output hash;
- salt.

Contract or canonical verifier checks that the reveal matches the prior commitment and that the provider output was already locked.

### 7.6 Consequence

- PASS → configured payout may be released.
- FAIL → payout is withheld.
- Repeated configured FAIL → circuit breaker pauses future payout and makes remaining funds refundable/protected.

---

## 8. State machine

```
POLICY_CREATED
      ↓
FUNDED
      ↓
ACTIVE
      ↓
BATCH_COMMITTED
      ↓
OUTPUT_LOCKED
      ↓
CANARY_REVEALED
   ↙         ↘
 PASS       FAIL
  ↓           ↓
PAYOUT     WITHHOLD
  ↓           ↓
  └────→ ACTIVE
             ↓
      failure threshold
             ↓
           PAUSED
             ↓
     REFUND REMAINDER
             ↓
           CLOSED
```

No UI state may contradict the canonical contract state.

---

## 9. Hero demo contract

The canonical demo must show:

1. A principal funds the contract with real USDC on Arc mainnet.
2. A hidden canary commitment is recorded before provider execution.
3. Batch 1 passes and a real payout is released.
4. Provider quality is deliberately degraded with explicit **fault injection** labeling.
5. Batch 2 fails and payment is actually withheld.
6. A later configured failure triggers the circuit breaker.
7. Remaining funds are protected/refunded.
8. An independent verifier reconstructs the proof order and confirms the result.

The memorable moment is **money that would have moved but did not because the precommitted test failed**.

Fault injection is acceptable as a controlled adversarial scenario only if clearly disclosed. It must never be presented as an organic third-party production incident.

---

## 10. Functional requirements

### MUST

- Deploy a minimal assurance contract to Arc mainnet.
- Use real USDC.
- Support policy creation, funding, batch commitment, provider output lock, reveal, resolve, payout/withhold, breaker, and refund/close.
- Bind provider outputs using EIP-712 or equivalently explicit signed structured data.
- Use a deterministic, versioned canonical serializer/scorer.
- Record enough events to reconstruct the canonical order without trusting app logs.
- Provide a verifier CLI.
- Provide a minimal web viewer of chain-backed state.
- Link real mainnet evidence from the UI/evidence pack.
- Protect secrets/private keys through environment/local secret storage only.

### SHOULD

- Make contract/event semantics readable without the frontend.
- Support batch-level evidence export.
- Include fault-injection mode for the hero demo.
- Include one-command local verification of a published run.
- Preserve later ERC-8183 evaluator/hook compatibility without depending on ERC-8183 in MVP.

### MAY

- Add x402 integration after the core proof is green.
- Add ERC-8183 compatibility after MVP.
- Add third-party provider participation if available.
- Add richer evidence visualization after the hero proof works.

### MUST NOT

- Build a provider marketplace.
- Build bidding/negotiation.
- Add a token.
- Use an LLM as the primary PASS/FAIL judge.
- Claim “outcome proven” for subjective work.
- Depend on Circle Agent Wallets, Nanopayments, x402, ERC-8004, or ERC-8183 for the critical MVP path.
- Present mocked/testnet/stub evidence as Arc mainnet.
- Reuse revealed canaries.
- Hide known limitations in submission/demo copy.

---

## 11. Technical architecture

```
Principal / Agent Runner
        │
        ├── policy + commit
        ├── funds USDC
        │
        ▼
AssuranceVault.sol  ←→  Arc mainnet / USDC
        │
        ├── emits canonical events
        │
        ▼
Provider HTTP Service
        │
        └── signed structured output
        │
        ▼
Deterministic Scorer / Canonical Serializer
        │
        ├── reveal material
        └── reproducible verdict
        │
        ▼
Verifier CLI + Minimal Viewer
```

### Contract responsibilities

Internal working name: `AssuranceVault.sol`.

Expected public operations:

- `createPolicy()`
- `fund()`
- `commitBatch()`
- `lockOutput()`
- `revealCanary()`
- `resolveBatch()`
- `pause()`
- `refund()`
- `close()`

Expected event vocabulary:

- `PolicyCreated`
- `PolicyFunded`
- `BatchCommitted`
- `ProviderOutputLocked`
- `CanaryRevealed`
- `BatchPassed`
- `BatchFailed`
- `PaymentReleased`
- `CircuitBreakerTriggered`
- `RemainingFundsRefunded`

Exact interface remains implementation-controlled until T0 proof is green.

---

## 12. Arc integration boundary

Verified project assumptions as of 2026-09-27:

- Arc mainnet is live.
- Chain ID: `5042`.
- Public RPC: `https://rpc.mainnet.arc.io`.
- USDC is the native gas asset.
- Unified USDC ERC-20 interface: `0x3600000000000000000000000000000000000000`.
- Deterministic finality makes finalized ordering suitable for machine-readable evidence.

Critical ordering must use canonical chain position such as block number + log index, not application timestamps alone.

### Critical dependency rule

Circle Agent Wallets, Nanopayments, x402 and ERC-8183 are **not** required for MVP promotion.

If their Arc-mainnet availability improves, they may be evaluated as extensions only after core mainnet proof.

---

## 13. T0 — mandatory mainnet custody spike

Before consequential UI/product build, prove on Arc mainnet:

```
real USDC
→ approve / custody
→ contract holds funds
→ contract pays configured address
→ contract refunds remaining funds
```

T0 must publish transaction references and observed balances.

**No T0 proof = no product-build promotion.**

---

## 14. Security model

### Threats in MVP

- private-key compromise;
- accidental mainnet overspend;
- replayed provider signatures;
- cross-chain/cross-contract replay;
- malicious provider output;
- buyer attempting to change test after output;
- provider attempting to identify canaries;
- duplicate payout;
- breaker bypass;
- malformed canonical serialization;
- incorrect ground truth.

### Minimum controls

- dedicated low-balance mainnet wallet;
- explicit chain ID assertion;
- hard total/per-batch spend caps;
- nonces/idempotency keys;
- EIP-712 domain binding to chain ID + contract;
- no secrets in repo/logs;
- one-time canaries;
- versioned canonical scorer;
- contract tests for duplicate payout/reveal/replay;
- explicit emergency pause/refund path;
- fault injection clearly labeled.

---

## 15. Evidence model

### On-chain truth

The system should be able to prove:

- commitment existed before provider output lock;
- provider address committed to a specific output hash;
- reveal matched the previous commitment;
- canonical PASS/FAIL state was recorded;
- real USDC was paid/withheld/refunded according to state;
- breaker state changed after configured failures.

### Off-chain evidence

- raw documents;
- canonical outputs;
- scorer implementation;
- provider HTTP responses;
- ground-truth source;
- demo recordings;
- explanation of controlled fault injection.

Off-chain material must be content-addressed or hashed where useful, but a hash must never be described as proof that the underlying claim is correct.

---

## 16. Promotion gates

### G0 — PRD_READY
PRD, canonical state, work split and truth boundaries reviewed.

### G1 — T0_MAINNET_CUSTODY
Real Arc mainnet USDC custody, payout and refund proven.

### G2 — PRECOMMIT
A real hidden-test commitment exists onchain before execution/output lock.

### G3 — REAL_WORK
The provider endpoint performs genuine computation and returns signed output.

### G4 — REAL_FAILURE
At least one controlled canary failure occurs against genuine provider execution.

### G5 — FINANCIAL_CAUSALITY
Failure causes a real configured financial consequence: no payout, breaker, and/or refund.

### G6 — INDEPENDENT_VERIFY
A clean checkout can reconstruct the proof from the public repo plus public evidence.

### G7 — HERO_DEMO
The full narrative is understandable in under two minutes and uses mainnet evidence.

### G8 — SUBMISSION_READY
Repo, live deployment, description, evidence links, public builder profile and disclosure boundaries are complete.

---

## 17. Success metrics

### Technical

- 100% of canonical demo events reconstructible from chain data.
- 0 duplicate payouts under retry/replay tests.
- 0 payout on failing canonical canary in hero run.
- successful protection/refund of remaining budget after breaker.
- clean verifier result from fresh environment.

### Product / judge comprehension

A reviewer should be able to answer correctly after the demo:

1. What was committed before the provider result?
2. Why did money move on PASS?
3. Why did money not move on FAIL?
4. What caused the circuit breaker?
5. Which parts are proven onchain versus asserted offchain?

---

## 18. Non-functional requirements

- Mainnet spend must remain bounded and intentionally low.
- All critical mutations must be idempotent or reject duplicates.
- Viewer failure must not affect canonical contract truth.
- Provider HTTP failure must fail closed with no accidental payout.
- Contract/event naming must remain explicit and inspectable.
- UI must work at minimum at mobile, tablet and desktop sizes.
- Reduced motion must be supported for nonessential animation.
- No secret/private canary corpus is committed to the public repo before reveal where doing so would defeat the hidden-test mechanism.

---

## 19. Dependencies

### Critical

- Arc mainnet RPC availability.
- Ability to acquire/fund a small amount of Arc mainnet USDC.
- Solidity/EVM deployment tooling.
- Real provider endpoint.
- Public GitHub repository.

### Non-critical / optional

- Circle Agent Wallets.
- Circle Nanopayments.
- x402.
- ERC-8183 integration.
- ERC-8004 identity/reputation.

---

## 20. Major risks and pivot triggers

### Risk — canary detectability

If providers can trivially distinguish canaries from real work, the mechanism weakens.

**Mitigation:** realistic fixtures, same input shape, one-time canaries, explicit limitation.

### Risk — ground truth error

An incorrect expected answer can wrongfully block payment.

**Mitigation:** narrow deterministic domain, manually validated fixtures, canonical scorer tests.

### Risk — too much trusted off-chain logic

If PASS/FAIL depends on opaque backend logic, the main claim weakens.

**Mitigation:** make scoring code public/versioned and minimize trusted evaluator authority.

### Pivot trigger

If deterministic financial causality cannot be demonstrated on Arc mainnet, do not compensate with a prettier receipt or simulated demo. Re-open architecture instead.

---

## 21. Definition of Done

MVP is DONE only when all are true:

- [ ] T0 Arc mainnet custody proof is published.
- [ ] Contract deployed on Arc mainnet.
- [ ] Real USDC budget funded.
- [ ] Hidden canary commitment precedes execution.
- [ ] Provider output is signed and locked before reveal.
- [ ] PASS produces real configured payout.
- [ ] FAIL produces real no-pay consequence.
- [ ] Failure threshold triggers breaker.
- [ ] Remaining funds are protected/refunded.
- [ ] Verifier CLI reproduces canonical hero run.
- [ ] Minimal viewer links canonical evidence.
- [ ] Repo contains no secrets.
- [ ] Automated tests pass.
- [ ] Truth boundaries are documented.
- [ ] Public README does not overclaim.
- [ ] Submission material points to the real deployment/repo/evidence.

---

## 22. Version history

### v0.1 — 2026-09-27

- Locked continuous hidden-canary assurance concept.
- Removed original ProofTender procurement-platform framing.
- Removed marketplace/bidding/LLM-judge scope.
- Made Arc mainnet financial causality the core proof.
- Established T0 custody proof as first build gate.
- Product name remains OPEN.


---

## 23. Canonical Conditional Gateway Registry

The project MUST maintain `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`.

Every canonical gate is explicitly classified as exactly one of:

- `ACTIVE`
- `N/A`
- `BLOCKED`
- `PROVEN`

Omission is never an acceptable state. `N/A` means the gate was evaluated and is not applicable; it never means forgotten.

The registry must be re-evaluated after any material change to:

- product scope;
- architecture;
- sponsor/platform integration;
- payment/wallet/contract rails;
- runtime/deployment;
- evidence model;
- submission requirements.

The registry includes, at minimum:

- `QUALIFY → DECIDE → DESIGN → DELIVER → AUDIT → EXPAND`;
- `RUBRIC → PAIN → PROBLEM → NEGATIVE EVENT → DIFFERENTIATOR → EXECUTION → LIVE DEPTH → EVIDENCE → STORY → DEMO → Q&A`;
- Pre-Build Reality;
- Competitive Novelty / Kill;
- Technical Reality;
- Truth Boundary;
- Negative Path;
- Evidence Integrity;
- Runtime / Commit Binding;
- Deterministic Demo;
- Judge Performance Assurance;
- Submission Integrity;
- Rules / Eligibility;
- Sponsor-Native Advantage;
- Data Provenance / Freshness;
- External Dependency / Failure;
- Human Action Boundary;
- Security / Secrets;
- Legal / Compliance Boundary;
- IP / License / Originality;
- Observability / Reproducibility;
- Demo Environment;
- Accessibility / Responsive;
- Performance / Latency when material;
- Distinctiveness Escalation;
- Pre-Launch / Ship Assurance;
- Post-Submission Freeze / Reopen;
- Wallets;
- Contracts;
- Gateway / Nanopayments;
- x402;
- App Kit / external platform integration;
- LIVE_GATEWAY;
- Final Snapshot / CURRENT / HANDOVER / Post-mortem.

### x402 rule if activated

A successful-looking UI is not proof.

The proof chain must establish:

```
requirements/payment
→ verify
→ settle
→ HTTP 200/unlock
```

with the relevant payment references and available buyer/seller receipts.

A `LOCAL_STUB`, `SIMULATED`, or `PARTIAL` rail may be used for development but never promoted as `LIVE_GATEWAY`.

### Promotion rule

If core product value depends on a real external gateway, that gateway must be proven before the build is promoted as live.

---

## 24. Product Depth & Live Reality v1.2.1

This rule is canonically ACTIVE and does not replace any existing gate.

### Required principles

- Vertical Slice = entry point, not Definition of Done.
- Technical Proof ≠ Live Product Integration.
- Replay/static/captured evidence alone does not satisfy a Live Core Loop claim.
- One external trial ≠ adoption.
- Scripted activity created to inflate traction does not count as organic usage.
- Depth ≠ feature count.
- Polish never compensates for weak product reality.

### Required depth checks

When applicable, promotion must explicitly evaluate:

- Live Core Loop;
- Load-Bearing Integration;
- Real Consequence;
- representative success / negative / boundary / recovery scenarios;
- failure / recovery;
- real-user surface;
- external-user / operator evidence;
- Time to First Value;
- Operational Economics when material;
- Shared Product Core;
- Reality Ledger;
- observability / receipts;
- judge/operator self-serve;
- setup / reproducibility;
- clean-room / external-dependency failure;
- Post-Vertical-Slice Depth Gap Review.

Preferred order:

```
REAL PROBLEM
→ NATIVE MECHANISM
→ LIVE INTEGRATION
→ PRODUCT DEPTH
→ REAL USER/OPERATOR LOOP
→ REAL CONSEQUENCE
→ EVIDENCE & OBSERVABILITY
→ UX/DESIGN
→ SUBMISSION PACKAGING
```

After every vertical slice, ask:

> What separates this slice from something a real user could use tomorrow?

Close material gaps before heavy polish.

### Current project consequence

The concept remains locked, but the Pre-Build Reality gate is **not falsely marked PROVEN**. External user/operator and concrete negative-event evidence remain open. T0 may proceed as a DESIGN technical spike, but DELIVER promotion remains blocked until that reality gap is closed.

See:

- `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`
- `docs/internal/REALITY-LEDGER.md`

---

## 25. Version history — governance hardening

### v0.1 governance delta — 2026-09-28

- Added mandatory Conditional Gateway Registry.
- Added full judged-build cycle with NEGATIVE EVENT and LIVE DEPTH.
- Activated Product Depth & Live Reality v1.2.1.
- Added Reality Ledger.
- Explicitly surfaced the unproven external user/operator reality gap instead of silently passing it.
