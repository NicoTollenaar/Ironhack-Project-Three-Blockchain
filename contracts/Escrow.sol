//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import "hardhat/console.sol";
import "./ChainAccount.sol";

// This is a simple escrow with one depositor, one beneficiary and one arbiter.
    // The contract can be expanded to deal with an undetermined number of parties.
    // Query: should there be one deployment per escrow or one deployment for multiple escrows
    // This contract assumes the latter.

contract EscrowContract {

    ChainAccount chainAccount;
    address public owner;
    uint public constant numberOfParties = 3; //one depositor, one beneficiary, one arbiter

    enum EscrowStatus {
        Proposed,
        Approved,
        FullyFunded,
        Executed,
        Withdrawn
    }

    struct Escrow {
        address proposer;
        address depositor;
        address beneficiary;
        address arbiter;
        uint escrowAmount;
        uint heldInDeposit;
        uint escrowId;
        EscrowStatus status;
    }

    Escrow[] public escrowArray;
    
    mapping (address=> mapping(uint => bool)) public consents;

    mapping (uint=>address[numberOfParties]) public parties;

	constructor(address addressChainAccount) {
        chainAccount = ChainAccount(addressChainAccount);
        owner = msg.sender;
	}

    event ProposedEscrow(address indexed proposer, uint indexed escrowId);
    function proposeEscrow(address _depositor, address _beneficiary, address _arbiter, uint _escrowAmount) public {
        uint escrowId = escrowArray.length;
        Escrow memory escrow = Escrow(msg.sender, _depositor, _beneficiary, _arbiter, _escrowAmount, 0, escrowId, EscrowStatus.Proposed);
        escrowArray.push(escrow);
        parties[escrowId] = [_depositor, _beneficiary, _arbiter];
        emit ProposedEscrow(msg.sender, escrowId);
        consentToEscrow(escrowId);
    }

    function getEscrowProposal(uint escrowId) public view returns (Escrow memory) {
        return escrowArray[escrowId];
    }

    function getParties(uint escrowId) public view returns(address[numberOfParties] memory) {
        return (parties[escrowId]);
    }

    function isParty(uint escrowId) public view returns(bool) {
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (parties[escrowId][i] == msg.sender) {
                return true;
            }
        }
        return false;           
    }

    event ConsentToEscrow(address indexed sender, uint indexed escrowId);
    event AllConsented(string indexed message, uint indexed escrowId);
    function consentToEscrow(uint escrowId) public {
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Escrow not or no longer up for consent");
        require(isParty(escrowId), "Only a party can consent to a proposed escrow");
        require(!consents[msg.sender][escrowId], "Consent already given");
        consents[msg.sender][escrowId] = true;
        if (allConsented(escrowId) == true) {
            escrowArray[escrowId].status = EscrowStatus.Approved;
            emit AllConsented("All have consented", escrowId);
            // chainAccount.approve(escrowArray[escrowId].arbiter, escrowArray[escrowId].escrowAmount);
        }
        emit ConsentToEscrow(msg.sender, escrowId);
    }

    function getConsents(uint escrowId) public view returns(address[3] memory) {
        address[3] memory consentedParties;
        uint index;
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (consents[parties[escrowId][i]][escrowId] == true) {
                consentedParties[index] = parties[escrowId][i];
                index++;
            }
        }
        return consentedParties;
    }

    function allConsented(uint escrowId) public view returns(bool) {
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (consents[parties[escrowId][i]][escrowId] == false) { 
                return false; 
            }
        }
        return true;
    }

    event DepositedInEscrow(uint indexed escrowId, uint indexed amount);
    event FullyFunded(uint indexed escrowId, uint indexed escrowAmount);
    function depositInEscrow(address depositor, uint amount, uint escrowId) public {
        require(escrowArray[escrowId].arbiter != address(0) && escrowArray[escrowId].beneficiary != address(0), "no address for beneficiary or arbiter");
        require(escrowArray[escrowId].status == EscrowStatus.Approved && 
        escrowArray[escrowId].status != EscrowStatus.FullyFunded, "Escrow not approved or already fully funded");
        require((escrowArray[escrowId].escrowAmount * 105) > ((escrowArray[escrowId].heldInDeposit + amount)*100), "Deposit exceeds escrow amount by more than 5%");
        bool success = chainAccount.transferFrom(depositor, address(this), amount);
        require(success, "transferFrom failed");
        escrowArray[escrowId].heldInDeposit += amount;
        emit DepositedInEscrow(escrowId, amount);
        if (escrowArray[escrowId].heldInDeposit >= escrowArray[escrowId].escrowAmount) {
            escrowArray[escrowId].status = EscrowStatus.FullyFunded;
            emit FullyFunded(escrowId, escrowArray[escrowId].escrowAmount);
            uint balanceOfThisContract = chainAccount.balanceOf(address(this));
            uint excessAmount = escrowArray[escrowId].heldInDeposit - escrowArray[escrowId].escrowAmount;
            if (balanceOfThisContract > excessAmount) {
                chainAccount.transfer(depositor, excessAmount);
                escrowArray[escrowId].heldInDeposit -= excessAmount;
            }
        }
    }

	event Executed(uint indexed escrowId, uint indexed amountApproved);
	function executeEscrow(uint escrowId, uint approvedAmount) external {
        require(escrowArray[escrowId].arbiter != address(0) && escrowArray[escrowId].beneficiary != address(0) && escrowArray[escrowId].depositor != address(0), "address lacking");
        require(allConsented(escrowId));
        require(escrowArray[escrowId].status == EscrowStatus.FullyFunded, "Escrow must be fully funded");
		require(msg.sender == escrowArray[escrowId].arbiter, "Only arbiter can approve");
        require(approvedAmount <= escrowArray[escrowId].escrowAmount, "Approved amount greater than escrow amount");
        require(approvedAmount <= escrowArray[escrowId].heldInDeposit, "Insufficient funds deposited");
        uint remainder = escrowArray[escrowId].heldInDeposit - approvedAmount;
		bool successTransferBeneficiary = chainAccount.transfer(escrowArray[escrowId].beneficiary, approvedAmount);
        require(successTransferBeneficiary, "Transfer to beneficiary failed");
        escrowArray[escrowId].heldInDeposit -= approvedAmount;
        bool successTransferDepositor = chainAccount.transfer(escrowArray[escrowId].depositor, remainder);
        require(successTransferDepositor, "Transfer to depositor failed");
        escrowArray[escrowId].heldInDeposit -= remainder;
        escrowArray[escrowId].status = EscrowStatus.Executed;
        emit Executed(escrowId, approvedAmount);
	}

    event ConsentWithdrawn(address indexed sender, uint escrowId);
    function withdrawConsent(uint escrowId) public {
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Consent cannot be withdrawn after all have approved");
        require(isParty(escrowId), "Only a party can withdraw consent");
        require(consents[msg.sender][escrowId], "No earlier consent to be withdrawn");
        consents[msg.sender][escrowId] = false;
        emit ConsentWithdrawn(msg.sender, escrowId);
    }

    event ProposalWithdrawn(address indexed sender, uint indexed escrowId);
    function withdrawProposal(uint escrowId) public {
        require(msg.sender == escrowArray[escrowId].proposer, "Only proposer can withdraw proposal");
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Proposal cannot be cancelled after all have approved");
        escrowArray[escrowId].status = EscrowStatus.Withdrawn;
        consents[msg.sender][escrowId] = false;
        emit ProposalWithdrawn(msg.sender, escrowId);
    }
}
