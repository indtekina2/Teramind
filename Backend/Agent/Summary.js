const { GoogleGenerativeAI } = require("@google/generative-ai");
const SummarySchema = require("../Schema/SummarySchema");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `You are the final synthesis agent.
Read the Optimist, Pessimist, and Critic assessments together and produce a useful, balanced final result for the user's original problem.

Guidelines:
1. Weigh the Optimist's actionable proposal against the Pessimist's realistic risks and the Critic's evaluation.
2. Do not simply repeat the three reports or treat any one agent as automatically correct.
3. Give a clear recommendation, preserve material caveats, and distinguish evidence from assumptions.
4. If the Critic remains unsatisfied after review, explicitly say so and preserve unresolved concerns; do not imply approval.
5. Do not invent missing facts. Follow the provided JSON schema exactly.`;

async function summarize(problem, optimist, pessimist, critic, modelName = "gemini-3.1-flash-lite", tries = 5) {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SummarySchema,
      },
    });

    const result = await model.generateContent(`
# Original problem
${problem}

# Optimist assessment
${optimist}

# Pessimist assessment
${pessimist}

# Critic assessment
${critic}
`);

    return {
      success: true,
      data: JSON.parse(result.response.text()),
    };
  } catch (error) {
    const message = error.message || "";
    const isServiceUnavailable = message.includes("503") || message.includes("Service Unavailable");

    if (isServiceUnavailable && tries > 0) {
      const delay = (6 - tries) * 2000;
      console.warn(`Service Unavailable. Retrying Summary agent in ${delay / 1000}s... (${tries} tries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return summarize(problem, optimist, pessimist, critic, modelName, tries - 1);
    }

    if (message.includes("429") || message.includes("Quota")) {
      return { success: false, code: 429, error: "Rate limit exceeded. Please try again later." };
    }
    if (message.includes("403") || message.includes("API key")) {
      return { success: false, code: 403, error: "Invalid or missing API key configuration." };
    }
    return { success: false, code: 500, error: message };
  }
}

module.exports = summarize;
