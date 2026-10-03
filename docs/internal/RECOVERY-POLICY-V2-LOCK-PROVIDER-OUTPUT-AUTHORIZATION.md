# Recovery Policy v2 — lockProviderOutput Authorization

**Status:** CONSUMED

## Exact candidate action

- network: Arc Mainnet
- chain id: `5042`
- contract:
  `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- proposed sender:
  `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- method: `lockProviderOutput(ProviderOutput,bytes)`
- tx value: `0`
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
- provider-output nonce: `1`
- deadline: `1792465200`
- provider digest:
  `0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`
- provider signature:
  `0xab6655ce07beaa2d464794257026dec139f7f5d27f500ed2e0e2d4213f0e7e9755a59365e1fa78ab28eb919f3444e931f088fc4938b050d4a0a47dd49aa1ace41b`
- calldata keccak256:
  `0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b`

Freshness observations from the preflight:
- pending sender nonce: `13`
- gas estimate: `220294`
- estimated fee at observed gas price: `0.00440588 native USDC`

Any future authorization is one-shot and applies only to this exact action binding. A fresh exact-head preflight is still required immediately before broadcast.

No authorization for `revealCanary` or `resolveBatch` is implied.
