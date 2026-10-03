#!/usr/bin/env node
import fs from "node:fs";
import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  http,
  keccak256
} from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
const artifact=JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi=artifact.abi;

const CHAIN_ID=5042;
const CONTRACT=getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER=getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const PAYOUT_RECIPIENT=getAddress("0x6B8ad09233dF44eD57B99aF8839129303955590C");
const POLICY_ID="0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID="0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const WORK_ID="0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
const LOCKED_OUTPUT_HASH="0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
const CANARY_KEY="0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574";

const EXPECTED_UNIT_PAYOUT=2000000000000000n;
const EXPECTED_V2_FUNDED=10000000000000000n;
const EXPECTED_TOTAL_LIABILITY=20000000000000000n;
const EXPECTED_TOTAL_CUSTODY=20000000000000000n;
const EXPECTED_TOTAL_RELEASED=0n;
const EXPECTED_VAULT_BALANCE=20000000000000000n;

const client=createPublicClient({transport:http(rpcUrl)});
const chainId=await client.getChainId();
if(chainId!==CHAIN_ID) throw new Error("WRONG_CHAIN");

const block=await client.getBlock({blockTag:"latest"});
const [policy,batch,canaryUsed,pendingNonce,funderBalance,recipientBalance,liability,custody,released,vaultBalance]=await Promise.all([
  client.readContract({address:CONTRACT,abi,functionName:"getPolicy",args:[POLICY_ID]}),
  client.readContract({address:CONTRACT,abi,functionName:"getBatch",args:[POLICY_ID,BATCH_ID]}),
  client.readContract({address:CONTRACT,abi,functionName:"canaryKeyUsed",args:[CANARY_KEY]}),
  client.getTransactionCount({address:FUNDER,blockTag:"pending"}),
  client.getBalance({address:FUNDER}),
  client.getBalance({address:PAYOUT_RECIPIENT}),
  client.readContract({address:CONTRACT,abi,functionName:"totalLiability"}),
  client.readContract({address:CONTRACT,abi,functionName:"totalCustodyReceived"}),
  client.readContract({address:CONTRACT,abi,functionName:"totalValueReleased"}),
  client.getBalance({address:CONTRACT})
]);

if(!policy.exists || policy.paused || policy.closed || policy.refundIssued) throw new Error("POLICY_NOT_USABLE");
if(getAddress(policy.funder).toLowerCase()!==FUNDER.toLowerCase()) throw new Error("FUNDER_DRIFT");
if(getAddress(policy.payoutRecipient).toLowerCase()!==PAYOUT_RECIPIENT.toLowerCase()) throw new Error("RECIPIENT_DRIFT");
if(policy.activeBatchId.toLowerCase()!==BATCH_ID.toLowerCase()) throw new Error("ACTIVE_BATCH_DRIFT");
if(block.timestamp>policy.expiry) throw new Error("POLICY_EXPIRED");
if(BigInt(policy.unitPayout)!==EXPECTED_UNIT_PAYOUT) throw new Error("UNIT_PAYOUT_DRIFT");
if(BigInt(policy.totalFunded)!==EXPECTED_V2_FUNDED) throw new Error("V2_FUNDED_DRIFT");
if(BigInt(policy.totalPaidOut)!==0n) throw new Error("V2_PAID_OUT_DRIFT");
if(Number(policy.failureCount)!==0) throw new Error("FAILURE_COUNT_DRIFT");

if(Number(batch.state)!==3) throw new Error("BATCH_NOT_REVEALED");
if(batch.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("WORKID_DRIFT");
if(batch.outputHash.toLowerCase()!==LOCKED_OUTPUT_HASH.toLowerCase()) throw new Error("LOCKED_OUTPUT_DRIFT");
if(batch.outputHash.toLowerCase()!==batch.expectedOutputHash.toLowerCase()) throw new Error("DETERMINISTIC_PASS_NOT_TRUE");
if(!canaryUsed) throw new Error("CANARY_KEY_NOT_USED");

if(BigInt(liability)!==EXPECTED_TOTAL_LIABILITY) throw new Error("LIABILITY_DRIFT");
if(BigInt(custody)!==EXPECTED_TOTAL_CUSTODY) throw new Error("CUSTODY_DRIFT");
if(BigInt(released)!==EXPECTED_TOTAL_RELEASED) throw new Error("RELEASED_DRIFT");
if(vaultBalance!==EXPECTED_VAULT_BALANCE) throw new Error("VAULT_BALANCE_DRIFT");

const calldata=encodeFunctionData({
  abi,
  functionName:"resolveBatch",
  args:[POLICY_ID,BATCH_ID]
});
const calldataHash=keccak256(calldata);

const callResult=await client.call({
  account:FUNDER,
  to:CONTRACT,
  data:calldata,
  value:0n
});
const directive=decodeFunctionResult({
  abi,
  functionName:"resolveBatch",
  data:callResult.data
});
if(Number(directive)!==1) throw new Error("ETH_CALL_NOT_PAY");

const gasEstimate=await client.estimateGas({
  account:FUNDER,
  to:CONTRACT,
  data:calldata,
  value:0n
});
const gasPrice=await client.getGasPrice();
const estimatedFee=gasEstimate*gasPrice;

const expectedProtectedRemainder=EXPECTED_V2_FUNDED-EXPECTED_UNIT_PAYOUT;
const expectedPostLiability=EXPECTED_TOTAL_LIABILITY-EXPECTED_UNIT_PAYOUT;
const expectedPostReleased=EXPECTED_TOTAL_RELEASED+EXPECTED_UNIT_PAYOUT;
const expectedPostVaultBalance=EXPECTED_VAULT_BALANCE-EXPECTED_UNIT_PAYOUT;
const expectedRecipientBalance=recipientBalance+EXPECTED_UNIT_PAYOUT;

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_RESOLVE_BATCH_PREFLIGHT_V1",
  result:"PASS",
  chain_id:CHAIN_ID,
  observed_block:block.number.toString(),
  observed_timestamp:block.timestamp.toString(),
  contract:CONTRACT,
  proposed_sender:FUNDER,
  sender_pending_nonce:pendingNonce,
  sender_balance_wei:funderBalance.toString(),
  payout_recipient:PAYOUT_RECIPIENT,
  payout_recipient_balance_before_wei:recipientBalance.toString(),
  policy_id:POLICY_ID,
  batch_id:BATCH_ID,
  work_id:WORK_ID,
  batch_state:"REVEALED",
  deterministic_match:true,
  expected_directive:"PAY",
  expected_directive_value:1,
  unit_payout_wei:EXPECTED_UNIT_PAYOUT.toString(),
  protected_remainder_after_wei:expectedProtectedRemainder.toString(),
  tx_value_wei:"0",
  calldata,
  calldata_keccak256:calldataHash,
  eth_call_passed:true,
  eth_call_directive:"PAY",
  eth_estimateGas_passed:true,
  gas_estimate:gasEstimate.toString(),
  gas_price_wei:gasPrice.toString(),
  estimated_fee_wei:estimatedFee.toString(),
  expected_post_state:{
    v2_batch_state:"RESOLVED",
    v2_directive:"PAY",
    v2_active_batch_zero:true,
    v2_total_paid_out_wei:EXPECTED_UNIT_PAYOUT.toString(),
    v2_protected_remainder_wei:expectedProtectedRemainder.toString(),
    failure_count:0,
    paused:false,
    total_liability_wei:expectedPostLiability.toString(),
    total_custody_received_wei:EXPECTED_TOTAL_CUSTODY.toString(),
    total_value_released_wei:expectedPostReleased.toString(),
    vault_balance_wei:expectedPostVaultBalance.toString(),
    payout_recipient_balance_expected_wei:expectedRecipientBalance.toString()
  },
  protected_actions:{
    resolveBatch:"NOT_AUTHORIZED"
  }
},null,2));
