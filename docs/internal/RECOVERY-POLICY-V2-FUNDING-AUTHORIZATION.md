# Recovery Policy v2 — Funding Authorization

**Status:** AUTHORIZED_PENDING_EXECUTION

## Exact bound action

- chain id: `5042`
- contract: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- sender/funder: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- function: `fund(bytes32)`
- policy id: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- tx value: `10000000000000000 wei` = `0.010 native USDC`
- calldata hash:
  `0xdc6ad0cd75e1a2b9bebdbc26530f2669a8c6ea25f60d8bb993dfbd3fc6986646`
- preflight pending nonce: `11`
- preflight gas estimate: `82230`

## Freshness rule

Immediately before any broadcast, re-check chain, selected sender, policy unfunded state, v1 continuity, exact calldata hash, nonce, balance and gas estimate.

Any material drift invalidates this template and requires a fresh preflight.

## Authorization scope

If later granted, authorization permits exactly one matching `fund(policyId)` broadcast with exactly `0.010 native USDC`.

It does **not** authorize:
- canary generation;
- `commitBatch`;
- provider signing;
- `lockProviderOutput`;
- `revealCanary`;
- `resolveBatch`;
- v1 cancellation/refund.


## Human authorization — 2026-10-03

Received in chat:

> J’autorise cette transaction `fund` v2 exacte de `0,010 native USDC` sur Arc Mainnet.

This authorization is one-shot and applies only to the exact bound action in this document.

Current authorization state: **AUTHORIZED_PENDING_EXECUTION**.

After one matching transaction is broadcast, this authorization becomes **CONSUMED**, whether the receipt succeeds or reverts. Any retry requires a new explicit authorization.
