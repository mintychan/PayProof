// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, euint128, externalEuint64, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IConfidentialLockupRecipient} from "./interfaces/IConfidentialLockupRecipient.sol";
import {IERC7984} from "../lib/confidential/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "../lib/confidential/interfaces/IERC7984Receiver.sol";

/// @title EncryptedPayroll
/// @notice Confidential payroll stream manager built on Zama's fhEVM.
/// @dev Refactored to mirror Sablier-style lockup semantics while keeping stream balances encrypted.
contract EncryptedPayroll is ZamaEthereumConfig, ERC721Enumerable, IERC7984Receiver, ReentrancyGuard {
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
    IERC7984 public immutable confidentialToken;

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
    error InvalidConfidentialToken();
    error StreamNotActive();

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

    constructor(IERC7984 token) ERC721("PayProof Stream", "PAYSTREAM") {
        if (address(token) == address(0)) revert InvalidConfidentialToken();
        confidentialToken = token;
        admin = msg.sender;
    }

    /// @notice Computes a deterministic stream key by hashing employer and employee addresses.
    /// @param employer The employer address.
    /// @param employee The employee address.
    /// @return The keccak256 hash used as the stream key.
    function computeStreamId(address employer, address employee) public pure returns (bytes32) {
        return keccak256(abi.encode(employer, employee));
    }

    /// @notice Returns the internal numeric stream id for a given stream key.
    /// @param streamKey The unique stream identifier.
    /// @return The numeric ERC-721 token id associated with the stream.
    function streamIdFor(bytes32 streamKey) external view streamExists(streamKey) returns (uint256) {
        return streams[streamKey].numericId;
    }

    /// @notice Returns the stream key for a numeric stream id.
    /// @param streamId The numeric ERC-721 token id.
    /// @return The stream key associated with the given numeric id.
    function streamKeyFor(uint256 streamId) external view returns (bytes32) {
        bytes32 key = streamKeyById[streamId];
        if (streams[key].status == StreamStatus.None) revert StreamNotFound();
        return key;
    }

    /// @notice Returns the address of the confidential token used for funding and settlement.
    /// @return The address of the IERC7984 confidential token contract.
    function fundingToken() external view returns (address) {
        return address(confidentialToken);
    }

    /// @notice Returns additional stream configuration parameters and encrypted balance handles.
    /// @param streamKey The unique stream identifier.
    /// @return streamId The numeric ERC-721 token id.
    /// @return cancelable Whether the stream can be cancelled.
    /// @return transferable Whether the stream NFT can be transferred.
    /// @return hook The registered hook contract address (or zero).
    /// @return bufferedHandle The FHE handle for the buffered (top-up) balance.
    /// @return withdrawnHandle The FHE handle for the total withdrawn balance.
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

    /// @notice Creates a new confidential payroll stream with an encrypted per-second rate.
    /// @dev The stream key is derived deterministically from (msg.sender, employee). Mints an ERC-721 token
    ///      to the employee representing ownership of the stream.
    /// @param employee The address of the employee receiving the stream.
    /// @param encRatePerSecond The encrypted per-second pay rate (externalEuint64).
    /// @param rateProof The FHE proof validating the encrypted rate.
    /// @param cadenceInSeconds The payout cadence interval in seconds.
    /// @param startTime The stream start timestamp; 0 defaults to block.timestamp.
    /// @return streamKey The deterministic key identifying this stream.
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

    /// @notice Allows the admin to approve or revoke hook contracts for use with streams.
    /// @param hook The address of the hook contract.
    /// @param allowed True to allowlist, false to revoke.
    function allowHook(address hook, bool allowed) external onlyAdmin {
        hookAllowlist[hook] = allowed;
        emit HookAllowed(hook, allowed);
    }

    /// @notice Registers or removes a hook contract on a stream for automated accounting or vault callbacks.
    /// @dev Only the employer can set hooks. The hook must be on the admin allowlist (or zero to remove).
    /// @param streamKey The unique stream identifier.
    /// @param hook The hook contract address to set (address(0) to remove).
    function setStreamHook(bytes32 streamKey, address hook) external streamExists(streamKey) onlyEmployer(streamKey) {
        if (hook != address(0) && !hookAllowlist[hook]) revert HookNotAllowlisted();
        Stream storage stream = streams[streamKey];
        address previous = stream.hook;
        stream.hook = hook;
        emit StreamHookUpdated(streamKey, previous, hook);
    }

    /// @notice Toggles cancelability and transferability flags on a stream.
    /// @dev Only the employer can modify stream configuration.
    /// @param streamKey The unique stream identifier.
    /// @param cancelable Whether the stream can be cancelled or paused.
    /// @param transferable Whether the stream NFT can be transferred to another address.
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

    /// @notice Transfers administrative control to a new address.
    /// @dev The new admin inherits hook allowlist management privileges.
    /// @param newAdmin The address of the new admin.
    function transferAdmin(address newAdmin) external onlyAdmin {
        address previous = admin;
        admin = newAdmin;
        emit AdminTransferred(previous, newAdmin);
    }

    /// @notice Accrues encrypted balance based on elapsed time since the last update.
    /// @dev Only accrues for Active streams. For non-active streams, updates lastAccruedAt without accruing.
    /// @param streamKey The unique stream identifier.
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

    /// @notice Adds an encrypted top-up amount (e.g. bonus or manual adjustment) to a stream.
    /// @dev Syncs the stream first, then validates it is Active or Paused before applying the funding.
    ///      Transfers confidential tokens from the employer to this contract.
    /// @param streamKey The unique stream identifier.
    /// @param encAmount The encrypted top-up amount (externalEuint128).
    /// @param amountProof The FHE proof validating the encrypted amount.
    function topUp(
        bytes32 streamKey,
        externalEuint128 encAmount,
        bytes calldata amountProof
    ) external streamExists(streamKey) onlyEmployer(streamKey) {
        syncStream(streamKey);
        Stream storage stream = streams[streamKey];
        if (stream.status != StreamStatus.Active && stream.status != StreamStatus.Paused) revert StreamNotActive();
        euint128 addition = FHE.fromExternal(encAmount, amountProof);
        euint64 addition64 = FHE.asEuint64(addition);
        FHE.allow(addition64, address(confidentialToken));

        euint64 transferred = confidentialToken.confidentialTransferFrom(msg.sender, address(this), addition64);

        _applyFunding(streamKey, stream, transferred);
    }

    /// @notice Pauses an active stream, halting further accrual until resumed.
    /// @dev Only the employer can pause. The stream must be cancelable to be pauseable.
    /// @param streamKey The unique stream identifier.
    function pauseStream(bytes32 streamKey) external streamExists(streamKey) onlyEmployer(streamKey) {
        Stream storage stream = streams[streamKey];
        if (!stream.cancelable) revert StreamNotCancelable();
        syncStream(streamKey);
        if (stream.status == StreamStatus.Active) {
            stream.status = StreamStatus.Paused;
            emit StreamPaused(streamKey);
        }
    }

    /// @notice Resumes a paused stream, restarting accrual from the current block timestamp.
    /// @dev Only the employer can resume. Only transitions from Paused to Active.
    /// @param streamKey The unique stream identifier.
    function resumeStream(bytes32 streamKey) external streamExists(streamKey) onlyEmployer(streamKey) {
        Stream storage stream = streams[streamKey];
        if (stream.status == StreamStatus.Paused) {
            stream.status = StreamStatus.Active;
            stream.lastAccruedAt = uint64(block.timestamp);
            emit StreamResumed(streamKey);
        }
    }

    /// @notice Cancels a stream permanently, stopping all future accrual.
    /// @dev Syncs before cancelling. Notifies the hook contract if one is registered. Protected against reentrancy.
    /// @param streamKey The unique stream identifier.
    function cancelStream(bytes32 streamKey) external streamExists(streamKey) onlyEmployer(streamKey) nonReentrant {
        Stream storage stream = streams[streamKey];
        if (!stream.cancelable) revert StreamNotCancelable();
        syncStream(streamKey);
        stream.status = StreamStatus.Cancelled;
        stream.lastAccruedAt = uint64(block.timestamp);

        _notifyCancelHook(stream);
        emit StreamCancelled(streamKey);
    }

    /// @notice Settles the full encrypted balance (streamed + buffered) to the recipient.
    /// @dev Employee can withdraw to any address. Employer and hook can only withdraw to the employee.
    ///      If the stream was cancelled, it transitions to Settled after withdrawal. Protected against reentrancy.
    /// @param streamKey The unique stream identifier.
    /// @param to The destination address for the withdrawn funds.
    function withdrawMax(bytes32 streamKey, address to)
        external
        streamExists(streamKey)
        nonReentrant
    {
        Stream storage stream = streams[streamKey];
        StreamStatus statusBeforeWithdraw = stream.status;
        if (!_isAuthorizedWithdrawer(stream, msg.sender, to)) revert NotAuthorized();
        if (to == address(0)) revert NotAuthorized();

        syncStream(streamKey);

        euint128 totalAccrued = FHE.add(stream.accrued, stream.buffered);
        euint128 withdrawable = FHE.sub(totalAccrued, stream.withdrawn);

        euint64 payout64 = FHE.asEuint64(withdrawable);
        FHE.allow(payout64, address(confidentialToken));
        euint64 transferredAmount = confidentialToken.confidentialTransfer(to, payout64);
        euint128 settledAmount = FHE.asEuint128(transferredAmount);

        stream.withdrawn = FHE.asEuint128(uint128(0));
        stream.accrued = FHE.asEuint128(uint128(0));
        stream.buffered = FHE.asEuint128(uint128(0));
        stream.lastAccruedAt = uint64(block.timestamp);

        if (statusBeforeWithdraw == StreamStatus.Cancelled && stream.status != StreamStatus.Settled) {
            stream.status = StreamStatus.Settled;
            emit StreamSettled(streamKey);
        }

        _allowBalances(streamKey);

        emit StreamWithdrawn(streamKey, stream.numericId, msg.sender, to, euint128.unwrap(settledAmount));
        _notifyWithdrawHook(stream, to, settledAmount);
    }

    /// @notice Returns the ERC-721 token id linked to a stream key.
    /// @param streamKey The unique stream identifier.
    /// @return The numeric token id.
    function streamTokenId(bytes32 streamKey) external view streamExists(streamKey) returns (uint256) {
        return streams[streamKey].numericId;
    }

    /// @notice Returns the current owner of the stream NFT.
    /// @param streamKey The unique stream identifier.
    /// @return The address that owns the stream's ERC-721 token.
    function streamOwner(bytes32 streamKey) external view streamExists(streamKey) returns (address) {
        uint256 tokenId = streams[streamKey].numericId;
        return ownerOf(tokenId);
    }

    /// @notice Returns the encrypted withdrawable balance and grants transient FHE access to the caller.
    /// @dev Computes (accrued + buffered - withdrawn) and allows the employee, employer, and hook to decrypt.
    /// @param streamKey The unique stream identifier.
    /// @return The encrypted withdrawable balance as euint128.
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

    /// @notice Returns projected encrypted income over a lookback window and grants transient access.
    /// @dev Returns zero for cancelled or settled streams. Computes rate * (lookbackDays * 86400).
    /// @param streamKey The unique stream identifier.
    /// @param lookbackDays Number of days to project income over.
    /// @return The encrypted projected income as euint128.
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

    /// @notice Returns public metadata for a stream (does not mutate encrypted values).
    /// @param streamKey The unique stream identifier.
    /// @return employer The employer address.
    /// @return employee The employee address.
    /// @return rateHandle The FHE handle for the encrypted rate.
    /// @return cadenceInSeconds The payout cadence interval.
    /// @return status The current stream status.
    /// @return startTime The stream start timestamp.
    /// @return lastAccruedAt The last time accrual was computed.
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

    /// @notice IERC7984Receiver callback invoked when confidential tokens are sent to this contract.
    /// @dev Validates the sender is the confidential token, decodes the stream key from `data`,
    ///      verifies the stream exists and the sender is the employer, then applies the funding.
    /// @param from The address that initiated the confidential transfer.
    /// @param amount The encrypted transfer amount.
    /// @param data ABI-encoded bytes32 stream key identifying the target stream.
    /// @return An encrypted boolean indicating whether the transfer was accepted.
    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata data
    ) external override returns (ebool) {
        if (msg.sender != address(confidentialToken)) {
            return FHE.asEbool(false);
        }
        if (data.length != 32) {
            return FHE.asEbool(false);
        }

        bytes32 streamKey = abi.decode(data, (bytes32));
        Stream storage stream = streams[streamKey];
        if (stream.status == StreamStatus.None) {
            return FHE.asEbool(false);
        }
        if (stream.employer != from) {
            return FHE.asEbool(false);
        }

        syncStream(streamKey);
        _applyFunding(streamKey, stream, amount);
        return FHE.asEbool(true);
    }

    /// @notice Checks whether `caller` is permitted to withdraw stream funds to `to`.
    /// @dev Employee can withdraw to any address. Employer and hook can only withdraw to the employee.
    /// @param stream The stream storage reference.
    /// @param caller The address initiating the withdrawal.
    /// @param to The destination address for the withdrawn funds.
    /// @return True if the caller is authorized to withdraw to the given destination.
    function _isAuthorizedWithdrawer(Stream storage stream, address caller, address to) private view returns (bool) {
        if (caller == stream.employee) {
            return true;
        }
        if (caller == stream.employer || (stream.hook != address(0) && caller == stream.hook)) {
            return to == stream.employee;
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

    function _applyFunding(bytes32 streamKey, Stream storage stream, euint64 credited) private {
        euint128 addition = FHE.asEuint128(credited);
        stream.buffered = FHE.add(stream.buffered, addition);

        _allowBalances(streamKey);

        emit StreamToppedUp(streamKey, euint128.unwrap(addition));
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

    /// @notice ERC-165 interface detection including ERC-721 and IERC7984Receiver support.
    /// @param interfaceId The interface identifier to check.
    /// @return True if the contract implements the requested interface.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
