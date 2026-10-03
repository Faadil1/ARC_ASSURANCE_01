# Recovery Policy v2 — revealCanary Live Receipt

**Status:** PROVEN  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0xddbeb788ab6e643523f8a7ea3d456c35309cfaf9638ccf1e5d9ea044a2c054b2`
- status: **SUCCESS / CANONICAL**
- block: `24104229`
- block hash: `0x5204e96fd53bb61ccd7d6dec9e27d7843d7890bfdb224b8f67f9960696efc72d`
- sender: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- target: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- nonce: `14`
- value: `0`
- selector: `0x2f02a092`
- calldata keccak256:
  `0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031`
- gas used: `119296`
- effective gas price: `21.5 Gwei`
- actual fee: `0.002564864 native USDC`

## CanaryRevealed

- policy id:
  `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch id:
  `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- work id:
  `0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0`
- input hash:
  `0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde`
- scorer id hash:
  `0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45`
- canary key:
  `0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574`
- event block: `24104229`
- commitment reconstruction from the on-chain reveal preimage: **PASS**

## Post-state

Independent Arc RPC verification:

- authority pending nonce: `15`
- v2 batch state: `Revealed`
- v2 expected output stored and matches the reveal event
- v2 workId/inputHash/outputHash/providerDigest unchanged
- canary key consumed: `true`
- provider output matches expected output: `true`
- v2 total funded: `0.010 native USDC`
- v2 total paid out: `0`
- v1 remains `Committed` and funded `0.010 native USDC`
- total liability: `0.020 native USDC`
- total custody received: `0.020 native USDC`
- total value released: `0`
- contract balance: `0.020 native USDC`

## Verification workflow

- workflow: `Recovery Policy V2 revealCanary Receipt`
- run: `37150611570`
- exact verification head: `0047a1d8e2fd3b00477fe8ba665bf74c65db48b3`
- result: **SUCCESS**

## Truth boundary

This proves the live canary reveal edge.

It does not authorize or prove:
- `resolveBatch`;
- settlement directive execution;
- payout or withheld financial consequence.

The one-shot `revealCanary` authorization is consumed.
