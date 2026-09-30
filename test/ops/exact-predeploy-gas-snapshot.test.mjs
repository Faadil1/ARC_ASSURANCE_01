import test from "node:test";
import assert from "node:assert/strict";
import {
  concatHex,
  getContractAddress,
  keccak256,
} from "viem";
import {
  buildPredeployGasSnapshotV1,
  reconstructInitCodeV1,
} from "../../script/exact-predeploy-gas-snapshot.mjs";

const CREATION = "0x60006000";
const ARGS =
  "0x" + "11".repeat(32);
const INIT = concatHex([CREATION, ARGS]);

function fixtureManifest() {
  return {
    schema:
      "ARC_ASSURANCE_DEPLOYMENT_MANIFEST_V1",
    build_git_sha: "abc123",
    constructor: {
      authority:
        "0x1111111111111111111111111111111111111111",
      encoded_args: ARGS,
      init_code_keccak256: keccak256(INIT),
    },
    expected_artifacts: {
      creation_bytecode_keccak256:
        keccak256(CREATION),
    },
  };
}

function fixtureArtifact() {
  return {
    bytecode: {
      object: CREATION,
    },
  };
}

function mockClient(overrides = {}) {
  return {
    async getChainId() {
      return 5042;
    },
    async getBlockNumber() {
      return 12345n;
    },
    async getGasPrice() {
      return 1000n;
    },
    async getTransactionCount() {
      return 7;
    },
    async getBalance() {
      return 5_000_000_000_000_000_000n;
    },
    async estimateGas({ account, data, value }) {
      assert.equal(
        account,
        "0x1111111111111111111111111111111111111111"
      );
      assert.equal(data, INIT);
      assert.equal(value, 0n);
      return 4_200_000n;
    },
    ...overrides,
  };
}

test("reconstructs init code and checks both hashes", () => {
  const result = reconstructInitCodeV1({
    manifest: fixtureManifest(),
    artifact: fixtureArtifact(),
  });

  assert.equal(
    result.init_code_keccak256,
    keccak256(INIT)
  );
  assert.equal(
    result.creation_bytecode_keccak256,
    keccak256(CREATION)
  );
});

test("fails closed on creation bytecode mismatch", () => {
  const manifest = fixtureManifest();
  manifest.expected_artifacts
    .creation_bytecode_keccak256 =
    "0x" + "00".repeat(32);

  assert.throws(
    () =>
      reconstructInitCodeV1({
        manifest,
        artifact: fixtureArtifact(),
      }),
    /CREATION_BYTECODE_HASH_MISMATCH/
  );
});

test("produces nonce-bound read-only deployment snapshot", async () => {
  const deployer =
    "0x1111111111111111111111111111111111111111";

  const snapshot =
    await buildPredeployGasSnapshotV1({
      client: mockClient(),
      manifest: fixtureManifest(),
      artifact: fixtureArtifact(),
      deployerAddress: deployer,
    });

  assert.equal(
    snapshot.deployment_gas.eth_estimateGas_units,
    "4200000"
  );
  assert.equal(
    snapshot.deployment_gas
      .estimate_cost_at_observed_gas_price_wei,
    "4200000000"
  );
  assert.equal(
    snapshot.predicted_contract_address,
    getContractAddress({
      from: deployer,
      nonce: 7n,
      opcode: "CREATE",
    })
  );
  assert.equal(
    snapshot.deployer.matches_constructor_authority,
    true
  );
  assert.equal(
    snapshot.safety.transaction_signed,
    false
  );
});

test("rejects a non-Arc RPC", async () => {
  await assert.rejects(
    () =>
      buildPredeployGasSnapshotV1({
        client: mockClient({
          async getChainId() {
            return 1;
          },
        }),
        manifest: fixtureManifest(),
        artifact: fixtureArtifact(),
        deployerAddress:
          "0x1111111111111111111111111111111111111111",
      }),
    /CHAIN_ID_NOT_ARC_MAINNET/
  );
});

test("rejects zero deploy gas estimate", async () => {
  await assert.rejects(
    () =>
      buildPredeployGasSnapshotV1({
        client: mockClient({
          async estimateGas() {
            return 0n;
          },
        }),
        manifest: fixtureManifest(),
        artifact: fixtureArtifact(),
        deployerAddress:
          "0x1111111111111111111111111111111111111111",
      }),
    /DEPLOY_GAS_ESTIMATE_NOT_POSITIVE/
  );
});
