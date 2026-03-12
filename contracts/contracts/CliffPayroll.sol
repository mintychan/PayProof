// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {EncryptedPayroll} from "./EncryptedPayroll.sol";

/// @title CliffPayroll
/// @notice Cliff period registry for EncryptedPayroll streams.
/// @dev Employers register cliff periods after creating streams via EncryptedPayroll.
///      The cliff blocks withdrawals (enforced at the UI/integration layer) until the
///      cliff timestamp passes. Stream balances continue accruing under encryption
///      during the cliff period, preserving privacy of the accrual amounts.
///
///      Design rationale: EncryptedPayroll.createStream uses msg.sender as employer and
///      withdrawMax uses msg.sender for authorization, so a wrapper contract cannot proxy
///      these calls. Instead, CliffPayroll acts as a companion registry that tracks cliff
///      metadata. Integrators (frontends, bots, other contracts) query isCliffReached()
///      before invoking withdrawMax on the payroll contract directly.
contract CliffPayroll is ZamaEthereumConfig {
    EncryptedPayroll public immutable payroll;

    /// @notice Cliff configuration for a single stream.
    /// @param cliffEnd Absolute timestamp when the cliff period ends.
    /// @param active Whether a cliff has been registered for this stream.
    struct CliffConfig {
        uint64 cliffEnd;
        bool active;
    }

    /// @notice Cliff configs keyed by EncryptedPayroll stream key (bytes32).
    mapping(bytes32 => CliffConfig) public cliffs;

    /// @notice Emitted when a cliff is registered for a stream.
    /// @param streamKey The EncryptedPayroll stream key.
    /// @param cliffEnd The absolute timestamp when the cliff ends.
    event CliffRegistered(bytes32 indexed streamKey, uint64 cliffEnd);

    /// @notice The cliff period has not yet elapsed for this stream.
    error CliffNotReached();

    /// @notice The caller is not the employer of the referenced stream.
    error NotStreamEmployer();

    /// @notice A cliff has already been registered for this stream.
    error CliffAlreadyRegistered();

    /// @notice The cliff duration must be greater than zero.
    error InvalidCliffDuration();

    /// @param _payroll The deployed EncryptedPayroll contract to companion with.
    constructor(EncryptedPayroll _payroll) {
        payroll = _payroll;
    }

    /// @notice Register a cliff period for an existing EncryptedPayroll stream.
    /// @dev Only the stream's employer (as stored in EncryptedPayroll) may register a cliff.
    ///      A cliff can only be registered once per stream to prevent manipulation.
    /// @param streamKey The EncryptedPayroll stream key (from computeStreamId).
    /// @param cliffDuration Duration in seconds from the current block timestamp.
    function registerCliff(bytes32 streamKey, uint64 cliffDuration) external {
        if (cliffDuration == 0) revert InvalidCliffDuration();

        (address employer,,,,,,) = payroll.getStream(streamKey);
        if (msg.sender != employer) revert NotStreamEmployer();
        if (cliffs[streamKey].active) revert CliffAlreadyRegistered();

        uint64 cliffEnd = uint64(block.timestamp) + cliffDuration;
        cliffs[streamKey] = CliffConfig({cliffEnd: cliffEnd, active: true});

        emit CliffRegistered(streamKey, cliffEnd);
    }

    /// @notice Check whether the cliff period has passed for a stream.
    /// @dev Returns true if no cliff is registered (no cliff = always withdrawable).
    /// @param streamKey The EncryptedPayroll stream key.
    /// @return True if the cliff has been reached or no cliff exists.
    function isCliffReached(bytes32 streamKey) public view returns (bool) {
        CliffConfig memory config = cliffs[streamKey];
        if (!config.active) return true; // No cliff configured = always withdrawable
        return block.timestamp >= config.cliffEnd;
    }

    /// @notice Get the absolute cliff end timestamp for a stream.
    /// @param streamKey The EncryptedPayroll stream key.
    /// @return The cliff end timestamp (0 if no cliff registered).
    function getCliffEnd(bytes32 streamKey) external view returns (uint64) {
        return cliffs[streamKey].cliffEnd;
    }

    /// @notice Check whether a cliff is actively configured for a stream.
    /// @param streamKey The EncryptedPayroll stream key.
    /// @return True if a cliff has been registered.
    function hasCliff(bytes32 streamKey) external view returns (bool) {
        return cliffs[streamKey].active;
    }

    /// @notice Get remaining seconds until cliff is reached.
    /// @param streamKey The EncryptedPayroll stream key.
    /// @return Seconds remaining (0 if cliff already passed or not configured).
    function remainingCliffTime(bytes32 streamKey) external view returns (uint64) {
        CliffConfig memory config = cliffs[streamKey];
        if (!config.active || block.timestamp >= config.cliffEnd) return 0;
        return config.cliffEnd - uint64(block.timestamp);
    }
}
