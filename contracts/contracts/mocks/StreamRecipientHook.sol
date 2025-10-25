// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IConfidentialLockupRecipient} from "../interfaces/IConfidentialLockupRecipient.sol";

contract StreamRecipientHook is IConfidentialLockupRecipient {
    event HookWithdrawn(uint256 streamId, address caller, address to, bytes32 amountHandle);
    event HookCancelled(uint256 streamId, address caller, bytes32 senderAmountHandle, bytes32 recipientAmountHandle);

    function onConfidentialLockupWithdraw(
        uint256 streamId,
        address caller,
        address to,
        bytes32 amountHandle
    ) external override returns (bytes4) {
        emit HookWithdrawn(streamId, caller, to, amountHandle);
        return IConfidentialLockupRecipient.onConfidentialLockupWithdraw.selector;
    }

    function onConfidentialLockupCancel(
        uint256 streamId,
        address caller,
        bytes32 senderAmountHandle,
        bytes32 recipientAmountHandle
    ) external override returns (bytes4) {
        emit HookCancelled(streamId, caller, senderAmountHandle, recipientAmountHandle);
        return IConfidentialLockupRecipient.onConfidentialLockupCancel.selector;
    }
}
