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

**G0 — PRD_READY**

This workstream establishes:

- `product/PRD.md`
- `docs/internal/CANONICAL-STATE.yaml`
- `docs/internal/HANDOVER.md`
- `docs/internal/WORKSPLIT.md`
- contribution rules

No consequential product build should be treated as promoted until G0 is merged/reviewed.

## 5. Immediate blocker

Faadil has already sent Opeyemi (`opeblow`) a collaborator invitation with the intended write access.

Current status:

- collaborator invitation: **INVITE_PENDING**
- next action: **Opeyemi accepts the existing GitHub invitation**
- after acceptance, verify that `opeblow` can push a branch/open a PR and request him on PR #1.

No new invitation is required unless the existing one expires or is declined.

## 6. Next gate

**G1 — T0_MAINNET_CUSTODY**

Owner: Opeyemi.

Before UI work, prove with a minimal contract on Arc mainnet:

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
