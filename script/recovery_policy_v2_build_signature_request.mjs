#!/usr/bin/env node
import fs from "node:fs";
import {
  createPublicClient,
  getAddress,
  hashTypedData,
  http,
} from "viem";
import {
  buildProviderOutputTypedData,
  typedDataToJsonSafe,
} from "../src/eip712/provider-output-v1.mjs";

const [rpcUrl, sensitivePath, outputPath] = process.argv.slice(2);
if (!rpcUrl || !sensitivePath || !outputPath) {
  throw new Error("usage: recovery_policy_v2_build_signature_request.mjs <rpc> <sensitive-compute.json> <public-output.json>");
}

const CHAIN_ID = 5042;
const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
const PROVIDER = "0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe";
const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const PROVIDER_OUTPUT_NONCE = 1n;

const artifact = JSON.parse(fs.readFileSync(sensitivePath,"utf8"));
const sb = artifact?.sensitive_binding;
const pb = artifact?.public_binding;
if (!sb || !pb) throw new Error("SENSITIVE_ARTIFACT_BINDING_MISSING");
if (String(pb.policy_id).toLowerCase() !== POLICY_ID.toLowerCase()) throw new Error("POLICY_BINDING_MISMATCH");
if (String(pb.batch_id).toLowerCase() !== BATCH_ID.toLowerCase()) throw new Error("BATCH_BINDING_MISMATCH");
if (getAddress(pb.provider).toLowerCase() !== getAddress(PROVIDER).toLowerCase()) throw new Error("PROVIDER_BINDING_MISMATCH");
if (artifact?.checks?.provider_execution_real_compute !== true) throw new Error("REAL_COMPUTE_NOT_PROVEN");
if (artifact?.checks?.provider_output_matches_hidden_expected !== true) throw new Error("HIDDEN_EXPECTED_MATCH_NOT_PROVEN");
if (artifact?.checks?.signature_created !== false) throw new Error("UNEXPECTED_SIGNATURE_ALREADY_CREATED");
if (artifact?.checks?.transaction_sent !== false) throw new Error("UNEXPECTED_TRANSACTION_ALREADY_SENT");

const ABI = [
  {
    type:"function",name:"getPolicy",stateMutability:"view",
    inputs:[{name:"policyId",type:"bytes32"}],
    outputs:[{name:"",type:"tuple",components:[
      {name:"funder",type:"address"},
      {name:"provider",type:"address"},
      {name:"payoutRecipient",type:"address"},
      {name:"scorerIdHash",type:"bytes32"},
      {name:"maxFailures",type:"uint32"},
      {name:"failureCount",type:"uint32"},
      {name:"maxSpendCap",type:"uint256"},
      {name:"unitPayout",type:"uint256"},
      {name:"expiry",type:"uint64"},
      {name:"createdAt",type:"uint64"},
      {name:"fundedAt",type:"uint64"},
      {name:"totalFunded",type:"uint256"},
      {name:"totalPaidOut",type:"uint256"},
      {name:"totalRefunded",type:"uint256"},
      {name:"paused",type:"bool"},
      {name:"closed",type:"bool"},
      {name:"refundIssued",type:"bool"},
      {name:"exists",type:"bool"},
      {name:"activeBatchId",type:"bytes32"}
    ]}]
  },
  {
    type:"function",name:"getBatch",stateMutability:"view",
    inputs:[{name:"policyId",type:"bytes32"},{name:"batchId",type:"bytes32"}],
    outputs:[{name:"",type:"tuple",components:[
      {name:"commitment",type:"bytes32"},
      {name:"workId",type:"bytes32"},
      {name:"inputHash",type:"bytes32"},
      {name:"outputHash",type:"bytes32"},
      {name:"expectedOutputHash",type:"bytes32"},
      {name:"providerDigest",type:"bytes32"},
      {name:"state",type:"uint8"},
      {name:"directive",type:"uint8"},
      {name:"committedAtBlock",type:"uint256"},
      {name:"outputLockedAtBlock",type:"uint256"},
      {name:"revealedAtBlock",type:"uint256"},
      {name:"resolvedAtBlock",type:"uint256"}
    ]}]
  },
  {
    type:"function",name:"workIdUsed",stateMutability:"view",
    inputs:[{name:"workId",type:"bytes32"}],outputs:[{name:"",type:"bool"}]
  },
  {
    type:"function",name:"providerOutputDigest",stateMutability:"view",
    inputs:[{name:"output",type:"tuple",components:[
      {name:"provider",type:"address"},
      {name:"policyId",type:"bytes32"},
      {name:"batchId",type:"bytes32"},
      {name:"workId",type:"bytes32"},
      {name:"inputHash",type:"bytes32"},
      {name:"outputHash",type:"bytes32"},
      {name:"scorerIdHash",type:"bytes32"},
      {name:"nonce",type:"uint256"},
      {name:"deadline",type:"uint256"}
    ]}],
    outputs:[{name:"",type:"bytes32"}]
  },
  {
    type:"function",name:"providerOutputConsumed",stateMutability:"view",
    inputs:[{name:"digest",type:"bytes32"}],outputs:[{name:"",type:"bool"}]
  }
];

const client = createPublicClient({transport:http(rpcUrl)});
const chainId = await client.getChainId();
if (chainId !== CHAIN_ID) throw new Error("WRONG_CHAIN");

const [block, policy, batch, workIdUsed] = await Promise.all([
  client.getBlock({blockTag:"latest"}),
  client.readContract({address:CONTRACT,abi:ABI,functionName:"getPolicy",args:[POLICY_ID]}),
  client.readContract({address:CONTRACT,abi:ABI,functionName:"getBatch",args:[POLICY_ID,BATCH_ID]}),
  client.readContract({address:CONTRACT,abi:ABI,functionName:"workIdUsed",args:[sb.work_id]}),
]);

if (!policy.exists || policy.paused || policy.closed || policy.refundIssued) throw new Error("POLICY_NOT_USABLE");
if (getAddress(policy.provider).toLowerCase() !== getAddress(PROVIDER).toLowerCase()) throw new Error("ONCHAIN_PROVIDER_MISMATCH");
if (String(policy.activeBatchId).toLowerCase() !== BATCH_ID.toLowerCase()) throw new Error("ACTIVE_BATCH_MISMATCH");
if (Number(batch.state) !== 1) throw new Error("BATCH_NOT_COMMITTED");
if (workIdUsed) throw new Error("WORK_ID_ALREADY_USED");
if (block.timestamp > policy.expiry) throw new Error("POLICY_EXPIRED");

const deadline = BigInt(policy.expiry);
const message = {
  provider: getAddress(PROVIDER),
  policyId: POLICY_ID,
  batchId: BATCH_ID,
  workId: sb.work_id,
  inputHash: sb.input_hash,
  outputHash: sb.output_hash,
  scorerIdHash: sb.scorer_id_hash,
  nonce: PROVIDER_OUTPUT_NONCE,
  deadline,
};

const typedData = buildProviderOutputTypedData({
  chainId: CHAIN_ID,
  verifyingContract: CONTRACT,
  message,
});
const digest = hashTypedData(typedData);

const onchainDigest = await client.readContract({
  address: CONTRACT,
  abi: ABI,
  functionName: "providerOutputDigest",
  args: [message],
});
if (String(onchainDigest).toLowerCase() !== String(digest).toLowerCase()) {
  throw new Error("EIP712_DIGEST_CROSSCHECK_FAILED");
}

const digestConsumed = await client.readContract({
  address: CONTRACT,
  abi: ABI,
  functionName: "providerOutputConsumed",
  args: [digest],
});
if (digestConsumed) throw new Error("PROVIDER_OUTPUT_DIGEST_ALREADY_CONSUMED");

const publicOut = {
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_PROVIDER_SIGNATURE_REQUEST_V1",
  result:"PASS",
  classification:"PUBLIC_SIGNING_REQUEST",
  chain:{
    chain_id:CHAIN_ID,
    observed_block:block.number.toString(),
    observed_timestamp:block.timestamp.toString(),
    verifying_contract:getAddress(CONTRACT)
  },
  provider:getAddress(PROVIDER),
  policy_id:POLICY_ID,
  batch_id:BATCH_ID,
  provider_output_nonce:PROVIDER_OUTPUT_NONCE.toString(),
  deadline_unix:deadline.toString(),
  typed_data:typedDataToJsonSafe(typedData),
  digest,
  onchain_digest:onchainDigest,
  checks:{
    provider_real_compute_proven:true,
    hidden_expected_match_proven:true,
    batch_still_committed:true,
    work_id_unused:true,
    digest_crosscheck:true,
    digest_consumed:false,
    provider_signature_created:false,
    transaction_sent:false
  },
  next_gate:"SEPARATE_PROVIDER_SIGNATURE_AUTHORIZATION"
};

const serialized = JSON.stringify(publicOut,null,2)+"\n";
for (const forbidden of ["input_text","expected_canonical_output","expected_output_hash","salt","canary_key","canonical_output"]) {
  if (serialized.includes('"'+forbidden+'"')) throw new Error("PUBLIC_OUTPUT_FORBIDDEN_FIELD_"+forbidden.toUpperCase());
}
fs.writeFileSync(outputPath,serialized,"utf8");

console.log("RECOVERY V2 PROVIDER SIGNATURE REQUEST — READ-ONLY");
console.log("RESULT: PASS");
console.log("provider", publicOut.provider);
console.log("policy_id", POLICY_ID);
console.log("batch_id", BATCH_ID);
console.log("work_id", message.workId);
console.log("input_hash", message.inputHash);
console.log("output_hash", message.outputHash);
console.log("scorer_id_hash", message.scorerIdHash);
console.log("provider_output_nonce", publicOut.provider_output_nonce);
console.log("deadline_unix", publicOut.deadline_unix);
console.log("digest", digest);
console.log("onchain_digest", onchainDigest);
console.log("digest_crosscheck", true);
console.log("signature_created", false);
console.log("transaction_sent", false);
