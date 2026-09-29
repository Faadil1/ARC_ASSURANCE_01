# T0 Mainnet Custody Evidence

**Evidence class:** NOT_IMPLEMENTED
**Gate:** G1 / T0_MAINNET_CUSTODY
**Branch:** `feat/t0-mainnet-custody`
**Contract:** `src/PolicyCustody.sol`

Do not fill this file with simulated hashes or placeholder explorer links and then call the gate proven.

## Build identity

- Git commit: _(fill after commit is pushed)_
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

Recorded 2026-09-29 against the working tree. Re-record against the exact pushed commit.

## Addresses

- Human-controlled deployer/authority:
- T0 contract:
- Payout recipient:
- Policy id:

## Chosen bounded amounts

Hard ceiling enforced by the driver: `0.05` native USDC = `50000000000000000` wei.

- Funding amount (native 18-decimal units):
- Funding amount (USDC display):
- Payout amount:
- Expected refund remainder:
- Deployment spend cap (immutable): `50000000000000000`

## Preflight (read-only)

- Chain id check:
- USDC interface has code:
- USDC `decimals()` == 6:
- Authority matches broadcaster:
- Amounts within cap:

## Deployment

- Tx hash:
- Explorer:
- Block:
- Receipt status:
- Contract code read back:
- `authority()`:
- `expectedChainId()`:
- `usdcErc20Interface()`:
- `deploymentSpendCap()`:

## Policy registration

- `PolicyCreated` event:
- `PolicyStateChanged` emitted: _(expected: none — `PolicyCreated` is the record of entry into `State.Created`)_

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

_To be populated only after the real mainnet run._

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
