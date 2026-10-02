# G2 Deployment-Only Authorization Receipt

**Date:** 2026-10-02  
**Protected action:** integrated AssuranceVault deployment on Arc Mainnet only.

Human authorization received verbatim:

> J’autorise uniquement le déploiement de l’AssuranceVault intégré sur Arc Mainnet.

## Allowed

- deploy the integrated `AssuranceVault` on Arc Mainnet from the dedicated authority wallet.

## Not authorized

- `createPolicy`
- `fund`
- `commitBatch`
- `lockProviderOutput`
- `revealCanary`
- `resolveBatch`
- `refundProtectedRemainder`
- additional wallet top-up

## Evidence binding rule

This receipt is documentation-only. It changes no Solidity, JavaScript, build
configuration, constructor parameter, or deployment script.

The new PR head created by this receipt must pass:

1. reproducible-build-candidate;
2. G2 Read-Only Predeploy;
3. exact Arc chain/nonce/balance/gas revalidation.

Only after those are green may the human signer proceed to the MetaMask
deployment confirmation. Private keys remain human-local only.
