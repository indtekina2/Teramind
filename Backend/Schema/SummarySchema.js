const { SchemaType } = require("@google/generative-ai");

const SummarySchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: "A concise, direct final answer to the user's original problem.",
    },
    recommendation: {
      type: SchemaType.STRING,
      description: "The best next action, reconciled with the critic's assessment and the risk analysis.",
    },
    keyConsiderations: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "The most important supporting considerations from all three specialists.",
    },
    importantRisks: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Material risks from the Pessimist and Critic that the user should account for.",
    },
    criticAssessment: {
      type: SchemaType.STRING,
      description: "Whether the Critic is satisfied, and any remaining caveats.",
    },
    unresolvedConcerns: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Concerns still unresolved after the bounded review loop; otherwise an empty array.",
    },
    confidence: {
      type: SchemaType.STRING,
      enum: ["high", "medium", "low"],
      description: "Confidence in the final synthesis, accounting for specialist confidence and unresolved concerns.",
    },
  },
  required: [
    "summary",
    "recommendation",
    "keyConsiderations",
    "importantRisks",
    "criticAssessment",
    "unresolvedConcerns",
    "confidence",
  ],
};

module.exports = SummarySchema;
