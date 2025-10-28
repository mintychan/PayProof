// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, euint128, externalEuint64, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

import {IConfidentialLockupRecipient} from "./interfaces/IConfidentialLockupRecipient.sol";

/// @title EncryptedPayroll
/// @notice Confidential payroll stream manager built on Zama's fhEVM.
/// @dev Refactored to mirror Sablier-style lockup semantics while keeping stream balances encrypted.
contract EncryptedPayroll is SepoliaConfig, ERC721Enumerable {
    enum StreamStatus {
        None,
        Active,
        Paused,
        Cancelled,
        Settled
    }

    struct Stream {
        uint256 numericId;
        address employer;
        address employee;
        euint64 ratePerSecond;
        uint64 startTime;
        uint32 cadenceInSeconds;
        StreamStatus status;
        euint128 accrued; // streaming-driven accruals
        euint128 buffered; // manual top-ups
        euint128 withdrawn; // total withdrawn volume
        uint64 lastAccruedAt;
        bool cancelable;
        bool transferable;
        address hook;
    }

    uint256 private nextStreamId = 1;
    address public admin;

    mapping(bytes32 => Stream) private streams;
    mapping(uint256 => bytes32) private streamKeyById;
    mapping(address => bool) private hookAllowlist;

    event StreamCreated(
        bytes32 indexed streamKey,
        uint256 indexed streamId,
        address indexed employer,
        address employee,
        bytes32 rateHandle,
        uint32 cadenceInSeconds,
        uint64 startTime
    );

    event StreamToppedUp(bytes32 indexed streamKey, bytes32 amountHandle);
    event StreamPaused(bytes32 indexed streamKey);
    event StreamResumed(bytes32 indexed streamKey);
    event StreamCancelled(bytes32 indexed streamKey);
    event StreamSettled(bytes32 indexed streamKey);
    event StreamWithdrawn(bytes32 indexed streamKey, uint256 indexed streamId, address indexed caller, address to, bytes32 amountHandle);
    event StreamConfigured(bytes32 indexed streamKey, bool cancelable, bool transferable);
    event HookAllowed(address indexed hook, bool allowed);
    event StreamHookUpdated(bytes32 indexed streamKey, address indexed previousHook, address indexed newHook);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    error StreamAlreadyExists();
    error StreamNotFound();
    error NotEmployer();
    error NotAuthorized();
    error InvalidEmployee();
    error InvalidRate();
    error StreamNotCancelable();
    error HookNotAllowlisted();
    error StreamNotTransferable();

    modifier streamExists(bytes32 streamKey) {
        if (streams[streamKey].status == StreamStatus.None) revert StreamNotFound();
        _;
    }

    modifier onlyEmployer(bytes32 streamKey) {
        if (streams[streamKey].employer != msg.sender) revert NotEmployer();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAuthorized();
        _;
    }

    constructor() ERC721("PayProof Stream", "PAYSTREAM") {
        admin = msg.sender;
    }

    /// @notice Computes a deterministic stream id by employer + employee wallet.
    function computeStreamId(address employer, address employee) public pure returns (bytes32) {
        return keccak256(abi.encode(employer, employee));
    }

    /// @notice Lookup the internal numeric stream id for a given stream key.
    function streamIdFor(bytes32 streamKey) external view streamExists(streamKey) returns (uint256) {
        return streams[streamKey].numericId;
    }

    /// @notice Lookup the stream key for a numeric stream id.
    function streamKeyFor(uint256 streamId) external view returns (bytes32) {
        bytes32 key = streamKeyById[streamId];
        if (streams[key].status == StreamStatus.None) revert StreamNotFound();
        return key;
    }

    /// @notice Exposes additional stream configuration parameters and encrypted balances.
    function getStreamConfig(bytes32 streamKey)
        external
        view
        streamExists(streamKey)
        returns (
            uint256 streamId,
            bool cancelable,
            bool transferable,
            address hook,
            bytes32 bufferedHandle,
            bytes32 withdrawnHandle
        )
    {
        Stream storage stream = streams[streamKey];
        return (
            stream.numericId,
            stream.cancelable,
            stream.transferable,
            stream.hook,
            euint128.unwrap(stream.buffered),
            euint128.unwrap(stream.withdrawn)
        );
    }

    /// @notice Create a new confidential payroll stream with encrypted per-second rate.
    function createStream(
        address employee,
        externalEuint64 encRatePerSecond,
        bytes calldata rateProof,
        uint32 cadenceInSeconds,
        uint64 startTime
    ) external returns (bytes32 streamKey) {
        if (employee == address(0)) revert InvalidEmployee();

        streamKey = computeStreamId(msg.sender, employee);
        Stream storage existing = streams[streamKey];
        if (existing.status != StreamStatus.None) revert StreamAlreadyExists();

        euint64 rate = FHE.fromExternal(encRatePerSecond, rateProof);
        if (!FHE.isInitialized(rate)) revert InvalidRate();

        uint64 effectiveStart = startTime == 0 ? uint64(block.timestamp) : startTime;

        Stream storage stream = streams[streamKey];
        uint256 streamId = nextStreamId++;

        stream.numericId = streamId;
        stream.employer = msg.sender;
        stream.employee = employee;
        stream.ratePerSecond = rate;
        stream.startTime = effectiveStart;
        stream.cadenceInSeconds = cadenceInSeconds;
        stream.status = StreamStatus.Active;
        stream.accrued = FHE.asEuint128(uint128(0));
        stream.buffered = FHE.asEuint128(uint128(0));
        stream.withdrawn = FHE.asEuint128(uint128(0));
        stream.lastAccruedAt = uint64(block.timestamp);
        stream.cancelable = true;
        stream.transferable = true;
        stream.hook = address(0);

        streamKeyById[streamId] = streamKey;

        FHE.allowThis(stream.ratePerSecond);
        FHE.allow(stream.ratePerSecond, msg.sender);
        FHE.allow(stream.ratePerSecond, employee);

        _safeMint(employee, streamId);

        _allowBalances(streamKey);

        emit StreamCreated(
            streamKey,
            streamId,
            msg.sender,
            employee,
            euint64.unwrap(stream.ratePerSecond),
            cadenceInSeconds,
            effectiveStart
        );
    }

    /// @notice Allows the admin to approve or revoke hook contracts.
    function allowHook(address hook, bool allowed) external onlyAdmin {
        hookAllowlist[hook] = allowed;
        emit HookAllowed(hook, allowed);
    }

    /// @notice Employer-level hook registration for automated accounting or vaults.
    function setStreamHook(bytes32 streamKey, address hook) external streamExists(streamKey) onlyEmployer(streamKey) {
        if (hook != address(0) && !hookAllowlist[hook]) revert HookNotAllowlisted();
        Stream storage stream = streams[streamKey];
        address previous = stream.hook;
        stream.hook = hook;
        emit StreamHookUpdated(streamKey, previous, hook);
    }

    /// @notice Employer can toggle cancelation/transferability semantics similar to Sablier streams.
    function configureStream(bytes32 streamKey, bool cancelable, bool transferable)
        external
        streamExists(streamKey)
        onlyEmployer(streamKey)
    {
        Stream storage stream = streams[streamKey];
        stream.cancelable = cancelable;
        stream.transferable = transferable;
        emit StreamConfigured(streamKey, cancelable, transferable);
    }

    /// @notice Transfer administrative control used for managing hook allowlists.
    function transferAdmin(address newAdmin) external onlyAdmin {
        address previous = admin;
        admin = newAdmin;
        emit AdminTransferred(previous, newAdmin);
    }

    /// @notice Accrues encrypted balance based on elapsed time since last update.
    function syncStream(bytes32 streamKey) public streamExists(streamKey) {
        Stream storage stream = streams[streamKey];
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

        _allowBalances(streamKey);

        stream.lastAccruedAt = uint64(block.timestamp);
    }

    /// @notice Adds an encrypted top-up amount (e.g. bonus or manual adjustment).
    function topUp(
        bytes32 streamKey,
        externalEuint128 encAmount,
        bytes calldata amountProof
    ) external streamExists(streamKey) onlyEmployer(streamKey) {
        syncStream(streamKey);
        Stream storage stream = streams[streamKey];
        euint128 addition = FHE.fromExternal(encAmount, amountProof);

        stream.buffered = FHE.add(stream.buffered, addition);

        _allowBalances(streamKey);

        emit StreamToppedUp(streamKey, euint128.unwrap(addition));
    }

    function pauseStream(bytes32 streamKey) external streamExists(streamKey) onlyEmployer(streamKey) {
        Stream storage stream = streams[streamKey];
        if (!stream.cancelable) revert StreamNotCancelable();
        syncStream(streamKey);
        if (stream.status == StreamStatus.Active) {
            stream.status = StreamStatus.Paused;
            emit StreamPaused(streamKey);
        }
    }

    function resumeStream(bytes32 streamKey) external streamExists(streamKey) onlyEmployer(streamKey) {
        Stream storage stream = streams[streamKey];
        if (stream.status == StreamStatus.Paused) {
            stream.status = StreamStatus.Active;
            stream.lastAccruedAt = uint64(block.timestamp);
            emit StreamResumed(streamKey);
        }
    }

    function cancelStream(bytes32 streamKey) external streamExists(streamKey) onlyEmployer(streamKey) {
        Stream storage stream = streams[streamKey];
        if (!stream.cancelable) revert StreamNotCancelable();
        syncStream(streamKey);
        stream.status = StreamStatus.Cancelled;
        stream.lastAccruedAt = uint64(block.timestamp);

        _notifyCancelHook(stream);
        emit StreamCancelled(streamKey);
    }

    /// @notice Settles the full encrypted balance (streamed + buffered) to the recipient.
    function withdrawMax(bytes32 streamKey, address to)
        external
        streamExists(streamKey)
    {
        Stream storage stream = streams[streamKey];
        StreamStatus statusBeforeWithdraw = stream.status;
        if (!_isAuthorizedWithdrawer(stream, msg.sender)) revert NotAuthorized();
        if (to == address(0)) revert NotAuthorized();

        syncStream(streamKey);

        euint128 totalAccrued = FHE.add(stream.accrued, stream.buffered);
        euint128 withdrawable = FHE.sub(totalAccrued, stream.withdrawn);

        stream.withdrawn = FHE.asEuint128(uint128(0));
        stream.accrued = FHE.asEuint128(uint128(0));
        stream.buffered = FHE.asEuint128(uint128(0));
        stream.lastAccruedAt = uint64(block.timestamp);

        if (statusBeforeWithdraw == StreamStatus.Cancelled && stream.status != StreamStatus.Settled) {
            stream.status = StreamStatus.Settled;
            emit StreamSettled(streamKey);
        }

        _allowBalances(streamKey);

        emit StreamWithdrawn(streamKey, stream.numericId, msg.sender, to, euint128.unwrap(withdrawable));
        _notifyWithdrawHook(stream, to, withdrawable);
    }

    /// @notice Returns the ERC-721 token id linked to a stream key.
    function streamTokenId(bytes32 streamKey) external view streamExists(streamKey) returns (uint256) {
        return streams[streamKey].numericId;
    }

    /// @notice Returns the current owner of the stream NFT.
    function streamOwner(bytes32 streamKey) external view streamExists(streamKey) returns (address) {
        uint256 tokenId = streams[streamKey].numericId;
        return ownerOf(tokenId);
    }

    /// @notice Returns the encrypted withdrawable balance for the caller and grants transient access.
    function encryptedBalanceOf(bytes32 streamKey) public streamExists(streamKey) returns (euint128) {
        Stream storage stream = streams[streamKey];
        euint128 totalAccrued = FHE.add(stream.accrued, stream.buffered);
        euint128 withdrawable = FHE.sub(totalAccrued, stream.withdrawn);
        FHE.allowThis(withdrawable);
        FHE.allow(withdrawable, stream.employee);
        FHE.allow(withdrawable, stream.employer);
        if (stream.hook != address(0)) {
            FHE.allow(withdrawable, stream.hook);
        }
        return FHE.allowTransient(withdrawable, msg.sender);
    }

    /// @notice Returns projected encrypted income over a lookback window (in days) and grants transient access.
    function projectedIncome(bytes32 streamKey, uint256 lookbackDays) public streamExists(streamKey) returns (euint128) {
        Stream storage stream = streams[streamKey];
        if (stream.status == StreamStatus.Cancelled || stream.status == StreamStatus.Settled) {
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
    function getStream(bytes32 streamKey)
        external
        view
        streamExists(streamKey)
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
        Stream storage stream = streams[streamKey];
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

    function _isAuthorizedWithdrawer(Stream storage stream, address caller) private view returns (bool) {
        if (caller == stream.employee || caller == stream.employer) {
            return true;
        }
        if (stream.hook != address(0) && caller == stream.hook) {
            return true;
        }
        return false;
    }

    function _allowBalances(bytes32 streamKey) private {
        Stream storage stream = streams[streamKey];

        FHE.allowThis(stream.accrued);
        FHE.allow(stream.accrued, stream.employee);
        FHE.allow(stream.accrued, stream.employer);

        FHE.allowThis(stream.buffered);
        FHE.allow(stream.buffered, stream.employee);
        FHE.allow(stream.buffered, stream.employer);

        FHE.allowThis(stream.withdrawn);
        FHE.allow(stream.withdrawn, stream.employee);
        FHE.allow(stream.withdrawn, stream.employer);

        if (stream.hook != address(0)) {
            FHE.allow(stream.accrued, stream.hook);
            FHE.allow(stream.buffered, stream.hook);
            FHE.allow(stream.withdrawn, stream.hook);
        }
    }

    function _notifyWithdrawHook(Stream storage stream, address to, euint128 amount) private {
        if (stream.hook == address(0)) {
            return;
        }

        bytes32 handle = euint128.unwrap(amount);
        FHE.allow(amount, stream.hook);
        bytes4 response = IConfidentialLockupRecipient(stream.hook).onConfidentialLockupWithdraw(
            stream.numericId,
            msg.sender,
            to,
            handle
        );

        require(
            response == IConfidentialLockupRecipient.onConfidentialLockupWithdraw.selector,
            "Hook rejected withdraw"
        );
    }

    function _notifyCancelHook(Stream storage stream) private {
        if (stream.hook == address(0)) {
            return;
        }

        euint128 totalAccrued = FHE.add(stream.accrued, stream.buffered);
        euint128 outstanding = FHE.sub(totalAccrued, stream.withdrawn);

        FHE.allow(outstanding, stream.hook);

        bytes4 response = IConfidentialLockupRecipient(stream.hook).onConfidentialLockupCancel(
            stream.numericId,
            msg.sender,
            bytes32(0),
            euint128.unwrap(outstanding)
        );

        require(
            response == IConfidentialLockupRecipient.onConfidentialLockupCancel.selector,
            "Hook rejected cancel"
        );
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721Enumerable) returns (address) {
        if (to != address(0) && auth != address(0)) {
            bytes32 streamKey = streamKeyById[tokenId];
            Stream storage stream = streams[streamKey];
            if (!stream.transferable || stream.status == StreamStatus.Cancelled || stream.status == StreamStatus.Settled) {
                revert StreamNotTransferable();
            }
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
