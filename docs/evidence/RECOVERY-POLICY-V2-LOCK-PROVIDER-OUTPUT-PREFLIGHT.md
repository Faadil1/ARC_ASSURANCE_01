# Recovery Policy v2 — lockProviderOutput Read-Only Preflight

**Status:** PASS / READY_PENDING_SEPARATE_HUMAN_AUTHORIZATION  
**Workflow run:** `37142060883`  
**Exact head:** `54e10212859650766d91de01d7571064b47b8ae2`

## Signature verification

- digest:
  `0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`
- recovered locally:
  `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`
- recovered by live contract:
  `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`
- digest consumed: `false`

## Live state

- chain id: `5042`
- observed block: `24088055`
- contract: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- proposed sender: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- pending sender nonce: `13`
- batch state: `Committed`
- workId used: `false`
- vault liability: `0.020 native USDC`
- vault custody: `0.020 native USDC`
- vault released: `0`
- vault balance: `0.020 native USDC`

## Exact proposed lockProviderOutput

- tx value: `0`
- method selector: `0xaeca0071`
- calldata keccak256:
  `0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b`
- `eth_call`: **PASS**
- returned digest:
  `0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`
- gas estimate: `220294`
- observed gas price: `20000000000 wei`
- estimated network fee: `4405880000000000 wei` ≈ `0.00440588 native USDC`

## Truth boundary

This is read-only readiness evidence only.

`lockProviderOutput` is **NOT AUTHORIZED** by this preflight.

`revealCanary` and `resolveBatch` also remain **NOT AUTHORIZED**.
