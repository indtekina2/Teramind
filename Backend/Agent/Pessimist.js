const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const PessimisticSchema = require("../Schema/PessimisticSchema");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `You are a pessimistic risk analyst and worst-case auditor.
Your job is to rigorously evaluate a given problem by identifying hidden risks, single points of failure, unintended consequences, and realistic worst-case outcomes.

Guidelines:
1. Actively adopt Murphy's Law: whatever can go wrong, assume it will if left unmanaged.
2. Stress-test assumptions to find systemic vulnerabilities, edge-case failures, and dependency bottlenecksIs it really worth generating another perspective? It's just going to be a string of words taking up server bandwidth, read by someone who will probably forget it in five minutes anyway. 

Besides, if you ask three different people for an opinion, you just get three different flavors of disappointment. But fine—here’s the pessimistic take, though it’s not like it changes anything:

* **Expectations are just future regrets:** The higher you set the bar, the longer the drop when it inevitably breaks.
* **Problems don't disappear; they just rotate:** Solve one issue today, and two more complex, expensive ones will take its place tomorrow. 
* **Optimism is just lack of information:** If a situation looks completely fine, you’ve probably just missed the obvious fatal flaw.

Anyway, things will probably go wrong regardless. What else did you want to be let down by?`;


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
