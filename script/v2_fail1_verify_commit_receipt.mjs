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
const TX_HASH="0xeea6c2c806bedbc84b957d58b11f02f5c777c3817174c2c7a263a121dad5b0ef";
const CONTRACT=getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER=getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const POLICY="0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH="0xd26aeb0909d66737fcb5aee2e4475bc2b9c2b2a3a9182c328a07be46036cbbb3";
const COMMITMENT="0xc617f5fbc3ccfaaa179e43d9ec7e26d0f4c291303a434dd7cb8c2e756f9c1bc2";
const EXPECTED_CALLDATA_HASH="0xea31219120824695817911408f12d9d5a08b0ea2118c4aa90b1b88e7ff5aa440";
const ZERO32="0x"+"0".repeat(64);

const V1_POLICY="0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const V1_BATCH="0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";

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
if(chainId!==CHAIN_ID) throw new Error("CHAIN_MISMATCH");

const tx=await rpc("eth_getTransactionByHash",[TX_HASH]);
const receipt=await rpc("eth_getTransactionReceipt",[TX_HASH]);
if(!tx||!receipt) throw new Error("TX_OR_RECEIPT_MISSING");
if(BigInt(receipt.status)!==1n) throw new Error("TX_FAILED");
if(getAddress(tx.from).toLowerCase()!==FUNDER.toLowerCase()) throw new Error("FROM_MISMATCH");
if(!tx.to||getAddress(tx.to).toLowerCase()!==CONTRACT.toLowerCase()) throw new Error("TO_MISMATCH");
if(Number(BigInt(tx.nonce))!==16) throw new Error("NONCE_MISMATCH");
if(BigInt(tx.value)!==0n) throw new Error("VALUE_MISMATCH");
if(!tx.input.startsWith("0xcd29fa6c")) throw new Error("SELECTOR_MISMATCH");
if(keccak256(tx.input).toLowerCase()!==EXPECTED_CALLDATA_HASH.toLowerCase()) throw new Error("CALLDATA_HASH_MISMATCH");

let committed=null;
for(const log of receipt.logs??[]){
  if(log.address.toLowerCase()!==CONTRACT.toLowerCase()) continue;
  try{
    const d=decodeEventLog({abi,data:log.data,topics:log.topics});
    if(d.eventName==="BatchCommitted" &&
       d.args.policyId.toLowerCase()===POLICY.toLowerCase() &&
       d.args.batchId.toLowerCase()===BATCH.toLowerCase()){
      committed=d.args;
    }
  }catch{}
}
if(!committed) throw new Error("BATCH_COMMITTED_EVENT_MISSING");
if(committed.commitment.toLowerCase()!==COMMITMENT.toLowerCase()) throw new Error("EVENT_COMMITMENT_MISMATCH");
if(BigInt(committed.blockNumber)!==BigInt(receipt.blockNumber)) throw new Error("EVENT_BLOCK_MISMATCH");

const [p2,b2,remaining,liability,custody,released,vaultBalance,p1,b1,pendingNonce] = await Promise.all([
  call("getPolicy",[POLICY]),
  call("getBatch",[POLICY,BATCH]),
  call("remainingFor",[POLICY]),
  call("totalLiability"),
  call("totalCustodyReceived"),
  call("totalValueReleased"),
  rpc("eth_getBalance",[CONTRACT,"latest"]).then(BigInt),
  call("getPolicy",[V1_POLICY]),
  call("getBatch",[V1_POLICY,V1_BATCH]),
  rpc("eth_getTransactionCount",[FUNDER,"pending"]).then(x=>Number(BigInt(x)))
]);

if(p2.activeBatchId.toLowerCase()!==BATCH.toLowerCase()) throw new Error("ACTIVE_BATCH_MISMATCH");
if(Number(b2.state)!==1) throw new Error("BATCH_NOT_COMMITTED");
if(b2.commitment.toLowerCase()!==COMMITMENT.toLowerCase()) throw new Error("POST_COMMITMENT_MISMATCH");
if(b2.workId.toLowerCase()!==ZERO32.toLowerCase()) throw new Error("WORK_ID_NOT_ZERO_BEFORE_LOCK");
if(b2.inputHash.toLowerCase()!==ZERO32.toLowerCase()) throw new Error("INPUT_NOT_ZERO_BEFORE_LOCK");
if(b2.outputHash.toLowerCase()!==ZERO32.toLowerCase()) throw new Error("OUTPUT_NOT_ZERO_BEFORE_LOCK");
if(b2.expectedOutputHash.toLowerCase()!==ZERO32.toLowerCase()) throw new Error("EXPECTED_OUTPUT_NOT_ZERO_BEFORE_REVEAL");
if(Number(p2.failureCount)!==0 || Number(p2.maxFailures)!==2) throw new Error("FAILURE_STATE_DRIFT");
if(p2.paused || p2.closed || p2.refundIssued) throw new Error("POLICY_FLAGS_DRIFT");
if(BigInt(p2.totalFunded)!==10000000000000000n) throw new Error("FUNDED_DRIFT");
if(BigInt(p2.totalPaidOut)!==2000000000000000n) throw new Error("PAID_DRIFT");
if(BigInt(remaining)!==8000000000000000n) throw new Error("REMAINDER_DRIFT");
if(BigInt(liability)!==18000000000000000n) throw new Error("LIABILITY_DRIFT");
if(BigInt(custody)!==20000000000000000n) throw new Error("CUSTODY_DRIFT");
if(BigInt(released)!==2000000000000000n) throw new Error("RELEASED_DRIFT");
if(vaultBalance!==18000000000000000n) throw new Error("VAULT_BALANCE_DRIFT");
if(Number(b1.state)!==1 || BigInt(p1.totalFunded)!==10000000000000000n) throw new Error("V1_DRIFT");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_V2_FAIL1_COMMIT_BATCH_RECEIPT_V1",
  result:"PASS",
  chain_id:CHAIN_ID,
  transaction:{
    hash:TX_HASH,
    status:1,
    block_number:Number(BigInt(receipt.blockNumber)),
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
  event:{
    name:"BatchCommitted",
    policy_id:POLICY,
    batch_id:BATCH,
    commitment:COMMITMENT,
    block_number:String(committed.blockNumber)
  },
  post_state:{
    authority_pending_nonce:pendingNonce,
    batch_state:"COMMITTED",
    active_batch:BATCH,
    commitment:COMMITMENT,
    failure_count:Number(p2.failureCount),
    max_failures:Number(p2.maxFailures),
    protected_remainder_wei:String(remaining),
    total_liability_wei:String(liability),
    total_custody_received_wei:String(custody),
    total_value_released_wei:String(released),
    vault_balance_wei:String(vaultBalance),
    v1_batch_state:Number(b1.state),
    v1_total_funded_wei:String(p1.totalFunded)
  },
  authorization:{
    commitBatch:"CONSUMED",
    provider_signature:"NOT_AUTHORIZED",
    lockProviderOutput:"NOT_AUTHORIZED",
    revealCanary:"NOT_AUTHORIZED",
    resolveBatch:"NOT_AUTHORIZED"
  }
},null,2));
