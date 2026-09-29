# Chain-Native Verifier v2

**Status:** PRODUCED / REVALIDATION_REQUIRED  
**Branch:** `feat/chain-native-verifier-v2`

v2 moves the verifier's source of truth from a self-authored event packet to Arc mainnet RPC.

Arc mainnet is publicly live, and its explorer is available at `explorer.arc.io`. The verifier uses normal EVM JSON-RPC semantics and requires chain ID `5042`.

## Commands

```bash
node src/verifier/chain-cli-v2.mjs verify-chain manifest.json
```

Override RPC:

```bash
ARC_MAINNET_RPC_URL=<rpc> \
node src/verifier/chain-cli-v2.mjs verify-chain manifest.json
```

## Modes

### T0 custody

Outputs:

```text
T0_CUSTODY_PROVEN_FROM_ARC
```

only if the actual Arc logs/receipts satisfy the bounded T0 sequence and value conservation.

### Assurance core

Outputs:

```text
ASSURANCE_CORE_PROVEN_FROM_ARC
```

only if Arc logs plus the required off-chain provider material reconstruct the strict cryptographic proof.

### Both

While custody and assurance remain separate contracts/primitives:

```text
PRIMITIVES_PROVEN_INTEGRATION_NOT_PROVEN
```

The CLI uses exit code 2 for that condition.

## Why this is stronger than v1

v1 asks:

> Is this packet internally consistent?

v2 asks:

> Do the public Arc chain, deployed bytecode and transaction receipts actually contain these events in this order?

Neither is sufficient yet for the final integrated product claim.

## Still required for G6

- exact-head execution of v2 against the live deployment;
- reproducible source-commit → deployed-bytecode provenance;
- integrated assurance + custody contract;
- chain verification that PASS caused payout;
- chain verification that FAIL prevented payout;
- breaker -> protected/refunded remainder;
- clean-checkout reproduction by an external operator/judge.

## Evidence classes

Until a real deployment is passed to v2:

```text
source = PRODUCED
tests = NOT_YET_EXECUTED_ON_EXACT_HEAD
chain proof = NOT_IMPLEMENTED_FOR_CURRENT_UNDEPLOYED_CORE
```

Do not use the existence of v2 source as a G6 or LIVE claim.
