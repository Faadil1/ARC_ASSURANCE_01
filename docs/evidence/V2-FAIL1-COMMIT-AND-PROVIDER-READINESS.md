# V2 FAIL #1 — commitBatch + Provider Readiness

Status: PROVEN through read-only/live receipts.

## commitBatch live

- tx: `0xeea6c2c806bedbc84b957d58b11f02f5c777c3817174c2c7a263a121dad5b0ef`
- block: `24121970`
- nonce: `16`
- calldata keccak256: `0xea31219120824695817911408f12d9d5a08b0ea2118c4aa90b1b88e7ff5aa440`
- receipt verification run: `37159252352`
- batch state: `Committed`
- failure count: `0`
- protected remainder: `0.008 native USDC`

## Controlled provider work

- workflow run: `37159361814`
- result: `PASS`
- execution: `REAL_COMPUTE`
- disclosed fault mode: `WRONG_AMOUNT_VALID`
- canonical output valid: `true`
- actual output hash:
  `0x0ffacfd286979a90d2f46a0bb1a747b256ab94b759932b7535921635b46b8451`
- actual output matches hidden expected: `false`
- provider signature created: `false`
- transaction sent: `false`

## Provider signature readiness

- workflow run: `37159513111`
- exact head: `6586a7698a5a6b0561eec62a93f379782f129073`
- signed application nonce: `2`
- deadline: `1792465200`
- exact EIP-712 digest:
  `0x08a4315192610f19fc395c7121133495ae717301ca0019cecc23fecad78ea43f`
- local digest = on-chain digest: `true`
- digest consumed: `false`
- workId used: `false`
- signature created: `false`

The hidden expected output and salt remain undisclosed.

The FAIL #1 provider signature remains separately human-authorized.
