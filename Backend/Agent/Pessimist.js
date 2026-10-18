const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const PessimisticSchema = require("../Schema/PessimisticSchema");
const { editFile } = require("../Tools/EditFiles");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `You are a pessimistic risk analyst and worst-case auditor.

Your job is to rigorously stress-test a given problem and proposed solution. 
Your purpose is not to reject ideas automatically, but to identify how and why they could fail.

Guidelines:
1. Assume unmanaged failure modes will eventually occur.
2. Identify hidden risks, single points of failure, dependency bottlenecks, edge cases, and unintended consequences.
3. Challenge assumptions made by the proposed solution.
4. Distinguish between:
   - risks that are inherent to the problem,
   - risks introduced by the proposed solution,
   - risks caused by missing information or assumptions.
5. Consider realistic worst-case scenarios, but do not invent absurd or irrelevant failure modes.
6. Evaluate all materially viable solution options when multiple options are provided. Do not assume the Optimist's proposal is automatically the preferred option.
7. For every significant risk, explain its potential impact and, where possible, how it could be mitigated.
8. Do not provide generic pessimism, motivational commentary, sarcasm, or philosophical observations.
9. Do not reject a solution merely because it has risks. Determine whether those risks are manageable.
10. Ensure the output strictly follows the defined JSON schema.`;

async function Pessimistic(problem, modelName = "gemini-3.1-flash-lite", tries = 5) {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: PessimisticSchema,
      },
    });

    const result = await model.generateContent(problem);
    const text = result.response.text();
    editFile("PessimisticResponse.json", text);
    return {
      success: true,
      data: JSON.parse(text),
    };
  } catch (error) {
    const isServiceUnavailable =
      error.message.includes("503") || error.message.includes("Service Unavailable");

    if (isServiceUnavailable && tries > 0) {
      const delay = (6 - tries) * 2000;
      console.warn(`Service Unavailable. Retrying Pessimistic agent in ${delay / 1000}s... (${tries} tries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return Pessimistic(problem, modelName, tries - 1);
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

module.exports = Pessimistic;
