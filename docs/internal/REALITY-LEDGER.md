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


## Canonical scorer reality delta — 2026-09-28

### OBSERVED

- `src/scorer/invoice-v1.mjs` implements a five-field deterministic invoice scorer.
- Money is represented as integer minor units; no floating-point comparison is used.
- Dependency-free Node tests were executed locally: 8 passed, 0 failed.
- Public canary fixtures are labeled PRESEEDED and contain their expected canonical strings/hash vectors.
- Malformed expected ground truth raises a configuration error rather than automatically failing the provider.

### INFERRED

- Fixed-order serialization plus integer minor units should reduce cross-runtime ambiguity for the MVP.
- Exact-match scoring is appropriate for the narrow known-answer document-extraction canaries.

### UNKNOWN

- Independent Arc/EVM-tool verification of the supplied keccak vectors is still pending.
- The final contract ABI/commit encoding has not yet been bound to this scorer.
- Live providers may produce formatting/schema variation that requires product-level handling outside the scorer.


## Provider service reality delta — 2026-09-28

### OBSERVED

- `src/provider/extract-invoice.mjs` parses invoice text into the canonical invoice-v1 structure.
- `src/provider/http-server.mjs` serves real HTTP extraction requests.
- Provider tests were executed locally: 9 passed, 0 failed.
- Fault injection is disabled by default.
- Explicit fault mode is rejected unless demo faults are intentionally enabled.
- Injected responses declare `fault_injected: true`.
- Provider output explicitly reports `signature_status: NOT_IMPLEMENTED`.

### INFERRED

- A dependency-free deterministic provider reduces demo fragility and keeps the core product mechanism inspectable.
- Controlled fault injection can exercise the negative path without falsely claiming an organic third-party incident.

### UNKNOWN

- Deployed provider runtime behavior.
- Clean-room startup outside the authoring environment.
- EIP-712 signing/interface compatibility.
- Runtime/commit binding.
- External provider behavior and hidden-canary detectability.


## EIP-712 provider-output reality delta — 2026-09-29

### OBSERVED

- A frozen EIP-712 `ProviderOutput` schema is now present in the repository.
- The schema binds provider, policy, batch, work, input hash, output hash, scorer hash, nonce, and deadline.
- The EIP-712 domain is designed for Arc chain 5042 plus the exact verifying contract.
- The provider HTTP service now contains an optional signed mode using a dedicated provider signer.
- Signed mode does not allow the request to choose chain id or verifying contract.
- Canonicalizable outputs can enter the signing path.
- Malformed outputs return `ABSTAIN_MALFORMED` and remain unsigned.
- A reusable Solidity verification/replay-consumption module and JS/Solidity test sources have been authored.
- No real provider signing key has been committed to the repository.

### INFERRED

- For invoice-v1 exact-match scoring, comparing the signed `outputHash` to a correctly revealed/precommitted `expectedOutputHash` can provide a deterministic verdict without an LLM evaluator.
- Domain separation plus digest consumption should reduce cross-chain/cross-contract/exact-message replay risk when integrated correctly.

### UNKNOWN / NOT YET VERIFIED

- Exact JS EIP-712 digest/signature behavior on the branch head, because the pinned Viem dependency has not been executed in the current environment.
- Solidity compilation/recovery behavior with the chosen pinned OpenZeppelin release.
- Cross-language JS/Solidity digest equality.
- Final contract state-machine protection against two financially consequential outputs for the same workId.
- Live provider runtime/commit binding.
