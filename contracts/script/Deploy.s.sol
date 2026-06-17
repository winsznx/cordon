// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CordonPolicy} from "../src/CordonPolicy.sol";

/// @notice Deploys CordonPolicy to Monad and sets a sane initial inbound policy.
/// @dev Reads from env: DEPLOYER_PRIVATE_KEY, OPERATING_WALLET, QUARANTINE_WALLET.
///      Optional: KEEPER_WALLET (defaults to deployer), MIN_TIER, FRESHNESS_WINDOW.
contract Deploy is Script {
    function run() external returns (CordonPolicy cordon) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address keeper = vm.envOr("KEEPER_WALLET", deployer);
        address operating = vm.envAddress("OPERATING_WALLET");
        address quarantine = vm.envAddress("QUARANTINE_WALLET");
        uint8 minTier = uint8(vm.envOr("MIN_TIER", uint256(1)));
        uint64 freshnessWindow = uint64(vm.envOr("FRESHNESS_WINDOW", uint256(30 days)));

        vm.startBroadcast(pk);
        cordon = new CordonPolicy(deployer);
        bytes32[] memory groups = new bytes32[](0);
        cordon.setPolicy(minTier, freshnessWindow, true, keeper, operating, quarantine, groups);
        vm.stopBroadcast();

        console.log("CordonPolicy deployed:", address(cordon));
        console.log("owner/institution:    ", deployer);
        console.log("keeper:               ", keeper);
        console.log("operating:            ", operating);
        console.log("quarantine:           ", quarantine);
        console.log("minTier:              ", minTier);
        console.log("freshnessWindow:      ", freshnessWindow);
    }
}
