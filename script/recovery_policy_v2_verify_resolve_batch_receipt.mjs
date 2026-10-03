#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeEventLog,
  encodeFunctionData,
  getAddress,
  keccak256,
  decodeFunctionResult
} from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
const artifact=JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi=artifact.abi;

const CHAIN_ID=5042;
const TX_HASH="0x43c2d82be1016f9783ff14def12e01e7f6900051051c7aed8ec04ea033a765a5";
const CONTRACT=getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER=getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const RECIPIENT=getAddress("0x6B8ad09233dF44eD57B99aF8839129303955590C");
const POLICY_ID="0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID="0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const WORK_ID="0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
const EXPECTED_CALLDATA_HASH="0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320";
const PAYOUT=2000000000000000n;
const PROTECTED_REMAINDER=8000000000000000n;
const POST_LIABILITY=18000000000000000n;
const POST_CUSTODY=20000000000000000n;
const POST_RELEASED=2000000000000000n;
const POST_VAULT_BALANCE=18000000000000000n;

const V1_POLICY_ID="0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const V1_BATCH_ID="0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";

async function rpc(method,params=[]){
  const res=await fetch(rpcUrl,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  const body=await res.json();
  if(body.error) throw new Error(method+":"+JSON.stringify(body.error));
  return body.result;
}
async function call(name,args=[]){
  const data=encodeFunctionData({abi,functionName:name,args});
  const raw=await rpc("eth_call",[{to:CONTRACT,data},"latest"]);
  return decodeFunctionResult({abi,functionName:name,data:raw});
}

const chainId=Number(BigInt(await rpc("eth_chainId")));
if(chainId!==CHAIN_ID) throw new Error("CHAIN_ID_MISMATCH");

const tx=await rpc("eth_getTransactionByHash",[TX_HASH]);
const receipt=await rpc("eth_getTransactionReceipt",[TX_HASH]);
if(!tx||!receipt) throw new Error("TX_OR_RECEIPT_MISSING");
if(BigInt(receipt.status)!==1n) throw new Error("TX_NOT_SUCCESS");
if(getAddress(tx.from).toLowerCase()!==FUNDER.toLowerCase()) throw new Error("FROM_MISMATCH");
if(!tx.to||getAddress(tx.to).toLowerCase()!==CONTRACT.toLowerCase()) throw new Error("TO_MISMATCH");
if(Number(BigInt(tx.nonce))!==15) throw new Error("NONCE_MISMATCH");
if(BigInt(tx.value)!==0n) throw new Error("VALUE_MISMATCH");
if(!tx.input?.startsWith("0x3339f903")) throw new Error("SELECTOR_MISMATCH");
if(keccak256(tx.input).toLowerCase()!==EXPECTED_CALLDATA_HASH.toLowerCase()) throw new Error("CALLDATA_HASH_MISMATCH");

let batchResolved=null;
let paymentReleased=null;
for(const log of receipt.logs??[]){
  if(log.address.toLowerCase()!==CONTRACT.toLowerCase()) continue;
  try{
    const d=decodeEventLog({abi,data:log.data,topics:log.topics});
    if(d.eventName==="BatchResolved" &&
       d.args.policyId.toLowerCase()===POLICY_ID.toLowerCase() &&
       d.args.batchId.toLowerCase()===BATCH_ID.toLowerCase()) batchResolved=d.args;
    if(d.eventName==="PaymentReleased" &&
       d.args.policyId.toLowerCase()===POLICY_ID.toLowerCase() &&
       d.args.batchId.toLowerCase()===BATCH_ID.toLowerCase()) paymentReleased=d.args;
  }catch{}
}
if(!batchResolved) throw new Error("BATCH_RESOLVED_EVENT_MISSING");
if(!paymentReleased) throw new Error("PAYMENT_RELEASED_EVENT_MISSING");

if(batchResolved.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("RESOLVED_WORKID_MISMATCH");
if(batchResolved.passed!==true) throw new Error("RESOLVED_NOT_PASS");
if(Number(batchResolved.directive)!==1) throw new Error("RESOLVED_DIRECTIVE_NOT_PAY");
if(Number(batchResolved.failureCount)!==0) throw new Error("RESOLVED_FAILURE_COUNT_MISMATCH");
if(BigInt(batchResolved.protectedRemainder)!==PROTECTED_REMAINDER) throw new Error("RESOLVED_REMAINDER_MISMATCH");
if(BigInt(batchResolved.blockNumber)!==BigInt(receipt.blockNumber)) throw new Error("RESOLVED_BLOCK_MISMATCH");

if(paymentReleased.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("PAYMENT_WORKID_MISMATCH");
if(getAddress(paymentReleased.payoutRecipient).toLowerCase()!==RECIPIENT.toLowerCase()) throw new Error("PAYMENT_RECIPIENT_MISMATCH");
if(BigInt(paymentReleased.amount)!==PAYOUT) throw new Error("PAYMENT_AMOUNT_MISMATCH");
if(BigInt(paymentReleased.protectedRemainder)!==PROTECTED_REMAINDER) throw new Error("PAYMENT_REMAINDER_MISMATCH");
if(BigInt(paymentReleased.totalPaidOut)!==PAYOUT) throw new Error("PAYMENT_TOTAL_PAID_MISMATCH");
if(BigInt(paymentReleased.chainId)!==BigInt(CHAIN_ID)) throw new Error("PAYMENT_CHAIN_MISMATCH");
if(BigInt(paymentReleased.blockNumber)!==BigInt(receipt.blockNumber)) throw new Error("PAYMENT_BLOCK_MISMATCH");

const blockNum=BigInt(receipt.blockNumber);
const blockHex="0x"+blockNum.toString(16);
const prevBlockHex="0x"+(blockNum-1n).toString(16);
const recipientBefore=BigInt(await rpc("eth_getBalance",[RECIPIENT,prevBlockHex]));
const recipientAt=BigInt(await rpc("eth_getBalance",[RECIPIENT,blockHex]));
if(recipientAt-recipientBefore!==PAYOUT) throw new Error("RECIPIENT_BALANCE_DELTA_MISMATCH");

const [p2,b2,liability,custody,released,vaultBalance,p1,b1,pendingNonce]=await Promise.all([
  call("getPolicy",[POLICY_ID]),
  call("getBatch",[POLICY_ID,BATCH_ID]),
  call("totalLiability"),
  call("totalCustodyReceived"),
  call("totalValueReleased"),
  rpc("eth_getBalance",[CONTRACT,"latest"]).then(x=>BigInt(x)),
  call("getPolicy",[V1_POLICY_ID]),
  call("getBatch",[V1_POLICY_ID,V1_BATCH_ID]),
  rpc("eth_getTransactionCount",[FUNDER,"pending"]).then(x=>Number(BigInt(x)))
]);

if(Number(b2.state)!==4) throw new Error("V2_BATCH_NOT_RESOLVED");
if(Number(b2.directive)!==1) throw new Error("V2_DIRECTIVE_NOT_PAY");
if(p2.activeBatchId!=="0x"+"0".repeat(64)) throw new Error("V2_ACTIVE_BATCH_NOT_ZERO");
if(BigInt(p2.totalPaidOut)!==PAYOUT) throw new Error("V2_TOTAL_PAID_OUT_MISMATCH");
if(Number(p2.failureCount)!==0) throw new Error("V2_FAILURE_COUNT_DRIFT");
if(p2.paused) throw new Error("V2_POLICY_PAUSED");
if(BigInt(liability)!==POST_LIABILITY) throw new Error("LIABILITY_MISMATCH");
if(BigInt(custody)!==POST_CUSTODY) throw new Error("CUSTODY_MISMATCH");
if(BigInt(released)!==POST_RELEASED) throw new Error("RELEASED_MISMATCH");
if(vaultBalance!==POST_VAULT_BALANCE) throw new Error("VAULT_BALANCE_MISMATCH");
if(Number(b1.state)!==1) throw new Error("V1_STATE_DRIFT");
if(BigInt(p1.totalFunded)!==10000000000000000n) throw new Error("V1_FUNDED_DRIFT");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_RESOLVE_BATCH_RECEIPT_V1",
  result:"PASS",
  chain_id:chainId,
  transaction:{
    hash:TX_HASH,
    status:1,
    block_number:Number(blockNum),
    block_hash:receipt.blockHash,
    from:getAddress(tx.from),
    to:getAddress(tx.to),
    nonce:Number(BigInt(tx.nonce)),
    value_wei:String(BigInt(tx.value)),
    selector:tx.input.slice(0,10),
    calldata_keccak256:keccak256(tx.input),
    gas_used:String(BigInt(receipt.gasUsed)),
    effective_gas_price_wei:String(BigInt(receipt.effectiveGasPrice??tx.gasPrice??"0x0"))
  },
  events:{
    BatchResolved:{
      passed:true,
      directive:"PAY",
      failure_count:Number(batchResolved.failureCount),
      protected_remainder_wei:String(batchResolved.protectedRemainder),
      block_number:String(batchResolved.blockNumber)
    },
    PaymentReleased:{
      payout_recipient:getAddress(paymentReleased.payoutRecipient),
      amount_wei:String(paymentReleased.amount),
      protected_remainder_wei:String(paymentReleased.protectedRemainder),
      total_paid_out_wei:String(paymentReleased.totalPaidOut),
      block_number:String(paymentReleased.blockNumber)
    }
  },
  transfer_proof:{
    recipient_balance_before_wei:String(recipientBefore),
    recipient_balance_at_receipt_block_wei:String(recipientAt),
    recipient_balance_delta_wei:String(recipientAt-recipientBefore),
    payout_exact:true
  },
  post_state:{
    authority_pending_nonce:pendingNonce,
    v2_batch_state:"RESOLVED",
    v2_directive:"PAY",
    v2_active_batch_zero:true,
    v2_total_paid_out_wei:String(p2.totalPaidOut),
    v2_protected_remainder_wei:String(PROTECTED_REMAINDER),
    failure_count:Number(p2.failureCount),
    paused:p2.paused,
    total_liability_wei:String(liability),
    total_custody_received_wei:String(custody),
    total_value_released_wei:String(released),
    vault_balance_wei:String(vaultBalance),
    v1_batch_state:Number(b1.state),
    v1_total_funded_wei:String(p1.totalFunded)
  }
},null,2));
