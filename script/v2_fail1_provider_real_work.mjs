#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import {
  createPublicClient,
  encodeAbiParameters,
  getAddress,
  http as viemHttp,
  keccak256,
  parseAbiParameters,
  stringToHex
} from "viem";
import { createProviderServer } from "../src/provider/http-server.mjs";
import { canonicalizeInvoiceV1, SCORER_ID } from "../src/scorer/invoice-v1.mjs";

const [rpcUrl, artifactPath, packetPath] = process.argv.slice(2);
if(!rpcUrl || !artifactPath || !packetPath) throw new Error("USAGE");

const artifact=JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi=artifact.abi;
const packet=JSON.parse(fs.readFileSync(packetPath,"utf8"));

const CHAIN_ID=5042;
const CONTRACT=getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER=getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const PROVIDER=getAddress("0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe");
const POLICY="0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH="0xd26aeb0909d66737fcb5aee2e4475bc2b9c2b2a3a9182c328a07be46036cbbb3";
const COMMITMENT="0xc617f5fbc3ccfaaa179e43d9ec7e26d0f4c291303a434dd7cb8c2e756f9c1bc2";
const SCORER_HASH="0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
const TYPE_STRING="CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)";
const eq=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();

function assertPacket(){
  if(packet.scenario!=="CONTROLLED_FAIL_1_WITHHOLD") throw new Error("SCENARIO_MISMATCH");
  if(packet.planned_fault_mode!=="WRONG_AMOUNT_VALID") throw new Error("FAULT_MODE_MISMATCH");
  if(Number(packet.chain_id)!==CHAIN_ID) throw new Error("CHAIN_MISMATCH");
  if(!eq(packet.verifying_contract,CONTRACT)) throw new Error("CONTRACT_MISMATCH");
  if(!eq(packet.policy_id,POLICY)||!eq(packet.batch_id,BATCH)||!eq(packet.commitment,COMMITMENT)) throw new Error("PUBLIC_BINDING_MISMATCH");
  if(packet.scorer_id!==SCORER_ID||!eq(packet.scorer_id_hash,SCORER_HASH)) throw new Error("SCORER_MISMATCH");

  const inputHash=keccak256(stringToHex(packet.input_text));
  const expectedHash=keccak256(stringToHex(packet.expected_canonical_output));
  const scorerHash=keccak256(stringToHex(packet.scorer_id));
  if(!eq(inputHash,packet.input_hash)) throw new Error("INPUT_HASH_MISMATCH");
  if(!eq(expectedHash,packet.expected_output_hash)) throw new Error("EXPECTED_HASH_MISMATCH");
  if(!eq(scorerHash,SCORER_HASH)) throw new Error("SCORER_HASH_MISMATCH");

  const typeHash=keccak256(stringToHex(TYPE_STRING));
  const rebuilt=keccak256(encodeAbiParameters(
    parseAbiParameters("bytes32,uint256,address,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32"),
    [typeHash,BigInt(CHAIN_ID),CONTRACT,POLICY,BATCH,packet.work_id,packet.input_hash,packet.expected_output_hash,SCORER_HASH,packet.salt]
  ));
  if(!eq(rebuilt,COMMITMENT)) throw new Error("COMMITMENT_RECONSTRUCTION_FAILED");
}

async function postJson(port,body){
  return new Promise((resolve,reject)=>{
    const payload=JSON.stringify(body);
    const req=http.request({
      hostname:"127.0.0.1",port,path:"/v1/extract",method:"POST",
      headers:{
        "content-type":"application/json",
        "content-length":Buffer.byteLength(payload),
        "x-demo-fault":"WRONG_AMOUNT_VALID"
      }
    },res=>{
      const chunks=[];
      res.on("data",c=>chunks.push(c));
      res.on("end",()=>resolve({
        status:res.statusCode,
        body:JSON.parse(Buffer.concat(chunks).toString("utf8"))
      }));
    });
    req.on("error",reject);
    req.end(payload);
  });
}

assertPacket();

const client=createPublicClient({transport:viemHttp(rpcUrl)});
if(await client.getChainId()!==CHAIN_ID) throw new Error("RPC_WRONG_CHAIN");

const block=await client.getBlock({blockTag:"latest"});
const policy=await client.readContract({address:CONTRACT,abi,functionName:"getPolicy",args:[POLICY]});
const batch=await client.readContract({address:CONTRACT,abi,functionName:"getBatch",args:[POLICY,BATCH]});
const workUsed=await client.readContract({address:CONTRACT,abi,functionName:"workIdUsed",args:[packet.work_id]});
const remaining=await client.readContract({address:CONTRACT,abi,functionName:"remainingFor",args:[POLICY]});

if(!policy.exists||policy.paused||policy.closed||policy.refundIssued) throw new Error("POLICY_NOT_USABLE");
if(policy.activeBatchId.toLowerCase()!==BATCH.toLowerCase()) throw new Error("ACTIVE_BATCH_MISMATCH");
if(Number(batch.state)!==1||!eq(batch.commitment,COMMITMENT)) throw new Error("BATCH_NOT_COMMITTED");
if(Number(policy.failureCount)!==0||Number(policy.maxFailures)!==2) throw new Error("FAILURE_STATE_DRIFT");
if(BigInt(remaining)!==8000000000000000n) throw new Error("REMAINDER_DRIFT");
if(block.timestamp>BigInt(policy.expiry)) throw new Error("POLICY_EXPIRED");
if(workUsed) throw new Error("WORK_ID_ALREADY_USED");

const server=createProviderServer({allowDemoFaults:true,signing:null});
await new Promise((resolve,reject)=>{
  server.once("error",reject);
  server.listen(0,"127.0.0.1",resolve);
});
const address=server.address();
if(typeof address!=="object"||!address) throw new Error("PROVIDER_PORT_UNAVAILABLE");

let response;
try{
  response=await postJson(address.port,{input_text:packet.input_text});
} finally {
  await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
}

if(response.status!==200) throw new Error("PROVIDER_HTTP_FAILED");
const body=response.body;
if(body?.evidence?.execution!=="REAL_COMPUTE") throw new Error("NOT_REAL_COMPUTE");
if(body?.evidence?.fault_injected!==true) throw new Error("FAULT_NOT_INJECTED");
if(body?.evidence?.fault_mode!=="WRONG_AMOUNT_VALID") throw new Error("WRONG_FAULT_MODE");
if(body?.evidence?.signature_status!=="DISABLED"||body?.signature!==null) throw new Error("SIGNATURE_UNEXPECTED");
if(typeof body?.canonical_output!=="string") throw new Error("CANONICAL_OUTPUT_MISSING");

const recanonical=canonicalizeInvoiceV1(body.result);
if(recanonical!==body.canonical_output) throw new Error("CANONICALIZATION_MISMATCH");

const actualOutputHash=keccak256(stringToHex(body.canonical_output));
if(eq(actualOutputHash,packet.expected_output_hash)) throw new Error("CONTROLLED_FAIL_DID_NOT_DIVERGE");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_V2_FAIL1_REAL_WORK_V1",
  result:"PASS",
  scenario:"CONTROLLED_FAIL_1_WITHHOLD",
  chain_id:CHAIN_ID,
  observed_block:block.number.toString(),
  provider:PROVIDER,
  policy_id:POLICY,
  batch_id:BATCH,
  work_id:packet.work_id,
  input_hash:packet.input_hash,
  scorer_id_hash:SCORER_HASH,
  actual_output_hash:actualOutputHash,
  provider_execution:"REAL_COMPUTE",
  fault_injected:true,
  fault_mode:"WRONG_AMOUNT_VALID",
  canonical_output_valid:true,
  actual_output_matches_hidden_expected:false,
  signature_status:"DISABLED",
  work_id_unused_before_lock:true,
  batch_state:"COMMITTED",
  failure_count_before:Number(policy.failureCount),
  protected_remainder_wei:String(remaining),
  hidden_expected_output_hash_logged:false,
  salt_logged:false,
  secret_packet_logged:false,
  transaction_sent:false,
  next_action:"PROVIDER_SIGNATURE_READINESS_ONLY"
},null,2));
