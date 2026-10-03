#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeEventLog,
  encodeFunctionData,
  getAddress,
  keccak256,
  decodeFunctionResult
} from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi = artifact.abi;

const CHAIN_ID = 5042;
const TX_HASH = "0xddbeb788ab6e643523f8a7ea3d456c35309cfaf9638ccf1e5d9ea044a2c054b2";
const CONTRACT = getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER = getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");

const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const WORK_ID = "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
const INPUT_HASH = "0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde";
const LOCKED_OUTPUT_HASH = "0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
const SCORER_ID_HASH = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
const COMMITMENT = "0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17";
const EXPECTED_CANARY_KEY = "0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574";
const EXPECTED_CALLDATA_HASH = "0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031";
const PROVIDER_DIGEST = "0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";

const V1_POLICY_ID = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const V1_BATCH_ID = "0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";

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
if(Number(BigInt(tx.nonce))!==14) throw new Error("NONCE_MISMATCH");
if(BigInt(tx.value)!==0n) throw new Error("VALUE_MISMATCH");
if(!tx.input?.startsWith("0x2f02a092")) throw new Error("METHOD_SELECTOR_MISMATCH");
if(keccak256(tx.input).toLowerCase()!==EXPECTED_CALLDATA_HASH.toLowerCase()) throw new Error("CALLDATA_HASH_MISMATCH");

let revealEvent=null;
for(const log of receipt.logs ?? []) {
  if(log.address.toLowerCase()!==CONTRACT.toLowerCase()) continue;
  try {
    const d=decodeEventLog({abi,data:log.data,topics:log.topics});
    if(d.eventName==="CanaryRevealed" &&
       d.args.policyId.toLowerCase()===POLICY_ID.toLowerCase() &&
       d.args.batchId.toLowerCase()===BATCH_ID.toLowerCase()) {
      revealEvent=d.args;
    }
  } catch {}
}
if(!revealEvent) throw new Error("CANARY_REVEALED_EVENT_MISSING");

if(revealEvent.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("EVENT_WORKID_MISMATCH");
if(revealEvent.inputHash.toLowerCase()!==INPUT_HASH.toLowerCase()) throw new Error("EVENT_INPUT_MISMATCH");
if(revealEvent.scorerIdHash.toLowerCase()!==SCORER_ID_HASH.toLowerCase()) throw new Error("EVENT_SCORER_MISMATCH");
if(revealEvent.canaryKey.toLowerCase()!==EXPECTED_CANARY_KEY.toLowerCase()) throw new Error("EVENT_CANARY_KEY_MISMATCH");
if(BigInt(revealEvent.blockNumber)!==BigInt(receipt.blockNumber)) throw new Error("EVENT_BLOCK_MISMATCH");

const reconstructed = await call("computeCanaryCommitment",[
  POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,revealEvent.expectedOutputHash,SCORER_ID_HASH,revealEvent.salt
]);
if(reconstructed.toLowerCase()!==COMMITMENT.toLowerCase()) throw new Error("EVENT_PREIMAGE_COMMITMENT_MISMATCH");

const derivedCanaryKey = await call("computeCanaryKey",[
  INPUT_HASH,revealEvent.expectedOutputHash,SCORER_ID_HASH
]);
if(derivedCanaryKey.toLowerCase()!==EXPECTED_CANARY_KEY.toLowerCase()) throw new Error("DERIVED_CANARY_KEY_MISMATCH");

const [p2,b2,canaryUsed,pendingNonce,liability,custody,released,vaultBalance,p1,b1] = await Promise.all([
  call("getPolicy",[POLICY_ID]),
  call("getBatch",[POLICY_ID,BATCH_ID]),
  call("canaryKeyUsed",[EXPECTED_CANARY_KEY]),
  rpc("eth_getTransactionCount",[FUNDER,"pending"]).then(x=>Number(BigInt(x))),
  call("totalLiability"),
  call("totalCustodyReceived"),
  call("totalValueReleased"),
  rpc("eth_getBalance",[CONTRACT,"latest"]).then(x=>BigInt(x)),
  call("getPolicy",[V1_POLICY_ID]),
  call("getBatch",[V1_POLICY_ID,V1_BATCH_ID])
]);

if(p2.activeBatchId.toLowerCase()!==BATCH_ID.toLowerCase()) throw new Error("V2_ACTIVE_BATCH_MISMATCH");
if(Number(b2.state)!==3) throw new Error("V2_BATCH_NOT_REVEALED");
if(b2.workId.toLowerCase()!==WORK_ID.toLowerCase()) throw new Error("V2_WORKID_MISMATCH");
if(b2.inputHash.toLowerCase()!==INPUT_HASH.toLowerCase()) throw new Error("V2_INPUT_MISMATCH");
if(b2.outputHash.toLowerCase()!==LOCKED_OUTPUT_HASH.toLowerCase()) throw new Error("V2_OUTPUT_MISMATCH");
if(b2.providerDigest.toLowerCase()!==PROVIDER_DIGEST.toLowerCase()) throw new Error("V2_PROVIDER_DIGEST_MISMATCH");
if(b2.expectedOutputHash.toLowerCase()!==revealEvent.expectedOutputHash.toLowerCase()) throw new Error("V2_EXPECTED_OUTPUT_MISMATCH");
if(canaryUsed!==true) throw new Error("CANARY_KEY_NOT_CONSUMED");

if(Number(b1.state)!==1) throw new Error("V1_BATCH_STATE_DRIFT");
if(BigInt(p1.totalFunded)!==10000000000000000n) throw new Error("V1_FUNDED_DRIFT");
if(BigInt(p2.totalFunded)!==10000000000000000n) throw new Error("V2_FUNDED_DRIFT");

const L=BigInt(liability), C=BigInt(custody), R=BigInt(released);
if(L!==20000000000000000n) throw new Error("LIABILITY_DRIFT");
if(C!==20000000000000000n) throw new Error("CUSTODY_DRIFT");
if(R!==0n) throw new Error("RELEASED_DRIFT");
if(vaultBalance!==20000000000000000n) throw new Error("BALANCE_DRIFT");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_REVEAL_CANARY_RECEIPT_V1",
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
  event:{
    name:"CanaryRevealed",
    policy_id:revealEvent.policyId,
    batch_id:revealEvent.batchId,
    work_id:revealEvent.workId,
    input_hash:revealEvent.inputHash,
    scorer_id_hash:revealEvent.scorerIdHash,
    canary_key:revealEvent.canaryKey,
    block_number:String(revealEvent.blockNumber),
    commitment_reconstruction_passed:true,
    secret_preimage_now_public_onchain:true
  },
  post_state:{
    authority_pending_nonce:pendingNonce,
    v2_batch_state:Number(b2.state),
    v2_expected_output_matches_event:true,
    v2_work_id:b2.workId,
    v2_input_hash:b2.inputHash,
    v2_output_hash:b2.outputHash,
    v2_provider_digest:b2.providerDigest,
    canary_key_used:canaryUsed,
    provider_output_matches_expected: b2.outputHash.toLowerCase()===b2.expectedOutputHash.toLowerCase(),
    v2_total_funded_wei:String(p2.totalFunded),
    v2_total_paid_out_wei:String(p2.totalPaidOut),
    v1_batch_state:Number(b1.state),
    v1_total_funded_wei:String(p1.totalFunded),
    total_liability_wei:String(L),
    total_custody_received_wei:String(C),
    total_value_released_wei:String(R),
    contract_balance_wei:String(vaultBalance)
  },
  protected_actions:{
    resolveBatch:"NOT_AUTHORIZED"
  }
},null,2));
