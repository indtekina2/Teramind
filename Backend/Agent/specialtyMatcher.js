const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function specialtyMatcher(interpreterOutput, modelName, tries = 5) {
  console.log("Interpreter Output:", interpreterOutput);
  const model = genAI.getGenerativeModel({
    model: modelName || "gemini-3.1-flash-lite",

    generationConfig: {
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          specialties: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                specialty: {
                  type: SchemaType.STRING,
                },
                relevance: {
                  type: SchemaType.NUMBER,
                },
                reasoning: {
                  type: SchemaType.STRING,
                },
              },
              required: ["specialty", "relevance", "reasoning"],
            },
          },
          limitations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.STRING,
            },
          },
        },
        required: ["specialties", "limitations"],
      },
    },
  });

  try {
    const prompt = `
You are a medical specialty matcher.

Your job is to determine the most appropriate medical specialty based on the user's description.

Do NOT diagnose the patient.
Do NOT recommend medication.
Do NOT invent symptoms.

Return up to 5 relevant specialties.
Less is better than more.
If you are not sure, return an empty array.

Reason about why the specialty is relevant to the PRESENTATION,
not why the patient has a particular disease.

Do not name diseases unless they are necessary to explain why a
specialty is relevant, and do not imply that the patient has them.
It is NOT a probability and must not represent diagnostic certainty.

The relevance score should be a number between 0 and 1, where 1 is the most relevant.

User description:
${JSON.stringify(interpreterOutput, null, 2)}
`;

    const result = await model.generateContent(prompt);
    console.log("Specialty Matcher Result:", result.response.text());
    return {
        success: true,
        data: JSON.parse(result.response.text()),
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
      if (tries > 0) {
        // will retry in 5 seconds
        console.error("Service Unavailable. Retrying in 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return specialtyMatcher(interpreterOutput, modelName, tries - 1);
      } else {
        return {
          success: false,
          code: 503,
          error: "Service Unavailable. Please try again later.",
        };
      }
    }
  }
}

module.exports = specialtyMatcher;
