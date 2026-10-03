#!/usr/bin/env node
import fs from "node:fs";
import { decodeFunctionResult, encodeFunctionData, getAddress } from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const contract = getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const authority = getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const v1PolicyId = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const v1BatchId = "0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";
const v2PolicyId = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";

async function rpc(method, params=[]) {
  const res = await fetch(rpcUrl,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
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
const p2=await call("getPolicy",[v2PolicyId]);
const p1=await call("getPolicy",[v1PolicyId]);
const b1=await call("getBatch",[v1PolicyId,v1BatchId]);
const policyCount=BigInt(await call("policyCount"));
const liability=BigInt(await call("totalLiability"));
const received=BigInt(await call("totalCustodyReceived"));
const released=BigInt(await call("totalValueReleased"));
const balance=BigInt(await rpc("eth_getBalance",[contract,"latest"]));
const pendingNonce=Number(BigInt(await rpc("eth_getTransactionCount",[authority,"pending"])));
const out={
  chain_id:chainId,
  policy_count:String(policyCount),
  authority_pending_nonce:pendingNonce,
  v2:{
    exists:p2.exists,
    funder:p2.funder,
    provider:p2.provider,
    payout_recipient:p2.payoutRecipient,
    scorer_id_hash:p2.scorerIdHash,
    max_failures:Number(p2.maxFailures),
    max_spend_cap_wei:String(p2.maxSpendCap),
    unit_payout_wei:String(p2.unitPayout),
    expiry_unix:String(p2.expiry),
    funded_at_unix:String(p2.fundedAt),
    total_funded_wei:String(p2.totalFunded),
    active_batch_id:p2.activeBatchId
  },
  v1:{
    active_batch_id:p1.activeBatchId,
    batch_state:Number(b1.state),
    commitment:b1.commitment,
    total_funded_wei:String(p1.totalFunded)
  },
  vault:{
    total_liability_wei:String(liability),
    total_custody_received_wei:String(received),
    total_value_released_wei:String(released),
    contract_balance_wei:String(balance)
  }
};
console.log(JSON.stringify(out,null,2));
