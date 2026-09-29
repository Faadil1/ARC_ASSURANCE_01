# Scorer → Provider → Contract Integration Plan

This document defines the next integration seam without prematurely merging T0 custody and the assurance state machine.

## Shared identifiers

The live path needs these stable identifiers before provider execution:

- `policyId`
- `batchId`
- `workId`
- `scorerIdHash`
- `nonce`
- `deadline`

The provider never chooses `policyId`, `batchId`, or `workId`.

## Work path

```text
1. ASSURANCE CONTRACT / ORCHESTRATOR
   creates policy + provider identity

2. CANARY PRECOMMIT
   binds hidden expectedOutputHash + scorerIdHash + salt

3. PROVIDER HTTP
   receives real input + public binding ids

4. PROVIDER COMPUTE
   produces invoice-v1 structured result

5. CANONICAL SCORER SERIALIZER
   produces canonical output string

6. PROVIDER EIP-712 SIGNER
   signs:
   provider
   policyId
   batchId
   workId
   inputHash
   outputHash
   scorerIdHash
   nonce
   deadline
   under Arc 5042 + verifying contract domain

7. CONTRACT OUTPUT LOCK
   verifies signer + digest
   consumes digest
   binds outputHash to workId

8. CANARY REVEAL
   proves precommit + exposes expectedOutputHash/scorerIdHash

9. DETERMINISTIC VERDICT
   outputHash == expectedOutputHash ? PASS : FAIL

10. FINANCIAL CONSEQUENCE
   PASS -> configured payout
   FAIL -> no payout + failure count
   threshold -> circuit breaker / protected remainder
```

## Required contract invariants

The future assurance contract must enforce all of these independently of the provider service:

- expected provider address is policy-bound;
- a `workId` cannot be resolved twice;
- output lock happens before canary reveal;
- exact signed digest cannot be consumed twice;
- expired provider signatures cannot be locked;
- scorer ID used at reveal matches the precommit;
- PASS requires exact hash equality for invoice-v1;
- FAIL cannot pay;
- malformed/unsigned provider output cannot enter the objective PASS/FAIL path;
- circuit-breaker consequence cannot be bypassed by a later duplicate output.

## Cross-language golden vector

Before contract integration is promoted, produce one canonical vector containing:

- domain;
- typed-data message;
- canonical input bytes;
- canonical output bytes;
- `inputHash`;
- `outputHash`;
- `scorerIdHash`;
- struct hash;
- domain separator;
- final EIP-712 digest;
- provider address;
- signature;
- Solidity recovered address.

JavaScript and Solidity MUST produce the same final digest.

A mismatch is a blocker, not a formatting issue.

## T0 relationship

T0 remains separate:

```text
T0: custody primitive
EIP-712: provider attribution/integrity primitive
scorer: deterministic verdict primitive
```

Only after each primitive is verified do we compose:

```text
custody + precommit + signed output + reveal + deterministic verdict
→ financial causality
```

This preserves Technical Proof != Live Product Integration.
