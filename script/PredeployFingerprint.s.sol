// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AssuranceVault} from "../src/assurance/AssuranceVault.sol";

/// @notice Read-only predeployment fingerprint helper.
/// @dev Does not broadcast and does not deploy. It proves the creation-code
///      and init-code hashes for the exact constructor arguments.
contract PredeployFingerprint is Script {
    function run() external view {
        address authority = vm.envAddress("DEPLOY_AUTHORITY");
        uint256 spendCap =
            vm.envUint("DEPLOYMENT_SPEND_CAP_WEI");

        bytes memory creation =
            type(AssuranceVault).creationCode;

        bytes memory args = abi.encode(
            authority,
            uint256(5042),
            0x3600000000000000000000000000000000000000,
            spendCap
        );

        console2.logBytes32(keccak256(creation));
        console2.logBytes32(
            keccak256(
                abi.encodePacked(creation, args)
            )
        );
    }
}
