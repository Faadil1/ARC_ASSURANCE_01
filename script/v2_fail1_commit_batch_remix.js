// ARC_ASSURANCE_01 — V2 LIVE DEPTH FAIL #1 exact commitBatch helper
// Exact authorized binding:
// batch      0xd26aeb0909d66737fcb5aee2e4475bc2b9c2b2a3a9182c328a07be46036cbbb3
// commitment 0xc617f5fbc3ccfaaa179e43d9ec7e26d0f4c291303a434dd7cb8c2e756f9c1bc2
// calldata   0xea31219120824695817911408f12d9d5a08b0ea2118c4aa90b1b88e7ff5aa440

(async () => {
  const STOP = (m) => { throw new Error(m); };

  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const FUNDER = "0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb";
    const POLICY =
      "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const BATCH =
      "0xd26aeb0909d66737fcb5aee2e4475bc2b9c2b2a3a9182c328a07be46036cbbb3";
    const COMMITMENT =
      "0xc617f5fbc3ccfaaa179e43d9ec7e26d0f4c291303a434dd7cb8c2e756f9c1bc2";
    const EXPECTED_CALLDATA_HASH =
      "0xea31219120824695817911408f12d9d5a08b0ea2118c4aa90b1b88e7ff5aa440";
    const EXPECTED_PENDING_NONCE = 16;

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
      "function remainingFor(bytes32) view returns (uint256)",
      "function commitBatch(bytes32,bytes32,bytes32)"
    ];

    const vaultRead = new ethers.Contract(CONTRACT, abi, provider);

    const [policy, remaining, pendingNonce] = await Promise.all([
      vaultRead.getPolicy(POLICY),
      vaultRead.remainingFor(POLICY),
      provider.getTransactionCount(FUNDER, "pending")
    ]);

    if (pendingNonce !== EXPECTED_PENDING_NONCE)
      STOP("STOP: pending nonce changed");
    if (!policy.exists || policy.paused || policy.closed || policy.refundIssued)
      STOP("STOP: policy not usable");
    if (policy.funder.toLowerCase() !== FUNDER.toLowerCase())
      STOP("STOP: funder drift");
    if (policy.activeBatchId !== ethers.constants.HashZero)
      STOP("STOP: active batch already exists");
    if (Number(policy.failureCount) !== 0 || Number(policy.maxFailures) !== 2)
      STOP("STOP: failure state drift");
    if (!policy.totalFunded.eq("10000000000000000"))
      STOP("STOP: funded amount drift");
    if (!policy.totalPaidOut.eq("2000000000000000"))
      STOP("STOP: prior payout drift");
    if (!remaining.eq("8000000000000000"))
      STOP("STOP: protected remainder drift");

    const latest = await provider.getBlock("latest");
    if (latest.timestamp > Number(policy.expiry))
      STOP("STOP: policy expired");

    const iface = new ethers.utils.Interface(abi);
    const calldata = iface.encodeFunctionData(
      "commitBatch",
      [POLICY, BATCH, COMMITMENT]
    );
    const calldataHash = ethers.utils.keccak256(calldata);

    if (calldataHash.toLowerCase() !== EXPECTED_CALLDATA_HASH.toLowerCase())
      STOP("STOP: calldata hash mismatch");

    const vault = vaultRead.connect(signer);

    await vault.callStatic.commitBatch(
      POLICY,
      BATCH,
      COMMITMENT,
      { value: 0 }
    );

    const gasEstimate = await vault.estimateGas.commitBatch(
      POLICY,
      BATCH,
      COMMITMENT,
      { value: 0 }
    );

    if (gasEstimate.gt(ethers.BigNumber.from("200000")))
      STOP("STOP: gas estimate outside safety cap");

    console.log("V2 FAIL #1 — FINAL commitBatch PRE-BROADCAST CHECK");
    console.log("RESULT: PASS");
    console.log("scenario", "CONTROLLED_FAIL_1_WITHHOLD");
    console.log("sender", sender);
    console.log("pending_nonce", pendingNonce);
    console.log("failure_count_before", Number(policy.failureCount));
    console.log("protected_remainder_wei", remaining.toString());
    console.log("batch_id", BATCH);
    console.log("commitment", COMMITMENT);
    console.log("calldata_keccak256", calldataHash);
    console.log("gas_estimate", gasEstimate.toString());
    console.log("tx_value_wei", "0");
    console.log("NEXT: MetaMask transaction confirmation.");

    const tx = await vault.commitBatch(
      POLICY,
      BATCH,
      COMMITMENT,
      { value: 0, gasLimit: gasEstimate }
    );

    console.log("V2_FAIL1_COMMIT_BATCH_BROADCAST");
    console.log("tx_hash", tx.hash);

    const receipt = await tx.wait();
    console.log("receipt_status", receipt.status);
    console.log("receipt_block", receipt.blockNumber);

    const [postPolicy, postBatch, postRemaining] = await Promise.all([
      vaultRead.getPolicy(POLICY),
      vaultRead.getBatch(POLICY, BATCH),
      vaultRead.remainingFor(POLICY)
    ]);

    if (receipt.status !== 1)
      STOP("POSTCHECK: receipt failed");
    if (postPolicy.activeBatchId.toLowerCase() !== BATCH.toLowerCase())
      STOP("POSTCHECK: active batch mismatch");
    if (Number(postBatch.state) !== 1)
      STOP("POSTCHECK: batch not Committed");
    if (postBatch.commitment.toLowerCase() !== COMMITMENT.toLowerCase())
      STOP("POSTCHECK: commitment mismatch");
    if (Number(postPolicy.failureCount) !== 0)
      STOP("POSTCHECK: failureCount changed too early");
    if (!postRemaining.eq("8000000000000000"))
      STOP("POSTCHECK: remainder changed unexpectedly");

    console.log("V2 FAIL #1 — commitBatch LIVE RECEIPT");
    console.log("RESULT: PASS");
    console.log("batch_state", "Committed");
    console.log("failure_count", Number(postPolicy.failureCount));
    console.log("protected_remainder_wei", postRemaining.toString());
    console.log("AUTHORIZATION_CONSUMED: commitBatch FAIL #1 only");
    console.log("provider signature remains NOT AUTHORIZED");
  } catch (e) {
    console.error(
      "V2 FAIL #1 commitBatch STOPPED:",
      String(e?.message || e).slice(0, 500)
    );
  }
})();
