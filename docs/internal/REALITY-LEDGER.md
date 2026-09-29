# ARC_ASSURANCE_01 — Reality Ledger

Updated: 2026-09-28

This ledger records what is **OBSERVED**, **INFERRED**, or **UNKNOWN**. It is not a marketing document.

## OBSERVED

- The public repository `Faadil1/ARC_ASSURANCE_01` exists.
- PR #1 contains the draft PRD, work split, canonical state, handover, and contribution rules.
- Opeyemi has accepted collaborator access and has pushed real commits to the repository.
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


## Assurance Core v1 reality delta — 2026-09-29

### OBSERVED

- `AssuranceCoreV1.sol` now contains a non-custodial hidden-canary state machine.
- The source enforces one unresolved batch per policy.
- Hidden commitment is stored before provider output lock.
- Provider output lock consumes the EIP-712 provider-output verification layer.
- Reveal recomputes the prior commitment and rejects a changed expected answer or salt.
- The source fingerprints revealed canaries by inputHash + expectedOutputHash + scorerIdHash and rejects exact reuse.
- Resolution compares signed outputHash to revealed expectedOutputHash.
- Source-level directives are PAY, WITHHOLD, and BREAKER.
- The breaker marks the policy paused after the configured cumulative failure threshold.
- The module contains no custody or transfer operation.
- Foundry configuration/remappings are now present on the assurance branch for forge-std and OpenZeppelin integration.

### INFERRED

- If exact-head tests and cross-language hash vectors pass, this architecture can provide a deterministic, inspectable causal bridge from hidden precommit to settlement instruction without an LLM judge.
- Limiting v1 to one unresolved batch per policy reduces breaker-bypass/concurrency complexity for the hackathon proof.

### UNKNOWN / NOT YET VERIFIED

- Exact-head Solidity compilation/test result.
- Exact-head JS commitment hash result under pinned Viem.
- JS/Solidity commitment hash equality.
- Integrated custody + assurance behavior.
- Real Arc mainnet PASS -> payout.
- Real Arc mainnet FAIL -> no-pay.
- Real Arc mainnet breaker -> protected/refunded remainder.
- Whether an external provider can detect a canary from non-contractual features of the input.


## Verifier CLI v1 reality delta — 2026-09-29

### OBSERVED

- Source now exists for an offline evidence-packet verifier.
- The verifier recomputes input/output/scorer hashes rather than trusting copied values.
- The verifier reconstructs the EIP-712 message and verifies the provider signature.
- It recomputes the hidden-canary commitment from revealed material.
- It checks the canonical order by block number + log index.
- It rejects FAIL paired with PAY.
- BREAKER requires a CircuitBreakerTriggered event in the expected causal window.
- Offline financial fields are explicitly treated as untrusted claims.
- `--require-financial` cannot succeed from packet-only evidence.
- A golden-vector generator outputs public crypto material and does not output the ephemeral private key.
- Node 22.16.0 is present in the current environment.
- Viem is not present; dependency installation timed out.

### INFERRED

- Once dependencies are available and tests pass, this verifier can serve as a useful pre-chain verification layer and a foundation for the final independent verifier.
- Separating packet consistency from chain provenance reduces the risk of narrating a self-authored evidence bundle as independent live proof.

### UNKNOWN / NOT YET VERIFIED

- Exact-head JS test results.
- Golden-vector output under pinned Viem.
- JS/Solidity golden-vector equality.
- Arc RPC event decoding/reconstruction.
- Custody/payment/refund verification.
- Runtime/commit binding.
- Clean-checkout G6 verification.


## Chain-Native Verifier v2 reality delta — 2026-09-29

### OBSERVED

- Source now exists for direct Arc JSON-RPC verification.
- v2 requires Arc chain ID 5042.
- v2 fetches deployed runtime bytecode and computes its code hash.
- v2 can compare the observed code hash with an expected deployment-manifest code hash.
- v2 fetches T0 custody events directly from the configured contract address and policy ID.
- T0 verification checks transaction success, canonical event ordering, identity binding and value conservation.
- v2 fetches Assurance Core events directly from Arc and binds provider/scorer execution to the policy configuration.
- Assurance reconstruction feeds chain-fetched evidence into the strict EIP-712/canary verifier.
- WITHHOLD/BREAKER threshold semantics are checked against the policy configuration.
- Mock-RPC test sources exist for T0, Assurance Core, runtime-hash mismatch and the separate-primitives integration boundary.
- The verifier explicitly returns that two separately proven primitives do not prove integrated financial causality.
- Arc's public mainnet explorer is currently available at explorer.arc.io.

### INFERRED

- After exact-head dependency/test validation, v2 should remove the largest trust gap in verifier v1: self-supplied event provenance.
- Keeping T0 custody and Assurance Core verification separately named should make it harder to overclaim a causal relationship before integration.

### UNKNOWN / NOT YET VERIFIED

- Exact-head v2 test execution under pinned Viem.
- A real T0 Arc mainnet contract address and proof run.
- A deployed Assurance Core address and proof run.
- Reproducible source commit -> deployed bytecode provenance.
- Integrated PASS -> payout causality.
- Integrated FAIL -> no-pay causality.
- Integrated BREAKER -> refund/protected remainder.
- Clean-checkout verification by an external judge/operator.


## Integrated AssuranceVault reality delta — 2026-09-29

### OBSERVED

- `src/assurance/AssuranceVault.sol` now composes native Arc custody, EIP-712 provider attribution, hidden-canary commitment/reveal, deterministic resolution, payout/withhold, breaker and protected refund in one source-level state machine.
- There is no independent provider payout function in the integrated contract source.
- The PASS branch of `resolveBatch()` is the only source-level path that sends the configured provider payout.
- The FAIL branch leaves policy liability unchanged and emits an explicit withhold event.
- The breaker pauses the policy and prevents future batch commits.
- Protected refund is bounded to the policy's remaining liability and goes to the immutable funder.
- Policy payout is bounded by policy liability rather than pooled vault balance.
- The constructor rejects an expected chain ID different from the active chain.
- Direct unattributed funding reverts; forced value remains outside policy liability accounting.
- An expiry recovery path exists for unresolved batches, including a payout recipient that rejects native value.
- Solidity test source now covers PASS, FAIL, breaker/refund, wrong signature, ground-truth rewrite, rejecting recipient recovery, policy isolation and wrong-chain deployment.
- Integrated verifier v3 source now requires same-transaction PASS->PaymentReleased, FAIL->PaymentWithheld with zero payment events, and BREAKER->protected refund/close semantics.

### INFERRED

- If exact-head tests pass and the deployed runtime matches the reviewed source, this architecture closes the previous non-load-bearing gap between assurance and custody.
- Same-transaction resolution/payment events should provide a substantially stronger causal proof than separately demonstrated assurance and custody primitives.

### UNKNOWN / NOT YET VERIFIED

- Exact-head Solidity compilation result.
- Exact-head Arc Foundry test result.
- Exact-head integrated verifier JS test result.
- Cross-language EIP-712/commitment vector equality on the integrated contract address.
- Mainnet deployment bytecode.
- Real PASS -> payout.
- Real FAIL -> no-pay.
- Real breaker -> refund.
- Reproducible Git commit -> deployed bytecode provenance.
- External clean-room verification.


## Reproducible build / deployment provenance delta — 2026-09-29

### OBSERVED

- The golden-vector generator is now deterministic and derives its test-only signing key in memory from a fixed public test label.
- The generated private key is not emitted.
- A Solidity test now independently reconstructs the EIP-712 digest, signer recovery, canary commitment and canary key from the JS-generated vector.
- Build tooling now records exact Git SHA, source/config fingerprints and AssuranceVault creation-bytecode hash.
- A deployment-manifest generator now hashes exact constructor arguments with creation bytecode into an init-code hash.
- A Solidity test independently cross-checks creation-code and init-code hashes from generated manifests.
- A strict local clean-room script exists and requires Node 22.16.0 plus a committed package-lock.
- A GitHub Actions workflow exists to exercise the build and upload reproducibility artifacts.
- Integrated verifier v3 can now compare the real Arc deployment transaction input against an expected init-code hash and check the deployment receipt contract address.
- A pre-mainnet audit checklist now exists.

### IMPORTANT ARCHITECTURAL FACT

- Generic predeployment runtime hash is not treated as sufficient identity because constructor/address-dependent immutables may affect deployed runtime.
- The canonical predeployment identity is creation bytecode + exact constructor args + init-code hash.

### UNKNOWN / BLOCKED

- No committed package-lock yet.
- Exact-head clean-room CI result not yet observed.
- No reviewed candidate package-lock artifact yet.
- No integrated deployment transaction.
- No postdeployment runtime hash.
- Runtime/Commit Binding remains BLOCKED.
