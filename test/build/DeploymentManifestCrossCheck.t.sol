// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AssuranceVault} from "../../src/assurance/AssuranceVault.sol";

contract DeploymentManifestCrossCheckTest is Test {
    function test_ManifestCreationAndInitCodeHashesMatchSolidity()
        public
    {
        string memory buildJson =
            vm.readFile("build/reproducible-build-manifest.json");
        string memory deployJson =
            vm.readFile("build/deployment-manifest.ci.json");

        bytes32 expectedCreationHash =
            vm.parseJsonBytes32(
                buildJson,
                ".artifacts.assurance_vault_creation_bytecode_keccak256"
            );

        assertEq(
            keccak256(type(AssuranceVault).creationCode),
            expectedCreationHash,
            "creation bytecode hash mismatch"
        );

        address authority = vm.parseJsonAddress(
            deployJson,
            ".constructor.authority"
        );
        uint256 chainId = vm.parseUint(
            vm.parseJsonString(
                deployJson,
                ".constructor.expected_chain_id"
            )
        );
        address usdc = vm.parseJsonAddress(
            deployJson,
            ".constructor.usdc_erc20_interface"
        );
        uint256 spendCap = vm.parseUint(
            vm.parseJsonString(
                deployJson,
                ".constructor.deployment_spend_cap_wei"
            )
        );

        bytes memory initCode = abi.encodePacked(
            type(AssuranceVault).creationCode,
            abi.encode(
                authority,
                chainId,
                usdc,
                spendCap
            )
        );

        assertEq(
            keccak256(initCode),
            vm.parseJsonBytes32(
                deployJson,
                ".constructor.init_code_keccak256"
            ),
            "init code hash mismatch"
        );
    }
}
