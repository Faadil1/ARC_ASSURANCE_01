# Recovery Policy v2 — lockProviderOutput Live Receipt

**Status:** PROVEN  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0x7de28364a63875b38f58649d8b85629422e8c5f2cebb29626e39ad157611ae78`
- status: **SUCCESS / CANONICAL**
- block: `24099169`
- block hash: `0x60ea034767674bd2b05681b5ce6921d7440f651ea1a1d6a4021e32bd5066895d`
- sender: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- target: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- nonce: `13`
- value: `0`
- selector: `0xaeca0071`
- calldata keccak256:
  `0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b`
- gas used: `213863`
- effective gas price: `21.5 Gwei`
- actual fee: `0.0045980545 native USDC`

## ProviderOutputConsumed

- digest:
  `0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`
- provider:
  `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`
- work id:
  `0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0`
- provider-output nonce: `1`

## ProviderOutputLocked

- policy id:
  `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch id:
  `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- work id:
  `0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0`
- input hash:
  `0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde`
- output hash:
  `0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018`
- scorer id hash:
  `0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45`
- provider digest:
  `0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`
- event block: `24099169`

## Post-state

Independent Arc RPC verification:

- authority pending nonce: `14`
- v2 batch state: `OutputLocked`
- exact workId/inputHash/outputHash/providerDigest stored
- workId consumed: `true`
- provider digest consumed: `true`
- recovered provider remains exact
- v2 total funded: `0.010 native USDC`
- v1 remains `Committed` and funded `0.010 native USDC`
- total liability: `0.020 native USDC`
- total custody received: `0.020 native USDC`
- total value released: `0`
- contract balance: `0.020 native USDC`

## Verification workflow

- workflow: `Recovery Policy V2 lockProviderOutput Receipt`
- run: `37147983918`
- exact verification head: `5fbd36138e488cb9460aa80ba9224d7506f8442b`
- result: **SUCCESS**

## Truth boundary

This proves the live provider-output lock edge.

It does not authorize or prove:
- `revealCanary`;
- `resolveBatch`;
- settlement or payout.

The one-shot `lockProviderOutput` authorization is consumed.
