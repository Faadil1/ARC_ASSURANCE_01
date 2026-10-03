# G3 REAL WORK — Read-Only Readiness

Status: ACTIVE / PREP ONLY  
Parent proof: G2 PRECOMMIT = PROVEN  
Branch: ops/g3-real-work-readiness

## Goal

Prepare the exact G3 work item without weakening the G2 hidden-preimage boundary and without sending lockProviderOutput.

The current live batch is already committed on Arc Mainnet. G3 must now prove genuine provider computation and, later, a provider-bound EIP-712 output that is locked only after the G2 receipt.

## Current safety choice

The existing signed HTTP mode accepts a raw PROVIDER_SIGNING_KEY environment variable. That path remains implemented and tested, but it is not the preferred operator path for this live proof because the bound provider is a human-controlled EOA.

This readiness step therefore does not request, print, copy, commit or transmit the provider private key.

## Read-only preparation script

script/g3_prepare_real_work.mjs

The script:

1. reads the human-local G2 secret reveal packet from a file outside the repository;
2. re-hashes the input, expected output and scorer locally;
3. reconstructs the exact hidden commitment and canary key;
4. reads current Arc Mainnet state only;
5. requires the live batch to remain Committed;
6. requires the committed work slot to remain empty and the hidden workId unused;
7. starts the real provider HTTP endpoint on loopback with signing disabled;
8. sends only the actual input_text to POST /v1/extract;
9. requires REAL_COMPUTE, fault mode NONE, and canonical output;
10. checks locally that the provider output matches the hidden expected output;
11. writes a sensitive local G3 compute artifact outside Git;
12. creates no provider signature and sends no transaction.

The sensitive local artifact intentionally omits the hidden expected canonical output and salt. It contains only what is needed for the later provider-output signing step plus the provider request/response evidence.

## Invocation

From the local repository checkout, run one PowerShell command:

    node script/g3_prepare_real_work.mjs "$env:USERPROFILE\Documents\ARC_ASSURANCE_G2_SECRET_REVEAL.txt" "$env:USERPROFILE\Documents\ARC_ASSURANCE_G3_LOCAL_COMPUTE.json"

The script refuses to read the secret packet from inside the Git repository and refuses to write the G3 local artifact inside the Git repository.

## Expected public-safe console result

    G3 REAL WORK — READ-ONLY PREP
    RESULT: PASS ✅
    ...
    provider_execution: REAL_COMPUTE
    provider_fault_mode: NONE
    work_id_unused: true
    provider_output_matches_hidden_expected: true
    signature_created: false
    transaction_sent: false

Do not paste ARC_ASSURANCE_G3_LOCAL_COMPUTE.json into chat or GitHub.

## Promotion boundary

This step does not prove G3.

After a PASS:

- real provider computation: locally observed;
- G2 precommit ordering: preserved;
- provider signature: still missing;
- lockProviderOutput: still not authorized.

The next protected artifact is an EIP-712 signature from the policy-bound provider EOA. The preferred path should use the provider wallet to sign typed data without exporting its private key.

Only after that signature is independently verified and an exact lockProviderOutput call passes eth_call/gas preflight should a separate human authorization for the on-chain lock be requested.

## Truth boundary

Still not proven after this read-only preparation:

- G3 REAL WORK as a complete signed-output gate;
- on-chain ProviderOutputLocked;
- reveal;
- deterministic resolution;
- PASS -> payout;
- FAIL -> no-pay;
- breaker/refund;
- Live Core Loop;
- external adoption.
