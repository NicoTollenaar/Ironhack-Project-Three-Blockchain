require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

module.exports = {
  solidity: "0.8.4",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: [
        `0x${process.env.GANACHE_PRIVATE_KEY_ONE}`,
        `0x${process.env.GANACHE_PRIVATE_KEY_TWO}`,
      ],
    },
    rinkeby: {
      url: `${process.env.ALCHEMY_RINKEBY_URL}`,
      accounts: [
        `0x${process.env.RINKEBY_PRIVATE_KEY_ONE}`,
        `0x${process.env.RINKEBY_PRIVATE_KEY_TWO}`,
        `0x${process.env.RINKEBY_PRIVATE_KEY_THREE}`,
        `0x${process.env.RINKEBY_PRIVATE_KEY_FOUR}`,
      ],
    },
  },
  etherscan: {
    apiKey: `${process.env.ETHERSCAN_API_KEY}`,
  },
};

// code below works for running on Rinkeby, comment out to try hardhat node with above code

// module.exports = {
//   solidity: "0.8.4",
//   networks: {
//     rinkeby: {
//       url: `${process.env.ALCHEMY_RINKEBY_URL}`,
//       accounts: [
//         `0x${process.env.RINKEBY_PRIVATE_KEY_ONE}`,
//         `0x${process.env.RINKEBY_PRIVATE_KEY_TWO}`,
//         `0x${process.env.RINKEBY_PRIVATE_KEY_THREE}`,
//         `0x${process.env.RINKEBY_PRIVATE_KEY_FOUR}`,
//       ],
//     },
//   },
// };
