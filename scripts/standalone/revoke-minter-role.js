// revoke-minter-role.js
const { ethers } = require("ethers");

const RPC_URL        = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY    = "0xADMIN_PRIVATE_KEY_HERE";
const TOKEN_ADDRESS  = "0xYourTokenAddressHere";
const TARGET_ADDRESS = "0xMinterToRevoke";

const ABI = [
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function revokeRole(bytes32 role, address account)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const token    = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

  console.log("Caller (admin):", wallet.address);
  console.log("Token:", TOKEN_ADDRESS);
  console.log("Target (minter to revoke):", TARGET_ADDRESS);

  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE        = await token.MINTER_ROLE();

  const isAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
  console.log("Caller has DEFAULT_ADMIN_ROLE:", isAdmin);
  if (!isAdmin) {
    throw new Error("Caller is not admin.");
  }

  const before = await token.hasRole(MINTER_ROLE, TARGET_ADDRESS);
  console.log("Has MINTER_ROLE before:", before);
  if (!before) {
    console.log("Target does not have MINTER_ROLE, nothing to revoke.");
    return;
  }

  const tx = await token.revokeRole(MINTER_ROLE, TARGET_ADDRESS);
  console.log("Revoking MINTER_ROLE tx hash:", tx.hash);
  await tx.wait();

  const after = await token.hasRole(MINTER_ROLE, TARGET_ADDRESS);
  console.log("Has MINTER_ROLE after:", after);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

