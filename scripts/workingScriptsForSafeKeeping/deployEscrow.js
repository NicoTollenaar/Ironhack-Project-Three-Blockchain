const { ethers } = require("hardhat");
const fs = require ('fs');
const { chainAccountContractAddress } = JSON.parse(fs.readFileSync("./config.json"));

console.log("chainAccountContractAddress: ", chainAccountContractAddress);

async function main() {

  const bankSigner = await ethers.getSigner(0); // bankSigner is deployer
  const depositorSigner = await ethers.getSigner(1);
  const beneficiarySigner = await ethers.getSigner(2); 
  const arbiterSigner = await ethers.getSigner(3);
  console.log ("bankSigner: ", bankSigner.address);
  console.log ("depositorSigner: ", depositorSigner.address);
  console.log ("beneficiarySigner: ", beneficiarySigner.address);
  console.log ("arbiterSigner: ", arbiterSigner.address);

  const contractToDeploy = await ethers.getContractFactory("EscrowContract", bankSigner); 
  const escrowContract = await contractToDeploy.deploy(chainAccountContractAddress);
  await escrowContract.deployed();

  const deployer = await escrowContract.signer;

  console.log("chainAccountContract deployed to address: ", chainAccountContractAddress);
  console.log("escrowContract deployed to address:", escrowContract.address);
  console.log("This is the address of the deployer: ", deployer.address);

  const config = { 
    escrowContractAddress: escrowContract.address, 
    chainAccountContractAddress: chainAccountContractAddress
  }
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
