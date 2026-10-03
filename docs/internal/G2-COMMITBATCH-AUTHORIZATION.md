# G2 commitBatch Authorization Receipt

**Date:** 2026-10-02  
**Protected action:** one exact `commitBatch` transaction on Arc Mainnet.

Human authorization received verbatim:

> J’autorise cette transaction `commitBatch` exacte sur Arc Mainnet.

## Bound scope

- network: Arc Mainnet
- chain id: `5042`
- sender / funder: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- contract: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- function: `commitBatch(bytes32,bytes32,bytes32)`
- policy id: `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- batch id: `0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7`
- commitment: `0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9`
- msg.value: `0`
- occurrence limit: **1**

## Read-only preflight

Observed immediately before authorization:

- chain id: `5042`
- block: `23974231`
- selected funder: exact expected funder
- active batch before: zero
- remaining liability: `0.010` native USDC
- unit payout: `0.002` native USDC
- vault total liability: `0.010` native USDC
- vault balance: `0.010` native USDC
- `commitBatch` gas estimate: `137482`
- `callStatic`: PASS
- no transaction signed or broadcast during preflight

## Authorization consumption

The one-time authorization was consumed by:

- tx: `0xbfa8dcb6b354eda7cf2cb1a428fc95e9a99e433d85e27e8b4a1cf8bf7249a65e`
- block: `23975010`
- nonce: `9`
- tx value: `0`
- receipt status: `1`

This authorization is now **CONSUMED**.

## Not authorized

This receipt does **not** authorize:

- `lockProviderOutput`
- `revealCanary`
- `resolveBatch`
- payout / withholding / breaker / refund
- any additional `commitBatch`
- any additional funding

All downstream protected actions require separate readiness checks and explicit authorization.
