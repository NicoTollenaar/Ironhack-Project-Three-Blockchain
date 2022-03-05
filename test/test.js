const { assert, expect } = require("chai");
const { ethers } = require("hardhat");

describe("Contracts", async function () {
  this.timeout(0); //only needed for testing on rinkeby, not for hardhat network
  let bankSigner, depositorSigner, beneficiarySigner, arbiterSigner;
  let chainAccountContract, escrowContract;
  let balanceBankBefore, balanceBankAfter;
  let balanceDepositorBefore, balanceDepositorAfter;
  let balanceBeneficiaryBefore, balanceBeneficiaryAfter;
  let balanceContractBefore, balanceContractAfter;

  before(async function () {
    bankSigner = await ethers.getSigner(0);
    depositorSigner = await ethers.getSigner(1);
    beneficiarySigner = await ethers.getSigner(2);
    arbiterSigner = await ethers.getSigner(3);

    console.log("bank: ", bankSigner.address);
    console.log("depositor: ", depositorSigner.address);
    console.log("beneficiary: ", beneficiarySigner.address);
    console.log("arbiter: ", arbiterSigner.address);

    const chainAccountFactory = await ethers.getContractFactory("ChainAccount");
    chainAccountContract = await chainAccountFactory.deploy();
    await chainAccountContract.deployed();

    const escrowFactory = await ethers.getContractFactory(
      "EscrowContract",
      bankSigner
    );
    escrowContract = await escrowFactory.deploy(chainAccountContract.address);
    await escrowContract.deployed();

    console.log(
      "chainAccountContract deployed to address:",
      chainAccountContract.address
    );
    console.log(
      "chainAccountContract deployer: ",
      chainAccountContract.signer.address
    );
    console.log("escrowContract deployed to address:", escrowContract.address);
    console.log("EscrowContract deployer: ", escrowContract.signer.address);
  });

  it("should deploy chainAccountContract", () => {
    assert(chainAccountContract.address);
  });
  it("should deploy escrowContract", () => {
    assert(escrowContract.address);
  });

  describe("chainAccountContract", async () => {
    let amount = 30000;
    describe("chainAccountContract.name()", async function () {
      it("should get the name of the contract", async function () {
        const contractName = await chainAccountContract.name();
        const expectedName = "ChainAccount-EUR";
        assert.equal(contractName, expectedName);
      });
    });

    describe("chainAccountrContract.moveFundsOnChain()", async function () {
      afterEach(async function () {
        const tx = await chainAccountContract
          .connect(depositorSigner)
          .moveFundsOffChain(amount);
        await tx.wait();
      });
      it("should move indicated funds on-chain", async function () {
        balanceDepositorBefore = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        const tx = await chainAccountContract.moveFundsOnChain(
          depositorSigner.address,
          amount
        );
        await tx.wait();
        balanceDepositorAfter = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        assert.equal(
          parseInt(balanceDepositorBefore, 10) + amount,
          parseInt(balanceDepositorAfter, 10)
        );
      });
    });

    describe("chainAccountContract.transfer", async function () {
      before(async function () {
        const tx1 = await chainAccountContract.moveFundsOnChain(
          depositorSigner.address,
          amount
        );
        await tx1.wait();
        balanceDepositorBefore = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        balanceBeneficiaryBefore = await chainAccountContract.balanceOf(
          beneficiarySigner.address
        );
        const tx2 = await chainAccountContract
          .connect(depositorSigner)
          .transfer(beneficiarySigner.address, amount);
        await tx2.wait();
      });

      it("should transfer indicated amount out of depositor's account", async function () {
        balanceDepositorAfter = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        assert.equal(
          parseInt(balanceDepositorBefore, 10) - amount,
          parseInt(balanceDepositorAfter, 10)
        );
      });

      it("should transfer indicated amount into beneficiary's account", async function () {
        balanceBeneficiaryAfter = await chainAccountContract.balanceOf(
          beneficiarySigner.address
        );
        assert.equal(
          parseInt(balanceBeneficiaryBefore, 10) + amount,
          parseInt(balanceBeneficiaryAfter, 10)
        );
      });
    });

    describe("chainAccountContract.moveFundsOffChain", async function () {
      before(async function () {
        balanceBeneficiaryBefore = await chainAccountContract.balanceOf(
          beneficiarySigner.address
        );
        balanceBankBefore = await chainAccountContract.balanceOf(
          bankSigner.address
        );
        const tx = await chainAccountContract
          .connect(beneficiarySigner)
          .moveFundsOffChain(amount);
        await tx.wait();
      });

      it("should transfer indicated amount out of beneficiary's account", async function () {
        balanceBeneficiaryAfter = await chainAccountContract.balanceOf(
          beneficiarySigner.address
        );
        assert.equal(
          parseInt(balanceBeneficiaryBefore, 10) - amount,
          parseInt(balanceBeneficiaryAfter, 10)
        );
      });

      it("should transfer indicated amount to bank", async function () {
        balanceBankAfter = await chainAccountContract.balanceOf(
          bankSigner.address
        );
        assert.equal(
          parseInt(balanceBankBefore, 10) + amount,
          parseInt(balanceBankAfter, 10)
        );
      });
    });

    describe("chainAccountContract.deleteInternalBalanceBank", async function () {
      before(async function () {
        balanceBankBefore = await chainAccountContract.balanceOf(
          bankSigner.address
        );
        const tx = await chainAccountContract
          .connect(bankSigner)
          .deleteInternalBalanceBank(balanceBankBefore);
        await tx.wait();
      });

      it("should delete internal balance bank", async function () {
        balanceBankAfter = await chainAccountContract.balanceOf(
          bankSigner.address
        );
        assert.ok(parseInt(balanceBankAfter, 10) === 0);
      });
    });
  });

  describe("escrowContract", async function () {
    let escrowProposalBefore;
    let rawProposal;
    let escrowProposal;
    let proposals = [];
    const escrowAmounts = [10000, 5000, 2000];

    describe("escrowContract.proposeEscrow", async function () {
      let amountsFromEscrows = [];
      let receipt;

      before(async function () {
        for (let i = 0; i < escrowAmounts.length; i++) {
          const tx = await escrowContract
            .connect(depositorSigner)
            .proposeEscrow(
              depositorSigner.address,
              beneficiarySigner.address,
              arbiterSigner.address,
              escrowAmounts[i]
            );
          receipt = await tx.wait();
          rawProposal = await escrowContract.getEscrowProposal(i);
          escrowProposal = parseRawProposal(rawProposal);
          proposals.push(escrowProposal);
          amountsFromEscrows.push(escrowProposal.amount);
        }
      });

      it("should propose three escrows", async function () {
        assert.deepStrictEqual(amountsFromEscrows, escrowAmounts);
      });

      it("should emit a ProposedEscrow event", async function () {
        const event = escrowContract.interface.getEvent("ProposedEscrow");
        const topic = escrowContract.interface.getEventTopic("ProposedEscrow");
        const log = receipt.logs.find((x) => x.topics.indexOf(topic) >= 0);
        const deployedEvent = escrowContract.interface.parseLog(log);
        assert(
          deployedEvent,
          "Expected the Fallback Called event to be emitted!"
        );
      });
    });

    describe("escrowContract.consentToEscrow", async function () {
      it("should confirm that beneficiary has consented to all three proposals", async function () {
        let counter = 0;
        for (let i = 0; i < proposals.length; i++) {
          let consentedParties = [];
          const txConsentBen = await escrowContract
            .connect(beneficiarySigner)
            .consentToEscrow(i);
          receipt = await txConsentBen.wait();
          consentedParties = await escrowContract.getConsents(i);
          if (consentedParties[1] === beneficiarySigner.address) {
            counter++;
          }
        }
        assert.equal(counter, proposals.length);
      });

      it("should emit a ConsentToEscrow event", async function () {
        await expect(escrowContract.connect(arbiterSigner).consentToEscrow(1))
          .to.emit(escrowContract, "ConsentToEscrow")
          .withArgs(arbiterSigner.address, 1);
      });
    });

    describe("escrowContract when all consented", async function () {
      before(async function () {
        const txConsentArb = await escrowContract
          .connect(arbiterSigner)
          .consentToEscrow(0);
        receipt = await txConsentArb.wait();
      });

      it("should emit an AllConsented event", async function () {
        const event = escrowContract.interface.getEvent("AllConsented");
        const topic = escrowContract.interface.getEventTopic("AllConsented");
        const log = receipt.logs.find((x) => x.topics.indexOf(topic) >= 0);
        const deployedEvent = escrowContract.interface.parseLog(log);
        assert(
          deployedEvent,
          "Expected the Fallback Called event to be emitted!"
        );
      });

      it("should change the status of the proposal to 'Approved'", async function () {
        const rawProposal = await escrowContract.getEscrowProposal(0);
        const escrowProposal = parseRawProposal(rawProposal);
        assert(escrowProposal.status === "Approved");
      });
    });

    describe("escrowContract.depositInEscrow", async function () {
      before(async function () {
        const txMoveFunds = await chainAccountContract.moveFundsOnChain(
          depositorSigner.address,
          escrowAmounts[0]
        );
        await txMoveFunds.wait();
        const txApprove = await chainAccountContract
          .connect(depositorSigner)
          .approve(escrowContract.address, escrowAmounts[0]);
        await txApprove.wait();
        balanceDepositorBefore = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        balanceContractBefore = await chainAccountContract.balanceOf(
          escrowContract.address
        );
        const rawProposalBefore = await escrowContract.getEscrowProposal(0);
        escrowProposalBefore = parseRawProposal(rawProposalBefore);
      });

      it("should transfer the deposit out of the depositor's account", async function () {
        const receipt = await escrowContract.depositInEscrow(
          depositorSigner.address,
          escrowAmounts[0] - 10,
          0
        );
        await receipt.wait();
        balanceDepositorAfter = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        balanceContractAfter = await chainAccountContract.balanceOf(
          escrowContract.address
        );
        assert.equal(
          parseInt(balanceDepositorBefore) - (escrowAmounts[0] - 10),
          parseInt(balanceDepositorAfter, 10)
        );
      });

      it("should transfer the deposit to the escrowcontract", function () {
        assert.equal(
          parseInt(balanceContractBefore) + (escrowAmounts[0] - 10),
          parseInt(balanceContractAfter, 10)
        );
      });

      it("should add the deposited amount to the escrow struct", async function () {
        const rawProposalAfter = await escrowContract.getEscrowProposal(0);
        const escrowProposalAfter = parseRawProposal(rawProposalAfter);
        assert.equal(
          escrowProposalBefore.heldInDeposit + (escrowAmounts[0] - 10),
          escrowProposalAfter.heldInDeposit
        );
      });

      it("should emit a deposited in escrow event", async function () {
        await expect(
          escrowContract.depositInEscrow(depositorSigner.address, 5, 0)
        )
          .to.emit(escrowContract, "DepositedInEscrow")
          .withArgs(0, 5);
      });

      it("should emit a fully funded event", async function () {
        await expect(
          escrowContract.depositInEscrow(depositorSigner.address, 5, 0)
        )
          .to.emit(escrowContract, "FullyFunded")
          .withArgs(0, 10000);
      });

      it("should change the status of the escrow to fully funded", async function () {
        const rawProposal = await escrowContract.getEscrowProposal(0);
        const escrowProposal = parseRawProposal(rawProposal);
        assert.strictEqual(escrowProposal.status, "FullyFunded");
      });

      it("should reject further payments after escrow is fully funded", async function () {
        const tx = await chainAccountContract.moveFundsOnChain(
          depositorSigner.address,
          50000
        );
        await tx.wait();
        const tx1 = await chainAccountContract
          .connect(depositorSigner)
          .approve(escrowContract.address, 50000);
        await tx1.wait();
        await expect(
          escrowContract.depositInEscrow(depositorSigner.address, 50000, 0)
        ).to.be.reverted;
      });

      it("should transfer any excess amount back to depositor", async function () {
        //
        tx0 = await chainAccountContract.moveFundsOnChain(
          depositorSigner.address,
          escrowAmounts[1] + 5
        );
        await tx0.wait();
        const tx1 = await chainAccountContract
          .connect(depositorSigner)
          .approve(escrowContract.address, escrowAmounts[1] + 5);
        await tx1.wait();
        balanceDepositorBefore = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        const tx2 = await escrowContract.depositInEscrow(
          depositorSigner.address,
          escrowAmounts[1] + 5,
          1
        );
        await tx2.wait();
        balanceDepositorAfter = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        assert.equal(
          parseInt(balanceDepositorBefore, 10) - escrowAmounts[1],
          parseInt(balanceDepositorAfter, 10)
        );
      });

      it("should should revert if attempted deposit exceeds escrow amount by more than 5%", async function () {
        tx = await escrowContract.connect(arbiterSigner).consentToEscrow(2);
        await tx.wait();
        tx0 = await chainAccountContract.moveFundsOnChain(
          depositorSigner.address,
          2 * escrowAmounts[2] - 5
        );
        await tx0.wait();
        const tx1 = await chainAccountContract
          .connect(depositorSigner)
          .approve(escrowContract.address, 2 * escrowAmounts[2]);
        await tx1.wait();
        await expect(
          escrowContract.depositInEscrow(
            depositorSigner.address,
            2 * escrowAmounts[2],
            2
          )
        ).to.be.reverted;
      });
    });

    describe("escrowContract.executeEscrow", async function () {
      let approvedAmount = escrowAmounts[0] / 2;
      let remainder = escrowAmounts[0] - approvedAmount;
      it("should transfer approved amount from escrow to beneficiary", async function () {
        balanceContractBefore = await chainAccountContract.balanceOf(
          escrowContract.address
        );
        balanceBeneficiaryBefore = await chainAccountContract.balanceOf(
          beneficiarySigner.address
        );
        balanceDepositorBefore = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        balanceContractBefore = await chainAccountContract.balanceOf(
          escrowContract.address
        );
        const tx = await escrowContract
          .connect(arbiterSigner)
          .executeEscrow(0, approvedAmount);
        await tx.wait();
        balanceContractAfter = await chainAccountContract.balanceOf(
          escrowContract.address
        );
        balanceBeneficiaryAfter = await chainAccountContract.balanceOf(
          beneficiarySigner.address
        );
        assert.equal(
          parseInt(balanceBeneficiaryBefore, 10) + approvedAmount,
          parseInt(balanceBeneficiaryAfter, 10)
        );
      });

      it("should return remainder to depositor", async function () {
        balanceDepositorAfter = await chainAccountContract.balanceOf(
          depositorSigner.address
        );
        assert.equal(
          parseInt(balanceDepositorBefore, 10) + remainder,
          parseInt(balanceDepositorAfter, 10)
        );
      });

      it("should have removed the total escrow amount from the escrow contract", async function () {
        balanceContractAfter = await chainAccountContract.balanceOf(
          escrowContract.address
        );
        assert.equal(
          parseInt(balanceContractBefore, 10) - escrowAmounts[0],
          parseInt(balanceContractAfter, 10)
        );
      });

      it("should set the amount held in escrow to 0", async function () {
        rawProposal = await escrowContract.getEscrowProposal(0);
        escrowProposal = parseRawProposal(rawProposal);
        assert.equal(escrowProposal.heldInDeposit, 0);
      });

      it("should set the status to Executed", async function () {
        assert.strictEqual(escrowProposal.status, "Executed");
      });

      it("should emit an executed event", async function () {
        await expect(
          escrowContract
            .connect(arbiterSigner)
            .executeEscrow(1, escrowAmounts[1])
        )
          .to.emit(escrowContract, "Executed")
          .withArgs(1, escrowAmounts[1]);
      });
    });
  });
});

function parseRawProposal(rawProposal) {
  let readableStatus;
  rawProposal[7] === 0
    ? (readableStatus = "Proposed")
    : rawProposal[7] === 1
    ? (readableStatus = "Approved")
    : rawProposal[7] === 2
    ? (readableStatus = "FullyFunded")
    : rawProposal[7] === 3
    ? (readableStatus = "Executed")
    : (readableStatus = "Withdrawn");
  let parsedProposal = {
    proposer: rawProposal[0],
    depositor: rawProposal[1],
    beneficiary: rawProposal[2],
    arbiter: rawProposal[3],
    amount: parseInt(rawProposal[4], 10),
    heldInDeposit: parseInt(rawProposal[5], 10),
    Id: parseInt(rawProposal[6], 10),
    status: readableStatus,
  };
  return parsedProposal;
}
