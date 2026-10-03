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
  throw new Error("usage: g2_policy_creation_preflight.mjs <rpc> <config.json> <artifact.json> <contract>");
}

const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const p = cfg.integrated;
const contract = getAddress(contractAddress);
const authority = getAddress(p.authority_address);
const funder = getAddress(p.funder_address);
const provider = getAddress(p.provider_address);
const payout = getAddress(p.payout_recipient_address);

async function rpc(method, params = []) {
  const res = await fetch(rpcUrl, {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}:${JSON.stringify(body.error)}`);
  return body.result;
}

async function call0(name) {
  const fn = artifact.abi.find(x => x.type==="function" && x.name===name && (x.inputs?.length ?? 0)===0);
  if (!fn) throw new Error(`ABI_FUNCTION_MISSING:${name}`);
  const data = encodeFunctionData({abi:[fn],functionName:name});
  const result = await rpc("eth_call",[{to:contract,data},"latest"]);
  return decodeFunctionResult({abi:[fn],functionName:name,data:result});
}

const chainId = Number(BigInt(await rpc("eth_chainId")));
if (chainId !== 5042) throw new Error(`WRONG_CHAIN:${chainId}`);

const code = await rpc("eth_getCode",[contract,"latest"]);
if (!code || ["0x","0x0","0x00"].includes(code)) throw new Error("NO_CONTRACT_CODE");

const onchainAuthority = getAddress(await call0("authority"));
const expectedChainId = BigInt(await call0("expectedChainId"));
const deploymentCap = BigInt(await call0("deploymentSpendCap"));
const policyCount = BigInt(await call0("policyCount"));
const liability = BigInt(await call0("totalLiability"));
const received = BigInt(await call0("totalCustodyReceived"));
const released = BigInt(await call0("totalValueReleased"));
const contractBalance = BigInt(await rpc("eth_getBalance",[contract,"latest"]));

if (onchainAuthority.toLowerCase() !== authority.toLowerCase()) throw new Error("AUTHORITY_MISMATCH");
if (expectedChainId !== 5042n) throw new Error("CHAIN_BINDING_MISMATCH");
if (policyCount !== 0n) throw new Error(`POLICY_COUNT_NOT_ZERO:${policyCount}`);
if (liability !== 0n || received !== 0n || released !== 0n || contractBalance !== 0n) {
  throw new Error("VAULT_NOT_EMPTY_BEFORE_POLICY_CREATION");
}

for (const [label,address] of [["authority",authority],["provider",provider],["payout",payout]]) {
  const c = await rpc("eth_getCode",[address,"latest"]);
  if (c !== "0x") throw new Error(`${label.toUpperCase()}_NOT_EOA`);
}
if (new Set([authority.toLowerCase(),provider.toLowerCase(),payout.toLowerCase()]).size !== 3) {
  throw new Error("ROLE_ADDRESSES_NOT_DISTINCT");
}
if (funder.toLowerCase() !== authority.toLowerCase()) throw new Error("FUNDER_NOT_AUTHORITY_LOCKED_TOPOLOGY");

const maxFailures = Number(p.max_failures);
const maxSpendCap = BigInt(p.policy_max_spend_cap_wei);
const unitPayout = BigInt(p.unit_payout_wei);
const expiry = BigInt(p.policy_expiry_unix);

if (maxFailures <= 0) throw new Error("BAD_MAX_FAILURES");
if (maxSpendCap <= 0n || maxSpendCap > deploymentCap) throw new Error("BAD_POLICY_CAP");
if (unitPayout <= 0n || unitPayout > maxSpendCap) throw new Error("BAD_UNIT_PAYOUT");

const block = await rpc("eth_getBlockByNumber",["latest",false]);
const nowTs = BigInt(block.timestamp);
if (expiry <= nowTs) throw new Error(`POLICY_EXPIRY_NOT_FUTURE:${expiry}<=${nowTs}`);

const scorerIdHash = keccak256(new TextEncoder().encode(p.scorer_id));
const expectedScorer = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
if (scorerIdHash.toLowerCase() !== expectedScorer) throw new Error("SCORER_HASH_MISMATCH");

const policyId = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const data = encodeFunctionData({
  abi:artifact.abi,
  functionName:"createPolicy",
  args:[
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

const callDataHash = keccak256(data);
const estimateGas = BigInt(await rpc("eth_estimateGas",[{from:authority,to:contract,data,value:"0x0"}]));
const gasPrice = BigInt(await rpc("eth_gasPrice"));
const pendingNonce = Number(BigInt(await rpc("eth_getTransactionCount",[authority,"pending"])));
const authorityBalance = BigInt(await rpc("eth_getBalance",[authority,"latest"]));
const estimatedFee = estimateGas * gasPrice;

const out = {
  schema:"ARC_ASSURANCE_G2_POLICY_CREATION_PREFLIGHT_V1",
  chain_id:chainId,
  block_number:Number(BigInt(block.number)),
  block_timestamp:String(nowTs),
  contract_address:contract,
  authority,
  authority_pending_nonce:pendingNonce,
  authority_balance_wei:String(authorityBalance),
  role_topology:{
    funder,
    provider,
    payout_recipient:payout,
    all_distinct_for_authority_provider_payout:true,
    all_required_roles_eoa:true,
  },
  contract_pre_state:{
    policy_count:String(policyCount),
    total_liability_wei:String(liability),
    total_custody_received_wei:String(received),
    total_value_released_wei:String(released),
    contract_balance_wei:String(contractBalance),
  },
  policy:{
    policy_id:policyId,
    scorer_id_hash:scorerIdHash,
    max_failures:maxFailures,
    max_spend_cap_wei:String(maxSpendCap),
    unit_payout_wei:String(unitPayout),
    expiry_unix:String(expiry),
    expiry_is_future:true,
  },
  transaction:{
    function:"createPolicy(bytes32,address,address,address,bytes32,uint32,uint256,uint256,uint64)",
    tx_value_wei:"0",
    calldata:data,
    calldata_keccak256:callDataHash,
    estimate_gas_units:String(estimateGas),
    gas_price_wei:String(gasPrice),
    estimated_fee_wei:String(estimatedFee),
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
