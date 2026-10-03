# Recovery Policy v2 — resolveBatch Read-Only Preflight

**Status:** PASS / READY_PENDING_SEPARATE_HUMAN_AUTHORIZATION  
**Workflow run:** `37150934605`  
**Exact head:** `abf027239cfca539a9aa297cfb2a65db772aeeab`

## Live state

- chain id: `5042`
- observed block: `24105157`
- contract:
  `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- proposed sender:
  `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- pending sender nonce: `15`
- payout recipient:
  `0x6B8ad09233dF44eD57B99aF8839129303955590C`
- payout recipient balance before: `0`
- v2 batch state: `Revealed`
- deterministic output match: **true**

## Exact proposed resolveBatch

- expected directive: `PAY`
- directive enum value: `1`
- unit payout:
  `0.002 native USDC`
- protected v2 remainder after:
  `0.008 native USDC`
- tx value: `0`
- calldata:
  `0x3339f903a32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc873bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- calldata keccak256:
  `0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320`
- `eth_call`: **PASS**
- returned directive: `PAY`
- gas estimate: `178343`
- observed gas price: `20000010000 wei`
- estimated network fee:
  `3566861783430000 wei` ≈ `0.00356686178343 native USDC`

## Expected post-state if broadcast succeeds

- v2 batch state: `Resolved`
- directive: `PAY`
- v2 active batch: zero
- v2 total paid out: `0.002 native USDC`
- v2 protected remainder: `0.008 native USDC`
- failure count: `0`
- policy paused: `false`
- global liability: `0.018 native USDC`
- total custody received: `0.020 native USDC`
- total value released: `0.002 native USDC`
- vault balance: `0.018 native USDC`
- payout recipient expected balance: `0.002 native USDC`

## Truth boundary

This is read-only simulation only.

No payout has occurred yet.

`resolveBatch` remains **NOT AUTHORIZED**.
