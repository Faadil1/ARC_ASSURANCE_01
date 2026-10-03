#!/usr/bin/env node
import fs from "node:fs";
import {
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
  stringToHex,
  encodeAbiParameters,
  parseAbiParameters
} from "viem";

const [rpcUrl, artifactPath, packetPath] = process.argv.slice(2);
if(!rpcUrl || !artifactPath || !packetPath) throw new Error("USAGE");
const artifact=JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi=artifact.abi;
const packet=JSON.parse(fs.readFileSync(packetPath,"utf8"));

const CHAIN_ID=5042;
const CONTRACT=getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER=getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const POLICY="0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const SCORER_ID="ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";
const SCORER_HASH="0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
const TYPE_STRING="CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)";
const ZERO="0x"+"0".repeat(64);
const eq=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();

if(packet.scenario!=="CONTROLLED_FAIL_1_WITHHOLD") throw new Error("SCENARIO_MISMATCH");
if(packet.planned_fault_mode!=="WRONG_AMOUNT_VALID") throw new Error("FAULT_MODE_MISMATCH");
if(Number(packet.chain_id)!==CHAIN_ID) throw new Error("CHAIN_MISMATCH");
if(!eq(packet.verifying_contract,CONTRACT)) throw new Error("CONTRACT_MISMATCH");
if(!eq(packet.policy_id,POLICY)) throw new Error("POLICY_MISMATCH");
if(!eq(packet.scorer_id_hash,SCORER_HASH) || packet.scorer_id!==SCORER_ID) throw new Error("SCORER_MISMATCH");

const recomputedInputHash=keccak256(stringToHex(packet.input_text));
const recomputedExpectedHash=keccak256(stringToHex(packet.expected_canonical_output));
const recomputedScorerHash=keccak256(stringToHex(packet.scorer_id));
if(!eq(recomputedInputHash,packet.input_hash)) throw new Error("INPUT_HASH_MISMATCH");
if(!eq(recomputedExpectedHash,packet.expected_output_hash)) throw new Error("EXPECTED_HASH_MISMATCH");
if(!eq(recomputedScorerHash,packet.scorer_id_hash)) throw new Error("SCORER_HASH_RECOMPUTE_MISMATCH");

const typeHash=keccak256(stringToHex(TYPE_STRING));
const commitment=keccak256(encodeAbiParameters(
  parseAbiParameters("bytes32,uint256,address,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32"),
  [typeHash,BigInt(CHAIN_ID),CONTRACT,POLICY,packet.batch_id,packet.work_id,packet.input_hash,packet.expected_output_hash,SCORER_HASH,packet.salt]
));
if(!eq(commitment,packet.commitment)) throw new Error("COMMITMENT_MISMATCH");

const client=createPublicClient({transport:http(rpcUrl)});
if(await client.getChainId()!==CHAIN_ID) throw new Error("RPC_WRONG_CHAIN");

const block=await client.getBlock({blockTag:"latest"});
const policy=await client.readContract({address:CONTRACT,abi,functionName:"getPolicy",args:[POLICY]});
const remaining=await client.readContract({address:CONTRACT,abi,functionName:"remainingFor",args:[POLICY]});
const workUsed=await client.readContract({address:CONTRACT,abi,functionName:"workIdUsed",args:[packet.work_id]});
const nonce=await client.getTransactionCount({address:FUNDER,blockTag:"pending"});

if(!policy.exists || policy.paused || policy.closed || policy.refundIssued) throw new Error("POLICY_NOT_USABLE");
if(policy.activeBatchId.toLowerCase()!==ZERO.toLowerCase()) throw new Error("ACTIVE_BATCH_NOT_ZERO");
if(Number(policy.failureCount)!==0 || Number(policy.maxFailures)!==2) throw new Error("FAILURE_STATE_DRIFT");
if(BigInt(remaining)!==8000000000000000n) throw new Error("REMAINDER_DRIFT");
if(BigInt(policy.unitPayout)!==2000000000000000n) throw new Error("UNIT_PAYOUT_DRIFT");
if(block.timestamp>BigInt(policy.expiry)) throw new Error("POLICY_EXPIRED");
if(workUsed) throw new Error("WORK_ID_ALREADY_USED");

const calldata=encodeFunctionData({
  abi,
  functionName:"commitBatch",
  args:[POLICY,packet.batch_id,packet.commitment]
});
const calldataHash=keccak256(calldata);

const call=await client.call({account:FUNDER,to:CONTRACT,data:calldata,value:0n});
if(call.data && call.data!=="0x") throw new Error("UNEXPECTED_COMMIT_RETURN_DATA");
const gas=await client.estimateGas({account:FUNDER,to:CONTRACT,data:calldata,value:0n});
const gasPrice=await client.getGasPrice();

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_V2_FAIL1_PRECOMMIT_PREFLIGHT_V1",
  result:"PASS",
  scenario:"CONTROLLED_FAIL_1_WITHHOLD",
  fault_mode:"WRONG_AMOUNT_VALID",
  chain_id:CHAIN_ID,
  observed_block:block.number.toString(),
  observed_timestamp:block.timestamp.toString(),
  sender:FUNDER,
  pending_nonce:nonce,
  policy_id:POLICY,
  batch_id:packet.batch_id,
  commitment:packet.commitment,
  failure_count_before:Number(policy.failureCount),
  max_failures:Number(policy.maxFailures),
  protected_remainder_wei:String(remaining),
  work_id_unused:true,
  tx_value_wei:"0",
  calldata_keccak256:calldataHash,
  eth_call_passed:true,
  gas_estimate:gas.toString(),
  gas_price_wei:gasPrice.toString(),
  estimated_fee_wei:(gas*gasPrice).toString(),
  secret_fields_logged:false,
  transaction_sent:false,
  authorization:"NOT_AUTHORIZED"
},null,2));
