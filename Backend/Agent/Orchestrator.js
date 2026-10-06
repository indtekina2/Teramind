const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const OrchestratorSchema = require("../Schema/OrchestratorSchema");
const Agents = require("../Agents");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Build dynamic system instructions from the registered agents
const agentManifest = Agents.map((agent) => {
  return `- Name: ${agent.name}
  Description: ${agent.description}
  Required Input Schema: ${JSON.stringify(agent.input)}`;
}).join("\n\n");

console.log(agentManifest)

const systemPrompt = `You are the Master Orchestrator for an AI Multi-Agent System.
Your task is to analyze user requests, break down complex tasks, and route control between specialized agents to reach a definitive, well-evaluated outcome.

Available Agents:
${agentManifest}

Operational Rules:
1. ALWAYS start with the 'Interpreter' agent if the user input is raw, ambiguous, or unparsed.
2. Examine execution logs and state context before deciding the next step.
3. Arguments in 'inputForNextAgents' MUST match the target agent's required positional parameters strictly:
   - Interpreter: [userMessage]
   - Optimist: [problem]
   - Pessimist: [problem]
   - Critic: [problem, solution]
4. Do NOT re-run an agent with identical inputs unless resolving an explicit error or missing dependency.
5. Synthesize state context continuously. Once you have sufficient information or evaluations, select "FINISH".`;

/**
 * Single planning turn of the orchestrator to decide the next action.
 */
async function decideNextStep(
  userQuery,
  executionHistory,
  accumulatedContext,
  modelName = "gemini-3.1-flash-lite",
  tries = 5
) {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: OrchestratorSchema,
      },
    });

    const promptPayload = `
# Original User Query:
${userQuery}

# Current Accumulated Memory Context:
${JSON.stringify(accumulatedContext, null, 2)}

# Execution History Trace:
${JSON.stringify(executionHistory, null, 2)}

Based on the current state, determine the next agent to execute and construct its required arguments. If processing is complete, select "FINISH".
`;

    const result = await model.generateContent(promptPayload);
    return JSON.parse(result.response.text());
  } catch (error) {
    const isServiceUnavailable =
      error.message.includes("503") || error.message.includes("Service Unavailable");

    if (isServiceUnavailable && tries > 0) {
      const delay = (6 - tries) * 2000;
      console.warn(`[Orchestrator] Service unavailable. Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return decideNextStep(userQuery, executionHistory, accumulatedContext, modelName, tries - 1);
    }
    throw error;
  }
}

async function runOrchestrator(initialQuery, maxSteps = 8, modelName = "gemini-3.1-flash-lite") {
  const executionHistory = [];
  let accumulatedContext = [];
  let currentStep = 0;

  console.log(`\n🚀 [Orchestrator] Starting workflow for query: "${initialQuery}"\n`);

  while (currentStep < maxSteps) {
    currentStep++;
    console.log(`\n--- Loop Iteration ${currentStep} ---`);

    // Ask Orchestrator for next step
    const plan = await decideNextStep(initialQuery, executionHistory, accumulatedContext, modelName);
    console.log(`🤖 Orchestrator Decision: [${plan.nextAgent}]`);
    console.log(`💡 Decision Reasoning: ${plan.reasoning}`);

    // Update accumulated context with orchestrator memory
    if (plan.context && Array.isArray(plan.context)) {
      accumulatedContext = plan.context;
    }

    // Check for completion
    if (plan.nextAgent === "FINISH") {
      console.log(`\n✅ [Orchestrator] Workflow completed successfully in ${currentStep} iterations.`);
      return {
        success: true,
        iterations: currentStep,
        finalContext: accumulatedContext,
        history: executionHistory,
      };
    }

    // Locate target agent
    const agentConfig = Agents.find((a) => a.name === plan.nextAgent);
    if (!agentConfig) {
      throw new Error(`Target agent '${plan.nextAgent}' is not registered in index.js`);
    }

    // Dispatch agent call with positional arguments
    console.log(`⚙️ Executing Agent: ${agentConfig.name} with inputs:`, plan.inputForNextAgents);

    const agentArgs = plan.inputForNextAgents || [];
    const agentResponse = await agentConfig.agent(...agentArgs);

    // Record step execution output into history log
    executionHistory.push({
      step: currentStep,
      agent: plan.nextAgent,
      inputs: plan.inputForNextAgents,
      reasoning: plan.reasoning,
      response: agentResponse,
    });

    if (!agentResponse.success) {
      console.error(`❌ Agent [${plan.nextAgent}] failed:`, agentResponse.error);
    } else {
      console.log(`✅ Agent [${plan.nextAgent}] execution finished.`);
    }
  }

  console.warn(`⚠️ [Orchestrator] Reached max step threshold (${maxSteps}) without explicit FINISH signal.`);
  return {
    success: false,
    reason: "Max iterations reached",
    finalContext: accumulatedContext,
    history: executionHistory,
  };
}

module.exports = {
  runOrchestrator,
  decideNextStep,
};