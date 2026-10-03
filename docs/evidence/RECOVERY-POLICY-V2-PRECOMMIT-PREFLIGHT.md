# Recovery Policy v2 — commitBatch Read-Only Preflight

**Status:** PASS / READ-ONLY  
**Observed:** 2026-10-03  
**Network:** Arc Mainnet  
**Chain ID:** 5042  
**Workflow run:** 37126625964  
**Exact head:** `a5ceab0e8ce861fbabb4d747c22098b45f837247`

## Public precommit

- policy: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch: `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- commitment: `0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17`

## v2 pre-state

- total funded: `0.010 native USDC`
- remaining liability: `0.010 native USDC`
- unit payout: `0.002 native USDC`
- active batch: zero
- policy usable and unexpired

v1 remains Committed with its original batch/commitment and 0.010 native USDC funded.

Vault state:
- policy count: `2`
- total liability: `0.020 native USDC`
- total custody received: `0.020 native USDC`
- total value released: `0`
- contract balance: `0.020 native USDC`

## Exact commitBatch preflight

- function: `commitBatch(bytes32,bytes32,bytes32)`
- tx value: `0`
- pending nonce: `12`
- calldata hash:
  `0xbb2035436436b15588fe49896ce036d68b271f41d5499fb7297c371642e23b95`
- `eth_call`: **PASS**
- `eth_estimateGas`: **PASS**
- gas estimate: `137470`
- observed gas price: `20000010000 wei`
- estimated fee: `0.0027494013747 native USDC`

## Secret boundary

The operator reports that the complete v2 reveal packet was saved directly to:

- GitHub Environment: `g3-live-secret`
- secret: `G2_SECRET_REVEAL_PACKET`

The preflight workflow did **not** read that secret. No hidden preimage is stored in the repository or artifact.

## Safety boundary

- private key consumed: false
- secret consumed: false
- transaction signed: false
- transaction broadcast: false
- funds moved: false

Artifact:
- id: `11274748436`
- digest: `sha256:1d77ff704bb70f1d17f2ff846d34dc8d800df6c69dc58dbfd826b5b8016de6db`

Next protected step: separate one-shot authorization for the exact v2 `commitBatch`.
