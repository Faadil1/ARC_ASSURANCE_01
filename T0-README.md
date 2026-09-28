# T0 Mainnet Custody Spike

This branch implements only the first Arc technical proof for ARC_ASSURANCE_01.

## Target

```
real Arc native USDC
→ contract custody
→ real payout
→ real refund
```

See `docs/T0-MAINNET-RUNBOOK.md`.

## Current evidence status

**CODE_READY_CANDIDATE / NOT LIVE-PROVEN**

The source exists, but no mainnet claim is valid until real receipts are written to `docs/evidence/T0-MAINNET-CUSTODY.md`.

## Files

- `src/T0NativeCustody.sol` — minimal spike contract
- `test/T0NativeCustody.t.sol` — dependency-free lifecycle/negative-path tests
- `foundry.toml` — Foundry configuration
- `.env.example` — safe environment template
- `docs/T0-MAINNET-RUNBOOK.md` — protected human execution steps
- `docs/evidence/T0-MAINNET-CUSTODY.md` — evidence template

## Important

Arc native USDC uses 18 decimals for native `msg.value`. Do not confuse that with the 6-decimal ERC-20 interface.
