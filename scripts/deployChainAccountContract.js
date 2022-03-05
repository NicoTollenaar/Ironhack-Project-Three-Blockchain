const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function deployChainAccountContract() {
  try {
    // the code below works, used for running on rinkeby with different deployer than default signer
    // const alchemyProvider = new ethers.providers.AlchemyProvider(
    //   "rinkeby",
    //   process.env.ALCHEMY_API_KEY
    // );
    // const bankSigner = new ethers.Wallet(
    //   process.env.RINKEBY_PRIVATE_KEY_TWO,
    //   alchemyProvider
    // );

    // console.log("Provider: ", alchemyProvider);

    const accounts = await ethers.provider.listAccounts();
    console.log(
      "Accounts on this network (first account is default signer): ",
      accounts
    );

    const bankSigner = await ethers.getSigner(0); // bank is deployer using default signer address
    console.log("bank: ", bankSigner.address);

    const chainAccountFactory = await ethers.getContractFactory(
      "ChainAccount",
      bankSigner
    );

    const chainAccountContract = await chainAccountFactory.deploy();
    await chainAccountContract.deployed();

    console.log(
      "chainAccountContract deployed to address:",
      chainAccountContract.address
    );
    console.log(
      "chainAccountContract deployer (should be same as bank signer): ",
      chainAccountContract.signer.address
    );
    const config = {
      chainAccountContractAddress: chainAccountContract.address,
    };
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
  } catch (error) {
    console.log("Error in catch block, logging error: ", error);
  }
}

deployChainAccountContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = deployChainAccountContract;
