// mint-1000.js
const { ethers } = require("ethers");

const RPC_URL          = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY      = "0xMINTER_OR_ADMIN_PRIVATE_KEY_HERE";
const TOKEN_ADDRESS    = "0xYourTokenAddressHere";
const RECIPIENT_ADDRESS = "0xRecipientOfMintedTokens";

const ABI = [
  "function MINTER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function decimals() view returns (uint8)",
  "function mint(address to, uint256 amount, bytes data)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const token    = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

  console.log("Caller (must have MINTER_ROLE or be admin):", wallet.address);
  console.log("Token:", TOKEN_ADDRESS);
  console.log("Recipient:", RECIPIENT_ADDRESS);

  const MINTER_ROLE        = await token.MINTER_ROLE();
  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

  const isMinter = await token.hasRole(MINTER_ROLE, wallet.address);
  const isAdmin  = await token.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);

  console.log("Caller has MINTER_ROLE:", isMinter);
  console.log("Caller has DEFAULT_ADMIN_ROLE:", isAdmin);
  if (!isMinter && !isAdmin) {
    throw new Error("Caller must have MINTER_ROLE or be admin.");
  }

  const decimals = await token.decimals();
  const amount   = ethers.parseUnits("1000", decimals);
  console.log(`Amount to mint (base units): ${amount.toString()}`);

  const totalBefore    = await token.totalSupply();
  const balanceBefore  = await token.balanceOf(RECIPIENT_ADDRESS);

  console.log("Total supply before (base units):", totalBefore.toString());
  console.log("Recipient balance before (base units):", balanceBefore.toString());

  const mintFn = token["mint(address,uint256,bytes)"];

  const tx = await mintFn(RECIPIENT_ADDRESS, amount, "0x");
  console.log("Mint tx hash:", tx.hash);
  await tx.wait();

  const totalAfter    = await token.totalSupply();
  const balanceAfter  = await token.balanceOf(RECIPIENT_ADDRESS);

  console.log("Total supply after (base units):", totalAfter.toString());
  console.log("Recipient balance after (base units):", balanceAfter.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

