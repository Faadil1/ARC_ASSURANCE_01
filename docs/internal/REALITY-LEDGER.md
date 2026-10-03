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

### CLEAN-ROOM PROOF OBSERVED

- A committed npm lock now exists and matches the prior green candidate artifact hash:
  `c8d1896dbde5a9701a6b30883e533ad95d92a55350a0d3d842cb7ec968db61ea`.
- Exact branch head `a88d08a3a5fef63dac7b5093100fdb2d2c609cd7` passed workflow run `36625411255`.
- 54/54 JavaScript tests passed.
- Solidity build with solc 0.8.24 passed.
- 28/28 Solidity tests passed.
- Deterministic golden-vector double-generation passed.
- JS/Solidity EIP-712 and canary vector equality passed.
- Reproducible build and CI deployment manifests were generated.
- The evidence artifact name is `reproducible-build-a88d08a3a5fef63dac7b5093100fdb2d2c609cd7`.
- Foundry observed in the clean-room run was 1.8.3, commit `cae51ad458f6abb64852b7709eb784352429825d`.

### STILL UNKNOWN / BLOCKED

- Opeyemi technical review of the integrated candidate.
- T0 PR #6 completion.
- Real integrated deployment transaction.
- Deployment transaction input -> approved real init-code binding.
- Postdeployment runtime hash.
- Real PASS -> payout receipt.
- Real FAIL -> no-pay receipt.
- Real breaker -> protected refund receipt.
- Full Runtime/Commit Binding remains BLOCKED until real deployment evidence exists.


## T0 + pre-mainnet package reality delta — 2026-09-29

### OBSERVED

- T0 exact head `f7fdf4e1b592c9122d4680d5272635baa2afff3f` passed Arc Foundry build and 40/40 tests.
- The CI now verifies the official Arc Foundry Linux x86_64 release SHA-256 before installing it.
- The CI now verifies the exact forge-std commit before compiling.
- No T0 mainnet transaction has been broadcast.
- A pre-mainnet package now encodes a maximum dedicated-wallet top-up of 5 USDC.
- The T0 contract-value plan remains 0.010 USDC funding, 0.002 USDC payout and 0.008 USDC expected refund, under a 0.050 USDC hard contract cap.
- A no-secret readiness validator exists and cannot sign or broadcast transactions.
- Local real-address configuration is gitignored.

### INFERRED

- Separating wallet headroom from contract custody should make the real-money boundary easier to audit.
- Using a distinct payout-recipient EOA will make the T0 payout consequence more legible than paying back to the funder address.

### UNKNOWN / BLOCKED

- Real operator/funder wallet address.
- Real payout-recipient address.
- Real integrated provider signer address.
- Actual gas estimates for deployment and lifecycle operations.
- Whether 5 USDC is sufficient for the intended live sequence after measured gas.
- Any mainnet custody, payout or refund receipt.


## Pre-mainnet package clean-room evidence — 2026-09-29

### OBSERVED

- Exact package head `e76bd480785d5a627499f7d6ea27ae55705f4df9` passed workflow run `36638119707`.
- 58/58 JavaScript tests passed, including four no-secret pre-mainnet configuration tests.
- 28/28 Solidity tests passed.
- AssuranceVault creation bytecode remained unchanged at `0x29bdd71974b5943f8f3194272f6cb13568e5e4ce23865cf085c6242334163afd`.
- No transaction was signed or broadcast by the package or CI.
- No wallet was funded.

### STILL BLOCKED

- Real public addresses.
- Read-only gas estimate.
- Human review of the 5 USDC ceiling.
- Human wallet funding.
- T0 deploy and execute authorizations.


## Read-only gas budget reality delta — 2026-09-30

### OBSERVED

- A no-secret Arc gas-budget tool now exists.
- It can read Arc chain ID, current block and current gas price without signing.
- It can read a public wallet balance without consuming a private key.
- Budget math includes separate safety multipliers for gas units and gas price.
- The 5 USDC wallet ceiling is enforced as an upper bound.
- The template leaves deploy and lifecycle gas-unit inputs null by default.
- Missing verified gas-unit inputs produce a BLOCKED result rather than an inferred estimate.
- No transaction signing, broadcasting or value movement is implemented in this gate.

### IMPORTANT TRUTH BOUNDARY

- A gas-price snapshot is time-bound.
- A point-in-time gas price is not a guarantee of future fees.
- State-dependent lifecycle gas units must come from exact-head rehearsal evidence; they are not guessed from generic EVM expectations.
- A green gas-budget result still does not authorize wallet funding.

### STILL BLOCKED

- Real public authority/funder address.
- Exact-head T0/integrated lifecycle gas-unit evidence.
- Fresh Arc fee snapshot at the actual decision point.
- Human review that 5 USDC is sufficient.
- Explicit human wallet-funding authorization.


## Pre-mainnet static warning audit delta — 2026-09-30

### OBSERVED

- Clean-room run `36670714112` passed 63/63 JavaScript tests and 28/28 Solidity tests but emitted Foundry lint warnings.
- Warning classes included reentrancy-related diagnostics, raw timestamp downcasts, timestamp comparisons, native sends and a test-only vm.warp diagnostic.
- Source hardening now places the non-reentrancy guard first on every state-mutating external entrypoint.
- Previously unguarded mutation paths such as commit/lock/reveal/cancel are now protected during payout/refund callbacks.
- Payment/refund/close events are emitted before the external value interaction; a failed transfer still reverts the complete transaction and all logs.
- Raw uint64 timestamp casts were replaced with OpenZeppelin SafeCast.
- A malicious recipient test now attempts state mutation during payout.

### STILL REQUIRES PROOF

- Exact-head compile/tests after these source changes.
- Confirmation that reentrancy/typecast/event-order warning classes are removed or reduced as expected.
- Review of any remaining warning class.

### INTENTIONAL WARNINGS

- Timestamp comparisons remain part of deadline/expiry semantics, not randomness or scoring.
- Native value must be sent to policy-bound recipients by product design.
- Test-only vm.warp diagnostics do not describe runtime contract behavior.


## Static warning audit proof — 2026-09-30

### PROVEN

- Exact head `b5b8918c89fecd4abc5a8249270b8e5424531643` passed workflow `36671113993`.
- 63/63 JavaScript tests passed.
- 29/29 Solidity tests passed.
- `test_PayoutRecipientCannotReenterStateMutations` passed.
- The raw unsafe timestamp cast warning disappeared.
- The nonReentrant modifier-order warning disappeared.
- New AssuranceVault creation bytecode hash:
  `0xac69dd96b86b9083bf08c6ef904df7bf9ee602addaccc1938357f9cb9c75ff57`.
- Evidence artifact digest:
  `sha256:d9d9492a9c9052256056646674c086c820b72d573faaa03754896629379f8e34`.

### REVIEWED REMAINING WARNINGS

- Timestamp comparisons are intentional deadline/expiry checks.
- Native-value send warnings correspond to immutable policy-bound recipients.
- Reentrancy is mitigated by effects-before-interaction, global mutation guards and an adversarial recipient callback test.
- Remaining reentrancy-event diagnostics also occur on cryptographic helper/event paths without an uncontrolled external value call.
- The environment-read-across-mutation warning is confined to test code.

### CONSEQUENCE

The previous creation-bytecode hash is superseded. Any future real deployment manifest must be generated from the new exact hardening head or a later separately green head.

Static Warning Audit = PROVEN.

Mainnet deployment, gas-budget sufficiency, wallet funding, G5, G6 and Live Core Loop remain unproven.


## Gas-unit evidence proof — 2026-09-30

### PROVEN FOR LOCAL EXECUTION REHEARSAL

- Exact head `70f4fd1b1181ee933c4876b266bb28169919cbea` passed workflow `36672057005`.
- 67/67 JavaScript tests passed.
- 29/29 Solidity tests passed.
- The parser selected only the AssuranceVault gas-report table.
- Required lifecycle functions were present.
- Max-observed function gas was used; averages were not used.
- Derived first-PASS lifecycle sum: 1,035,420 gas.
- Derived one-batch sum: 653,529 gas.
- Derived full hero PASS→FAIL→BREAKER→refund sum: 2,426,871 gas.
- Evidence artifact digest:
  `sha256:1c12cb9b7544a833ad3cea6dff3fe7f6ce5331b3d03a95c85f3a3448c2c4e1d9`.

### DEPLOYMENT REMAINS BLOCKED

Foundry reported zero deployment gas. That value was rejected rather than interpreted.

Required next:
exact init-code `eth_estimateGas` tied to a public deployer address and nonce snapshot.

### TRUTH BOUNDARY

These values are local exact-head EVM rehearsal evidence. They are not Arc receipts, a permanent fee quote, or funding authorization.


## G2 PRECOMMIT live proof — 2026-10-02

### OBSERVED / PROVEN

A real `commitBatch` transaction succeeded on Arc Mainnet against the deployed integrated `AssuranceVault`.

- tx: `0xbfa8dcb6b354eda7cf2cb1a428fc95e9a99e433d85e27e8b4a1cf8bf7249a65e`
- block: `23975010`
- receipt status: `1`
- nonce: `9`
- value: `0`
- gas used: `132026`
- exact calldata: verified
- exact `BatchCommitted` event: verified
- post-state `activeBatchId`: exact committed batch
- post-state batch state: `Committed`

Committed batch:

- policy: `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- batch: `0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7`
- commitment: `0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9`

The hidden reveal packet remains human-local and was not stored in the repository or disclosed in chat.

### PROMOTION

- G2 PRECOMMIT: **PROVEN**
- G3 REAL WORK: **BLOCKED**
- Live Core Loop: **BLOCKED**
- Load-Bearing Integration: **BLOCKED**
- Real Consequence: **BLOCKED**

### STILL UNKNOWN / NOT PROVEN

- provider execution for this committed batch;
- EIP-712 signed provider output for this batch;
- provider output lock;
- reveal correctness;
- deterministic PASS/FAIL;
- PASS -> payout;
- FAIL -> no-pay;
- breaker -> refund;
- external user/operator adoption.

No downstream transaction is authorized by this evidence.


## Recovery Policy v2 preflight — 2026-10-03

### OBSERVED / PROVEN READ-ONLY

GitHub Actions workflow `37122442113` on exact head `7ffccd7497add9a5636e4ff64057cdb93592ef7c` queried Arc Mainnet without a signer.

It confirmed:
- the stranded v1 policy still has the exact proven active batch and commitment;
- batch state remains `Committed`;
- protected liability and vault balance remain 0.010 native USDC;
- total custody received remains 0.010;
- total value released remains 0;
- deployment spend cap remains 0.050.

The proposed independent v2 policy is:
`0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`.

Its exact createPolicy call passed `eth_estimateGas` at 255200 gas. Observed gas price was 20 gwei and the estimated fee was 0.005104 native USDC.

### NOT PROVEN / NOT AUTHORIZED

No v2 policy exists yet. No transaction was signed or broadcast. No funds moved.

Funding, canary generation, commitBatch, provider signing, lock, reveal, resolve, and v1 expiry recovery all remain separately gated.

Artifact digest:
`sha256:7a540ab48b4b12432349c6e9ea5aad6cd0e088be2514a850a2919563e4b057b1`.
