import test from "node:test";
import assert from "node:assert/strict";
import {
  computeGasBudgetV1,
  fetchFeeSnapshotV1,
  verifyWalletPublicStateV1,
} from "../../script/read-only-gas-budget.mjs";

test("budget includes gas margins plus peak principal outflow", () => {
  const result = computeGasBudgetV1({
    gasPriceWei: "1000",
    deployGasUnits: "1000000",
    executionGasUnits: "500000",
    principalOutflowWei: "10000000000000000",
    walletTopupCeilingWei:
      "5000000000000000000",
    gasPriceSafetyBps: "20000",
    gasUnitsSafetyBps: "12500",
  });

  assert.equal(
    result.safe_total_gas_units,
    "1875000"
  );
  assert.equal(result.safe_gas_price_wei, "2000");
  assert.equal(
    result.gas_reserve_wei,
    "3750000000"
  );
  assert.equal(result.within_wallet_ceiling, true);
});

test("budget fails when peak requirement exceeds wallet ceiling", () => {
  const result = computeGasBudgetV1({
    gasPriceWei: "1000000000000",
    deployGasUnits: "5000000",
    executionGasUnits: "5000000",
    principalOutflowWei:
      "1000000000000000000",
    walletTopupCeilingWei:
      "1000000000000000000",
    gasPriceSafetyBps: "20000",
    gasUnitsSafetyBps: "12500",
  });

  assert.equal(result.within_wallet_ceiling, false);
});

test("safety multipliers cannot go below 1x", () => {
  assert.throws(
    () =>
      computeGasBudgetV1({
        gasPriceWei: "1",
        deployGasUnits: "1",
        executionGasUnits: "0",
        principalOutflowWei: "0",
        walletTopupCeilingWei: "100",
        gasPriceSafetyBps: "9999",
        gasUnitsSafetyBps: "10000",
      }),
    /GAS_PRICE_SAFETY_BELOW_1X/
  );
});

test("fee snapshot rejects non-Arc chain", async () => {
  const client = {
    async getChainId() {
      return 1;
    },
    async getBlockNumber() {
      return 1n;
    },
    async getGasPrice() {
      return 1n;
    },
  };

  await assert.rejects(
    () => fetchFeeSnapshotV1(client),
    /CHAIN_ID_NOT_ARC_MAINNET/
  );
});

test("wallet public-state check reads balance without signing", async () => {
  const client = {
    async getBalance({ address }) {
      assert.equal(
        address,
        "0x1111111111111111111111111111111111111111"
      );
      return 5_000_000_000_000_000_000n;
    },
  };

  const state = await verifyWalletPublicStateV1(
    client,
    "0x1111111111111111111111111111111111111111"
  );

  assert.equal(
    state.balance_wei,
    "5000000000000000000"
  );
});
