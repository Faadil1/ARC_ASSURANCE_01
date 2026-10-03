# G2 Funding Authorization Receipt

Human authorization received:

> J’autorise uniquement le funding de 0.010 native USDC via `fund(policyId)`
> pour la policy G2 sur l’AssuranceVault déployé.

Bound scope:

- contract: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- function: `fund(bytes32)`
- policy:
  `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- msg.value: `10000000000000000 wei` = **0.010 native USDC**
- occurrence limit: **1**

Not authorized: additional funding, `commitBatch`, provider output lock,
reveal, resolve, refund, or any later lifecycle action.

This documentation-only receipt changes no executable source or policy
parameter. It exists to trigger a fresh read-only funding preflight.
