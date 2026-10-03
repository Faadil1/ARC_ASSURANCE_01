// RECOVERY V2 — PROVIDER SIGNATURE RETRY PRECHECK ONLY
// NO SIGNATURE REQUEST. NO TRANSACTION.

(async () => {
  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const PROVIDER = "0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe";
    const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
    const WORK_ID = "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0";
    const INPUT_HASH = "0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde";
    const OUTPUT_HASH = "0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018";
    const SCORER_ID_HASH = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
    const NONCE = ethers.BigNumber.from("1");
    const DEADLINE = ethers.BigNumber.from("1792465200");
    const EXPECTED_DIGEST = "0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";

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
      nonce: NONCE,
      deadline: DEADLINE
    };

    const abi = [
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function getBatch(bytes32,bytes32) view returns (tuple(bytes32 commitment,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 expectedOutputHash,bytes32 providerDigest,uint8 state,uint8 directive,uint256 committedAtBlock,uint256 outputLockedAtBlock,uint256 revealedAtBlock,uint256 resolvedAtBlock))",
      "function workIdUsed(bytes32) view returns (bool)",
      "function providerOutputDigest((address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)) view returns (bytes32)",
      "function providerOutputConsumed(bytes32) view returns (bool)"
    ];

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) throw new Error("WRONG_CHAIN");

    const signerAddress = await provider.getSigner().getAddress();
    if (signerAddress.toLowerCase() !== PROVIDER.toLowerCase()) {
      throw new Error("WRONG_PROVIDER_WALLET");
    }

    const vault = new ethers.Contract(CONTRACT, abi, provider);
    const policy = await vault.getPolicy(POLICY_ID);
    const batch = await vault.getBatch(POLICY_ID, BATCH_ID);

    if (!policy.exists || policy.paused || policy.closed || policy.refundIssued) throw new Error("POLICY_NOT_USABLE");
    if (policy.provider.toLowerCase() !== PROVIDER.toLowerCase()) throw new Error("PROVIDER_DRIFT");
    if (policy.activeBatchId.toLowerCase() !== BATCH_ID.toLowerCase()) throw new Error("ACTIVE_BATCH_DRIFT");
    if (Number(batch.state) !== 1) throw new Error("BATCH_NOT_COMMITTED");
    if (batch.workId !== ethers.constants.HashZero) throw new Error("WORK_ALREADY_LOCKED");
    if (await vault.workIdUsed(WORK_ID)) throw new Error("WORK_ID_ALREADY_USED");

    const digest = ethers.utils._TypedDataEncoder.hash(domain, types, message);
    if (digest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) throw new Error("LOCAL_DIGEST_MISMATCH");

    const tuple = [PROVIDER,POLICY_ID,BATCH_ID,WORK_ID,INPUT_HASH,OUTPUT_HASH,SCORER_ID_HASH,NONCE,DEADLINE];
    const onchainDigest = await vault.providerOutputDigest(tuple);
    if (onchainDigest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) throw new Error("ONCHAIN_DIGEST_MISMATCH");
    if (await vault.providerOutputConsumed(EXPECTED_DIGEST)) throw new Error("DIGEST_ALREADY_CONSUMED");

    console.log("RECOVERY V2 PROVIDER SIGNATURE RETRY PRECHECK");
    console.log("RESULT: PASS");
    console.log("provider_wallet", signerAddress);
    console.log("digest", digest);
    console.log("onchain_digest", onchainDigest);
    console.log("batch_state", Number(batch.state));
    console.log("work_id_used", false);
    console.log("digest_consumed", false);
    console.log("NO SIGNATURE REQUESTED. NO TRANSACTION.");
    console.log("NEXT: run recovery_policy_v2_provider_sign_only_retry.js");
  } catch (err) {
    console.error("RETRY PRECHECK STOPPED:", err);
  }
})();
