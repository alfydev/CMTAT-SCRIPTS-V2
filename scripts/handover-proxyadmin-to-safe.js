const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();

  const PROXY_ADMIN_ADDRESS =
    process.env.PROXY_ADMIN_ADDRESS ||
    "0xC06EB6246F28a5bc72494d0918910FbbDFf46Faa";

  const NEW_OWNER =
    process.env.NEW_OWNER ||
    "0xYourGnosisSafeAddressHere";

  if (!ethers.isAddress(PROXY_ADMIN_ADDRESS)) {
    throw new Error(`Invalid PROXY_ADMIN_ADDRESS: ${PROXY_ADMIN_ADDRESS}`);
  }

  if (!ethers.isAddress(NEW_OWNER)) {
    throw new Error(`Invalid NEW_OWNER: ${NEW_OWNER}`);
  }

  const proxyAdminAbi = [
    "function owner() view returns (address)",
    "function transferOwnership(address newOwner)",
  ];

  const proxyAdmin = new ethers.Contract(
    PROXY_ADMIN_ADDRESS,
    proxyAdminAbi,
    signer
  );

  const currentOwner = await proxyAdmin.owner();

  console.log("Signer:            ", signer.address);
  console.log("ProxyAdmin:        ", PROXY_ADMIN_ADDRESS);
  console.log("Current owner:     ", currentOwner);
  console.log("New owner (Safe):  ", NEW_OWNER);

  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      "The connected signer is not the current ProxyAdmin owner."
    );
  }

  if (currentOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
    console.log("ProxyAdmin is already owned by the target Safe.");
    return;
  }

  const tx = await proxyAdmin.transferOwnership(NEW_OWNER);
  console.log("Submitted tx:", tx.hash);

  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);

  const updatedOwner = await proxyAdmin.owner();
  console.log("Updated owner:     ", updatedOwner);

  if (updatedOwner.toLowerCase() !== NEW_OWNER.toLowerCase()) {
    throw new Error("Ownership transfer did not complete as expected.");
  }

  console.log("ProxyAdmin ownership successfully transferred to the Safe.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
