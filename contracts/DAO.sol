//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract DAO {
    address owner;
    Token public token;
    uint256 public quorum;
    uint256 public proposalCount;

    struct Proposal {
        uint256 id;
        string name;
        uint256 amount;
        address payable recipient;
        uint256 votes;
        bool finalized;
    }

    event Finalize(uint256 id);
    event Vote(uint256 id, address investor);
    event Propose(
        uint256 id,
        uint256 amount,
        address recipient,
        address creator
    );

    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) votes;

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    // Allow contract to receive ether
    receive() external payable {}

    modifier InvestorOnly() {
        require(token.balanceOf(msg.sender) > 0, "Must be token holder");
        _;
    }

    function createProposal(
        string memory _name,
        uint256 _amount,
        address payable _recipient
    ) external InvestorOnly {
        // address(this).balance is the balance of the contract
        require(address(this).balance >= _amount, "Insufficient balance");

        proposalCount++;
        // Save proposal to mapping
        proposals[proposalCount] = Proposal(
            proposalCount,
            _name,
            _amount,
            _recipient,
            0,
            false
        );

        emit Propose(proposalCount, _amount, _recipient, msg.sender);
    }

    function vote(uint256 _id) external InvestorOnly {
        //fetch proposal from mappig by id
        Proposal storage proposal = proposals[_id];

        // Dont let invester vote twice
        require(!votes[msg.sender][_id], "Investor can only vote once");

        //update votes
        proposal.votes += token.balanceOf(msg.sender);

        //track that use has voted
        votes[msg.sender][_id] = true;

        //emit and event
        emit Vote(_id, msg.sender);
    }

    function finalizeProposal(uint256 _id) external InvestorOnly {
        //Fetch proposal from mapping
        Proposal storage proposal = proposals[_id];

        //Ensure proposal is not already finalized
        require(proposal.finalized == false, "Proposal already finalized");

        //Mark proposal as finalized
        proposal.finalized = true;

        //Check that proposal has enough votes
        require(proposal.votes >= quorum, "Quorum not met");

        //Check that the contract has enough ether
        require(
            address(this).balance >= proposal.amount,
            "Insufficient balance"
        );

        //transfer the funds
        (bool sent, ) = proposal.recipient.call{value: proposal.amount}("");
        require(sent, "Failed to send Ether");

        //emit event
        emit Finalize(_id);
    }
}
