// ARC_ASSURANCE_01 — Recovery v2 resolveBatch exact execution helper
// Exact one-shot authorization binding:
// calldata keccak256 0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320
// expected directive PAY, payout 0.002 native USDC.

(async () => {
  const STOP = (msg) => { throw new Error(msg); };

  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const FUNDER = "0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb";
    const PAYOUT_RECIPIENT = "0x6B8ad09233dF44eD57B99aF8839129303955590C";

    const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
    const WORK_ID = "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";

    const EXPECTED_PENDING_NONCE = 15;
    const EXPECTED_CALLDATA_HASH =
      "0xa9a24d6d773108b8f41112f2cc51cab3359460a1c2018e2c44af5669ecb63320";
    const EXPECTED_UNIT_PAYOUT = ethers.BigNumber.from("2000000000000000");
    const EXPECTED_V2_FUNDED = ethers.BigNumber.from("10000000000000000");
    const EXPECTED_GLOBAL_LIABILITY = ethers.BigNumber.from("20000000000000000");
    const EXPECTED_GLOBAL_CUSTODY = ethers.BigNumber.from("20000000000000000");
    const EXPECTED_GLOBAL_RELEASED = ethers.BigNumber.from("0");
    const EXPECTED_VAULT_BALANCE = ethers.BigNumber.from("20000000000000000");

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) STOP("STOP: wrong chain");

    const signer = provider.getSigner();
    const sender = await signer.getAddress();
    if (sender.toLowerCase() !== FUNDER.toLowerCase())
      STOP("STOP: wrong funder wallet");

    const abi = [
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function getBatch(bytes32,bytes32) view returns (tuple(bytes32 commitment,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 expectedOutputHash,bytes32 providerDigest,uint8 state,uint8 directive,uint256 committedAtBlock,uint256 outputLockedAtBlock,uint256 revealedAtBlock,uint256 resolvedAtBlock))",
      "function totalLiability() view returns (uint256)",
      "function totalCustodyReceived() view returns (uint256)",
      "function totalValueReleased() view returns (uint256)",
      "function resolveBatch(bytes32,bytes32) returns (uint8)"
    ];

    const vaultRead = new ethers.Contract(CONTRACT, abi, provider);

    const [
      policy,
      batch,
      pendingNonce,
      vaultBalance,
      liability,
      custody,
      released,
      recipientBalanceBefore
    ] = await Promise.all([
      vaultRead.getPolicy(POLICY_ID),
      vaultRead.getBatch(POLICY_ID,BATCH_ID),
      provider.getTransactionCount(FUNDER,"pending"),
      provider.getBalance(CONTRACT),
      vaultRead.totalLiability(),
      vaultRead.totalCustodyReceived(),
      vaultRead.totalValueReleased(),
      provider.getBalance(PAYOUT_RECIPIENT)
    ]);

    if (pendingNonce !== EXPECTED_PENDING_NONCE)
      STOP("STOP: funder pending nonce changed");
    if (!policy.exists || policy.paused || policy.closed || policy.refundIssued)
      STOP("STOP: policy not usable");
    if (policy.funder.toLowerCase() !== FUNDER.toLowerCase())
      STOP("STOP: funder drift");
    if (policy.payoutRecipient.toLowerCase() !== PAYOUT_RECIPIENT.toLowerCase())
      STOP("STOP: payout recipient drift");
    if (policy.activeBatchId.toLowerCase() !== BATCH_ID.toLowerCase())
      STOP("STOP: active batch drift");
    if (!policy.unitPayout.eq(EXPECTED_UNIT_PAYOUT))
      STOP("STOP: unit payout drift");
    if (!policy.totalFunded.eq(EXPECTED_V2_FUNDED))
      STOP("STOP: v2 funded drift");
    if (!policy.totalPaidOut.eq(0))
      STOP("STOP: prior payout drift");
    if (Number(policy.failureCount) !== 0)
      STOP("STOP: failure count drift");

    if (Number(batch.state) !== 3)
      STOP("STOP: batch not Revealed");
    if (batch.workId.toLowerCase() !== WORK_ID.toLowerCase())
      STOP("STOP: workId drift");
    if (batch.outputHash.toLowerCase() !== batch.expectedOutputHash.toLowerCase())
      STOP("STOP: deterministic match is not true");

    if (!liability.eq(EXPECTED_GLOBAL_LIABILITY))
      STOP("STOP: liability drift");
    if (!custody.eq(EXPECTED_GLOBAL_CUSTODY))
      STOP("STOP: custody drift");
    if (!released.eq(EXPECTED_GLOBAL_RELEASED))
      STOP("STOP: released-value drift");
    if (!vaultBalance.eq(EXPECTED_VAULT_BALANCE))
      STOP("STOP: vault balance drift");

    const iface = new ethers.utils.Interface(abi);
    const calldata = iface.encodeFunctionData("resolveBatch",[POLICY_ID,BATCH_ID]);
    const calldataHash = ethers.utils.keccak256(calldata);
    if (calldataHash.toLowerCase() !== EXPECTED_CALLDATA_HASH.toLowerCase())
      STOP("STOP: calldata hash mismatch");

    const vault = vaultRead.connect(signer);
    const directive = await vault.callStatic.resolveBatch(
      POLICY_ID,BATCH_ID,{value:0}
    );
    if (Number(directive) !== 1)
      STOP("STOP: callStatic directive is not PAY");

    const gasEstimate = await vault.estimateGas.resolveBatch(
      POLICY_ID,BATCH_ID,{value:0}
    );
    if (gasEstimate.gt(ethers.BigNumber.from("300000")))
      STOP("STOP: gas estimate outside safety cap");

    console.log("RECOVERY V2 — FINAL resolveBatch PRE-BROADCAST CHECK");
    console.log("RESULT: PASS");
    console.log("chain_id", CHAIN_ID);
    console.log("sender", sender);
    console.log("pending_nonce", pendingNonce);
    console.log("batch_state", "Revealed");
    console.log("deterministic_match", true);
    console.log("directive", "PAY");
    console.log("payout_recipient", PAYOUT_RECIPIENT);
    console.log("payout_wei", EXPECTED_UNIT_PAYOUT.toString());
    console.log("payout_native_usdc", "0.002");
    console.log("calldata_keccak256", calldataHash);
    console.log("gas_estimate", gasEstimate.toString());
    console.log("tx_value_wei", "0");
    console.log("NEXT: MetaMask transaction confirmation.");

    const tx = await vault.resolveBatch(
      POLICY_ID,BATCH_ID,
      {value:0, gasLimit:gasEstimate}
    );

    console.log("V2_RESOLVE_BATCH_BROADCAST");
    console.log("tx_hash", tx.hash);

    const receipt = await tx.wait();
    console.log("receipt_status", receipt.status);
    console.log("receipt_block", receipt.blockNumber);

    const [
      postPolicy,
      postBatch,
      postLiability,
      postCustody,
      postReleased,
      postVaultBalance,
      recipientBalanceAfter
    ] = await Promise.all([
      vaultRead.getPolicy(POLICY_ID),
      vaultRead.getBatch(POLICY_ID,BATCH_ID),
      vaultRead.totalLiability(),
      vaultRead.totalCustodyReceived(),
      vaultRead.totalValueReleased(),
      provider.getBalance(CONTRACT),
      provider.getBalance(PAYOUT_RECIPIENT)
    ]);

    if (receipt.status !== 1) STOP("POSTCHECK: receipt failed");
    if (Number(postBatch.state) !== 4) STOP("POSTCHECK: batch not Resolved");
    if (Number(postBatch.directive) !== 1) STOP("POSTCHECK: directive not PAY");
    if (postPolicy.activeBatchId !== ethers.constants.HashZero)
      STOP("POSTCHECK: active batch not cleared");
    if (!postPolicy.totalPaidOut.eq(EXPECTED_UNIT_PAYOUT))
      STOP("POSTCHECK: totalPaidOut mismatch");
    if (Number(postPolicy.failureCount) !== 0)
      STOP("POSTCHECK: failure count changed");
    if (postPolicy.paused) STOP("POSTCHECK: policy unexpectedly paused");
    if (!postLiability.eq(ethers.BigNumber.from("18000000000000000")))
      STOP("POSTCHECK: liability mismatch");
    if (!postCustody.eq(EXPECTED_GLOBAL_CUSTODY))
      STOP("POSTCHECK: custody mismatch");
    if (!postReleased.eq(EXPECTED_UNIT_PAYOUT))
      STOP("POSTCHECK: totalValueReleased mismatch");
    if (!postVaultBalance.eq(ethers.BigNumber.from("18000000000000000")))
      STOP("POSTCHECK: vault balance mismatch");
    if (!recipientBalanceAfter.eq(recipientBalanceBefore.add(EXPECTED_UNIT_PAYOUT)))
      STOP("POSTCHECK: payout recipient balance delta mismatch");

    console.log("RECOVERY POLICY V2 — resolveBatch LIVE RECEIPT");
    console.log("RESULT: PASS");
    console.log("batch_state", "Resolved");
    console.log("directive", "PAY");
    console.log("payout_native_usdc", "0.002");
    console.log("protected_remainder_native_usdc", "0.008");
    console.log("total_liability_native_usdc", "0.018");
    console.log("total_value_released_native_usdc", "0.002");
    console.log("vault_balance_native_usdc", "0.018");
    console.log("AUTHORIZATION_CONSUMED: resolveBatch only");
  } catch (err) {
    console.error(
      "RECOVERY POLICY V2 resolveBatch STOPPED:",
      String(err?.message || "UNKNOWN_ERROR").slice(0,500)
    );
  }
})();
