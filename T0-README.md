# T0 Mainnet Custody Spike

This branch implements only the first Arc technical proof for ARC_ASSURANCE_01.

## Target

```
real Arc native USDC
-> PolicyCustody custody
-> configured immutable-recipient payout
-> real refund
```

See `docs/T0-MAINNET-RUNBOOK.md`.

## Current evidence status

**CODE_READY_CANDIDATE / NOT LIVE-PROVEN**

Source is produced and locally verified (35/35 under Arc Foundry), but no mainnet claim is valid until real receipts are written to `docs/evidence/T0-MAINNET-CUSTODY.md`.

## Files

- `src/PolicyCustody.sol` — custody contract under test
- `test/PolicyCustody.t.sol` — 35 lifecycle, negative-path, and security tests
- `script/DeployT0.s.sol` — mainnet-only, fail-closed deploy + policy registration
- `script/t0-mainnet-proof.sh` — `preflight` / `deploy` / `full` driver
- `foundry.toml` — Foundry configuration
- `.env.example` — safe environment template
- `docs/T0-MAINNET-RUNBOOK.md` — protected human execution steps
- `docs/evidence/T0-MAINNET-CUSTODY.md` — evidence template

`src/T0NativeCustody.sol` and `test/T0NativeCustody.t.sol` were removed. The initial spike accepted a caller-supplied payout recipient and refunded from the pooled contract balance. Nothing was ever deployed from it.

## Build and test

`lib/` is gitignored, so forge-std is not vendored:

```bash
forge install foundry-rs/forge-std@v1.9.6
arc-forge test -vv
```

Use `arc-forge`, not generic `forge`, so the Arc VM configuration applies. Arc Foundry is not present in the standard container, so there is no generic-CI proof of compilation.

## Important

Arc native USDC uses 18 decimals for native `msg.value`. The same balance is reachable as a 6-decimal ERC-20 at `0x3600000000000000000000000000000000000000`, which the contract records for evidence but never calls. The two representations differ by `1e12`.

Funding a mainnet wallet, signing, and approving value movement are protected human actions.
