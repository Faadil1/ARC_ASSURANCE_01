# Recovery Policy v2 — createPolicy Live Receipt

**Status:** PROVEN  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0x0bb6e1ef61504f8f1ea4f899c88cccc9a65c10ea0646867e9ebac87a57341fd4`
- status: **SUCCESS**
- block: `24052629`
- position: `2`
- timestamp: `2026-10-03T12:52:36Z`
- sender: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- target: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- nonce: `10`
- value: `0`
- gas limit: `255200`
- gas used: `248358`
- gas price: `21.5 Gwei`
- actual fee: `0.005339697 native USDC`
- method selector: `0xd2a6f88d`

The raw calldata begins with the exact preflight selector and payload and matches the previously reviewed v2 createPolicy call.

## Post-state verification

Independent Arc RPC post-check observed:

- `policyCount = 2`;
- authority pending nonce = `11`;
- v2 policy exists;
- v2 funder / provider / payout recipient / scorer / maxFailures / maxSpendCap / unitPayout / expiry all match the reviewed plan;
- v2 `fundedAt = 0`;
- v2 `totalFunded = 0`;
- v2 `activeBatchId = 0x00...00`.

The stranded v1 policy remains unchanged:

- active batch remains `0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7`;
- state remains `Committed`;
- commitment remains `0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9`;
- v1 total funded remains `0.010 native USDC`.

Vault state after v2 creation:

- total liability: `0.010 native USDC`;
- total custody received: `0.010 native USDC`;
- total value released: `0`;
- contract balance: `0.010 native USDC`.

## Truth boundary

This proves only successful creation of the independent v2 policy.

It does **not** authorize or prove:
- v2 funding;
- hidden canary generation;
- v2 commitBatch;
- provider signature;
- lockProviderOutput;
- revealCanary;
- resolveBatch;
- v1 cancellation/refund.

Next gate: v2 funding read-only preflight, then separate explicit funding authorization.
