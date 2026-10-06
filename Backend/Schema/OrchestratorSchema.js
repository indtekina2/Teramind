const { SchemaType } = require("@google/generative-ai");

const OrchestratorSchema = {
  type: SchemaType.OBJECT,
  properties: {
    nextAgent: {
      type: SchemaType.STRING,
      enum: [
        "Interpreter",
        "Critic",
        "Optimist",
        "Pessimist",
        "FINISH"
      ],
      description: "The name of the next specialist agent to invoke, or FINISH when processing is complete.",
    },
    context: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          information: {
            type: SchemaType.STRING,
            description: "Key facts or insights extracted from previous agent runs.",
          },
          reasoning: {
            type: SchemaType.STRING,
            description: "Why this piece of information is relevant to the overall plan.",
          },
        },
        required: ["information", "reasoning"],
      },
      description: "Accumulated memory and structured state passed across workflow iterations.",
    },
    inputForNextAgents: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description: "Positional string arguments required by the target agent (e.g. [userMessage] for Interpreter; [problem] for Optimist/Pessimist; [problem, solution] for Critic).",
    },
    reasoning: {
      type: SchemaType.STRING,
      description: "Strategic explanation for choosing the next step or concluding the workflow.",
    },
  },
  required: ["nextAgent", "context", "inputForNextAgents", "reasoning"],
};

module.exports = OrchestratorSchema;