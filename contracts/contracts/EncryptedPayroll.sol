// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, euint128, externalEuint64, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedPayroll
/// @notice Confidential payroll stream manager built on Zama's fhEVM.
contract EncryptedPayroll is SepoliaConfig {
    enum StreamStatus {
        None,
        Active,
        Paused,
        Cancelled
    }

    struct Stream {
        address employer;
        address employee;
        euint64 ratePerSecond;
        uint64 startTime;
        uint32 cadenceInSeconds;
        StreamStatus status;
        euint128 accrued;
        uint64 lastAccruedAt;
    }

    mapping(bytes32 => Stream) private streams;

    event StreamCreated(
        bytes32 indexed streamId,
        address indexed employer,
        address indexed employee,
        bytes32 rateHandle,
        uint32 cadenceInSeconds,
        uint64 startTime
    );

    event StreamToppedUp(bytes32 indexed streamId, bytes32 amountHandle);
    event StreamPaused(bytes32 indexed streamId);
    event StreamResumed(bytes32 indexed streamId);
    event StreamCancelled(bytes32 indexed streamId);

    error StreamAlreadyExists();
    error StreamNotFound();
    error NotEmployer();
    error InvalidEmployee();
    error InvalidRate();

    modifier streamExists(bytes32 streamId) {
        if (streams[streamId].status == StreamStatus.None) revert StreamNotFound();
        _;
    }

    modifier onlyEmployer(bytes32 streamId) {
        if (streams[streamId].employer != msg.sender) revert NotEmployer();
        _;
    }

    /// @notice Computes a deterministic stream id by employer + employee wallet.
    function computeStreamId(address employer, address employee) public pure returns (bytes32) {
        return keccak256(abi.encode(employer, employee));
    }

    /// @notice Create a new confidential payroll stream with encrypted per-second rate.
    function createStream(
        address employee,
        externalEuint64 encRatePerSecond,
        bytes calldata rateProof,
        uint32 cadenceInSeconds,
        uint64 startTime
    ) external returns (bytes32 streamId) {
        if (employee == address(0)) revert InvalidEmployee();

        streamId = computeStreamId(msg.sender, employee);
        Stream storage existing = streams[streamId];
        if (existing.status != StreamStatus.None) revert StreamAlreadyExists();

        euint64 rate = FHE.fromExternal(encRatePerSecond, rateProof);
        if (!FHE.isInitialized(rate)) revert InvalidRate();

        uint64 effectiveStart = startTime == 0 ? uint64(block.timestamp) : startTime;

        Stream storage stream = streams[streamId];
        stream.employer = msg.sender;
        stream.employee = employee;
        stream.ratePerSecond = rate;
        stream.startTime = effectiveStart;
        stream.cadenceInSeconds = cadenceInSeconds;
        stream.status = StreamStatus.Active;
        stream.accrued = FHE.asEuint128(uint128(0));
        stream.lastAccruedAt = uint64(block.timestamp);

        FHE.allowThis(stream.ratePerSecond);
        FHE.allow(stream.ratePerSecond, msg.sender);
        FHE.allow(stream.ratePerSecond, employee);

        FHE.allowThis(stream.accrued);
        FHE.allow(stream.accrued, msg.sender);
        FHE.allow(stream.accrued, employee);

        emit StreamCreated(
            streamId,
            msg.sender,
            employee,
            euint64.unwrap(stream.ratePerSecond),
            cadenceInSeconds,
            effectiveStart
        );
    }

    /// @notice Accrues encrypted balance based on elapsed time since last update.
    function syncStream(bytes32 streamId) public streamExists(streamId) {
        Stream storage stream = streams[streamId];
        if (stream.status != StreamStatus.Active) {
            stream.lastAccruedAt = uint64(block.timestamp);
            return;
        }
        if (block.timestamp <= stream.lastAccruedAt) {
            return;
        }

        uint256 elapsedSeconds = block.timestamp - stream.lastAccruedAt;
        euint64 elapsedEnc = FHE.asEuint64(uint64(elapsedSeconds));

        euint64 rate = stream.ratePerSecond;
        FHE.allowThis(rate);
        euint64 increment64 = FHE.mul(rate, elapsedEnc);
        euint128 increment = FHE.asEuint128(increment64);

        stream.accrued = FHE.add(stream.accrued, increment);

        FHE.allowThis(stream.accrued);
        FHE.allow(stream.accrued, stream.employee);
        FHE.allow(stream.accrued, stream.employer);

        stream.lastAccruedAt = uint64(block.timestamp);
    }

    /// @notice Adds an encrypted top-up amount (e.g. bonus or manual adjustment).
    function topUp(
        bytes32 streamId,
        externalEuint128 encAmount,
        bytes calldata amountProof
    ) external streamExists(streamId) onlyEmployer(streamId) {
        syncStream(streamId);
        Stream storage stream = streams[streamId];
        euint128 addition = FHE.fromExternal(encAmount, amountProof);

        stream.accrued = FHE.add(stream.accrued, addition);
        FHE.allowThis(stream.accrued);
        FHE.allow(stream.accrued, stream.employee);
        FHE.allow(stream.accrued, stream.employer);

        emit StreamToppedUp(streamId, euint128.unwrap(addition));
    }

    function pauseStream(bytes32 streamId) external streamExists(streamId) onlyEmployer(streamId) {
        Stream storage stream = streams[streamId];
        syncStream(streamId);
        if (stream.status == StreamStatus.Active) {
            stream.status = StreamStatus.Paused;
            emit StreamPaused(streamId);
        }
    }

    function resumeStream(bytes32 streamId) external streamExists(streamId) onlyEmployer(streamId) {
      Stream storage stream = streams[streamId];
        if (stream.status == StreamStatus.Paused) {
            stream.status = StreamStatus.Active;
            stream.lastAccruedAt = uint64(block.timestamp);
            emit StreamResumed(streamId);
        }
    }

    function cancelStream(bytes32 streamId) external streamExists(streamId) onlyEmployer(streamId) {
        Stream storage stream = streams[streamId];
        syncStream(streamId);
        stream.status = StreamStatus.Cancelled;
        emit StreamCancelled(streamId);
    }

    /// @notice Returns the encrypted balance for a stream and grants transient access to the caller.
    function encryptedBalanceOf(bytes32 streamId) public streamExists(streamId) returns (euint128) {
        Stream storage stream = streams[streamId];
        euint128 allowed = FHE.allowTransient(stream.accrued, msg.sender);
        return allowed;
    }

    /// @notice Returns projected encrypted income over a lookback window (in days) and grants transient access.
    function projectedIncome(bytes32 streamId, uint256 lookbackDays) public streamExists(streamId) returns (euint128) {
        Stream storage stream = streams[streamId];
        if (stream.status == StreamStatus.Cancelled) {
            euint128 zero = FHE.allowTransient(FHE.asEuint128(uint128(0)), msg.sender);
            return zero;
        }
        euint64 rate = stream.ratePerSecond;
        FHE.allowThis(rate);

        uint256 secondsWindow = lookbackDays * 1 days;
        euint64 windowEnc = FHE.asEuint64(uint64(secondsWindow));
        euint64 total64 = FHE.mul(rate, windowEnc);
        euint128 total128 = FHE.asEuint128(total64);

        euint128 allowed = FHE.allowTransient(total128, msg.sender);
        return allowed;
    }

    /// @notice View helper returning metadata (does not mutate encrypted values).
    function getStream(bytes32 streamId)
        external
        view
        streamExists(streamId)
        returns (
            address employer,
            address employee,
            bytes32 rateHandle,
            uint32 cadenceInSeconds,
            StreamStatus status,
            uint64 startTime,
            uint64 lastAccruedAt
        )
    {
        Stream storage stream = streams[streamId];
        return (
            stream.employer,
            stream.employee,
            euint64.unwrap(stream.ratePerSecond),
            stream.cadenceInSeconds,
            stream.status,
            stream.startTime,
            stream.lastAccruedAt
        );
    }
}
