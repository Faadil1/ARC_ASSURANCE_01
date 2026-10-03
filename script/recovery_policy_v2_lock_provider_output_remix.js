// ARC_ASSURANCE_01 — Recovery v2 lockProviderOutput exact execution helper
// Exact binding: calldata hash 0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b

(async () => {
  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const FUNDER = "0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb";
    const PROVIDER = "0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe";
    const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
    const WORK_ID = "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
    const INPUT_HASH = "0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde";
    const OUTPUT_HASH = "0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
    const SCORER_ID_HASH = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
    const SIGNED_NONCE = ethers.BigNumber.from("1");
    const DEADLINE = ethers.BigNumber.from("1792465200");
    const SIGNATURE = "0xab6655ce07beaa2d464794257026dec139f7f5d27f500ed2e0e2d4213f0e7e9755a59365e1fa78ab28eb919f3444e931f088fc4938b050d4a0a47dd49aa1ace41b";
    const EXPECTED_DIGEST = "0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";
    const EXPECTED_CALLDATA_HASH = "0x45ba391d40a71610fe1de2743a19836d57134f47f5ced5e13197bdb9ee4c9a1b";
    const EXPECTED_PENDING_NONCE = 13;

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) throw new Error("STOP: wrong chain");

    const signer = provider.getSigner();
    const sender = await signer.getAddress();
    if (sender.toLowerCase() !== FUNDER.toLowerCase()) throw new Error("STOP: wrong funder wallet");

    const abi = [
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function getBatch(bytes32,bytes32) view returns (tuple(bytes32 commitment,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 expectedOutputHash,bytes32 providerDigest,uint8 state,uint8 directive,uint256 committedAtBlock,uint256 outputLockedAtBlock,uint256 revealedAtBlock,uint256 resolvedAtBlock))",
      "function workIdUsed(bytes32) view returns (bool)",
      "function providerOutputDigest((address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)) view returns (bytes32)",
      "function providerOutputConsumed(bytes32) view returns (bool)",
      "function recoverProvider((address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline),bytes) view returns (address)",
      "function lockProviderOutput((address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline),bytes) returns (bytes32)"
    ];

    const vaultRead = new ethers.Contract(CONTRACT, abi, provider);
    const output = [PROVIDER,POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,OUTPUT_HASH,SCORER_ID_HASH,SIGNED_NONCE,DEADLINE];

    const [policy,batch,used,digest,consumed,recovered,pendingNonce] = await Promise.all([
      vaultRead.getPolicy(POLICY_ID),
      vaultRead.getBatch(POLICY_ID,BATCH_ID),
      vaultRead.workIdUsed(WORK_ID),
      vaultRead.providerOutputDigest(output),
      vaultRead.providerOutputConsumed(EXPECTED_DIGEST),
      vaultRead.recoverProvider(output,SIGNATURE),
      provider.getTransactionCount(FUNDER,"pending")
    ]);

    if (!policy.exists || policy.paused || policy.closed || policy.refundIssued) throw new Error("STOP: policy not usable");
    if (policy.funder.toLowerCase() !== FUNDER.toLowerCase()) throw new Error("STOP: funder drift");
    if (policy.provider.toLowerCase() !== PROVIDER.toLowerCase()) throw new Error("STOP: provider drift");
    if (policy.activeBatchId.toLowerCase() !== BATCH_ID.toLowerCase()) throw new Error("STOP: active batch drift");
    if (Number(batch.state) !== 1) throw new Error("STOP: batch not Committed");
    if (used) throw new Error("STOP: workId already used");
    if (digest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) throw new Error("STOP: digest drift");
    if (consumed) throw new Error("STOP: digest already consumed");
    if (recovered.toLowerCase() !== PROVIDER.toLowerCase()) throw new Error("STOP: provider signature mismatch");
    if (pendingNonce !== EXPECTED_PENDING_NONCE) throw new Error("STOP: funder pending nonce changed");

    const iface = new ethers.utils.Interface(abi);
    const data = iface.encodeFunctionData("lockProviderOutput",[output,SIGNATURE]);
    const dataHash = ethers.utils.keccak256(data);
    if (dataHash.toLowerCase() !== EXPECTED_CALLDATA_HASH.toLowerCase()) throw new Error("STOP: calldata hash mismatch");

    const vault = vaultRead.connect(signer);
    const callDigest = await vault.callStatic.lockProviderOutput(output,SIGNATURE,{value:0});
    if (callDigest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) throw new Error("STOP: callStatic digest mismatch");

    const gasEstimate = await vault.estimateGas.lockProviderOutput(output,SIGNATURE,{value:0});
    if (gasEstimate.gt(ethers.BigNumber.from("350000"))) throw new Error("STOP: gas estimate outside safety cap");

    console.log("RECOVERY V2 — FINAL lockProviderOutput PRE-BROADCAST CHECK");
    console.log("RESULT: PASS");
    console.log("chain_id", CHAIN_ID);
    console.log("sender", sender);
    console.log("pending_nonce", pendingNonce);
    console.log("provider_digest", digest);
    console.log("calldata_keccak256", dataHash);
    console.log("gas_estimate", gasEstimate.toString());
    console.log("tx_value_wei", "0");
    console.log("NEXT: MetaMask transaction confirmation.");

    const tx = await vault.lockProviderOutput(output,SIGNATURE,{value:0,gasLimit:gasEstimate});
    console.log("V2_LOCK_PROVIDER_OUTPUT_BROADCAST");
    console.log("tx_hash", tx.hash);

    const receipt = await tx.wait();
    console.log("receipt_status", receipt.status);
    console.log("receipt_block", receipt.blockNumber);

    const postBatch = await vaultRead.getBatch(POLICY_ID,BATCH_ID);
    const postUsed = await vaultRead.workIdUsed(WORK_ID);
    const postConsumed = await vaultRead.providerOutputConsumed(EXPECTED_DIGEST);

    if (receipt.status !== 1) throw new Error("POSTCHECK: receipt failed");
    if (Number(postBatch.state) !== 2) throw new Error("POSTCHECK: batch not OutputLocked");
    if (postBatch.workId.toLowerCase() !== WORK_ID.toLowerCase()) throw new Error("POSTCHECK: workId mismatch");
    if (postBatch.inputHash.toLowerCase() !== INPUT_HASH.toLowerCase()) throw new Error("POSTCHECK: inputHash mismatch");
    if (postBatch.outputHash.toLowerCase() !== OUTPUT_HASH.toLowerCase()) throw new Error("POSTCHECK: outputHash mismatch");
    if (postBatch.providerDigest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) throw new Error("POSTCHECK: providerDigest mismatch");
    if (!postUsed) throw new Error("POSTCHECK: workId not consumed");
    if (!postConsumed) throw new Error("POSTCHECK: provider digest not consumed");

    console.log("RECOVERY POLICY V2 — lockProviderOutput LIVE RECEIPT");
    console.log("RESULT: PASS");
    console.log("AUTHORIZATION_CONSUMED: lockProviderOutput only");
    console.log("revealCanary / resolveBatch remain NOT AUTHORIZED");
  } catch (err) {
    console.error("RECOVERY POLICY V2 lockProviderOutput STOPPED:", err);
  }
})();
