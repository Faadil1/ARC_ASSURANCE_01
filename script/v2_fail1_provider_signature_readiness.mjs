#!/usr/bin/env node
import fs from "node:fs";
import {
  createPublicClient,
  getAddress,
  hashTypedData,
  http,
  keccak256,
  stringToHex
} from "viem";

const [rpcUrl, artifactPath, packetPath] = process.argv.slice(2);
if(!rpcUrl || !artifactPath || !packetPath) throw new Error("USAGE");

const artifact=JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi=artifact.abi;
const packet=JSON.parse(fs.readFileSync(packetPath,"utf8"));

const CHAIN_ID=5042;
const CONTRACT=getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const PROVIDER=getAddress("0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe");
const POLICY="0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH="0xd26aeb0909d66737fcb5aee2e4475bc2b9c2b2a3a9182c328a07be46036cbbb3";
const COMMITMENT="0xc617f5fbc3ccfaaa179e43d9ec7e26d0f4c291303a434dd7cb8c2e756f9c1bc2";
const OUTPUT_HASH="0x0ffacfd286979a90d2f46a0bb1a747b256ab94b759932b7535921635b46b8451";
const SCORER_HASH="0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
const SIGNED_NONCE=2n;
const DEADLINE=1792465200n;
const eq=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();

if(packet.scenario!=="CONTROLLED_FAIL_1_WITHHOLD") throw new Error("SCENARIO_MISMATCH");
if(packet.planned_fault_mode!=="WRONG_AMOUNT_VALID") throw new Error("FAULT_MODE_MISMATCH");
if(!eq(packet.policy_id,POLICY)||!eq(packet.batch_id,BATCH)||!eq(packet.commitment,COMMITMENT)) throw new Error("PUBLIC_BINDING_MISMATCH");
if(!eq(packet.scorer_id_hash,SCORER_HASH)) throw new Error("SCORER_MISMATCH");

const inputHash=keccak256(stringToHex(packet.input_text));
const expectedHash=keccak256(stringToHex(packet.expected_canonical_output));
if(!eq(inputHash,packet.input_hash)) throw new Error("INPUT_HASH_MISMATCH");
if(!eq(expectedHash,packet.expected_output_hash)) throw new Error("EXPECTED_HASH_MISMATCH");
if(eq(OUTPUT_HASH,packet.expected_output_hash)) throw new Error("CONTROLLED_FAIL_NOT_DIVERGENT");

const output={
  provider:PROVIDER,
  policyId:POLICY,
  batchId:BATCH,
  workId:packet.work_id,
  inputHash:packet.input_hash,
  outputHash:OUTPUT_HASH,
  scorerIdHash:SCORER_HASH,
  nonce:SIGNED_NONCE,
  deadline:DEADLINE
};

const domain={
  name:"ARC_ASSURANCE",
  version:"1",
  chainId:CHAIN_ID,
  verifyingContract:CONTRACT
};
const types={
  ProviderOutput:[
    {name:"provider",type:"address"},
    {name:"policyId",type:"bytes32"},
    {name:"batchId",type:"bytes32"},
    {name:"workId",type:"bytes32"},
    {name:"inputHash",type:"bytes32"},
    {name:"outputHash",type:"bytes32"},
    {name:"scorerIdHash",type:"bytes32"},
    {name:"nonce",type:"uint256"},
    {name:"deadline",type:"uint256"}
  ]
};

const localDigest=hashTypedData({
  domain,
  types,
  primaryType:"ProviderOutput",
  message:output
});

const client=createPublicClient({transport:http(rpcUrl)});
if(await client.getChainId()!==CHAIN_ID) throw new Error("RPC_WRONG_CHAIN");

const block=await client.getBlock({blockTag:"latest"});
const policy=await client.readContract({address:CONTRACT,abi,functionName:"getPolicy",args:[POLICY]});
const batch=await client.readContract({address:CONTRACT,abi,functionName:"getBatch",args:[POLICY,BATCH]});
const workUsed=await client.readContract({address:CONTRACT,abi,functionName:"workIdUsed",args:[packet.work_id]});
const chainDigest=await client.readContract({address:CONTRACT,abi,functionName:"providerOutputDigest",args:[output]});
const consumed=await client.readContract({address:CONTRACT,abi,functionName:"providerOutputConsumed",args:[localDigest]});
const remaining=await client.readContract({address:CONTRACT,abi,functionName:"remainingFor",args:[POLICY]});

if(!eq(localDigest,chainDigest)) throw new Error("DIGEST_MISMATCH");
if(consumed) throw new Error("DIGEST_ALREADY_CONSUMED");
if(workUsed) throw new Error("WORK_ID_ALREADY_USED");
if(!policy.exists||policy.paused||policy.closed||policy.refundIssued) throw new Error("POLICY_NOT_USABLE");
if(policy.activeBatchId.toLowerCase()!==BATCH.toLowerCase()) throw new Error("ACTIVE_BATCH_MISMATCH");
if(Number(batch.state)!==1||!eq(batch.commitment,COMMITMENT)) throw new Error("BATCH_NOT_COMMITTED");
if(Number(policy.failureCount)!==0) throw new Error("FAILURE_COUNT_DRIFT");
if(BigInt(remaining)!==8000000000000000n) throw new Error("REMAINDER_DRIFT");
if(block.timestamp>DEADLINE) throw new Error("SIGNATURE_DEADLINE_EXPIRED");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_V2_FAIL1_PROVIDER_SIGNATURE_READINESS_V1",
  result:"PASS",
  scenario:"CONTROLLED_FAIL_1_WITHHOLD",
  fault_mode:"WRONG_AMOUNT_VALID",
  chain_id:CHAIN_ID,
  observed_block:block.number.toString(),
  provider:PROVIDER,
  policy_id:POLICY,
  batch_id:BATCH,
  actual_output_hash:OUTPUT_HASH,
  scorer_id_hash:SCORER_HASH,
  signed_nonce:Number(SIGNED_NONCE),
  deadline:String(DEADLINE),
  local_digest:localDigest,
  onchain_digest:chainDigest,
  digest_match:true,
  digest_consumed:false,
  work_id_unused:true,
  batch_state:"COMMITTED",
  failure_count_before:Number(policy.failureCount),
  protected_remainder_wei:String(remaining),
  actual_output_matches_hidden_expected:false,
  hidden_expected_output_hash_logged:false,
  salt_logged:false,
  signature_created:false,
  transaction_sent:false,
  authorization:"NOT_AUTHORIZED"
},null,2));
