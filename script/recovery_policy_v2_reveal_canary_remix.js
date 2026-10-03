// ARC_ASSURANCE_01 — Recovery v2 revealCanary exact execution helper
// Reads hidden reveal values only from browser sessionStorage.
// Never prints expectedOutputHash, salt, or raw calldata.

(async () => {
  const STOP = (msg) => { throw new Error(msg); };

  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const FUNDER = "0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb";

    const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
    const WORK_ID = "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
    const INPUT_HASH = "0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde";
    const LOCKED_OUTPUT_HASH = "0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
    const SCORER_ID_HASH = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
    const COMMITMENT = "0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17";

    const EXPECTED_CALLDATA_HASH = "0x4f299f4e03bac6f757f2e3569a954ae3ab4093b5ca661d26185c6bcbb5469031";
    const EXPECTED_CANARY_KEY = "0xcae7f115405cef852e8f83c37d1be794bb3870e64d3543f6c9ba284145b0c574";
    const EXPECTED_PENDING_NONCE = 14;

    const expectedOutputHash = sessionStorage.getItem(
      "ARC_ASSURANCE_V2_REVEAL_EXPECTED_OUTPUT_HASH"
    );
    const salt = sessionStorage.getItem(
      "ARC_ASSURANCE_V2_REVEAL_SALT"
    );

    if (!expectedOutputHash || !/^0x[0-9a-fA-F]{64}$/.test(expectedOutputHash))
      STOP("STOP: browser reveal expectedOutputHash missing/invalid");
    if (!salt || !/^0x[0-9a-fA-F]{64}$/.test(salt))
      STOP("STOP: browser reveal salt missing/invalid");

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID)
      STOP("STOP: wrong chain");

    const signer = provider.getSigner();
    const sender = await signer.getAddress();
    if (sender.toLowerCase() !== FUNDER.toLowerCase())
      STOP("STOP: wrong funder wallet");

    const abi = [
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function getBatch(bytes32,bytes32) view returns (tuple(bytes32 commitment,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 expectedOutputHash,bytes32 providerDigest,uint8 state,uint8 directive,uint256 committedAtBlock,uint256 outputLockedAtBlock,uint256 revealedAtBlock,uint256 resolvedAtBlock))",
      "function computeCanaryCommitment(bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32) view returns (bytes32)",
      "function computeCanaryKey(bytes32,bytes32,bytes32) pure returns (bytes32)",
      "function canaryKeyUsed(bytes32) view returns (bool)",
      "function revealCanary(bytes32,bytes32,bytes32,bytes32,bytes32,bytes32) returns (bytes32)"
    ];

    const vaultRead = new ethers.Contract(CONTRACT, abi, provider);

    const [policy,batch,pendingNonce] = await Promise.all([
      vaultRead.getPolicy(POLICY_ID),
      vaultRead.getBatch(POLICY_ID,BATCH_ID),
      provider.getTransactionCount(FUNDER,"pending")
    ]);

    if (pendingNonce !== EXPECTED_PENDING_NONCE)
      STOP("STOP: funder pending nonce changed");
    if (!policy.exists || policy.paused || policy.closed || policy.refundIssued)
      STOP("STOP: policy not usable");
    if (policy.funder.toLowerCase() !== FUNDER.toLowerCase())
      STOP("STOP: funder drift");
    if (policy.activeBatchId.toLowerCase() !== BATCH_ID.toLowerCase())
      STOP("STOP: active batch drift");
    if (policy.scorerIdHash.toLowerCase() !== SCORER_ID_HASH.toLowerCase())
      STOP("STOP: scorer drift");
    if (Number(batch.state) !== 2)
      STOP("STOP: batch not OutputLocked");
    if (batch.commitment.toLowerCase() !== COMMITMENT.toLowerCase())
      STOP("STOP: commitment drift");
    if (batch.workId.toLowerCase() !== WORK_ID.toLowerCase())
      STOP("STOP: workId drift");
    if (batch.inputHash.toLowerCase() !== INPUT_HASH.toLowerCase())
      STOP("STOP: inputHash drift");
    if (batch.outputHash.toLowerCase() !== LOCKED_OUTPUT_HASH.toLowerCase())
      STOP("STOP: locked output drift");

    const reconstructed = await vaultRead.computeCanaryCommitment(
      POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,expectedOutputHash,SCORER_ID_HASH,salt
    );
    if (reconstructed.toLowerCase() !== COMMITMENT.toLowerCase())
      STOP("STOP: reveal preimage commitment mismatch");

    const canaryKey = await vaultRead.computeCanaryKey(
      INPUT_HASH, expectedOutputHash, SCORER_ID_HASH
    );
    if (canaryKey.toLowerCase() !== EXPECTED_CANARY_KEY.toLowerCase())
      STOP("STOP: canary key mismatch");
    if (await vaultRead.canaryKeyUsed(canaryKey))
      STOP("STOP: canary key already used");

    const iface = new ethers.utils.Interface(abi);
    const calldata = iface.encodeFunctionData("revealCanary",[
      POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,expectedOutputHash,salt
    ]);
    const calldataHash = ethers.utils.keccak256(calldata);
    if (calldataHash.toLowerCase() !== EXPECTED_CALLDATA_HASH.toLowerCase())
      STOP("STOP: calldata hash mismatch");

    const vault = vaultRead.connect(signer);
    const callCanaryKey = await vault.callStatic.revealCanary(
      POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,expectedOutputHash,salt,{value:0}
    );
    if (callCanaryKey.toLowerCase() !== EXPECTED_CANARY_KEY.toLowerCase())
      STOP("STOP: callStatic canary key mismatch");

    const gasEstimate = await vault.estimateGas.revealCanary(
      POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,expectedOutputHash,salt,{value:0}
    );
    if (gasEstimate.gt(ethers.BigNumber.from("200000")))
      STOP("STOP: gas estimate outside safety cap");

    console.log("RECOVERY V2 — FINAL revealCanary PRE-BROADCAST CHECK");
    console.log("RESULT: PASS");
    console.log("chain_id", CHAIN_ID);
    console.log("sender", sender);
    console.log("pending_nonce", pendingNonce);
    console.log("batch_state", "OutputLocked");
    console.log("commitment_reconstruction", true);
    console.log("canary_key", canaryKey);
    console.log("canary_key_used", false);
    console.log("calldata_keccak256", calldataHash);
    console.log("gas_estimate", gasEstimate.toString());
    console.log("tx_value_wei", "0");
    console.log("secret_values_printed", false);
    console.log("NEXT: MetaMask transaction confirmation.");

    const tx = await vault.revealCanary(
      POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,expectedOutputHash,salt,
      {value:0, gasLimit:gasEstimate}
    );

    console.log("V2_REVEAL_CANARY_BROADCAST");
    console.log("tx_hash", tx.hash);

    const receipt = await tx.wait();
    console.log("receipt_status", receipt.status);
    console.log("receipt_block", receipt.blockNumber);

    const postBatch = await vaultRead.getBatch(POLICY_ID,BATCH_ID);
    const postUsed = await vaultRead.canaryKeyUsed(EXPECTED_CANARY_KEY);

    if (receipt.status !== 1) STOP("POSTCHECK: receipt failed");
    if (Number(postBatch.state) !== 3) STOP("POSTCHECK: batch not Revealed");
    if (postBatch.workId.toLowerCase() !== WORK_ID.toLowerCase()) STOP("POSTCHECK: workId drift");
    if (postBatch.inputHash.toLowerCase() !== INPUT_HASH.toLowerCase()) STOP("POSTCHECK: inputHash drift");
    if (postBatch.outputHash.toLowerCase() !== LOCKED_OUTPUT_HASH.toLowerCase()) STOP("POSTCHECK: outputHash drift");
    if (!postUsed) STOP("POSTCHECK: canary key not consumed");

    sessionStorage.removeItem("ARC_ASSURANCE_V2_REVEAL_EXPECTED_OUTPUT_HASH");
    sessionStorage.removeItem("ARC_ASSURANCE_V2_REVEAL_SALT");
    localStorage.removeItem("ARC_ASSURANCE_V2_REVEAL_BRIDGE_PRIVATE_JWK");

    console.log("RECOVERY POLICY V2 — revealCanary LIVE RECEIPT");
    console.log("RESULT: PASS");
    console.log("batch_state", "Revealed");
    console.log("canary_key_used", true);
    console.log("browser_reveal_secret_cleared", true);
    console.log("AUTHORIZATION_CONSUMED: revealCanary only");
    console.log("resolveBatch remains NOT AUTHORIZED");
  } catch (err) {
    const safe = String(err?.message || "UNKNOWN_ERROR")
      .replace(/0x[0-9a-fA-F]{66,}/g, "[REDACTED_HEX]")
      .slice(0,500);
    console.error("RECOVERY POLICY V2 revealCanary STOPPED:", safe);
  }
})();
