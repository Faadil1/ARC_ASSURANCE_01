# G2 Policy Creation Receipt

**Status:** PROVEN  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0x5713b214d517b681f7d266ed8eb7173611acf4833c71940932003d2e0c93c162`
- block: `23966937`
- authority: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- nonce: `7`
- pending nonce after verification: `8`
- target: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- function: `createPolicy`
- tx value: `0`
- status: `1 / SUCCESS`
- calldata hash:
  `0x407d54a1632fa2d5cfc0231cc2eb3300c36d86ba6d97d312f7d4e5bb14b9c5b2`

## Verified policy state

- policy id:
  `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- funder: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- provider: `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`
- payout recipient: `0x6B8ad09233dF44eD57B99aF8839129303955590C`
- scorer id hash:
  `0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45`
- max failures: `2`
- failure count: `0`
- max spend cap: `0.020 native USDC`
- unit payout: `0.002 native USDC`
- expiry: `1792033200`
- createdAt: `1790988482`
- fundedAt: `0`
- total funded: `0`
- total paid out: `0`
- total refunded: `0`
- paused: `false`
- closed: `false`
- refund issued: `false`
- exists: `true`
- active batch: zero

## Vault state

- policyCount: `1`
- totalLiability: `0`
- totalCustodyReceived: `0`
- totalValueReleased: `0`
- contract balance: `0`

## Gas

- gas used: `265470`
- effective gas price: `21500000000 wei/gas`
- effective fee: **0.005707605 native USDC**

## Verification

- workflow: `G2 Policy Creation Receipt`
- run: `37083767443`
- result: **SUCCESS**
- verification head: `4338c116e57bcc7a6b71b12a59abf63fd0419e23`
- artifact id: `11260325097`
- artifact digest:
  `sha256:0f9dcd57c9c13505ecdfaaf00e010a14914d8b811a15c3c35c36add232e20f33`

## Truth boundary

This proves policy creation only.

It does **not** prove funding, hidden precommit, provider output lock, reveal,
resolve, payout, no-pay or breaker/refund behavior.

The one-time createPolicy authorization is consumed. Funding remains a separate
protected action.
