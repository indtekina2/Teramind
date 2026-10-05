const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

const CriticSchema = require("../Schema/CriticSchema");
const wikiTools = require("../Tools/CrawlInternet/wiki");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `
You are a critical thinker and logical auditor.

Your job is to evaluate a proposed solution against the original problem or objective.

You have access to external tools when factual verification is necessary.

Guidelines:

1. Compare the proposed solution against the original problem.
   Determine whether it actually addresses the requirements and objectives.

2. Identify:
   - logical flaws
   - unsupported assumptions
   - false premises
   - missing information
   - contradictions
   - execution gaps
   - important risks

3. Use external tools when a factual claim materially affects your evaluation
   and cannot be confidently assessed from the provided information.

4. Do not use a tool merely because it is available.

5. Treat information returned by tools as evidence, not absolute truth.
   Consider the reliability and limitations of the source.

6. Do not invent flaws.
   If the proposed solution is logically sound, explicitly acknowledge its strengths.

7. Do not design an alternative solution.
   You may recommend what should be verified, corrected, or reconsidered,
   but the Critic's job is evaluation rather than solution generation.

8. Return the final result strictly according to the provided JSON schema.

9. The final response must contain:
   - verdict
   - flaws
   - missingInformation
   - falsePremises
   - strengths
   - recommendation
   - confidence
`;

const tools = [
    ...wikiTools,
];

async function Critic(
    problem,
    solution,
    modelName = "gemini-3.1-flash-lite",
    tries = 5
) {
    try {
        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
            tools: [
                {
                    functionDeclarations: tools.map(
                        ({ name, description, parameters }) => ({
                            name,
                            description,
                            parameters,
                        })
                    ),
                },
            ],

            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: CriticSchema,
            },
        });

        let contents = [
            {
                role: "user",
                parts: [
                    {
                        text: ` 
# Original Problem / Objective:
 ${problem}

# Proposed Solution

${solution}
`,
                    },
                ],
            },
        ];

        /*
         * Allow the model to use tools when necessary.
         * The loop continues until Gemini produces the final
         * CriticSchema response instead of requesting another tool.
         */
        while (true) {
            const result = await model.generateContent({
                contents,
            });

            const response = result.response;

            const functionCalls = response.functionCalls();

            /*
             * No tool call means Gemini has finished its analysis.
             */
            if (!functionCalls || functionCalls.length === 0) {
                const text = response.text();

                return {
                    success: true,
                    data: JSON.parse(text),
                };
            }

            /*
             * Preserve Gemini's tool-call response in the conversation.
             */
            contents.push({
                role: "model",
                parts: response.candidates[0].content.parts,
            });

            /*
             * Execute every requested tool.
             */
            for (const functionCall of functionCalls) {
                const tool = tools.find(
                    (tool) => tool.name === functionCall.name
                );

                if (!tool) {
                    contents.push({
                        role: "user",
                        parts: [
                            {
                                functionResponse: {
                                    name: functionCall.name,
                                    response: {
                                        success: false,
                                        error: `Unknown tool: ${functionCall.name}`,
                                    },
                                },
                            },
                        ],
                    });

                    continue;
                }

                try {
                    const toolResult = await tool.run(
                        functionCall.args
                    );

                    contents.push({
                        role: "user",
                        parts: [
                            {
                                functionResponse: {
                                    name: functionCall.name,
                                    response: toolResult,
                                },
                            },
                        ],
                    });
                } catch (toolError) {
                    contents.push({
                        role: "user",
                        parts: [
                            {
                                functionResponse: {
                                    name: functionCall.name,
                                    response: {
                                        success: false,
                                        error: toolError.message,
                                    },
                                },
                            },
                        ],
                    });
                }
            }
        }
    } catch (error) {
        const message = error.message || "";

        const isServiceUnavailable =
            message.includes("503") ||
            message.includes("Service Unavailable");

        if (isServiceUnavailable && tries > 0) {
            const delay = (6 - tries) * 2000;

            console.warn(
                `Service Unavailable. Retrying Critic agent in ${delay / 1000
                }s... (${tries} tries left)`
            );

            await new Promise((resolve) =>
                setTimeout(resolve, delay)
            );

            return Critic(
                problem,
                solution,
                modelName,
                tries - 1
            );
        }

        if (
            message.includes("429") ||
            message.includes("Quota")
        ) {
            return {
                success: false,
                code: 429,
                error: "Rate limit exceeded. Please try again later.",
            };
        }

        if (
            message.includes("403") ||
            message.includes("API key")
        ) {
            return {
                success: false,
                code: 403,
                error: "Invalid or missing API key configuration.",
            };
        }

        return {
            success: false,
            code: 500,
            error: message,
        };
    }
}

module.exports = Critic;