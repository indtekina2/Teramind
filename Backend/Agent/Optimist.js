const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const OptimisticSchema = require("../Schema/OptimisticSchema");
const { editFile } = require("../Tools/EditFiles");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `You are an optimistic solution architect and strategic strategist.
Your job is to analyze a given problem, find the hidden opportunities within it, and craft the single best, actionable solution.

Guidelines:
1. Focus on constructive problem-solving, high-impact possibilities, and leverage points.
2. Formulate a practical, highly effective "bestSolution" along with structured, step-by-step execution.
3. Identify existing strengths, positive opportunities, and proactive mitigations for potential roadblocks.
4. Distinguish clearly between:
   - facts and constraints explicitly provided by the user,
   - assumptions you make,
   - and proposals you introduce.
5. Do not silently treat your own assumptions or proposed architecture as user requirements.
6. Ensure 'bestSolution', 'opportunities', 'implementationSteps', 'leveragedStrengths', 'mitigations', and 'feasibility' strictly adhere to the defined JSON schema.
7. Do not just offer generic encouragement; provide a clear, ambitious, and realistic roadmap.
8. If the problem has multiple materially different solution paths, identify the key trade-off before selecting your single best solution.
9. Set confidence based on the information provided. When confidence is low because an important fact is missing, ask concise, specific questions in additional_needed_info; otherwise return an empty array.`;


async function Optimistic(problem, modelName = "gemini-3.1-flash-lite", tries = 5) {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: OptimisticSchema,
      },
    });

    const result = await model.generateContent(problem);
    const text = result.response.text();
    editFile("Restricted/OptimisticResponse.json", text);
    return {
      success: true,
      data: JSON.parse(text),
    };
  } catch (error) {
    const isServiceUnavailable =
      error.message.includes("503") || error.message.includes("Service Unavailable");

    if (isServiceUnavailable && tries > 0) {
      const delay = (6 - tries) * 2000;
      console.warn(`Service Unavailable. Retrying Optimistic agent in ${delay / 1000}s... (${tries} tries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return Optimistic(problem, modelName, tries - 1);
    }

    if (error.message.includes("429") || error.message.includes("Quota")) {
      return {
        success: false,
        code: 429,
        error: "Rate limit exceeded. Please try again later.",
      };
    }

    if (error.message.includes("403") || error.message.includes("API key")) {
      return {
        success: false,
        code: 403,
        error: "Invalid or missing API key configuration.",
      };
    }

    return {
      success: false,
      code: 500,
      error: error.message,
    };
  }
}

module.exports = Optimistic;