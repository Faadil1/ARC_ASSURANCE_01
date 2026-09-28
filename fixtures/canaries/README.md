# Scorer Test Vectors

These fixtures are deliberately public and therefore have evidence class **PRESEEDED**.

They exist to make canonicalization and future contract/verifier integration reproducible.

They MUST NOT be used as hidden canaries in a real run after publication.

## Vectors

- `invoice-v1-canary-001.json`
- `invoice-v1-canary-002.json`

Before the contract binds these hashing conventions, independently cross-check:

- `input_keccak256`
- `expected_output_keccak256`
- `scorer_id_keccak256`

using the chosen Arc/EVM toolchain.

A mismatch is a blocker, not something to normalize away.
