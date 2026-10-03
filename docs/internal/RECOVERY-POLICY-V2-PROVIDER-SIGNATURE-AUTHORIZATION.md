# Recovery Policy v2 — Provider Signature Authorization

**Status:** NOT AUTHORIZED

## Exact signature request

This is **not an on-chain transaction**. It is one EIP-712 signature request to the provider wallet.

- expected provider wallet: `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`
- chain id: `5042`
- verifying contract: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- domain: `ARC_ASSURANCE`
- version: `1`
- primary type: `ProviderOutput`
- policy id: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch id: `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- work id: `0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0`
- input hash: `0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde`
- output hash: `0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018`
- scorer id hash: `0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45`
- signed nonce: `1`
- deadline: `1792465200`
- exact digest:
  `0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1`

The digest has been independently cross-checked against the live contract.

## Scope

If later granted, authorization permits exactly one provider-wallet signature over this exact typed-data payload.

It does **not** authorize:
- any transaction;
- `lockProviderOutput`;
- `revealCanary`;
- `resolveBatch`;
- any v1 recovery operation.
