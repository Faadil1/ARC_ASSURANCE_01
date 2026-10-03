#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  keccak256,
} from "viem";

const [rpcUrl, specPath, artifactPath] = process.argv.slice(2);
if (!rpcUrl || !specPath || !artifactPath) {
  throw new Error("usage: g2_verify_funding_receipt.mjs <rpc> <spec.json> <artifact.json>");
}

const spec = JSON.parse(fs.readFileSync(specPath,"utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));

async function rpc(method, params=[]) {
  const res = await fetch(rpcUrl,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

const lower = x => String(x).toLowerCase();
const chainId = Number(BigInt(await rpc("eth_chainId")));
if (chainId !== 5042 || chainId !== Number(spec.chain_id)) throw new Error("CHAIN_ID_MISMATCH");

const txHash = lower(spec.transaction_hash);
const tx = await rpc("eth_getTransactionByHash",[txHash]);
const receipt = await rpc("eth_getTransactionReceipt",[txHash]);
if (!tx) throw new Error("TRANSACTION_NOT_FOUND");
if (!receipt) throw new Error("RECEIPT_NOT_FOUND");
if (BigInt(receipt.status) !== 1n) throw new Error("TRANSACTION_REVERTED");

const contract = getAddress(spec.contract_address);
const authority = getAddress(spec.expected_authority);

if (!tx.to || lower(getAddress(tx.to)) !== lower(contract)) throw new Error("WRONG_TARGET_CONTRACT");
if (lower(getAddress(tx.from)) !== lower(authority)) throw new Error("WRONG_AUTHORITY");
if (Number(BigInt(tx.nonce)) !== Number(spec.expected_nonce)) throw new Error("NONCE_MISMATCH");
if (BigInt(tx.value) !== BigInt(spec.expected_value_wei)) throw new Error("VALUE_MISMATCH");

const decoded = decodeFunctionData({abi:artifact.abi,data:tx.input});
if (decoded.functionName !== "fund") throw new Error(`WRONG_FUNCTION:${decoded.functionName}`);
if (lower(decoded.args[0]) !== lower(spec.policy_id)) throw new Error("POLICY_ID_MISMATCH");

const expectedCalldata = encodeFunctionData({
  abi:artifact.abi,
  functionName:"fund",
  args:[spec.policy_id],
});
if (lower(tx.input) !== lower(expectedCalldata)) throw new Error("CALLDATA_MISMATCH");

const getPolicyData = encodeFunctionData({
  abi:artifact.abi,
  functionName:"getPolicy",
  args:[spec.policy_id],
});
const rawPolicy = await rpc("eth_call",[{to:contract,data:getPolicyData},"latest"]);
const policy = decodeFunctionResult({
  abi:artifact.abi,
  functionName:"getPolicy",
  data:rawPolicy,
});

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
const expected = BigInt(spec.expected_value_wei);

if (!policy.exists) throw new Error("POLICY_NOT_FOUND_AFTER_FUNDING");
if (lower(getAddress(policy.funder)) !== lower(authority)) throw new Error("FUNDER_MISMATCH");
if (BigInt(policy.fundedAt) === 0n) throw new Error("FUNDED_AT_NOT_SET");
if (BigInt(policy.totalFunded) !== expected) throw new Error("TOTAL_FUNDED_MISMATCH");
if (BigInt(policy.totalPaidOut) !== 0n) throw new Error("UNEXPECTED_PAID_OUT");
if (BigInt(policy.totalRefunded) !== 0n) throw new Error("UNEXPECTED_REFUNDED");
if (policy.paused || policy.closed || policy.refundIssued) throw new Error("UNEXPECTED_POLICY_FLAGS");
if (lower(policy.activeBatchId) !== "0x"+"00".repeat(32)) throw new Error("ACTIVE_BATCH_ALREADY_PRESENT");

if (policyCount !== 1n) throw new Error(`POLICY_COUNT_MISMATCH:${policyCount}`);
if (totalLiability !== expected) throw new Error("LIABILITY_MISMATCH");
if (totalCustodyReceived !== expected) throw new Error("CUSTODY_RECEIVED_MISMATCH");
if (totalValueReleased !== 0n) throw new Error("UNEXPECTED_VALUE_RELEASED");
if (contractBalance !== expected) throw new Error("CONTRACT_BALANCE_MISMATCH");

const pendingNonce = Number(BigInt(await rpc("eth_getTransactionCount",[authority,"pending"])));
if (pendingNonce < Number(spec.expected_nonce)+1) throw new Error("NONCE_NOT_CONSUMED");

const effectiveGasPrice = BigInt(receipt.effectiveGasPrice ?? "0x0");
const gasUsed = BigInt(receipt.gasUsed);
const fee = gasUsed * effectiveGasPrice;

const out = {
  schema:"ARC_ASSURANCE_G2_FUNDING_RECEIPT_V1",
  chain_id:chainId,
  transaction_hash:txHash,
  transaction_status:1,
  block_number:Number(BigInt(receipt.blockNumber)),
  authority,
  nonce:Number(spec.expected_nonce),
  current_pending_nonce:pendingNonce,
  contract_address:contract,
  function_name:decoded.functionName,
  policy_id:spec.policy_id,
  tx_value_wei:String(BigInt(tx.value)),
  calldata_keccak256:keccak256(tx.input),
  gas_used:String(gasUsed),
  effective_gas_price_wei:String(effectiveGasPrice),
  effective_fee_wei:String(fee),
  policy:{
    funded_at_unix:String(policy.fundedAt),
    total_funded_wei:String(policy.totalFunded),
    total_paid_out_wei:String(policy.totalPaidOut),
    total_refunded_wei:String(policy.totalRefunded),
    active_batch_id:policy.activeBatchId,
    paused:policy.paused,
    closed:policy.closed,
    refund_issued:policy.refundIssued,
    exists:policy.exists
  },
  vault:{
    policy_count:String(policyCount),
    total_liability_wei:String(totalLiability),
    total_custody_received_wei:String(totalCustodyReceived),
    total_value_released_wei:String(totalValueReleased),
    contract_balance_wei:String(contractBalance)
  },
  receipt_verified:true,
  safety:{
    private_key_consumed:false,
    transaction_signed_by_verifier:false,
    transaction_broadcast_by_verifier:false,
    funds_moved_by_verifier:false
  }
};

console.log(JSON.stringify(out,null,2));
