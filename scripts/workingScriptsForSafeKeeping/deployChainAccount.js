
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  
  const contractToDeploy = await ethers.getContractFactory("ChainAccount");
  const chainAccountContract = await contractToDeploy.deploy();
  await chainAccountContract.deployed();

  const deployer = await chainAccountContract.signer;
  chainAccountContractAddress = chainAccountContract.address;

  console.log("chainAccountContract deployed to address:", chainAccountContract.address);
  console.log("This is the address of the deployer: ", deployer.address);
  const config = { chainAccountContractAddress: chainAccountContract.address };
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
