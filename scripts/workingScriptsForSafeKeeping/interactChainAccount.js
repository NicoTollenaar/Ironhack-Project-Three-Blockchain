const { ethers } = require("hardhat");
const fs = require('fs');
const { chainAccountContractAddress } = JSON.parse(fs.readFileSync("./config.json"));

async function main() {

    const accounts = await ethers.provider.listAccounts();
    console.log(accounts);
    const [ bankSigner, depositorSigner, beneficiarySigner ] = await ethers.getSigners();
    console.log(`Bank: ${bankSigner.address}\nDepositor: ${depositorSigner.address}\nBeneficiary: ${beneficiarySigner.address}`);
    console.log("Transactions being mined, please wait ...");
    const chainAccountContract = await ethers.getContractAt("ChainAccount", chainAccountContractAddress);
    const name = await chainAccountContract.connect(bankSigner).name();
    const symbol = await chainAccountContract.symbol();
    const decimals = await chainAccountContract.decimals();
    console.log("Logging name, symbol, decimals: ", name, symbol, decimals);
  
    const txMoveOnChain = await chainAccountContract.connect(bankSigner).moveFundsOnChain(depositorSigner.address, 10000);
    await txMoveOnChain.wait();

    // console.log("Logging txMoveOnChain: ", txMoveOnChain);
    
    // const txTransfer = await chainAccountContract.connect(depositorSigner).transferFunds(beneficiarySigner.address, 10000);
    // await txTransfer.wait();

    // const txMoveOffChain = await chainAccountContract.connect(beneficiarySigner).moveFundsOffChain(10000);
    // await txMoveOffChain.wait();

    // const txDeleteInternal = await chainAccountContract.deleteInternalBalanceBank(10000);
    // await txDeleteInternal.wait();

    let balanceBank = await chainAccountContract.balanceOf(bankSigner.address)
    .then((result)=> result.toString()).catch((err)=>console.log(err));
    let balanceDepositor = await chainAccountContract.balanceOf(depositorSigner.address)
    .then((result)=> result.toString()).catch((err)=>console.log(err));
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