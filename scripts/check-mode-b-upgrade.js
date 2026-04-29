const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress =
    process.env.CMTAT_PROXY_ADDRESS ||
    "0xFb808d7465130603DB12e9D31b1546D52f893491";

  const implementation =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const admin =
    await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("Proxy address:         ", proxyAddress);
  console.log("Implementation address:", implementation);
  console.log("ProxyAdmin address:    ", admin);

  const token = await ethers.getContractAt(
    "CMTATUpgradeableLightV2ModeB",
    proxyAddress
  );

  const note = await token.upgradeNote();

  console.log("upgradeNote():         ", note);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

