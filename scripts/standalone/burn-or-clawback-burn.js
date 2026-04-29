// burn-or-clawback-burn.js
const { ethers } = require("ethers");

const RPC_URL        = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY    = "0xBURNER_AND_ADMIN_PRIVATE_KEY_HERE";
const TOKEN_ADDRESS  = "0xYourTokenAddressHere";

const TARGET_ADDRESS   = "0xAddressWhoseTokensToDestroy";
const AMOUNT           = "99"; // human tokens
const TREASURY_ADDRESS = "0xTreasuryOrComplianceWallet"; // where clawed-back tokens go

const ABI = [
  "function BURNER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function isFrozen(address account) view returns (bool)",
  "function decimals() view returns (uint8)",
  "function burn(address account, uint256 value, bytes data)",
  "function forcedTransfer(address from, address to, uint256 value, bytes data)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const token    = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

  console.log("Caller (must have BURNER_ROLE; admin needed if forcedTransfer is used):", wallet.address);
  console.log("Token:", TOKEN_ADDRESS);
  console.log("Target address:", TARGET_ADDRESS);
  console.log("Treasury address:", TREASURY_ADDRESS);
  console.log("Amount (human):", AMOUNT);

  const BURNER_ROLE        = await token.BURNER_ROLE();
  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

  const isBurner = await token.hasRole(BURNER_ROLE, wallet.address);
  const isAdmin  = await token.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);

  console.log("Caller has BURNER_ROLE:", isBurner);
  console.log("Caller has DEFAULT_ADMIN_ROLE:", isAdmin);

  if (!isBurner) {
    throw new Error("Caller must have BURNER_ROLE for burning.");
  }

  const decimals = await token.decimals();
  const amount   = ethers.parseUnits(AMOUNT, decimals);

  console.log("Amount to destroy (base units):", amount.toString());

  const targetBefore   = await token.balanceOf(TARGET_ADDRESS);
  const treasuryBefore = await token.balanceOf(TREASURY_ADDRESS);
  const totalBefore    = await token.totalSupply();

  console.log("Target balance before (base units):",   targetBefore.toString());
  console.log("Treasury balance before (base units):", treasuryBefore.toString());
  console.log("Total supply before (base units):",     totalBefore.toString());

  if (targetBefore < amount) {
    throw new Error(`Target balance is smaller than amount. balance=${targetBefore.toString()}, amount=${amount.toString()}`);
  }

  const frozen = await token.isFrozen(TARGET_ADDRESS);
  console.log("Target is frozen:", frozen);

  const burnFn          = token["burn(address,uint256,bytes)"];
  const forcedTransferFn = token["forcedTransfer(address,address,uint256,bytes)"];

  // Case 1: not frozen → direct burn
  if (!frozen) {
    console.log("Target not frozen → burning directly from TARGET_ADDRESS.");

    const tx = await burnFn(TARGET_ADDRESS, amount, "0x");
    console.log("Burn tx hash:", tx.hash);
    await tx.wait();
  } else {
    // Case 2: frozen → forcedTransfer + burn
    console.log("Target is frozen → forcedTransfer to treasury, then burn there.");

    if (!isAdmin) {
      throw new Error("Caller must also have DEFAULT_ADMIN_ROLE to use forcedTransfer on a frozen address.");
    }

    // Step 1: forcedTransfer
    console.log("Calling forcedTransfer(TARGET → TREASURY) …");
    const tx1 = await forcedTransferFn(TARGET_ADDRESS, TREASURY_ADDRESS, amount, "0x");
    console.log("forcedTransfer tx hash:", tx1.hash);
    await tx1.wait();

    const targetMid   = await token.balanceOf(TARGET_ADDRESS);
    const treasuryMid = await token.balanceOf(TREASURY_ADDRESS);

    console.log("Target balance after forcedTransfer (base units):",   targetMid.toString());
    console.log("Treasury balance after forcedTransfer (base units):", treasuryMid.toString());

    // Step 2: burn from treasury
    console.log("Burning from Treasury via burn(address,uint256,bytes) …");
    const tx2 = await burnFn(TREASURY_ADDRESS, amount, "0x");
    console.log("Burn tx hash:", tx2.hash);
    await tx2.wait();
  }

  const targetAfter   = await token.balanceOf(TARGET_ADDRESS);
  const treasuryAfter = await token.balanceOf(TREASURY_ADDRESS);
  const totalAfter    = await token.totalSupply();

  console.log("Target balance after (base units):",   targetAfter.toString());
  console.log("Treasury balance after (base units):", treasuryAfter.toString());
  console.log("Total supply after (base units):",     totalAfter.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

