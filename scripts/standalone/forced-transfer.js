// forced-transfer.js
const { ethers } = require("ethers");

const RPC_URL       = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY   = "0xADMIN_PRIVATE_KEY_HERE";
const TOKEN_ADDRESS = "0xYourTokenAddressHere";

const FROM_ADDRESS  = "0xAddressToClawBackFrom";
const TO_ADDRESS    = "0xAddressToReceive";
const AMOUNT        = "100"; // human tokens (e.g. "100" or "147.5" if decimals>0)

const ABI = [
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function decimals() view returns (uint8)",
  "function forcedTransfer(address from, address to, uint256 value, bytes data)",
  "function balanceOf(address account) view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const token    = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

  console.log("Caller (admin):", wallet.address);
  console.log("Token:", TOKEN_ADDRESS);
  console.log("From:", FROM_ADDRESS);
  console.log("To:", TO_ADDRESS);
  console.log("Amount (human):", AMOUNT);

  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
  const isAdmin            = await token.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);

  console.log("Caller has DEFAULT_ADMIN_ROLE:", isAdmin);
  if (!isAdmin) {
    throw new Error("Caller must be admin for forcedTransfer.");
  }

  const decimals = await token.decimals();
  const amount   = ethers.parseUnits(AMOUNT, decimals);

  const fromBefore = await token.balanceOf(FROM_ADDRESS);
  const toBefore   = await token.balanceOf(TO_ADDRESS);

  console.log("FROM balance before (base units):", fromBefore.toString());
  console.log("TO balance before (base units):",   toBefore.toString());

  const forcedTransferFn = token["forcedTransfer(address,address,uint256,bytes)"];

  const tx = await forcedTransferFn(FROM_ADDRESS, TO_ADDRESS, amount, "0x");
  console.log("Forced transfer tx hash:", tx.hash);
  await tx.wait();

  const fromAfter = await token.balanceOf(FROM_ADDRESS);
  const toAfter   = await token.balanceOf(TO_ADDRESS);

  console.log("FROM balance after (base units):", fromAfter.toString());
  console.log("TO balance after (base units):",   toAfter.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

