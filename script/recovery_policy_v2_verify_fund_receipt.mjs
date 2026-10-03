#!/usr/bin/env node
import fs from "node:fs";
import { decodeFunctionResult, encodeFunctionData, getAddress } from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const contract = getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const authority = getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const txHash = "0x0135a9f0c0882bd64b8d2c0dd2cb22f79f48fa17aca82cad95153e8efebab348";
const v2PolicyId = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const v1PolicyId = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const v1BatchId = "0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";
const v1Commitment = "0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9";
const expectedInput = "0xbf14c119a32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";

async function rpc(method, params=[]) {
  const res=await fetch(rpcUrl,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  const body=await res.json();
  if(body.error) throw new Error(method+":"+JSON.stringify(body.error));
  return body.result;
}
async function call(name,args=[]) {
  const data=encodeFunctionData({abi:artifact.abi,functionName:name,args});
  const raw=await rpc("eth_call",[{to:contract,data},"latest"]);
  return decodeFunctionResult({abi:artifact.abi,functionName:name,data:raw});
}

const chainId=Number(BigInt(await rpc("eth_chainId")));
if(chainId!==5042) throw new Error("WRONG_CHAIN");

const tx=await rpc("eth_getTransactionByHash",[txHash]);
const receipt=await rpc("eth_getTransactionReceipt",[txHash]);
if(!tx || !receipt) throw new Error("TX_OR_RECEIPT_MISSING");
if(BigInt(receipt.status)!==1n) throw new Error("TX_NOT_SUCCESS");
if(getAddress(tx.from).toLowerCase()!==authority.toLowerCase()) throw new Error("FROM_MISMATCH");
if(!tx.to || getAddress(tx.to).toLowerCase()!==contract.toLowerCase()) throw new Error("TO_MISMATCH");
if(Number(BigInt(tx.nonce))!==11) throw new Error("NONCE_MISMATCH");
if(BigInt(tx.value)!==10000000000000000n) throw new Error("VALUE_MISMATCH");
if(tx.input.toLowerCase()!==expectedInput.toLowerCase()) throw new Error("CALLDATA_MISMATCH");

const p2=await call("getPolicy",[v2PolicyId]);
if(!p2.exists) throw new Error("V2_MISSING");
if(BigInt(p2.totalFunded)!==10000000000000000n) throw new Error("V2_FUNDED_MISMATCH");
if(BigInt(p2.fundedAt)===0n) throw new Error("V2_FUNDED_AT_ZERO");
if(p2.activeBatchId.toLowerCase()!=="0x"+"00".repeat(32)) throw new Error("V2_ACTIVE_BATCH_NOT_ZERO");

const p1=await call("getPolicy",[v1PolicyId]);
const b1=await call("getBatch",[v1PolicyId,v1BatchId]);
if(p1.activeBatchId.toLowerCase()!==v1BatchId.toLowerCase()) throw new Error("V1_ACTIVE_BATCH_DRIFT");
if(Number(b1.state)!==1) throw new Error("V1_STATE_DRIFT");
if(b1.commitment.toLowerCase()!==v1Commitment.toLowerCase()) throw new Error("V1_COMMITMENT_DRIFT");
if(BigInt(p1.totalFunded)!==10000000000000000n) throw new Error("V1_FUNDED_DRIFT");

const policyCount=BigInt(await call("policyCount"));
const liability=BigInt(await call("totalLiability"));
const custody=BigInt(await call("totalCustodyReceived"));
const released=BigInt(await call("totalValueReleased"));
const balance=BigInt(await rpc("eth_getBalance",[contract,"latest"]));
const pendingNonce=Number(BigInt(await rpc("eth_getTransactionCount",[authority,"pending"])));

if(policyCount!==2n) throw new Error("POLICY_COUNT_DRIFT");
if(liability!==20000000000000000n) throw new Error("LIABILITY_MISMATCH");
if(custody!==20000000000000000n) throw new Error("CUSTODY_MISMATCH");
if(released!==0n) throw new Error("RELEASED_MISMATCH");
if(balance!==20000000000000000n) throw new Error("BALANCE_MISMATCH");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_FUND_RECEIPT_V1",
  result:"PASS",
  chain_id:chainId,
  transaction:{
    hash:txHash,
    status:1,
    block_number:Number(BigInt(receipt.blockNumber)),
    from:getAddress(tx.from),
    to:getAddress(tx.to),
    nonce:Number(BigInt(tx.nonce)),
    value_wei:String(BigInt(tx.value)),
    gas_used:String(BigInt(receipt.gasUsed))
  },
  post_state:{
    authority_pending_nonce:pendingNonce,
    policy_count:String(policyCount),
    v2_total_funded_wei:String(p2.totalFunded),
    v2_funded_at_unix:String(p2.fundedAt),
    v2_active_batch_id:p2.activeBatchId,
    v1_total_funded_wei:String(p1.totalFunded),
    v1_batch_state:Number(b1.state),
    total_liability_wei:String(liability),
    total_custody_received_wei:String(custody),
    total_value_released_wei:String(released),
    contract_balance_wei:String(balance)
  }
},null,2));
