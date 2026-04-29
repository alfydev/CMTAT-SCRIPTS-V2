// unfreeze-address.js
const { ethers } = require("ethers");

const RPC_URL          = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY      = "0xENFORCER_PRIVATE_KEY_HERE";
const TOKEN_ADDRESS    = "0xYourTokenAddressHere";
const UNFREEZE_ADDRESS = "0xAddressToUnfreeze";

const ABI = [
  "function ENFORCER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function setAddressFrozen(address account, bool freeze)",
  "function isFrozen(address account) view returns (bool)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const token    = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

  console.log("Caller (enforcer):", wallet.address);
  console.log("Token:", TOKEN_ADDRESS);
  console.log("Address to unfreeze:", UNFREEZE_ADDRESS);

  const ENFORCER_ROLE = await token.ENFORCER_ROLE();
  const isEnforcer    = await token.hasRole(ENFORCER_ROLE, wallet.address);

  console.log("Caller has ENFORCER_ROLE:", isEnforcer);
  if (!isEnforcer) {
    throw new Error("Caller does not have ENFORCER_ROLE.");
  }

  const before = await token.isFrozen(UNFREEZE_ADDRESS);
  console.log("Frozen status before:", before);

  const tx = await token.setAddressFrozen(UNFREEZE_ADDRESS, false);
  console.log("Unfreezing address tx hash:", tx.hash);
  await tx.wait();

  const after = await token.isFrozen(UNFREEZE_ADDRESS);
  console.log("Frozen status after:", after);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

