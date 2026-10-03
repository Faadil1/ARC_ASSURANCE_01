# Recovery Policy v2 — Funding Live Receipt

**Status:** PROVEN  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0x0135a9f0c0882bd64b8d2c0dd2cb22f79f48fa17aca82cad95153e8efebab348`
- status: **SUCCESS**
- block: `24055978`
- sender: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- target: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- nonce: `11`
- value: `0.010 native USDC`
- gas limit: `82230`
- gas used: `76633`
- actual fee: `0.0016476095 native USDC`
- method: `fund(bytes32)`
- policy id: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`

## Post-state

Independent Arc RPC verification:

- authority pending nonce: `12`
- policy count: `2`
- v2 total funded: `0.010 native USDC`
- v2 fundedAt: nonzero
- v2 active batch: zero
- v1 total funded: `0.010 native USDC`
- v1 batch state: `Committed`
- total liability: `0.020 native USDC`
- total custody received: `0.020 native USDC`
- total value released: `0`
- contract balance: `0.020 native USDC`

## Truth boundary

This proves v2 funding only.

It does **not** authorize or prove:
- hidden canary generation;
- `commitBatch`;
- provider signature;
- `lockProviderOutput`;
- `revealCanary`;
- `resolveBatch`;
- v1 cancellation/refund.

Next gate: generate a new v2 hidden canary, store its reveal packet directly in a protected GitHub Environment secret, then perform a separate read-only precommit review before any new `commitBatch` authorization.
