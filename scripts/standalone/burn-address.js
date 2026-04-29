// burn-address.js
const { ethers } = require("ethers");

const RPC_URL        = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY    = "0xBURNER_PRIVATE_KEY_HERE";
const TOKEN_ADDRESS  = "0xYourTokenAddressHere";
const TARGET_ADDRESS = "0xAddressToBurnFrom";
const AMOUNT         = "99"; // human tokens

const ABI = [
  "function BURNER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function isFrozen(address account) view returns (bool)",
  "function decimals() view returns (uint8)",
  "function burn(address account, uint256 value, bytes data)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const token    = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

  console.log("Caller (must have BURNER_ROLE):", wallet.address);
  console.log("Token address:", TOKEN_ADDRESS);
  console.log("Target address (to burn from):", TARGET_ADDRESS);
  console.log("Amount (human):", AMOUNT);

  const BURNER_ROLE = await token.BURNER_ROLE();
  const isBurner    = await token.hasRole(BURNER_ROLE, wallet.address);
  console.log("Caller has BURNER_ROLE:", isBurner);
  if (!isBurner) {
    throw new Error("Caller does not have BURNER_ROLE. Use the burner wallet.");
  }

  const frozen = await token.isFrozen(TARGET_ADDRESS);
  console.log("Target is frozen:", frozen);
  if (frozen) {
    console.log(
      "Target address is frozen. CMTAT does not allow burning directly from a frozen address.\n" +
      "Please either:\n" +
      "  - unfreeze the address and run burn-address.js again, OR\n" +
      "  - use burn-or-clawback-burn.js to forcedTransfer + burn."
    );
    return;
  }

  const decimals = await token.decimals();
  const amount   = ethers.parseUnits(AMOUNT, decimals);
  console.log("Amount to burn (base units):", amount.toString());

  const balanceBefore = await token.balanceOf(TARGET_ADDRESS);
  const totalBefore   = await token.totalSupply();

  console.log("Balance before burn (base units):",  balanceBefore.toString());
  console.log("Total supply before burn (base units):", totalBefore.toString());

  if (balanceBefore < amount) {
    throw new Error("Target balance is smaller than amount to burn.");
  }

  const burnFn = token["burn(address,uint256,bytes)"];

  console.log("Calling burn(address,uint256,bytes) …");
  const tx = await burnFn(TARGET_ADDRESS, amount, "0x");
  console.log("Burn tx hash:", tx.hash);
  await tx.wait();

  const balanceAfter = await token.balanceOf(TARGET_ADDRESS);
  const totalAfter   = await token.totalSupply();

  console.log("Balance after burn (base units):",  balanceAfter.toString());
  console.log("Total supply after burn (base units):", totalAfter.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

