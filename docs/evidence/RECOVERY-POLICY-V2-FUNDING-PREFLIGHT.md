# Recovery Policy v2 — Funding Read-Only Preflight

**Status:** PASS / READ-ONLY  
**Observed:** 2026-10-03  
**Network:** Arc Mainnet  
**Chain ID:** 5042  
**Workflow run:** 37124943731  
**Exact head:** `d6bdff050a2ca54f785fc19312be6f838a7c210b`

## v1 continuity

The stranded v1 policy remains unchanged:

- batch state: `Committed`
- total funded: `0.010 native USDC`
- original batch and commitment unchanged

## v2 pre-state

- policy exists
- total funded: `0`
- active batch: zero
- policy max spend cap: `0.020 native USDC`
- unit payout: `0.002 native USDC`
- expiry: `2026-10-20T03:00:00Z`

## Vault pre-state

- policy count: `2`
- total liability: `0.010 native USDC`
- total custody received: `0.010 native USDC`
- total value released: `0`
- contract balance: `0.010 native USDC`
- deployment spend cap: `0.050 native USDC`

## Proposed funding transaction

- function: `fund(bytes32)`
- policy: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- tx value: `0.010 native USDC`
- calldata: `0xbf14c119a32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- calldata keccak256:
  `0xdc6ad0cd75e1a2b9bebdbc26530f2669a8c6ea25f60d8bb993dfbd3fc6986646`
- pending nonce: `11`
- gas estimate: `82230`
- observed gas price: `20000010000 wei`
- estimated fee: `0.0016446008223 native USDC`
- estimated total wallet outflow: `0.0116446008223 native USDC`

Projected post-state if later broadcast successfully:

- v2 total funded: `0.010`
- total liability: `0.020`
- total custody received: `0.020`
- contract balance: `0.020`
- remaining deployment capacity: `0.030`
- v1 unchanged

## Safety boundary

The workflow consumed no private key or secret, signed no transaction, broadcast nothing and moved no funds.

Artifact:
- id: `11275290112`
- digest: `sha256:9560750e70ab7f6513cc12c22c0558c4a6bc108d1b971d9035356b2ebe98baac`

## Promotion boundary

A green preflight does not authorize funding.

Next protected step: one exact `fund(policyId)` transaction with value `0.010 native USDC`, after separate explicit human authorization and a final freshness check.
