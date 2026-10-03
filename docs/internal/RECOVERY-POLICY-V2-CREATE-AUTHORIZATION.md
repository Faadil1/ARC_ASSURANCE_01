# Recovery Policy v2 — createPolicy Authorization

**Status:** NOT AUTHORIZED  
**Action:** one exact `createPolicy` transaction on Arc Mainnet.

## Exact bound action

- chain id: `5042`
- contract: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- sender / authority: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- policy id: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- funder: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- provider: `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`
- payout recipient: `0x6B8ad09233dF44eD57B99aF8839129303955590C`
- scorer hash: `0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45`
- max failures: `2`
- max spend cap: `20000000000000000`
- unit payout: `2000000000000000`
- expiry: `1792465200`
- tx value: `0`
- preflight calldata hash:
  `0x98718c6fab13f2fca8b94c91d1744c7a1d6c853c9ff1df2f6409e208b354fb66`

## Freshness rule

Immediately before broadcast, re-check:

- chain id;
- selected sender;
- contract;
- policy still absent via successful callStatic/estimate;
- exact calldata hash;
- pending nonce;
- current gas estimate.

If any bound field changes, this authorization template is invalid and a fresh preflight is required.

## Authorization scope

Authorization for this action, if later granted, permits exactly one matching `createPolicy` broadcast.

It does **not** authorize:

- `fund`;
- hidden-canary generation;
- `commitBatch`;
- provider EIP-712 signature;
- `lockProviderOutput`;
- `revealCanary`;
- `resolveBatch`;
- v1 cancellation or refund.

Current authorization state remains **NOT AUTHORIZED**.
