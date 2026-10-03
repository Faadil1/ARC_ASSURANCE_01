# Recovery Policy v2 — resolveBatch Authorization

**Status:** CONSUMED

## Exact candidate action

- network: Arc Mainnet
- chain id: `5042`
- contract:
  `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- proposed sender:
  `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- method: `resolveBatch(bytes32,bytes32)`
- tx value: `0`
- policy id:
  `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch id:
  `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- exact calldata keccak256:
  `0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320`
- expected directive: `PAY`
- expected payout:
  `0.002 native USDC`
- payout recipient:
  `0x6B8ad09233dF44eD57B99aF8839129303955590C`

Freshness observations:
- pending sender nonce: `15`
- gas estimate: `178343`
- estimated fee at observed gas price:
  approximately `0.00356686178343 native USDC`

Any future authorization is one-shot and applies only to this exact action binding.

A fresh preflight is required immediately before broadcast.


## Human authorization — 2026-10-03

The user explicitly authorized exactly one Arc Mainnet `resolveBatch` transaction bound to:

- calldata keccak256:
  `0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320`
- expected directive: `PAY`
- exact payout: `0.002 native USDC`
- payout recipient:
  `0x6B8ad09233dF44eD57B99aF8839129303955590C`

Current authorization state: **AUTHORIZED_PENDING_EXECUTION**.

This authorization is one-shot. If the matching transaction is broadcast, it is consumed whether the transaction succeeds or reverts. Cancelling before broadcast does not consume it, but any retry requires a fresh preflight.

No other transaction or payout is authorized.


## Execution result — 2026-10-03

The exact authorized `resolveBatch` transaction was broadcast and succeeded:

- tx:
  `0x43c2d82be1016f9783ff14def12e01e7f6900051051c7aed8ec04ea033a765a5`
- block: `24106680`
- nonce: `15`
- calldata keccak256:
  `0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320`
- directive: `PAY`
- exact payout:
  `0.002 native USDC`
- payout recipient:
  `0x6B8ad09233dF44eD57B99aF8839129303955590C`

The one-shot `resolveBatch` authorization is **CONSUMED**.
