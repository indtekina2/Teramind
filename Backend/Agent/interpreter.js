const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function interpretProblem(userMessage, modelName, tries = 5) {
  const model = genAI.getGenerativeModel({
    model: modelName || "gemini-3.1-flash-lite",

    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: {
            type: "STRING",
          },
          duration: {
            type: "STRING",
            nullable: true,
          },
          symptoms: {
            type: "ARRAY",
            items: {
              type: "STRING",
            },
          },
          triggers: {
            type: "ARRAY",
            items: {
              type: "STRING",
            },
          },
          severity: {
            type: "STRING",
            nullable: true,
          },
          additional_information: {
            type: "ARRAY",
            items: {
              type: "STRING",
            },
          },
        },
        required: [
          "summary",
          "duration",
          "symptoms",
          "triggers",
          "severity",
          "additional_information",
        ],
      },
    },
  });

  try {
    const prompt = `
You are a medical problem interpreter.

Your job is to convert the user's description into structured
symptom information.

Do NOT diagnose the patient.
Do NOT recommend medication.
Do NOT invent symptoms.

User description:

${userMessage}
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    console.log("Interpretation result:", text);

    return {
      success: true,
      data: JSON.parse(text)
    };
  } catch (error) {
    if (error.message.includes("429") || error.message.includes("Quota")) {
      return {
        success: false,
        code: 429,
        error: "Rate limit exceeded. Please try again later.",
      };
    } else if (
      error.message.includes("403") ||
      error.message.includes("API key")
    ) {
      return {
        success: false,
        code: 403,
        error: "Invalid or missing API key configuration.",
      };
    } else if (
      error.message.includes("503") ||
      error.message.includes("Service Unavailable")
    ) {
      // will retry in 5 seconds
      console.error("Service Unavailable. Retrying in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return interpretProblem(userMessage, modelName, tries - 1);
    }
  }
}

module.exports = interpretProblem;
