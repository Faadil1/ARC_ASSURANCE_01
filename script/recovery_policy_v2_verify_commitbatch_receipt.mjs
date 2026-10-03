#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  keccak256,
} from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));

const CHAIN_ID = 5042;
const TX_HASH = "0x36d8d4dc972a2ef557d2a9eee38a5607e128eef01694d8620fef207befd61c07";
const CONTRACT = getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const AUTHORITY = getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const COMMITMENT = "0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17";
const EXPECTED_INPUT = "0xcd29fa6ca32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc873bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17";
const V1_POLICY_ID = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const V1_BATCH_ID = "0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";
const V1_COMMITMENT = "0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9";

async function rpc(method, params=[]) {
  const res = await fetch(rpcUrl,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  const body = await res.json();
  if(body.error) throw new Error(method+":"+JSON.stringify(body.error));
  return body.result;
}

async function call(name,args=[]) {
  const data = encodeFunctionData({abi:artifact.abi,functionName:name,args});
  const raw = await rpc("eth_call",[{to:CONTRACT,data},"latest"]);
  return decodeFunctionResult({abi:artifact.abi,functionName:name,data:raw});
}

const chainId = Number(BigInt(await rpc("eth_chainId")));
if(chainId!==CHAIN_ID) throw new Error("CHAIN_ID_MISMATCH");

const tx = await rpc("eth_getTransactionByHash",[TX_HASH]);
const receipt = await rpc("eth_getTransactionReceipt",[TX_HASH]);
if(!tx || !receipt) throw new Error("TX_OR_RECEIPT_MISSING");
if(BigInt(receipt.status)!==1n) throw new Error("TX_NOT_SUCCESS");
if(getAddress(tx.from).toLowerCase()!==AUTHORITY.toLowerCase()) throw new Error("FROM_MISMATCH");
if(!tx.to || getAddress(tx.to).toLowerCase()!==CONTRACT.toLowerCase()) throw new Error("TO_MISMATCH");
if(Number(BigInt(tx.nonce))!==12) throw new Error("NONCE_MISMATCH");
if(BigInt(tx.value)!==0n) throw new Error("VALUE_MISMATCH");
if(tx.input.toLowerCase()!==EXPECTED_INPUT.toLowerCase()) throw new Error("CALLDATA_MISMATCH");

let event = null;
for(const log of receipt.logs ?? []) {
  if(log.address.toLowerCase()!==CONTRACT.toLowerCase()) continue;
  try {
    const decoded = decodeEventLog({abi:artifact.abi,data:log.data,topics:log.topics});
    if(decoded.eventName==="BatchCommitted" &&
       decoded.args.policyId.toLowerCase()===POLICY_ID.toLowerCase() &&
       decoded.args.batchId.toLowerCase()===BATCH_ID.toLowerCase()) {
      event = decoded.args;
      break;
    }
  } catch {}
}
if(!event) throw new Error("BATCH_COMMITTED_EVENT_MISSING");
if(event.commitment.toLowerCase()!==COMMITMENT.toLowerCase()) throw new Error("EVENT_COMMITMENT_MISMATCH");
if(BigInt(event.blockNumber)!==BigInt(receipt.blockNumber)) throw new Error("EVENT_BLOCK_MISMATCH");

const p2 = await call("getPolicy",[POLICY_ID]);
const b2 = await call("getBatch",[POLICY_ID,BATCH_ID]);
if(p2.activeBatchId.toLowerCase()!==BATCH_ID.toLowerCase()) throw new Error("V2_ACTIVE_BATCH_MISMATCH");
if(Number(b2.state)!==1) throw new Error("V2_BATCH_NOT_COMMITTED");
if(b2.commitment.toLowerCase()!==COMMITMENT.toLowerCase()) throw new Error("V2_COMMITMENT_MISMATCH");

const p1 = await call("getPolicy",[V1_POLICY_ID]);
const b1 = await call("getBatch",[V1_POLICY_ID,V1_BATCH_ID]);
if(p1.activeBatchId.toLowerCase()!==V1_BATCH_ID.toLowerCase()) throw new Error("V1_ACTIVE_BATCH_DRIFT");
if(Number(b1.state)!==1) throw new Error("V1_BATCH_STATE_DRIFT");
if(b1.commitment.toLowerCase()!==V1_COMMITMENT.toLowerCase()) throw new Error("V1_COMMITMENT_DRIFT");
if(BigInt(p1.totalFunded)!==10000000000000000n) throw new Error("V1_FUNDED_DRIFT");

const liability = BigInt(await call("totalLiability"));
const custody = BigInt(await call("totalCustodyReceived"));
const released = BigInt(await call("totalValueReleased"));
const balance = BigInt(await rpc("eth_getBalance",[CONTRACT,"latest"]));
const pendingNonce = Number(BigInt(await rpc("eth_getTransactionCount",[AUTHORITY,"pending"])));

if(liability!==20000000000000000n) throw new Error("LIABILITY_DRIFT");
if(custody!==20000000000000000n) throw new Error("CUSTODY_DRIFT");
if(released!==0n) throw new Error("RELEASED_DRIFT");
if(balance!==20000000000000000n) throw new Error("BALANCE_DRIFT");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_COMMITBATCH_RECEIPT_V1",
  result:"PASS",
  chain_id:chainId,
  transaction:{
    hash:TX_HASH,
    status:1,
    block_number:Number(BigInt(receipt.blockNumber)),
    from:getAddress(tx.from),
    to:getAddress(tx.to),
    nonce:Number(BigInt(tx.nonce)),
    value_wei:String(BigInt(tx.value)),
    calldata_keccak256:keccak256(tx.input),
    gas_used:String(BigInt(receipt.gasUsed))
  },
  event:{
    name:"BatchCommitted",
    policy_id:event.policyId,
    batch_id:event.batchId,
    commitment:event.commitment,
    block_number:String(event.blockNumber)
  },
  post_state:{
    authority_pending_nonce:pendingNonce,
    v2_active_batch_id:p2.activeBatchId,
    v2_batch_state:Number(b2.state),
    v2_commitment:b2.commitment,
    v2_total_funded_wei:String(p2.totalFunded),
    v1_active_batch_id:p1.activeBatchId,
    v1_batch_state:Number(b1.state),
    v1_commitment:b1.commitment,
    v1_total_funded_wei:String(p1.totalFunded),
    total_liability_wei:String(liability),
    total_custody_received_wei:String(custody),
    total_value_released_wei:String(released),
    contract_balance_wei:String(balance)
  }
},null,2));
