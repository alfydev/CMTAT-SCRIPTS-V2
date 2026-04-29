// handover-default-admin-to-safe.js
// Give DEFAULT_ADMIN_ROLE to a Safe, then (optionally) revoke it from the current EOA admin.

const { ethers } = require("ethers");

// 🔧 CONFIG – fill these in:
const RPC_URL       = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
const PRIVATE_KEY   = "0xCURRENT_ADMIN_PRIVATE_KEY_HERE";  // your EOA that is currently admin
const TOKEN_ADDRESS = "0xYourCMTATStandaloneAddressHere";
const SAFE_ADDRESS  = "0xYourGnosisSafeAddressHere";       // new admin “owner”

// If true, the script will revoke DEFAULT_ADMIN_ROLE from the caller after granting it to the Safe.
const REVOKE_FROM_CALLER = true;

// Minimal ABI for admin handover
const ABI = [
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const token    = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);

  console.log("Caller (current admin EOA):", wallet.address);
  console.log("Token:", TOKEN_ADDRESS);
  console.log("Safe (new admin):", SAFE_ADDRESS);

  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

  const callerIsAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
  console.log("Caller has DEFAULT_ADMIN_ROLE:", callerIsAdmin);
  if (!callerIsAdmin) {
    throw new Error("Caller is not DEFAULT_ADMIN_ROLE. Use your current admin EOA here.");
  }

  const safeIsAdminBefore = await token.hasRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
  console.log("Safe has DEFAULT_ADMIN_ROLE before:", safeIsAdminBefore);

  if (!safeIsAdminBefore) {
    console.log("Granting DEFAULT_ADMIN_ROLE to Safe...");
    const tx = await token.grantRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
    console.log("grantRole tx hash:", tx.hash);
    await tx.wait();
  } else {
    console.log("Safe already has DEFAULT_ADMIN_ROLE, skipping grant.");
  }

  const safeIsAdminAfter = await token.hasRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
  console.log("Safe has DEFAULT_ADMIN_ROLE after:", safeIsAdminAfter);

  if (!safeIsAdminAfter) {
    throw new Error("Grant to Safe failed – do NOT revoke yourself, or you’ll brick admin control.");
  }

  if (REVOKE_FROM_CALLER) {
    if (wallet.address.toLowerCase() === SAFE_ADDRESS.toLowerCase()) {
      console.log("Caller IS the Safe – not revoking DEFAULT_ADMIN_ROLE from caller.");
    } else {
      console.log("Revoking DEFAULT_ADMIN_ROLE from caller…");
      const tx2 = await token.revokeRole(DEFAULT_ADMIN_ROLE, wallet.address);
      console.log("revokeRole tx hash:", tx2.hash);
      await tx2.wait();

      const callerIsAdminAfter = await token.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
      console.log("Caller has DEFAULT_ADMIN_ROLE after revoke:", callerIsAdminAfter);
    }
  } else {
    console.log("REVOKE_FROM_CALLER=false, so caller keeps DEFAULT_ADMIN_ROLE too.");
  }

  console.log("\n✅ Hand-over complete. Safe now controls DEFAULT_ADMIN_ROLE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

