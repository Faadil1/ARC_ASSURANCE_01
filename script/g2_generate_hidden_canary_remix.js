// ARC_ASSURANCE_01 — LOCAL HIDDEN CANARY GENERATOR FOR REMIX
// IMPORTANT:
// - Generates secrets locally in the browser.
// - Does NOT sign or broadcast any transaction.
// - Do NOT commit/share the SECRET_REVEAL_PACKET.
// - Only PUBLIC_PRECOMMIT.batch_id + PUBLIC_PRECOMMIT.commitment are safe for the next gate.

(async () => {
  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const POLICY_ID = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
    const SCORER_ID = "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";
    const EXPECTED_SCORER_ID_HASH =
      "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
    const TYPE_STRING =
      "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)";

    function randomBytes32() {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return ethers.utils.hexlify(bytes);
    }

    function randomInt(min, max) {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      return min + (bytes[0] % (max - min + 1));
    }

    function randomInvoiceNumber() {
      const bytes = new Uint8Array(5);
      crypto.getRandomValues(bytes);
      return "ARC-" + Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    }

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(`STOP: wrong chain ${network.chainId}; expected Arc ${CHAIN_ID}`);
    }

    const abi = [
      "function computeCanaryCommitment(bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32) view returns (bytes32)",
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function totalLiability() view returns (uint256)"
    ];

    const vault = new ethers.Contract(CONTRACT, abi, provider);
    const policy = await vault.getPolicy(POLICY_ID);

    if (!policy.exists) throw new Error("STOP: G2 policy missing");
    if (policy.scorerIdHash.toLowerCase() !== EXPECTED_SCORER_ID_HASH.toLowerCase()) {
      throw new Error("STOP: scorer binding changed");
    }
    if (policy.fundedAt.eq(0) || policy.totalFunded.lt(ethers.utils.parseUnits("0.010", 18))) {
      throw new Error("STOP: G2 policy is not funded as expected");
    }
    if (policy.activeBatchId !== ethers.constants.HashZero) {
      throw new Error(`STOP: active batch already exists: ${policy.activeBatchId}`);
    }
    if (policy.paused || policy.closed || policy.refundIssued) {
      throw new Error("STOP: policy is not usable");
    }

    const batchId = randomBytes32();
    const workId = randomBytes32();
    const salt = randomBytes32();

    // Create a fresh local invoice canary that is NOT stored in the repo.
    const invoiceNumber = randomInvoiceNumber();
    const subtotalMinor = randomInt(10000, 90000);
    const taxMinor = randomInt(1000, 12000);
    const totalMinor = subtotalMinor + taxMinor;
    const currency = "CAD";

    const money = (minor) =>
      `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;

    const inputText = [
      `Invoice ${invoiceNumber}`,
      `Subtotal: ${money(subtotalMinor)} ${currency}`,
      `Tax: ${money(taxMinor)} ${currency}`,
      `Total: ${money(totalMinor)} ${currency}`,
    ].join("\n");

    const canonicalOutput = [
      "ARC_ASSURANCE_INVOICE_V1",
      `invoice_number:${invoiceNumber}`,
      `subtotal_minor:${subtotalMinor}`,
      `tax_minor:${taxMinor}`,
      `total_minor:${totalMinor}`,
      `currency:${currency}`,
    ].join("\n");

    const inputHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(inputText)
    );
    const expectedOutputHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(canonicalOutput)
    );
    const scorerIdHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(SCORER_ID)
    );

    if (scorerIdHash.toLowerCase() !== EXPECTED_SCORER_ID_HASH.toLowerCase()) {
      throw new Error(`STOP: local scorer hash mismatch: ${scorerIdHash}`);
    }

    const typeHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(TYPE_STRING)
    );

    const encoded = ethers.utils.defaultAbiCoder.encode(
      [
        "bytes32",
        "uint256",
        "address",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32"
      ],
      [
        typeHash,
        CHAIN_ID,
        CONTRACT,
        POLICY_ID,
        batchId,
        workId,
        inputHash,
        expectedOutputHash,
        scorerIdHash,
        salt
      ]
    );

    const commitment = ethers.utils.keccak256(encoded);

    const onchainCommitment = await vault.computeCanaryCommitment(
      POLICY_ID,
      batchId,
      workId,
      inputHash,
      expectedOutputHash,
      scorerIdHash,
      salt
    );

    if (commitment.toLowerCase() !== onchainCommitment.toLowerCase()) {
      throw new Error("STOP: local/onchain commitment mismatch");
    }

    const canaryKey = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "bytes32"],
        [inputHash, expectedOutputHash, scorerIdHash]
      )
    );

    const publicPrecommit = {
      policy_id: POLICY_ID,
      batch_id: batchId,
      commitment
    };

    const secretRevealPacket = {
      warning: "SECRET — KEEP LOCAL/OFF-REPO/OFF-CHAIN UNTIL REVEAL",
      chain_id: CHAIN_ID,
      verifying_contract: CONTRACT,
      policy_id: POLICY_ID,
      batch_id: batchId,
      work_id: workId,
      input_text: inputText,
      input_hash: inputHash,
      expected_canonical_output: canonicalOutput,
      expected_output_hash: expectedOutputHash,
      scorer_id: SCORER_ID,
      scorer_id_hash: scorerIdHash,
      salt,
      canary_key: canaryKey,
      commitment
    };

    console.log("==========================================");
    console.log("PUBLIC_PRECOMMIT — SAFE TO SHARE");
    console.log(JSON.stringify(publicPrecommit, null, 2));
    console.log("==========================================");
    console.log("SECRET_REVEAL_PACKET — DO NOT SHARE");
    console.log(JSON.stringify(secretRevealPacket, null, 2));
    console.log("==========================================");
    console.log("ONCHAIN COMMITMENT CROSS-CHECK: MATCH ✅");
    console.log("NO TRANSACTION SIGNED OR BROADCAST.");
    console.log("");
    console.log("ACTION:");
    console.log("1) Copy SECRET_REVEAL_PACKET into a LOCAL text file OUTSIDE the Git repo.");
    console.log("2) Do NOT send that secret packet in chat.");
    console.log("3) Share ONLY batch_id + commitment for the commitBatch preflight.");
  } catch (e) {
    console.error(e?.message || e);
  }
})();
