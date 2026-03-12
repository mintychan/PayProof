// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, euint128, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984} from "../../lib/confidential/interfaces/IERC7984.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

/// @title ConfidentialVestingVault
/// @notice cETH-backed vesting schedules with encrypted balances, cliffs, and NFT ownership per schedule.
contract ConfidentialVestingVault is ZamaEthereumConfig, ERC721Enumerable {
    struct CreateRequest {
        address beneficiary;
        uint64 start;
        uint64 cliff;
        uint64 duration;
        uint16 initialUnlockBps;
        bool cancelable;
    }
    struct VestingSchedule {
        uint256 vestingId;
        address sponsor;
        address beneficiary;
        uint64 start;
        uint64 cliff;
        uint64 duration;
        uint16 initialUnlockBps;
        euint128 totalAmount;
        euint128 released;
        bool cancelable;
        bool revoked;
        uint64 revokedAt;
    }

    struct VestingScheduleView {
        uint256 vestingId;
        address sponsor;
        address beneficiary;
        uint64 start;
        uint64 cliff;
        uint64 duration;
        uint16 initialUnlockBps;
        bool cancelable;
        bool revoked;
        uint64 revokedAt;
        bytes32 totalAmount;
        bytes32 released;
    }

    IERC7984 public immutable confidentialToken;
    address public admin;
    uint256 private nextVestingId = 1;

    mapping(uint256 => VestingSchedule) private schedules;
    mapping(uint256 => string) private customTokenURIs;
    mapping(address => bool) public employerAllowlist;

    event EmployerAllowed(address indexed account, bool allowed);
    event VestingCreated(
        uint256 indexed vestingId,
        address indexed sponsor,
        address indexed beneficiary,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint16 initialUnlockBps,
        bool cancelable,
        bytes32 totalAmountHandle
    );
    event VestingCancelled(uint256 indexed vestingId, address indexed sponsor, bytes32 refundedAmountHandle);
    event VestingWithdrawn(uint256 indexed vestingId, address indexed beneficiary, bytes32 amountHandle);
    event VestingRevoked(uint256 indexed vestingId, address indexed adminCaller);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    error InvalidBeneficiary();
    error InvalidSchedule();
    error InvalidParameters();
    error NotAuthorized();
    error NotCancelable();
    error VestingRevokedAlready();
    error FeatureUnavailable();
    error CliffNotReached();
    error TokenNotTransferable();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAuthorized();
        _;
    }

    modifier onlyAllowedEmployer() {
        if (!employerAllowlist[msg.sender]) revert NotAuthorized();
        _;
    }

    modifier scheduleExists(uint256 vestingId) {
        if (schedules[vestingId].beneficiary == address(0)) revert InvalidSchedule();
        _;
    }

    /// @param token The confidential ERC-7984 token used for vesting deposits and payouts.
    constructor(IERC7984 token) ERC721("PayProof Vesting", "PPVEST") {
        if (address(token) == address(0)) revert InvalidParameters();
        confidentialToken = token;
        admin = msg.sender;
        employerAllowlist[msg.sender] = true;
    }

    /// @notice Transfers administrative control to a new address.
    /// @param newAdmin The address of the new admin.
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert InvalidParameters();
        address previous = admin;
        admin = newAdmin;
        emit AdminTransferred(previous, newAdmin);
    }

    /// @notice Adds or removes an employer from the allowlist for creating vesting schedules.
    /// @param employer The employer address to modify.
    /// @param allowed True to allow, false to revoke.
    function allowEmployer(address employer, bool allowed) external onlyAdmin {
        employerAllowlist[employer] = allowed;
        emit EmployerAllowed(employer, allowed);
    }

    /// @notice Returns the total number of vesting schedules created.
    /// @return The count of all vesting schedules.
    function totalSchedules() external view returns (uint256) {
        return nextVestingId - 1;
    }

    /// @notice Returns a view-safe representation of a vesting schedule with FHE handles for encrypted fields.
    /// @param vestingId The numeric id of the vesting schedule.
    /// @return A VestingScheduleView struct with all public metadata and FHE handles.
    function getSchedule(uint256 vestingId)
        external
        view
        scheduleExists(vestingId)
        returns (VestingScheduleView memory)
    {
        VestingSchedule storage schedule = schedules[vestingId];
        return VestingScheduleView({
            vestingId: schedule.vestingId,
            sponsor: schedule.sponsor,
            beneficiary: schedule.beneficiary,
            start: schedule.start,
            cliff: schedule.cliff,
            duration: schedule.duration,
            initialUnlockBps: schedule.initialUnlockBps,
            cancelable: schedule.cancelable,
            revoked: schedule.revoked,
            revokedAt: schedule.revokedAt,
            totalAmount: euint128.unwrap(schedule.totalAmount),
            released: euint128.unwrap(schedule.released)
        });
    }

    /// @notice Returns FHE handles for the total and released amounts, granting transient access to the caller.
    /// @param vestingId The numeric id of the vesting schedule.
    /// @return totalHandle The FHE handle for the total vested amount.
    /// @return releasedHandle The FHE handle for the released amount.
    function encryptedAmounts(uint256 vestingId)
        external
        scheduleExists(vestingId)
        returns (bytes32 totalHandle, bytes32 releasedHandle)
    {
        VestingSchedule storage schedule = schedules[vestingId];
        FHE.allow(schedule.totalAmount, msg.sender);
        FHE.allow(schedule.released, msg.sender);
        euint128 total = FHE.allowTransient(schedule.totalAmount, msg.sender);
        euint128 released = FHE.allowTransient(schedule.released, msg.sender);
        return (euint128.unwrap(total), euint128.unwrap(released));
    }

    /// @notice Creates a new vesting schedule funded by confidential tokens.
    /// @dev Transfers encrypted tokens from the caller to this vault and mints an NFT to the beneficiary.
    /// @param beneficiary The address receiving the vesting schedule and NFT.
    /// @param start The vesting start timestamp (0 defaults to block.timestamp).
    /// @param cliff The cliff timestamp before which no tokens are releasable (0 defaults to start).
    /// @param duration The total vesting duration in seconds.
    /// @param initialUnlockBps The percentage (in basis points) unlocked immediately at start.
    /// @param cancelable Whether the sponsor or admin can cancel this schedule.
    /// @param totalAmount The encrypted total amount to vest.
    /// @param amountProof The FHE proof validating the encrypted amount.
    /// @return vestingId The numeric id of the newly created vesting schedule.
    function createVesting(
        address beneficiary,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint16 initialUnlockBps,
        bool cancelable,
        externalEuint64 totalAmount,
        bytes calldata amountProof
    ) external onlyAllowedEmployer returns (uint256 vestingId) {
        CreateRequest memory request = CreateRequest({
            beneficiary: beneficiary,
            start: start,
            cliff: cliff,
            duration: duration,
            initialUnlockBps: initialUnlockBps,
            cancelable: cancelable
        });
        return _createVesting(request, totalAmount, amountProof);
    }

    function _createVesting(
        CreateRequest memory request,
        externalEuint64 totalAmount,
        bytes calldata amountProof
    ) internal returns (uint256 vestingId) {
        if (request.beneficiary == address(0)) revert InvalidBeneficiary();
        if (request.duration == 0 || request.initialUnlockBps > 10000) revert InvalidParameters();

        uint64 startTime = request.start == 0 ? uint64(block.timestamp) : request.start;
        uint64 cliffTime = request.cliff == 0 ? startTime : request.cliff;
        if (cliffTime < startTime) revert InvalidParameters();

        euint64 encryptedAmount = FHE.fromExternal(totalAmount, amountProof);
        FHE.allow(encryptedAmount, address(confidentialToken));
        euint64 transferred64 = confidentialToken.confidentialTransferFrom(msg.sender, address(this), encryptedAmount);
        euint128 settledAmount = FHE.asEuint128(transferred64);

        vestingId = nextVestingId++;
        VestingSchedule storage schedule = schedules[vestingId];
        schedule.vestingId = vestingId;
        schedule.sponsor = msg.sender;
        schedule.beneficiary = request.beneficiary;
        schedule.start = startTime;
        schedule.cliff = cliffTime;
        schedule.duration = request.duration;
        schedule.initialUnlockBps = request.initialUnlockBps;
        schedule.totalAmount = settledAmount;
        schedule.released = FHE.asEuint128(uint128(0));
        schedule.cancelable = request.cancelable;

        _allowSchedule(schedule);

        _safeMint(request.beneficiary, vestingId);

        FHE.allowThis(settledAmount);
        emit VestingCreated(
            vestingId,
            schedule.sponsor,
            schedule.beneficiary,
            schedule.start,
            schedule.cliff,
            schedule.duration,
            schedule.initialUnlockBps,
            schedule.cancelable,
            euint128.unwrap(settledAmount)
        );
    }

    /// @notice Withdraws the releasable vested amount to a specified address.
    /// @dev Only the beneficiary can withdraw. The cliff must have been reached and the schedule must not be revoked.
    /// @param vestingId The numeric id of the vesting schedule.
    /// @param to The destination address for the released tokens.
    function withdraw(uint256 vestingId, address to) external scheduleExists(vestingId) {
        if (to == address(0)) revert InvalidBeneficiary();
        VestingSchedule storage schedule = schedules[vestingId];
        if (msg.sender != schedule.beneficiary) revert NotAuthorized();
        if (schedule.revoked) revert VestingRevokedAlready();
        if (block.timestamp < schedule.cliff) revert CliffNotReached();

        euint128 releasable = _releasableAmount(schedule);
        euint64 payout64 = FHE.asEuint64(releasable);
        FHE.allow(payout64, address(confidentialToken));
        euint64 transferred = confidentialToken.confidentialTransfer(to, payout64);
        euint128 settled = FHE.asEuint128(transferred);
        schedule.released = FHE.add(schedule.released, settled);

        _allowSchedule(schedule);

        FHE.allowThis(settled);
        emit VestingWithdrawn(vestingId, schedule.beneficiary, euint128.unwrap(settled));
    }

    /// @notice Cancels a vesting schedule, releasing vested tokens to the beneficiary and refunding the rest to the sponsor.
    /// @dev Only the sponsor or admin can cancel. The schedule must be cancelable and not already revoked.
    /// @param vestingId The numeric id of the vesting schedule to cancel.
    function cancel(uint256 vestingId) external scheduleExists(vestingId) {
        VestingSchedule storage schedule = schedules[vestingId];
        if (!schedule.cancelable) revert NotCancelable();
        if (schedule.revoked) revert VestingRevokedAlready();
        if (msg.sender != schedule.sponsor && msg.sender != admin) revert NotAuthorized();

        schedule.revoked = true;
        schedule.revokedAt = uint64(block.timestamp);

        euint128 vested = _vestedAmount(schedule, schedule.revokedAt);
        euint128 unreleased = FHE.sub(vested, schedule.released);
        euint128 refund = FHE.sub(schedule.totalAmount, vested);

        if (schedule.beneficiary != address(0)) {
            euint64 payout64 = FHE.asEuint64(unreleased);
            FHE.allow(payout64, address(confidentialToken));
            euint64 transferred = confidentialToken.confidentialTransfer(schedule.beneficiary, payout64);
            euint128 settled = FHE.asEuint128(transferred);
            schedule.released = FHE.add(schedule.released, settled);
        }

        euint64 refund64 = FHE.asEuint64(refund);
        FHE.allow(refund64, address(confidentialToken));
        confidentialToken.confidentialTransfer(schedule.sponsor, refund64);

        _allowSchedule(schedule);

        FHE.allowThis(refund);
        emit VestingCancelled(vestingId, schedule.sponsor, euint128.unwrap(refund));
    }

    /// @notice Returns the token URI for a vesting schedule NFT.
    /// @dev Returns a custom URI if set, otherwise returns an empty string.
    /// @param tokenId The numeric id of the vesting NFT.
    /// @return The token metadata URI.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert InvalidSchedule();
        string memory custom = customTokenURIs[tokenId];
        if (bytes(custom).length != 0) {
            return custom;
        }
        return "";
    }

    /// @notice Sets a custom token URI for a vesting schedule NFT.
    /// @dev Only the admin or the schedule's sponsor can set the URI.
    /// @param vestingId The numeric id of the vesting schedule.
    /// @param uri The custom metadata URI to set.
    function setCustomTokenURI(uint256 vestingId, string calldata uri) external scheduleExists(vestingId) {
        if (msg.sender != admin && msg.sender != schedules[vestingId].sponsor) revert NotAuthorized();
        customTokenURIs[vestingId] = uri;
    }

    /// @notice ERC-165 interface detection including ERC-721 support.
    /// @param interfaceId The interface identifier to check.
    /// @return True if the contract implements the requested interface.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _vestedAmount(VestingSchedule storage schedule, uint64 queryTime) private returns (euint128) {
        if (queryTime <= schedule.start || queryTime < schedule.cliff) {
            return FHE.asEuint128(uint128(0));
        }
        uint64 cappedTime = queryTime;
        uint64 endTime = schedule.start + schedule.duration;
        if (cappedTime > endTime) {
            cappedTime = endTime;
        }
        if (cappedTime <= schedule.start) {
            return FHE.asEuint128(uint128(0));
        }
        if (cappedTime == endTime) {
            return schedule.totalAmount;
        }

        euint128 initial = _mulBps(schedule.totalAmount, schedule.initialUnlockBps);
        euint128 remaining = FHE.sub(schedule.totalAmount, initial);
        uint64 elapsed = cappedTime - schedule.start;
        euint128 linear = FHE.div(FHE.mul(remaining, uint128(elapsed)), uint128(schedule.duration));
        return FHE.add(initial, linear);
    }

    function _releasableAmount(VestingSchedule storage schedule) private returns (euint128) {
        uint64 queryTime = schedule.revoked ? schedule.revokedAt : uint64(block.timestamp);
        euint128 vested = _vestedAmount(schedule, queryTime);
        return FHE.sub(vested, schedule.released);
    }

    function _mulBps(euint128 value, uint16 bps) private returns (euint128) {
        if (bps == 0) {
            return FHE.asEuint128(uint128(0));
        }
        return FHE.div(FHE.mul(value, uint128(bps)), uint128(10000));
    }

    function _allowSchedule(VestingSchedule storage schedule) private {
        FHE.allowThis(schedule.totalAmount);
        FHE.allow(schedule.totalAmount, schedule.sponsor);
        FHE.allow(schedule.totalAmount, schedule.beneficiary);
        FHE.allow(schedule.totalAmount, admin);

        FHE.allowThis(schedule.released);
        FHE.allow(schedule.released, schedule.sponsor);
        FHE.allow(schedule.released, schedule.beneficiary);
        FHE.allow(schedule.released, admin);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721Enumerable) returns (address) {
        if (to != address(0) && auth != address(0)) {
            VestingSchedule storage schedule = schedules[tokenId];
            if (!schedule.revoked) {
                uint64 endTime = schedule.start + schedule.duration;
                if (block.timestamp < endTime) {
                    revert TokenNotTransferable();
                }
            }
        }
        return super._update(to, tokenId, auth);
    }
}
