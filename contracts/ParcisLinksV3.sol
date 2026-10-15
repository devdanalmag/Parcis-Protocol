// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./utils/ReentrancyGuardUpgradeable.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/// @title ParcisLinks V3 (Upgradeable via UUPS Proxy)
/// @notice On-chain payment link registry with premium vanity slug support
/// @dev Uses OpenZeppelin UUPS pattern — data lives in proxy, logic is replaceable
contract ParcisLinksV3 is Initializable, UUPSUpgradeable, Ownable2StepUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    address public admin;
    IERC20 public usdc;

    enum LinkType { Fixed, Open, Group, Stream }

    struct Link {
        address creator;
        string  label;
        uint256 amount;
        string  description;
        LinkType linkType;
        uint8   groupTarget;
        bool    active;
        uint256 createdAt;
        uint256 totalRaised;
        uint256 paymentCount;
    }

    mapping(bytes32 => Link) private _links;
    mapping(address => bytes32[]) private _userLinks;

    // ─── V3 State: Premium Slug Revenue ───
    address public platformWallet;
    uint256 public premiumSlugFee;          // in USDC smallest unit (6 decimals)
    mapping(bytes32 => bool) public isPremiumSlug;

    event LinkCreated(bytes32 indexed id, address indexed creator, LinkType linkType, uint256 amount);
    event LinkDeactivated(bytes32 indexed id);
    event PaymentReceived(bytes32 indexed id, address indexed payer, address indexed creator, uint256 amount);
    event PremiumSlugPurchased(bytes32 indexed id, address indexed creator, uint256 fee);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Replaces the old constructor — called once when proxy is first deployed
    function initialize(address _admin, address _usdc) public initializer {
        __Ownable_init(msg.sender);
        __Ownable2Step_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        admin = _admin;
        usdc = IERC20(_usdc);
    }

    /// @notice V3 initializer — sets premium slug fee and platform wallet
    function initializeV3(address _platformWallet, uint256 _premiumSlugFee) public reinitializer(2) {
        require(_platformWallet != address(0), "Zero address");
        platformWallet = _platformWallet;
        premiumSlugFee = _premiumSlugFee;   // e.g. 500_000 = $0.50 USDC (6 decimals)
    }

    /// @notice Reinitializer for existing deployed proxies to enable circuit breaker and 2-step ownership
    function initializeSecurity() public reinitializer(3) {
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

    modifier onlyAdmin() { require(msg.sender == admin, "Only admin"); _; }

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS LOGIC
    // ═══════════════════════════════════════════════════════════════

    /// @notice Create a free link (random slug — no fee)
    function createLink(
        bytes32     id,
        string calldata label,
        uint256     amount,
        string calldata description,
        LinkType    linkType,
        uint8       groupTarget
    ) external whenNotPaused {
        _store(msg.sender, id, label, amount, description, linkType, groupTarget);
    }

    /// @notice Create a premium link (custom vanity slug — charges premiumSlugFee)
    function createPremiumLink(
        bytes32     id,
        string calldata label,
        uint256     amount,
        string calldata description,
        LinkType    linkType,
        uint8       groupTarget
    ) external whenNotPaused nonReentrant {
        require(platformWallet != address(0), "Platform wallet not set");
        require(premiumSlugFee > 0, "Premium fee not configured");
        // Collect the premium slug fee from the creator
        require(usdc.transferFrom(msg.sender, platformWallet, premiumSlugFee), "Premium fee transfer failed");
        isPremiumSlug[id] = true;
        emit PremiumSlugPurchased(id, msg.sender, premiumSlugFee);
        _store(msg.sender, id, label, amount, description, linkType, groupTarget);
    }

    /// @notice Admin-sponsored link creation (free tier only — no premium)
    function createLinkFor(
        address     creator,
        bytes32     id,
        string calldata label,
        uint256     amount,
        string calldata description,
        LinkType    linkType,
        uint8       groupTarget
    ) external onlyAdmin whenNotPaused {
        _store(creator, id, label, amount, description, linkType, groupTarget);
    }

    function _store(
        address creator, bytes32 id, string memory label,
        uint256 amount, string memory description,
        LinkType linkType, uint8 groupTarget
    ) internal {
        require(_links[id].creator == address(0), "ID already taken");
        require(bytes(label).length > 0, "Label required");
        require(bytes(label).length <= 64, "Label too long");
        if (linkType == LinkType.Group) require(groupTarget >= 2, "Group needs 2+");
        if (linkType == LinkType.Stream) require(groupTarget >= 1, "Stream needs 1+ days");

        _links[id] = Link(creator, label, amount, description, linkType, groupTarget, true, block.timestamp, 0, 0);
        _userLinks[creator].push(id);
        emit LinkCreated(id, creator, linkType, amount);
    }

    function payLink(bytes32 id, uint256 amount) external whenNotPaused nonReentrant {
        Link storage link = _links[id];
        require(link.active, "Link not active");
        require(amount > 0, "Zero amount");
        if (link.linkType == LinkType.Fixed) {
            require(amount == link.amount, "Must pay exact amount");
        }
        link.totalRaised += amount;
        link.paymentCount += 1;
        require(usdc.transferFrom(msg.sender, link.creator, amount), "USDC transfer failed");
        emit PaymentReceived(id, msg.sender, link.creator, amount);
    }

    function deactivateLink(bytes32 id) external whenNotPaused {
        require(_links[id].creator == msg.sender || msg.sender == admin, "Not authorized");
        _links[id].active = false;
        emit LinkDeactivated(id);
    }

    // ─── Views ───
    function getLink(bytes32 id) external view returns (Link memory) { return _links[id]; }
    function getUserLinks(address user) external view returns (bytes32[] memory) { return _userLinks[user]; }
    function isIdAvailable(bytes32 id) external view returns (bool) { return _links[id].creator == address(0); }

    // ─── Admin management ───
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        admin = newAdmin;
    }

    function setPremiumSlugFee(uint256 _fee) external onlyAdmin {
        premiumSlugFee = _fee;
    }

    function setPlatformWallet(address _wallet) external onlyAdmin {
        require(_wallet != address(0), "Zero address");
        platformWallet = _wallet;
    }

    /// @notice Returns the current version — useful to verify upgrades worked
    function version() public pure returns (string memory) { return "3.1.0"; }

    // ─── Reserved storage gap for future upgrades ───
    uint256[50] private __gap;
}
