# G2 Integrated AssuranceVault Deployment Receipt

**Status:** PROVEN  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0x00b06502ac70a1238b1127eab59a59253188d91af32606b701d38cda3a607272`
- block: `23909824`
- deployer: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- deployment nonce: `6`
- current pending nonce after deployment: `7`
- tx value: `0`
- status: `1 / SUCCESS`

## Contract

- address: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- runtime code bytes: `15618`
- exact init-code hash:
  `0x40792e0e0b7c8d2d213b318332e7aea59a5e87bed386e76054ee9164d3cd1e93`
- exact transaction init code matches canonical build: **true**

## Constructor bindings

- authority: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- expected chain id: `5042`
- Arc USDC interface: `0x3600000000000000000000000000000000000000`
- deployment spend cap: `50000000000000000` wei = **0.05 native USDC**

## Initial mutable state

- policyCount: `0`
- totalLiability: `0`
- totalCustodyReceived: `0`
- totalValueReleased: `0`
- contract balance: `0`

## Gas

- gas used: `3464938`
- effective gas price: `21500000000 wei/gas`
- effective deployment gas cost: **0.074496167 native USDC**

## Verification

GitHub Actions:

- workflow: `G2 Deployment Receipt`
- run: `37036958146`
- result: **SUCCESS**
- verification head: `84efcb9d67085f12f171988fa21e5ebff7c79b76`
- artifact id: `11241455626`
- artifact digest:
  `sha256:a502c42de338950a9f526c8ca1aeb37935a8d47ee7d7bfa8566fb99f316922d4`

Source continuity:

- human deployment helper was bound to preflight head
  `3cd45b6d687a00f423cf76ae5e8690b70fce54aa`;
- compare from that head to verification head changes only workflow / receipt-verifier /
  evidence files;
- no Solidity source, JavaScript product logic, constructor parameters or build inputs changed;
- reproducible-build run `37036958053` on verification head: **SUCCESS**.

## Truth boundary

This proves the integrated `AssuranceVault` deployment and exact constructor /
init-code binding on Arc Mainnet.

It does **not** prove:
- policy creation;
- policy funding;
- hidden precommit;
- provider output lock;
- reveal;
- deterministic resolve;
- PASS -> pay;
- FAIL -> no-pay;
- breaker -> refund;
- external user/operator evidence.

No downstream protected action is authorized by this receipt.
