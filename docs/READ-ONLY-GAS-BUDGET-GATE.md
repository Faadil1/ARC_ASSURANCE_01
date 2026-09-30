# Read-Only Gas Budget Gate

**Branch:** `ops/read-only-gas-budget-gate`  
**Status:** PRODUCED / REAL PUBLIC INPUTS REQUIRED

This gate exists immediately before any human wallet funding or protected mainnet authorization.

It consumes no private key, signs nothing, broadcasts nothing and moves no funds.

## Purpose

The user-selected wallet ceiling is:

```text
5.00 native USDC
```

The gate answers two separate questions:

1. What is Arc mainnet's current gas-price observation?
2. Given verified gas-unit inputs, is the bounded wallet ceiling sufficient for gas plus the peak principal outflow?

## Fee snapshot

```bash
npm run gas:fee-snapshot
```

or:

```bash
node script/read-only-gas-budget.mjs fee-snapshot
```

This checks chain ID 5042 and records:

- Arc block number;
- observed gas price;
- no account secret.

The result is **time-bound**. It is not a permanent gas guarantee.

## Wallet-budget mode

```bash
node script/read-only-gas-budget.mjs \
  wallet-budget \
  ops/pre-mainnet-parameters.local.json
```

Required public inputs:

- authority/funder public wallet address;
- wallet top-up ceiling;
- verified deployment gas units;
- verified lifecycle execution gas units.

The gate then calculates:

```text
safeGasUnits =
  (deployGas + executionGas)
  × gasUnitsSafetyMultiplier

safeGasPrice =
  observedGasPrice
  × gasPriceSafetyMultiplier

gasReserve =
  safeGasUnits × safeGasPrice

peakRequired =
  gasReserve + principalOutflow
```

Defaults:

- gas-unit safety = 1.25x;
- gas-price safety = 2.00x.

Both multipliers are fail-closed below 1.0x.

## Why gas-unit inputs are separate

A current RPC gas-price observation is public and read-only.

Gas **units** for the complete stateful sequence are a different proof problem. Some later calls depend on state created by earlier transactions, so a collection of independent `eth_estimateGas` calls against an undeployed contract is not equivalent to a full lifecycle rehearsal.

Therefore this gate does **not invent** lifecycle gas units.

Those values must come from an exact-head rehearsal/gas report tied to the contract source being deployed.

Until they exist:

```text
READ_ONLY_GAS_BUDGET = BLOCKED_MISSING_VERIFIED_GAS_UNIT_INPUTS
```

## Funding boundary

A green gas budget still does not authorize wallet funding.

Required sequence:

```text
public addresses
→ exact-head gas-unit rehearsal
→ fresh Arc fee snapshot
→ gas budget within 5 USDC ceiling
→ human reviews result
→ explicit human funding authorization
```

## Truth boundary

A gas estimate is not a receipt and is not a guarantee of future fees.

The estimate must be refreshed immediately before each protected mainnet stage.

No private key belongs in this gate.
