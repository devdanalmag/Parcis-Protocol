// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/// @title Parcis Links Registry
/// @notice Stores payment link metadata and routes payments on-chain.
contract ParcisLinks {
    address public admin;
    IERC20 public usdc;

    enum LinkType { Fixed, Open, Group }

    struct Link {
        address creator;      // Who receives payment
        string  label;        // "DevDan Studio"
        uint256 amount;       // Target amount (0 = open/tip)
        string  description;
        LinkType linkType;
        uint8   groupTarget;  // Number of people
        bool    active;
        uint256 createdAt;
        uint256 totalRaised;  // Tracks total USDC paid to this link
        uint256 paymentCount; // Tracks number of payments
    }

    mapping(bytes32 => Link) private _links;
    mapping(address => bytes32[]) private _userLinks;

    event LinkCreated(bytes32 indexed id, address indexed creator, LinkType linkType, uint256 amount);
    event LinkDeactivated(bytes32 indexed id);
    event PaymentReceived(bytes32 indexed id, address indexed payer, address indexed creator, uint256 amount);

    modifier onlyAdmin() { require(msg.sender == admin, "Only admin"); _; }

    constructor(address _admin, address _usdc) {
        admin = _admin;
        usdc = IERC20(_usdc);
    }

    // ─── User creates their own link (pays own gas) ───
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

    // ─── Admin creates link for user (gas sponsorship) ───
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

        _links[id] = Link(creator, label, amount, description, linkType, groupTarget, true, block.timestamp, 0, 0);
        _userLinks[creator].push(id);
        emit LinkCreated(id, creator, linkType, amount);
    }

    // ─── Route Payment On-Chain ───
    function payLink(bytes32 id, uint256 amount) external {
        Link storage link = _links[id];
        require(link.active, "Link not active");
        require(amount > 0, "Zero amount");
        
        // If fixed amount, require exact payment
        if (link.linkType == LinkType.Fixed) {
            require(amount == link.amount, "Must pay exact amount");
        }

        // Update stats
        link.totalRaised += amount;
        link.paymentCount += 1;

        // Transfer USDC directly from Payer -> Creator (contract does not hold funds)
        require(usdc.transferFrom(msg.sender, link.creator, amount), "USDC transfer failed");

        emit PaymentReceived(id, msg.sender, link.creator, amount);
    }

    // ─── Deactivate a link ───
    function deactivateLink(bytes32 id) external {
        require(_links[id].creator == msg.sender || msg.sender == admin, "Not authorized");
        _links[id].active = false;
        emit LinkDeactivated(id);
    }

    // ─── Views ───
    function getLink(bytes32 id) external view returns (Link memory) {
        return _links[id];
    }

    function getUserLinks(address user) external view returns (bytes32[] memory) {
        return _userLinks[user];
    }

    function isIdAvailable(bytes32 id) external view returns (bool) {
        return _links[id].creator == address(0);
    }

    // ─── Admin management ───
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        admin = newAdmin;
    }
}
