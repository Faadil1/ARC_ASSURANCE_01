#!/usr/bin/env node
import fs from "node:fs";
import {
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  keccak256
} from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
if(!rpcUrl || !artifactPath) throw new Error("USAGE");
const artifact=JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi=artifact.abi;

const CHAIN_ID=5042;
const CONTRACT=getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER=getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const RECIPIENT=getAddress("0x6B8ad09233dF44eD57B99aF8839129303955590C");
const V2_POLICY="0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const V2_SUCCESS_BATCH="0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const V1_POLICY="0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const V1_BATCH="0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";

const client=createPublicClient({transport:http(rpcUrl)});
const chainId=await client.getChainId();
if(chainId!==CHAIN_ID) throw new Error("WRONG_CHAIN");

const latest=await client.getBlock({blockTag:"latest"});
const p2=await client.readContract({address:CONTRACT,abi,functionName:"getPolicy",args:[V2_POLICY]});
const b2=await client.readContract({address:CONTRACT,abi,functionName:"getBatch",args:[V2_POLICY,V2_SUCCESS_BATCH]});
const r2=await client.readContract({address:CONTRACT,abi,functionName:"remainingFor",args:[V2_POLICY]});

const p1=await client.readContract({address:CONTRACT,abi,functionName:"getPolicy",args:[V1_POLICY]});
const b1=await client.readContract({address:CONTRACT,abi,functionName:"getBatch",args:[V1_POLICY,V1_BATCH]});

const liability=await client.readContract({address:CONTRACT,abi,functionName:"totalLiability"});
const custody=await client.readContract({address:CONTRACT,abi,functionName:"totalCustodyReceived"});
const released=await client.readContract({address:CONTRACT,abi,functionName:"totalValueReleased"});
const vaultBalance=await client.getBalance({address:CONTRACT});
const pendingNonce=await client.getTransactionCount({address:FUNDER,blockTag:"pending"});

const ZERO="0x"+"0".repeat(64);

if(!p2.exists) throw new Error("V2_MISSING");
if(getAddress(p2.funder).toLowerCase()!==FUNDER.toLowerCase()) throw new Error("V2_FUNDER_DRIFT");
if(getAddress(p2.payoutRecipient).toLowerCase()!==RECIPIENT.toLowerCase()) throw new Error("V2_RECIPIENT_DRIFT");
if(Number(b2.state)!==4 || Number(b2.directive)!==1) throw new Error("V2_SUCCESS_BATCH_NOT_RESOLVED_PAY");
if(p2.activeBatchId.toLowerCase()!==ZERO.toLowerCase()) throw new Error("V2_ACTIVE_BATCH_NOT_ZERO");
if(BigInt(p2.totalFunded)!==10000000000000000n) throw new Error("V2_FUNDED_DRIFT");
if(BigInt(p2.totalPaidOut)!==2000000000000000n) throw new Error("V2_PAID_DRIFT");
if(BigInt(p2.totalRefunded)!==0n) throw new Error("V2_REFUND_DRIFT");
if(BigInt(r2)!==8000000000000000n) throw new Error("V2_REMAINDER_DRIFT");
if(Number(p2.failureCount)!==0 || Number(p2.maxFailures)!==2) throw new Error("V2_FAILURE_COUNTER_DRIFT");
if(p2.paused || p2.closed || p2.refundIssued) throw new Error("V2_POLICY_NOT_USABLE");
if(BigInt(p2.unitPayout)!==2000000000000000n) throw new Error("V2_UNIT_PAYOUT_DRIFT");
if(BigInt(p2.expiry)!==1792465200n) throw new Error("V2_EXPIRY_DRIFT");
if(latest.timestamp>BigInt(p2.expiry)) throw new Error("V2_ALREADY_EXPIRED");

if(!p1.exists || p1.activeBatchId.toLowerCase()!==V1_BATCH.toLowerCase()) throw new Error("V1_CONTINUITY_DRIFT");
if(Number(b1.state)!==1 || BigInt(p1.totalFunded)!==10000000000000000n) throw new Error("V1_STATE_DRIFT");

if(BigInt(liability)!==18000000000000000n) throw new Error("LIABILITY_DRIFT");
if(BigInt(custody)!==20000000000000000n) throw new Error("CUSTODY_DRIFT");
if(BigInt(released)!==2000000000000000n) throw new Error("RELEASED_DRIFT");
if(vaultBalance!==18000000000000000n) throw new Error("VAULT_BALANCE_DRIFT");

const refundData=encodeFunctionData({abi,functionName:"refundProtectedRemainder",args:[V2_POLICY]});

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_V2_LIVE_DEPTH_FAIL_BREAKER_READINESS_V1",
  result:"PASS",
  chain_id:CHAIN_ID,
  observed_block:latest.number.toString(),
  observed_timestamp:latest.timestamp.toString(),
  funder:FUNDER,
  pending_nonce:pendingNonce,
  v2:{
    policy_id:V2_POLICY,
    prior_success_batch_state:"RESOLVED",
    prior_success_directive:"PAY",
    active_batch_zero:true,
    total_funded_wei:String(p2.totalFunded),
    total_paid_out_wei:String(p2.totalPaidOut),
    protected_remainder_wei:String(r2),
    failure_count:Number(p2.failureCount),
    max_failures:Number(p2.maxFailures),
    paused:p2.paused,
    closed:p2.closed,
    refund_issued:p2.refundIssued,
    expiry_unix:String(p2.expiry),
    enough_liability_for_new_batch:BigInt(r2)>=BigInt(p2.unitPayout)
  },
  proposed_live_depth:{
    fail_1_expected_directive:"WITHHOLD",
    fail_1_expected_failure_count:1,
    fail_1_expected_payout_wei:"0",
    fail_2_expected_directive:"BREAKER",
    fail_2_expected_failure_count:2,
    fail_2_expected_payout_wei:"0",
    expected_remainder_after_breaker_wei:"8000000000000000",
    refund_after_breaker_expected_eligible:true,
    refund_candidate_calldata_keccak256:keccak256(refundData)
  },
  vault:{
    total_liability_wei:String(liability),
    total_custody_received_wei:String(custody),
    total_value_released_wei:String(released),
    balance_wei:String(vaultBalance)
  },
  v1_continuity:{
    state:"COMMITTED",
    total_funded_wei:String(p1.totalFunded)
  },
  authorization:{
    commitBatch:"NOT_AUTHORIZED",
    provider_signature:"NOT_AUTHORIZED",
    lockProviderOutput:"NOT_AUTHORIZED",
    revealCanary:"NOT_AUTHORIZED",
    resolveBatch:"NOT_AUTHORIZED",
    refundProtectedRemainder:"NOT_AUTHORIZED"
  },
  transaction_sent:false
},null,2));
