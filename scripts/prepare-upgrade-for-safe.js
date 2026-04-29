const { ethers, upgrades } = require("hardhat");

/**
 * ============================================================
 * PREPARE UPGRADE FOR A SAFE-CONTROLLED TRANSPARENT PROXY
 * ============================================================
 *
 * WHAT THIS SCRIPT DOES
 * ---------------------
 * 1) Validates that your new implementation is upgrade-compatible
 *    with the current proxy.
 * 2) Deploys the NEW IMPLEMENTATION contract to the network.
 * 3) Prints the exact Safe transaction you must submit:
 *      ProxyAdmin.upgradeAndCall(proxy, newImplementation, data)
 *
 * IMPORTANT MENTAL MODEL
 * ----------------------
 * Think of the proxy as the permanent "front door" / address.
 * Think of the implementation as the "brain" behind that door.
 *
 * Upgrading means:
 *   - keep the SAME proxy address
 *   - swap in a NEW implementation (new brain)
 *
 * SOMETIMES THERE IS A SECOND STEP
 * --------------------------------
 * Sometimes the new implementation adds new storage variables.
 * Those new variables start empty.
 *
 * Example:
 *   V1 had drawers: [A, B]
 *   V2 adds a new drawer: [C]
 *
 * After upgrading, drawer C exists, but it is empty.
 * If V2 needs C to be initialized to a real value, then after
 * swapping in V2 you must immediately call a setup function such as:
 *
 *   initializeV2(...)
 *
 * That is why we use:
 *
 *   upgradeAndCall(proxy, newImplementation, data)
 *
 * The "data" is:
 *   - "0x"  => do NOT call any post-upgrade function
 *   - encoded function call => DO call the setup/migration function
 *
 * TWO MODES THIS SCRIPT SUPPORTS
 * ------------------------------
 * MODE A - NO POST-UPGRADE INITIALIZER NEEDED
 *   Use:
 *     UPGRADE_CALL_DATA=0x
 *
 *   This is for releases that:
 *     - only patch logic
 *     - only add pure/view/helper functions
 *     - do not require new stored values to be initialized
 *
 * MODE B - POST-UPGRADE INITIALIZER NEEDED
 *   Use either:
 *     1) UPGRADE_CALL_DATA=<already encoded calldata>
 *        OR
 *     2) POST_UPGRADE_FUNCTION + POST_UPGRADE_ARGS_JSON
 *
 *   This is for releases that:
 *     - add new storage that must be initialized
 *     - add a migration function
 *     - add a reinitializer like initializeV2(...)
 *
 * HOW TO KNOW WHICH MODE TO USE
 * -----------------------------
 * Look at the new implementation / release notes.
 *
 * SIGNS THAT YOU PROBABLY NEED MODE B:
 *   - CMTA says "after upgrade, call initializeV2(...)"
 *   - the new contract includes a reinitializer(...)
 *   - the release notes mention migration/setup
 *   - new stored config/roles/addresses/flags are introduced
 *
 * SIGNS THAT MODE A IS PROBABLY ENOUGH:
 *   - only bug fixes in existing logic
 *   - only new view/pure functions
 *   - no migration function is documented
 *   - no new setup values are required
 *
 * IMPORTANT LIMIT
 * ---------------
 * No script can magically know whether every future release needs
 * migration. You must check the new implementation and/or CMTA's
 * release notes.
 *
 * OPERATIONAL RULE OF THUMB
 * -------------------------
 * Always use THIS SAME WORKFLOW:
 *   1) run this script
 *   2) submit the printed Safe tx
 *
 * The only thing that changes between releases is the "data":
 *   - data = 0x                         -> no migration call
 *   - data = encoded initializeV2(...)  -> migration call needed
 */

// -----------------------------
// ENVIRONMENT VARIABLES
// -----------------------------
//
// Required / usually required:
//
// CMTAT_PROXY_ADDRESS=0x...
// PROXY_ADMIN_ADDRESS=0x...
// NEW_IMPLEMENTATION_CONTRACT=CMTATUpgradeableLightV2
//
// Mode A (no post-upgrade initializer needed):
// UPGRADE_CALL_DATA=0x
//
// Mode B option 1 (you already encoded the calldata yourself):
// UPGRADE_CALL_DATA=0xabcdef...
//
// Mode B option 2 (let this script encode the function call):
// POST_UPGRADE_FUNCTION=initializeV2
// POST_UPGRADE_ARGS_JSON=["Some string", "0x1234..."]
//
// Optional:
// CONTRACT_KIND=transparent
//
// NOTE FOR YOUR CMTAT LIGHT CONTRACT:
// This project required:
//   unsafeAllow: ["missing-initializer"]
// during deployment because the initializer validation is inherited.
// We include the same override here for prepareUpgrade().

function boolToYesNo(v) {
  return v ? "YES" : "NO";
}

function isHexStringLike(value) {
  return typeof value === "string" && value.startsWith("0x");
}

async function buildUpgradeCallData(factory) {
  const directCallData = process.env.UPGRADE_CALL_DATA;
  const fnName = process.env.POST_UPGRADE_FUNCTION;
  const argsJson = process.env.POST_UPGRADE_ARGS_JSON;

  // Highest priority: user already supplied exact calldata
  if (directCallData && directCallData !== "") {
    if (!isHexStringLike(directCallData)) {
      throw new Error(
        "UPGRADE_CALL_DATA was provided but is not a hex string starting with 0x."
      );
    }

    return {
      mode:
        directCallData === "0x"
          ? "MODE A: NO post-upgrade initializer"
          : "MODE B: PRE-ENCODED post-upgrade call",
      callData: directCallData,
      explanation:
        directCallData === "0x"
          ? [
              "You explicitly chose NO post-upgrade function call.",
              "The Safe will only switch the proxy to the new implementation.",
            ]
          : [
              "You supplied pre-encoded calldata in UPGRADE_CALL_DATA.",
              "The Safe will upgrade the proxy AND immediately call that encoded function.",
            ],
    };
  }

  // Second priority: encode function call from function name + JSON args
  if (fnName) {
    let args = [];
    if (argsJson && argsJson.trim() !== "") {
      try {
        args = JSON.parse(argsJson);
      } catch (err) {
        throw new Error(
          `POST_UPGRADE_ARGS_JSON is not valid JSON.\nReceived: ${argsJson}\nError: ${err.message}`
        );
      }
      if (!Array.isArray(args)) {
        throw new Error(
          "POST_UPGRADE_ARGS_JSON must be a JSON array, e.g. [\"hello\", 123]."
        );
      }
    }

    const fragment = factory.interface.getFunction(fnName);
    const callData = factory.interface.encodeFunctionData(fragment, args);

    return {
      mode: "MODE B: SCRIPT-ENCODED post-upgrade call",
      callData,
      explanation: [
        `You asked the script to encode ${fnName}(...)`,
        "The Safe will upgrade the proxy AND immediately call that function.",
        "Use this when the new implementation introduces new 'drawers' that must be filled.",
      ],
      encodedFunctionName: fnName,
      encodedArgs: args,
    };
  }

  // Default: safest explicit default is no call
  return {
    mode: "MODE A: NO post-upgrade initializer (default)",
    callData: "0x",
    explanation: [
      "No UPGRADE_CALL_DATA and no POST_UPGRADE_FUNCTION were provided.",
      "The script defaulted to NO post-upgrade function call.",
      "This is correct only if the new implementation does not require migration/setup.",
    ],
  };
}

async function main() {
  const proxyAddress = process.env.CMTAT_PROXY_ADDRESS;
  const proxyAdminAddress = process.env.PROXY_ADMIN_ADDRESS;
  const newImplementationContract =
    process.env.NEW_IMPLEMENTATION_CONTRACT || "CMTATUpgradeableLightV2";
  const contractKind = process.env.CONTRACT_KIND || "transparent";

  if (!proxyAddress) {
    throw new Error("Missing CMTAT_PROXY_ADDRESS in environment variables.");
  }
  if (!proxyAdminAddress) {
    throw new Error("Missing PROXY_ADMIN_ADDRESS in environment variables.");
  }

  const [runner] = await ethers.getSigners();

  console.log("\n============================================================");
  console.log("PREPARE UPGRADE FOR SAFE-CONTROLLED PROXY");
  console.log("============================================================\n");

  console.log("This script DOES NOT perform the final upgrade itself.");
  console.log("It does 2 things locally:");
  console.log("  1) validates + deploys the new implementation");
  console.log("  2) prints the exact Safe transaction to execute\n");

  console.log("Network / runner info");
  console.log("---------------------");
  console.log("Runner address:        ", runner.address);
  console.log("Proxy address:         ", proxyAddress);
  console.log("ProxyAdmin address:    ", proxyAdminAddress);
  console.log("New implementation ct: ", newImplementationContract);
  console.log("Proxy kind:            ", contractKind);
  console.log("");

  const currentImpl =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("Current implementation:", currentImpl);
  console.log("");

  const NewImplementationFactory = await ethers.getContractFactory(
    newImplementationContract
  );

  const modeInfo = await buildUpgradeCallData(NewImplementationFactory);

  console.log("Selected mode");
  console.log("-------------");
  console.log(modeInfo.mode);
  for (const line of modeInfo.explanation) {
    console.log("-", line);
  }
  if (modeInfo.encodedFunctionName) {
    console.log("Encoded function name: ", modeInfo.encodedFunctionName);
    console.log(
      "Encoded function args: ",
      JSON.stringify(modeInfo.encodedArgs, null, 2)
    );
  }
  console.log("");

  console.log("REMINDER");
  console.log("--------");
  console.log("Use MODE A if the new implementation only changes logic");
  console.log("and DOES NOT need new values to be initialized.");
  console.log("");
  console.log("Use MODE B if the new implementation adds new stored");
  console.log("configuration/state and includes a migration or");
  console.log("reinitializer function such as initializeV2(...).");
  console.log("");
  console.log("If in doubt, inspect the new contract and release notes.");
  console.log("Look for: reinitializer(...), initializeV2(...),");
  console.log("migration instructions, or new stored config fields.");
  console.log("");

  console.log("Preparing upgrade...");
  console.log("");

  const newImplementation = await upgrades.prepareUpgrade(
    proxyAddress,
    NewImplementationFactory,
    {
      kind: contractKind,
      unsafeAllow: ["missing-initializer"],
    }
  );

  console.log("SUCCESS: new implementation deployed.");
  console.log("New implementation address:", newImplementation);
  console.log("");

  const proxyAdminInterface = new ethers.Interface([
    "function upgradeAndCall(address proxy, address implementation, bytes data)",
  ]);

  const safeCallData = proxyAdminInterface.encodeFunctionData(
    "upgradeAndCall",
    [proxyAddress, newImplementation, modeInfo.callData]
  );

  console.log("============================================================");
  console.log("SUBMIT THIS TRANSACTION FROM THE SAFE");
  console.log("============================================================");
  console.log("TO:                ", proxyAdminAddress);
  console.log("VALUE:             ", "0");
  console.log("FUNCTION:          ", "upgradeAndCall(address,address,bytes)");
  console.log("PROXY ARG:         ", proxyAddress);
  console.log("IMPLEMENTATION ARG:", newImplementation);
  console.log("DATA ARG:          ", modeInfo.callData);
  console.log("FULL CALLDATA:     ", safeCallData);
  console.log("============================================================\n");

  console.log("What the Safe transaction will do");
  console.log("---------------------------------");
  if (modeInfo.callData === "0x") {
    console.log("1) switch the proxy to the new implementation");
    console.log("2) NOT call any post-upgrade function");
    console.log("");
    console.log("This is the correct choice only if no new 'drawers'");
    console.log("need to be filled after the new code is installed.");
  } else {
    console.log("1) switch the proxy to the new implementation");
    console.log("2) immediately call the supplied migration/setup function");
    console.log("");
    console.log("This is what you want when the new implementation adds");
    console.log("new state that must be initialized right away.");
  }
  console.log("");

  console.log("After the Safe executes the transaction");
  console.log("---------------------------------------");
  console.log("The proxy/token address stays the SAME.");
  console.log("Only the implementation behind it changes.");
  console.log("");
  console.log("Users and integrations must continue using the proxy:");
  console.log(proxyAddress);
  console.log("");

  console.log("Suggested next step");
  console.log("-------------------");
  console.log("After the Safe upgrade is executed, run a verification");
  console.log("script to confirm the implementation changed and that");
  console.log("any new function (e.g. version()) is callable.");
  console.log("");
}

main().catch((error) => {
  console.error("\nERROR\n-----");
  console.error(error);
  process.exitCode = 1;
});

