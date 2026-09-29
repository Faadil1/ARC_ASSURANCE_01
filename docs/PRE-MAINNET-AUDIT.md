# Pre-Mainnet Audit — Integrated AssuranceVault

**Status:** ACTIVE / BLOCKED pending exact-head verification

This is the final source-level audit before any integrated mainnet deployment.

## A. Custody

- [x] direct unattributed funding rejected
- [x] policy liability isolated from pooled balance
- [x] payout bounded by policy liability
- [x] refund bounded by policy liability
- [x] deployment spend cap exists
- [x] policy spend cap exists
- [x] unit payout configured immutably per policy
- [ ] exact-head Foundry tests green
- [ ] deployment gas measured

## B. Load-bearing assurance

- [x] no independent provider payout function
- [x] payout exists only inside deterministic PASS resolution
- [x] FAIL batch terminal without payout
- [x] breaker blocks future batches
- [x] protected remainder refundable
- [x] payout failure reverts accounting and events
- [ ] live PASS receipt
- [ ] live FAIL/no-pay receipt
- [ ] live breaker/refund receipt

## C. Cryptographic binding

- [x] Arc chain ID in EIP-712 domain
- [x] verifying contract in EIP-712 domain
- [x] provider/policy/batch/work/input/output/scorer/nonce/deadline signed
- [x] exact digest replay consumption
- [x] workId reuse blocked
- [x] canary reuse blocked
- [ ] JS/Solidity golden vector green on exact head

## D. Hidden-canary integrity

- [x] commitment precedes signed output
- [x] reveal follows output lock
- [x] expected answer rewrite rejected
- [x] input hash bound at reveal
- [x] scorer bound to policy
- [ ] external provider cannot infer canary from accidental metadata — UNKNOWN / must be tested operationally

## E. Failure / recovery

- [x] wrong provider signature rejected
- [x] malformed output abstain path exists
- [x] rejecting payout recipient preserves funds by transaction revert
- [x] expiry recovery exists
- [x] wrong-chain deployment rejected
- [ ] clean-room recovery tests green on exact head
- [ ] external dependency failure drill

## F. Secrets / human action

- [x] provider signer separated from funder/deployer
- [x] .env ignored
- [x] golden-vector private key never emitted
- [x] mainnet funding is protected human action
- [ ] dedicated T0/mainnet wallet funded only after gate approval
- [ ] no secrets present in GitHub Actions logs/artifacts

## G. Reproducibility

- [x] direct dependency pins
- [x] solc version pinned
- [x] Foundry library tags pinned
- [x] deterministic public golden-vector generator
- [x] creation/init-code manifest generators
- [x] deployment-tx input verification added to integrated verifier
- [ ] package-lock committed
- [ ] clean-room workflow green
- [ ] exact Git SHA -> artifact -> init-code provenance proven
- [ ] deploy tx input -> expected init-code hash proven
- [ ] runtime hash captured after deployment

## H. Promotion blockers

Until every material item above is satisfied:

```text
Load-Bearing Integration = BLOCKED
G5 Financial Causality = BLOCKED
G6 Independent Verify = BLOCKED
Live Core Loop = BLOCKED
Mainnet Integrated Deployment = BLOCKED
```
