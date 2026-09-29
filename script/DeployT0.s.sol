// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PolicyCustody} from "../src/PolicyCustody.sol";

/// @notice Safe-by-default T0 deployment for Arc mainnet.
///
/// @dev This script is deliberately mainnet-only. There is no "local" branch:
///      running it against any other chain aborts before a single transaction is
///      constructed, so a mistaken RPC or a forked simulation can never produce
///      a deployment record that could be mistaken for live evidence.
///
///      Preconditions, all checked before broadcasting:
///        1. chain id is exactly 5042 (Arc mainnet)
///        2. the configured USDC interface is the canonical Arc address and has
///           contract code on chain
///        3. every required environment variable is present and parses
///        4. T0_CONFIRM_MAINNET is exactly 1
///        5. the target policy configuration is internally consistent
///
///      The private key is supplied by the standard `PRIVATE_KEY` env
///      convention read by the broadcast machinery. It is never read, logged or
///      written by this script.
contract DeployT0 is Script {
    uint256 internal constant ARC_MAINNET_CHAIN_ID = 5042;
    address internal constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    /// @notice Hard ceiling on total native USDC this deployment may custody:
    ///         0.05 native USDC.
    uint256 internal constant DEPLOYMENT_SPEND_CAP = 5e16;

    error WrongChain(uint256 expected, uint256 actual);
    error WrongUsdc(address expected, address provided);
    error MainnetNotConfirmed();
    error MissingEnv(string key);
    error BadAddress(string key);
    error BadUint(string key);
    error BadBytes32(string key);
    error InconsistentConfig();

    function run() external returns (PolicyCustody vault) {
        // --- 1. chain -----------------------------------------------------
        if (block.chainid != ARC_MAINNET_CHAIN_ID) {
            revert WrongChain(ARC_MAINNET_CHAIN_ID, block.chainid);
        }

        // --- 2. USDC interface --------------------------------------------
        address usdc = _envAddress("ARC_USDC_ADDRESS", ARC_USDC);
        if (usdc != ARC_USDC) revert WrongUsdc(ARC_USDC, usdc);
        if (usdc.code.length == 0) revert WrongUsdc(ARC_USDC, address(0));

        // --- 3. configuration --------------------------------------------
        address authority = _envAddress("T0_AUTHORITY_ADDRESS", address(0));
        if (authority == address(0)) revert BadAddress("T0_AUTHORITY_ADDRESS");

        bytes32 policyId = vm.envBytes32("T0_POLICY_ID");
        if (policyId == bytes32(0)) revert BadBytes32("T0_POLICY_ID");

        address funder = _envAddress("T0_FUNDER_ADDRESS", address(0));
        address payoutRecipient = _envAddress("T0_PAYOUT_RECIPIENT_ADDRESS", address(0));
        uint256 maxSpendCap = vm.envUint("T0_FUND_AMOUNT_WEI");
        uint256 unitPayout = vm.envUint("T0_UNIT_PAYOUT_WEI");
        uint64 expiry = uint64(vm.envUint("T0_EXPIRY"));

        if (funder == address(0)) revert BadAddress("T0_FUNDER_ADDRESS");
        if (payoutRecipient == address(0)) revert BadAddress("T0_PAYOUT_RECIPIENT_ADDRESS");
        if (maxSpendCap == 0) revert BadUint("T0_FUND_AMOUNT_WEI");
        if (unitPayout == 0 || unitPayout > maxSpendCap) revert InconsistentConfig();
        if (maxSpendCap > DEPLOYMENT_SPEND_CAP) revert InconsistentConfig();
        if (expiry != 0 && expiry <= block.timestamp) revert InconsistentConfig();

        // --- 4. explicit human confirmation -------------------------------
        if (vm.envOr("T0_CONFIRM_MAINNET", uint256(0)) != 1) revert MainnetNotConfirmed();

        console.log("chainId          :", block.chainid);
        console.log("usdc interface   :", usdc);
        console.log("authority        :", authority);
        console.logBytes32(policyId);
        console.log("funder           :", funder);
        console.log("payoutRecipient  :", payoutRecipient);
        console.log("maxSpendCap      :", maxSpendCap);
        console.log("unitPayout       :", unitPayout);
        console.log("expiry           :", uint256(expiry));
        console.log("spend cap        :", DEPLOYMENT_SPEND_CAP);

        // The policy is registered in the same broadcast, and registration is
        // authority-only, so the broadcasting account must BE the authority.
        // Splitting these two would silently produce an unregistrable policy.
        address broadcaster = _envAddress("DEPLOYER_ADDRESS", address(0));
        if (broadcaster != authority) revert InconsistentConfig();
        console.log("broadcaster      :", broadcaster);

        vm.startBroadcast();
        vault = new PolicyCustody(authority, ARC_MAINNET_CHAIN_ID, usdc, DEPLOYMENT_SPEND_CAP);
        vault.createPolicy(policyId, funder, payoutRecipient, maxSpendCap, unitPayout, expiry);
        vm.stopBroadcast();

        console.log("vault            :", address(vault));
        console.log("owner()          :", vault.authority());
        console.log("expectedChainId  :", vault.expectedChainId());
        console.log("pooledLiability  :", vault.totalLiability());
        console.log("unattributed     :", vault.unattributedValue());
    }

    function _envAddress(string memory key, address fallbackValue) internal view returns (address) {
        bytes memory raw = vm.envOr(key, bytes(""));
        if (raw.length == 0) {
            if (fallbackValue == address(0)) revert MissingEnv(key);
            return fallbackValue;
        }
        address parsed = vm.parseAddress(string(raw));
        if (parsed == address(0)) revert BadAddress(key);
        return parsed;
    }
}
