#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
} from "viem";

export const ARC_MAINNET_CHAIN_ID = 5042;
export const DEFAULT_RPC = "https://rpc.mainnet.arc.io";
export const WEI_PER_USDC = 1_000_000_000_000_000_000n;

function ceilMulDiv(value, numerator, denominator) {
  return (value * numerator + denominator - 1n) / denominator;
}

function asBigInt(value, label) {
  try {
    const parsed = BigInt(value);
    if (parsed < 0n) throw new Error();
    return parsed;
  } catch {
    throw new Error("INVALID_" + label.toUpperCase());
  }
}

function requireAddress(value, label) {
  if (!value) throw new Error("MISSING_" + label.toUpperCase());
  return getAddress(value);
}

export function computeGasBudgetV1({
  gasPriceWei,
  deployGasUnits,
  executionGasUnits,
  principalOutflowWei,
  walletTopupCeilingWei,
  gasPriceSafetyBps = 20_000n,
  gasUnitsSafetyBps = 12_500n,
}) {
  const gasPrice = asBigInt(gasPriceWei, "gas_price_wei");
  const deployGas = asBigInt(deployGasUnits, "deploy_gas_units");
  const executionGas = asBigInt(
    executionGasUnits,
    "execution_gas_units"
  );
  const principal = asBigInt(
    principalOutflowWei,
    "principal_outflow_wei"
  );
  const ceiling = asBigInt(
    walletTopupCeilingWei,
    "wallet_topup_ceiling_wei"
  );
  const gasPriceBps = asBigInt(
    gasPriceSafetyBps,
    "gas_price_safety_bps"
  );
  const gasUnitsBps = asBigInt(
    gasUnitsSafetyBps,
    "gas_units_safety_bps"
  );

  if (gasPrice === 0n) throw new Error("ZERO_GAS_PRICE");
  if (deployGas === 0n) throw new Error("ZERO_DEPLOY_GAS");
  if (gasPriceBps < 10_000n) {
    throw new Error("GAS_PRICE_SAFETY_BELOW_1X");
  }
  if (gasUnitsBps < 10_000n) {
    throw new Error("GAS_UNITS_SAFETY_BELOW_1X");
  }

  const rawGasUnits = deployGas + executionGas;
  const safeGasUnits = ceilMulDiv(
    rawGasUnits,
    gasUnitsBps,
    10_000n
  );
  const safeGasPrice = ceilMulDiv(
    gasPrice,
    gasPriceBps,
    10_000n
  );
  const gasReserveWei = safeGasUnits * safeGasPrice;
  const peakRequiredWei = gasReserveWei + principal;
  const remainingHeadroomWei =
    ceiling >= peakRequiredWei
      ? ceiling - peakRequiredWei
      : 0n;

  return {
    gas_price_wei_observed: gasPrice.toString(),
    gas_price_safety_bps: gasPriceBps.toString(),
    safe_gas_price_wei: safeGasPrice.toString(),
    deploy_gas_units: deployGas.toString(),
    execution_gas_units: executionGas.toString(),
    gas_units_safety_bps: gasUnitsBps.toString(),
    safe_total_gas_units: safeGasUnits.toString(),
    gas_reserve_wei: gasReserveWei.toString(),
    principal_outflow_wei: principal.toString(),
    peak_required_wei: peakRequiredWei.toString(),
    wallet_topup_ceiling_wei: ceiling.toString(),
    remaining_headroom_wei: remainingHeadroomWei.toString(),
    within_wallet_ceiling: peakRequiredWei <= ceiling,
  };
}

export function makeArcClient(rpcUrl = DEFAULT_RPC) {
  const arc = defineChain({
    id: ARC_MAINNET_CHAIN_ID,
    name: "Arc Mainnet",
    nativeCurrency: {
      name: "USDC",
      symbol: "USDC",
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  });

  return createPublicClient({
    chain: arc,
    transport: http(rpcUrl),
  });
}

export async function fetchFeeSnapshotV1(client) {
  const [chainId, blockNumber, gasPrice] = await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getGasPrice(),
  ]);

  if (chainId !== ARC_MAINNET_CHAIN_ID) {
    throw new Error(
      "CHAIN_ID_NOT_ARC_MAINNET:" + chainId
    );
  }

  return {
    chain_id: chainId,
    block_number: blockNumber.toString(),
    gas_price_wei: gasPrice.toString(),
  };
}

export async function verifyWalletPublicStateV1(
  client,
  address
) {
  const account = requireAddress(address, "wallet_address");
  const balance = await client.getBalance({
    address: account,
  });

  return {
    address: account,
    balance_wei: balance.toString(),
  };
}

async function main() {
  const [, , mode, configPath] = process.argv;

  if (!["fee-snapshot", "wallet-budget"].includes(mode)) {
    console.error(
      "Usage: node script/read-only-gas-budget.mjs fee-snapshot [config.json]\n" +
        "   or: node script/read-only-gas-budget.mjs wallet-budget <config.json>"
    );
    process.exitCode = 2;
    return;
  }

  const config = configPath
    ? JSON.parse(await readFile(configPath, "utf8"))
    : {};

  const rpc =
    process.env.ARC_MAINNET_RPC_URL?.trim() ||
    config.network?.rpc ||
    DEFAULT_RPC;

  const client = makeArcClient(rpc);

  try {
    const snapshot = await fetchFeeSnapshotV1(client);

    if (mode === "fee-snapshot") {
      console.log(
        JSON.stringify(
          {
            ok: true,
            verdict: "ARC_FEE_SNAPSHOT_OBSERVED",
            snapshot,
            safety: {
              private_key_consumed: false,
              transaction_signed: false,
              transaction_broadcast: false,
              funds_moved: false,
            },
            truth_boundary:
              "Fee snapshot is time-bound and must be refreshed immediately before any protected mainnet action.",
          },
          null,
          2
        )
      );
      return;
    }

    if (
      config.schema !== "ARC_ASSURANCE_PREMAINNET_V1"
    ) {
      throw new Error("UNEXPECTED_PREMAINNET_SCHEMA");
    }

    const gas = config.gas_budget ?? {};
    const walletAddress =
      config.t0?.authority_address ??
      config.integrated?.authority_address;

    const walletState =
      await verifyWalletPublicStateV1(
        client,
        walletAddress
      );

    const deployGas = gas.deploy_gas_units;
    const executionGas = gas.execution_gas_units;

    if (
      deployGas === null ||
      deployGas === undefined ||
      executionGas === null ||
      executionGas === undefined
    ) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            verdict:
              "BLOCKED_MISSING_VERIFIED_GAS_UNIT_INPUTS",
            snapshot,
            wallet: walletState,
            missing: [
              ...(deployGas === null ||
              deployGas === undefined
                ? ["gas_budget.deploy_gas_units"]
                : []),
              ...(executionGas === null ||
              executionGas === undefined
                ? [
                    "gas_budget.execution_gas_units",
                  ]
                : []),
            ],
            safety: {
              private_key_consumed: false,
              transaction_signed: false,
              transaction_broadcast: false,
              funds_moved: false,
            },
          },
          null,
          2
        )
      );
      process.exitCode = 2;
      return;
    }

    const budget = computeGasBudgetV1({
      gasPriceWei: snapshot.gas_price_wei,
      deployGasUnits: deployGas,
      executionGasUnits: executionGas,
      principalOutflowWei:
        config.gas_budget?.principal_outflow_wei ??
        config.t0?.fund_amount_wei ??
        "0",
      walletTopupCeilingWei:
        config.wallet_budget?.max_wallet_topup_wei,
      gasPriceSafetyBps:
        gas.gas_price_safety_bps ?? "20000",
      gasUnitsSafetyBps:
        gas.gas_units_safety_bps ?? "12500",
    });

    const balanceWei = BigInt(
      walletState.balance_wei
    );
    const peakRequiredWei = BigInt(
      budget.peak_required_wei
    );

    const result = {
      ok:
        budget.within_wallet_ceiling &&
        balanceWei >= peakRequiredWei,
      verdict:
        !budget.within_wallet_ceiling
          ? "BLOCKED_WALLET_CEILING_INSUFFICIENT"
          : balanceWei < peakRequiredWei
            ? "BLOCKED_WALLET_BALANCE_INSUFFICIENT"
            : "READ_ONLY_GAS_BUDGET_WITHIN_CEILING",
      snapshot,
      wallet: walletState,
      budget,
      safety: {
        private_key_consumed: false,
        transaction_signed: false,
        transaction_broadcast: false,
        funds_moved: false,
      },
      truth_boundary:
        "Gas price is a point-in-time observation. Re-run immediately before deploy/execute approval.",
    };

    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          verdict: "READ_ONLY_GAS_GATE_FAILED",
          error: error?.message ?? String(error),
          safety: {
            private_key_consumed: false,
            transaction_signed: false,
            transaction_broadcast: false,
            funds_moved: false,
          },
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    new URL("file://" + process.argv[1]).href
) {
  await main();
}
