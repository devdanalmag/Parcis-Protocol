// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

interface IParcisStreams {
    function streams(uint256 streamId) external view returns (
        address sender,
        address recipient,
        uint256 depositAmount,
        uint256 startTime,
        uint256 stopTime,
        uint256 amountWithdrawn,
        bool isActive
    );
}

/// @title ParcisDevRegistry (Upgradeable via UUPS Proxy)
/// @notice Fully decentralized developer console registry on Arc Network
/// @dev Stores developer profiles, EIP-712 API key hashes, streams-linked subscriptions, and webhook configurations.
contract ParcisDevRegistry is Initializable, UUPSUpgradeable, Ownable2StepUpgradeable {
    IParcisStreams public parcisStreams;
    address public platformTreasury;
    address public apiRelayer;

    uint256 public constant SECONDS_PER_MONTH = 30 days;
    uint256 public constant TRIAL_DURATION = 30 days;

    // Pricing in USDC smallest unit (6 decimals)
    uint256 public constant PRO_30_DAYS_PRICE = 29 * 1e6;         // 29 USDC ($29)
    uint256 public constant ENTERPRISE_30_DAYS_PRICE = 149 * 1e6; // 149 USDC ($149)

    // Rate limits per monthly billing cycle
    uint256 public constant FREE_CALL_LIMIT = 500;
    uint256 public constant PRO_CALL_LIMIT = 50000;
    uint256 public constant ENTERPRISE_CALL_LIMIT = type(uint256).max;

    // Feature constraints
    uint256 public constant FREE_MAX_LINKS = 5;
    uint256 public constant FREE_MAX_DEALS = 3;
    uint256 public constant PRO_MAX_WEBHOOKS = 5;
    uint256 public constant ENTERPRISE_MAX_WEBHOOKS = 20;

    enum Tier { Free, Pro, Enterprise }

    struct Developer {
        address wallet;
        uint256 registeredAt;
        uint256 trialExpiry;        // registeredAt + TRIAL_DURATION
        uint256 activeStreamId;     // ParcisStreams streamId (0 if not active)
        Tier subscribedTier;        // Explicit tier chosen when attaching stream
        bytes32 apiKeyHash;         // keccak256 hash of wallet-derived API key
        uint256 apiCallsUsed;       // Counter of calls within current billing cycle
        uint256 cycleStartTime;     // Cycle reset timestamp
        bool active;
    }

    struct Webhook {
        string url;
        uint8 eventType;            // 0=All, 1=PaymentLinkPaid, 2=EscrowCreated, 3=EscrowReleased, 4=StreamCreated
        bool active;
    }

    mapping(address => Developer) public developers;
    mapping(bytes32 => address) public apiKeyHashToDev;
    mapping(address => Webhook[]) private _webhooks;

    uint256 public totalDevelopers;

    event DeveloperRegistered(address indexed dev, uint256 registeredAt, uint256 trialExpiry);
    event ApiKeyUpdated(address indexed dev, bytes32 indexed keyHash);
    event ApiKeyRevoked(address indexed dev);
    event SubscriptionLinked(address indexed dev, uint256 indexed streamId, Tier tier);
    event SubscriptionUnlinked(address indexed dev);
    event WebhookAdded(address indexed dev, uint256 indexed index, string url, uint8 eventType);
    event WebhookRemoved(address indexed dev, uint256 indexed index);
    event ApiUsageRecorded(address indexed dev, uint256 newTotal);
    event TreasuryUpdated(address indexed newTreasury);
    event RelayerUpdated(address indexed newRelayer);
    event StreamsContractUpdated(address indexed newStreams);

    modifier onlyRelayerOrOwner() {
        require(msg.sender == apiRelayer || msg.sender == owner(), "Unauthorized relayer");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _parcisStreams,
        address _platformTreasury,
        address _apiRelayer
    ) public initializer {
        require(_platformTreasury != address(0), "Invalid treasury");
        __Ownable_init(msg.sender);
        __Ownable2Step_init();

        parcisStreams = IParcisStreams(_parcisStreams);
        platformTreasury = _platformTreasury;
        apiRelayer = _apiRelayer;
    }

    /// @notice Reinitializer for existing deployed proxies to enable 2-step ownership
    function initializeSecurity() public reinitializer(2) {
        __Ownable2Step_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ═══════════════════════════════════════════════════════════════
    // DEVELOPER ONBOARDING & REGISTRATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Register caller as a Parcis Developer.
     * @dev Automatically activates a 30-day Pro trial with 50,000 calls and webhook access.
     */
    function register() external {
        require(developers[msg.sender].wallet == address(0), "Already registered");

        uint256 nowTime = block.timestamp;
        uint256 trialEnd = nowTime + TRIAL_DURATION;

        developers[msg.sender] = Developer({
            wallet: msg.sender,
            registeredAt: nowTime,
            trialExpiry: trialEnd,
            activeStreamId: 0,
            subscribedTier: Tier.Free,
            apiKeyHash: bytes32(0),
            apiCallsUsed: 0,
            cycleStartTime: nowTime,
            active: true
        });

        totalDevelopers++;

        emit DeveloperRegistered(msg.sender, nowTime, trialEnd);
    }

    // ═══════════════════════════════════════════════════════════════
    // EIP-712 DETERMINISTIC API KEY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Store the keccak256 hash of a wallet-signed API key.
     * @dev The raw API key is NEVER stored on-chain or transmitted to servers.
     * @param keyHash The keccak256 hash of the developer's API key.
     */
    function setApiKeyHash(bytes32 keyHash) external {
        Developer storage dev = developers[msg.sender];
        require(dev.active, "Developer not registered");
        require(keyHash != bytes32(0), "Invalid key hash");
        require(apiKeyHashToDev[keyHash] == address(0), "Key hash already in use");

        // Clear previous reverse mapping if rotating key
        if (dev.apiKeyHash != bytes32(0)) {
            delete apiKeyHashToDev[dev.apiKeyHash];
        }

        dev.apiKeyHash = keyHash;
        apiKeyHashToDev[keyHash] = msg.sender;

        emit ApiKeyUpdated(msg.sender, keyHash);
    }

    /**
     * @notice Instantly revoke the active API key globally.
     */
    function revokeApiKey() external {
        Developer storage dev = developers[msg.sender];
        require(dev.active, "Developer not registered");
        require(dev.apiKeyHash != bytes32(0), "No active key");

        bytes32 oldHash = dev.apiKeyHash;
        delete apiKeyHashToDev[oldHash];
        dev.apiKeyHash = bytes32(0);

        emit ApiKeyRevoked(msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════
    // PARCIS STREAMS SUBSCRIPTION LINKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Link an active ParcisStreams payment stream to unlock Pro or Enterprise tier.
     * @param streamId The ID of the stream in ParcisStreams.
     * @param tier Desired subscription tier (Tier.Pro or Tier.Enterprise).
     */
    function linkSubscriptionStream(uint256 streamId, Tier tier) external {
        Developer storage dev = developers[msg.sender];
        require(dev.active, "Developer not registered");
        require(tier == Tier.Pro || tier == Tier.Enterprise, "Invalid subscription tier");
        require(address(parcisStreams) != address(0), "Streams contract not set");

        (
            address sender,
            address recipient,
            uint256 depositAmount,
            uint256 startTime,
            uint256 stopTime,
            ,
            bool isActive
        ) = parcisStreams.streams(streamId);

        require(sender == msg.sender, "Caller not stream sender");
        require(recipient == platformTreasury, "Stream recipient must be platform treasury");
        require(isActive, "Stream not active");
        require(block.timestamp < stopTime, "Stream has ended");

        uint256 duration = stopTime - startTime;
        require(duration >= 1 days, "Stream duration must be at least 1 day");

        // Verify deposit meets minimum rate
        // rate = depositAmount / duration. We require rate >= requiredTotal / SECONDS_PER_MONTH
        // Re-arranged: depositAmount * SECONDS_PER_MONTH >= requiredTotal * duration
        uint256 requiredTotal = (tier == Tier.Enterprise) ? ENTERPRISE_30_DAYS_PRICE : PRO_30_DAYS_PRICE;
        require(
            (depositAmount * SECONDS_PER_MONTH) >= (requiredTotal * duration),
            "Stream rate insufficient for tier"
        );

        dev.activeStreamId = streamId;
        dev.subscribedTier = tier;

        emit SubscriptionLinked(msg.sender, streamId, tier);
    }

    /**
     * @notice Unlink active subscription stream (e.g. after cancellation).
     */
    function unlinkSubscriptionStream() external {
        Developer storage dev = developers[msg.sender];
        require(dev.active, "Developer not registered");
        require(dev.activeStreamId != 0, "No active stream linked");

        dev.activeStreamId = 0;
        dev.subscribedTier = Tier.Free;

        emit SubscriptionUnlinked(msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════
    // TIER & VERIFICATION QUERIES (VIEW)
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Computes effective tier and trial status for a developer.
     * @param devAddress Developer wallet address.
     */
    function getEffectiveTier(address devAddress) public view returns (
        Tier currentTier,
        bool isTrialActive,
        uint256 trialSecondsRemaining,
        bool isStreamActive
    ) {
        Developer memory dev = developers[devAddress];
        if (!dev.active) {
            return (Tier.Free, false, 0, false);
        }

        // Check active stream first
        if (dev.activeStreamId != 0 && address(parcisStreams) != address(0)) {
            (
                address sender,
                address recipient,
                ,
                ,
                uint256 stopTime,
                ,
                bool isActive
            ) = parcisStreams.streams(dev.activeStreamId);

            if (isActive && block.timestamp < stopTime && sender == devAddress && recipient == platformTreasury) {
                return (dev.subscribedTier, false, 0, true);
            }
        }

        // Check if 30-day Pro Trial is still running
        if (block.timestamp < dev.trialExpiry) {
            return (Tier.Pro, true, dev.trialExpiry - block.timestamp, false);
        }

        // Permanent fallback to Free Tier
        return (Tier.Free, false, 0, false);
    }

    /**
     * @notice Verify an API key hash for Edge middleware rate-limiting.
     * @param keyHash keccak256 hash of API key supplied in X-API-Key header.
     * @return devAddress Wallet of developer.
     * @return tier Effective tier.
     * @return callsUsed Number of calls used in current 30-day cycle.
     * @return callLimit Maximum calls allowed per cycle.
     * @return isValid True if key is active and within quota.
     */
    function verifyApiKey(bytes32 keyHash) external view returns (
        address devAddress,
        Tier tier,
        uint256 callsUsed,
        uint256 callLimit,
        bool isValid
    ) {
        devAddress = apiKeyHashToDev[keyHash];
        if (devAddress == address(0)) {
            return (address(0), Tier.Free, 0, 0, false);
        }

        Developer memory dev = developers[devAddress];
        if (!dev.active) {
            return (devAddress, Tier.Free, 0, 0, false);
        }

        (tier, , , ) = getEffectiveTier(devAddress);

        if (tier == Tier.Enterprise) {
            callLimit = ENTERPRISE_CALL_LIMIT;
        } else if (tier == Tier.Pro) {
            callLimit = PRO_CALL_LIMIT;
        } else {
            callLimit = FREE_CALL_LIMIT;
        }

        // Cycle reset calculation
        if (block.timestamp >= dev.cycleStartTime + SECONDS_PER_MONTH) {
            callsUsed = 0; // New period will start on next recordApiCall
        } else {
            callsUsed = dev.apiCallsUsed;
        }

        isValid = (callsUsed < callLimit);
    }

    /**
     * @notice Get full profile for a developer.
     */
    function getDeveloper(address devAddress) external view returns (
        Developer memory dev,
        Tier currentTier,
        bool isTrialActive,
        uint256 trialSecondsRemaining,
        bool isStreamActive,
        uint256 callLimit
    ) {
        dev = developers[devAddress];
        (currentTier, isTrialActive, trialSecondsRemaining, isStreamActive) = getEffectiveTier(devAddress);

        if (currentTier == Tier.Enterprise) {
            callLimit = ENTERPRISE_CALL_LIMIT;
        } else if (currentTier == Tier.Pro) {
            callLimit = PRO_CALL_LIMIT;
        } else {
            callLimit = FREE_CALL_LIMIT;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // USAGE RELAYING
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Record API calls made by a developer (batched or single).
     * @param devAddress Developer wallet.
     * @param count Number of calls to record.
     */
    function recordApiCall(address devAddress, uint256 count) external onlyRelayerOrOwner {
        Developer storage dev = developers[devAddress];
        require(dev.active, "Developer not active");

        if (block.timestamp >= dev.cycleStartTime + SECONDS_PER_MONTH) {
            dev.cycleStartTime = block.timestamp;
            dev.apiCallsUsed = count;
        } else {
            dev.apiCallsUsed += count;
        }

        emit ApiUsageRecorded(devAddress, dev.apiCallsUsed);
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Register a webhook endpoint URL on-chain.
     * @param url Webhook destination endpoint.
     * @param eventType 0=All, 1=PaymentLinkPaid, 2=EscrowCreated, 3=EscrowReleased, 4=StreamCreated.
     */
    function addWebhook(string calldata url, uint8 eventType) external {
        Developer memory dev = developers[msg.sender];
        require(dev.active, "Developer not registered");

        (Tier currentTier, , , ) = getEffectiveTier(msg.sender);
        require(currentTier != Tier.Free, "Webhooks require Pro or Enterprise tier");

        uint256 maxAllowed = (currentTier == Tier.Enterprise) ? ENTERPRISE_MAX_WEBHOOKS : PRO_MAX_WEBHOOKS;
        require(_webhooks[msg.sender].length < maxAllowed, "Max webhooks reached for tier");

        _webhooks[msg.sender].push(Webhook({
            url: url,
            eventType: eventType,
            active: true
        }));

        uint256 index = _webhooks[msg.sender].length - 1;
        emit WebhookAdded(msg.sender, index, url, eventType);
    }

    /**
     * @notice Remove a configured webhook endpoint.
     */
    function removeWebhook(uint256 index) external {
        Webhook[] storage list = _webhooks[msg.sender];
        require(index < list.length, "Invalid index");

        // Swap and pop
        list[index] = list[list.length - 1];
        list.pop();

        emit WebhookRemoved(msg.sender, index);
    }

    /**
     * @notice Retrieve all registered webhooks for a developer.
     */
    function getWebhooks(address devAddress) external view returns (Webhook[] memory) {
        return _webhooks[devAddress];
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    function setPlatformTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        platformTreasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setApiRelayer(address _relayer) external onlyOwner {
        apiRelayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    function setParcisStreams(address _streams) external onlyOwner {
        parcisStreams = IParcisStreams(_streams);
        emit StreamsContractUpdated(_streams);
    }

    // ─── Reserved storage gap for future upgrades ───
    uint256[50] private __gap;
}
