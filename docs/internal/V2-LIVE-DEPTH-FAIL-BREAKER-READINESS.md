# Recovery Policy v2 — Live Depth FAIL / BREAKER Readiness

**Status:** READ_ONLY_READINESS  
**Parent:** merged PR #47 / `41b704176a608dd47790e46c4de4098b9adaeb7f`

## Why this is the next gate

The v2 success path is already proven end-to-end, including a real `PAY` consequence.

The remaining product-depth gap is the representative negative/recovery path:

1. controlled real provider failure;
2. deterministic `WITHHOLD` with zero provider payout;
3. a second controlled failure;
4. deterministic `BREAKER` with circuit breaker event;
5. refund of the protected remainder to the immutable funder.

This uses the existing v2 policy rather than introducing a third policy.

## Current v2 economics expected before any new action

- funded: `0.010 native USDC`
- already paid: `0.002 native USDC`
- protected remainder: `0.008 native USDC`
- failure count: `0`
- max failures: `2`
- active batch: zero
- paused: false
- expiry: `2026-10-20T03:00:00Z`

A failed batch does not release value. Therefore:

- FAIL #1 -> `WITHHOLD`, failureCount = 1, remainder remains `0.008`;
- FAIL #2 -> `BREAKER`, failureCount = 2, policy paused, remainder remains `0.008`;
- after BREAKER, `refundProtectedRemainder` is eligible because the policy is paused and activeBatch is zero;
- refund target is the immutable v2 funder.

## Controlled-fault truth boundary

The negative path must be narrated as a **controlled degraded-provider scenario**, not as an organic external provider failure.

The preferred provider fault remains a structurally valid but incorrect output (for example `WRONG_AMOUNT_VALID`) so the provider still performs real work and produces a valid signed result whose output hash deliberately differs from the hidden expected output.

## Protected actions

None are authorized by this readiness document.

Every future `commitBatch`, provider signature, `lockProviderOutput`, `revealCanary`, `resolveBatch`, and final `refundProtectedRemainder` remains separately gated with fresh preflight and explicit human authorization.

The original v1 expiry recovery remains separate.
