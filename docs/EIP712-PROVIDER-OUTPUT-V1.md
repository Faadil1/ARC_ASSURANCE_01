# EIP-712 Provider Output Binding v1

**Status:** PRODUCED / CRYPTO_RUNTIME_REVALIDATION_REQUIRED  
**Primary type:** `ProviderOutput`  
**Domain name:** `ARC_ASSURANCE`  
**Domain version:** `1`  
**Target chain:** Arc mainnet `5042`

This specification binds a provider's actual structured-work output to the exact policy, batch, work item, input, scorer version, Arc chain, and verifying contract.

It does **not** by itself authorize payment. Payment remains a later state-machine consequence.

## 1. Typed-data domain

```text
name              = ARC_ASSURANCE
version           = 1
chainId           = 5042
verifyingContract = <deployed assurance contract>
```

The verifying contract MUST be the contract that will consume the signed output.

A signature produced for another chain or another contract is not valid for this domain.

## 2. Primary type

Exact type string:

```text
ProviderOutput(address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)
```

Fields:

| Field | Meaning |
|---|---|
| `provider` | EOA expected to have produced/signed the result |
| `policyId` | Assurance policy identifier |
| `batchId` | Committed batch identifier |
| `workId` | Unique work-item identifier inside the batch |
| `inputHash` | keccak256 of the exact UTF-8 `input_text` bytes delivered to the provider |
| `outputHash` | keccak256 of the exact canonical scorer output string |
| `scorerIdHash` | keccak256 of the exact scorer ID string |
| `nonce` | Signed correlation/replay field |
| `deadline` | Unix timestamp after which the contract refuses the signature |

## 3. Current scorer binding

Current scorer ID:

```text
ARC_ASSURANCE_SCORER_V1:invoice-exact-v1
```

The provider signs its **actual** canonical output hash.

The provider does not receive the hidden expected answer from the assurance mechanism.

## 4. Hidden-canary integration

For the exact-match invoice MVP, the eventual assurance contract can avoid a subjective evaluator:

```text
PRECOMMIT
  commitment = H(policy/batch/work/canary/expectedOutputHash/scorerIdHash/salt/...)
        ↓
REAL WORK
        ↓
PROVIDER OUTPUT
  canonicalOutput
        ↓
EIP-712 SIGN
  inputHash + outputHash + scorerIdHash + policy/batch/work
        ↓
REVEAL
  expectedOutputHash + scorerIdHash + salt
        ↓
VERIFY COMMITMENT
        ↓
COMPARE
  signed outputHash == revealed expectedOutputHash
        ↓
PASS / FAIL
        ↓
financial consequence
```

This is deterministic for the narrow v1 exact-match scorer.

## 5. Replay model

EIP-712 domain separation protects against accidental cross-chain/cross-contract reuse, but EIP-712 itself does not provide application replay protection.

The Solidity module therefore consumes the exact typed-data digest once.

The final assurance state machine MUST ALSO enforce semantic uniqueness, including one financially consequential resolution per `workId` / batch state.

The `nonce` is signed context, not the sole replay defense.

## 6. Deadline

`deadline` MUST be non-zero.

The live provider refuses to sign a request whose deadline is already expired.

The contract refuses a signature when:

```text
block.timestamp > deadline
```

## 7. Provider signer boundary

Provider signing uses a dedicated provider key.

**MUST NOT:**

- reuse the T0 funder/deployer key;
- hold application funds on the provider signer by design;
- commit the signing key to GitHub;
- return the signing key in health/debug output.

V1 verifies EOA ECDSA signatures.

Smart-contract providers / ERC-1271 are a future extension and are not claimed by v1.

## 8. Malformed-output rule

Only canonicalizable outputs are signed.

Therefore:

- `NONE` → canonical → signable;
- `WRONG_AMOUNT_VALID` → wrong but canonical → signable;
- malformed modes such as `DROP_FIELD` → `ABSTAIN_MALFORMED` → unsigned.

This prevents malformed transport/schema errors from being silently promoted into an objective financial provider failure.

## 9. HTTP binding request

When EIP-712 mode is enabled:

```json
{
  "input_text": "Invoice A-1042\nSubtotal: 184.20 CAD\nTax: 27.63 CAD\nTotal: 211.83 CAD",
  "binding": {
    "policy_id": "0x...",
    "batch_id": "0x...",
    "work_id": "0x...",
    "nonce": "1",
    "deadline": "2000000000"
  }
}
```

`chainId` and `verifyingContract` come from trusted provider runtime configuration, not from the request.

## 10. Signed response envelope

A signable response includes:

```json
{
  "evidence": {
    "execution": "REAL_COMPUTE",
    "signature_status": "SIGNED_EIP712_V1"
  },
  "signature": {
    "signer": "0x...",
    "signature": "0x...",
    "digest": "0x...",
    "typed_data": {}
  }
}
```

The envelope is evidence of attribution/integrity for this exact result.

It is not evidence that the result is correct.

## 11. Solidity integration

Reusable module:

`src/eip712/ProviderOutputEIP712.sol`

It uses OpenZeppelin EIP-712/ECDSA primitives and is intended to be **inherited by the final assurance contract**.

This matters because the EIP-712 domain's `verifyingContract` becomes `address(this)`.

The module:

- hashes the exact frozen struct;
- recovers the EOA signer;
- checks declared provider == expected provider;
- checks deadline;
- rejects already-consumed typed-data digests;
- emits `ProviderOutputConsumed`.

It deliberately does not decide PASS/FAIL or release money.

## 12. Dependency policy

JavaScript signing:

- `viem` pinned in `package.json`.

Solidity verification:

- use the current audited OpenZeppelin Contracts stable release during integration;
- do not vendor an unpinned development branch.

Before merge into the live assurance contract, install and lock the exact OpenZeppelin tag and run Arc Foundry on the merged commit.

## 13. Verification commands

Core schema/provider tests that do not need crypto dependency resolution:

```bash
node --test \
  test/scorer/invoice-v1.test.mjs \
  test/provider/provider-v1.test.mjs \
  test/eip712/provider-output-v1.test.mjs
```

After installing the pinned Node dependency:

```bash
npm run test:eip712
```

After installing the pinned OpenZeppelin Foundry dependency:

```bash
arc-forge test --match-path 'test/eip712/*.t.sol' -vv
```

## 14. Promotion boundary

This workstream may become **LOCAL_VERIFIED** only after the exact branch head passes:

- JS typed-data/sign/verify tests;
- HTTP signed-output tests;
- Solidity digest/recovery/replay tests;
- cross-language vector equality between JS and Solidity.

Until then:

```text
EIP712_PROVIDER_BINDING = ACTIVE
SIGNED_OUTPUT = BLOCKED
REAL_WORK = BLOCKED
LIVE_CORE_LOOP = BLOCKED
```
