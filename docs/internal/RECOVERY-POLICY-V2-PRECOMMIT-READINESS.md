# Recovery Policy v2 — Public Precommit Readiness

The operator generated a fresh v2 hidden canary in Remix after v2 funding.

Only the public binding is recorded here:

- policy: `0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8`
- batch: `0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19`
- commitment: `0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17`

The operator reports that the complete reveal packet was copied directly to the protected GitHub Environment secret `G2_SECRET_REVEAL_PACKET` in `g3-live-secret`.

This repository does not contain the hidden preimage. The precommit preflight deliberately does not read the Environment secret.

A successful preflight proves only that the exact public `commitBatch(policyId,batchId,commitment)` is currently accepted by Arc read-only simulation and gas estimation. It does not authorize or broadcast that transaction.
