// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/// @title ParcisLinks V2 (Upgradeable via UUPS Proxy)
/// @notice On-chain payment link registry for Parcis on Arc Network
/// @dev Uses OpenZeppelin UUPS pattern — data lives in proxy, logic is replaceable
contract ParcisLinksV2 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
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

    event LinkCreated(bytes32 indexed id, address indexed creator, LinkType linkType, uint256 amount);
    event LinkDeactivated(bytes32 indexed id);
    event PaymentReceived(bytes32 indexed id, address indexed payer, address indexed creator, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Replaces the old constructor — called once when proxy is first deployed
    function initialize(address _admin, address _usdc) public initializer {
        __Ownable_init(msg.sender);
        admin = _admin;
        usdc = IERC20(_usdc);
    }

    /// @notice Only the owner can authorize upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    modifier onlyAdmin() { require(msg.sender == admin, "Only admin"); _; }

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS LOGIC
    // ═══════════════════════════════════════════════════════════════

    function createLink(
        bytes32     id,
        string calldata label,
        uint256     amount,
        string calldata description,
        LinkType    linkType,
        uint8       groupTarget
    ) external {
        _store(msg.sender, id, label, amount, description, linkType, groupTarget);
    }

    function createLinkFor(
        address     creator,
        bytes32     id,
        string calldata label,
        uint256     amount,
        string calldata description,
        LinkType    linkType,
        uint8       groupTarget
    ) external onlyAdmin {
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

    function payLink(bytes32 id, uint256 amount) external {
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

    function deactivateLink(bytes32 id) external {
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

    /// @notice Returns the current version — useful to verify upgrades worked
    function version() public pure returns (string memory) { return "2.0.0"; }
}
