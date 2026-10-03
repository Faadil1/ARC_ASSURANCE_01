# Recovery Policy v2 — resolveBatch Live Receipt

**Status:** PROVEN / LIVE SETTLEMENT COMPLETE  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0x43c2d82be1016f9783ff14def12e01e7f6900051051c7aed8ec04ea033a765a5`
- status: **SUCCESS / CANONICAL**
- block: `24106680`
- block hash: `0x43d5db7717660c700938d9d8d373984f2ea9ababe728ea769b7e2d9a8e6b8e61`
- sender: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- target: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- nonce: `15`
- value: `0`
- selector: `0x3339f903`
- calldata keccak256:
  `0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320`
- gas used: `167221`
- effective gas price: `21.5 Gwei`
- actual fee: `0.0035952515 native USDC`

## BatchResolved

- passed: `true`
- directive: `PAY`
- failure count: `0`
- protected remainder:
  `0.008 native USDC`
- event block: `24106680`

## PaymentReleased

- payout recipient:
  `0x6B8ad09233dF44eD57B99aF8839129303955590C`
- amount:
  `0.002 native USDC`
- protected remainder:
  `0.008 native USDC`
- total paid out:
  `0.002 native USDC`
- event block: `24106680`

## Independent transfer proof

Historical Arc balance verification at the settlement edge:

- recipient balance before block: `0`
- recipient balance at receipt block:
  `0.002 native USDC`
- exact delta:
  `+0.002 native USDC`
- payout exact: **true**

## Post-state

- authority pending nonce: `16`
- v2 batch state: `Resolved`
- v2 directive: `PAY`
- v2 active batch: zero
- v2 total paid out:
  `0.002 native USDC`
- v2 protected remainder:
  `0.008 native USDC`
- failure count: `0`
- policy paused: `false`
- total liability:
  `0.018 native USDC`
- total custody received:
  `0.020 native USDC`
- total value released:
  `0.002 native USDC`
- vault balance:
  `0.018 native USDC`
- v1 remains `Committed`
- v1 total funded:
  `0.010 native USDC`

## Verification workflow

- workflow: `Recovery Policy V2 resolveBatch Receipt`
- run: `37151830845`
- exact verification head:
  `109cca52e72a5108f48fa73e8274ae9d2ff7fa91`
- result: **SUCCESS**

## Truth boundary

The full v2 live success path is now proven end-to-end:

`createPolicy -> fund -> commitBatch -> real provider work -> provider EIP-712 signature -> lockProviderOutput -> revealCanary -> resolveBatch(PAY) -> exact payout`.

The original v1 recovery obligation remains separate and unchanged until its expiry path becomes valid.
