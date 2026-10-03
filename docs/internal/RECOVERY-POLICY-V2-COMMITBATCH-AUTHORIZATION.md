# Recovery Policy v2 — commitBatch Authorization

**Status:** AUTHORIZED_PENDING_EXECUTION

## Exact bound action

- chain id: `5042`
- contract: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- sender/funder: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- function: `commitBatch(bytes32,bytes32,bytes32)`
- policy id: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch id: `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- commitment: `0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17`
- tx value: `0`
- preflight nonce: `12`
- calldata hash:
  `0xbb2035436436b15588fe49896ce036d68b271f41d5499fb7297c371642e23b95`
- preflight gas estimate: `137470`

## Freshness rule

Immediately before any broadcast, re-check:
- chain id;
- selected sender;
- exact public policy/batch/commitment;
- v2 remains funded and has no active batch;
- v1 continuity;
- exact calldata hash;
- pending nonce;
- current gas estimate.

Any material drift invalidates this template and requires a fresh preflight.

## Authorization scope

If later granted, authorization permits exactly one matching `commitBatch` broadcast.

It does **not** authorize:
- provider signature;
- `lockProviderOutput`;
- `revealCanary`;
- `resolveBatch`;
- any v1 cancellation/refund.


## Human authorization — 2026-10-03

Received in chat:

> J’autorise cette transaction `commitBatch` v2 exacte sur Arc Mainnet.

This authorization is one-shot and applies only to the exact bound action in this document.

Current authorization state: **AUTHORIZED_PENDING_EXECUTION**.

After one matching transaction is broadcast, this authorization becomes **CONSUMED**, whether the receipt succeeds or reverts. Any retry requires a new explicit authorization.
