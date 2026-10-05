const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const CriticSchema = require("../Schema/CriticSchema");

require("dotenv").config();

console.log(
  "API key loaded:",
  Boolean(process.env.GEMINI_API_KEY)
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `You are a problem interpreter.
Your job is to understand the user's description and convert it into structured information.

Identify the user's main problem, their goals, relevant information they provided, and any requirements or constraints.
Do not solve the problem, diagnose it, or invent missing information.
Separate facts explicitly provided by the user from your own assumptions.
If the user provides an idea, request, question, or goal instead of a problem, interpret it accordingly.
A user may have multiple main problems or goals; preserve them when they are meaningfully distinct.
Only include information that is relevant to understanding or addressing the user's request.
Keep the interpretation concise, precise, and faithful to the user's actual intent.
In case of being unsure, add questions in additional_needed_info.`;

async function interpretProblem(userMessage, modelName = "gemini-3.1-flash-lite", tries = 5) {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: interpretationSchema,
      },
    });

    const result = await model.generateContent(userMessage);
    const text = result.response.text();

    return {
      success: true,
      data: JSON.parse(text),
    };
  } catch (error) {
    const isServiceUnavailable = error.message.includes("503") || error.message.includes("Service Unavailable");

    if (isServiceUnavailable && tries > 0) {
      const delay = (6 - tries) * 2000; // Exponential delay: 2s, 4s, 6s, 8s, 10s
      console.warn(`Service Unavailable. Retrying in ${delay / 1000}s... (${tries} tries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return interpretProblem(userMessage, modelName, tries - 1);
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

module.exports = interpretProblem;