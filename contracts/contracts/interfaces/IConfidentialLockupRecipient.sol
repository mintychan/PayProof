// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for hook receivers that react to confidential lockup events.
interface IConfidentialLockupRecipient {
    function onConfidentialLockupWithdraw(
        uint256 streamId,
        address caller,
        address to,
        bytes32 amountHandle
    ) external returns (bytes4);

    function onConfidentialLockupCancel(
        uint256 streamId,
        address caller,
        bytes32 senderAmountHandle,
        bytes32 recipientAmountHandle
    ) external returns (bytes4);
}
