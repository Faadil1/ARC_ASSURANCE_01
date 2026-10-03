# ARC_ASSURANCE_01 — Handover

Updated: 2026-09-27

## 1. Current baseline

Repository: `Faadil1/ARC_ASSURANCE_01`

The repository has been bootstrapped on `main`. The product name remains open; `ARC_ASSURANCE_01` is an internal identifier.

Current concept is locked:

> continuous assurance for autonomous paid work

Core loop:

```
PRECOMMIT TEST
→ REAL WORK
→ HIDDEN CANARY
→ DETERMINISTIC VERIFY
→ PAY / BLOCK / CIRCUIT BREAKER
```

The original ProofTender procurement-platform direction is closed.

## 2. Why the concept changed

A five-model council (Claude, Grok, Perplexity, Gemini, Kimi) plus current ecosystem checking converged on a narrower problem:

- generic agent wallets/payment rails already exist;
- procurement/bidding/escrow/reputation are not sufficient differentiation;
- policy gates alone are crowded;
- evidence-gated payment alone is not enough;
- the strongest surviving mechanism is a test committed before execution, hidden from the provider, repeated during production, with deterministic financial consequences.

## 3. MVP boundary

MVP vertical: structured document extraction.

The system must not rely on subjective evaluation.

Mainnet critical path:

```
Arc mainnet
+ real USDC
+ assurance contract
+ real provider HTTP service
+ deterministic scorer
+ provider signature
+ verifier CLI
```

Agent Wallets, Nanopayments, x402, ERC-8004 and ERC-8183 are not required for promotion.

## 4. Current gate

**G2 — PRECOMMIT — READINESS ACTIVE / LIVE PROOF NOT PROVEN**

G0 / PRD_READY is **PROVEN** via PR #1 merged at
`1220fc5d39b2262f0b66d0ae4713629b10f3ca29`.

The corrected G0 rule is owner sign-off + clean merge. Opeyemi review is
recommended/non-blocking for G0 and remains mandatory only at later gates where
his explicit technical surface is materially affected.

G1 / T0_MAINNET_CUSTODY is **PROVEN** on the separate live T0 evidence line.

## 5. Immediate blocker

No human review blocker remains for G0.

Before live G2 execution, this integrated line must be reconciled with the merged
G0 mainline, exact-source readiness must be rerun, and each consequential
mainnet action must receive separate explicit human authorization.

## 6. Next gate

**G2 — PRECOMMIT**

Use the integrated `AssuranceVault` product core. G2 requires a real opaque
commitment on Arc mainnet before provider execution/output lock for the same
batch.

Historical G1 primitive proved on the separate T0 line:

```
real USDC
→ contract custody
→ configured payout
→ remaining-funds refund
```

Capture real transaction references and balances.

Do not claim the broader product is mainnet-proven merely because T0 succeeds. T0 proves only the custody/payment primitive.

## 7. Parallel work after G0

Opeyemi:
- `feat/t0-mainnet-custody`

Faadil:
- `feat/canonical-scorer`

These workstreams may proceed in parallel because they touch separate surfaces.

Do not parallelize conflicting ABI/state-machine implementations.

## 8. Hero proof target

The final demo must show:

1. real Arc mainnet budget funded;
2. hidden canary committed before execution;
3. provider output cryptographically locked;
4. PASS → real payout;
5. controlled degraded provider behavior;
6. FAIL → real no-pay;
7. configured repeated failure → breaker;
8. remaining funds protected/refunded;
9. verifier independently reconstructs the proof.

Controlled fault injection must be labeled as such.

## 9. Truth boundaries

Never say:

- “blockchain proved the result was objectively good”;
- “the agent made the right decision”;
- “Arc mainnet proof” when showing testnet/local/stub behavior;
- “third-party provider failure” when using our own controlled fault injection.

Safe claim:

> The acceptance test was committed before the provider result, the provider committed to the output before reveal, deterministic verification produced this state, and the configured USDC consequence followed.

## 10. Continuous recording rule

After any meaningful:

- accepted product decision;
- merged implementation milestone;
- real mainnet execution;
- material failure;
- invariant change;
- gate transition;

update both:

- `docs/internal/CANONICAL-STATE.yaml`
- `docs/internal/HANDOVER.md`

before declaring that workstream complete.


## 11. Conditional Gateway Registry — mandatory

Canonical file:

- `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`

Reality ledger:

- `docs/internal/REALITY-LEDGER.md`

Every gate must remain explicitly `ACTIVE`, `N/A`, `BLOCKED`, or `PROVEN`.

No contributor may remove a gate because it is currently irrelevant. Use `N/A` with a rationale.

Every meaningful PR must state whether it changes any gateway status. Scope/architecture/runtime/payment/platform changes require a full registry re-evaluation.

### Current material gap

Pre-Build Reality is currently **BLOCKED**, not PROVEN:

- real external user/operator evidence is still missing;
- a concrete external negative event with observable impact is still missing.

This does not undo the current Concept Lock, but it blocks promotion into DELIVER. T0 remains permitted as a DESIGN technical-risk spike.

## 12. Product Depth & Live Reality v1.2.1

Canonical status: **ACTIVE**.

The project must not stop at a vertical slice or a technical proof. Before submission promotion it must close the relevant gaps around:

- live core loop;
- load-bearing Arc integration;
- real financial consequence;
- success/negative/boundary/recovery scenarios;
- failure/recovery;
- real user/operator surface and external evidence;
- TTFV;
- operational economics where material;
- shared product core;
- receipts/observability;
- judge/operator self-serve;
- clean-room reproducibility;
- external-dependency failure;
- post-vertical-slice depth review.

Heavy polish comes after material reality/depth gaps are closed.


## 14. Canonical scorer workstream started

Parallel branch:

- `feat/canonical-scorer`

Implemented:

- deterministic invoice-v1 schema;
- fixed-order canonical serialization;
- integer minor-unit money representation;
- exact-match scorer;
- malformed-output negative path;
- invalid-ground-truth configuration failure;
- two public PRESEEDED test vectors;
- canonical scorer specification.

Local dependency-free Node verification:

```
tests: 8
pass: 8
fail: 0
```

### Important evidence boundary

The public fixture vectors are **PRESEEDED** and cannot be used as hidden canaries in any live demo.

The scorer code is **LOCAL_VERIFIED**, not mainnet/live evidence.

The supplied keccak vectors must still be independently cross-checked with the Arc/EVM toolchain before the final contract commits to this hashing convention.

### Negative-path decision

If expected ground truth is malformed, the system must **abort/review** rather than classify the provider as failed and withhold payment. Ground-truth configuration error is not provider fault.


## 16. Provider service workstream — LOCAL_VERIFIED

Branch:

- `feat/provider-service`

Prepared and locally executed:

- real invoice parser;
- HTTP `POST /v1/extract`;
- explicit health endpoint;
- controlled fault modes;
- default fault injection disabled;
- evidence metadata that distinguishes real compute from injected fault;
- explicit `signature_status: NOT_IMPLEMENTED`.

Local execution result:

```
tests: 10
pass: 10
fail: 0
```

### Important boundary

The provider performs genuine local computation, so the implementation is `LOCAL_VERIFIED`.

However the canonical **REAL_WORK** promotion gate remains BLOCKED because:

- no deployed runtime exists;
- no exact commit/runtime binding exists;
- provider output is not yet signed with the EIP-712 scheme;
- no live request/response evidence exists.

Controlled degradation may be used only when `ALLOW_DEMO_FAULTS=true`, and every such response marks `fault_injected: true`. It must never be narrated as an organic provider failure.


### Signed negative-path refinement

The preferred future signed hero failure is now:

- `WRONG_AMOUNT_VALID`

It changes tax and total together so the result remains schema-valid and canonicalizable while still being objectively wrong against the hidden known-answer canary.

Malformed outputs remain boundary cases and should route to `REVIEW/ABSTAIN` until a signed raw-envelope protocol exists.


## 17. EIP-712 provider-output binding — PRODUCED / REVALIDATION_REQUIRED

Branch:

- `feat/eip712-provider-binding`

Stacking:

- based on `feat/provider-service`
- does not modify Opeyemi's T0 branch

Frozen typed-data primary type:

```
ProviderOutput(
  address provider,
  bytes32 policyId,
  bytes32 batchId,
  bytes32 workId,
  bytes32 inputHash,
  bytes32 outputHash,
  bytes32 scorerIdHash,
  uint256 nonce,
  uint256 deadline
)
```

Domain:

```
name = ARC_ASSURANCE
version = 1
chainId = 5042
verifyingContract = final assurance contract
```

### Provider integration

Signed mode now binds the actual canonical provider result.

Trusted runtime configuration supplies:

- dedicated provider signing key;
- Arc chain id;
- verifying contract.

The HTTP caller supplies only:

- policy id;
- batch id;
- work id;
- nonce;
- deadline.

The request cannot choose the EIP-712 chain or verifying contract.

### Negative path

- schema-valid `WRONG_AMOUNT_VALID`: signable and attributable;
- malformed output: `ABSTAIN_MALFORMED`, no signature.

### Contract integration

`ProviderOutputEIP712.sol` is an abstract module intended to be inherited by the final assurance contract.

It verifies provider identity, deadline, typed-data signature, and exact-digest replay consumption.

It deliberately does **not** decide PASS/FAIL or pay money.

For invoice-v1 the later deterministic verdict can be:

```
signed outputHash == revealed expectedOutputHash
```

after the hidden precommit is successfully reconstructed.

### Truth boundary

Status is **PRODUCED_REVALIDATION_REQUIRED**, not LOCAL_VERIFIED.

Required next:

1. install pinned Node dependency and run EIP-712 JS/HTTP tests;
2. install a pinned audited OpenZeppelin Contracts release and run Arc Foundry Solidity tests;
3. generate one JS/Solidity golden vector proving identical final EIP-712 digest;
4. Opeyemi reviews the Solidity integration seam after T0 revalidation;
5. final assurance state machine binds one signed output to one work item before financial consequence.


## 18. Assurance Core v1 — hidden-canary state machine

Branch:

- `feat/assurance-core-v1`

Stacking:

`feat/provider-service → feat/eip712-provider-binding → feat/assurance-core-v1`

This branch does not modify Opeyemi's T0 branch.

Implemented causal sequence:

```
PRECOMMIT
→ EIP-712 PROVIDER OUTPUT LOCK
→ REVEAL
→ DETERMINISTIC RESOLVE
→ PAY / WITHHOLD / BREAKER directive
```

### Important protocol choices

- one unresolved batch per policy;
- provider address and scorer hash are policy-bound;
- commitment includes Arc chain + exact contract address;
- commitment hides work/input/expected/scorer/salt;
- workId cannot be locked twice;
- exact canary ground truth cannot be reused after reveal;
- reveal is impossible before signed output lock;
- buyer cannot replace expectedOutputHash or salt after seeing the provider result;
- PASS is exact `outputHash == expectedOutputHash`;
- failure threshold is cumulative in v1;
- reaching threshold pauses policy and blocks new batches.

### Financial truth boundary

The module does not hold or move USDC.

`PAY`, `WITHHOLD`, and `BREAKER` are only settlement directives.

Therefore G5 Financial Causality and Product Depth Real Consequence remain BLOCKED until real Arc custody is composed with this state machine and receipts prove the money path.

### Verification boundary

Status is `PRODUCED_REVALIDATION_REQUIRED`.

Foundry/crypto dependencies are now explicitly reproducible on this branch:

- forge-std v1.16.1;
- OpenZeppelin Contracts v5.6.1;
- Viem 2.56.9.

No test-pass claim is made for this exact head until those suites are actually run.


## 19. Verifier CLI v1 — offline evidence verification

Branch:

- `feat/verifier-cli-v1`

Implemented:

- fail-closed evidence packet verifier;
- CLI with normal and `--require-financial` modes;
- EIP-712 reconstruction/signature verification;
- hidden commitment reconstruction;
- deterministic verdict reconstruction;
- event-order verification using block number + log index;
- public golden-vector generator;
- tamper/ordering/financial-boundary test sources.

### Important distinction

Verifier v1 validates **internal cryptographic/evidence consistency**.

It does not yet fetch Arc mainnet logs itself.

Therefore:

```
CORE_PROOF_VALID != ARC_MAINNET_PROOF
```

and no packet field can self-promote financial causality.

`--require-financial` intentionally fails until the verifier has a chain-native custody/receipt verification path.

### Local environment result

Node 22.16.0 is available in the current agent environment.

Viem was not installed. A dependency-install attempt timed out, so no exact-head JS test pass is claimed.

This branch remains `PRODUCED_REVALIDATION_REQUIRED`.


## 20. Chain-Native Verifier v2 — Arc RPC reconstruction

Branch:

- `feat/chain-native-verifier-v2`

v2 changes the verifier trust model:

```
v1: self-authored event packet
v2: Arc RPC logs + receipts + runtime bytecode
```

The manifest may still contain off-chain provider material that the current contracts do not emit:

- exact input text;
- canonical output string;
- scorer ID string;
- provider signature;
- nonce;
- deadline.

But it no longer supplies canonical chain events.

### T0 mode

v2 can independently reconstruct:

```
PolicyCreated
→ PolicyFunded
→ PaymentReleased
→ RemainingFundsRefunded
→ PolicyCompleted
```

It checks event ordering, transaction success, immutable funder/recipient binding and value conservation.

A real successful run may produce:

`T0_CUSTODY_PROVEN_FROM_ARC`

### Assurance mode

v2 independently fetches the assurance core events, policy provider/scorer configuration and lock block timestamp, then reuses the strict v1 cryptographic reconstruction.

A real successful run may produce:

`ASSURANCE_CORE_PROVEN_FROM_ARC`

### Critical integration boundary

Today T0 custody and Assurance Core are separate primitives.

Therefore even if both independently prove:

```
T0_CUSTODY_PROVEN_FROM_ARC
+
ASSURANCE_CORE_PROVEN_FROM_ARC
```

the combined verdict is still:

`PRIMITIVES_PROVEN_INTEGRATION_NOT_PROVEN`

No causal financial claim is allowed until the assurance decision is load-bearing on the custody/settlement path.

### Runtime/commit binding

v2 fetches runtime bytecode from Arc and computes its keccak256 hash.

If the manifest supplies an expected code hash, a mismatch fails closed.

However an expected code hash plus a text Git SHA does not itself prove reproducible build provenance. Full Runtime/Commit Binding remains BLOCKED until exact commit -> build artifact -> deployed bytecode is reproducibly linked.


## 21. Integrated AssuranceVault — load-bearing candidate

Branch:

- `feat/integrated-assurance-vault`

This is the first source-level composition where assurance and custody are no longer separate primitives.

Canonical path:

```
fund
→ hidden precommit
→ signed provider output
→ reveal
→ resolve
   ├─ PASS -> native USDC payout
   ├─ FAIL -> no payout / protected liability
   └─ threshold FAIL -> breaker -> refund protected remainder
```

### Critical architectural change

There is **no independent provider payout function**.

The only provider payout path is `resolveBatch()`, and it can transfer the configured unit payout only when the signed output hash exactly equals the revealed/precommitted expected output hash.

This is the intended load-bearing property.

### Negative path

A resolved FAIL is terminal for that batch and emits `PaymentWithheld`; no later function can release a payout for that resolved batch.

Configured cumulative failures trigger the breaker, pause the policy, block future batch commits, and enable refund of the remaining policy liability to the immutable funder.

### Recovery path

Policies require a future expiry.

If a payout recipient rejects native value, the PASS resolution transaction fully reverts. After expiry, the funder can cancel the unresolved batch and refund the protected remainder.

### Verification

Integrated verifier v3 requires Arc RPC evidence.

PASS:
- BatchResolved(PAY) and PaymentReleased in the same successful transaction.

FAIL:
- BatchResolved(WITHHOLD/BREAKER) and PaymentWithheld in the same successful transaction.
- zero PaymentReleased events for the batch/work.

BREAKER:
- breaker event in the resolve transaction;
- later exact protected-remainder refund;
- policy close;
- final value conservation.

### Truth boundary

Status is `PRODUCED_REVALIDATION_REQUIRED`.

No compile/test pass is claimed for the exact head.
No integrated Arc deployment exists.
No G5/G6/Live Core Loop promotion is allowed yet.


## 22. Reproducible Build + Deployment Manifest Gate

Branch:

- `chore/reproducible-build-manifest`

This workstream is now the only allowed path from PR #20 source to an integrated mainnet deployment.

Implemented:

- exact toolchain/direct dependency pins;
- deterministic golden-vector generation;
- Solidity cross-language golden-vector verification;
- build manifest generator;
- predeployment manifest generator;
- creation/init-code cross-check test;
- strict local clean-room script;
- GitHub Actions clean-room evidence workflow;
- integrated verifier support for deployment tx input / expected init-code binding;
- pre-mainnet audit checklist.

### Important provenance correction

Because the integrated contract inherits EIP-712 and uses immutables, a generic precomputed runtime hash is not sufficient as the predeployment identity.

Canonical binding is:

```
Git SHA
→ deterministic creation bytecode
→ exact constructor args
→ init-code hash
→ Arc deploy transaction input
→ successful deployment receipt
→ contract address
→ observed runtime bytecode hash
```

### Current blocker

No committed `package-lock.json` exists yet.

Therefore Node's transitive dependency graph is not durably locked, and the reproducible-build gate remains BLOCKED even though direct versions are pinned.

CI can generate a candidate lock artifact for review; it must be committed before promotion.

### Mainnet rule

No integrated deployment/funding until:

1. package-lock committed;
2. exact-head clean-room workflow green;
3. JS + Solidity + cross-language tests green;
4. Opeyemi review;
5. T0 PR #6 green;
6. protected deployment manifest approved.


## 23. Clean-room reproducibility proof — 2026-09-29

The reproducible-build workflow reached a fully green run on exact branch head:

`a88d08a3a5fef63dac7b5093100fdb2d2c609cd7`

Workflow run:

`36625411255`

Observed results:

- committed `package-lock.json` accepted by `npm ci`;
- deterministic golden vector generated twice with byte-for-byte equality;
- **54/54 JavaScript tests passed**;
- Solidity compilation succeeded with solc 0.8.24;
- reproducible build manifest generated;
- deterministic predeployment manifest generated;
- **28/28 Solidity tests passed**;
- JS/Solidity EIP-712 + canary vector cross-check passed;
- creation/init-code manifest cross-check passed;
- evidence artifact uploaded;
- Node 22.16.0;
- npm 10.9.2;
- Foundry 1.8.3 / commit `cae51ad458f6abb64852b7709eb784352429825d`.

Package-lock SHA-256:

`c8d1896dbde5a9701a6b30883e533ad95d92a55350a0d3d842cb7ec968db61ea`

Observed AssuranceVault build at that proof point:

- creation bytecode keccak256:
  `0x29bdd71974b5943f8f3194272f6cb13568e5e4ce23865cf085c6242334163afd`;
- creation bytecode size: 16,776 bytes;
- runtime-template hash:
  `0xb7674d9c13d716f5ae2fb26126d037c069ccae74db14386a143325eee7b06010`
  (**informational only before deployment**).

The CI workflow now checks out the exact PR branch head rather than GitHub's synthetic merge SHA and uses the committed lockfile instead of generating one.

### Promotion boundary

This proves the source/build reproducibility layer, not Arc deployment.

Still BLOCKED:

- Opeyemi technical review after T0;
- T0 PR #6 completion;
- final real constructor/policy values;
- protected mainnet deployment;
- deploy tx input -> expected init-code proof;
- deployed runtime hash;
- PASS / FAIL / BREAKER / refund Arc receipts;
- G5 / G6 / Live Core Loop.


## 24. T0 final source/supply-chain revalidation

Opeyemi's T0 branch plus final supply-chain hardening is green on:

`f7fdf4e1b592c9122d4680d5272635baa2afff3f`

Workflow run:

`36637646773`

Observed:

- Arc Foundry 1.7.1-dev;
- Arc Foundry commit `d497beea7096ff2a8e583c8b307941f24a61b06b`;
- official Linux x86_64 release asset SHA-256 verified:
  `088bdb96a84418b757f9825d491e702792f1d1d1e29a9145af305a6600a79556`;
- forge-std commit verified:
  `3b20d60d14b343ee4f908cb8079495c07f5e8981`;
- build PASS;
- 40/40 tests PASS;
- evidence artifact digest:
  `sha256:0d00268c75c457eea074f88783767061547a783b46093d44c61eb7a5bf2db4c0`.

This proves post-audit source revalidation only.

G1 remains ACTIVE / NOT PROVEN until real Arc mainnet deploy -> fund -> payout -> refund receipts exist.

## 25. Pre-Mainnet Deployment Package

Branch:

`ops/pre-mainnet-deployment-package`

Bounded plan:

```
dedicated wallet ceiling = 5.00 USDC

T0:
fund   = 0.010
payout = 0.002
refund = 0.008
hard contract cap = 0.050
```

The 5 USDC ceiling is wallet gas/operational headroom, not an agent budget and not intended contract custody.

Required topology:

- dedicated authority/funder wallet;
- separate payout recipient EOA;
- integrated provider signer separate from funder;
- no mainnet private key in repo/CI/chat.

A no-secret validator now checks public addresses and all bounded values without signing, broadcasting or moving funds.

Current blockers before human funding:

1. real public wallet addresses;
2. read-only gas estimate;
3. explicit review of the gas estimate against the 5 USDC ceiling;
4. explicit human funding authorization.

No wallet funding or mainnet action has occurred.


## 26. Pre-mainnet package clean-room proof

The no-secret package passed clean-room verification on:

`e76bd480785d5a627499f7d6ea27ae55705f4df9`

Workflow:

`36638119707`

Observed:

- 58/58 JavaScript tests PASS;
- 28/28 Solidity tests PASS;
- build PASS;
- package-lock unchanged and verified;
- AssuranceVault creation bytecode unchanged:
  `0x29bdd71974b5943f8f3194272f6cb13568e5e4ce23865cf085c6242334163afd`;
- evidence artifact digest:
  `sha256:d2a849fcdabae06015c388ccca0b6ea90924eb9a3fc0eb0914db298ed3c3f1ab`.

The additional four JS tests are the pre-mainnet bounded-configuration checks.

This proof does not authorize funding. The next gate is human/public configuration + read-only gas estimation.


## 27. Read-Only Gas Budget Gate

Branch:

- `ops/read-only-gas-budget-gate`

This gate is intentionally split into two evidence classes.

### A. Fee snapshot

Public Arc RPC only:

```
chain id
+ block number
+ gas price
```

No address secret and no signer are needed.

The result is time-bound and must be refreshed immediately before a protected mainnet action.

### B. Wallet budget

The budget combines:

```
verified deploy gas units
+ verified lifecycle gas units
→ gas-unit safety multiplier
× fresh observed gas price
→ gas-price safety multiplier
+ peak principal outflow
→ peak required wallet balance
```

Canonical defaults:

- gas-unit safety: 1.25x;
- gas-price safety: 2.00x;
- dedicated wallet ceiling: 5.00 native USDC.

The script refuses to invent missing gas-unit values. The template therefore carries those inputs as `null` until exact-head rehearsal evidence exists.

### Human boundary

A green gas-budget result still does not authorize wallet funding.

Required sequence:

```
real public addresses
→ exact-head gas-unit rehearsal
→ fresh Arc fee snapshot
→ 5 USDC ceiling review
→ explicit human funding authorization
```

No private key, signing or broadcasting is part of this gate.


## 28. Pre-Mainnet Static Warning Hardening

Branch:

- `fix/pre-mainnet-static-hardening`

Clean-room run `36670714112` was green but exposed Foundry lint classes that must not be silently ignored before mainnet.

Material hardening now applied:

- global non-reentrancy across all state-mutating external entrypoints;
- `nonReentrant` moved to first modifier position;
- payout/refund canonical events emitted before external native-value interaction;
- OpenZeppelin SafeCast for timestamp downcasts;
- malicious payout recipient test attempts reentrant `commitBatch()`.

Intentionally retained semantics:

- `block.timestamp` for deadline/expiry only;
- native send to immutable policy-bound payout/refund destinations;
- test-only `vm.warp` warning.

Promotion remains blocked until exact-head CI is green and post-fix warnings are re-reviewed.


## 29. Static Warning Audit — PROVEN

Exact hardening head:

`b5b8918c89fecd4abc5a8249270b8e5424531643`

Clean-room workflow:

`36671113993`

Observed:

- JavaScript: **63 passed / 0 failed**;
- Solidity: **29 passed / 0 failed**;
- malicious payout-recipient reentry test: **PASS**;
- `unsafe-typecast`: eliminated;
- `non-reentrant-not-first`: eliminated.

Remaining warning classes were reviewed:

- `block-timestamp`: deadline/expiry semantics only;
- `reentrancy-events`: conservative lint diagnostic around internal cryptographic/state helper paths; no uncontrolled external value interaction on those event paths;
- `reentrancy-eth`: native payout/refund interaction remains, but all state-mutating external entries are guarded and malicious callback mutation is proven blocked;
- `arbitrary-send-eth`: native destinations are immutable policy-bound payout recipient/funder;
- `environment-read-across-mutation`: test-only vm.warp diagnostic.

New canonical creation-bytecode hash:

`0xac69dd96b86b9083bf08c6ef904df7bf9ee602addaccc1938357f9cb9c75ff57`

The prior integrated bytecode hash is superseded and must not be used in a deployment manifest.

This closes the static-warning subgate only. Mainnet/public-address/gas/funding/live-receipt gates remain blocked.


## 30. Gas Unit Evidence Manifest — execution rehearsal PROVEN

Exact head:

`70f4fd1b1181ee933c4876b266bb28169919cbea`

Workflow:

`36672057005`

Observed:

- 67/67 JavaScript tests PASS;
- 29/29 Solidity tests PASS;
- machine-readable gas-unit evidence generated;
- artifact digest:
  `sha256:1c12cb9b7544a833ad3cea6dff3fe7f6ce5331b3d03a95c85f3a3448c2c4e1d9`.

Exact-head local maxima aggregate to:

```text
first PASS lifecycle      = 1,035,420 gas
one assurance batch      =   653,529 gas
full hero execution      = 2,426,871 gas
```

The full hero planning sequence is:

```text
createPolicy
→ fund
→ PASS batch
→ FAIL/WITHHOLD batch
→ FAIL/BREAKER batch
→ refundProtectedRemainder
```

These are LOCAL_EXACT_HEAD_REHEARSAL values and still receive the separate gas-unit safety multiplier in the wallet-budget gate.

### Deployment gas remains blocked

Foundry reported deployment cost `0` for AssuranceVault. The parser explicitly rejected that value.

Next required evidence:

```text
exact creation bytecode
+ exact constructor args
+ public deployer address
+ current deployer nonce
→ eth_estimateGas(contract creation)
→ predicted contract address
→ time-bound predeploy gas snapshot
```

No private key is needed for that next step.


## G0 mainline reconciliation — 2026-10-02

- PR #1 merged to `main`: `1220fc5d39b2262f0b66d0ae4713629b10f3ca29`
- G0: **PROVEN**
- collaborator review at G0: **RECOMMENDED / NON-BLOCKING**
- G1 T0 custody: **PROVEN** on PR #44
- current product gate: **G2 PRECOMMIT**
- live G2 protected actions: **NOT AUTHORIZED**


## G2 PRECOMMIT live proof — 2026-10-02

G2 PRECOMMIT is now **PROVEN** on Arc Mainnet.

Live transaction:

- tx: `0xbfa8dcb6b354eda7cf2cb1a428fc95e9a99e433d85e27e8b4a1cf8bf7249a65e`
- block: `23975010`
- transaction index: `2`
- sender/funder: `0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`
- AssuranceVault: `0x6f79cdc961e30f2e1fac0f4eada6ca35e58290e4`
- nonce: `9`
- value: `0`
- gas used: `132026`
- receipt status: `1`

Committed tuple:

- policy: `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- batch: `0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7`
- commitment: `0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9`

Read-only receipt verification proved:

- exact sender / target / zero value;
- exact `commitBatch(policy,batch,commitment)` calldata;
- exact `BatchCommitted` event;
- `committedAtBlock = 23975010`;
- `activeBatchId = batchId`;
- batch state = `Committed`.

The secret reveal packet remains human-local, off-repo and undisclosed in chat.

Canonical evidence:

- `docs/evidence/G2-PRECOMMIT.md`
- `docs/internal/G2-COMMITBATCH-AUTHORIZATION.md`

The one-time `commitBatch` authorization is **CONSUMED**.

### Current product gate

`G2_PRECOMMIT = PROVEN`

Next gate:

`G3_REAL_WORK = BLOCKED_PENDING_READINESS_AND_SEPARATE_AUTHORIZATION`

Do **not** run `lockProviderOutput`, `revealCanary`, `resolveBatch`, payout, breaker or refund actions until their own readiness checks and explicit human authorization are complete.

G2 proves only the precommit causal edge. It does not yet prove provider execution, signed-output correctness, reveal, deterministic resolution, financial consequence, breaker/refund, or external adoption.


## G3 REAL WORK read-only readiness — 2026-10-02

Branch: `ops/g3-real-work-readiness`

G2 remains PROVEN and the live batch remains the only authorized target.

A secret-safe local preparer now exists:

- `script/g3_prepare_real_work.mjs`
- `docs/internal/G3-REAL-WORK-READINESS.md`
- `docs/internal/G3-REAL-WORK-READINESS.yaml`

The preparer is intentionally pre-signature and pre-transaction. It:

- reads the G2 reveal packet only from a human-local file outside Git;
- reconstructs the exact commitment locally;
- confirms the current Arc batch is still Committed and workId unused;
- runs the provider HTTP endpoint over loopback with faults disabled;
- proves REAL_COMPUTE for the exact input;
- compares the provider output to the hidden expected output locally;
- writes a sensitive local compute artifact outside Git;
- creates no EIP-712 signature;
- sends no transaction.

The existing raw PROVIDER_SIGNING_KEY runtime path is not required for this preparation. Preferred next signing path is wallet-based typed-data signing by the exact policy-bound provider EOA, without exporting its private key.

Current gate:

`G3_REAL_WORK = BLOCKED`

Still required:

1. successful local read-only preparer result;
2. provider EIP-712 signature;
3. independent signature verification;
4. exact `lockProviderOutput` eth_call/gas preflight;
5. separate human authorization;
6. successful Arc receipt.

Do not run `lockProviderOutput`, `revealCanary` or `resolveBatch` from this readiness branch without the corresponding gate and authorization.


G3 readiness validation: draft PR #46 at head `84cb2a7b4f43ae443939d9e988d9d3f529ac3083` triggered reproducible-build-candidate run `37088856971`, which completed **SUCCESS**. This is regression/build evidence only; it does not execute the human-local canary and does not promote G3.


## G3 lost-preimage incident — 2026-10-03

The original G2 hidden-canary reveal packet for the live committed batch is no longer available after the managed endpoint security incident.

Do not rerun the original canary generator in an attempt to recover that commitment. New random values cannot open the existing commitment.

Canonical recovery:
- G2 remains PROVEN.
- Original policy/batch remains Committed and is held untouched until expiry.
- Policy expiry is 2026-10-15T03:00:00Z.
- After expiry, use fresh read-only preflights and separate human authorization for `cancelExpiredBatch`, then `refundProtectedRemainder`.
- Immediate project continuation should use a new independent policy on the already-deployed AssuranceVault, a new batch, and a new hidden canary.
- The 0.05 native-USDC deployment spend cap has only 0.01 cumulative funding so far; a fresh 0.01 policy would project to 0.02 cumulative funding, subject to a live preflight.
- Store the new reveal packet directly in a protected GitHub Environment secret rather than a local plaintext file on the managed endpoint.

Recovery detail: `docs/internal/G3-LOST-PREIMAGE-RECOVERY.md`.

No new policy creation, funding, commit, signature, lock, reveal, resolve, cancellation, or refund is authorized by this handover update.


## Recovery Policy v2 read-only preflight — 2026-10-03

A clean GitHub-hosted Arc preflight succeeded on exact head `7ffccd7497add9a5636e4ff64057cdb93592ef7c`, workflow `37122442113`.

Observed:
- v1 remains exactly `Committed` with 0.010 native USDC protected;
- vault state has no unexpected drift;
- proposed v2 policy ID is `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`;
- v2 createPolicy passes `eth_estimateGas`;
- gas estimate = 255200 at observed 20 gwei;
- estimated fee = 0.005104 native USDC;
- projected custody after later 0.010 funding = 0.020 / 0.050;
- no private key or secret was consumed;
- no transaction was signed/broadcast and no funds moved.

Canonical evidence: `docs/evidence/RECOVERY-POLICY-V2-PREFLIGHT.md`.

Current next protected step is one exact v2 `createPolicy` transaction, but its authorization remains **NOT AUTHORIZED** in `docs/internal/RECOVERY-POLICY-V2-CREATE-AUTHORIZATION.md`.

Do not infer permission for funding or any downstream operation from a future createPolicy authorization.


## Recovery Policy v2 createPolicy live receipt — 2026-10-03

The exact authorized v2 `createPolicy` transaction succeeded on Arc Mainnet.

- tx: `0x0bb6e1ef61504f8f1ea4f899c88cccc9a65c10ea0646867e9ebac87a57341fd4`
- block: `24052629`
- nonce: `10`
- value: `0`
- gas used: `248358`
- actual fee: `0.005339697 native USDC`

Post-state:
- `policyCount = 2`;
- v2 policy exists and is unfunded;
- v2 active batch is zero;
- authority pending nonce = 11;
- v1 remains Committed with its original batch/commitment and 0.010 native USDC funded;
- vault still holds exactly 0.010 native USDC and has released 0.

Evidence: `docs/evidence/RECOVERY-POLICY-V2-CREATE.md`.

The one-shot createPolicy authorization is **CONSUMED**.

Next gate is v2 funding. Funding remains **NOT AUTHORIZED** until a fresh read-only funding preflight passes and Faadil grants a separate explicit authorization.


## Recovery Policy v2 funding read-only preflight — 2026-10-03

GitHub Actions workflow `37124943731` passed on exact head `d6bdff050a2ca54f785fc19312be6f838a7c210b`.

Observed:
- v1 remains Committed and unchanged;
- v2 exists, remains unfunded, and has no active batch;
- vault pre-state remains 0.010 liability / 0.010 custody / 0.010 balance / 0 released;
- exact proposed funding value = 0.010 native USDC;
- pending nonce = 11;
- calldata hash = `0xdc6ad0cd75e1a2b9bebdbc26530f2669a8c6ea25f60d8bb993dfbd3fc6986646`;
- gas estimate = 82230;
- estimated fee = 0.0016446008223 native USDC;
- estimated total wallet outflow = 0.0116446008223 native USDC;
- projected cumulative custody after success = 0.020 / 0.050;
- no signer, no broadcast and no value movement occurred.

Evidence: `docs/evidence/RECOVERY-POLICY-V2-FUNDING-PREFLIGHT.md`.

Funding remains **NOT AUTHORIZED** pending a separate explicit one-shot authorization.


## Recovery Policy v2 funding live receipt — 2026-10-03

The exact authorized v2 funding transaction succeeded on Arc Mainnet.

- tx: `0x0135a9f0c0882bd64b8d2c0dd2cb22f79f48fa17aca82cad95153e8efebab348`
- block: `24055978`
- nonce: `11`
- value: `0.010 native USDC`
- gas used: `76633`
- actual fee: `0.0016476095 native USDC`

Post-state:
- authority pending nonce = 12;
- v2 total funded = 0.010 native USDC;
- v2 active batch remains zero;
- v1 remains Committed and unchanged with 0.010 native USDC;
- vault total liability/custody/balance = 0.020 native USDC;
- total value released remains zero.

Evidence: `docs/evidence/RECOVERY-POLICY-V2-FUNDING.md`.

The one-shot funding authorization is **CONSUMED**.

Next gate: generate a brand-new v2 hidden canary and store the reveal packet directly in a protected GitHub Environment secret. No `commitBatch` or downstream action is authorized by the successful funding.


## Recovery Policy v2 precommit read-only preflight — 2026-10-03

A fresh v2 hidden canary was generated in Remix after v2 funding. Only the public binding was retained in the repository:

- policy: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch: `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- commitment: `0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17`

The operator reports the full reveal packet was copied directly into protected GitHub Environment secret `G2_SECRET_REVEAL_PACKET` under `g3-live-secret`. The preflight did not read it.

Workflow `37126625964` passed on exact head `a5ceab0e8ce861fbabb4d747c22098b45f837247`.

Observed:
- nonce 12;
- v2 funded and active batch zero;
- v1 unchanged;
- vault liability/custody/balance = 0.020 native USDC;
- exact commitBatch eth_call = PASS;
- exact commitBatch eth_estimateGas = PASS;
- gas estimate = 137470;
- tx value = 0;
- no signer, secret read, broadcast, or value movement.

Next gate: exact v2 `commitBatch`, still NOT AUTHORIZED pending separate one-shot human authorization.


## Recovery Policy v2 commitBatch live receipt — 2026-10-03

The exact authorized v2 `commitBatch` transaction succeeded on Arc Mainnet.

- tx: `0x36d8d4dc972a2ef557d2a9eee38a5607e128eef01694d8620fef207befd61c07`
- block: `24060767`
- nonce: `12`
- value: `0`
- gas used: `132014`
- actual fee: `0.002838301 native USDC`

Exact on-chain event:
- policy: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch: `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- commitment: `0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17`

Post-state:
- authority pending nonce = 13;
- v2 active batch equals the committed batch;
- v2 batch state = Committed;
- v2 total funded remains 0.010 native USDC;
- v1 remains Committed and unchanged;
- vault liability/custody/balance remains 0.020 native USDC;
- total value released remains zero.

Evidence: `docs/evidence/RECOVERY-POLICY-V2-PRECOMMIT.md`.

The one-shot `commitBatch` authorization is **CONSUMED**.

Next gate: secret-bound provider real-work preparation and provider typed-data signature readiness. No provider signature, output lock, reveal or resolve is authorized by this receipt.


## Recovery Policy v2 provider real work — 2026-10-03

Workflow `37128770177` completed successfully on exact head `5a19875e223d465a17e532f65b4082aeb3f915fe`.

It consumed the protected v2 reveal packet only in the GitHub-hosted runner temp directory, validated it against the live committed batch, executed the real provider compute path with fault mode NONE, confirmed the hidden workId is still unused, and confirmed the provider's actual output matches the hidden expected output.

No provider signature was created and no transaction was sent. Sensitive temp material was destroyed and no secret-bearing artifact was uploaded.

Evidence: `docs/evidence/RECOVERY-POLICY-V2-PROVIDER-REAL-WORK.md`.

Next gate: prepare the exact public EIP-712 typed data for the provider wallet. Provider signature remains NOT AUTHORIZED until a separate explicit human authorization.


## Recovery Policy v2 provider signature readiness — 2026-10-03

Workflow `37129028790` completed successfully on exact head `c5ce231493d5ea450d0ef667c1afcb3c2af92722`.

It reran the real provider compute from the protected reveal packet, built the exact public EIP-712 ProviderOutput payload, and cross-checked the typed-data digest against the live contract's `providerOutputDigest(...)`.

Exact provider digest:
`0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`.

No provider signature was created and no transaction was sent. The public artifact excludes input_text, expected output, salt, canary key, and canonical output.

Next gate: one exact provider-wallet EIP-712 signature. It remains NOT AUTHORIZED pending a separate explicit human authorization. That signature will not itself authorize `lockProviderOutput`.


## Recovery Policy v2 provider signature + lock preflight — 2026-10-03

The separately authorized provider-signature retry succeeded and returned usable signature bytes for digest `0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`. Local recovery returned the exact provider `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`. No transaction was sent.

Read-only `lockProviderOutput` preflight run `37142060883` on exact head `54e10212859650766d91de01d7571064b47b8ae2` passed:
- live contract recovery returned the exact provider;
- digest remains unconsumed;
- batch remains Committed;
- workId remains unused;
- exact eth_call returns the authorized digest;
- pending funder nonce = 13;
- calldata hash = `0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b`;
- gas estimate = 220294;
- no vault principal moved.

Next gate: exact `lockProviderOutput` transaction, pending separate explicit human authorization. Reveal and resolve remain NOT AUTHORIZED.


## Recovery Policy v2 lockProviderOutput live receipt — 2026-10-03

The exact authorized output-lock transaction succeeded on Arc Mainnet:

- tx: `0x7de28364a63875b38f58649d8b85629422e8c5f2cebb29626e39ad157611ae78`
- block: `24099169`
- nonce: `13`
- value: `0`
- calldata hash: `0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b`
- gas used: `213863`
- actual fee: `0.0045980545 native USDC`

Independent receipt verification run `37147983918` passed on head `5fbd36138e488cb9460aa80ba9224d7506f8442b`.

Both `ProviderOutputConsumed` and `ProviderOutputLocked` were observed with the exact provider/work/policy/batch/input/output/scorer/digest binding.

Post-state:
- authority pending nonce = 14;
- v2 batch = OutputLocked;
- workId consumed = true;
- provider digest consumed = true;
- v2 funding remains 0.010 native USDC;
- v1 remains Committed and unchanged;
- vault liability/custody/balance remains 0.020 native USDC;
- total value released remains zero.

The one-shot `lockProviderOutput` authorization is consumed.

Next gate: secret-bound `revealCanary` read-only preflight. The reveal transaction itself and `resolveBatch` remain NOT AUTHORIZED.


## Recovery Policy v2 revealCanary preflight — 2026-10-03

Secret-bound read-only reveal preflight run `37148410230` succeeded on exact head `e6416429ed4d5630f36fcf88d519a3d6b0c7cd49`.

The protected reveal packet reconstructed the committed canary exactly while the live batch remained OutputLocked. The canary key is unused. Exact reveal `eth_call` and gas estimation passed.

Public binding:
- pending funder nonce = 14;
- calldata hash = `0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031`;
- returned canary key = `0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574`;
- gas estimate = 124601;
- tx value = 0.

The salt and raw reveal calldata were not logged or retained, and runner temp secret material was destroyed.

Next gate remains the actual reveal transaction. Before it can be signed with MetaMask, establish a secure one-time reveal bridge so the hidden salt can reach the browser without appearing in GitHub, chat, logs, or repo. The reveal transaction itself and resolve remain NOT AUTHORIZED.


## Recovery Policy v2 reveal bridge local precheck — 2026-10-03

The encrypted reveal bridge was successfully decrypted in the same browser that generated the ephemeral private key.

The local browser independently confirmed:
- funder sender exact;
- pending nonce = 14;
- v2 batch = OutputLocked;
- reveal preimage reconstructs the committed canary;
- canary key = `0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574`;
- canary key remains unused;
- exact reveal calldata hash = `0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031`;
- gas estimate = 124601;
- secret values were not printed;
- no transaction was sent.

The secure reveal bridge requirement is now satisfied.

Next gate: exact `revealCanary` transaction, pending separate explicit human authorization. `resolveBatch` remains NOT AUTHORIZED.


## Recovery Policy v2 revealCanary live receipt — 2026-10-03

The exact authorized reveal transaction succeeded on Arc Mainnet:

- tx: `0xddbeb788ab6e643523f8a7ea3d456c35309cfaf9638ccf1e5d9ea044a2c054b2`
- block: `24104229`
- nonce: `14`
- value: `0`
- calldata hash: `0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031`
- gas used: `119296`
- actual fee: `0.002564864 native USDC`

Independent verification run `37150611570` passed on head `0047a1d8e2fd3b00477fe8ba665bf74c65db48b3`.

The exact `CanaryRevealed` event was observed, the on-chain reveal preimage reconstructs the committed canary, the canary key is consumed, and the batch is now Revealed.

Critically, the locked provider output equals the revealed expected output, so the deterministic PASS condition is now true.

Vault principal remains unchanged before settlement:
- total liability/custody/balance = 0.020 native USDC;
- total released = 0;
- v2 paid out = 0.

The one-shot reveal authorization is consumed.

Next gate: read-only `resolveBatch` preflight. The settlement transaction remains NOT AUTHORIZED.


## Recovery Policy v2 resolveBatch preflight — 2026-10-03

Read-only resolve preflight run `37150934605` succeeded on exact head `abf027239cfca539a9aa297cfb2a65db772aeeab`.

The batch remains Revealed and the deterministic comparison is true. Exact `eth_call` returned `PAY`.

Expected live consequence if separately authorized and successfully broadcast:
- payout recipient `0x6B8ad09233dF44eD57B99aF8839129303955590C`;
- release exactly 0.002 native USDC;
- v2 protected remainder 0.008 native USDC;
- v2 batch -> Resolved;
- active batch -> zero;
- global liability -> 0.018 native USDC;
- total value released -> 0.002 native USDC;
- vault balance -> 0.018 native USDC.

Exact candidate calldata hash:
`0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320`.

Pending funder nonce = 15. Gas estimate = 178343.

The settlement transaction remains NOT AUTHORIZED pending a separate explicit human authorization.
