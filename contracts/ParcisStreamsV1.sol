// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./utils/ReentrancyGuardUpgradeable.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title ParcisStreams V1 (Upgradeable via UUPS Proxy)
/// @notice Continuous money streaming for subscriptions on Arc Network
/// @dev Uses OpenZeppelin UUPS pattern — data lives in proxy, logic is replaceable
contract ParcisStreamsV1 is Initializable, UUPSUpgradeable, Ownable2StepUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    IERC20 public usdcToken;
    address public platformWallet;
    uint256 public platformFeeBps;

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
    mapping(address => uint256[]) public senderStreams;
    mapping(address => uint256[]) public recipientStreams;

    event StreamCreated(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 depositAmount, uint256 startTime, uint256 stopTime);
    event WithdrawnFromStream(uint256 indexed streamId, address indexed recipient, uint256 amount);
    event StreamCancelled(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 senderRefund, uint256 recipientBalance);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Replaces the old constructor — called once when proxy is first deployed
    function initialize(address _usdcToken, address _platformWallet) public initializer {
        __Ownable_init(msg.sender);
        __Ownable2Step_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        usdcToken = IERC20(_usdcToken);
        platformWallet = _platformWallet;
        platformFeeBps = 25; // 0.25% fee
    }

    /// @notice Reinitializer for existing deployed proxies to enable circuit breaker and 2-step ownership
    function initializeSecurity() public reinitializer(2) {
        __Ownable2Step_init();
        __Pausable_init();
        __ReentrancyGuard_init();
    }

    /// @notice Emergency circuit breaker
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume protocol actions after emergency
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Only the owner can authorize upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS LOGIC — identical to the original ParcisStreams
    // ═══════════════════════════════════════════════════════════════

    function createStream(address recipient, uint256 depositAmount, uint256 durationInSeconds) external whenNotPaused nonReentrant returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot stream to self");
        require(depositAmount > 0, "Deposit must be > 0");
        require(durationInSeconds > 0, "Duration must be > 0");

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

    function _balanceOfStream(uint256 streamId) internal view returns (uint256 recipientBalance, uint256 senderRefund) {
        Stream memory stream = streams[streamId];
        if (!stream.isActive) return (0, 0);

        if (block.timestamp >= stream.stopTime) {
            recipientBalance = stream.depositAmount - stream.amountWithdrawn;
            senderRefund = 0;
        } else {
            uint256 elapsedTime = block.timestamp - stream.startTime;
            uint256 totalDuration = stream.stopTime - stream.startTime;
            uint256 totalEarned = (stream.depositAmount * elapsedTime) / totalDuration;
            recipientBalance = totalEarned - stream.amountWithdrawn;
            senderRefund = stream.depositAmount - totalEarned;
        }
    }

    function balanceOf(uint256 streamId) public view returns (uint256 withdrawableByRecipient, uint256 refundableToSender) {
        return _balanceOfStream(streamId);
    }

    function withdrawFromStream(uint256 streamId) external whenNotPaused nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        require(msg.sender == stream.recipient || msg.sender == stream.sender, "Not authorized");
        
        (uint256 amountToWithdraw, ) = _balanceOfStream(streamId);
        require(amountToWithdraw > 0, "Nothing to withdraw");

        stream.amountWithdrawn += amountToWithdraw;

        uint256 fee = (amountToWithdraw * platformFeeBps) / 10000;
        uint256 payout = amountToWithdraw - fee;

        require(usdcToken.transfer(platformWallet, fee), "Fee transfer failed");
        require(usdcToken.transfer(stream.recipient, payout), "Payout failed");

        if (block.timestamp >= stream.stopTime) {
            stream.isActive = false;
        }

        emit WithdrawnFromStream(streamId, stream.recipient, amountToWithdraw);
    }

    function cancelStream(uint256 streamId) external whenNotPaused nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        require(msg.sender == stream.sender || msg.sender == stream.recipient, "Not authorized");

        (uint256 recipientBalance, uint256 senderRefund) = _balanceOfStream(streamId);
        
        stream.amountWithdrawn += recipientBalance;
        stream.isActive = false;

        if (recipientBalance > 0) {
            uint256 fee = (recipientBalance * platformFeeBps) / 10000;
            uint256 payout = recipientBalance - fee;
            require(usdcToken.transfer(platformWallet, fee), "Fee transfer failed");
            require(usdcToken.transfer(stream.recipient, payout), "Payout failed");
        }

        if (senderRefund > 0) {
            require(usdcToken.transfer(stream.sender, senderRefund), "Refund failed");
        }

        emit StreamCancelled(streamId, stream.sender, stream.recipient, senderRefund, recipientBalance);
    }

    /// @notice Returns the current version — useful to verify upgrades worked
    function version() public pure returns (string memory) { return "2.0.0"; }

    // ─── Reserved storage gap for future upgrades ───
    uint256[50] private __gap;
}
