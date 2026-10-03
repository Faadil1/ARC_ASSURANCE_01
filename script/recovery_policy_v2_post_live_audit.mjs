#!/usr/bin/env node
import fs from "node:fs";
import {
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  keccak256,
  decodeFunctionResult
} from "viem";

const [rpcUrl, artifactPath] = process.argv.slice(2);
if (!rpcUrl || !artifactPath) throw new Error("USAGE");
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));
const abi = artifact.abi;

const CHAIN_ID = 5042;
const CONTRACT = getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER = getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const PROVIDER = getAddress("0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe");
const RECIPIENT = getAddress("0x6B8ad09233dF44eD57B99aF8839129303955590C");
const SCORER = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
const POLICY = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const COMMITMENT = "0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17";
const WORK = "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
const INPUT = "0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde";
const OUTPUT = "0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
const DIGEST = "0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";
const CANARY = "0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574";
const SIGNATURE = "0xab6655ce07beaa2d464794257026dec139f7f5d27f500ed2e0e2d4213f0e7e9755a59365e1fa78ab28eb919f3444e931f088fc4938b050d4a0a47dd49aa1ace41b";

const V1_POLICY = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
const V1_BATCH = "0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";
const V1_COMMITMENT = "0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9";

const TXS = [
  {step:"createPolicy", hash:"0x0bb6e1ef61504f8f1ea4f899c88cccc9a65c10ea0646867e9ebac87a57341fd4", nonce:10, block:24052629, selector:"0xd2a6f88d", value:0n},
  {step:"fund", hash:"0x0135a9f0c0882bd64b8d2c0dd2cb22f79f48fa17aca82cad95153e8efebab348", nonce:11, block:24055978, selector:"0xbf14c119", value:10000000000000000n},
  {step:"commitBatch", hash:"0x36d8d4dc972a2ef557d2a9eee38a5607e128eef01694d8620fef207befd61c07", nonce:12, block:24060767, selector:"0xcd29fa6c", value:0n, calldataHash:"0xbb2035436436b15588fe49896ce036d68b271f41d5499fb7297c371642e23b95"},
  {step:"lockProviderOutput", hash:"0x7de28364a63875b38f58649d8b85629422e8c5f2cebb29626e39ad157611ae78", nonce:13, block:24099169, selector:"0xaeca0071", value:0n, calldataHash:"0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b"},
  {step:"revealCanary", hash:"0xddbeb788ab6e643523f8a7ea3d456c35309cfaf9638ccf1e5d9ea044a2c054b2", nonce:14, block:24104229, selector:"0x2f02a092", value:0n, calldataHash:"0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031"},
  {step:"resolveBatch", hash:"0x43c2d82be1016f9783ff14def12e01e7f6900051051c7aed8ec04ea033a765a5", nonce:15, block:24106680, selector:"0x3339f903", value:0n, calldataHash:"0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320"}
];

const eq=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();

const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

async function rpc(method, params=[]) {
  for(let attempt=1; attempt<=7; attempt++){
    const res = await fetch(rpcUrl,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:attempt,method,params})
    });
    const body = await res.json();
    if(!body.error) return body.result;

    const rateLimited =
      body.error.code === -32005 ||
      /rate limit/i.test(String(body.error.message || ""));

    if(!rateLimited || attempt===7) {
      throw new Error(method+":"+JSON.stringify(body.error));
    }

    await sleep(750 * attempt);
  }
  throw new Error(method+":RPC_RETRY_EXHAUSTED");
}

async function call(name,args=[],block="latest"){
  const data=encodeFunctionData({abi,functionName:name,args});
  const raw=await rpc("eth_call",[{to:CONTRACT,data},block]);
  return decodeFunctionResult({abi,functionName:name,data:raw});
}

const chainId=Number(BigInt(await rpc("eth_chainId")));
if(chainId!==CHAIN_ID) throw new Error("CHAIN_ID_MISMATCH");

const txEvidence=[];
let previousBlock=0;
for(const x of TXS){
  const [tx,receipt]=await Promise.all([
    rpc("eth_getTransactionByHash",[x.hash]),
    rpc("eth_getTransactionReceipt",[x.hash])
  ]);
  if(!tx||!receipt) throw new Error(x.step+"_MISSING");
  if(BigInt(receipt.status)!==1n) throw new Error(x.step+"_FAILED");
  if(getAddress(tx.from).toLowerCase()!==FUNDER.toLowerCase()) throw new Error(x.step+"_FROM");
  if(!tx.to||getAddress(tx.to).toLowerCase()!==CONTRACT.toLowerCase()) throw new Error(x.step+"_TO");
  if(Number(BigInt(tx.nonce))!==x.nonce) throw new Error(x.step+"_NONCE");
  if(Number(BigInt(receipt.blockNumber))!==x.block) throw new Error(x.step+"_BLOCK");
  if(Number(BigInt(receipt.blockNumber))<=previousBlock) throw new Error(x.step+"_BLOCK_ORDER");
  previousBlock=Number(BigInt(receipt.blockNumber));
  if(BigInt(tx.value)!==x.value) throw new Error(x.step+"_VALUE");
  if(!tx.input.startsWith(x.selector)) throw new Error(x.step+"_SELECTOR");
  const dataHash=keccak256(tx.input);
  if(x.calldataHash && !eq(dataHash,x.calldataHash)) throw new Error(x.step+"_CALLDATA_HASH");

  const decoded=decodeFunctionData({abi,data:tx.input});
  if(decoded.functionName!==x.step) throw new Error(x.step+"_DECODE_NAME");
  const args=decoded.args;

  if(x.step==="createPolicy"){
    if(!eq(args[0],POLICY) || !eq(args[1],FUNDER) || !eq(args[2],PROVIDER) || !eq(args[3],RECIPIENT) || !eq(args[4],SCORER)) throw new Error("CREATE_ARGS");
    if(Number(args[5])!==2 || BigInt(args[6])!==20000000000000000n || BigInt(args[7])!==2000000000000000n || BigInt(args[8])!==1792465200n) throw new Error("CREATE_PARAMS");
  } else if(x.step==="fund"){
    if(!eq(args[0],POLICY)) throw new Error("FUND_POLICY");
  } else if(x.step==="commitBatch"){
    if(!eq(args[0],POLICY)||!eq(args[1],BATCH)||!eq(args[2],COMMITMENT)) throw new Error("COMMIT_ARGS");
  } else if(x.step==="lockProviderOutput"){
    const o=args[0];
    if(!eq(o.provider,PROVIDER)||!eq(o.policyId,POLICY)||!eq(o.batchId,BATCH)||!eq(o.workId,WORK)||!eq(o.inputHash,INPUT)||!eq(o.outputHash,OUTPUT)||!eq(o.scorerIdHash,SCORER)||BigInt(o.nonce)!==1n||BigInt(o.deadline)!==1792465200n) throw new Error("LOCK_OUTPUT_ARGS");
    if(!eq(args[1],SIGNATURE)) throw new Error("LOCK_SIGNATURE");
  } else if(x.step==="revealCanary"){
    if(!eq(args[0],POLICY)||!eq(args[1],BATCH)||!eq(args[2],WORK)||!eq(args[3],INPUT)) throw new Error("REVEAL_PUBLIC_ARGS");
    const reconstructed=await call("computeCanaryCommitment",[POLICY,BATCH,WORK,INPUT,args[4],SCORER,args[5]]);
    if(!eq(reconstructed,COMMITMENT)) throw new Error("REVEAL_COMMITMENT");
    const canary=await call("computeCanaryKey",[INPUT,args[4],SCORER]);
    if(!eq(canary,CANARY)) throw new Error("REVEAL_CANARY_KEY");
  } else if(x.step==="resolveBatch"){
    if(!eq(args[0],POLICY)||!eq(args[1],BATCH)) throw new Error("RESOLVE_ARGS");
  }

  txEvidence.push({
    step:x.step,
    tx_hash:x.hash,
    nonce:x.nonce,
    block:x.block,
    selector:x.selector,
    value_wei:String(x.value),
    calldata_keccak256:dataHash,
    receipt_status:1
  });
}

const policy=await call("getPolicy",[POLICY]);
const batch=await call("getBatch",[POLICY,BATCH]);
const workUsed=await call("workIdUsed",[WORK]);
const digestConsumed=await call("providerOutputConsumed",[DIGEST]);
const canaryUsed=await call("canaryKeyUsed",[CANARY]);
const recovered=await call("recoverProvider",[{
  provider:PROVIDER,policyId:POLICY,batchId:BATCH,workId:WORK,inputHash:INPUT,outputHash:OUTPUT,scorerIdHash:SCORER,nonce:1n,deadline:1792465200n
},SIGNATURE]);
const liability=await call("totalLiability");
const custody=await call("totalCustodyReceived");
const released=await call("totalValueReleased");
const vaultBalance=BigInt(await rpc("eth_getBalance",[CONTRACT,"latest"]));
const p1=await call("getPolicy",[V1_POLICY]);
const b1=await call("getBatch",[V1_POLICY,V1_BATCH]);
const pendingNonce=Number(BigInt(await rpc("eth_getTransactionCount",[FUNDER,"pending"])));

if(!policy.exists || policy.paused || policy.closed || policy.refundIssued) throw new Error("V2_POLICY_FINAL_FLAGS");
if(!eq(policy.funder,FUNDER)||!eq(policy.provider,PROVIDER)||!eq(policy.payoutRecipient,RECIPIENT)||!eq(policy.scorerIdHash,SCORER)) throw new Error("V2_POLICY_BINDING");
if(Number(policy.failureCount)!==0||Number(policy.maxFailures)!==2) throw new Error("V2_FAILURE_STATE");
if(BigInt(policy.maxSpendCap)!==20000000000000000n||BigInt(policy.unitPayout)!==2000000000000000n||BigInt(policy.expiry)!==1792465200n) throw new Error("V2_POLICY_PARAMS");
if(BigInt(policy.totalFunded)!==10000000000000000n||BigInt(policy.totalPaidOut)!==2000000000000000n||BigInt(policy.totalRefunded)!==0n) throw new Error("V2_POLICY_ACCOUNTING");
if(policy.activeBatchId!=="0x"+"0".repeat(64)) throw new Error("V2_ACTIVE_BATCH");

if(Number(batch.state)!==4||Number(batch.directive)!==1) throw new Error("V2_BATCH_FINAL_STATE");
if(!eq(batch.commitment,COMMITMENT)||!eq(batch.workId,WORK)||!eq(batch.inputHash,INPUT)||!eq(batch.outputHash,OUTPUT)||!eq(batch.expectedOutputHash,OUTPUT)||!eq(batch.providerDigest,DIGEST)) throw new Error("V2_BATCH_BINDING");
if(!workUsed||!digestConsumed||!canaryUsed) throw new Error("V2_CONSUMPTION_FLAGS");
if(getAddress(recovered).toLowerCase()!==PROVIDER.toLowerCase()) throw new Error("PROVIDER_RECOVERY");

if(BigInt(liability)!==18000000000000000n||BigInt(custody)!==20000000000000000n||BigInt(released)!==2000000000000000n||vaultBalance!==18000000000000000n) throw new Error("VAULT_FINAL_ACCOUNTING");

if(!p1.exists||!eq(p1.activeBatchId,V1_BATCH)||BigInt(p1.totalFunded)!==10000000000000000n||BigInt(p1.totalPaidOut)!==0n||BigInt(p1.totalRefunded)!==0n) throw new Error("V1_POLICY_DRIFT");
if(Number(b1.state)!==1||!eq(b1.commitment,V1_COMMITMENT)) throw new Error("V1_BATCH_DRIFT");

const resolveBlock=24106680n;
const before=BigInt(await rpc("eth_getBalance",[RECIPIENT,"0x"+(resolveBlock-1n).toString(16)]));
const at=BigInt(await rpc("eth_getBalance",[RECIPIENT,"0x"+resolveBlock.toString(16)]));
if(at-before!==2000000000000000n) throw new Error("RECIPIENT_PAYOUT_DELTA");

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_POST_LIVE_AUDIT_V1",
  result:"PASS",
  chain_id:CHAIN_ID,
  contract:CONTRACT,
  transaction_sequence:txEvidence,
  end_to_end:{
    create_policy:"PROVEN",
    funding:"PROVEN",
    precommit:"PROVEN",
    provider_signature_binding:"PROVEN",
    provider_output_lock:"PROVEN",
    reveal_commitment_binding:"PROVEN",
    deterministic_match:"PROVEN",
    settlement_directive:"PAY",
    exact_payout_delta_wei:"2000000000000000",
    real_financial_consequence:"PROVEN"
  },
  final_v2_state:{
    batch_state:"RESOLVED",
    directive:"PAY",
    active_batch_zero:true,
    total_funded_wei:String(policy.totalFunded),
    total_paid_out_wei:String(policy.totalPaidOut),
    protected_remainder_wei:"8000000000000000",
    failure_count:Number(policy.failureCount),
    paused:policy.paused,
    work_id_used:workUsed,
    provider_digest_consumed:digestConsumed,
    canary_key_used:canaryUsed,
    provider_recovered:getAddress(recovered)
  },
  vault:{
    total_liability_wei:String(liability),
    total_custody_received_wei:String(custody),
    total_value_released_wei:String(released),
    balance_wei:String(vaultBalance)
  },
  recipient_transfer:{
    recipient:RECIPIENT,
    before_wei:String(before),
    at_settlement_block_wei:String(at),
    delta_wei:String(at-before)
  },
  v1_continuity:{
    status:"SEPARATE_RECOVERY_OBLIGATION",
    batch_state:"COMMITTED",
    total_funded_wei:String(p1.totalFunded),
    commitment:V1_COMMITMENT
  },
  authority_pending_nonce:pendingNonce,
  protected_v2_actions_remaining:0
},null,2));
