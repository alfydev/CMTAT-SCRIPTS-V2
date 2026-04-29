const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress =
    process.env.CMTAT_PROXY_ADDRESS ||
    "0xFb808d7465130603DB12e9D31b1546D52f893491";

  const implementation =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const admin =
    await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("Proxy:         ", proxyAddress);
  console.log("Implementation:", implementation);
  console.log("ProxyAdmin:    ", admin);

  const token = await ethers.getContractAt(
    process.env.NEW_IMPLEMENTATION_CONTRACT || "CMTATUpgradeableLightV2",
    proxyAddress
  );

  try {
    const version = await token.version();
    console.log("version():     ", version);
  } catch (e) {
    console.log("version() not available on current implementation");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

