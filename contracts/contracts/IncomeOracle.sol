// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint64, euint128, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./EncryptedPayroll.sol";
import {IConfidentialLockupRecipient} from "./interfaces/IConfidentialLockupRecipient.sol";
import {FHESafeMath} from "../lib/confidential/utils/FHESafeMath.sol";

/// @title IncomeOracle
/// @notice Threshold proof-of-income attestations sourced from EncryptedPayroll streams.
contract IncomeOracle is ZamaEthereumConfig, IConfidentialLockupRecipient {
    enum Tier {
        None,
        C,
        B,
        A
    }

    struct EncryptedAttestation {
        euint8 meetsFlag;
        euint8 tier;
        bytes32 attestationId;
    }

    EncryptedPayroll public immutable payroll;

    mapping(bytes32 streamKey => euint64 paid) private _paidAmount;
    mapping(bytes32 streamKey => euint128 outstanding) private _outstandingOnCancel;
    mapping(bytes32 streamKey => uint64 timestamp) public lastPaymentTimestamp;
    mapping(bytes32 streamKey => uint64 timestamp) public lastCancellationTimestamp;

    event PaidAmountUpdated(bytes32 indexed streamKey, uint256 indexed streamId, bytes32 amountHandle);
    event OutstandingRecorded(bytes32 indexed streamKey, uint256 indexed streamId, bytes32 recipientAmountHandle);

    error UnauthorizedHookCaller();

    event Attested(
        address indexed employee,
        bytes32 indexed streamId,
        uint256 lookbackDays,
        bytes32 meetsHandle,
        bytes32 tierHandle,
        bytes32 attestationId
    );

    error InvalidLookback();

    /// @param _payroll The EncryptedPayroll contract this oracle hooks into.
    constructor(EncryptedPayroll _payroll) {
        payroll = _payroll;
    }

    /// @notice Hook callback invoked by EncryptedPayroll when a withdrawal occurs on a hooked stream.
    /// @dev Tracks cumulative paid amounts per stream for use in income attestations.
    /// @param streamId The numeric stream id being withdrawn from.
    /// @param caller The address that triggered the withdrawal.
    /// @param to The destination address for the withdrawn funds.
    /// @param amountHandle The FHE handle for the withdrawn encrypted amount.
    /// @return The selector confirming the hook accepted the withdrawal.
    function onConfidentialLockupWithdraw(
        uint256 streamId,
        address caller,
        address to,
        bytes32 amountHandle
    ) external override returns (bytes4) {
        if (msg.sender != address(payroll)) revert UnauthorizedHookCaller();

        bytes32 streamKey = payroll.streamKeyFor(streamId);
        euint128 amount = _asEuint128(amountHandle);
        euint64 addition = FHE.asEuint64(amount);
        euint64 current = _loadPaid(streamKey);
        (, euint64 updated) = FHESafeMath.tryIncrease(current, addition);

        _storePaid(streamKey, updated);
        lastPaymentTimestamp[streamKey] = uint64(block.timestamp);

        (address employerAddr, address employee, , , , , ) = payroll.getStream(streamKey);

        euint128 updated128 = FHE.asEuint128(updated);

        FHE.allowThis(updated128);
        FHE.allow(updated128, employee);
        FHE.allow(updated128, employerAddr);
        FHE.allow(updated128, caller);
        FHE.allow(updated128, to);

        emit PaidAmountUpdated(streamKey, streamId, euint128.unwrap(updated128));
        return IConfidentialLockupRecipient.onConfidentialLockupWithdraw.selector;
    }

    /// @notice Hook callback invoked by EncryptedPayroll when a hooked stream is cancelled.
    /// @dev Records the outstanding encrypted balance at cancellation time.
    /// @param streamId The numeric stream id being cancelled.
    /// @param caller The address that triggered the cancellation.
    /// @param recipientAmountHandle The FHE handle for the outstanding encrypted balance owed to the employee.
    /// @return The selector confirming the hook accepted the cancellation.
    function onConfidentialLockupCancel(
        uint256 streamId,
        address caller,
        bytes32 /*senderAmountHandle*/,
        bytes32 recipientAmountHandle
    ) external override returns (bytes4) {
        if (msg.sender != address(payroll)) revert UnauthorizedHookCaller();

        bytes32 streamKey = payroll.streamKeyFor(streamId);
        euint128 outstanding = _asEuint128(recipientAmountHandle);

        _outstandingOnCancel[streamKey] = outstanding;
        lastCancellationTimestamp[streamKey] = uint64(block.timestamp);

        (address employerAddr, address employee, , , , , ) = payroll.getStream(streamKey);

        FHE.allowThis(outstanding);
        FHE.allow(outstanding, employee);
        FHE.allow(outstanding, employerAddr);
        FHE.allow(outstanding, caller);

        emit OutstandingRecorded(streamKey, streamId, euint128.unwrap(outstanding));
        return IConfidentialLockupRecipient.onConfidentialLockupCancel.selector;
    }

    /// @notice Returns the cumulative encrypted paid amount for a stream and grants transient access.
    /// @param streamKey The unique stream identifier.
    /// @return The cumulative paid amount as euint128.
    function encryptedPaidAmount(bytes32 streamKey) external returns (euint128) {
        euint64 paid = _loadPaid(streamKey);
        FHE.allowThis(paid);
        euint128 paid128 = FHE.asEuint128(paid);
        FHE.allowThis(paid128);
        return FHE.allowTransient(paid128, msg.sender);
    }

    /// @notice Returns the encrypted outstanding balance recorded at stream cancellation.
    /// @param streamKey The unique stream identifier.
    /// @return The outstanding balance at cancellation as euint128.
    function encryptedOutstandingOnCancel(bytes32 streamKey) external returns (euint128) {
        euint128 outstanding = _loadOutstanding(streamKey);
        FHE.allowThis(outstanding);
        return FHE.allowTransient(outstanding, msg.sender);
    }

    /// @notice Generates an encrypted proof-of-income attestation against a threshold over a lookback window.
    /// @dev Compares projected income from the stream against the provided encrypted threshold.
    ///      Assigns a tier (None, C, B, A) based on how much the income exceeds the threshold.
    /// @param employer The employer address of the stream.
    /// @param employee The employee address of the stream.
    /// @param encThreshold The encrypted income threshold to compare against.
    /// @param thresholdProof The FHE proof for the encrypted threshold.
    /// @param lookbackDays The number of days to project income over.
    /// @return An EncryptedAttestation containing the meets flag, tier, and attestation id.
    function attestMonthlyIncome(
        address employer,
        address employee,
        externalEuint128 encThreshold,
        bytes calldata thresholdProof,
        uint256 lookbackDays
    ) external returns (EncryptedAttestation memory) {
        if (lookbackDays == 0) revert InvalidLookback();

        bytes32 streamId = payroll.computeStreamId(employer, employee);

        euint128 projected = payroll.projectedIncome(streamId, lookbackDays);
        FHE.allowThis(projected);

        euint128 threshold = FHE.fromExternal(encThreshold, thresholdProof);
        FHE.allowThis(threshold);

        ebool meets = FHE.ge(projected, threshold);
        euint8 tierValue = _determineTier(projected, threshold);

        // Allow decryptions for verifier (msg.sender)
        euint8 meetsFlag = FHE.asEuint8(meets);
        FHE.allowThis(meetsFlag);
        meetsFlag = FHE.allow(meetsFlag, msg.sender);
        FHE.allowThis(tierValue);
        tierValue = FHE.allow(tierValue, msg.sender);

        bytes32 attestationId = keccak256(
            abi.encode(streamId, employee, lookbackDays, euint128.unwrap(projected), euint128.unwrap(threshold), block.timestamp, msg.sender)
        );

        emit Attested(
            employee,
            streamId,
            lookbackDays,
            euint8.unwrap(meetsFlag),
            euint8.unwrap(tierValue),
            attestationId
        );

        return EncryptedAttestation({ meetsFlag: meetsFlag, tier: tierValue, attestationId: attestationId });
    }

    function _determineTier(euint128 projected, euint128 threshold) internal returns (euint8) {
        euint8 tierValue = FHE.mul(
            FHE.asEuint8(FHE.ge(projected, threshold)),
            FHE.asEuint8(uint8(Tier.C))
        );

        euint128 thresholdOnePointOne = FHE.div(FHE.mul(threshold, uint128(11)), uint128(10));
        euint8 bonusB = FHE.asEuint8(uint8(Tier.B) - uint8(Tier.C));
        tierValue = FHE.add(
            tierValue,
            FHE.mul(FHE.asEuint8(FHE.ge(projected, thresholdOnePointOne)), bonusB)
        );

        euint128 thresholdTwoX = FHE.mul(threshold, uint128(2));
        euint8 bonusA = FHE.asEuint8(uint8(Tier.A) - uint8(Tier.B));
        tierValue = FHE.add(
            tierValue,
            FHE.mul(FHE.asEuint8(FHE.ge(projected, thresholdTwoX)), bonusA)
        );

        return tierValue;
    }

    function _asEuint128(bytes32 handle) private returns (euint128) {
        if (handle == bytes32(0)) {
            return FHE.asEuint128(uint128(0));
        }
        return euint128.wrap(handle);
    }

    function _loadPaid(bytes32 streamKey) private returns (euint64) {
        euint64 value = _paidAmount[streamKey];
        if (!FHE.isInitialized(value)) {
            return FHE.asEuint64(uint64(0));
        }
        return value;
    }

    function _loadOutstanding(bytes32 streamKey) private returns (euint128) {
        euint128 value = _outstandingOnCancel[streamKey];
        if (!FHE.isInitialized(value)) {
            return FHE.asEuint128(uint128(0));
        }
        return value;
    }

    function _storePaid(bytes32 streamKey, euint64 value) private {
        FHE.allowThis(value);
        _paidAmount[streamKey] = value;
    }
}
