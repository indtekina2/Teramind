const { SchemaType } = require("@google/generative-ai");

const OptimisticSchema = {
  type: SchemaType.OBJECT,

  properties: {
    bestSolution: {
      type: SchemaType.STRING,
      description:
        "The optimal, high-impact solution designed to resolve the problem efficiently.",
    },

    opportunities: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description:
        "Key possibilities, unexpected benefits, or strategic leverage points created by this situation.",
    },

    implementationSteps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,

        properties: {
          step: {
            type: SchemaType.STRING,
            description: "The title or action name of this implementation phase.",
          },

          action: {
            type: SchemaType.STRING,
            description: "Detailed description of what needs to be executed.",
          },

          expectedOutcome: {
            type: SchemaType.STRING,
            description: "The positive, tangible outcome expected upon completing this step.",
          },
        },

        required: ["step", "action", "expectedOutcome"],
      },
    },

    leveragedStrengths: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description:
        "Existing assets, advantages, or resources that can be maximized to execute this solution.",
    },

    mitigations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description:
        "Proactive strategies to gracefully navigate potential obstacles or risks.",
    },

    feasibility: {
      type: SchemaType.STRING,
      enum: ["high", "medium", "low"],
      description:
        "Assessment of how practical and attainable this solution is with proper execution.",
    },
  },

  required: [
    "bestSolution",
    "opportunities",
    "implementationSteps",
    "leveragedStrengths",
    "mitigations",
    "feasibility",
  ],
};

module.exports = OptimisticSchema;