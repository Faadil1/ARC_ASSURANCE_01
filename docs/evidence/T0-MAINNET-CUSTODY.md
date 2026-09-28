# T0 Mainnet Custody Evidence

**Evidence class:** NOT_IMPLEMENTED  
**Gate:** G1 / T0_MAINNET_CUSTODY  
**Branch:** `feat/t0-mainnet-custody`

Do not fill this file with simulated hashes or placeholder explorer links and then call the gate proven.

## Build identity

- Git commit:
- Arc Foundry version:
- Solidity compiler:
- RPC endpoint used:
- Chain ID observed:
- UTC/local execution time:

## Addresses

- Human-controlled deployer/owner:
- T0 contract:
- Payout recipient:

## Chosen bounded amounts

- Funding amount (native 18-decimal units):
- Funding amount (USDC display):
- Payout amount:
- Expected refund remainder:

## Deployment

- Tx hash:
- Explorer:
- Block:
- Receipt status:
- Contract code verified/read back:

## Funding

- Tx hash:
- Explorer:
- Block / log index:
- `Funded` event:
- Contract balance before:
- Contract balance after:

## Payout

- Tx hash:
- Explorer:
- Block / log index:
- `Paid` event:
- Recipient balance before:
- Recipient balance after:
- Contract balance before:
- Contract balance after:

## Refund

- Tx hash:
- Explorer:
- Block / log index:
- `Refunded` event:
- `Closed` event:
- Contract balance after:
- Owner balance delta (gas accounted separately):

## Snapshot

Paste the decoded `snapshot()` result after the final run.

## Independent verification

- Reviewer:
- Verification command(s):
- Result:

## Truth boundary

### OBSERVED

_To be populated only after the real mainnet run._

### INFERRED

- If receipts and balances reconcile, T0 proves the Arc-native custody/payout/refund primitive for this exact contract/commit.

### UNKNOWN / NOT PROVEN BY T0

- Hidden canary precommitment.
- Provider output signing.
- Deterministic pass/fail.
- Fail → no-pay.
- Circuit breaker.
- Full live product integration.
- External-user adoption.
