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
  throw new Error("usage: recovery_policy_v2_preflight.mjs <rpc> <config.json> <artifact.json>");
}

const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const contract = getAddress(cfg.contract);
const authority = getAddress(cfg.roles.authority);
const funder = getAddress(cfg.roles.funder);
const provider = getAddress(cfg.roles.provider);
const payout = getAddress(cfg.roles.payout_recipient);

async function rpc(method, params = []) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({jsonrpc:"2.0", id:1, method, params}),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}:${JSON.stringify(body.error)}`);
  return body.result;
}

function fn(name) {
  const x = artifact.abi.find(x => x.type === "function" && x.name === name);
  if (!x) throw new Error(`ABI_FUNCTION_MISSING:${name}`);
  return x;
}

async function call(name, args = []) {
  const f = fn(name);
  const data = encodeFunctionData({abi:[f], functionName:name, args});
  const result = await rpc("eth_call", [{to:contract, data}, "latest"]);
  return decodeFunctionResult({abi:[f], functionName:name, data:result});
}

const chainId = Number(BigInt(await rpc("eth_chainId")));
if (chainId !== 5042) throw new Error(`WRONG_CHAIN:${chainId}`);

const code = await rpc("eth_getCode", [contract, "latest"]);
if (!code || ["0x","0x0","0x00"].includes(code)) throw new Error("NO_CONTRACT_CODE");

const onchainAuthority = getAddress(await call("authority"));
const expectedChainId = BigInt(await call("expectedChainId"));
const deploymentCap = BigInt(await call("deploymentSpendCap"));
const policyCount = BigInt(await call("policyCount"));
const liability = BigInt(await call("totalLiability"));
const received = BigInt(await call("totalCustodyReceived"));
const released = BigInt(await call("totalValueReleased"));
const contractBalance = BigInt(await rpc("eth_getBalance", [contract, "latest"]));

if (onchainAuthority.toLowerCase() !== authority.toLowerCase()) throw new Error("AUTHORITY_MISMATCH");
if (expectedChainId !== 5042n) throw new Error("CHAIN_BINDING_MISMATCH");
if (funder.toLowerCase() !== authority.toLowerCase()) throw new Error("FUNDER_AUTHORITY_MISMATCH");

const expected = cfg.expected_vault_pre_state;
const exact = [
  ["POLICY_COUNT", policyCount, BigInt(expected.policy_count)],
  ["TOTAL_LIABILITY", liability, BigInt(expected.total_liability_wei)],
  ["TOTAL_CUSTODY_RECEIVED", received, BigInt(expected.total_custody_received_wei)],
  ["TOTAL_VALUE_RELEASED", released, BigInt(expected.total_value_released_wei)],
  ["CONTRACT_BALANCE", contractBalance, BigInt(expected.contract_balance_wei)],
  ["DEPLOYMENT_CAP", deploymentCap, BigInt(expected.deployment_spend_cap_wei)],
];
for (const [label, actual, wanted] of exact) {
  if (actual !== wanted) throw new Error(`${label}_DRIFT:${actual}!=${wanted}`);
}

for (const [label,address] of [["authority",authority],["provider",provider],["payout",payout]]) {
  const c = await rpc("eth_getCode", [address, "latest"]);
  if (c !== "0x") throw new Error(`${label.toUpperCase()}_NOT_EOA`);
}
if (new Set([authority.toLowerCase(),provider.toLowerCase(),payout.toLowerCase()]).size !== 3) {
  throw new Error("ROLE_ADDRESSES_NOT_DISTINCT");
}

const v1 = cfg.v1_stranded_policy;
const oldPolicy = await call("getPolicy", [v1.policy_id]);
const oldBatch = await call("getBatch", [v1.policy_id, v1.batch_id]);

if (!oldPolicy.exists) throw new Error("V1_POLICY_MISSING");
if (oldPolicy.closed) throw new Error("V1_POLICY_UNEXPECTEDLY_CLOSED");
if (oldPolicy.activeBatchId.toLowerCase() !== v1.batch_id.toLowerCase()) throw new Error("V1_ACTIVE_BATCH_DRIFT");
if (BigInt(oldPolicy.totalFunded) !== BigInt(v1.expected_total_funded_wei)) throw new Error("V1_TOTAL_FUNDED_DRIFT");
if (Number(oldBatch.state) !== Number(v1.expected_batch_state)) throw new Error("V1_BATCH_STATE_DRIFT");
if (oldBatch.commitment.toLowerCase() !== v1.commitment.toLowerCase()) throw new Error("V1_COMMITMENT_DRIFT");

const v2 = cfg.v2_policy;
const policyId = keccak256(new TextEncoder().encode(v2.policy_id_seed));
if (policyId.toLowerCase() === v1.policy_id.toLowerCase()) throw new Error("V2_POLICY_ID_COLLISION");

const scorerIdHash = keccak256(new TextEncoder().encode(v2.scorer_id));
const expectedScorer = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
if (scorerIdHash.toLowerCase() !== expectedScorer) throw new Error("SCORER_HASH_MISMATCH");

const maxFailures = Number(v2.max_failures);
const maxSpendCap = BigInt(v2.max_spend_cap_wei);
const initialFund = BigInt(v2.initial_fund_amount_wei);
const unitPayout = BigInt(v2.unit_payout_wei);
const expiry = BigInt(v2.expiry_unix);

if (maxFailures <= 0) throw new Error("BAD_MAX_FAILURES");
if (maxSpendCap <= 0n || maxSpendCap > deploymentCap) throw new Error("BAD_POLICY_CAP");
if (unitPayout <= 0n || unitPayout > maxSpendCap) throw new Error("BAD_UNIT_PAYOUT");
if (initialFund <= 0n || initialFund > maxSpendCap) throw new Error("BAD_INITIAL_FUND");
if (received + initialFund > deploymentCap) throw new Error("DEPLOYMENT_CAP_WOULD_BE_EXCEEDED");

const block = await rpc("eth_getBlockByNumber", ["latest", false]);
const nowTs = BigInt(block.timestamp);
if (expiry <= nowTs) throw new Error(`V2_EXPIRY_NOT_FUTURE:${expiry}<=${nowTs}`);
if (expiry <= BigInt(v1.expiry_unix)) throw new Error("V2_EXPIRY_NOT_AFTER_V1");

const createData = encodeFunctionData({
  abi: artifact.abi,
  functionName: "createPolicy",
  args: [
    policyId,
    funder,
    provider,
    payout,
    scorerIdHash,
    maxFailures,
    maxSpendCap,
    unitPayout,
    expiry,
  ],
});

const estimateGas = BigInt(await rpc("eth_estimateGas", [{
  from: authority,
  to: contract,
  data: createData,
  value: "0x0"
}]));
const gasPrice = BigInt(await rpc("eth_gasPrice"));
const pendingNonce = Number(BigInt(await rpc("eth_getTransactionCount", [authority, "pending"])));
const authorityBalance = BigInt(await rpc("eth_getBalance", [authority, "latest"]));
const estimatedCreateFee = estimateGas * gasPrice;

const out = {
  schema: "ARC_ASSURANCE_RECOVERY_POLICY_V2_PREFLIGHT_V1",
  result: "PASS",
  chain_id: chainId,
  block_number: Number(BigInt(block.number)),
  block_timestamp: String(nowTs),
  contract_address: contract,
  authority,
  authority_pending_nonce: pendingNonce,
  authority_balance_wei: String(authorityBalance),
  existing_v1: {
    policy_id: v1.policy_id,
    batch_id: v1.batch_id,
    commitment: v1.commitment,
    batch_state: Number(oldBatch.state),
    active_batch_matches: true,
    total_funded_wei: String(oldPolicy.totalFunded),
    protected_liability_wei: String(liability),
  },
  vault_pre_state: {
    policy_count: String(policyCount),
    total_liability_wei: String(liability),
    total_custody_received_wei: String(received),
    total_value_released_wei: String(released),
    contract_balance_wei: String(contractBalance),
    deployment_spend_cap_wei: String(deploymentCap),
  },
  proposed_v2: {
    policy_id_seed: v2.policy_id_seed,
    policy_id: policyId,
    funder,
    provider,
    payout_recipient: payout,
    scorer_id: v2.scorer_id,
    scorer_id_hash: scorerIdHash,
    max_failures: maxFailures,
    max_spend_cap_wei: String(maxSpendCap),
    initial_fund_amount_wei: String(initialFund),
    unit_payout_wei: String(unitPayout),
    expiry_unix: String(expiry),
    projected_total_custody_after_fund_wei: String(received + initialFund),
    projected_remaining_deployment_capacity_wei: String(deploymentCap - received - initialFund),
  },
  create_policy_preflight: {
    function: "createPolicy(bytes32,address,address,address,bytes32,uint32,uint256,uint256,uint64)",
    tx_value_wei: "0",
    calldata: createData,
    calldata_keccak256: keccak256(createData),
    estimate_gas_units: String(estimateGas),
    gas_price_wei: String(gasPrice),
    estimated_fee_wei: String(estimatedCreateFee),
    eth_estimateGas_passed: true,
  },
  safety: {
    private_key_consumed: false,
    secret_consumed: false,
    transaction_signed: false,
    transaction_broadcast: false,
    funds_moved: false,
  },
  next_gate: "HUMAN_REVIEW_THEN_SEPARATE_CREATE_POLICY_AUTHORIZATION",
};

console.log(JSON.stringify(out, null, 2));
