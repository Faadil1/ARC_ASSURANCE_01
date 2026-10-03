# Recovery Policy v2 — revealCanary Authorization

**Status:** AUTHORIZED_PENDING_EXECUTION

## Exact candidate binding

- network: Arc Mainnet
- chain id: `5042`
- contract:
  `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- sender/funder:
  `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- method: `revealCanary(bytes32,bytes32,bytes32,bytes32,bytes32,bytes32)`
- tx value: `0`
- policy id:
  `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch id:
  `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- work id:
  `0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0`
- input hash:
  `0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde`
- commitment:
  `0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17`
- expected returned canary key:
  `0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574`
- exact calldata keccak256:
  `0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031`

The hidden reveal values remain intentionally absent from this document.

Freshness observations:
- pending sender nonce: `14`
- gas estimate: `124601`
- estimated fee at observed gas price: approximately `0.0024920214329115 native USDC`

A future one-shot authorization must bind to the exact calldata hash above. A fresh secret-bound preflight is required immediately before broadcast.

No authorization for `resolveBatch` is implied.


## Human authorization — 2026-10-03

The user explicitly authorized exactly one Arc Mainnet `revealCanary` transaction bound to:

- calldata keccak256:
  `0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031`
- expected canary key:
  `0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574`

Current authorization state: **AUTHORIZED_PENDING_EXECUTION**.

This authorization is one-shot. If the matching transaction is broadcast, it is consumed whether the transaction succeeds or reverts. Cancelling before broadcast does not consume it, but any retry still requires a fresh preflight.

No authorization for `resolveBatch` is implied.
