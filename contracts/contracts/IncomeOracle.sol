// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint128, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./EncryptedPayroll.sol";

/// @title IncomeOracle
/// @notice Threshold proof-of-income attestations sourced from EncryptedPayroll streams.
contract IncomeOracle is SepoliaConfig {
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

    event Attested(
        address indexed employee,
        bytes32 indexed streamId,
        uint256 lookbackDays,
        bytes32 meetsHandle,
        bytes32 tierHandle,
        bytes32 attestationId
    );

    error InvalidLookback();

    constructor(EncryptedPayroll _payroll) {
        payroll = _payroll;
    }

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
}
