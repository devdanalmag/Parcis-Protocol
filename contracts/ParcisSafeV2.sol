// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./utils/ReentrancyGuardUpgradeable.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title ParcisSafe V2 (Upgradeable via UUPS Proxy)
/// @notice Trustless escrow for freelance deals with Platform/Personal Arbiters and Staking
contract ParcisSafeV2 is Initializable, UUPSUpgradeable, Ownable2StepUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    enum Status { Created, Funded, Submitted, Completed, Disputed, Resolved, Cancelled, Appealed }

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

    // ─── V2 Upgrade State Variables (appended to end to preserve storage layout) ───
    mapping(address => bool) public isPlatformArbiter;
    mapping(address => uint256) public arbiterStake;
    mapping(address => uint256) public arbiterTrustScore;
    mapping(address => uint256) public arbiterDisputesResolved;
    address[] public platformArbiters;
    uint256 public minArbiterStake;
    mapping(uint256 => string) public disputeReasons;
    mapping(address => uint256) public activeDisputes;

    // ─── V2.1 Upgrade: Appeal System, Slashing & Fair Fallback ───
    mapping(uint256 => uint256) public resolutionTimestamp;
    mapping(uint256 => bool) public resolutionForWorker;
    uint256 public appealWindowDuration;
    mapping(uint256 => Status) public preDisputeStatus;

    // Events
    event DealCreated(uint256 indexed dealId, address indexed client, address indexed worker, uint256 amount, string title);
    event DealFunded(uint256 indexed dealId);
    event DeliverableSubmitted(uint256 indexed dealId, string deliverable);
    event DealCompleted(uint256 indexed dealId, uint256 workerPayout, uint256 platformFee);
    event DealDisputed(uint256 indexed dealId, address indexed disputedBy, string reason);
    event DisputeResolved(uint256 indexed dealId, bool inFavorOfWorker);
    event DealCancelled(uint256 indexed dealId);
    event ArbiterRegistered(address indexed arbiter, uint256 stakeAmount);
    event ArbiterWithdrawn(address indexed arbiter, uint256 stakeAmount);
    event ArbiterSlashed(address indexed arbiter, uint256 slashAmount, string reason);
    event ResolutionAppealed(uint256 indexed dealId, address indexed appealedBy);
    event AppealFinalized(uint256 indexed dealId, bool inFavorOfWorker);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Replaces constructor in upgradeable contracts
    function initialize(address _usdc, address _platformWallet) public initializer {
        __Ownable_init(msg.sender);
        __Ownable2Step_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        usdc = IERC20(_usdc);
        platformWallet = _platformWallet;
    }

    /// @notice Initializer for V2 specific state variables
    function initializeV2() public reinitializer(2) {
        minArbiterStake = 100 * 10**6; // 100 USDC (6 decimals)
    }

    /// @notice Initializer for V2.1 — appeal system & fair fallback
    function initializeV2_1() public reinitializer(3) {
        appealWindowDuration = 172800; // 48 hours in seconds
    }

    /// @notice Initializer for V2.2 — circuit breaker (Pausable) and 2-step ownership
    function initializeV2_2() public reinitializer(4) {
        __Ownable2Step_init();
        __Pausable_init();
        __ReentrancyGuard_init();
    }

    /// @notice Emergency circuit breaker — freeze protocol actions
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
    // ARBITER MANAGEMENT (NEW IN V2)
    // ═══════════════════════════════════════════════════════════════

    /// @notice Stake USDC to become a platform arbiter
    function registerAsArbiter(uint256 _stakeAmount) external whenNotPaused nonReentrant {
        require(_stakeAmount >= minArbiterStake, "Stake below minimum of 100 USDC");
        require(usdc.transferFrom(msg.sender, address(this), _stakeAmount), "Stake transfer failed");
        
        if (!isPlatformArbiter[msg.sender]) {
            isPlatformArbiter[msg.sender] = true;
            platformArbiters.push(msg.sender);
            arbiterTrustScore[msg.sender] = 100; // Default trust score
        }
        arbiterStake[msg.sender] += _stakeAmount;
        
        emit ArbiterRegistered(msg.sender, _stakeAmount);
    }

    /// @notice Withdraw all stake and resign from platform arbiters list
    function withdrawArbiterStake() external whenNotPaused nonReentrant {
        require(isPlatformArbiter[msg.sender], "Not registered as arbiter");
        require(activeDisputes[msg.sender] == 0, "Cannot withdraw stake with active disputes");
        uint256 amount = arbiterStake[msg.sender];
        require(amount > 0, "No stake to withdraw");
        
        arbiterStake[msg.sender] = 0;
        isPlatformArbiter[msg.sender] = false;
        
        // Remove from dynamic array
        for (uint256 i = 0; i < platformArbiters.length; i++) {
            if (platformArbiters[i] == msg.sender) {
                platformArbiters[i] = platformArbiters[platformArbiters.length - 1];
                platformArbiters.pop();
                break;
            }
        }
        
        require(usdc.transfer(msg.sender, amount), "Stake withdrawal failed");
        emit ArbiterWithdrawn(msg.sender, amount);
    }

    /// @notice Set the minimum stake required to become an arbiter
    function setMinArbiterStake(uint256 _newMin) external onlyOwner {
        minArbiterStake = _newMin;
    }

    /// @notice Set the appeal window duration in seconds
    function setAppealWindowDuration(uint256 _duration) external onlyOwner {
        appealWindowDuration = _duration;
    }

    /// @notice Slash an arbiter's stake for collusion or malicious behavior
    function slashArbiter(address _arbiter, uint256 _slashAmount, string calldata _reason) external onlyOwner nonReentrant {
        require(isPlatformArbiter[_arbiter], "Not a platform arbiter");
        require(arbiterStake[_arbiter] >= _slashAmount, "Slash amount exceeds stake");
        
        arbiterStake[_arbiter] -= _slashAmount;
        arbiterTrustScore[_arbiter] = 0; // Zero out trust — removes from selection pool
        
        // If stake drops to 0, fully remove from arbiter pool
        if (arbiterStake[_arbiter] == 0) {
            isPlatformArbiter[_arbiter] = false;
            for (uint256 i = 0; i < platformArbiters.length; i++) {
                if (platformArbiters[i] == _arbiter) {
                    platformArbiters[i] = platformArbiters[platformArbiters.length - 1];
                    platformArbiters.pop();
                    break;
                }
            }
        }
        
        // Slashed funds go to platform treasury
        require(usdc.transfer(platformWallet, _slashAmount), "Slash transfer failed");
        emit ArbiterSlashed(_arbiter, _slashAmount, _reason);
    }

    /// @notice Get the complete list of active platform arbiters
    function getPlatformArbiters() external view returns (address[] memory) {
        return platformArbiters;
    }

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS LOGIC (UPDATED IN V2)
    // ═══════════════════════════════════════════════════════════════

    function createDeal(address _worker, address _arbiter, uint256 _amount, uint256 _deadline, string calldata _title, string calldata _description) external whenNotPaused returns (uint256) {
        require(_worker != address(0) && _worker != msg.sender, "Invalid worker address");
        require(_amount > 0 && _deadline > block.timestamp, "Invalid amount or deadline");
        
        // If they chose a Platform Arbiter, make sure they are active
        if (_arbiter != address(0)) {
            // Note: If they chose a personal arbiter address who is not registered, it's still allowed.
        }

        uint256 id = dealCount++;
        Deal storage d = deals[id];
        d.client = msg.sender; 
        d.worker = _worker; 
        d.arbiter = _arbiter;
        d.amount = _amount; 
        d.deadline = _deadline; 
        d.title = _title;
        d.description = _description; 
        d.status = Status.Created; 
        d.createdAt = block.timestamp;
        
        clientDeals[msg.sender].push(id);
        workerDeals[_worker].push(id);
        if (_arbiter != address(0)) {
            arbiterDeals[_arbiter].push(id);
        }
        emit DealCreated(id, msg.sender, _worker, _amount, _title);
        return id;
    }

    function fundDeal(uint256 _id) external whenNotPaused nonReentrant {
        Deal storage d = deals[_id];
        require(d.client == msg.sender, "Only client can fund");
        require(d.status == Status.Created, "Deal is not in Created state");
        require(usdc.transferFrom(msg.sender, address(this), d.amount), "USDC funding transfer failed");
        d.status = Status.Funded;
        emit DealFunded(_id);
    }

    function submitDeliverable(uint256 _id, string calldata _deliverable) external whenNotPaused {
        Deal storage d = deals[_id];
        require(d.worker == msg.sender, "Only worker can submit work");
        require(d.status == Status.Funded, "Deal is not Funded or is already completed/cancelled");
        d.deliverable = _deliverable;
        d.status = Status.Submitted;
        emit DeliverableSubmitted(_id, _deliverable);
    }

    function approveDeal(uint256 _id) external whenNotPaused nonReentrant {
        Deal storage d = deals[_id];
        require(d.client == msg.sender, "Only client can approve deal");
        require(d.status == Status.Submitted, "Deal must be in Submitted state to approve");
        
        uint256 fee = (d.amount * PLATFORM_FEE_BPS) / 10000;
        require(usdc.transfer(d.worker, d.amount - fee), "USDC transfer to worker failed");
        if (fee > 0) {
            require(usdc.transfer(platformWallet, fee), "USDC transfer to platform failed");
        }
        
        d.status = Status.Completed;
        emit DealCompleted(_id, d.amount - fee, fee);
    }

    function disputeDeal(uint256 _id, string calldata _reason) external whenNotPaused {
        Deal storage d = deals[_id];
        require(d.client == msg.sender || d.worker == msg.sender, "Only contract parties can dispute");
        require(d.status == Status.Funded || d.status == Status.Submitted, "Deal is not Funded or Submitted");
        
        // Record pre-dispute status for fair fallback split
        preDisputeStatus[_id] = d.status;
        d.status = Status.Disputed;
        disputeReasons[_id] = _reason;
        
        // Lock arbiter's stake by tracking active dispute
        if (d.arbiter != address(0) && isPlatformArbiter[d.arbiter]) {
            activeDisputes[d.arbiter] += 1;
        }
        
        emit DealDisputed(_id, msg.sender, _reason);
    }

    /// @notice Arbiter resolves a dispute — funds are HELD for appeal window, not distributed yet
    function resolveDispute(uint256 _id, bool _forWorker) external whenNotPaused nonReentrant {
        Deal storage d = deals[_id];
        require(d.arbiter == msg.sender, "Only assigned arbiter can resolve");
        require(d.status == Status.Disputed, "Deal is not in a disputed state");
        
        // 0.5% (50 BPS) fee paid to the arbiter immediately (they performed work)
        uint256 arbiterFee = (d.amount * 50) / 10000;
        
        if (isPlatformArbiter[msg.sender]) {
            arbiterDisputesResolved[msg.sender] += 1;
            if (arbiterTrustScore[msg.sender] < 100) {
                arbiterTrustScore[msg.sender] += 1;
            }
        }
        
        // Pay arbiter fee immediately — they performed resolution work regardless of appeal
        if (arbiterFee > 0) {
            require(usdc.transfer(d.arbiter, arbiterFee), "USDC arbiter fee transfer failed");
        }
        
        // Record outcome and start appeal window — main funds held in escrow
        resolutionForWorker[_id] = _forWorker;
        resolutionTimestamp[_id] = block.timestamp;
        
        // Release arbiter's dispute lock
        if (isPlatformArbiter[msg.sender] && activeDisputes[msg.sender] > 0) {
            activeDisputes[msg.sender] -= 1;
        }
        
        d.status = Status.Resolved;
        emit DisputeResolved(_id, _forWorker);
    }

    /// @notice Finalize a resolved dispute after the appeal window expires — distributes funds
    function finalizeResolution(uint256 _id) external whenNotPaused nonReentrant {
        Deal storage d = deals[_id];
        require(d.status == Status.Resolved, "Deal is not in Resolved state");
        require(
            block.timestamp > resolutionTimestamp[_id] + appealWindowDuration,
            "Appeal window has not expired"
        );
        
        uint256 arbiterFee = (d.amount * 50) / 10000;
        
        if (resolutionForWorker[_id]) {
            uint256 platformFee = (d.amount * PLATFORM_FEE_BPS) / 10000;
            uint256 workerPayout = d.amount - platformFee - arbiterFee;
            require(usdc.transfer(d.worker, workerPayout), "USDC payout to worker failed");
            if (platformFee > 0) {
                require(usdc.transfer(platformWallet, platformFee), "USDC platform fee failed");
            }
        } else {
            uint256 clientRefund = d.amount - arbiterFee;
            require(usdc.transfer(d.client, clientRefund), "USDC refund to client failed");
        }
        
        d.status = Status.Completed;
        emit DealCompleted(_id, d.amount, 0);
    }

    /// @notice Appeal a resolved dispute within the appeal window
    function appealResolution(uint256 _id) external whenNotPaused nonReentrant {
        Deal storage d = deals[_id];
        require(d.client == msg.sender || d.worker == msg.sender, "Only deal parties can appeal");
        require(d.status == Status.Resolved, "Deal is not in Resolved state");
        require(
            block.timestamp <= resolutionTimestamp[_id] + appealWindowDuration,
            "Appeal window has expired"
        );
        
        d.status = Status.Appealed;
        emit ResolutionAppealed(_id, msg.sender);
    }

    /// @notice Platform owner finalizes an appealed dispute with the final ruling
    function finalizeAppeal(uint256 _id, bool _forWorker) external onlyOwner nonReentrant {
        Deal storage d = deals[_id];
        require(d.status == Status.Appealed, "Deal is not in Appealed state");
        
        uint256 arbiterFee = (d.amount * 50) / 10000;
        
        if (_forWorker) {
            uint256 platformFee = (d.amount * PLATFORM_FEE_BPS) / 10000;
            uint256 workerPayout = d.amount - platformFee - arbiterFee;
            require(usdc.transfer(d.worker, workerPayout), "USDC payout to worker failed");
            if (platformFee > 0) {
                require(usdc.transfer(platformWallet, platformFee), "USDC platform fee failed");
            }
        } else {
            uint256 clientRefund = d.amount - arbiterFee;
            require(usdc.transfer(d.client, clientRefund), "USDC refund to client failed");
        }
        
        d.status = Status.Completed;
        emit AppealFinalized(_id, _forWorker);
    }

    function cancelDeal(uint256 _id) external whenNotPaused {
        Deal storage d = deals[_id];
        require(d.client == msg.sender, "Only client can cancel");
        require(d.status == Status.Created, "Cannot cancel once funded or completed");
        d.status = Status.Cancelled;
        emit DealCancelled(_id);
    }

    function renewDeal(uint256 _id, uint256 _newDeadline) external whenNotPaused {
        Deal storage d = deals[_id];
        require(d.client == msg.sender, "Only client can renew");
        require(d.status == Status.Created || d.status == Status.Funded, "Invalid deal status");
        require(_newDeadline > block.timestamp, "Deadline must be in the future");
        d.deadline = _newDeadline;
    }

    function withdrawExpiredDeal(uint256 _id) external whenNotPaused nonReentrant {
        Deal storage d = deals[_id];
        require(d.client == msg.sender, "Only client can withdraw expired funds");
        require(d.status == Status.Funded, "Deal is not Funded or is already resolved/completed");
        require(block.timestamp > d.deadline, "Deal has not expired yet");
        d.status = Status.Cancelled;
        require(usdc.transfer(d.client, d.amount), "USDC refund to client failed");
        emit DealCancelled(_id);
    }

    function fallbackResolve(uint256 _id) external whenNotPaused nonReentrant {
        Deal storage d = deals[_id];
        require(d.client == msg.sender || d.worker == msg.sender, "Only party can invoke fallback");
        require(d.status == Status.Disputed, "Deal is not in Disputed state");
        require(block.timestamp > d.deadline, "Deal has not expired yet");
        
        // Penalize arbiter for inaction — trust decay and release dispute lock
        if (d.arbiter != address(0) && isPlatformArbiter[d.arbiter]) {
            if (activeDisputes[d.arbiter] > 0) {
                activeDisputes[d.arbiter] -= 1;
            }
            if (arbiterTrustScore[d.arbiter] > 5) {
                arbiterTrustScore[d.arbiter] -= 5;
            } else {
                arbiterTrustScore[d.arbiter] = 0;
            }
        }
        
        // Fair split: if worker had submitted deliverables, split 50/50
        // If worker never submitted (dispute on Funded), full refund to client
        if (preDisputeStatus[_id] == Status.Submitted) {
            uint256 halfAmount = d.amount / 2;
            uint256 clientShare = d.amount - halfAmount; // handles odd wei amounts
            require(usdc.transfer(d.worker, halfAmount), "USDC split to worker failed");
            require(usdc.transfer(d.client, clientShare), "USDC split to client failed");
        } else {
            require(usdc.transfer(d.client, d.amount), "USDC refund to client failed");
        }
        
        d.status = Status.Completed;
        emit DisputeResolved(_id, false);
    }

    // ─── Views ───
    function getDeal(uint256 _id) external view returns (Deal memory) { return deals[_id]; }
    function getClientDeals(address _a) external view returns (uint256[] memory) { return clientDeals[_a]; }
    function getWorkerDeals(address _a) external view returns (uint256[] memory) { return workerDeals[_a]; }
    function getArbiterDeals(address _a) external view returns (uint256[] memory) { return arbiterDeals[_a]; }

    /// @notice Composite score combining trust, experience, and stake for arbiter ranking
    /// @dev Formula: trust × (disputesResolved + 1) × stakeInUSDC
    /// @return Weighted score (higher = more reliable and experienced)
    function getArbiterWeightedScore(address _arbiter) external view returns (uint256) {
        if (!isPlatformArbiter[_arbiter]) return 0;
        uint256 trust = arbiterTrustScore[_arbiter];
        uint256 experience = arbiterDisputesResolved[_arbiter] + 1;
        uint256 stakeUSDC = arbiterStake[_arbiter] / 10**6;
        return trust * experience * stakeUSDC;
    }

    /// @notice Returns current version
    function version() public pure returns (string memory) { return "2.2.0"; }

    // ─── Reserved storage gap for future upgrades ───
    uint256[50] private __gap;
}
