# Pre-Mainnet Deployment Package

**Status:** PREPARED / HUMAN ACTION BLOCKED  
**Scope:** T0 first, integrated AssuranceVault second.

This package intentionally stops before secrets, funding, signing or broadcasting.

## Fixed bounded-value plan

The user-selected wallet ceiling is:

```text
dedicated wallet top-up ceiling = 5.00 USDC
```

This is **not** the contract spend.

The canonical first T0 movement remains:

```text
contract funding  = 0.010 USDC
configured payout = 0.002 USDC
expected refund   = 0.008 USDC
contract hard cap = 0.050 USDC
```

Raw Arc native-USDC units:

```text
fund   = 10000000000000000
payout =  2000000000000000
refund =  8000000000000000
cap    = 50000000000000000
```

The rest of the dedicated wallet balance exists only as bounded gas/operational headroom and must not be treated as an agent budget.

## Wallet topology

### T0

Use:

- one dedicated **authority/funder wallet** controlled by Faadil;
- one separate **payout recipient EOA** for visible transfer evidence.

For the protected T0 driver:

```text
authority == funder
payoutRecipient != funder
```

No private key is stored in GitHub, CI, docs, issue comments, email or chat.

### Integrated AssuranceVault

Initial bounded live proof:

- authority/funder may remain the same dedicated operator wallet;
- provider signer must be a separate key/address;
- payout recipient should remain a distinct address;
- provider signer should hold no application funds.

Long-term role separation can be expanded after the live proof.

## Execution order

### Gate P0 — source and supply-chain proof

Required:

- T0 exact-head Arc Foundry build/test green;
- Arc Foundry release checksum pinned;
- forge-std commit pinned;
- integrated source clean-room proof green;
- deployment package CI green.

### Gate P1 — public-address configuration

Copy:

`ops/pre-mainnet-parameters.template.json`

to:

`ops/pre-mainnet-parameters.local.json`

The local file is gitignored.

Populate public addresses and policy IDs only.

Then run:

```bash
npm run premainnet:check -- ops/pre-mainnet-parameters.local.json
```

This command consumes **no private key**, signs nothing and broadcasts nothing.

### Gate P2 — read-only gas estimate

Before wallet funding or broadcast:

- estimate deployment gas;
- estimate T0 fund/payout/refund/complete gas;
- record gas price and estimated native-USDC cost;
- confirm the 5 USDC wallet ceiling is sufficient with margin.

If it is not sufficient:

```text
STOP
→ do not increase automatically
→ return for explicit human approval
```

### Gate P3 — human funding

Only Faadil performs this action.

Conditions:

- dedicated wallet address reviewed;
- payout recipient reviewed;
- gas estimate reviewed;
- wallet currently contains no unrelated assets;
- funding amount is at or below 5 USDC;
- no private key is shared.

Result:

`READY_FOR_T0_DEPLOY`

### Gate P4 — T0 deploy

Protected human action:

```text
preflight
→ explicit confirm
→ deploy only
→ inspect Arc explorer
→ bind T0_CONTRACT_ADDRESS
```

No same-command automatic transition into value movement.

### Gate P5 — T0 value path

Second explicit human authorization:

```text
fund 0.010
→ payout 0.002
→ refund 0.008
→ complete
→ capture receipts
```

Only then may G1 be evaluated for PROVEN.

### Gate P6 — integrated deployment

Do not execute merely because T0 succeeds.

First reconcile the exact production constructor values with the reproducible deployment manifest, then:

```text
approved Git SHA
→ init-code hash
→ deploy tx input
→ receipt
→ runtime hash
→ PASS / FAIL / BREAKER / refund
→ verifier v3
```

## Stop conditions

Stop immediately if any of these occur:

- chain ID is not 5042;
- Arc USDC interface differs;
- binary checksum differs;
- exact-head CI is not green;
- authority/funder mismatch for protected T0;
- payout recipient equals funder;
- configured value exceeds caps;
- gas estimate would exceed the approved wallet ceiling;
- deployment tx input does not match approved init-code;
- deployed runtime does not match the approved evidence chain;
- any secret appears in logs or repository;
- unexpected contract state is observed.

## Current truth state

```text
package source              = PRODUCED
5 USDC wallet ceiling       = DECIDED
real wallet address         = NOT PROVIDED
real payout recipient       = NOT PROVIDED
real provider signer        = NOT PROVIDED
gas estimate                = NOT MEASURED
wallet funded               = NO
mainnet signing             = NO
mainnet broadcast           = NO
funds moved                 = NO
```

Therefore the package is prepared, but human funding remains BLOCKED.
