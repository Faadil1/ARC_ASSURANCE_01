# Assurance Core v1 — Hidden Canary State Machine

**Status:** PRODUCED / REVALIDATION_REQUIRED  
**Branch:** `feat/assurance-core-v1`

This module implements the non-custodial causal ordering required before financial integration:

```text
HIDDEN PRECOMMIT
→ SIGNED OUTPUT LOCK
→ CANARY REVEAL
→ DETERMINISTIC RESOLVE
→ SETTLEMENT DIRECTIVE
```

It deliberately does **not** move USDC.

## 1. Why finance is still separate

The output of this module is one of:

- `PAY`
- `WITHHOLD`
- `BREAKER`

Those are settlement directives, not receipts.

Until the real Arc custody layer consumes the directive and real USDC moves or remains protected:

```text
Financial Causality = BLOCKED
Real Consequence = BLOCKED
Live Core Loop = BLOCKED
```

## 2. Policy

A policy binds:

- principal;
- provider EOA;
- scorer ID hash;
- maximum cumulative failures;
- current failure count;
- paused/breaker state;
- at most one unresolved batch.

V1 allows only one unresolved batch per policy.

This prevents a principal from precommitting many future batches and continuing to resolve them after the breaker should have stopped new work.

## 3. Hidden commitment

The chain sees only an opaque `bytes32 commitment` before work.

The reveal material is:

- `policyId`
- `batchId`
- `workId`
- `inputHash`
- `expectedOutputHash`
- `scorerIdHash`
- `salt`

The commitment is domain-separated by:

- chain ID;
- exact verifying contract address.

Exact type string:

```text
CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)
```

Hash:

```text
keccak256(
  abi.encode(
    TYPEHASH,
    chainId,
    verifyingContract,
    policyId,
    batchId,
    workId,
    inputHash,
    expectedOutputHash,
    scorerIdHash,
    salt
  )
)
```

## 4. Output lock

`lockProviderOutput()` accepts the EIP-712 `ProviderOutput` from the provider binding layer.

It verifies:

- policy exists;
- policy is not paused;
- batch is the active committed batch;
- scorer ID matches policy;
- work ID has never been locked before;
- declared provider matches policy provider;
- EIP-712 signature is valid;
- deadline is valid;
- exact digest has not been consumed.

The contract stores only the signed output facts required for later reveal/resolve.

## 5. Reveal

Reveal is principal-only.

It requires that provider output was already locked.

It checks:

- revealed work ID == signed locked work ID;
- revealed input hash == signed locked input hash;
- scorer is policy-bound;
- recomputed commitment == precommit.

A wrong salt or rewritten expected answer fails the reveal.

## 6. One-time canary rule

After successful reveal, v1 computes:

```text
canaryKey = keccak256(
  abi.encode(
    inputHash,
    expectedOutputHash,
    scorerIdHash
  )
)
```

The same canary key cannot be revealed again, even with a different salt or work ID.

This is the enforceable v1 definition of “revealed canary is never reused.”

## 7. Deterministic resolve

For the invoice-v1 exact-match scorer:

```text
PASS = signed outputHash == revealed expectedOutputHash
```

No LLM evaluator participates.

Result:

```text
PASS
→ directive PAY

FAIL below threshold
→ failureCount += 1
→ directive WITHHOLD

FAIL reaching threshold
→ failureCount += 1
→ policy paused
→ directive BREAKER
```

The failure threshold is cumulative in v1, not consecutive.

## 8. Important truth boundary

`PAY` means:

> The assurance state machine deterministically authorized the payout path.

It does **not** mean:

> USDC was paid.

Likewise `WITHHOLD` is a directive until the custody layer proves that money that otherwise could have moved did not move.

## 9. Files

- `src/assurance/AssuranceCoreV1.sol`
- `src/canary/commitment-v1.mjs`
- `test/assurance/AssuranceCoreV1.t.sol`
- `test/canary/commitment-v1.test.mjs`

## 10. Required verification before promotion

1. Install pinned Viem dependency.
2. Install Foundry dependencies:
   - forge-std v1.16.1
   - OpenZeppelin Contracts v5.6.1
3. Run JS commitment/signing/provider tests.
4. Run Arc Foundry assurance/EIP-712 tests.
5. Produce a JS/Solidity cross-language commitment vector.
6. Produce the previously required EIP-712 golden vector.
7. Opeyemi reviews the state-machine/settlement seam after T0 is green.
8. Integrate with real custody only after both T0 and this core are verified.

Recommended clean-room dependency commands:

```bash
npm install
forge install foundry-rs/forge-std@v1.16.1
forge install OpenZeppelin/openzeppelin-contracts@v5.6.1
npm run test:all-js
arc-forge test --match-path 'test/eip712/*.t.sol' -vv
arc-forge test --match-path 'test/assurance/*.t.sol' -vv
```

No dependency installation result is claimed until those commands are actually executed on the exact branch head.

## 11. Next composition

After verification:

```text
T0 CUSTODY
+
ASSURANCE CORE
+
EIP-712 PROVIDER OUTPUT
+
CANONICAL SCORER
=
candidate integrated assurance contract
```

That integrated contract must still pass live Arc mainnet success, failure, breaker and recovery scenarios before any product-level LIVE claim.
