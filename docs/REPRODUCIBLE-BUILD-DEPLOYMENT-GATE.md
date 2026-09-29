# Reproducible Build + Deployment Manifest Gate v1

**Status:** PRODUCED / CLEAN_ROOM_EXECUTION_REQUIRED  
**Branch:** `chore/reproducible-build-gate`

This gate binds the reviewed `AssuranceVault` source to deterministic build evidence before any Arc mainnet deployment.

## One-command gate

From a clean checkout:

```bash
bash script/run-reproducible-gate.sh
```

The command performs **no mainnet transaction** and requires no private key.

## Canonical contract toolchain

The authoritative contract-build inputs are pinned by exact commit:

| Component | Pin |
|---|---|
| Arc Foundry | `circlefin/arc-foundry@d497beea7096ff2a8e583c8b307941f24a61b06b` |
| solc | `0.8.24` |
| forge-std | `620536fa5277db4e3fd46772d5cbc1ea0696fb43` (`v1.16.1`) |
| OpenZeppelin Contracts | `5fd1781b1454fd1ef8e722282f86f9293cacf256` (`v5.6.1`) |

The full machine-readable lock is:

`build/dependencies.lock.json`

Arc Foundry is built from the exact source commit with its own locked Rust dependency graph. Upstream Foundry is deliberately not substituted for Arc execution tests.

## Arc execution profile

`foundry.toml` now contains:

```toml
[profile.arc]
network = "arc"
```

The gate verifies the resolved config actually reports `network = arc` before relying on its test results.

## Reproducible bytecode evidence

`script/reproducible-build.sh`:

1. requires a clean tracked Git worktree;
2. verifies exact dependency commits;
3. verifies exact Arc Foundry source commit;
4. builds with the Arc profile;
5. extracts `AssuranceVault` creation/runtime bytecode plus compiler immutable-reference ranges;
6. computes the creation-bytecode hash, runtime-template hash, and a normalized-runtime hash with immutable slots zeroed;
7. records the exact Git commit/tree, immutable ranges and source hashes.

Output:

`build/out/AssuranceVault.build-manifest.json`

The manifest intentionally contains no timestamp so identical inputs can compare byte-for-byte at the evidence-field level.

## Independent double build

`script/reproducibility-double-build.sh` clones the exact source commit into **two different clean paths**, installs the same exact dependencies, builds both, and compares:

- source commit/tree;
- toolchain pins;
- compiler settings;
- creation bytecode hash;
- normalized runtime bytecode hash;
- critical source/config hashes.

Success produces:

`build/out/reproducibility-proof.json`

This is local reproducible-build evidence, not deployment evidence.

## Cross-language golden vector

The provider-output and canary hashing rules are generated independently by:

- JavaScript/Viem: `src/verifier/generate-golden-vector-v1.mjs`
- Solidity: `script/GenerateGoldenVector.s.sol`

Both derive the same intentionally public test key from:

`keccak256("ARC_ASSURANCE_GOLDEN_VECTOR_V1_PUBLIC_TEST_KEY")`

**Never fund this address.**

The comparison requires exact equality for:

- provider address;
- input hash;
- output hash;
- scorer ID hash;
- canary commitment;
- canary key;
- EIP-712 digest.

This proves cross-language encoding compatibility for the fixed vector. It is not a live-provider or mainnet claim.

## Node dependency sub-gate

Viem is pinned at `2.56.9`, including its source tag/commit in `dependencies.lock.json`.

However, there is currently **no committed `package-lock.json`**.

Therefore:

```text
Contract reproducible build = independently provable
JavaScript canonical lockfile = BLOCKED
```

The clean-room runner generates:

`build/out/package-lock.candidate.json`

That candidate must be reviewed and committed in a later delta before JavaScript dependency reproducibility can be promoted to PROVEN.

A successful current JS test run proves behavior for the dependency tree recorded in:

`build/out/npm-tree.json`

—not a permanently locked npm graph.

## Deployment manifest

The build gate generates:

`build/out/AssuranceVault.deployment-manifest.json`

States:

- `PREDEPLOY_TEMPLATE`
- `PREDEPLOY_READY`
- `DEPLOYED_UNVERIFIED`

It contains:

- exact source commit/tree;
- runtime template hash;
- expected **normalized** runtime hash;
- compiler-reported immutable byte ranges;
- expected creation bytecode hash;
- exact build toolchain;
- constructor configuration;
- optional deployment address/transaction/block.

It never contains a private key, mnemonic, seed phrase, password, or other secret.

A deployment manifest can **never self-promote** to chain-verified. After deployment, Integrated Verifier v3 must independently fetch Arc bytecode and receipts.

## Promotion boundary

Even a fully successful clean-room gate does **not** prove:

- Arc deployment;
- PASS → real payout;
- FAIL → real no-pay;
- breaker → refund;
- G5 Financial Causality;
- G6 Independent Verify;
- Live Core Loop.

Those remain blocked until the integrated contract is deployed with bounded value and reconstructed from Arc RPC.


## Immutable-aware runtime binding

`AssuranceVault` uses Solidity `immutable` constructor values.

Those values are patched into deployed runtime bytecode, so this comparison would be incorrect:

```text
keccak256(artifact deployedBytecode)
==
keccak256(on-chain runtime)
```

The gate instead records the compiler's immutable-reference byte ranges and computes:

```text
normalized runtime =
runtime bytecode with immutable ranges zeroed

keccak256(normalized build runtime)
==
keccak256(normalized on-chain runtime)
```

The chain verifier must then separately read and compare the public immutable getters:

- `authority()`
- `expectedChainId()`
- `usdcErc20Interface()`
- `deploymentSpendCap()`

Only **normalized code equality + immutable getter equality** can advance runtime binding for this contract.

Git commit provenance remains a separate reproducible-build requirement.
