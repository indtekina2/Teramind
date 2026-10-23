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
2. After interpreting a new problem, use 'PastProblems' to search similar completed analyses and use relevant takeaways as historical context.
3. Examine execution logs and state context before deciding the next step.
4. Arguments in 'inputForNextAgents' MUST match the target agent's required positional parameters strictly:
   - Interpreter: [userMessage]
   - PastProblems: [problem, excludeRunId]
   - Optimist: [problem]
   - Pessimist: [problem]
   - Critic: [problem, solution]
   - Summary: [problem, optimistJson, pessimistJson, criticJson]
5. Do NOT re-run an agent with identical inputs unless resolving an explicit error or missing dependency.
6. If the Critic is not satisfied, choose the most relevant available agent to revise or re-evaluate the issue, then send the result back to the Critic. Repeat as needed, respecting the workflow's bounded review limit.
7. Run Optimist and Pessimist before Critic. Once Critic is satisfied, use Summary to synthesize the Optimist, Pessimist, and latest Critic assessments. Summary must be the final agent; do not finish without it.
8. Synthesize state context continuously. Try to ask the user for additional information only when it is necessary.`;

const MAX_CRITIC_ROUNDS = 3;
const REPAIR_AGENTS = ["Interpreter", "PastProblems", "Optimist", "Pessimist"];

function lastAgentIndex(history, agentName) {
  return history.map((step) => step.agent).lastIndexOf(agentName);
}

function getResponse(history, agentName) {
  const index = lastAgentIndex(history, agentName);
  return index < 0 ? null : history[index].response;
}

function criticIsSatisfied(response) {
  if (!response?.success || !response.data) return false;

  const verdict = String(response.data.verdict || "").toLowerCase();
  const unresolvedVerdict = /not satisfied|requires? more information|uncertain|flawed|not sound|needs? revision/.test(verdict);
  const seriousFlaw = (response.data.flaws || []).some((flaw) =>
    ["critical", "major"].includes(String(flaw.severity || "").toLowerCase())
  );

  return response.data.confidence === "high" && !unresolvedVerdict && !seriousFlaw;
}

function serializeResponse(response) {
  return JSON.stringify(response?.success ? response.data : {
    error: response?.error || "No successful assessment was recorded.",
  });
}

function buildProblem(history, initialQuery) {
  const interpretation = getResponse(history, "Interpreter")?.data;
  const mainProblems = interpretation?.Main_Problem
    ?.map((item) => item.problem)
    .filter(Boolean);
  return mainProblems?.length ? mainProblems.join("\n") : initialQuery;
}

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

async function runOrchestrator(
  initialQuery,
  maxSteps = 24,
  modelName = "gemini-3.1-flash-lite",
  options = {}
) {
  const executionHistory = options.history || [];
  let accumulatedContext = options.finalContext || [];
  let currentStep = options.currentStep || 0;

  console.log("Accumulated Context:", accumulatedContext);
  console.log(`\n🚀 [Orchestrator] Starting workflow for query: "${initialQuery}"\n`);

  while (currentStep < maxSteps) {
    currentStep++;
    console.log(`\n--- Loop Iteration ${currentStep} ---`);

    // Ask Orchestrator for next step
    let plan = await decideNextStep(initialQuery, executionHistory, accumulatedContext, modelName);
    if (options.resumeAfterInput) {
      plan = {
        ...plan,
        nextAgent: "Interpreter",
        inputForNextAgents: [initialQuery],
        reasoning: "Re-interpret the problem using the user's clarification.",
      };
      options.resumeAfterInput = false;
    } else if (lastAgentIndex(executionHistory, "Interpreter") < 0) {
      plan = {
        ...plan,
        nextAgent: "Interpreter",
        inputForNextAgents: [initialQuery],
        reasoning: "Interpret the user's problem before specialist analysis.",
      };
    } else if (
      lastAgentIndex(executionHistory, "PastProblems") <
      lastAgentIndex(executionHistory, "Interpreter")
    ) {
      const interpretedProblem = buildProblem(executionHistory, initialQuery);
      plan = {
        ...plan,
        nextAgent: "PastProblems",
        inputForNextAgents: [interpretedProblem, options.runId || ""],
        reasoning: "Search past analyses for relevant historical context.",
      };
    } else {
      const latestInterpreter = lastAgentIndex(executionHistory, "Interpreter");
      const latestOptimist = lastAgentIndex(executionHistory, "Optimist");
      const latestPessimist = lastAgentIndex(executionHistory, "Pessimist");
      const latestSpecialist = Math.max(latestOptimist, latestPessimist);
      const latestCritic = lastAgentIndex(executionHistory, "Critic");
      const problem = buildProblem(executionHistory, initialQuery);
      const optimistResponse = getResponse(executionHistory, "Optimist");
      const pessimistResponse = getResponse(executionHistory, "Pessimist");
      const criticResponse = getResponse(executionHistory, "Critic");

      if (latestOptimist < latestInterpreter) {
        plan = {
          ...plan,
          nextAgent: "Optimist",
          inputForNextAgents: [problem],
          reasoning: "Develop the constructive solution for the interpreted problem.",
        };
      } else if (latestPessimist < latestInterpreter) {
        plan = {
          ...plan,
          nextAgent: "Pessimist",
          inputForNextAgents: [problem],
          reasoning: "Assess risks and failure modes for the interpreted problem.",
        };
      } else if (latestCritic < latestSpecialist) {
        plan = {
          ...plan,
          nextAgent: "Critic",
          inputForNextAgents: [
            problem,
            JSON.stringify({
              optimist: optimistResponse?.data || optimistResponse?.error,
              pessimist: pessimistResponse?.data || pessimistResponse?.error,
            }),
          ],
          reasoning: "Evaluate both specialist assessments against the original problem.",
        };
      } else if (latestCritic >= 0 && !criticIsSatisfied(criticResponse)) {
        const criticRounds = executionHistory
          .slice(latestInterpreter + 1)
          .filter((step) => step.agent === "Critic").length;

        if (criticRounds < MAX_CRITIC_ROUNDS) {
          const requestedAgent = REPAIR_AGENTS.includes(plan.nextAgent)
            ? plan.nextAgent
            : "Optimist";
          const criticFeedback = serializeResponse(criticResponse);
          const repairContext = `${problem}\n\nLatest Critic feedback:\n${criticFeedback}\n\nRevise or re-evaluate your part of the analysis to address this feedback.`;
          const repairInputs = {
            Interpreter: [repairContext],
            PastProblems: [repairContext, options.runId || ""],
            Optimist: [repairContext],
            Pessimist: [repairContext],
          };
          plan = {
            ...plan,
            nextAgent: requestedAgent,
            inputForNextAgents: repairInputs[requestedAgent],
            reasoning: `The Critic is not satisfied. Ask ${requestedAgent} to address its latest feedback, then re-run the Critic.`,
          };
        } else {
          plan = {
            ...plan,
            nextAgent: "Summary",
            inputForNextAgents: [
              problem,
              serializeResponse(optimistResponse),
              serializeResponse(pessimistResponse),
              serializeResponse(criticResponse),
            ],
            reasoning: "The Critic review limit was reached; synthesize the findings and clearly report unresolved concerns.",
          };
        }
      } else if (latestCritic >= 0) {
        plan = {
          ...plan,
          nextAgent: "Summary",
          inputForNextAgents: [
            problem,
            serializeResponse(optimistResponse),
            serializeResponse(pessimistResponse),
            serializeResponse(criticResponse),
          ],
          reasoning: "The Critic is satisfied; synthesize all three specialist assessments into the final result.",
        };
      }
    }
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

    const agentArgs = [...(plan.inputForNextAgents || [])];
    if (plan.nextAgent === "PastProblems" && agentArgs.length > 1) {
      agentArgs[1] = options.runId || "";
    }
    const agentResponse = await agentConfig.agent(...agentArgs);

    // Record step execution output into history log
    executionHistory.push({
      step: currentStep,
      agent: plan.nextAgent,
      inputs: plan.inputForNextAgents,
      reasoning: plan.reasoning,
      response: agentResponse,
    });

    let questions = agentResponse.success && Array.isArray(agentResponse.data?.additional_needed_info)
      ? agentResponse.data.additional_needed_info.filter((question) => typeof question === "string" && question.trim())
      : [];
    if (agentResponse.success && agentResponse.data?.confidence === "low" && !questions.length) {
      const missingInformation = Array.isArray(agentResponse.data.missingInformation)
        ? agentResponse.data.missingInformation.filter((item) => typeof item === "string" && item.trim())
        : [];
      questions = missingInformation.length
        ? missingInformation.slice(0, 3).map((item) => `Please clarify: ${item}`)
        : [`${plan.nextAgent} is uncertain. What additional information should it consider?`];
    }
    if (options.humanInLoop && questions.length) {
      return {
        success: false,
        awaitingInput: true,
        pendingQuestions: questions,
        iterations: currentStep,
        finalContext: accumulatedContext,
        history: executionHistory,
      };
    }

    if (plan.nextAgent === "Summary") {
      return {
        success: agentResponse.success,
        reason: agentResponse.success ? undefined : agentResponse.error || "The Summary agent failed.",
        iterations: currentStep,
        finalContext: accumulatedContext,
        history: executionHistory,
      };
    }

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
    iterations: currentStep,
  };
}

module.exports = {
  runOrchestrator,
  decideNextStep,
  criticIsSatisfied,
};