// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./EncryptedPayroll.sol";

/// @title IncomeOracle
/// @notice Threshold proof-of-income attestations sourced from EncryptedPayroll streams.
contract IncomeOracle {
    enum Tier {
        None,
        C,
        B,
        A
    }

    struct Attestation {
        bool meets;
        Tier tier;
        bytes32 attestationId;
    }

    EncryptedPayroll public immutable payroll;

    event Attested(
        address indexed employee,
        bytes32 indexed streamId,
        uint256 lookbackDays,
        bool meets,
        Tier tier,
        bytes32 attestationId
    );

    error InvalidLookback();

    constructor(EncryptedPayroll _payroll) {
        payroll = _payroll;
    }

    function attestMonthlyIncome(
        address employer,
        address employee,
        uint256 encThreshold,
        uint256 lookbackDays
    ) external returns (Attestation memory) {
        if (lookbackDays == 0) revert InvalidLookback();
        bytes32 streamId = payroll.computeStreamId(employer, employee);
        uint256 projected = payroll.projectedIncome(streamId, lookbackDays);
        bool meets = projected >= encThreshold;
        Tier tier = _calculateTier(projected, encThreshold);
        bytes32 attestationId = keccak256(
            abi.encode(streamId, employee, lookbackDays, projected, encThreshold, block.timestamp, msg.sender)
        );

        emit Attested(employee, streamId, lookbackDays, meets, tier, attestationId);
        return Attestation({ meets: meets, tier: tier, attestationId: attestationId });
    }

    function _calculateTier(uint256 projected, uint256 threshold) internal pure returns (Tier) {
        if (projected < threshold || threshold == 0) {
            return Tier.None;
        }
        if (projected >= threshold * 2) {
            return Tier.A;
        }
        if (projected >= (threshold * 11) / 10) {
            return Tier.B;
        }
        return Tier.C;
    }
}
