# Recovery Policy v2 — commitBatch Live Receipt

**Status:** PROVEN  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0x36d8d4dc972a2ef557d2a9eee38a5607e128eef01694d8620fef207befd61c07`
- status: **SUCCESS**
- block: `24060767`
- sender: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- target: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- nonce: `12`
- value: `0`
- gas limit: `137470`
- gas used: `132014`
- actual fee: `0.002838301 native USDC`
- calldata keccak256:
  `0xbb2035436436b15588fe49896ce036d68b271f41d5499fb7297c371642e23b95`

## Exact BatchCommitted event

- policy id: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch id: `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- commitment: `0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17`
- event block: `24060767`

## Post-state

Independent Arc RPC verification:

- authority pending nonce: `13`
- v2 active batch id equals the committed batch
- v2 batch state: `Committed`
- v2 commitment exact
- v2 total funded: `0.010 native USDC`
- v1 remains Committed with its original batch/commitment and `0.010 native USDC`
- total liability: `0.020 native USDC`
- total custody received: `0.020 native USDC`
- total value released: `0`
- contract balance: `0.020 native USDC`

## Truth boundary

This proves the v2 public precommit edge only.

It does **not** authorize or prove:
- provider execution;
- provider signature;
- `lockProviderOutput`;
- `revealCanary`;
- `resolveBatch`;
- financial consequence.

Next gate: provider real-work preparation and typed-data signature readiness, using the protected v2 reveal packet without exporting any private key.
