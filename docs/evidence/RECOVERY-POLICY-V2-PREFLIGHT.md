# Recovery Policy v2 — Read-Only Arc Preflight

**Status:** PASS / READ-ONLY  
**Observed:** 2026-10-03  
**Network:** Arc Mainnet  
**Chain ID:** 5042  
**Workflow run:** 37122442113  
**Exact head:** `7ffccd7497add9a5636e4ff64057cdb93592ef7c`

## Existing v1 continuity

The stranded v1 policy remains unchanged:

- policy: `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- active batch: `0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7`
- commitment: `0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9`
- batch state: `1 / Committed`
- total funded: `0.010 native USDC`
- protected liability: `0.010 native USDC`

## Vault pre-state

Observed at block `24048642`:

- policy count: `1`
- total liability: `0.010 native USDC`
- total custody received: `0.010 native USDC`
- total value released: `0`
- contract balance: `0.010 native USDC`
- deployment spend cap: `0.050 native USDC`

No unexpected state drift was observed.

## Proposed v2 policy

Derived policy ID:

`0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`

Parameters:

- funder: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- provider: `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`
- payout recipient: `0x6B8ad09233dF44eD57B99aF8839129303955590C`
- scorer hash: `0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45`
- max failures: `2`
- max spend cap: `0.020 native USDC`
- planned initial funding: `0.010 native USDC`
- unit payout: `0.002 native USDC`
- expiry: `1792465200 / 2026-10-20T03:00:00Z`

Projected cumulative custody after later v2 funding:

- `0.020 / 0.050 native USDC`
- remaining deployment capacity: `0.030 native USDC`

## Exact createPolicy preflight

- authority pending nonce: `10`
- authority balance: `0.3554793005 native USDC`
- `eth_estimateGas`: **PASS**
- estimated gas: `255200`
- observed gas price: `20000000000 wei`
- estimated create-policy fee: `0.005104 native USDC`
- tx value: `0`
- calldata keccak256:
  `0x98718c6fab13f2fca8b94c91d1744c7a1d6c853c9ff1df2f6409e208b354fb66`

Artifact:

- id: `11274216099`
- digest:
  `sha256:7a540ab48b4b12432349c6e9ea5aad6cd0e088be2514a850a2919563e4b057b1`

## Safety boundary

The workflow proved:

- private key consumed: **false**
- secret consumed: **false**
- transaction signed: **false**
- transaction broadcast: **false**
- funds moved: **false**

## Promotion boundary

This proves only that the exact v2 `createPolicy` call is currently acceptable to Arc RPC under the observed state.

It does not authorize or prove:

- `createPolicy` broadcast;
- v2 funding;
- new hidden canary;
- v2 `commitBatch`;
- provider signature;
- output lock;
- reveal;
- resolve;
- financial consequence.

Next protected step: separate one-shot human authorization for the exact v2 `createPolicy` transaction.
