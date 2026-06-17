// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CordonPolicy} from "../src/CordonPolicy.sol";

contract CordonPolicyTest is Test {
    CordonPolicy internal cordon;

    address internal owner = makeAddr("owner");
    address internal keeper = makeAddr("keeper");
    address internal operating = makeAddr("operating");
    address internal quarantine = makeAddr("quarantine");
    address internal stranger = makeAddr("stranger");
    address internal sender = makeAddr("sender");
    address internal aToken = makeAddr("ausdc");

    bytes32 internal constant GROUP_US = keccak256("US");
    bytes32 internal constant GROUP_EU = keccak256("EU");

    uint8 internal constant CLEARED = 0;
    uint8 internal constant QUARANTINED = 1;

    event PolicyUpdated(
        address indexed institution, uint8 minTier, uint64 freshnessWindow, bool requireCleanBlacklist
    );
    event GroupUpdated(bytes32 indexed group, bool allowed);
    event DepositCleared(
        bytes32 indexed depositId,
        address indexed sender,
        uint256 amount,
        address aToken,
        uint8 tier,
        bytes32 attestationHash
    );
    event DepositQuarantined(
        bytes32 indexed depositId, address indexed sender, uint256 amount, uint8 reason, bytes32 attestationHash
    );

    function setUp() public {
        cordon = new CordonPolicy(owner);
        bytes32[] memory groups = new bytes32[](1);
        groups[0] = GROUP_US;
        vm.prank(owner);
        cordon.setPolicy(2, uint64(30 days), true, keeper, operating, quarantine, groups);
    }

    // --------------------------------------------------------------------- setPolicy

    function test_Constructor_SetsOwner() public view {
        assertEq(cordon.owner(), owner);
    }

    function test_VerdictConstantsMatchContract() public view {
        assertEq(cordon.CLEARED(), CLEARED);
        assertEq(cordon.QUARANTINED(), QUARANTINED);
    }

    function test_SetPolicy_StoresState() public view {
        CordonPolicy.Policy memory p = cordon.getPolicy();
        assertEq(p.minTier, 2);
        assertEq(p.freshnessWindow, uint64(30 days));
        assertTrue(p.requireCleanBlacklist);
        assertEq(p.keeper, keeper);
        assertEq(p.operating, operating);
        assertEq(p.quarantine, quarantine);
        assertTrue(cordon.isGroupAllowed(GROUP_US));
        assertFalse(cordon.isGroupAllowed(GROUP_EU));
    }

    function test_SetPolicy_EmitsGroupThenPolicyUpdated() public {
        bytes32[] memory groups = new bytes32[](1);
        groups[0] = GROUP_EU;

        vm.expectEmit(true, false, false, true);
        emit GroupUpdated(GROUP_EU, true);
        vm.expectEmit(true, false, false, true);
        emit PolicyUpdated(owner, 3, uint64(7 days), false);

        vm.prank(owner);
        cordon.setPolicy(3, uint64(7 days), false, keeper, operating, quarantine, groups);

        assertTrue(cordon.isGroupAllowed(GROUP_EU));
        assertFalse(cordon.getPolicy().requireCleanBlacklist);
    }

    function test_SetPolicy_EmptyGroupsAllowed() public {
        bytes32[] memory groups = new bytes32[](0);
        vm.prank(owner);
        cordon.setPolicy(1, 1, false, keeper, operating, quarantine, groups);
        assertEq(cordon.getPolicy().minTier, 1);
    }

    function test_SetPolicy_RevertWhenNotOwner() public {
        bytes32[] memory groups = new bytes32[](0);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        cordon.setPolicy(1, 1, false, keeper, operating, quarantine, groups);
    }

    function test_SetPolicy_RevertZeroKeeper() public {
        bytes32[] memory groups = new bytes32[](0);
        vm.prank(owner);
        vm.expectRevert(CordonPolicy.ZeroAddress.selector);
        cordon.setPolicy(1, 1, false, address(0), operating, quarantine, groups);
    }

    function test_SetPolicy_RevertZeroOperating() public {
        bytes32[] memory groups = new bytes32[](0);
        vm.prank(owner);
        vm.expectRevert(CordonPolicy.ZeroAddress.selector);
        cordon.setPolicy(1, 1, false, keeper, address(0), quarantine, groups);
    }

    function test_SetPolicy_RevertZeroQuarantine() public {
        bytes32[] memory groups = new bytes32[](0);
        vm.prank(owner);
        vm.expectRevert(CordonPolicy.ZeroAddress.selector);
        cordon.setPolicy(1, 1, false, keeper, operating, address(0), groups);
    }

    // ---------------------------------------------------------------------- setGroup

    function test_SetGroup_Toggle() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit GroupUpdated(GROUP_EU, true);
        cordon.setGroup(GROUP_EU, true);
        assertTrue(cordon.isGroupAllowed(GROUP_EU));

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit GroupUpdated(GROUP_EU, false);
        cordon.setGroup(GROUP_EU, false);
        assertFalse(cordon.isGroupAllowed(GROUP_EU));
    }

    function test_SetGroup_RevertWhenNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        cordon.setGroup(GROUP_EU, true);
    }

    function test_RenounceOwnership_Reverts() public {
        vm.prank(owner);
        vm.expectRevert(CordonPolicy.RenounceDisabled.selector);
        cordon.renounceOwnership();
        assertEq(cordon.owner(), owner);
    }

    // ----------------------------------------------------------------- recordVerdict

    function test_RecordVerdict_ClearedPath() public {
        bytes32 depositId = keccak256("dep-clear-1");
        bytes32 att = keccak256("att-1");
        uint8 tier = 4;

        vm.expectEmit(true, true, false, true);
        emit DepositCleared(depositId, sender, 1_000_000, aToken, tier, att);
        vm.prank(keeper);
        cordon.recordVerdict(depositId, sender, 1_000_000, aToken, CLEARED, tier, att);

        (
            address s,
            uint256 amt,
            address tok,
            uint8 v,
            uint8 r,
            bytes32 a,
            uint64 ts
        ) = cordon.verdicts(depositId);
        assertEq(s, sender);
        assertEq(amt, 1_000_000);
        assertEq(tok, aToken);
        assertEq(v, 0);
        assertEq(r, tier);
        assertEq(a, att);
        assertEq(ts, uint64(block.timestamp));
        assertTrue(cordon.recorded(depositId));
    }

    function test_RecordVerdict_ClearedDoesNotRangeCheckTierByte() public {
        bytes32 depositId = keccak256("dep-clear-htier");
        vm.prank(keeper);
        cordon.recordVerdict(depositId, sender, 1, aToken, CLEARED, 200, bytes32(0));
        (,,,, uint8 r,,) = cordon.verdicts(depositId);
        assertEq(r, 200);
    }

    function test_RecordVerdict_EachQuarantineReason() public {
        for (uint8 reason; reason <= uint8(type(CordonPolicy.Reason).max); ++reason) {
            bytes32 depositId = keccak256(abi.encodePacked("dep-q", reason));
            bytes32 att = keccak256(abi.encodePacked("att-q", reason));

            vm.expectEmit(true, true, false, true);
            emit DepositQuarantined(depositId, sender, 500, reason, att);
            vm.prank(keeper);
            cordon.recordVerdict(depositId, sender, 500, aToken, QUARANTINED, reason, att);

            (address s,, address tok, uint8 v, uint8 r, bytes32 a, uint64 ts) = cordon.verdicts(depositId);
            assertEq(s, sender);
            assertEq(tok, aToken);
            assertEq(v, 1);
            assertEq(r, reason);
            assertEq(a, att);
            assertEq(ts, uint64(block.timestamp));
        }
    }

    function test_RecordVerdict_QuarantineMaxReasonOk() public {
        bytes32 depositId = keccak256("dep-maxr");
        uint8 maxReason = uint8(type(CordonPolicy.Reason).max);
        vm.prank(keeper);
        cordon.recordVerdict(depositId, sender, 1, aToken, QUARANTINED, maxReason, bytes32(0));
        (,,,, uint8 r,,) = cordon.verdicts(depositId);
        assertEq(r, maxReason);
    }

    function test_RecordVerdict_RevertWhenNotKeeper() public {
        vm.prank(stranger);
        vm.expectRevert(CordonPolicy.NotKeeper.selector);
        cordon.recordVerdict(keccak256("x"), sender, 1, aToken, CLEARED, 1, bytes32(0));
    }

    function test_RecordVerdict_RevertWhenOwnerIsNotKeeper() public {
        vm.prank(owner);
        vm.expectRevert(CordonPolicy.NotKeeper.selector);
        cordon.recordVerdict(keccak256("y"), sender, 1, aToken, CLEARED, 1, bytes32(0));
    }

    function test_RecordVerdict_RevertDuplicate() public {
        bytes32 depositId = keccak256("dep-dup");
        bytes32 att = keccak256("att-dup");
        vm.prank(keeper);
        cordon.recordVerdict(depositId, sender, 1, aToken, CLEARED, 1, att);

        vm.prank(keeper);
        vm.expectRevert(CordonPolicy.VerdictExists.selector);
        cordon.recordVerdict(depositId, sender, 2, aToken, QUARANTINED, 0, bytes32(0));

        (, uint256 amt,, uint8 v, uint8 r, bytes32 a,) = cordon.verdicts(depositId);
        assertEq(amt, 1);
        assertEq(v, CLEARED);
        assertEq(r, 1);
        assertEq(a, att);
    }

    function test_RecordVerdict_RevertInvalidVerdict() public {
        vm.prank(keeper);
        vm.expectRevert(CordonPolicy.InvalidVerdict.selector);
        cordon.recordVerdict(keccak256("bad-v"), sender, 1, aToken, 2, 0, bytes32(0));
    }

    function test_RecordVerdict_RevertInvalidReason() public {
        vm.prank(keeper);
        vm.expectRevert(CordonPolicy.InvalidReason.selector);
        cordon.recordVerdict(keccak256("bad-r"), sender, 1, aToken, QUARANTINED, 99, bytes32(0));
    }

    // ---------------------------------------------------------------------- fuzzing

    function testFuzz_RecordVerdict_ClearedRoundTrips(
        bytes32 depositId,
        uint256 amount,
        uint8 tier,
        bytes32 att
    ) public {
        vm.assume(!cordon.recorded(depositId));
        vm.prank(keeper);
        cordon.recordVerdict(depositId, sender, amount, aToken, CLEARED, tier, att);
        (, uint256 amt,, uint8 v, uint8 r,,) = cordon.verdicts(depositId);
        assertEq(amt, amount);
        assertEq(v, 0);
        assertEq(r, tier);
    }
}
