# Recovery Policy v2 — Read-Only Readiness

## Purpose

Continue the live Arc assurance demonstration without modifying or falsely reopening the stranded v1 batch whose hidden preimage was lost.

## Strategy

The existing AssuranceVault supports multiple independent policies. Recovery v2 therefore creates a fresh policy on the same deployed contract while leaving v1 untouched until its contractual expiry recovery path is available.

Planned v2 parameters:

- same authority/funder;
- same provider signer;
- same payout recipient;
- same deterministic scorer;
- max failures: 2;
- policy max spend cap: 0.020 native USDC;
- initial funding: 0.010 native USDC;
- unit payout: 0.002 native USDC;
- expiry: 2026-10-20T03:00:00Z;
- policy ID derived deterministically from the public seed in `ops/recovery-policy-v2.json`.

## Required v1 continuity

The preflight fails closed unless Arc still shows:

- policy count = 1;
- total custody received = 0.010;
- total liability = 0.010;
- total released = 0;
- vault balance = 0.010;
- v1 active batch = the proven G2 batch;
- v1 batch state = Committed;
- v1 commitment = the proven G2 commitment.

## v2 budget boundary

The deployed contract cap is 0.050 native USDC.

If the new policy is later funded with 0.010, projected cumulative custody becomes 0.020, leaving 0.030 of deployment capacity.

This document and its workflow authorize **no transaction**.

## Required sequence after a green preflight

1. human review of exact v2 policy ID / calldata / gas;
2. separate explicit one-shot authorization for `createPolicy`;
3. live receipt verification;
4. separate funding preflight and separate funding authorization;
5. generate a brand-new hidden canary only after v2 funding;
6. store its reveal packet directly in a protected GitHub Environment secret;
7. continue commit -> real work -> signed output lock -> reveal -> resolve with separate gates.

The stranded v1 policy remains untouched until expiry recovery.
