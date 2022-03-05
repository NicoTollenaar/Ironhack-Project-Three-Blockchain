const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {

  const bankSigner = await ethers.getSigner(0); // bank is deployer
  const depositorSigner = await ethers.getSigner(1);
  const beneficiarySigner = await ethers.getSigner(2); 
  const arbiterSigner = await ethers.getSigner(3);

  console.log ("bank: ", bankSigner.address);
  console.log ("depositor: ", depositorSigner.address);
  console.log ("beneficiary: ", beneficiarySigner.address);
  console.log ("arbiter: ", arbiterSigner.address);
  
  const chainAccountFactory = await ethers.getContractFactory("ChainAccount");
  const chainAccountContract = await chainAccountFactory.deploy();
  await chainAccountContract.deployed();

  console.log("chainAccountContract deployed to address:", chainAccountContract.address);
  console.log("chainAccountContract deployer: ", chainAccountContract.signer.address);

  const escrowFactory = await ethers.getContractFactory("EscrowContract", bankSigner); 
  const escrowContract = await escrowFactory.deploy(chainAccountContract.address);
  await escrowContract.deployed();

  console.log("escrowContract deployed to address:", escrowContract.address);
  console.log("EscrowContract deployer: ", escrowContract.signer.address);

  const config = { 
    escrowContractAddress: escrowContract.address, 
    chainAccountContractAddress: chainAccountContract.address
  }
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
