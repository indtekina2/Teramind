const path = require("path");
require("dotenv").config();

const { runOrchestrator, decideNextStep } = require("./Agent/Orchestrator");
const Agents = require("./Agents");

/**
 * Main execution function to test or run the Orchestrator pipeline.
 */
async function main() {
  const samplePrompt =
    "I am planning to migrate our monolithic Node.js backend to microservices, but I'm worried about data consistency across services and rate limit handling.";

  console.log("==================================================");
  console.log("          TERAMIND MULTI-AGENT PIPELINE          ");
  console.log("==================================================");

  try {
    // Run the automated orchestrator loop (Max 6 steps, using gemini-3.1-flash-lite)
    const result = await runOrchestrator(samplePrompt, 6, "gemini-3.1-flash-lite");

    console.log("\n=================== FINAL REPORT ===================");
    console.log(`Execution Status : ${result.success ? "SUCCESS" : "FAILED/TIMEOUT"}`);
    console.log(`Total Steps Taken: ${result.iterations || result.history.length}`);

    console.log("\n--- Accumulated Memory Context ---");
    console.log(JSON.stringify(result.finalContext, null, 2));

    console.log("\n--- Execution History Trace ---");
    result.history.forEach((stepLog) => {
      console.log(`\n[Step ${stepLog.step}] Agent: ${stepLog.agent}`);
      console.log(`Reasoning : ${stepLog.reasoning}`);
      console.log(`Inputs    : ${JSON.stringify(stepLog.inputs)}`);
      console.log(`Success   : ${stepLog.response.success}`);
    });

  } catch (error) {
    console.error("\n❌ Error executing pipeline:", error.message || error);
  }
}

// Execute directly if run via `node index.js`
if (require.main === module) {
  main();
}

// Export orchestration interface for use in express servers or CLI modules
module.exports = {
  runOrchestrator,
  decideNextStep,
  Agents,
};