#!/usr/bin/env node
import fs from "node:fs";
import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  hashTypedData,
  http,
  keccak256,
  recoverTypedDataAddress
} from "viem";
import {
  buildProviderOutputTypedData,
} from "../src/eip712/provider-output-v1.mjs";

const [rpcUrl, artifactPath] = process.argv.slice(2);
const artifact = JSON.parse(fs.readFileSync(artifactPath,"utf8"));

const CHAIN_ID = 5042;
const CONTRACT = getAddress("0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4");
const FUNDER = getAddress("0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb");
const PROVIDER = getAddress("0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe");
const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const WORK_ID = "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
const INPUT_HASH = "0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde";
const OUTPUT_HASH = "0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
const SCORER_ID_HASH = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
const PROVIDER_OUTPUT_NONCE = 1n;
const DEADLINE = 1792465200n;
const SIGNATURE = "0xab6655ce07beaa2d464794257026dec139f7f5d27f500ed2e0e2d4213f0e7e9755a59365e1fa78ab28eb919f3444e931f088fc4938b050d4a0a47dd49aa1ace41b";
const EXPECTED_DIGEST = "0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";

const abi = artifact.abi;
const client = createPublicClient({ transport: http(rpcUrl) });

const chainId = await client.getChainId();
if (chainId !== CHAIN_ID) throw new Error("WRONG_CHAIN");

const code = await client.getBytecode({address: CONTRACT});
if (!code || code === "0x") throw new Error("CONTRACT_CODE_MISSING");

const message = {
  provider: PROVIDER,
  policyId: POLICY_ID,
  batchId: BATCH_ID,
  workId: WORK_ID,
  inputHash: INPUT_HASH,
  outputHash: OUTPUT_HASH,
  scorerIdHash: SCORER_ID_HASH,
  nonce: PROVIDER_OUTPUT_NONCE,
  deadline: DEADLINE,
};

const typedData = buildProviderOutputTypedData({
  chainId: CHAIN_ID,
  verifyingContract: CONTRACT,
  message,
});

const digest = hashTypedData(typedData);
if (digest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) {
  throw new Error("LOCAL_DIGEST_MISMATCH");
}

const recoveredLocal = await recoverTypedDataAddress({
  ...typedData,
  signature: SIGNATURE,
});
if (getAddress(recoveredLocal).toLowerCase() !== PROVIDER.toLowerCase()) {
  throw new Error("LOCAL_RECOVER_MISMATCH");
}

const [block, policy, batch, used, onchainDigest, consumed, recoveredOnchain, pendingNonce, funderBalance, liability, custody, released, vaultBalance] = await Promise.all([
  client.getBlock({blockTag:"latest"}),
  client.readContract({address:CONTRACT,abi,functionName:"getPolicy",args:[POLICY_ID]}),
  client.readContract({address:CONTRACT,abi,functionName:"getBatch",args:[POLICY_ID,BATCH_ID]}),
  client.readContract({address:CONTRACT,abi,functionName:"workIdUsed",args:[WORK_ID]}),
  client.readContract({address:CONTRACT,abi,functionName:"providerOutputDigest",args:[message]}),
  client.readContract({address:CONTRACT,abi,functionName:"providerOutputConsumed",args:[EXPECTED_DIGEST]}),
  client.readContract({address:CONTRACT,abi,functionName:"recoverProvider",args:[message,SIGNATURE]}),
  client.getTransactionCount({address:FUNDER,blockTag:"pending"}),
  client.getBalance({address:FUNDER}),
  client.readContract({address:CONTRACT,abi,functionName:"totalLiability"}),
  client.readContract({address:CONTRACT,abi,functionName:"totalCustodyReceived"}),
  client.readContract({address:CONTRACT,abi,functionName:"totalValueReleased"}),
  client.getBalance({address:CONTRACT}),
]);

if (!policy.exists) throw new Error("POLICY_MISSING");
if (getAddress(policy.funder).toLowerCase() !== FUNDER.toLowerCase()) throw new Error("FUNDER_DRIFT");
if (getAddress(policy.provider).toLowerCase() !== PROVIDER.toLowerCase()) throw new Error("PROVIDER_DRIFT");
if (policy.scorerIdHash.toLowerCase() !== SCORER_ID_HASH.toLowerCase()) throw new Error("SCORER_DRIFT");
if (policy.activeBatchId.toLowerCase() !== BATCH_ID.toLowerCase()) throw new Error("ACTIVE_BATCH_DRIFT");
if (policy.paused || policy.closed || policy.refundIssued) throw new Error("POLICY_NOT_USABLE");
if (block.timestamp > policy.expiry) throw new Error("POLICY_EXPIRED");
if (Number(batch.state) !== 1) throw new Error("BATCH_NOT_COMMITTED");
if (batch.commitment.toLowerCase() !== "0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17") throw new Error("COMMITMENT_DRIFT");
if (used) throw new Error("WORK_ID_USED");
if (onchainDigest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) throw new Error("ONCHAIN_DIGEST_MISMATCH");
if (consumed) throw new Error("DIGEST_ALREADY_CONSUMED");
if (getAddress(recoveredOnchain).toLowerCase() !== PROVIDER.toLowerCase()) throw new Error("ONCHAIN_RECOVER_MISMATCH");
if (liability !== 20000000000000000n) throw new Error("LIABILITY_DRIFT");
if (custody !== 20000000000000000n) throw new Error("CUSTODY_DRIFT");
if (released !== 0n) throw new Error("RELEASED_DRIFT");
if (vaultBalance !== 20000000000000000n) throw new Error("VAULT_BALANCE_DRIFT");

const calldata = encodeFunctionData({
  abi,
  functionName:"lockProviderOutput",
  args:[message,SIGNATURE],
});
const calldataHash = keccak256(calldata);

const callResult = await client.call({
  account:FUNDER,
  to:CONTRACT,
  data:calldata,
  value:0n,
});
const decoded = decodeFunctionResult({
  abi,
  functionName:"lockProviderOutput",
  data:callResult.data,
});
if (String(decoded).toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) {
  throw new Error("ETH_CALL_RETURN_DIGEST_MISMATCH");
}

const gasEstimate = await client.estimateGas({
  account:FUNDER,
  to:CONTRACT,
  data:calldata,
  value:0n,
});
const gasPrice = await client.getGasPrice();
const estimatedFee = gasEstimate * gasPrice;

console.log(JSON.stringify({
  schema:"ARC_ASSURANCE_RECOVERY_POLICY_V2_LOCK_PROVIDER_OUTPUT_PREFLIGHT_V1",
  result:"PASS",
  chain_id:CHAIN_ID,
  observed_block:block.number.toString(),
  observed_timestamp:block.timestamp.toString(),
  contract:CONTRACT,
  sender:FUNDER,
  sender_pending_nonce:pendingNonce,
  sender_balance_wei:funderBalance.toString(),
  provider:PROVIDER,
  policy_id:POLICY_ID,
  batch_id:BATCH_ID,
  work_id:WORK_ID,
  input_hash:INPUT_HASH,
  output_hash:OUTPUT_HASH,
  scorer_id_hash:SCORER_ID_HASH,
  provider_output_nonce:PROVIDER_OUTPUT_NONCE.toString(),
  deadline_unix:DEADLINE.toString(),
  signature:SIGNATURE,
  digest:EXPECTED_DIGEST,
  recovered_local:getAddress(recoveredLocal),
  recovered_onchain:getAddress(recoveredOnchain),
  digest_consumed:false,
  batch_state:1,
  work_id_used:false,
  tx_value_wei:"0",
  calldata,
  calldata_keccak256:calldataHash,
  eth_call_passed:true,
  eth_call_return_digest:String(decoded),
  eth_estimateGas_passed:true,
  gas_estimate:gasEstimate.toString(),
  gas_price_wei:gasPrice.toString(),
  estimated_fee_wei:estimatedFee.toString(),
  vault:{
    total_liability_wei:liability.toString(),
    total_custody_received_wei:custody.toString(),
    total_value_released_wei:released.toString(),
    balance_wei:vaultBalance.toString()
  },
  protected_actions:{
    lockProviderOutput:"NOT_AUTHORIZED",
    revealCanary:"NOT_AUTHORIZED",
    resolveBatch:"NOT_AUTHORIZED"
  }
},null,2));
