#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  keccak256
} from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi = artifact.abi;

const CHAIN_ID = 5042;
const TX_HASH = "0x7de28364a63875b38f58649d8b85629422e8c5f2cebb29626e39ad157611ae78";
const CONTRACT = getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER = getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const PROVIDER = getAddress("0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe");
const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const WORK_ID = "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
const INPUT_HASH = "0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde";
const OUTPUT_HASH = "0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
const SCORER_ID_HASH = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
const DIGEST = "0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";
const SIGNATURE = "0xab6655ce07beaa2d464794257026dec139f7f5d27f500ed2e0e2d4213f0e7e9755a59365e1fa78ab28eb919f3444e931f088fc4938b050d4a0a47dd49aa1ace41b";
const EXPECTED_CALLDATA_HASH = "0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b";
const V1_POLICY_ID = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const V1_BATCH_ID = "0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";
const V1_COMMITMENT = "0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9";

const OUTPUT = {
  provider: PROVIDER,
  policyId: POLICY_ID,
  batchId: BATCH_ID,
  workId: WORK_ID,
  inputHash: INPUT_HASH,
  outputHash: OUTPUT_HASH,
  scorerIdHash: SCORER_ID_HASH,
  nonce: 1n,
  deadline: 1792465200n
};

async function rpc(method, params=[]) {
  const res = await fetch(rpcUrl,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  const body = await res.json();
  if(body.error) throw new Error(method+":"+JSON.stringify(body.error));
  return body.result;
}

async function call(name,args=[]) {
  const data = encodeFunctionData({abi,functionName:name,args});
  const raw = await rpc("eth_call",[{to:CONTRACT,data},"latest"]);
  return decodeFunctionResult({abi,functionName:name,data:raw});
}

const chainId = Number(BigInt(await rpc("eth_chainId")));
if(chainId!==CHAIN_ID) throw new Error("CHAIN_ID_MISMATCH");

const tx = await rpc("eth_getTransactionByHash",[TX_HASH]);
const receipt = await rpc("eth_getTransactionReceipt",[TX_HASH]);
if(!tx || !receipt) throw new Error("TX_OR_RECEIPT_MISSING");
if(BigInt(receipt.status)!==1n) throw new Error("TX_NOT_SUCCESS");
if(getAddress(tx.from).toLowerCase()!==FUNDER.toLowerCase()) throw new Error("FROM_MISMATCH");
if(!tx.to || getAddress(tx.to).toLowerCase()!==CONTRACT.toLowerCase()) throw new Error("TO_MISMATCH");
if(Number(BigInt(tx.nonce))!==13) throw new Error("NONCE_MISMATCH");
if(BigInt(tx.value)!==0n) throw new Error("VALUE_MISMATCH");
if(!tx.input?.startsWith("0xaeca0071")) throw new Error("METHOD_SELECTOR_MISMATCH");
if(keccak256(tx.input).toLowerCase()!==EXPECTED_CALLDATA_HASH.toLowerCase()) throw new Error("CALLDATA_HASH_MISMATCH");

let consumedEvent=null, lockedEvent=null;
for(const log of receipt.logs ?? []) {
  if(log.address.toLowerCase()!==CONTRACT.toLowerCase()) continue;
  try {
    const d=decodeEventLog({abi,data:log.data,topics:log.topics});
    if(d.eventName==="ProviderOutputConsumed" && d.args.digest.toLowerCase()===DIGEST.toLowerCase()) {
      consumedEvent=d.args;
    }
    if(d.eventName==="ProviderOutputLocked" &&
       d.args.policyId.toLowerCase()===POLICY_ID.toLowerCase() &&
       d.args.batchId.toLowerCase()===BATCH_ID.toLowerCase()) {
      lockedEvent=d.args;
    }
  } catch {}
}

if(!consumedEvent) throw new Error("PROVIDER_OUTPUT_CONSUMED_EVENT_MISSING");
if(getAddress(consumedEvent.provider).toLowerCase()!==PROVIDER.toLowerCase()) throw new Error("CONSUMED_EVENT_PROVIDER_MISMATCH");
if(consumedEvent.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("CONSUMED_EVENT_WORKID_MISMATCH");
if(consumedEvent.policyId.toLowerCase()!==POLICY_ID.toLowerCase()) throw new Error("CONSUMED_EVENT_POLICY_MISMATCH");
if(consumedEvent.batchId.toLowerCase()!==BATCH_ID.toLowerCase()) throw new Error("CONSUMED_EVENT_BATCH_MISMATCH");
if(BigInt(consumedEvent.nonce)!==1n) throw new Error("CONSUMED_EVENT_NONCE_MISMATCH");

if(!lockedEvent) throw new Error("PROVIDER_OUTPUT_LOCKED_EVENT_MISSING");
if(lockedEvent.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("LOCKED_EVENT_WORKID_MISMATCH");
if(lockedEvent.inputHash.toLowerCase()!==INPUT_HASH.toLowerCase()) throw new Error("LOCKED_EVENT_INPUT_MISMATCH");
if(lockedEvent.outputHash.toLowerCase()!==OUTPUT_HASH.toLowerCase()) throw new Error("LOCKED_EVENT_OUTPUT_MISMATCH");
if(lockedEvent.scorerIdHash.toLowerCase()!==SCORER_ID_HASH.toLowerCase()) throw new Error("LOCKED_EVENT_SCORER_MISMATCH");
if(lockedEvent.providerDigest.toLowerCase()!==DIGEST.toLowerCase()) throw new Error("LOCKED_EVENT_DIGEST_MISMATCH");
if(getAddress(lockedEvent.provider).toLowerCase()!==PROVIDER.toLowerCase()) throw new Error("LOCKED_EVENT_PROVIDER_MISMATCH");
if(BigInt(lockedEvent.blockNumber)!==BigInt(receipt.blockNumber)) throw new Error("LOCKED_EVENT_BLOCK_MISMATCH");

const p2 = await call("getPolicy",[POLICY_ID]);
const b2 = await call("getBatch",[POLICY_ID,BATCH_ID]);
const workUsed = await call("workIdUsed",[WORK_ID]);
const digestConsumed = await call("providerOutputConsumed",[DIGEST]);
const recovered = await call("recoverProvider",[OUTPUT,SIGNATURE]);
const pendingNonce = Number(BigInt(await rpc("eth_getTransactionCount",[FUNDER,"pending"])));

if(p2.activeBatchId.toLowerCase()!==BATCH_ID.toLowerCase()) throw new Error("V2_ACTIVE_BATCH_MISMATCH");
if(Number(b2.state)!==2) throw new Error("V2_BATCH_NOT_OUTPUT_LOCKED");
if(b2.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("V2_WORKID_MISMATCH");
if(b2.inputHash.toLowerCase()!==INPUT_HASH.toLowerCase()) throw new Error("V2_INPUTHASH_MISMATCH");
if(b2.outputHash.toLowerCase()!==OUTPUT_HASH.toLowerCase()) throw new Error("V2_OUTPUTHASH_MISMATCH");
if(b2.providerDigest.toLowerCase()!==DIGEST.toLowerCase()) throw new Error("V2_PROVIDER_DIGEST_MISMATCH");
if(workUsed!==true) throw new Error("WORKID_NOT_CONSUMED");
if(digestConsumed!==true) throw new Error("DIGEST_NOT_CONSUMED");
if(getAddress(recovered).toLowerCase()!==PROVIDER.toLowerCase()) throw new Error("RECOVER_PROVIDER_POST_MISMATCH");

const p1 = await call("getPolicy",[V1_POLICY_ID]);
const b1 = await call("getBatch",[V1_POLICY_ID,V1_BATCH_ID]);
if(p1.activeBatchId.toLowerCase()!==V1_BATCH_ID.toLowerCase()) throw new Error("V1_ACTIVE_BATCH_DRIFT");
if(Number(b1.state)!==1) throw new Error("V1_BATCH_STATE_DRIFT");
if(b1.commitment.toLowerCase()!==V1_COMMITMENT.toLowerCase()) throw new Error("V1_COMMITMENT_DRIFT");
if(BigInt(p1.totalFunded)!==10000000000000000n) throw new Error("V1_FUNDED_DRIFT");

const liability=BigInt(await call("totalLiability"));
const custody=BigInt(await call("totalCustodyReceived"));
const released=BigInt(await call("totalValueReleased"));
const balance=BigInt(await rpc("eth_getBalance",[CONTRACT,"latest"]));

if(BigInt(p2.totalFunded)!==10000000000000000n) throw new Error("V2_FUNDED_DRIFT");
if(liability!==20000000000000000n) throw new Error("LIABILITY_DRIFT");
if(custody!==20000000000000000n) throw new Error("CUSTODY_DRIFT");
if(released!==0n) throw new Error("RELEASED_DRIFT");
if(balance!==20000000000000000n) throw new Error("BALANCE_DRIFT");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_LOCK_PROVIDER_OUTPUT_RECEIPT_V1",
  result:"PASS",
  chain_id:chainId,
  transaction:{
    hash:TX_HASH,
    status:1,
    block_number:Number(BigInt(receipt.blockNumber)),
    block_hash:receipt.blockHash,
    from:getAddress(tx.from),
    to:getAddress(tx.to),
    nonce:Number(BigInt(tx.nonce)),
    value_wei:String(BigInt(tx.value)),
    selector:tx.input.slice(0,10),
    calldata_keccak256:keccak256(tx.input),
    gas_used:String(BigInt(receipt.gasUsed)),
    effective_gas_price_wei:String(BigInt(receipt.effectiveGasPrice ?? tx.gasPrice ?? "0x0"))
  },
  events:{
    ProviderOutputConsumed:{
      digest:consumedEvent.digest,
      provider:getAddress(consumedEvent.provider),
      work_id:consumedEvent.workId,
      policy_id:consumedEvent.policyId,
      batch_id:consumedEvent.batchId,
      nonce:String(consumedEvent.nonce)
    },
    ProviderOutputLocked:{
      policy_id:lockedEvent.policyId,
      batch_id:lockedEvent.batchId,
      work_id:lockedEvent.workId,
      input_hash:lockedEvent.inputHash,
      output_hash:lockedEvent.outputHash,
      scorer_id_hash:lockedEvent.scorerIdHash,
      provider_digest:lockedEvent.providerDigest,
      provider:getAddress(lockedEvent.provider),
      block_number:String(lockedEvent.blockNumber)
    }
  },
  post_state:{
    authority_pending_nonce:pendingNonce,
    v2_batch_state:Number(b2.state),
    v2_work_id:b2.workId,
    v2_input_hash:b2.inputHash,
    v2_output_hash:b2.outputHash,
    v2_provider_digest:b2.providerDigest,
    work_id_used:workUsed,
    provider_digest_consumed:digestConsumed,
    recovered_provider:getAddress(recovered),
    v2_total_funded_wei:String(p2.totalFunded),
    v1_batch_state:Number(b1.state),
    v1_total_funded_wei:String(p1.totalFunded),
    total_liability_wei:String(liability),
    total_custody_received_wei:String(custody),
    total_value_released_wei:String(released),
    contract_balance_wei:String(balance)
  }
},null,2));
