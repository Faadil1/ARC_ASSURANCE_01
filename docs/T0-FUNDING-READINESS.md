# T0 Funding Readiness

**Status:** CANDIDATE / HUMAN APPROVAL REQUIRED

The live Arc fee snapshot showed a contingency peak requirement of approximately:

```text
0.161589480363814752 USDC
```

That already includes:

- proven T0 gas rehearsal;
- recovery reserve;
- 1.25× gas-unit safety;
- 2.00× gas-price safety;
- 0.010 USDC T0 principal.

## Candidate envelope

Prepared candidate:

```text
initial dedicated-wallet top-up: 0.50 USDC
hard ceiling:                   5.00 USDC
```

The 0.50 USDC value is **not authorized**. It is a review candidate.

A fresh fee snapshot must still show:

```text
contingency peak <= 0.25 USDC
```

before the 0.50 USDC candidate may be presented for final human funding approval.

That creates at least a 2× funding-envelope buffer relative to the fresh conservative contingency requirement.

## Dedicated wallet requirements

Before funding:

- dedicated wallet only;
- public address may be inspected;
- EOA expected for the current private-key based T0 scripts;
- pending nonce should be 0 before first deployment;
- no private key or seed phrase in repo, CI, chat, issue, PR, or artifact.

The public-wallet checker can read:

- chain id;
- native USDC balance;
- pending nonce;
- bytecode at the address.

It never signs or broadcasts.

## Protected human action

The transition from:

```text
CANDIDATE_PENDING_HUMAN_APPROVAL
```

to actual funding requires an explicit human approval after a fresh read-only fee snapshot.

No green CI job may infer this authorization.
