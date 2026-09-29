# Integrated Chain Verifier v3

**Status:** PRODUCED / REVALIDATION_REQUIRED

This verifier targets `AssuranceVault`, where assurance and custody live in the same contract.

## PASS proof

The verifier requires:

- cryptographically valid signed provider output;
- commitment/reveal reconstruction;
- deterministic PASS;
- exactly one `PaymentReleased`;
- no `PaymentWithheld`;
- no breaker event;
- `BatchResolved(PAY)` and `PaymentReleased` in the same successful Arc transaction;
- `PaymentReleased.amount == policy.unitPayout`;
- immutable payout recipient match.

## FAIL proof

For `WITHHOLD`:

- deterministic FAIL;
- exactly zero `PaymentReleased` for the batch/work;
- exactly one `PaymentWithheld`;
- resolve + withheld event in the same successful Arc transaction;
- failure count remains below breaker threshold.

## BREAKER proof

For `BREAKER`:

- deterministic FAIL;
- zero `PaymentReleased`;
- `PaymentWithheld`;
- `CircuitBreakerTriggered`;
- resolve/withheld/breaker are ordered in the same transaction;
- threshold matches the immutable policy;
- one later `ProtectedRemainderRefunded`;
- one `PolicyClosed`;
- refund amount equals the breaker-protected remainder;
- refund goes to the immutable funder;
- final closed-policy accounting conserves value:

```text
totalFunded = totalPaidOut + totalRefunded
```

## Runtime/commit boundary

v3 hashes the deployed runtime bytecode.

Even a matching expected code hash does not by itself prove Git provenance.

G6 still requires reproducible:

```text
exact Git SHA
→ deterministic build
→ deployed runtime bytecode
→ same on-chain code hash
```

## Claim vocabulary

Before live execution:

```text
INTEGRATED VERIFIER SOURCE = PRODUCED
```

After a valid live Arc run but before reproducible commit binding:

```text
INTEGRATED_ASSURANCE_CHAIN_PROOF_VALID
Runtime/Commit Binding = PARTIAL/BLOCKED
```

Do not promote the entire project to LIVE merely because one scenario passes. Success, negative, breaker and recovery scenarios all remain required.
