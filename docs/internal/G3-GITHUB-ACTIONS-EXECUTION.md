# G3 GitHub Actions Secret-Safe Execution

This path is intended for the operator case where local Node execution on the managed endpoint is undesirable.

## Security model

- GitHub-hosted runner only.
- Exact Node 22.16.0.
- Read-only Arc RPC plus loopback provider compute.
- No provider private key.
- No EIP-712 provider signature.
- No lockProviderOutput transaction.
- No artifact upload.
- G2 reveal packet materialized only in RUNNER_TEMP.
- Sensitive files deleted in an always() cleanup step.

The workflow uses the protected GitHub Environment:

    g3-live-secret

and expects exactly one environment secret:

    G2_SECRET_REVEAL_PACKET

The secret value is the complete original JSON object emitted under SECRET_REVEAL_PACKET by the G2 generator. It must never be committed to Git, placed in workflow_dispatch inputs, PR comments, issue comments, logs, or artifacts.

## Environment protection

Because this repository is public and has collaborators, configure the environment with a required reviewer before storing the secret.

Recommended:
- required reviewer: Faadil1
- leave "Prevent self-review" disabled if Faadil must approve his own protected run
- deploy only from the intended G3 branch if branch restrictions are configured

The workflow is intentionally not triggered by ordinary branch pushes. It runs on:
- manual workflow_dispatch when available; or
- a change to .github/g3-run-request on ops/g3-real-work-readiness.

This allows the secret/environment to be configured first and the exact run to be armed afterward.

## Truth boundary

A successful workflow proves the same read-only preparation as script/g3_prepare_real_work.mjs:
- current batch remains Committed;
- hidden preimage reconstructs the committed commitment;
- hidden workId is unused;
- provider endpoint performs REAL_COMPUTE with fault mode NONE;
- provider output matches the hidden expected output locally.

It does not prove provider EIP-712 signature, ProviderOutputLocked, reveal, resolve, financial consequence, Live Core Loop, or adoption.

No secret-bearing artifact is retained after the job.
