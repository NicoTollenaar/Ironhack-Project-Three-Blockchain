require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const { chainAccountContractAddress } = JSON.parse(
  fs.readFileSync("./config.json")
);

async function moveFundsOffChain(onChainAddress, amount) {
  try {
    const accounts = await ethers.provider.listAccounts();
    console.log("Accounts on this network: ", accounts);
    const bankSigner = await ethers.getSigner(0);
    const depositorSigner = await ethers.getSigner(1); // later change to random depositor address (instead of ganache account 2)
    console.log(`Bank: ${bankSigner.address}`);
    console.log("Depositor address: ", depositorSigner.address);
    console.log(
      "Contract address (from JSON file): ",
      chainAccountContractAddress
    );

    console.log("\nTransactions being mined, please wait ...");
    const chainAccountContract = await ethers.getContractAt(
      "ChainAccount",
      chainAccountContractAddress
    );

    const txMove = await chainAccountContract
      .connect(depositorSigner)
      .moveFundsOffChain(amount);
    await txMove.wait();

    console.log("txMove: ", txMove);

    const txDelete = await chainAccountContract
      .connect(bankSigner)
      .deleteInternalBalanceBank(amount);
    await txDelete.wait();

    console.log("txDelete: ", txDelete);

    let balanceBank = await chainAccountContract
      .connect(bankSigner)
      .balanceOf(bankSigner.address)
      .then((result) => result.toString())
      .catch((err) => console.log(err));
    let balanceDepositor = await chainAccountContract
      .connect(bankSigner)
      .balanceOf(depositorSigner.address)
      .then((result) => result.toString())
      .catch((err) => console.log(err));
    //   let totalOutstanding = await chainAccountContract
    //     .totalAmountOnChain()
    //     .then((result) => result.toString())
    //     .catch((err) => console.log(err));

    console.log("Balance bank: ", balanceBank);
    console.log("Balance depositor: ", balanceDepositor);
    //   console.log("Total outstanding: ", totalOutstanding);

    return balanceDepositor;
  } catch (error) {
    console.log("Error in catch block, logging error: ", error);
  }
}

// moveFundsOffChain("0x196da5A01583020a27cfBAdd23b7ea6F21B1675d", 275000)
//   .then(() => process.exit(0))
//   .catch((err) => {
//     console.log(err);
//     process.exit(1);
//   });

module.exports = moveFundsOffChain;
