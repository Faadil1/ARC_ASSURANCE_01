// ARC_ASSURANCE_01 — V2 FAIL #1 EXACT PROVIDER EIP-712 SIGNATURE
// ONE-SHOT AUTHORIZED SIGNATURE ONLY.
// NO TRANSACTION IS SENT BY THIS SCRIPT.
// Reads hidden work/input binding from browser sessionStorage created by
// v2_fail1_hidden_canary_remix.js. Never prints hidden expected output or salt.

(async () => {
  const STOP = (m) => { throw new Error(m); };

  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const PROVIDER = "0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe";
    const POLICY_ID =
      "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const BATCH_ID =
      "0xd26aeb0909d66737fcb5aee2e4475bc2b9c2b2a3a9182c328a07be46036cbbb3";
    const COMMITMENT =
      "0xc617f5fbc3ccfaaa179e43d9ec7e26d0f4c291303a434dd7cb8c2e756f9c1bc2";
    const OUTPUT_HASH =
      "0x0ffacfd286979a90d2f46a0bb1a747b256ab94b759932b7535921635b46b8451";
    const SCORER_ID_HASH =
      "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
    const SIGNED_NONCE = ethers.BigNumber.from("2");
    const DEADLINE = ethers.BigNumber.from("1792465200");
    const EXPECTED_DIGEST =
      "0x08a4315192610f19fc395c7121133495ae717301ca0019cecc23fecad78ea43f";
    const STORAGE_KEY = "ARC_ASSURANCE_V2_FAIL1_SECRET_REVEAL_PACKET";

    const rawPacket = sessionStorage.getItem(STORAGE_KEY);
    if (!rawPacket) {
      STOP(
        "STOP: FAIL1 secret packet not found in sessionStorage. " +
        "Re-run v2_fail1_hidden_canary_remix.js in the SAME browser session. " +
        "Do not paste the secret into chat."
      );
    }

    let packet;
    try {
      packet = JSON.parse(rawPacket);
    } catch {
      STOP("STOP: FAIL1 sessionStorage packet is invalid JSON");
    }

    const eq = (a,b) => String(a).toLowerCase() === String(b).toLowerCase();

    if (packet.scenario !== "CONTROLLED_FAIL_1_WITHHOLD")
      STOP("STOP: scenario mismatch");
    if (packet.planned_fault_mode !== "WRONG_AMOUNT_VALID")
      STOP("STOP: fault mode mismatch");
    if (Number(packet.chain_id) !== CHAIN_ID)
      STOP("STOP: packet chain mismatch");
    if (!eq(packet.verifying_contract, CONTRACT))
      STOP("STOP: packet contract mismatch");
    if (!eq(packet.policy_id, POLICY_ID))
      STOP("STOP: packet policy mismatch");
    if (!eq(packet.batch_id, BATCH_ID))
      STOP("STOP: packet batch mismatch");
    if (!eq(packet.commitment, COMMITMENT))
      STOP("STOP: packet commitment mismatch");
    if (!eq(packet.scorer_id_hash, SCORER_ID_HASH))
      STOP("STOP: packet scorer mismatch");

    const WORK_ID = packet.work_id;
    const INPUT_HASH = packet.input_hash;

    if (!ethers.utils.isHexString(WORK_ID, 32))
      STOP("STOP: invalid work_id");
    if (!ethers.utils.isHexString(INPUT_HASH, 32))
      STOP("STOP: invalid input_hash");
    if (!ethers.utils.isHexString(packet.expected_output_hash, 32))
      STOP("STOP: invalid hidden expected_output_hash");

    if (eq(OUTPUT_HASH, packet.expected_output_hash))
      STOP("STOP: controlled FAIL output unexpectedly matches hidden expected");

    // Reconstruct hidden commitment locally without printing secret fields.
    const TYPE_STRING =
      "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)";
    const typeHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(TYPE_STRING)
    );
    const reconstructedCommitment = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [
          "bytes32","uint256","address","bytes32","bytes32",
          "bytes32","bytes32","bytes32","bytes32","bytes32"
        ],
        [
          typeHash, CHAIN_ID, CONTRACT, POLICY_ID, BATCH_ID,
          WORK_ID, INPUT_HASH, packet.expected_output_hash,
          SCORER_ID_HASH, packet.salt
        ]
      )
    );
    if (!eq(reconstructedCommitment, COMMITMENT))
      STOP("STOP: hidden packet does not reconstruct exact commitment");

    const domain = {
      name: "ARC_ASSURANCE",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: CONTRACT
    };

    const types = {
      ProviderOutput: [
        { name: "provider", type: "address" },
        { name: "policyId", type: "bytes32" },
        { name: "batchId", type: "bytes32" },
        { name: "workId", type: "bytes32" },
        { name: "inputHash", type: "bytes32" },
        { name: "outputHash", type: "bytes32" },
        { name: "scorerIdHash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    };

    const message = {
      provider: PROVIDER,
      policyId: POLICY_ID,
      batchId: BATCH_ID,
      workId: WORK_ID,
      inputHash: INPUT_HASH,
      outputHash: OUTPUT_HASH,
      scorerIdHash: SCORER_ID_HASH,
      nonce: SIGNED_NONCE,
      deadline: DEADLINE
    };

    const abi = [
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function getBatch(bytes32,bytes32) view returns (tuple(bytes32 commitment,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 expectedOutputHash,bytes32 providerDigest,uint8 state,uint8 directive,uint256 committedAtBlock,uint256 outputLockedAtBlock,uint256 revealedAtBlock,uint256 resolvedAtBlock))",
      "function workIdUsed(bytes32) view returns (bool)",
      "function providerOutputDigest((address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)) view returns (bytes32)",
      "function providerOutputConsumed(bytes32) view returns (bool)",
      "function recoverProvider((address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline),bytes) view returns (address)"
    ];

    const web3 = new ethers.providers.Web3Provider(web3Provider);
    const network = await web3.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID)
      STOP("STOP: wrong chain; expected Arc Mainnet 5042");

    const signer = web3.getSigner();
    const signerAddress = await signer.getAddress();
    if (!eq(signerAddress, PROVIDER))
      STOP("STOP: wrong MetaMask account; provider wallet required");

    const vault = new ethers.Contract(CONTRACT, abi, web3);
    const [policy, batch, workUsed] = await Promise.all([
      vault.getPolicy(POLICY_ID),
      vault.getBatch(POLICY_ID, BATCH_ID),
      vault.workIdUsed(WORK_ID)
    ]);

    if (!policy.exists || policy.paused || policy.closed || policy.refundIssued)
      STOP("STOP: policy not usable");
    if (!eq(policy.provider, PROVIDER))
      STOP("STOP: provider binding drift");
    if (!eq(policy.activeBatchId, BATCH_ID))
      STOP("STOP: active batch drift");
    if (Number(policy.failureCount) !== 0 || Number(policy.maxFailures) !== 2)
      STOP("STOP: failure state drift");
    if (Number(batch.state) !== 1)
      STOP("STOP: batch is not Committed");
    if (!eq(batch.commitment, COMMITMENT))
      STOP("STOP: on-chain commitment drift");
    if (batch.workId !== ethers.constants.HashZero)
      STOP("STOP: workId already locked into batch");
    if (workUsed)
      STOP("STOP: workId already used");

    const latest = await web3.getBlock("latest");
    if (latest.timestamp > DEADLINE.toNumber())
      STOP("STOP: signature deadline expired");

    const localDigest =
      ethers.utils._TypedDataEncoder.hash(domain, types, message);
    if (!eq(localDigest, EXPECTED_DIGEST))
      STOP("STOP: local digest mismatch");

    const outputTuple = [
      PROVIDER,
      POLICY_ID,
      BATCH_ID,
      WORK_ID,
      INPUT_HASH,
      OUTPUT_HASH,
      SCORER_ID_HASH,
      SIGNED_NONCE,
      DEADLINE
    ];

    const onchainDigest = await vault.providerOutputDigest(outputTuple);
    if (!eq(onchainDigest, EXPECTED_DIGEST))
      STOP("STOP: on-chain digest mismatch");

    if (await vault.providerOutputConsumed(EXPECTED_DIGEST))
      STOP("STOP: digest already consumed");

    console.log("V2 FAIL #1 — FINAL PROVIDER SIGNATURE CHECK");
    console.log("RESULT: PASS");
    console.log("scenario", "CONTROLLED_FAIL_1_WITHHOLD");
    console.log("provider_wallet", signerAddress);
    console.log("batch_id", BATCH_ID);
    console.log("output_hash", OUTPUT_HASH);
    console.log("provider_output_nonce", SIGNED_NONCE.toString());
    console.log("deadline_unix", DEADLINE.toString());
    console.log("digest", localDigest);
    console.log("onchain_digest", onchainDigest);
    console.log("digest_consumed", false);
    console.log("actual_output_matches_hidden_expected", false);
    console.log("hidden_expected_output_logged", false);
    console.log("NEXT: MetaMask requests ONE EIP-712 signature. NO TRANSACTION.");

    const signature =
      await signer._signTypedData(domain, types, message);

    const recoveredLocal =
      ethers.utils.verifyTypedData(domain, types, message, signature);
    if (!eq(recoveredLocal, PROVIDER))
      STOP("STOP: local recovered signer mismatch");

    const recoveredOnchain =
      await vault.recoverProvider(outputTuple, signature);
    if (!eq(recoveredOnchain, PROVIDER))
      STOP("STOP: on-chain recovered signer mismatch");

    if (await vault.providerOutputConsumed(EXPECTED_DIGEST))
      STOP("POSTCHECK: digest unexpectedly consumed by signature-only step");

    console.log("V2 FAIL #1 — PROVIDER SIGNATURE RECEIPT");
    console.log("RESULT: PASS");
    console.log("digest", EXPECTED_DIGEST);
    console.log("signature", signature);
    console.log("recovered_local", recoveredLocal);
    console.log("recovered_onchain", recoveredOnchain);
    console.log("digest_consumed", false);
    console.log("transaction_sent", false);
    console.log("AUTHORIZATION_CONSUMED: provider EIP-712 signature FAIL #1 only");
    console.log("lockProviderOutput / reveal / resolve remain NOT AUTHORIZED");
  } catch (err) {
    console.error(
      "V2 FAIL #1 provider signature STOPPED:",
      String(err?.message || err).slice(0, 700)
    );
  }
})();
