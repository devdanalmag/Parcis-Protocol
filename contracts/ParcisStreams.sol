// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ParcisStreams
 * @dev Continuous money streaming for subscriptions on Arc Network
 * Money acts as a fluid, streaming per second from subscriber to creator.
 */

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract ParcisStreams {
    IERC20 public usdcToken;
    address public platformWallet;
    uint256 public platformFeeBps = 25; // 0.25% fee

    uint256 public streamCount;

    struct Stream {
        address sender;
        address recipient;
        uint256 depositAmount;
        uint256 startTime;
        uint256 stopTime;
        uint256 amountWithdrawn;
        bool isActive;
    }

    mapping(uint256 => Stream) public streams;
    // Helper mappings to fetch streams for a user quickly
    mapping(address => uint256[]) public senderStreams;
    mapping(address => uint256[]) public recipientStreams;

    event StreamCreated(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 depositAmount, uint256 startTime, uint256 stopTime);
    event WithdrawnFromStream(uint256 indexed streamId, address indexed recipient, uint256 amount);
    event StreamCancelled(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 senderRefund, uint256 recipientBalance);

    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
        platformWallet = msg.sender;
    }

    /**
     * @dev Create a new payment stream
     * @param recipient The address receiving the stream
     * @param depositAmount Total amount of USDC to lock for the duration
     * @param durationInSeconds How long the stream lasts (e.g. 30 days = 2592000)
     */
    function createStream(address recipient, uint256 depositAmount, uint256 durationInSeconds) external returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot stream to self");
        require(depositAmount > 0, "Deposit must be > 0");
        require(durationInSeconds > 0, "Duration must be > 0");

        // Transfer USDC to contract (User must have called approve() on USDC first)
        require(usdcToken.transferFrom(msg.sender, address(this), depositAmount), "USDC transfer failed");

        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + durationInSeconds;

        streamCount++;
        streams[streamCount] = Stream({
            sender: msg.sender,
            recipient: recipient,
            depositAmount: depositAmount,
            startTime: startTime,
            stopTime: stopTime,
            amountWithdrawn: 0,
            isActive: true
        });

        senderStreams[msg.sender].push(streamCount);
        recipientStreams[recipient].push(streamCount);

        emit StreamCreated(streamCount, msg.sender, recipient, depositAmount, startTime, stopTime);
        return streamCount;
    }

    /**
     * @dev Calculates how much is owed to the recipient and how much can be refunded to the sender right now.
     */
    function _balanceOfStream(uint256 streamId) internal view returns (uint256 recipientBalance, uint256 senderRefund) {
        Stream memory stream = streams[streamId];
        if (!stream.isActive) return (0, 0);

        if (block.timestamp >= stream.stopTime) {
            // Stream is over. Recipient gets everything not yet withdrawn.
            recipientBalance = stream.depositAmount - stream.amountWithdrawn;
            senderRefund = 0;
        } else {
            // Stream is ongoing. Calculate per-second distribution.
            uint256 elapsedTime = block.timestamp - stream.startTime;
            uint256 totalDuration = stream.stopTime - stream.startTime;
            
            // Math: depositAmount * (elapsed / total)
            uint256 totalEarned = (stream.depositAmount * elapsedTime) / totalDuration;
            
            recipientBalance = totalEarned - stream.amountWithdrawn;
            senderRefund = stream.depositAmount - totalEarned;
        }
    }

    /**
     * @dev Public view for the UI to show real-time ticking balances
     */
    function balanceOf(uint256 streamId) public view returns (uint256 withdrawableByRecipient, uint256 refundableToSender) {
        return _balanceOfStream(streamId);
    }

    /**
     * @dev Recipient pulls their unlocked funds from the stream
     */
    function withdrawFromStream(uint256 streamId) external {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        require(msg.sender == stream.recipient || msg.sender == stream.sender, "Not authorized");
        
        (uint256 amountToWithdraw, ) = _balanceOfStream(streamId);
        require(amountToWithdraw > 0, "Nothing to withdraw");

        stream.amountWithdrawn += amountToWithdraw;

        // Take Parcis platform fee
        uint256 fee = (amountToWithdraw * platformFeeBps) / 10000;
        uint256 payout = amountToWithdraw - fee;

        require(usdcToken.transfer(platformWallet, fee), "Fee transfer failed");
        require(usdcToken.transfer(stream.recipient, payout), "Payout failed");

        // If stream time is completely up, mark inactive
        if (block.timestamp >= stream.stopTime) {
            stream.isActive = false;
        }

        emit WithdrawnFromStream(streamId, stream.recipient, amountToWithdraw);
    }

    /**
     * @dev Sender can cancel the stream at any time. Unlocked funds go to recipient, remainder goes back to sender.
     */
    function cancelStream(uint256 streamId) external {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        require(msg.sender == stream.sender || msg.sender == stream.recipient, "Not authorized");

        (uint256 recipientBalance, uint256 senderRefund) = _balanceOfStream(streamId);
        
        stream.amountWithdrawn += recipientBalance;
        stream.isActive = false;

        // Payout the creator what they earned up to this exact second
        if (recipientBalance > 0) {
            uint256 fee = (recipientBalance * platformFeeBps) / 10000;
            uint256 payout = recipientBalance - fee;
            require(usdcToken.transfer(platformWallet, fee), "Fee transfer failed");
            require(usdcToken.transfer(stream.recipient, payout), "Payout failed");
        }

        // Refund the rest to the subscriber
        if (senderRefund > 0) {
            require(usdcToken.transfer(stream.sender, senderRefund), "Refund failed");
        }

        emit StreamCancelled(streamId, stream.sender, stream.recipient, senderRefund, recipientBalance);
    }
}
