# G2 Policy Preflight Refresh

Refresh marker for the deployed AssuranceVault on Arc mainnet.

Contract:
`0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`

Purpose:
- refresh current nonce;
- confirm policyCount remains zero;
- confirm vault mutable state remains zero;
- confirm locked policy expiry remains future;
- refresh createPolicy gas estimate and calldata hash.

This marker changes no Solidity, JavaScript product logic, constructor input,
policy parameter, or deployment artifact.
