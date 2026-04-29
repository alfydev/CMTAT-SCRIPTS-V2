const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying proxied light CMTAT with account:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  const admin = process.env.CMTAT_ADMIN || deployer.address;

  const ERC20Attributes = {
    name: process.env.TOKEN_NAME || "CMTA Light Token",
    symbol: process.env.TOKEN_SYMBOL || "CMTAL",
    decimalsIrrevocable: Number(process.env.TOKEN_DECIMALS || "0"),
  };

  const CMTATUpgradeableLight = await ethers.getContractFactory(
    "CMTATUpgradeableLight"
  );

  const proxy = await upgrades.deployProxy(
    CMTATUpgradeableLight,
    [admin, ERC20Attributes],
    {
      initializer: "initialize",
      kind: "transparent",
      unsafeAllow: ["missing-initializer"],
    }
  );

  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implementationAddress =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const proxyAdminAddress =
    await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("--------------------------------------------------");
  console.log("Proxy deployed at:           ", proxyAddress);
  console.log("Implementation deployed at:  ", implementationAddress);
  console.log("Proxy admin at:              ", proxyAdminAddress);
  console.log("Token admin set to:          ", admin);
  console.log("Token name:                  ", ERC20Attributes.name);
  console.log("Token symbol:                ", ERC20Attributes.symbol);
  console.log("Token decimalsIrrevocable:   ", ERC20Attributes.decimalsIrrevocable);
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
