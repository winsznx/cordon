// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CordonPolicy
/// @notice Inbound compliance policy and immutable verdict log for an institution's
///         agent wallets. The keeper screens each inbound deposit off-chain
///         (query_apass + query_user vs. this policy) and anchors the outcome here.
///         This contract custodies no funds; it carries policy and the audit anchor.
/// @dev The single `reason` byte in {recordVerdict} is dual-purpose: it carries the
///      sender's A-Pass tier when the deposit is CLEARED, and the {Reason} enum when
///      the deposit is QUARANTINED. The two verdict events surface it under the
///      matching name (`tier` vs `reason`).
contract CordonPolicy is Ownable {
    /// @notice Why an inbound deposit failed policy. Encodes the `reason` byte of a
    ///         quarantined verdict.
    enum Reason {
        NoAPass,
        Frozen,
        Blacklisted,
        TierTooLow,
        GroupNotAllowed,
        NearExpiry
    }

    struct Policy {
        uint8 minTier;
        uint64 freshnessWindow;
        bool requireCleanBlacklist;
        address keeper;
        address operating;
        address quarantine;
    }

    struct Verdict {
        address sender;
        uint256 amount;
        address aToken;
        uint8 verdict;
        uint8 reason;
        bytes32 attestationHash;
        uint64 ts;
    }

    uint8 public constant CLEARED = 0;
    uint8 public constant QUARANTINED = 1;

    Policy private _policy;

    mapping(bytes32 group => bool allowed) public allowedGroups;
    mapping(bytes32 depositId => Verdict) public verdicts;
    mapping(bytes32 depositId => bool) public recorded;

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

    error ZeroAddress();
    error NotKeeper();
    error VerdictExists();
    error InvalidVerdict();
    error InvalidReason();
    error RenounceDisabled();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Set the institution's inbound risk policy and allow the given groups.
    /// @dev Owner only. Groups passed here are enabled additively; use {setGroup} to
    ///      disable a group. Reverts if any routing address is zero.
    function setPolicy(
        uint8 minTier,
        uint64 freshnessWindow,
        bool requireCleanBlacklist,
        address keeper,
        address operating,
        address quarantine,
        bytes32[] calldata groups
    ) external onlyOwner {
        if (keeper == address(0) || operating == address(0) || quarantine == address(0)) {
            revert ZeroAddress();
        }
        _policy = Policy(minTier, freshnessWindow, requireCleanBlacklist, keeper, operating, quarantine);
        for (uint256 i; i < groups.length; ++i) {
            allowedGroups[groups[i]] = true;
            emit GroupUpdated(groups[i], true);
        }
        emit PolicyUpdated(msg.sender, minTier, freshnessWindow, requireCleanBlacklist);
    }

    /// @notice Enable or disable a single jurisdiction/group. Owner only.
    function setGroup(bytes32 group, bool allowed) external onlyOwner {
        allowedGroups[group] = allowed;
        emit GroupUpdated(group, allowed);
    }

    /// @notice Renouncing ownership is disabled — it would permanently brick policy
    ///         updates and keeper rotation.
    function renounceOwnership() public pure override {
        revert RenounceDisabled();
    }

    /// @notice Anchor a screening outcome for an inbound deposit. Keeper only.
    /// @param verdict {CLEARED} (0) or {QUARANTINED} (1).
    /// @param reason Sender tier when CLEARED; {Reason} enum when QUARANTINED.
    /// @dev Reverts on an unknown verdict, an out-of-range quarantine reason, or a
    ///      duplicate depositId — the audit log is append-only and immutable.
    function recordVerdict(
        bytes32 depositId,
        address sender,
        uint256 amount,
        address aToken,
        uint8 verdict,
        uint8 reason,
        bytes32 attestationHash
    ) external {
        if (msg.sender != _policy.keeper) revert NotKeeper();
        if (recorded[depositId]) revert VerdictExists();
        if (verdict > QUARANTINED) revert InvalidVerdict();
        if (verdict == QUARANTINED && reason > uint8(type(Reason).max)) revert InvalidReason();

        recorded[depositId] = true;
        verdicts[depositId] =
            Verdict(sender, amount, aToken, verdict, reason, attestationHash, uint64(block.timestamp));

        if (verdict == CLEARED) {
            emit DepositCleared(depositId, sender, amount, aToken, reason, attestationHash);
        } else {
            emit DepositQuarantined(depositId, sender, amount, reason, attestationHash);
        }
    }

    function getPolicy() external view returns (Policy memory) {
        return _policy;
    }

    function isGroupAllowed(bytes32 group) external view returns (bool) {
        return allowedGroups[group];
    }
}
