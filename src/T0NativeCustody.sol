// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title T0NativeCustody
/// @notice Minimal Arc-native USDC custody spike.
/// @dev Arc uses USDC as the native gas/value asset. This contract intentionally
///      tests only: fund -> payout -> refund. It is NOT the product contract.
contract T0NativeCustody {
    error NotOwner();
    error WrongChain(uint256 expected, uint256 actual);
    error ZeroAddress();
    error ZeroAmount();
    error ContractClosed();
    error InsufficientBalance(uint256 requested, uint256 available);
    error NativeTransferFailed();
    error DirectFundingDisabled();
    error ReentrantCall();

    event Funded(
        address indexed sender,
        uint256 amount,
        bytes32 indexed reference,
        uint256 balanceAfter
    );

    event Paid(
        address indexed recipient,
        uint256 amount,
        bytes32 indexed reference,
        uint256 balanceAfter
    );

    event Refunded(
        address indexed owner,
        uint256 amount,
        bytes32 indexed reference,
        uint256 balanceAfter
    );

    event Closed(address indexed owner);

    address payable public immutable owner;
    uint256 public immutable expectedChainId;

    uint256 public totalFunded;
    uint256 public totalPaid;
    uint256 public totalRefunded;
    bool public closed;

    uint256 private _lock = 1;

    constructor(address payable owner_, uint256 expectedChainId_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
        expectedChainId = expectedChainId_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onExpectedChain() {
        if (block.chainid != expectedChainId) {
            revert WrongChain(expectedChainId, block.chainid);
        }
        _;
    }

    modifier whenOpen() {
        if (closed) revert ContractClosed();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert ReentrantCall();
        _lock = 2;
        _;
        _lock = 1;
    }

    /// @notice Explicitly fund the spike with Arc native USDC.
    /// @param reference Operator-chosen evidence correlation id.
    function fund(bytes32 reference)
        external
        payable
        onlyOwner
        onExpectedChain
        whenOpen
    {
        if (msg.value == 0) revert ZeroAmount();

        totalFunded += msg.value;

        emit Funded(msg.sender, msg.value, reference, address(this).balance);
    }

    /// @notice Pay native USDC from contract custody to a configured recipient.
    function payout(address payable recipient, uint256 amount, bytes32 reference)
        external
        onlyOwner
        onExpectedChain
        whenOpen
        nonReentrant
    {
        if (recipient == address(0) || recipient == address(this)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 available = address(this).balance;
        if (amount > available) revert InsufficientBalance(amount, available);

        totalPaid += amount;

        (bool ok, ) = recipient.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();

        emit Paid(recipient, amount, reference, address(this).balance);
    }

    /// @notice Return all remaining native USDC to the owner and permanently close T0.
    function refundAll(bytes32 reference)
        external
        onlyOwner
        onExpectedChain
        whenOpen
        nonReentrant
        returns (uint256 amount)
    {
        amount = address(this).balance;
        if (amount == 0) revert ZeroAmount();

        closed = true;
        totalRefunded += amount;

        (bool ok, ) = owner.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();

        emit Refunded(owner, amount, reference, address(this).balance);
        emit Closed(owner);
    }

    /// @notice Close a fully drained spike without moving value.
    function closeEmpty()
        external
        onlyOwner
        onExpectedChain
        whenOpen
    {
        if (address(this).balance != 0) {
            revert InsufficientBalance(address(this).balance, 0);
        }
        closed = true;
        emit Closed(owner);
    }

    /// @notice Read the accounting state used by the T0 evidence run.
    function snapshot()
        external
        view
        returns (
            uint256 balance,
            uint256 funded,
            uint256 paid,
            uint256 refunded,
            bool isClosed,
            uint256 chainId
        )
    {
        return (
            address(this).balance,
            totalFunded,
            totalPaid,
            totalRefunded,
            closed,
            block.chainid
        );
    }

    /// @dev Funding must go through fund(reference) so every intentional deposit
    ///      has a correlation event. Forced native transfers are outside T0 claims.
    receive() external payable {
        revert DirectFundingDisabled();
    }

    fallback() external payable {
        revert DirectFundingDisabled();
    }
}
