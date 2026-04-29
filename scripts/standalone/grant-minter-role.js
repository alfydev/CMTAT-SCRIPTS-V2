// grant-minter-role.js
const { ethers } = require("ethers");

const RPC_URL        = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY    = "0xADMIN_PRIVATE_KEY_HERE";
const TOKEN_ADDRESS  = "0xYourTokenAddressHere";
const GRANTEE_ADDRESS = "0xAddressToBecomeMinter";

const ABI = [
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const token    = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

  console.log("Caller (admin):", wallet.address);
  console.log("Token:", TOKEN_ADDRESS);
  console.log("Grantee (minter):", GRANTEE_ADDRESS);

  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE        = await token.MINTER_ROLE();

  const isAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
  console.log("Caller has DEFAULT_ADMIN_ROLE:", isAdmin);
  if (!isAdmin) {
    throw new Error("Caller is not admin. Use the admin wallet here.");
  }

  const already = await token.hasRole(MINTER_ROLE, GRANTEE_ADDRESS);
  console.log("Grantee already has MINTER_ROLE:", already);
  if (already) {
    console.log("Nothing to do.");
    return;
  }

  const tx = await token.grantRole(MINTER_ROLE, GRANTEE_ADDRESS);
  console.log("Grant MINTER_ROLE tx hash:", tx.hash);
  await tx.wait();

  const nowHas = await token.hasRole(MINTER_ROLE, GRANTEE_ADDRESS);
  console.log("Grantee has MINTER_ROLE after:", nowHas);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

