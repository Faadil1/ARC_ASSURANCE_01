#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import {
  decodeFunctionResult,
  encodeDeployData,
  encodeFunctionData,
  getAddress,
  keccak256,
} from "viem";

const [rpcUrl, specPath, artifactPath] = process.argv.slice(2);
if (!rpcUrl || !specPath || !artifactPath) {
  throw new Error("usage: g2_verify_deployment_receipt.mjs <rpc> <spec.json> <artifact.json>");
}

const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

async function rpc(method, params = []) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({jsonrpc:"2.0", id:1, method, params}),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

function lower(v) { return String(v).toLowerCase(); }
function hexInt(v) { return Number(BigInt(v)); }

const chainId = Number(BigInt(await rpc("eth_chainId")));
if (chainId !== Number(spec.chain_id) || chainId !== 5042) {
  throw new Error(`CHAIN_ID_MISMATCH:${chainId}`);
}

const txHash = lower(spec.deployment_tx_hash);
const tx = await rpc("eth_getTransactionByHash", [txHash]);
const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
if (!tx) throw new Error("TRANSACTION_NOT_FOUND");
if (!receipt) throw new Error("RECEIPT_NOT_FOUND");
if (BigInt(receipt.status) !== 1n) throw new Error("DEPLOYMENT_TX_REVERTED");
if (tx.to !== null) throw new Error(`TX_NOT_CONTRACT_CREATION:${tx.to}`);

const deployer = getAddress(tx.from);
if (lower(deployer) !== lower(spec.expected_deployer)) throw new Error("DEPLOYER_MISMATCH");
if (hexInt(tx.nonce) !== Number(spec.expected_nonce)) throw new Error("NONCE_MISMATCH");
if (BigInt(tx.value) !== BigInt(spec.expected_tx_value_wei)) throw new Error("TX_VALUE_MISMATCH");

const contract = getAddress(receipt.contractAddress);
if (lower(contract) !== lower(spec.expected_contract_address)) throw new Error("CONTRACT_ADDRESS_MISMATCH");

const bytecode = artifact?.bytecode?.object;
if (!bytecode) throw new Error("CREATION_BYTECODE_MISSING");
const bytecodeHex = bytecode.startsWith("0x") ? bytecode : `0x${bytecode}`;
const expectedInit = encodeDeployData({
  abi: artifact.abi,
  bytecode: bytecodeHex,
  args: [
    getAddress(spec.expected_deployer),
    BigInt(spec.expected_chain_id_constructor),
    getAddress(spec.expected_usdc_erc20_interface),
    BigInt(spec.expected_deployment_spend_cap_wei),
  ],
});

const expectedInitHash = keccak256(expectedInit);
if (lower(expectedInitHash) !== lower(spec.expected_init_code_keccak256)) {
  throw new Error(`CANONICAL_INIT_HASH_MISMATCH:${expectedInitHash}`);
}
if (lower(tx.input) !== lower(expectedInit)) {
  throw new Error("TRANSACTION_INIT_CODE_MISMATCH");
}
const txInputHash = keccak256(tx.input);
if (lower(txInputHash) !== lower(spec.expected_init_code_keccak256)) {
  throw new Error("TRANSACTION_INIT_HASH_MISMATCH");
}

const code = await rpc("eth_getCode", [contract, "latest"]);
if (!code || ["0x","0x0","0x00"].includes(code)) throw new Error("NO_RUNTIME_CODE_AT_CONTRACT");

async function call(name) {
  const fn = artifact.abi.find(x => x.type === "function" && x.name === name && (x.inputs?.length ?? 0) === 0);
  if (!fn) throw new Error(`ABI_FUNCTION_MISSING:${name}`);
  const data = encodeFunctionData({abi:[fn], functionName:name});
  const result = await rpc("eth_call", [{to:contract, data}, "latest"]);
  return decodeFunctionResult({abi:[fn], functionName:name, data:result});
}

const authority = getAddress(await call("authority"));
const expectedChainId = BigInt(await call("expectedChainId"));
const usdc = getAddress(await call("usdcErc20Interface"));
const cap = BigInt(await call("deploymentSpendCap"));
const policyCount = BigInt(await call("policyCount"));
const liability = BigInt(await call("totalLiability"));
const received = BigInt(await call("totalCustodyReceived"));
const released = BigInt(await call("totalValueReleased"));

if (lower(authority) !== lower(spec.expected_deployer)) throw new Error("AUTHORITY_BINDING_MISMATCH");
if (expectedChainId !== 5042n) throw new Error("EXPECTED_CHAIN_BINDING_MISMATCH");
if (lower(usdc) !== lower(spec.expected_usdc_erc20_interface)) throw new Error("USDC_BINDING_MISMATCH");
if (cap !== BigInt(spec.expected_deployment_spend_cap_wei)) throw new Error("CAP_BINDING_MISMATCH");
if (policyCount !== 0n || liability !== 0n || received !== 0n || released !== 0n) {
  throw new Error("UNEXPECTED_MUTABLE_STATE_AFTER_DEPLOYMENT");
}

const contractBalance = BigInt(await rpc("eth_getBalance", [contract, "latest"]));
if (contractBalance !== 0n) throw new Error("UNEXPECTED_CONTRACT_BALANCE_AFTER_DEPLOYMENT");

const pendingNonce = Number(BigInt(await rpc("eth_getTransactionCount", [deployer, "pending"])));
if (pendingNonce < Number(spec.expected_nonce) + 1) throw new Error("DEPLOYER_NONCE_NOT_CONSUMED");

const out = {
  schema: "ARC_ASSURANCE_G2_DEPLOYMENT_RECEIPT_V1",
  chain_id: chainId,
  transaction_hash: txHash,
  transaction_status: 1,
  block_number: Number(BigInt(receipt.blockNumber)),
  deployer,
  deployment_nonce: Number(spec.expected_nonce),
  current_pending_nonce: pendingNonce,
  tx_value_wei: "0",
  contract_address: contract,
  init_code_keccak256: txInputHash,
  exact_init_code_match: true,
  runtime_code_bytes: (code.length - 2) / 2,
  gas_used: Number(BigInt(receipt.gasUsed)),
  effective_gas_price_wei: String(BigInt(receipt.effectiveGasPrice ?? "0x0")),
  constructor_bindings: {
    authority,
    expected_chain_id: String(expectedChainId),
    usdc_erc20_interface: usdc,
    deployment_spend_cap_wei: String(cap),
  },
  initial_mutable_state: {
    policy_count: String(policyCount),
    total_liability_wei: String(liability),
    total_custody_received_wei: String(received),
    total_value_released_wei: String(released),
    contract_balance_wei: String(contractBalance),
  },
  receipt_verified: true,
  safety: {
    private_key_consumed: false,
    transaction_signed_by_verifier: false,
    transaction_broadcast_by_verifier: false,
    funds_moved_by_verifier: false,
  },
};
console.log(JSON.stringify(out, null, 2));
