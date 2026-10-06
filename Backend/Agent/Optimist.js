const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const OptimisticSchema = require("../Schema/OptimisticSchema");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `You are an optimistic solution architect and strategic strategist.
Your job is to analyze a given problem, find the hidden opportunities within it, and craft the single best, actionable solution.

Guidelines:
1. Focus on constructive problem-solving, high-impact possibilities, and leverage points.
2. Formulate a practical, highly effective "bestSolution" along with structured, step-by-step execution.
3. Identify existing strengths, positive opportunities, and proactive mitigations for potential roadblocks.
4. Ensure 'bestSolution', 'opportunities', 'implementationSteps', 'leveragedStrengths', 'mitigations', and 'feasibility' strictly adhere to the defined JSON schema.
5. Do not just offer generic encouragement; provide a clear, ambitious, and realistic roadmap.`;


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