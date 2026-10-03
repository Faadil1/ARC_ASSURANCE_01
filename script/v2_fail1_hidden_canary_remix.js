// ARC_ASSURANCE_01 — V2 LIVE DEPTH FAIL #1 HIDDEN CANARY GENERATOR
// Browser-only secret generation. NO signature. NO transaction.
// Copy SECRET_REVEAL_PACKET only into GitHub Environment secret:
// V2_FAIL1_SECRET_REVEAL_PACKET
// Share only PUBLIC_PRECOMMIT in chat.

(async () => {
  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
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
      return "ARC-F1-" + Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    }

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID)
      throw new Error("STOP: wrong chain");

    const abi = [
      "function computeCanaryCommitment(bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32) view returns (bytes32)",
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function remainingFor(bytes32) view returns (uint256)",
      "function totalLiability() view returns (uint256)",
      "function totalCustodyReceived() view returns (uint256)",
      "function totalValueReleased() view returns (uint256)"
    ];

    const vault = new ethers.Contract(CONTRACT, abi, provider);
    const [policy,remaining,liability,custody,released] = await Promise.all([
      vault.getPolicy(POLICY_ID),
      vault.remainingFor(POLICY_ID),
      vault.totalLiability(),
      vault.totalCustodyReceived(),
      vault.totalValueReleased()
    ]);

    const latest = await provider.getBlock("latest");

    if (!policy.exists) throw new Error("STOP: v2 policy missing");
    if (policy.scorerIdHash.toLowerCase() !== EXPECTED_SCORER_ID_HASH.toLowerCase())
      throw new Error("STOP: scorer drift");
    if (!policy.totalFunded.eq("10000000000000000"))
      throw new Error("STOP: v2 funded drift");
    if (!policy.totalPaidOut.eq("2000000000000000"))
      throw new Error("STOP: v2 paid drift");
    if (!remaining.eq("8000000000000000"))
      throw new Error("STOP: v2 remainder drift");
    if (Number(policy.failureCount) !== 0 || Number(policy.maxFailures) !== 2)
      throw new Error("STOP: failure counter drift");
    if (policy.activeBatchId !== ethers.constants.HashZero)
      throw new Error("STOP: active batch exists");
    if (policy.paused || policy.closed || policy.refundIssued)
      throw new Error("STOP: v2 policy not usable");
    if (latest.timestamp > Number(policy.expiry))
      throw new Error("STOP: v2 policy expired");
    if (!liability.eq("18000000000000000"))
      throw new Error("STOP: liability drift");
    if (!custody.eq("20000000000000000"))
      throw new Error("STOP: custody drift");
    if (!released.eq("2000000000000000"))
      throw new Error("STOP: released drift");

    const batchId = randomBytes32();
    const workId = randomBytes32();
    const salt = randomBytes32();

    const invoiceNumber = randomInvoiceNumber();
    const subtotalMinor = randomInt(18000, 88000);
    const taxMinor = randomInt(1200, 11000);
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

    const inputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(inputText));
    const expectedOutputHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(canonicalOutput)
    );
    const scorerIdHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(SCORER_ID)
    );

    if (scorerIdHash.toLowerCase() !== EXPECTED_SCORER_ID_HASH.toLowerCase())
      throw new Error("STOP: scorer hash mismatch");

    const typeHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(TYPE_STRING)
    );
    const encoded = ethers.utils.defaultAbiCoder.encode(
      ["bytes32","uint256","address","bytes32","bytes32","bytes32","bytes32","bytes32","bytes32","bytes32"],
      [typeHash,CHAIN_ID,CONTRACT,POLICY_ID,batchId,workId,inputHash,expectedOutputHash,scorerIdHash,salt]
    );
    const commitment = ethers.utils.keccak256(encoded);

    const onchainCommitment = await vault.computeCanaryCommitment(
      POLICY_ID,batchId,workId,inputHash,expectedOutputHash,scorerIdHash,salt
    );
    if (commitment.toLowerCase() !== onchainCommitment.toLowerCase())
      throw new Error("STOP: commitment cross-check mismatch");

    const canaryKey = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32","bytes32","bytes32"],
        [inputHash,expectedOutputHash,scorerIdHash]
      )
    );

    const publicPrecommit = {
      policy_id: POLICY_ID,
      batch_id: batchId,
      commitment,
      planned_scenario: "CONTROLLED_FAIL_1_WITHHOLD"
    };

    const secretRevealPacket = {
      warning: "SECRET — COPY ONLY TO PROTECTED GITHUB ENVIRONMENT SECRET",
      scenario: "CONTROLLED_FAIL_1_WITHHOLD",
      planned_fault_mode: "WRONG_AMOUNT_VALID",
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

    sessionStorage.setItem(
      "ARC_ASSURANCE_V2_FAIL1_SECRET_REVEAL_PACKET",
      JSON.stringify(secretRevealPacket)
    );

    console.log("==========================================");
    console.log("V2 LIVE DEPTH FAIL #1 — HIDDEN CANARY GENERATED");
    console.log("PUBLIC_PRECOMMIT — SAFE TO SHARE");
    console.log(JSON.stringify(publicPrecommit, null, 2));
    console.log("==========================================");
    console.log("SECRET_REVEAL_PACKET — DO NOT SHARE");
    console.log(JSON.stringify(secretRevealPacket, null, 2));
    console.log("==========================================");
    console.log("ONCHAIN COMMITMENT CROSS-CHECK: MATCH");
    console.log("SCENARIO: CONTROLLED_FAIL_1_WITHHOLD");
    console.log("PLANNED FAULT: WRONG_AMOUNT_VALID");
    console.log("TRANSACTION_SENT: false");
    console.log("");
    console.log("ACTION:");
    console.log("1) Copy the FULL SECRET_REVEAL_PACKET JSON directly into");
    console.log("   GitHub Environment secret V2_FAIL1_SECRET_REVEAL_PACKET");
    console.log("   under environment g3-live-secret.");
    console.log("2) Do NOT save it as a plaintext file.");
    console.log("3) Do NOT paste it in chat.");
    console.log("4) Share ONLY PUBLIC_PRECOMMIT policy_id, batch_id and commitment.");
  } catch (e) {
    console.error("V2 FAIL #1 CANARY STOPPED:", e?.message || e);
  }
})();
