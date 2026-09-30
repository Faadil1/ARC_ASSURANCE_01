# Gas Unit Evidence Manifest

**Status:** exact-head local rehearsal evidence  
**Scope:** hardened `AssuranceVault`

This layer converts the Foundry gas report into a machine-readable evidence file.

## Why

Raw workflow logs are useful but fragile. The promotion pipeline needs explicit, parseable values tied to the exact contract and exact head.

The parser accepts only the table headed:

```text
src/assurance/AssuranceVault.sol:AssuranceVault Contract
```

and fails if required lifecycle functions are absent.

## Required max-gas observations

The current exact-head rehearsal is expected to expose maxima for:

- `createPolicy`
- `fund`
- `commitBatch`
- `lockProviderOutput`
- `revealCanary`
- `resolveBatch`
- `refundProtectedRemainder`

The manifest also retains every parsed function maximum for auditability.

## Lifecycle aggregation

PASS-first-batch planning sum:

```text
createPolicy
+ fund
+ commitBatch
+ lockProviderOutput
+ revealCanary
+ resolveBatch
```

Canonical full hero planning sum:

```text
createPolicy
+ fund
+ 3 × (
    commitBatch
  + lockProviderOutput
  + revealCanary
  + resolveBatch
  )
+ refundProtectedRemainder
```

This models:

1. PASS;
2. FAIL/WITHHOLD;
3. FAIL/BREAKER;
4. protected remainder refund.

The manifest uses the **maximum observed gas for each function**, not average gas and not whole-test gas.

Safety multipliers are intentionally applied later by the read-only gas-budget gate.

## Deployment gas boundary

Foundry's gas report currently reports zero deployment cost for `AssuranceVault`.

That value is explicitly rejected.

```text
deploy_gas_units = null
deploy_status = BLOCKED_REPORTED_ZERO_NOT_ACCEPTED
```

Deployment gas requires exact init-code `eth_estimateGas` or another explicitly approved deployment rehearsal.

## Evidence class

```text
LOCAL_EXACT_HEAD_REHEARSAL
```

It is not:

- an Arc mainnet receipt;
- a permanent fee quote;
- a live deployment estimate;
- funding authorization.

It is a bounded execution-gas planning input for the next gas-budget gate.
