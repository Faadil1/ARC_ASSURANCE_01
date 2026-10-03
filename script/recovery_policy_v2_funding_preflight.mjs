#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  keccak256,
} from "viem";

const [rpcUrl, configPath, artifactPath] = process.argv.slice(2);
if (!rpcUrl || !configPath || !artifactPath) {
  throw new Error("usage: recovery_policy_v2_funding_preflight.mjs <rpc> <config.json> <artifact.json>");
}

const cfg = JSON.parse(fs.readFileSync(configPath,"utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const contract = getAddress(cfg.contract);
const authority = getAddress(cfg.roles.authority);
const v1 = cfg.v1_stranded_policy;
const v2 = cfg.v2_policy;
const policyId = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const fundAmount = BigInt(v2.initial_fund_amount_wei);

async function rpc(method, params=[]) {
  const res = await fetch(rpcUrl,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

async function call(name,args=[]) {
  const data = encodeFunctionData({abi:artifact.abi,functionName:name,args});
  const raw = await rpc("eth_call",[{to:contract,data},"latest"]);
  return decodeFunctionResult({abi:artifact.abi,functionName:name,data:raw});
}

const chainId = Number(BigInt(await rpc("eth_chainId")));
if (chainId !== 5042) throw new Error(`WRONG_CHAIN:${chainId}`);

const code = await rpc("eth_getCode",[contract,"latest"]);
if (!code || ["0x","0x0","0x00"].includes(code)) throw new Error("NO_CONTRACT_CODE");

const onchainAuthority = getAddress(await call("authority"));
if (onchainAuthority.toLowerCase() !== authority.toLowerCase()) throw new Error("AUTHORITY_MISMATCH");

const policy = await call("getPolicy",[policyId]);
if (!policy.exists) throw new Error("V2_POLICY_DOES_NOT_EXIST");
if (getAddress(policy.funder).toLowerCase() !== authority.toLowerCase()) throw new Error("V2_FUNDER_AUTHORITY_MISMATCH");
if (getAddress(policy.provider).toLowerCase() !== getAddress(cfg.roles.provider).toLowerCase()) throw new Error("V2_PROVIDER_MISMATCH");
if (getAddress(policy.payoutRecipient).toLowerCase() !== getAddress(cfg.roles.payout_recipient).toLowerCase()) throw new Error("V2_PAYOUT_MISMATCH");
if (policy.scorerIdHash.toLowerCase() !== "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45") throw new Error("V2_SCORER_MISMATCH");
if (Number(policy.maxFailures) !== Number(v2.max_failures)) throw new Error("V2_MAX_FAILURES_MISMATCH");
if (BigInt(policy.maxSpendCap) !== BigInt(v2.max_spend_cap_wei)) throw new Error("V2_CAP_MISMATCH");
if (BigInt(policy.unitPayout) !== BigInt(v2.unit_payout_wei)) throw new Error("V2_UNIT_PAYOUT_MISMATCH");
if (BigInt(policy.expiry) !== BigInt(v2.expiry_unix)) throw new Error("V2_EXPIRY_MISMATCH");
if (policy.paused || policy.closed || policy.refundIssued) throw new Error("V2_POLICY_NOT_FUNDABLE");
if (BigInt(policy.fundedAt) !== 0n) throw new Error("V2_POLICY_ALREADY_FUNDED");
if (BigInt(policy.totalFunded) !== 0n || BigInt(policy.totalPaidOut) !== 0n || BigInt(policy.totalRefunded) !== 0n) {
  throw new Error("V2_UNEXPECTED_VALUE_STATE");
}
if (policy.activeBatchId.toLowerCase() !== "0x"+"00".repeat(32)) throw new Error("V2_ACTIVE_BATCH_ALREADY_PRESENT");

const oldPolicy = await call("getPolicy",[v1.policy_id]);
const oldBatch = await call("getBatch",[v1.policy_id,v1.batch_id]);
if (oldPolicy.activeBatchId.toLowerCase() !== v1.batch_id.toLowerCase()) throw new Error("V1_ACTIVE_BATCH_DRIFT");
if (Number(oldBatch.state) !== Number(v1.expected_batch_state)) throw new Error("V1_BATCH_STATE_DRIFT");
if (oldBatch.commitment.toLowerCase() !== v1.commitment.toLowerCase()) throw new Error("V1_COMMITMENT_DRIFT");
if (BigInt(oldPolicy.totalFunded) !== BigInt(v1.expected_total_funded_wei)) throw new Error("V1_FUNDED_DRIFT");

const block = await rpc("eth_getBlockByNumber",["latest",false]);
const nowTs = BigInt(block.timestamp);
if (BigInt(policy.expiry) <= nowTs) throw new Error("V2_POLICY_EXPIRED");

const policyCount = BigInt(await call("policyCount"));
const totalLiability = BigInt(await call("totalLiability"));
const totalCustodyReceived = BigInt(await call("totalCustodyReceived"));
const totalValueReleased = BigInt(await call("totalValueReleased"));
const deploymentCap = BigInt(await call("deploymentSpendCap"));
const contractBalance = BigInt(await rpc("eth_getBalance",[contract,"latest"]));

if (policyCount !== 2n) throw new Error(`POLICY_COUNT_DRIFT:${policyCount}`);
if (totalLiability !== 10000000000000000n) throw new Error("TOTAL_LIABILITY_DRIFT");
if (totalCustodyReceived !== 10000000000000000n) throw new Error("TOTAL_CUSTODY_DRIFT");
if (totalValueReleased !== 0n) throw new Error("TOTAL_VALUE_RELEASED_DRIFT");
if (contractBalance !== 10000000000000000n) throw new Error("VAULT_BALANCE_DRIFT");
if (deploymentCap !== 50000000000000000n) throw new Error("DEPLOYMENT_CAP_DRIFT");

if (fundAmount !== 10000000000000000n) throw new Error("UNEXPECTED_FUND_AMOUNT");
if (fundAmount > BigInt(policy.maxSpendCap)) throw new Error("FUND_AMOUNT_EXCEEDS_POLICY_CAP");
if (totalCustodyReceived + fundAmount > deploymentCap) throw new Error("DEPLOYMENT_CAP_WOULD_BE_EXCEEDED");

const data = encodeFunctionData({
  abi:artifact.abi,
  functionName:"fund",
  args:[policyId],
});

const pendingNonce = Number(BigInt(await rpc("eth_getTransactionCount",[authority,"pending"])));
const authorityBalance = BigInt(await rpc("eth_getBalance",[authority,"latest"]));
const gasPrice = BigInt(await rpc("eth_gasPrice"));
const estimateGas = BigInt(await rpc("eth_estimateGas",[{
  from:authority,
  to:contract,
  data,
  value:"0x"+fundAmount.toString(16),
}]));
const estimatedFee = estimateGas * gasPrice;
const totalRequired = fundAmount + estimatedFee;
if (authorityBalance < totalRequired) throw new Error("AUTHORITY_BALANCE_INSUFFICIENT");

const out = {
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_FUNDING_PREFLIGHT_V1",
  result:"PASS",
  chain_id:chainId,
  block_number:Number(BigInt(block.number)),
  block_timestamp:String(nowTs),
  contract_address:contract,
  authority_funder:authority,
  authority_pending_nonce:pendingNonce,
  authority_balance_wei:String(authorityBalance),
  v1_continuity:{
    policy_id:v1.policy_id,
    batch_id:v1.batch_id,
    batch_state:Number(oldBatch.state),
    commitment:oldBatch.commitment,
    total_funded_wei:String(oldPolicy.totalFunded),
  },
  v2_policy:{
    policy_id:policyId,
    funded_at_unix:String(policy.fundedAt),
    total_funded_wei:String(policy.totalFunded),
    max_spend_cap_wei:String(policy.maxSpendCap),
    unit_payout_wei:String(policy.unitPayout),
    expiry_unix:String(policy.expiry),
    active_batch_id:policy.activeBatchId,
  },
  vault_pre_state:{
    policy_count:String(policyCount),
    total_liability_wei:String(totalLiability),
    total_custody_received_wei:String(totalCustodyReceived),
    total_value_released_wei:String(totalValueReleased),
    contract_balance_wei:String(contractBalance),
    deployment_spend_cap_wei:String(deploymentCap),
  },
  transaction:{
    function:"fund(bytes32)",
    policy_id:policyId,
    tx_value_wei:String(fundAmount),
    calldata:data,
    calldata_keccak256:keccak256(data),
    estimate_gas_units:String(estimateGas),
    gas_price_wei:String(gasPrice),
    estimated_fee_wei:String(estimatedFee),
    estimated_total_wallet_outflow_wei:String(totalRequired),
  },
  expected_post_state_if_broadcast_successfully:{
    v2_total_funded_wei:String(fundAmount),
    total_liability_wei:String(totalLiability + fundAmount),
    total_custody_received_wei:String(totalCustodyReceived + fundAmount),
    contract_balance_wei:String(contractBalance + fundAmount),
    projected_remaining_deployment_capacity_wei:String(deploymentCap - totalCustodyReceived - fundAmount),
    v1_unchanged:true,
  },
  safety:{
    private_key_consumed:false,
    secret_consumed:false,
    transaction_signed:false,
    transaction_broadcast:false,
    funds_moved:false,
  },
  next_gate:"HUMAN_REVIEW_THEN_SEPARATE_FUND_AUTHORIZATION",
};
console.log(JSON.stringify(out,null,2));
