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
  throw new Error("usage: g2_verify_policy_creation_receipt.mjs <rpc> <spec.json> <artifact.json>");
}

const spec = JSON.parse(fs.readFileSync(specPath,"utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));

async function rpc(method, params=[]) {
  const res = await fetch(rpcUrl, {
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
if (BigInt(tx.value) !== BigInt(spec.expected_tx_value_wei)) throw new Error("TX_VALUE_MISMATCH");

const decoded = decodeFunctionData({abi:artifact.abi,data:tx.input});
if (decoded.functionName !== "createPolicy") throw new Error(`WRONG_FUNCTION:${decoded.functionName}`);

const expected = spec.policy;
const args = decoded.args;
const checks = [
  [lower(args[0]), lower(expected.policy_id), "POLICY_ID"],
  [lower(getAddress(args[1])), lower(getAddress(expected.funder)), "FUNDER"],
  [lower(getAddress(args[2])), lower(getAddress(expected.provider)), "PROVIDER"],
  [lower(getAddress(args[3])), lower(getAddress(expected.payout_recipient)), "PAYOUT_RECIPIENT"],
  [lower(args[4]), lower(expected.scorer_id_hash), "SCORER_ID_HASH"],
  [String(args[5]), String(expected.max_failures), "MAX_FAILURES"],
  [String(args[6]), String(expected.max_spend_cap_wei), "MAX_SPEND_CAP"],
  [String(args[7]), String(expected.unit_payout_wei), "UNIT_PAYOUT"],
  [String(args[8]), String(expected.expiry_unix), "EXPIRY"],
];
for (const [actual, exp, name] of checks) {
  if (actual !== exp) throw new Error(`${name}_MISMATCH:${actual}!=${exp}`);
}

const policyId = expected.policy_id;
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

const policyCountData = encodeFunctionData({abi:artifact.abi,functionName:"policyCount"});
const rawPolicyCount = await rpc("eth_call",[{to:contract,data:policyCountData},"latest"]);
const policyCount = BigInt(decodeFunctionResult({abi:artifact.abi,functionName:"policyCount",data:rawPolicyCount}));

const call0 = async (name) => {
  const data = encodeFunctionData({abi:artifact.abi,functionName:name});
  const raw = await rpc("eth_call",[{to:contract,data},"latest"]);
  return BigInt(decodeFunctionResult({abi:artifact.abi,functionName:name,data:raw}));
};

const totalLiability = await call0("totalLiability");
const totalCustodyReceived = await call0("totalCustodyReceived");
const totalValueReleased = await call0("totalValueReleased");
const contractBalance = BigInt(await rpc("eth_getBalance",[contract,"latest"]));

const p = policy;
if (lower(getAddress(p.funder)) !== lower(getAddress(expected.funder))) throw new Error("ONCHAIN_FUNDER_MISMATCH");
if (lower(getAddress(p.provider)) !== lower(getAddress(expected.provider))) throw new Error("ONCHAIN_PROVIDER_MISMATCH");
if (lower(getAddress(p.payoutRecipient)) !== lower(getAddress(expected.payout_recipient))) throw new Error("ONCHAIN_PAYOUT_MISMATCH");
if (lower(p.scorerIdHash) !== lower(expected.scorer_id_hash)) throw new Error("ONCHAIN_SCORER_MISMATCH");
if (String(p.maxFailures) !== String(expected.max_failures)) throw new Error("ONCHAIN_MAX_FAILURES_MISMATCH");
if (String(p.failureCount) !== "0") throw new Error("UNEXPECTED_FAILURE_COUNT");
if (String(p.maxSpendCap) !== String(expected.max_spend_cap_wei)) throw new Error("ONCHAIN_CAP_MISMATCH");
if (String(p.unitPayout) !== String(expected.unit_payout_wei)) throw new Error("ONCHAIN_UNIT_PAYOUT_MISMATCH");
if (String(p.expiry) !== String(expected.expiry_unix)) throw new Error("ONCHAIN_EXPIRY_MISMATCH");
if (String(p.fundedAt) !== "0") throw new Error("POLICY_ALREADY_FUNDED");
if (String(p.totalFunded) !== "0" || String(p.totalPaidOut) !== "0" || String(p.totalRefunded) !== "0") throw new Error("UNEXPECTED_POLICY_VALUE_STATE");
if (p.paused || p.closed || p.refundIssued || !p.exists) throw new Error("UNEXPECTED_POLICY_FLAGS");
if (lower(p.activeBatchId) !== "0x"+"00".repeat(32)) throw new Error("ACTIVE_BATCH_ALREADY_PRESENT");

if (policyCount !== 1n) throw new Error(`POLICY_COUNT_MISMATCH:${policyCount}`);
if (totalLiability !== 0n || totalCustodyReceived !== 0n || totalValueReleased !== 0n || contractBalance !== 0n) {
  throw new Error("UNEXPECTED_VAULT_VALUE_STATE_AFTER_POLICY_CREATION");
}

const pendingNonce = Number(BigInt(await rpc("eth_getTransactionCount",[authority,"pending"])));

const out = {
  schema:"ARC_ASSURANCE_G2_POLICY_CREATION_RECEIPT_V1",
  chain_id:chainId,
  transaction_hash:txHash,
  transaction_status:1,
  block_number:Number(BigInt(receipt.blockNumber)),
  authority,
  nonce:Number(spec.expected_nonce),
  current_pending_nonce:pendingNonce,
  contract_address:contract,
  tx_value_wei:String(BigInt(tx.value)),
  function_name:decoded.functionName,
  calldata_keccak256:keccak256(tx.input),
  gas_used:String(BigInt(receipt.gasUsed)),
  effective_gas_price_wei:String(BigInt(receipt.effectiveGasPrice ?? "0x0")),
  policy:{
    policy_id:policyId,
    funder:getAddress(p.funder),
    provider:getAddress(p.provider),
    payout_recipient:getAddress(p.payoutRecipient),
    scorer_id_hash:p.scorerIdHash,
    max_failures:Number(p.maxFailures),
    failure_count:Number(p.failureCount),
    max_spend_cap_wei:String(p.maxSpendCap),
    unit_payout_wei:String(p.unitPayout),
    expiry_unix:String(p.expiry),
    created_at_unix:String(p.createdAt),
    funded_at_unix:String(p.fundedAt),
    total_funded_wei:String(p.totalFunded),
    total_paid_out_wei:String(p.totalPaidOut),
    total_refunded_wei:String(p.totalRefunded),
    paused:p.paused,
    closed:p.closed,
    refund_issued:p.refundIssued,
    exists:p.exists,
    active_batch_id:p.activeBatchId,
  },
  vault:{
    policy_count:String(policyCount),
    total_liability_wei:String(totalLiability),
    total_custody_received_wei:String(totalCustodyReceived),
    total_value_released_wei:String(totalValueReleased),
    contract_balance_wei:String(contractBalance),
  },
  receipt_verified:true,
  safety:{
    private_key_consumed:false,
    transaction_signed_by_verifier:false,
    transaction_broadcast_by_verifier:false,
    funds_moved_by_verifier:false,
  },
};
console.log(JSON.stringify(out,null,2));
