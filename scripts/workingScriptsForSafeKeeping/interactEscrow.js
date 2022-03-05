const { hre, ethers, network } = require("hardhat");
const fs = require('fs');
const { send } = require("process");

// const { escrowContractAddress } = require('./config.json');
const { escrowContractAddress, chainAccountContractAddress } = JSON.parse(fs.readFileSync("./config.json"));
console.log("escrowContract address is: ", escrowContractAddress);
console.log("chainAccountContract address is: ", chainAccountContractAddress);

async function main() {
  const escrowAmount = 10000;
  const [ bankSigner, depositorSigner, beneficiarySigner, arbiterSigner ] = await ethers.getSigners();
  console.log(`Bank: ${bankSigner.address}\nDepositor: ${depositorSigner.address}\nBeneficiary: ${beneficiarySigner.address}\nArbiter: ${arbiterSigner.address}`);
  console.log("Transactions being mined, please wait ...");
  const chainAccountContract = await ethers.getContractAt("ChainAccount", chainAccountContractAddress);
  const escrowContract = await ethers.getContractAt("EscrowContract", escrowContractAddress);
  
  const txMoveOnChain = await chainAccountContract.connect(bankSigner).moveFundsOnChain(depositorSigner.address, 2*escrowAmount);
  await txMoveOnChain.wait();

  const txMoveOnChain2 = await chainAccountContract.connect(bankSigner).moveFundsOnChain(chainAccountContract.address, 50000);
  await txMoveOnChain2.wait();
   
  escrowContract.on('ProposedEscrow', (address, escrowId) => {
    console.log(`Emitted event: new escrow has been proposed by ${address} with Id ${escrowId}`);
  });
  escrowContract.on('ConsentToEscrow', (address, escrowId) => {
    console.log(`Emitted event: Escrow with Id ${escrowId} has been consented to by ${address}`);
  });
  escrowContract.on('AllConsented', (string) => {
    console.log(`Emitted event: ${string}`);
  });
  escrowContract.on('DepositedInEscrow', (depositor, escrowaccount, amount) => {
    console.log(`${depositor} deposited EUR ${amount} in escrowaccount with address: ${escrowaccount}`);
  });
  escrowContract.on('ConsentWithdrawn', (sender, escrowId) => {
    console.log(`Emitted event: consent to escrow with Id ${escrowId} withdrawn by ${sender}`);
  }); 
  escrowContract.on('ProposalWithdrawn', (sender, escrowId) => {
    console.log(`Emitted event: proposal with Id ${escrowId} cancelled by proposer ${sender}`);
  });

  chainAccountContract.on("Transfer", (sender, recipient, amount) => {
      console.log(`logging output of "Transfer" listener
      on chainContract, sender, recipient and amount: \n${sender}\n${recipient}\n${amount}`);
      const filterArray = chainAccountContract.filters.Transfer(sender, recipient);
      console.log("Logging outpunt of filter: ", filterArray);
  });

  const txproposeEscrow = await escrowContract.connect(depositorSigner).proposeEscrow(depositorSigner.address, beneficiarySigner.address, arbiterSigner.address, escrowAmount);
  await txproposeEscrow.wait();

  const escrowRaw = await escrowContract.getEscrowProposal(0);
  
  let readableStatus;

  escrowRaw[7] === 0? readableStatus = "Proposed" :
  escrowRaw[7] === 1? readableStatus = "Approved" :
  escrowRaw[7] === 2? readableStatus = "FullyFunded" :
  escrowRaw[7] === 3? readableStatus = "Executed" : readableStatus = "Cancelled";

  const escrowProposal = {
    proposer: escrowRaw[0],
    depositor: escrowRaw[1],
    beneficiary: escrowRaw[2],
    arbiter: escrowRaw[3],
    amount: parseInt(escrowRaw[4], 10),
    deposited: parseInt(escrowRaw[5], 10),
    Id: parseInt(escrowRaw[6], 10),
    status: readableStatus,
  }

  console.log(`Logging escrow proposal with Id ${escrowProposal.Id}: `, escrowProposal);

  const txConsentBen = await escrowContract.connect(beneficiarySigner).consentToEscrow(0);
  await txConsentBen.wait();

  const txConsentArb = await escrowContract.connect(arbiterSigner).consentToEscrow(0);
  await txConsentArb.wait();

  const ReceivedConsents = await escrowContract.getConsents(0);
  console.log("Logging received consents (array): ", ReceivedConsents);

    // const isApproved = await escrowContract.allConsented(0);
    // await isApproved.wait();
    // console.log("Logging is approved: ", isApproved);

    // const txDeposit = await escrowContract.connect(depositorSigner).depositInEscrow(0, escrowAmount);
    // await txDeposit.wait();
    // console.log("logging txDeposit", txDeposit);

    // const payload = chainAccountContract.interface.encodeFunctionData("transfer", [escrowContract.address, escrowAmount]);

    const txSendETH = {
      to: escrowContract.address,
      value: ethers.utils.parseEther("0.05")
    }

    const txSendETH2 = {
      to: chainAccountContract.address,
      value: ethers.utils.parseEther("0.05")
    }
    
    await beneficiarySigner.sendTransaction(txSendETH);
    const balanceEscrow = await ethers.provider.getBalance(escrowContract.address);
    console.log("Logging ETH balance escrowContract: ", parseInt(balanceEscrow, 10));

    await beneficiarySigner.sendTransaction(txSendETH2);
    const balanceChainAccount = await ethers.provider.getBalance(chainAccountContract.address);
    console.log("Logging ETH balance chainAccountContract: ", parseInt(balanceChainAccount, 10));

    const simpleTrans = await escrowContract.connect(depositorSigner).simpleTransfer(48576);
    await simpleTrans.wait();
    console.log("logging simpleTrans", simpleTrans);


    // txTransfer = await chainAccountContract.connect(depositorSigner).transferFunds(escrowContract.address, escrowAmount);
    // await txTransfer.wait();

    const balanceThis = await chainAccountContract.balanceOf(escrowContract.address);
    console.log("Logging balanceThis: ", parseInt(balanceThis, 10));

    let balanceBank = await chainAccountContract.getBalance(bankSigner.address).then((result)=> result.toString()).catch((err)=>console.log(err));
    let balanceDepositor = await chainAccountContract.balanceOf(depositorSigner.address).then((result)=> result.toString()).catch((err)=>console.log(err));
    let balanceBeneficiary = await chainAccountContract.balanceOf(beneficiarySigner.address)
    .then((result)=> result.toString()).catch((err)=>console.log(err));
    let totalOutstanding = await chainAccountContract.totalAmountOnChain()
    .then((result)=> result.toString()).catch((err)=> console.log(err));
    
    console.log("Balance bank: ", balanceBank);
    console.log("Balance depositor: ", balanceDepositor);
    console.log("Balance beneficiary: ", balanceBeneficiary);
    console.log("Total outstanding: ", totalOutstanding);

}

main()
.then(()=> process.exit(0))
.catch((err)=> {
    console.log(err);
    process.exit(1);
});