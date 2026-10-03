// ARC_ASSURANCE_01 — RECOVERY POLICY V2 EXACT PROVIDER EIP-712 SIGNATURE
// ONE-SHOT AUTHORIZED SIGNATURE ONLY.
// NO TRANSACTION IS SENT BY THIS SCRIPT.
// Requires the exact provider wallet in MetaMask.

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
    const SIGNED_NONCE = ethers.BigNumber.from("1");
    const DEADLINE = ethers.BigNumber.from("1792465200");
    const EXPECTED_DIGEST =
      "0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";

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

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(`STOP: wrong chain ${network.chainId}; expected Arc Mainnet ${CHAIN_ID}`);
    }

    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== PROVIDER.toLowerCase()) {
      throw new Error(`STOP: wrong MetaMask account ${signerAddress}; expected provider ${PROVIDER}`);
    }

    const code = await provider.getCode(CONTRACT);
    if (!code || code === "0x") throw new Error("STOP: AssuranceVault code missing");

    const vault = new ethers.Contract(CONTRACT, abi, provider);

    const policy = await vault.getPolicy(POLICY_ID);
    const batch = await vault.getBatch(POLICY_ID, BATCH_ID);

    if (!policy.exists) throw new Error("STOP: v2 policy missing");
    if (policy.provider.toLowerCase() !== PROVIDER.toLowerCase()) throw new Error("STOP: provider binding drift");
    if (policy.paused || policy.closed || policy.refundIssued) throw new Error("STOP: v2 policy not usable");
    if (policy.activeBatchId.toLowerCase() !== BATCH_ID.toLowerCase()) throw new Error("STOP: active batch drift");
    if (Number(batch.state) !== 1) throw new Error("STOP: batch is not Committed");
    if (batch.workId !== ethers.constants.HashZero) throw new Error("STOP: batch workId already locked");
    if (await vault.workIdUsed(WORK_ID)) throw new Error("STOP: workId already used");

    const localDigest = ethers.utils._TypedDataEncoder.hash(domain, types, message);
    if (localDigest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) {
      throw new Error(`STOP: local digest mismatch ${localDigest}`);
    }

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
    if (onchainDigest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) {
      throw new Error(`STOP: on-chain digest mismatch ${onchainDigest}`);
    }

    if (await vault.providerOutputConsumed(EXPECTED_DIGEST)) {
      throw new Error("STOP: digest already consumed");
    }

    console.log("RECOVERY POLICY V2 — FINAL PROVIDER SIGNATURE CHECK");
    console.log("RESULT: PASS");
    console.log("chain_id", CHAIN_ID);
    console.log("provider_wallet", signerAddress);
    console.log("policy_id", POLICY_ID);
    console.log("batch_id", BATCH_ID);
    console.log("work_id", WORK_ID);
    console.log("input_hash", INPUT_HASH);
    console.log("output_hash", OUTPUT_HASH);
    console.log("scorer_id_hash", SCORER_ID_HASH);
    console.log("provider_output_nonce", SIGNED_NONCE.toString());
    console.log("deadline_unix", DEADLINE.toString());
    console.log("digest", localDigest);
    console.log("onchain_digest", onchainDigest);
    console.log("digest_consumed", false);
    console.log("NEXT: MetaMask will request ONE EIP-712 signature. NO TRANSACTION.");

    const signature = await signer._signTypedData(domain, types, message);

    const recoveredLocal = ethers.utils.verifyTypedData(domain, types, message, signature);
    if (recoveredLocal.toLowerCase() !== PROVIDER.toLowerCase()) {
      throw new Error(`STOP: local recovered signer mismatch ${recoveredLocal}`);
    }

    const recoveredOnchain = await vault.recoverProvider(outputTuple, signature);
    if (recoveredOnchain.toLowerCase() !== PROVIDER.toLowerCase()) {
      throw new Error(`STOP: on-chain recovered signer mismatch ${recoveredOnchain}`);
    }

    if (await vault.providerOutputConsumed(EXPECTED_DIGEST)) {
      throw new Error("POSTCHECK: digest unexpectedly consumed by signature-only step");
    }

    console.log("RECOVERY POLICY V2 — PROVIDER SIGNATURE RECEIPT");
    console.log("RESULT: PASS");
    console.log("digest", EXPECTED_DIGEST);
    console.log("signature", signature);
    console.log("recovered_local", recoveredLocal);
    console.log("recovered_onchain", recoveredOnchain);
    console.log("digest_consumed", false);
    console.log("transaction_sent", false);
    console.log("AUTHORIZATION_CONSUMED: provider EIP-712 signature only");
    console.log("lockProviderOutput / reveal / resolve remain NOT AUTHORIZED");
  } catch (err) {
    console.error("RECOVERY POLICY V2 provider signature STOPPED:", err);
  }
})();
