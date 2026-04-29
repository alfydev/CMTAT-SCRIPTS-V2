const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = process.env.CMTAT_PROXY_ADDRESS;
  const newImplementationContract =
    process.env.NEW_IMPLEMENTATION_CONTRACT || "CMTATUpgradeableLightV2";

  if (!proxyAddress) {
    throw new Error("Missing CMTAT_PROXY_ADDRESS in environment variables.");
  }

  const [deployer] = await ethers.getSigners();

  console.log("Upgrading proxy with account:", deployer.address);
  console.log("Proxy address:", proxyAddress);
  console.log("New implementation contract:", newImplementationContract);

  const oldImplementation =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const proxyAdmin =
    await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("Current implementation:", oldImplementation);
  console.log("Proxy admin:", proxyAdmin);

  const NewImplementationFactory = await ethers.getContractFactory(
    newImplementationContract
  );

  const upgraded = await upgrades.upgradeProxy(
    proxyAddress,
    NewImplementationFactory,
    {
      kind: "transparent",
      unsafeAllow: ["missing-initializer"],
    }
  );

  await upgraded.waitForDeployment();

  const newImplementation =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("--------------------------------------------------");
  console.log("Proxy address (unchanged):  ", proxyAddress);
  console.log("Old implementation:         ", oldImplementation);
  console.log("New implementation:         ", newImplementation);
  console.log("Proxy admin:                ", proxyAdmin);
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
