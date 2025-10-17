// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EncryptedPayroll
/// @notice Simplified confidential payroll stream manager for fhEVM demos.
contract EncryptedPayroll {
    enum StreamStatus {
        None,
        Active,
        Paused,
        Cancelled
    }

    struct Stream {
        address employer;
        address employee;
        uint256 encRatePerSecond;
        uint64 startTime;
        uint32 cadenceInSeconds;
        StreamStatus status;
        uint256 encAccrued;
        uint64 lastAccruedAt;
    }

    mapping(bytes32 => Stream) private streams;

    event StreamCreated(
        bytes32 indexed streamId,
        address indexed employer,
        address indexed employee,
        uint256 encRatePerSecond,
        uint32 cadenceInSeconds,
        uint64 startTime
    );

    event StreamToppedUp(bytes32 indexed streamId, uint256 encAmount);
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

    /// @notice Create a new confidential payroll stream.
    function createStream(
        address employee,
        uint256 encRatePerSecond,
        uint32 cadenceInSeconds,
        uint64 startTime
    ) external returns (bytes32 streamId) {
        if (employee == address(0)) revert InvalidEmployee();
        if (encRatePerSecond == 0) revert InvalidRate();

        streamId = computeStreamId(msg.sender, employee);
        Stream storage existing = streams[streamId];
        if (existing.status != StreamStatus.None) revert StreamAlreadyExists();

        uint64 start = startTime == 0 ? uint64(block.timestamp) : startTime;
        streams[streamId] = Stream({
            employer: msg.sender,
            employee: employee,
            encRatePerSecond: encRatePerSecond,
            startTime: start,
            cadenceInSeconds: cadenceInSeconds,
            status: StreamStatus.Active,
            encAccrued: 0,
            lastAccruedAt: uint64(block.timestamp)
        });

        emit StreamCreated(streamId, msg.sender, employee, encRatePerSecond, cadenceInSeconds, start);
    }

    /// @notice Accrues encrypted balance based on elapsed time.
    function syncStream(bytes32 streamId) public streamExists(streamId) {
        Stream storage stream = streams[streamId];
        if (stream.status != StreamStatus.Active) {
            stream.lastAccruedAt = uint64(block.timestamp);
            return;
        }
        if (block.timestamp <= stream.lastAccruedAt) {
            return;
        }
        uint256 elapsed = block.timestamp - stream.lastAccruedAt;
        uint256 increment = elapsed * stream.encRatePerSecond;
        stream.encAccrued += increment;
        stream.lastAccruedAt = uint64(block.timestamp);
    }

    /// @notice Adds an encrypted top-up amount (e.g. bonus or manual adjustment).
    function topUp(bytes32 streamId, uint256 encAmount) external streamExists(streamId) onlyEmployer(streamId) {
        syncStream(streamId);
        streams[streamId].encAccrued += encAmount;
        emit StreamToppedUp(streamId, encAmount);
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

    /// @notice Returns ciphertext balance (includes accrued time delta) for a stream.
    function encryptedBalanceOf(bytes32 streamId) public view streamExists(streamId) returns (uint256) {
        Stream storage stream = streams[streamId];
        uint256 balance = stream.encAccrued;
        if (stream.status == StreamStatus.Active && block.timestamp > stream.lastAccruedAt) {
            uint256 elapsed = block.timestamp - stream.lastAccruedAt;
            balance += elapsed * stream.encRatePerSecond;
        }
        return balance;
    }

    /// @notice Project encrypted income for a lookback window.
    function projectedIncome(bytes32 streamId, uint256 lookbackDays) public view streamExists(streamId) returns (uint256) {
        Stream storage stream = streams[streamId];
        if (stream.status == StreamStatus.Cancelled) {
            return 0;
        }
        uint256 secondsWindow = lookbackDays * 1 days;
        return stream.encRatePerSecond * secondsWindow;
    }

    /// @notice Returns stream metadata for UI/analytics.
    function getStream(bytes32 streamId)
        external
        view
        streamExists(streamId)
        returns (
            address employer,
            address employee,
            uint256 encRatePerSecond,
            uint32 cadenceInSeconds,
            StreamStatus status,
            uint256 encAccrued,
            uint64 lastAccruedAt
        )
    {
        Stream storage stream = streams[streamId];
        return (
            stream.employer,
            stream.employee,
            stream.encRatePerSecond,
            stream.cadenceInSeconds,
            stream.status,
            encryptedBalanceOf(streamId),
            stream.lastAccruedAt
        );
    }
}
