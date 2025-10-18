// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StreamingPayroll
 * @notice A simple payroll streaming contract that allows employers to stream ETH to employees
 * @dev Inspired by Sablier protocol but simplified for demo purposes
 */
contract StreamingPayroll {
    struct Stream {
        address sender;
        address recipient;
        uint256 ratePerSecond; // Amount of wei per second
        uint256 startTime;
        uint256 stopTime; // 0 means infinite/ongoing
        uint256 balance; // Remaining balance in the stream
        uint256 withdrawn; // Total amount withdrawn by recipient
        bool active;
    }

    // Stream ID counter
    uint256 private nextStreamId = 1;

    // Mapping from stream ID to Stream
    mapping(uint256 => Stream) public streams;

    // Events
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 ratePerSecond,
        uint256 deposit,
        uint256 startTime
    );

    event Withdrawn(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );

    event StreamCancelled(
        uint256 indexed streamId,
        uint256 senderBalance,
        uint256 recipientBalance
    );

    event StreamFunded(
        uint256 indexed streamId,
        uint256 amount
    );

    /**
     * @notice Create a new payroll stream
     * @param recipient The address that will receive the streamed funds
     * @param ratePerSecond The amount of wei to stream per second
     * @return streamId The ID of the created stream
     */
    function createStream(
        address recipient,
        uint256 ratePerSecond
    ) external payable returns (uint256 streamId) {
        require(recipient != address(0), "Recipient cannot be zero address");
        require(recipient != msg.sender, "Recipient cannot be sender");
        require(ratePerSecond > 0, "Rate must be greater than zero");

        streamId = nextStreamId++;

        streams[streamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            ratePerSecond: ratePerSecond,
            startTime: block.timestamp,
            stopTime: 0,
            balance: msg.value,
            withdrawn: 0,
            active: true
        });

        emit StreamCreated(
            streamId,
            msg.sender,
            recipient,
            ratePerSecond,
            msg.value,
            block.timestamp
        );
    }

    /**
     * @notice Calculate the streamed amount for a given stream
     * @param streamId The ID of the stream
     * @return The amount that has been streamed (not necessarily available to withdraw)
     */
    function streamedAmountOf(uint256 streamId) public view returns (uint256) {
        Stream memory stream = streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");

        if (!stream.active) {
            return stream.withdrawn;
        }

        uint256 elapsed = block.timestamp - stream.startTime;
        uint256 totalStreamed = elapsed * stream.ratePerSecond;

        return totalStreamed;
    }

    /**
     * @notice Calculate the available balance for withdrawal
     * @param streamId The ID of the stream
     * @return The amount available to withdraw
     */
    function balanceOf(uint256 streamId) public view returns (uint256) {
        Stream memory stream = streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");

        if (!stream.active) {
            return 0;
        }

        uint256 totalStreamed = streamedAmountOf(streamId);
        uint256 availableToStream = totalStreamed - stream.withdrawn;

        // Cap at remaining balance
        if (availableToStream > stream.balance) {
            return stream.balance;
        }

        return availableToStream;
    }

    /**
     * @notice Withdraw available funds from a stream
     * @param streamId The ID of the stream
     * @param amount The amount to withdraw (0 means withdraw all available)
     */
    function withdraw(uint256 streamId, uint256 amount) external {
        Stream storage stream = streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");
        require(stream.active, "Stream is not active");
        require(msg.sender == stream.recipient, "Only recipient can withdraw");

        uint256 available = balanceOf(streamId);
        require(available > 0, "No funds available to withdraw");

        uint256 withdrawAmount = amount;
        if (amount == 0 || amount > available) {
            withdrawAmount = available;
        }

        stream.balance -= withdrawAmount;
        stream.withdrawn += withdrawAmount;

        // Transfer funds
        (bool success, ) = stream.recipient.call{value: withdrawAmount}("");
        require(success, "Transfer failed");

        emit Withdrawn(streamId, stream.recipient, withdrawAmount);
    }

    /**
     * @notice Fund an existing stream with additional ETH
     * @param streamId The ID of the stream to fund
     */
    function fundStream(uint256 streamId) external payable {
        Stream storage stream = streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");
        require(msg.sender == stream.sender, "Only sender can fund stream");
        require(msg.value > 0, "Must send ETH to fund");

        stream.balance += msg.value;

        emit StreamFunded(streamId, msg.value);
    }

    /**
     * @notice Cancel a stream and return remaining funds
     * @param streamId The ID of the stream to cancel
     */
    function cancelStream(uint256 streamId) external {
        Stream storage stream = streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");
        require(stream.active, "Stream already cancelled");
        require(
            msg.sender == stream.sender || msg.sender == stream.recipient,
            "Only sender or recipient can cancel"
        );

        uint256 recipientBalance = balanceOf(streamId);
        uint256 senderBalance = stream.balance - recipientBalance;

        stream.active = false;

        // Transfer to recipient if any
        if (recipientBalance > 0) {
            stream.withdrawn += recipientBalance;
            (bool success, ) = stream.recipient.call{value: recipientBalance}("");
            require(success, "Recipient transfer failed");
        }

        // Return remaining to sender
        if (senderBalance > 0) {
            (bool success, ) = stream.sender.call{value: senderBalance}("");
            require(success, "Sender transfer failed");
        }

        stream.balance = 0;

        emit StreamCancelled(streamId, senderBalance, recipientBalance);
    }

    /**
     * @notice Get stream details
     * @param streamId The ID of the stream
     */
    function getStream(uint256 streamId)
        external
        view
        returns (
            address sender,
            address recipient,
            uint256 ratePerSecond,
            uint256 startTime,
            uint256 balance,
            uint256 withdrawn,
            bool active
        )
    {
        Stream memory stream = streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");

        return (
            stream.sender,
            stream.recipient,
            stream.ratePerSecond,
            stream.startTime,
            stream.balance,
            stream.withdrawn,
            stream.active
        );
    }

    /**
     * @notice Get the debt amount (if balance < streamed)
     * @param streamId The ID of the stream
     * @return The debt amount
     */
    function debtOf(uint256 streamId) external view returns (uint256) {
        Stream memory stream = streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");

        uint256 totalStreamed = streamedAmountOf(streamId);
        uint256 totalAvailable = stream.withdrawn + stream.balance;

        if (totalStreamed > totalAvailable) {
            return totalStreamed - totalAvailable;
        }

        return 0;
    }
}
