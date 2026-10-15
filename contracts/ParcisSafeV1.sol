// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title ParcisSafe V1 (Upgradeable via UUPS Proxy)
/// @notice Trustless escrow for freelance deals on Arc Network
/// @dev Uses OpenZeppelin UUPS pattern — data lives in proxy, logic is replaceable
contract ParcisSafeV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    enum Status { Created, Funded, Submitted, Completed, Disputed, Resolved, Cancelled }

    struct Deal {
        address client;
        address worker;
        address arbiter;
        uint256 amount;
        uint256 deadline;
        string title;
        string description;
        string deliverable;
        Status status;
        uint256 createdAt;
    }

    IERC20 public usdc;
    address public platformWallet;
    uint256 public constant PLATFORM_FEE_BPS = 25;
    uint256 public dealCount;
    mapping(uint256 => Deal) public deals;
    mapping(address => uint256[]) public clientDeals;
    mapping(address => uint256[]) public workerDeals;
    mapping(address => uint256[]) public arbiterDeals;

    event DealCreated(uint256 indexed dealId, address indexed client, address indexed worker, uint256 amount, string title);
    event DealFunded(uint256 indexed dealId);
    event DeliverableSubmitted(uint256 indexed dealId, string deliverable);
    event DealCompleted(uint256 indexed dealId, uint256 workerPayout, uint256 platformFee);
    event DealDisputed(uint256 indexed dealId, address disputedBy);
    event DisputeResolved(uint256 indexed dealId, bool inFavorOfWorker);
    event DealCancelled(uint256 indexed dealId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Replaces the old constructor — called once when proxy is first deployed
    function initialize(address _usdc, address _platformWallet) public initializer {
        __Ownable_init(msg.sender);
        usdc = IERC20(_usdc);
        platformWallet = _platformWallet;
    }

    /// @notice Only the owner can authorize upgrades (security)
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS LOGIC — identical to the original ParcisSafe
    // ═══════════════════════════════════════════════════════════════

    function createDeal(address _worker, address _arbiter, uint256 _amount, uint256 _deadline, string calldata _title, string calldata _description) external returns (uint256) {
        require(_worker != address(0) && _worker != msg.sender, "Invalid worker");
        require(_amount > 0 && _deadline > block.timestamp, "Invalid params");
        uint256 id = dealCount++;
        Deal storage d = deals[id];
        d.client = msg.sender; d.worker = _worker; d.arbiter = _arbiter;
        d.amount = _amount; d.deadline = _deadline; d.title = _title;
        d.description = _description; d.status = Status.Created; d.createdAt = block.timestamp;
        clientDeals[msg.sender].push(id);
        workerDeals[_worker].push(id);
        if (_arbiter != address(0)) {
            arbiterDeals[_arbiter].push(id);
        }
        emit DealCreated(id, msg.sender, _worker, _amount, _title);
        return id;
    }

    function fundDeal(uint256 _id) external {
        Deal storage d = deals[_id];
        require(d.client == msg.sender && d.status == Status.Created, "Cannot fund");
        require(usdc.transferFrom(msg.sender, address(this), d.amount), "Transfer failed");
        d.status = Status.Funded;
        emit DealFunded(_id);
    }

    function submitDeliverable(uint256 _id, string calldata _deliverable) external {
        Deal storage d = deals[_id];
        require(d.worker == msg.sender && d.status == Status.Funded, "Cannot submit");
        d.deliverable = _deliverable;
        d.status = Status.Submitted;
        emit DeliverableSubmitted(_id, _deliverable);
    }

    function approveDeal(uint256 _id) external {
        Deal storage d = deals[_id];
        require(d.client == msg.sender && d.status == Status.Submitted, "Cannot approve");
        uint256 fee = (d.amount * PLATFORM_FEE_BPS) / 10000;
        require(usdc.transfer(d.worker, d.amount - fee), "Payout failed");
        if (fee > 0) usdc.transfer(platformWallet, fee);
        d.status = Status.Completed;
        emit DealCompleted(_id, d.amount - fee, fee);
    }

    function disputeDeal(uint256 _id) external {
        Deal storage d = deals[_id];
        require(d.client == msg.sender || d.worker == msg.sender, "Not party");
        require(d.status == Status.Funded || d.status == Status.Submitted, "Cannot dispute");
        d.status = Status.Disputed;
        emit DealDisputed(_id, msg.sender);
    }

    function resolveDispute(uint256 _id, bool _forWorker) external {
        Deal storage d = deals[_id];
        require(d.arbiter == msg.sender && d.status == Status.Disputed, "Cannot resolve");
        if (_forWorker) {
            uint256 fee = (d.amount * PLATFORM_FEE_BPS) / 10000;
            usdc.transfer(d.worker, d.amount - fee);
            if (fee > 0) usdc.transfer(platformWallet, fee);
        } else {
            usdc.transfer(d.client, d.amount);
        }
        d.status = Status.Resolved;
        emit DisputeResolved(_id, _forWorker);
    }

    function cancelDeal(uint256 _id) external {
        Deal storage d = deals[_id];
        require(d.client == msg.sender && d.status == Status.Created, "Cannot cancel");
        d.status = Status.Cancelled;
        emit DealCancelled(_id);
    }

    function renewDeal(uint256 _id, uint256 _newDeadline) external {
        Deal storage d = deals[_id];
        require(d.client == msg.sender, "Not client");
        require(d.status == Status.Created || d.status == Status.Funded, "Invalid status");
        require(_newDeadline > block.timestamp, "Invalid deadline");
        d.deadline = _newDeadline;
    }

    function withdrawExpiredDeal(uint256 _id) external {
        Deal storage d = deals[_id];
        require(d.client == msg.sender, "Not client");
        require(d.status == Status.Funded, "Invalid status");
        require(block.timestamp > d.deadline, "Not expired");
        d.status = Status.Cancelled;
        require(usdc.transfer(d.client, d.amount), "Refund failed");
        emit DealCancelled(_id);
    }

    function fallbackResolve(uint256 _id) external {
        Deal storage d = deals[_id];
        require(d.client == msg.sender || d.worker == msg.sender, "Not party");
        require(d.status == Status.Disputed, "Invalid status");
        require(block.timestamp > d.deadline, "Not expired");
        d.status = Status.Resolved;
        require(usdc.transfer(d.client, d.amount), "Refund failed");
        emit DisputeResolved(_id, false);
    }

    // ─── Views ───
    function getDeal(uint256 _id) external view returns (Deal memory) { return deals[_id]; }
    function getClientDeals(address _a) external view returns (uint256[] memory) { return clientDeals[_a]; }
    function getWorkerDeals(address _a) external view returns (uint256[] memory) { return workerDeals[_a]; }
    function getArbiterDeals(address _a) external view returns (uint256[] memory) { return arbiterDeals[_a]; }

    /// @notice Returns the current version — useful to verify upgrades worked
    function version() public pure returns (string memory) { return "1.0.0"; }
}
