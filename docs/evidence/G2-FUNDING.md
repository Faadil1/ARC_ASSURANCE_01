# G2 Funding Receipt

**Status:** PROVEN  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0xf5233124f02d03b5396386a570bd55d4994e36afa8a02e6a56ef0cc0881c8edf`
- block: `23970786`
- authority/funder: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- nonce: `8`
- pending nonce after verification: `9`
- target: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- function: `fund`
- policy id:
  `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- tx value: `10000000000000000 wei` = **0.010 native USDC**
- status: `1 / SUCCESS`
- calldata hash:
  `0x326ce8c37cbc14991d1b739a96839f12ac3b9b9857dd2608831ceeb3dfd5d16a`

## Verified post-state

Policy:
- fundedAt: `1790990435`
- totalFunded: **0.010 native USDC**
- totalPaidOut: `0`
- totalRefunded: `0`
- activeBatchId: zero
- paused: false
- closed: false
- refundIssued: false

Vault:
- policyCount: `1`
- totalLiability: **0.010 native USDC**
- totalCustodyReceived: **0.010 native USDC**
- totalValueReleased: `0`
- contract balance: **0.010 native USDC**

## Gas

- gas used: `110845`
- effective gas price: `21500000000 wei/gas`
- effective fee: **0.0023831675 native USDC**

## Verification

- workflow: `G2 Funding Receipt`
- run: `37085950306`
- result: **SUCCESS**
- verification head: `610f413e9f18a4f6d85b6383bc06ffa2f8e862be`
- artifact id: `11259859534`
- artifact digest:
  `sha256:dadf74866716607c17ffd3665ea92ab6048cb6be9967a544146e329556da8864`

## Truth boundary

This proves the first live G2 funding only.

It does not prove hidden precommit, provider output lock, reveal, resolve, payout,
no-pay or breaker/refund behavior.

The one-time 0.010-USDC funding authorization is consumed.
