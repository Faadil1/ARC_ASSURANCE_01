#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  keccak256,
} from "viem";

const [rpcUrl, configPath, artifactPath, contractAddress] = process.argv.slice(2);
if (!rpcUrl || !configPath || !artifactPath || !contractAddress) {
  throw new Error("usage: g2_funding_preflight.mjs <rpc> <config.json> <artifact.json> <contract>");
}

const cfg = JSON.parse(fs.readFileSync(configPath,"utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const p = cfg.integrated;
const contract = getAddress(contractAddress);
const authority = getAddress(p.authority_address);
const policyId = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const fundAmount = BigInt(p.initial_fund_amount_wei);

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

const chainId = Number(BigInt(await rpc("eth_chainId")));
if (chainId !== 5042) throw new Error(`WRONG_CHAIN:${chainId}`);

const code = await rpc("eth_getCode",[contract,"latest"]);
if (!code || ["0x","0x0","0x00"].includes(code)) throw new Error("NO_CONTRACT_CODE");

const getPolicyData = encodeFunctionData({
  abi:artifact.abi,
  functionName:"getPolicy",
  args:[policyId],
});
const rawPolicy = await rpc("eth_call",[{to:contract,data:getPolicyData},"latest"]);
const policy = decodeFunctionResult({
  abi:artifact.abi,
  functionName:"getPolicy",
  data:rawPolicy,
});

if (!policy.exists) throw new Error("POLICY_DOES_NOT_EXIST");
if (getAddress(policy.funder).toLowerCase() !== authority.toLowerCase()) throw new Error("FUNDER_AUTHORITY_MISMATCH");
if (policy.paused || policy.closed || policy.refundIssued) throw new Error("POLICY_NOT_FUNDABLE");
if (BigInt(policy.fundedAt) !== 0n) throw new Error("POLICY_ALREADY_FUNDED");
if (BigInt(policy.totalFunded) !== 0n || BigInt(policy.totalPaidOut) !== 0n || BigInt(policy.totalRefunded) !== 0n) {
  throw new Error("UNEXPECTED_POLICY_VALUE_STATE");
}
if (policy.activeBatchId.toLowerCase() !== "0x"+"00".repeat(32)) throw new Error("ACTIVE_BATCH_ALREADY_PRESENT");

const block = await rpc("eth_getBlockByNumber",["latest",false]);
const nowTs = BigInt(block.timestamp);
if (BigInt(policy.expiry) <= nowTs) throw new Error("POLICY_EXPIRED");

if (fundAmount <= 0n) throw new Error("BAD_FUND_AMOUNT");
if (fundAmount > BigInt(policy.maxSpendCap)) throw new Error("FUND_AMOUNT_EXCEEDS_POLICY_CAP");

const call0 = async (name) => {
  const data = encodeFunctionData({abi:artifact.abi,functionName:name});
  const raw = await rpc("eth_call",[{to:contract,data},"latest"]);
  return BigInt(decodeFunctionResult({abi:artifact.abi,functionName:name,data:raw}));
};

const policyCount = await call0("policyCount");
const totalLiability = await call0("totalLiability");
const totalCustodyReceived = await call0("totalCustodyReceived");
const totalValueReleased = await call0("totalValueReleased");
const contractBalance = BigInt(await rpc("eth_getBalance",[contract,"latest"]));

if (policyCount !== 1n) throw new Error(`POLICY_COUNT_MISMATCH:${policyCount}`);
if (totalLiability !== 0n || totalCustodyReceived !== 0n || totalValueReleased !== 0n || contractBalance !== 0n) {
  throw new Error("VAULT_NOT_EMPTY_BEFORE_FIRST_FUNDING");
}

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
  schema:"ARC_ASSURANCE_G2_FUNDING_PREFLIGHT_V1",
  chain_id:chainId,
  block_number:Number(BigInt(block.number)),
  block_timestamp:String(nowTs),
  contract_address:contract,
  authority_funder:authority,
  authority_pending_nonce:pendingNonce,
  authority_balance_wei:String(authorityBalance),
  policy:{
    policy_id:policyId,
    exists:policy.exists,
    funded_at_unix:String(policy.fundedAt),
    total_funded_wei:String(policy.totalFunded),
    total_paid_out_wei:String(policy.totalPaidOut),
    total_refunded_wei:String(policy.totalRefunded),
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
    total_funded_wei:String(fundAmount),
    total_liability_wei:String(fundAmount),
    total_custody_received_wei:String(fundAmount),
    contract_balance_wei:String(fundAmount),
    funded_at_becomes_nonzero:true,
  },
  verified:true,
  safety:{
    private_key_consumed:false,
    transaction_signed:false,
    transaction_broadcast:false,
    funds_moved:false,
  },
};

console.log(JSON.stringify(out,null,2));
