# T0 Mainnet Custody Evidence

**Evidence class:** PARTIAL_LIVE
**Gate:** G1 / T0_MAINNET_CUSTODY
**Branch:** `feat/t0-mainnet-custody`
**Contract:** `src/PolicyCustody.sol`

Do not fill this file with simulated hashes or placeholder explorer links and then call the gate proven.

## Build identity

- Git commit: **CURRENT HEAD MUST BE FILLED AFTER REVALIDATION**
- Arc Foundry version: `1.7.1-dev` (commit `d497beea7096ff2a8e583c8b307941f24a61b06b`)
- Solidity compiler: `0.8.24`
- forge-std: `v1.9.6` (not vendored; `lib/` is gitignored)
- RPC endpoint used: `https://rpc.mainnet.arc.io`
- Chain ID observed: `5042`
- UTC/local execution time: _(fill)_

## Local test record (LOCAL evidence, does not satisfy the gate)

```
arc-forge 1.7.1-dev, solc 0.8.24
35 passed; 0 failed
```

Recorded by Opeyemi at commit `18bf5d6`. **Superseded for promotion purposes by later audit fixes. Re-run Arc Foundry against the exact current head before any mainnet action.**

## Addresses

- Human-controlled deployer/authority: `0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`
- T0 contract: `0x0377D371d6981c98CE9C650338D7E1E80819B572`
- Payout recipient: `0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`
- Policy id: `0x4152435f4153535552414e43455f30313a54303a504f4c4943593a3100000000`

## Chosen bounded amounts

Hard ceiling enforced by the driver: `0.05` native USDC = `50000000000000000` wei.

- Funding amount (native 18-decimal units): `10000000000000000` — configured, not yet sent
- Funding amount (USDC display): **0.010 USDC — NOT YET EXECUTED**
- Payout amount: **0.001 USDC — NOT YET EXECUTED**
- Expected refund remainder: **0.009 USDC — NOT YET EXECUTED**
- Deployment spend cap (immutable): `50000000000000000`

## Preflight (read-only)

- Chain id check:
- USDC interface has code:
- USDC `decimals()` == 6:
- Authority matches broadcaster:
- Amounts within cap:

## Deployment

- Tx hash: `0x7363a99abfe7293ccd2b47cf6e8df41d135ad0db0a39b6745b753082ead47f24`
- Contract: `0x0377D371d6981c98CE9C650338D7E1E80819B572`
- Receipt status: **SUCCESS / LIVE ARC**
- Verification: GitHub Actions run `36975671614`
- Contract code read back: **PROVEN**
- Executable runtime/source binding: **PROVEN**
- `authority()`: dedicated T0 wallet — **PROVEN**
- `expectedChainId()`: `5042` — **PROVEN**
- `usdcErc20Interface()`: `0x3600000000000000000000000000000000000000` — **PROVEN**
- `deploymentSpendCap()`: `50000000000000000` — **PROVEN**

## Policy registration

- Tx hash: `0x2ed1083c31dda72dc8b9934c44ab617adebcce1e9223e9d4f4162ff9371db9d7`
- Verification: GitHub Actions run `36976421698`
- `PolicyCreated` event: **PROVEN; matches locked config**
- `policyCount()`: `1`
- `policyExists(policyId)`: `true`
- `stateOf(policyId)`: `0 / Created`
- `remainingFor(policyId)`: `0`
- `totalLiability()`: `0`
- `totalCustodyReceived()`: `0`
- `totalValueReleased()`: `0`
- `PolicyStateChanged` emitted: none expected at creation; `PolicyCreated` is the creation record

## Funding

- Tx hash:
- Explorer:
- Block / log index:
- `PolicyFunded` event:
- Contract balance before:
- Contract balance after:
- `totalCustodyReceived()` after:
- `totalLiability()` after:

## Payout

- Tx hash:
- Explorer:
- Block / log index:
- `PaymentReleased` event:
- Recipient balance before:
- Recipient balance after:
- Contract balance before:
- Contract balance after:
- `totalValueReleased()` after:
- `totalLiability()` after:

## Refund

- Tx hash:
- Explorer:
- Block / log index:
- `RemainingFundsRefunded` event:
- `PolicyRefunded` event:
- Contract balance after:
- `totalLiability()` after:
- Funder balance delta (gas accounted separately):

## Completion

- Tx hash:
- `PolicyCompleted` event:
- Final state: _(expected 4 = Completed)_

## Final snapshot

Paste the decoded `snapshot(policyId)` result.

## Accounting reconciliation

- `totalFunded == totalPaidOut + totalRefunded` for the policy:
- `totalLiability() == 0` across all policies:
- `unattributedValue() == 0`:
- `custodyBalance == 0`:

## Independent verification

- Reviewer:
- Verification command(s):
- Result:

## Truth boundary

### OBSERVED

- Real Arc deployment is proven.
- Deployed executable runtime is bound to the canonical source build.
- Exactly one T0 policy is registered with the locked configuration.
- No contract custody has occurred yet; all custody/payout/refund/completion claims remain unproven.

### INFERRED

- If receipts and balances reconcile, T0 proves the Arc-native custody/payout/refund primitive for this exact contract and commit.
- Per-policy liability isolation means the pooled native balance does not let one policy consume another's value.

### UNKNOWN / NOT PROVEN BY T0

- Hidden canary precommitment.
- Provider output signing (EIP-712).
- Deterministic pass/fail scoring.
- Fail -> no-pay.
- Circuit breaker.
- Full live product integration.
- External-user adoption.
- Arc mainnet gas cost for the lifecycle.


## Audit/revalidation note — 2026-09-29

Commit `18bf5d6` remains valid evidence for Opeyemi's local 35/35 run, but it is **not** the final demonstrated commit.

Current-head changes include:

- expiry cancellation/refund recovery;
- explicit signer binding;
- corrected preflight amount logic;
- two-stage deploy/execute flow;
- removal of deploy-on-verification-failure retry;
- truthful unknown-policy views;
- corrected policy-cap semantics.

Do not promote this gate until the current head is recompiled/tested with Arc Foundry and then bound to the mainnet receipts.
