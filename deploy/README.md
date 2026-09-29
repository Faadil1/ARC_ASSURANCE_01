# AssuranceVault Deployment Manifest v1

The deployment manifest is a **secret-free provenance record**, not a deployment script.

Generate it after a reproducible build:

```bash
npm run deploy:manifest
npm run deploy:manifest:verify
```

## Predeploy-ready example

Set only public constructor data:

```bash
AUTHORITY_ADDRESS=0x... \
DEPLOYER_ADDRESS=0x... \
DEPLOYMENT_SPEND_CAP_WEI=50000000000000000 \
npm run deploy:manifest
```

No private key is accepted or required.

The manifest then becomes `PREDEPLOY_READY`.

## After a human-authorized deployment

Supply public receipt metadata:

```bash
DEPLOYED_ADDRESS=0x... \
DEPLOY_TX_HASH=0x... \
DEPLOY_BLOCK=12345 \
AUTHORITY_ADDRESS=0x... \
DEPLOYER_ADDRESS=0x... \
DEPLOYMENT_SPEND_CAP_WEI=50000000000000000 \
npm run deploy:manifest
```

The status becomes:

`DEPLOYED_UNVERIFIED`

That wording is intentional.

The next required action is chain-native verification against Arc RPC. The manifest itself cannot mark its own deployment as verified.

## Canonical constructor facts

For the integrated candidate:

- expected chain ID: `5042`
- Arc unified ERC-20 USDC interface:
  `0x3600000000000000000000000000000000000000`
- deployment spend cap: human-selected bounded value
- authority: human-controlled deployment/administrative address

The provider signer is **not** a constructor parameter and must remain separate from the funding wallet.
