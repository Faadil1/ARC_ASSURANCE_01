# Recovery Policy v2 — revealCanary Secret-Bound Read-Only Preflight

**Status:** PASS / SECRET-SAFE / NOT AUTHORIZED  
**Workflow run:** `37148410230`  
**Exact head:** `e6416429ed4d5630f36fcf88d519a3d6b0c7cd49`

## Live state

- network: Arc Mainnet / chain `5042`
- observed block: `24100263`
- sender/funder: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- pending nonce: `14`
- batch state: `OutputLocked`
- locked output hash:
  `0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018`
- provider digest:
  `0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`
- commitment reconstruction from the protected reveal packet: **PASS**
- canary key unused: **true**

## Exact candidate binding

- tx value: `0`
- calldata keccak256:
  `0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031`
- expected returned canary key:
  `0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574`
- `eth_call`: **PASS**
- gas estimate: `124601`
- observed gas price: `20000011500 wei`
- estimated fee: `2492021432911500 wei` ≈ `0.0024920214329115 native USDC`

## Secret boundary

The workflow loaded the v2 reveal packet only from the protected GitHub Environment into runner temp.

It did **not** log or retain:
- the salt;
- the raw reveal calldata;
- a named `expected_output_hash` secret field;
- the reveal packet.

The runner temp reveal packet was deleted in the cleanup step.

## Vault state

- total liability: `0.020 native USDC`
- total custody: `0.020 native USDC`
- total value released: `0`
- vault balance: `0.020 native USDC`

## Truth boundary

This proves that the protected reveal preimage reconstructs the live commitment and that the exact reveal call succeeds in simulation.

The reveal transaction remains **NOT AUTHORIZED**.

`resolveBatch` remains **NOT AUTHORIZED**.
