#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  keccak256,
} from "viem";

const [rpcUrl, planPath, artifactPath] = process.argv.slice(2);
if (!rpcUrl || !planPath || !artifactPath) {
  throw new Error("usage: recovery_policy_v2_precommit_preflight.mjs <rpc> <plan.json> <artifact.json>");
}

const plan = JSON.parse(fs.readFileSync(planPath,"utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const contract = getAddress(plan.contract);
const authority = getAddress(plan.authority_funder);

async function rpc(method, params=[]) {
  const res=await fetch(rpcUrl,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  const body=await res.json();
  if(body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

async function call(name,args=[]) {
  const data=encodeFunctionData({abi:artifact.abi,functionName:name,args});
  const raw=await rpc("eth_call",[{to:contract,data},"latest"]);
  return decodeFunctionResult({abi:artifact.abi,functionName:name,data:raw});
}

const chainId=Number(BigInt(await rpc("eth_chainId")));
if(chainId!==5042 || chainId!==Number(plan.chain_id)) throw new Error("CHAIN_ID_MISMATCH");

const code=await rpc("eth_getCode",[contract,"latest"]);
if(!code || code==="0x") throw new Error("CONTRACT_CODE_MISSING");

const p2=await call("getPolicy",[plan.policy_id]);
if(!p2.exists) throw new Error("V2_POLICY_MISSING");
if(getAddress(p2.funder).toLowerCase()!==authority.toLowerCase()) throw new Error("V2_FUNDER_MISMATCH");
if(p2.paused || p2.closed || p2.refundIssued) throw new Error("V2_POLICY_NOT_USABLE");
if(BigInt(p2.fundedAt)===0n) throw new Error("V2_NOT_FUNDED");
if(BigInt(p2.totalFunded)!==BigInt(plan.expected.v2_total_funded_wei)) throw new Error("V2_FUNDED_DRIFT");
if(BigInt(p2.unitPayout)!==BigInt(plan.expected.v2_unit_payout_wei)) throw new Error("V2_UNIT_PAYOUT_DRIFT");
if(p2.activeBatchId.toLowerCase()!=="0x"+"00".repeat(32)) throw new Error("V2_ACTIVE_BATCH_ALREADY_PRESENT");

const remaining=BigInt(await call("remainingFor",[plan.policy_id]));
if(remaining!==BigInt(plan.expected.v2_remaining_wei)) throw new Error("V2_REMAINING_DRIFT");
if(remaining<BigInt(p2.unitPayout)) throw new Error("V2_INSUFFICIENT_REMAINING");

const block=await rpc("eth_getBlockByNumber",["latest",false]);
const nowTs=BigInt(block.timestamp);
if(BigInt(p2.expiry)<=nowTs) throw new Error("V2_EXPIRED");

const v1=plan.v1_continuity;
const p1=await call("getPolicy",[v1.policy_id]);
const b1=await call("getBatch",[v1.policy_id,v1.batch_id]);
if(p1.activeBatchId.toLowerCase()!==v1.batch_id.toLowerCase()) throw new Error("V1_ACTIVE_BATCH_DRIFT");
if(Number(b1.state)!==Number(v1.batch_state)) throw new Error("V1_BATCH_STATE_DRIFT");
if(b1.commitment.toLowerCase()!==v1.commitment.toLowerCase()) throw new Error("V1_COMMITMENT_DRIFT");
if(BigInt(p1.totalFunded)!==BigInt(v1.total_funded_wei)) throw new Error("V1_FUNDED_DRIFT");

const policyCount=BigInt(await call("policyCount"));
const liability=BigInt(await call("totalLiability"));
const custody=BigInt(await call("totalCustodyReceived"));
const released=BigInt(await call("totalValueReleased"));
const balance=BigInt(await rpc("eth_getBalance",[contract,"latest"]));

if(policyCount!==BigInt(plan.expected.policy_count)) throw new Error("POLICY_COUNT_DRIFT");
if(liability!==BigInt(plan.expected.vault_total_liability_wei)) throw new Error("TOTAL_LIABILITY_DRIFT");
if(custody!==BigInt(plan.expected.vault_total_custody_received_wei)) throw new Error("TOTAL_CUSTODY_DRIFT");
if(released!==BigInt(plan.expected.vault_total_value_released_wei)) throw new Error("TOTAL_RELEASED_DRIFT");
if(balance!==BigInt(plan.expected.vault_balance_wei)) throw new Error("VAULT_BALANCE_DRIFT");

const calldata=encodeFunctionData({
  abi:artifact.abi,
  functionName:"commitBatch",
  args:[plan.policy_id,plan.batch_id,plan.commitment]
});
const calldataHash=keccak256(calldata);
const pendingNonce=Number(BigInt(await rpc("eth_getTransactionCount",[authority,"pending"])));
const authorityBalance=BigInt(await rpc("eth_getBalance",[authority,"latest"]));
const gasPrice=BigInt(await rpc("eth_gasPrice"));

await rpc("eth_call",[{
  from:authority,
  to:contract,
  data:calldata,
  value:"0x0"
},"latest"]);

const estimateGas=BigInt(await rpc("eth_estimateGas",[{
  from:authority,
  to:contract,
  data:calldata,
  value:"0x0"
}]));
const estimatedFee=estimateGas*gasPrice;
if(authorityBalance<estimatedFee) throw new Error("AUTHORITY_GAS_BALANCE_INSUFFICIENT");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_PRECOMMIT_PREFLIGHT_V1",
  result:"PASS",
  chain_id:chainId,
  block_number:Number(BigInt(block.number)),
  block_timestamp:String(nowTs),
  contract_address:contract,
  authority_funder:authority,
  authority_pending_nonce:pendingNonce,
  authority_balance_wei:String(authorityBalance),
  public_precommit:{
    policy_id:plan.policy_id,
    batch_id:plan.batch_id,
    commitment:plan.commitment
  },
  v2_pre_state:{
    exists:p2.exists,
    total_funded_wei:String(p2.totalFunded),
    remaining_wei:String(remaining),
    unit_payout_wei:String(p2.unitPayout),
    expiry_unix:String(p2.expiry),
    active_batch_id:p2.activeBatchId
  },
  v1_continuity:{
    active_batch_id:p1.activeBatchId,
    batch_state:Number(b1.state),
    commitment:b1.commitment,
    total_funded_wei:String(p1.totalFunded)
  },
  vault_pre_state:{
    policy_count:String(policyCount),
    total_liability_wei:String(liability),
    total_custody_received_wei:String(custody),
    total_value_released_wei:String(released),
    contract_balance_wei:String(balance)
  },
  commit_batch_preflight:{
    function:"commitBatch(bytes32,bytes32,bytes32)",
    tx_value_wei:"0",
    calldata,
    calldata_keccak256:calldataHash,
    eth_call_passed:true,
    eth_estimateGas_passed:true,
    estimate_gas_units:String(estimateGas),
    gas_price_wei:String(gasPrice),
    estimated_fee_wei:String(estimatedFee)
  },
  secret_boundary:{
    environment:plan.secret_boundary.environment,
    secret_name:plan.secret_boundary.secret_name,
    operator_reports_saved:plan.secret_boundary.operator_reports_saved,
    workflow_reads_secret:false
  },
  safety:{
    private_key_consumed:false,
    secret_consumed:false,
    transaction_signed:false,
    transaction_broadcast:false,
    funds_moved:false
  },
  next_gate:"HUMAN_REVIEW_THEN_SEPARATE_COMMITBATCH_AUTHORIZATION"
},null,2));
