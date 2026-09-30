# Exact Predeploy Gas Snapshot Gate

**Status:** SOURCE PRODUCED / REAL PUBLIC DEPLOYER REQUIRED

This is the final no-secret deployment-gas gate before wallet-budget review.

## Inputs

Required:

- exact deployment manifest;
- exact AssuranceVault build artifact;
- public deployer address;
- Arc mainnet RPC.

Never required:

- private key;
- signature;
- broadcast authorization.

## Binding

The gate reconstructs:

```text
creation bytecode
+ exact encoded constructor args
→ init code
→ init-code keccak256
```

It rejects the run unless both the creation-bytecode hash and init-code hash match the deployment manifest.

Then it reads Arc mainnet:

```text
chain id
block number
gas price
deployer balance
deployer pending nonce
```

and runs read-only contract-creation `eth_estimateGas`.

The pending nonce is used to derive the expected CREATE contract address.

## Output

The snapshot binds:

- build Git SHA;
- init-code hash;
- public deployer;
- pending nonce;
- predicted contract address;
- observed block;
- observed gas price;
- deployment gas units;
- estimated gas cost at the observed gas price.

## Invalidation

The snapshot is invalidated if any of these change:

- pending deployer nonce;
- deployer;
- constructor arguments;
- creation bytecode;
- init-code hash;
- deployment manifest;
- chain ID.

The gas-price component also becomes stale with time and must be refreshed for the wallet-budget decision.

## Important distinction

`eth_estimateGas` is a simulation, not a receipt.

```text
PREDEPLOY GAS SNAPSHOT != DEPLOYED
PREDEPLOY GAS SNAPSHOT != FUNDING AUTHORIZATION
PREDEPLOY GAS SNAPSHOT != FEE GUARANTEE
```

## Canonical protected sequence

```text
real public deployer
→ exact deployment manifest
→ exact predeploy gas snapshot
→ combine with proven execution gas
→ apply safety margins
→ 5 USDC ceiling review
→ explicit human funding authorization
→ protected deploy approval
```

Until the public deployer is supplied, this gate remains BLOCKED.
