// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint128, externalEuint64, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {EncryptedPayroll} from "./EncryptedPayroll.sol";

/// @title BatchPayroll
/// @notice Batch operations wrapper for EncryptedPayroll - enables enterprise-scale payroll management.
/// @dev Delegates to EncryptedPayroll for individual stream operations. All FHE operations
///      run through the underlying payroll contract.
contract BatchPayroll is ZamaEthereumConfig {
    /// @notice The EncryptedPayroll contract that this batch wrapper delegates to.
    EncryptedPayroll public immutable payroll;

    /// @notice Parameters for creating a single stream within a batch.
    /// @param employee The address of the employee receiving the stream.
    /// @param encRatePerSecond The encrypted per-second pay rate.
    /// @param rateProof The FHE proof for the encrypted rate.
    /// @param cadenceInSeconds The payout cadence interval in seconds.
    /// @param startTime The stream start timestamp (0 uses block.timestamp).
    struct CreateStreamParams {
        address employee;
        externalEuint64 encRatePerSecond;
        bytes rateProof;
        uint32 cadenceInSeconds;
        uint64 startTime;
    }

    /// @notice Parameters for topping up a single stream within a batch.
    /// @param streamKey The unique identifier of the stream to top up.
    /// @param encAmount The encrypted top-up amount.
    /// @param amountProof The FHE proof for the encrypted amount.
    struct TopUpParams {
        bytes32 streamKey;
        externalEuint128 encAmount;
        bytes amountProof;
    }

    /// @notice Emitted when a batch of streams is created.
    /// @param count The number of streams created in the batch.
    event BatchStreamsCreated(uint256 count);

    /// @notice Emitted when a batch of top-ups is processed.
    /// @param count The number of streams topped up in the batch.
    event BatchToppedUp(uint256 count);

    /// @notice Emitted when a batch of stream syncs is processed.
    /// @param count The number of streams synced in the batch.
    event BatchSynced(uint256 count);

    /// @notice Thrown when an empty batch array is provided.
    error EmptyBatch();

    /// @param _payroll The EncryptedPayroll contract to delegate operations to.
    constructor(EncryptedPayroll _payroll) {
        payroll = _payroll;
    }

    /// @notice Creates multiple payroll streams in a single transaction.
    /// @dev Caller must be the employer for all created streams. Each stream key is derived
    ///      from (msg.sender, employee) and must not already exist.
    /// @param params Array of CreateStreamParams, one per stream to create.
    /// @return streamKeys Array of the created stream keys in the same order as the input.
    function batchCreateStreams(CreateStreamParams[] calldata params)
        external
        returns (bytes32[] memory streamKeys)
    {
        if (params.length == 0) revert EmptyBatch();

        streamKeys = new bytes32[](params.length);
        for (uint256 i = 0; i < params.length; i++) {
            streamKeys[i] = payroll.createStream(
                params[i].employee,
                params[i].encRatePerSecond,
                params[i].rateProof,
                params[i].cadenceInSeconds,
                params[i].startTime
            );
        }

        emit BatchStreamsCreated(params.length);
    }

    /// @notice Tops up multiple payroll streams in a single transaction.
    /// @dev Caller must be the employer for each stream. The confidential token transfer
    ///      is performed for each stream individually through the payroll contract.
    /// @param params Array of TopUpParams, one per stream to top up.
    function batchTopUp(TopUpParams[] calldata params) external {
        if (params.length == 0) revert EmptyBatch();

        for (uint256 i = 0; i < params.length; i++) {
            payroll.topUp(
                params[i].streamKey,
                params[i].encAmount,
                params[i].amountProof
            );
        }

        emit BatchToppedUp(params.length);
    }

    /// @notice Syncs accrued balances for multiple streams in a single transaction.
    /// @dev Can be called by anyone. Each stream's accrued balance is updated based on
    ///      elapsed time since the last sync.
    /// @param streamKeys Array of stream keys to sync.
    function batchSyncStreams(bytes32[] calldata streamKeys) external {
        if (streamKeys.length == 0) revert EmptyBatch();

        for (uint256 i = 0; i < streamKeys.length; i++) {
            payroll.syncStream(streamKeys[i]);
        }

        emit BatchSynced(streamKeys.length);
    }
}
