/** @type import('hardhat/config').HardhatUserConfig */
require('dotenv').config();
require('@openzeppelin/hardhat-upgrades')
require('solidity-coverage')
require("hardhat-gas-reporter");
require('solidity-docgen')
require("hardhat-contract-sizer");
require('@nomicfoundation/hardhat-ethers');
require("@nomicfoundation/hardhat-chai-matchers")
module.exports = {
  solidity: {
    version: '0.8.30',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: 'prague'
    }
  },
  
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [process.env.SEPOLIA_PRIVATE_KEY]
        : [],
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    //only: [':ERC20$'],
  }
}
