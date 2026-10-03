#!/usr/bin/env node
import fs from "node:fs";
import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  http,
  keccak256
} from "viem";

const [rpcUrl, secretPath, artifactPath] = process.argv.slice(2);
if(!rpcUrl || !secretPath || !artifactPath) throw new Error("USAGE");
const packet=JSON.parse(fs.readFileSync(secretPath,"utf8"));
const artifact=JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi=artifact.abi;

const CHAIN_ID=5042;
const CONTRACT=getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER=getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const POLICY_ID="0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID="0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const COMMITMENT="0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17";
const WORK_ID="0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
const INPUT_HASH="0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde";
const OUTPUT_HASH="0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
const SCORER_ID_HASH="0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
const PROVIDER_DIGEST="0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";

const eq=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();
for(const k of ["chain_id","verifying_contract","policy_id","batch_id","work_id","input_hash","expected_output_hash","scorer_id_hash","salt","commitment"]) {
  if(packet[k]===undefined || packet[k]===null || packet[k]==="") throw new Error("SECRET_PACKET_MISSING_"+k.toUpperCase());
}
if(Number(packet.chain_id)!==CHAIN_ID) throw new Error("SECRET_CHAIN_MISMATCH");
if(!eq(packet.verifying_contract,CONTRACT)) throw new Error("SECRET_CONTRACT_MISMATCH");
if(!eq(packet.policy_id,POLICY_ID)) throw new Error("SECRET_POLICY_MISMATCH");
if(!eq(packet.batch_id,BATCH_ID)) throw new Error("SECRET_BATCH_MISMATCH");
if(!eq(packet.work_id,WORK_ID)) throw new Error("SECRET_WORKID_MISMATCH");
if(!eq(packet.input_hash,INPUT_HASH)) throw new Error("SECRET_INPUT_MISMATCH");
if(!eq(packet.scorer_id_hash,SCORER_ID_HASH)) throw new Error("SECRET_SCORER_MISMATCH");
if(!eq(packet.commitment,COMMITMENT)) throw new Error("SECRET_COMMITMENT_MISMATCH");

const EXPECTED_OUTPUT_HASH=packet.expected_output_hash;
const SALT=packet.salt;

const client=createPublicClient({transport:http(rpcUrl)});
const chainId=await client.getChainId();
if(chainId!==CHAIN_ID) throw new Error("WRONG_CHAIN");

const [block,policy,batch,reconstructedCommitment,canaryKey,canaryUsed,pendingNonce,funderBalance,liability,custody,released,vaultBalance]=await Promise.all([
  client.getBlock({blockTag:"latest"}),
  client.readContract({address:CONTRACT,abi,functionName:"getPolicy",args:[POLICY_ID]}),
  client.readContract({address:CONTRACT,abi,functionName:"getBatch",args:[POLICY_ID,BATCH_ID]}),
  client.readContract({address:CONTRACT,abi,functionName:"computeCanaryCommitment",args:[POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,EXPECTED_OUTPUT_HASH,SCORER_ID_HASH,SALT]}),
  client.readContract({address:CONTRACT,abi,functionName:"computeCanaryKey",args:[INPUT_HASH,EXPECTED_OUTPUT_HASH,SCORER_ID_HASH]}),
  (async()=>{ 
    const ck=await client.readContract({address:CONTRACT,abi,functionName:"computeCanaryKey",args:[INPUT_HASH,EXPECTED_OUTPUT_HASH,SCORER_ID_HASH]});
    return client.readContract({address:CONTRACT,abi,functionName:"canaryKeyUsed",args:[ck]});
  })(),
  client.getTransactionCount({address:FUNDER,blockTag:"pending"}),
  client.getBalance({address:FUNDER}),
  client.readContract({address:CONTRACT,abi,functionName:"totalLiability"}),
  client.readContract({address:CONTRACT,abi,functionName:"totalCustodyReceived"}),
  client.readContract({address:CONTRACT,abi,functionName:"totalValueReleased"}),
  client.getBalance({address:CONTRACT})
]);

if(!policy.exists || policy.paused || policy.closed || policy.refundIssued) throw new Error("POLICY_NOT_USABLE");
if(getAddress(policy.funder).toLowerCase()!==FUNDER.toLowerCase()) throw new Error("FUNDER_DRIFT");
if(policy.activeBatchId.toLowerCase()!==BATCH_ID.toLowerCase()) throw new Error("ACTIVE_BATCH_DRIFT");
if(policy.scorerIdHash.toLowerCase()!==SCORER_ID_HASH.toLowerCase()) throw new Error("SCORER_DRIFT");
if(block.timestamp>policy.expiry) throw new Error("POLICY_EXPIRED");
if(Number(batch.state)!==2) throw new Error("BATCH_NOT_OUTPUT_LOCKED");
if(batch.commitment.toLowerCase()!==COMMITMENT.toLowerCase()) throw new Error("COMMITMENT_DRIFT");
if(batch.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("WORKID_DRIFT");
if(batch.inputHash.toLowerCase()!==INPUT_HASH.toLowerCase()) throw new Error("INPUT_DRIFT");
if(batch.outputHash.toLowerCase()!==OUTPUT_HASH.toLowerCase()) throw new Error("OUTPUT_DRIFT");
if(batch.providerDigest.toLowerCase()!==PROVIDER_DIGEST.toLowerCase()) throw new Error("PROVIDER_DIGEST_DRIFT");
if(reconstructedCommitment.toLowerCase()!==COMMITMENT.toLowerCase()) throw new Error("REVEAL_PREIMAGE_COMMITMENT_MISMATCH");
if(canaryUsed) throw new Error("CANARY_KEY_ALREADY_USED");
if(liability!==20000000000000000n || custody!==20000000000000000n || released!==0n || vaultBalance!==20000000000000000n) throw new Error("VAULT_VALUE_DRIFT");

const calldata=encodeFunctionData({
  abi,
  functionName:"revealCanary",
  args:[POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,EXPECTED_OUTPUT_HASH,SALT]
});
const calldataHash=keccak256(calldata);

const callResult=await client.call({account:FUNDER,to:CONTRACT,data:calldata,value:0n});
const returnedCanaryKey=decodeFunctionResult({abi,functionName:"revealCanary",data:callResult.data});
if(returnedCanaryKey.toLowerCase()!==canaryKey.toLowerCase()) throw new Error("ETH_CALL_CANARY_KEY_MISMATCH");

const gasEstimate=await client.estimateGas({account:FUNDER,to:CONTRACT,data:calldata,value:0n});
const gasPrice=await client.getGasPrice();
const estimatedFee=gasEstimate*gasPrice;

const out={
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_REVEAL_CANARY_PREFLIGHT_V1",
  result:"PASS",
  chain_id:CHAIN_ID,
  observed_block:block.number.toString(),
  observed_timestamp:block.timestamp.toString(),
  contract:CONTRACT,
  sender:FUNDER,
  sender_pending_nonce:pendingNonce,
  sender_balance_wei:funderBalance.toString(),
  policy_id:POLICY_ID,
  batch_id:BATCH_ID,
  work_id:WORK_ID,
  input_hash:INPUT_HASH,
  locked_output_hash:OUTPUT_HASH,
  provider_digest:PROVIDER_DIGEST,
  commitment:COMMITMENT,
  commitment_reconstruction_passed:true,
  batch_state:2,
  canary_key:canaryKey,
  canary_key_used:false,
  tx_value_wei:"0",
  calldata_keccak256:calldataHash,
  eth_call_passed:true,
  eth_call_return_canary_key:returnedCanaryKey,
  eth_estimateGas_passed:true,
  gas_estimate:gasEstimate.toString(),
  gas_price_wei:gasPrice.toString(),
  estimated_fee_wei:estimatedFee.toString(),
  secret_boundary:{
    reveal_packet_loaded_from_runner_temp:true,
    expected_output_hash_logged:false,
    salt_logged:false,
    raw_calldata_logged:false
  },
  vault:{
    total_liability_wei:liability.toString(),
    total_custody_received_wei:custody.toString(),
    total_value_released_wei:released.toString(),
    balance_wei:vaultBalance.toString()
  },
  protected_actions:{
    revealCanary:"NOT_AUTHORIZED",
    resolveBatch:"NOT_AUTHORIZED"
  }
};
const serialized=JSON.stringify(out,null,2);
for(const forbiddenField of ["expected_output_hash","salt","expected_canonical_output","input_text","canary_key_secret"]) {
  if(serialized.toLowerCase().includes('"'+forbiddenField.toLowerCase()+'"')) throw new Error("PUBLIC_OUTPUT_SECRET_FIELD_LEAK");
}
for(const forbiddenValue of [SALT,calldata]) {
  if(serialized.toLowerCase().includes(String(forbiddenValue).toLowerCase())) throw new Error("PUBLIC_OUTPUT_SECRET_VALUE_LEAK");
}
console.log(serialized);
