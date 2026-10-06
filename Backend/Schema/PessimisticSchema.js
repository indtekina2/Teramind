const { SchemaType } = require("@google/generative-ai");

const PessimisticSchema = {
  type: SchemaType.OBJECT,

  properties: {
    worstCaseScenario: {
      type: SchemaType.STRING,
      description:
        "The realistic worst-case outcome if critical risks materialize and existing mitigations fail.",
    },

    risksAndVulnerabilities: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,

        properties: {
          vulnerability: {
            type: SchemaType.STRING,
            description: "The specific risk factor, systemic weakness, or attack vector identified.",
          },

          impact: {
            type: SchemaType.STRING,
            description: "How severely this risk damages the objective or system if triggered.",
          },

          likelihood: {
            type: SchemaType.STRING,
            enum: ["high", "medium", "low"],
            description: "Estimated probability of this failure mode occurring.",
          },
        },

        required: ["vulnerability", "impact", "likelihood"],
      },
      description: "Comprehensive breakdown of failure modes and system vulnerabilities.",
    },

    singlePointsOfFailure: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description:
        "Dependencies, bottlenecks, or single points of failure where a single break crashes the entire plan.",
    },

    unintendedConsequences: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description:
        "Negative side effects or secondary cascading issues that could emerge from attempting to address this problem.",
    },

    worstCaseSolution: {
      type: SchemaType.STRING,
      description: "A survival-focused, bare-minimum containment or risk-mitigation strategy to minimize total failure.",
    },

    viabilityScore: {
      type: SchemaType.STRING,
      enum: ["high", "medium", "low", "critical_risk"],
      description: "Overall realistic viability assessment of overcoming the problem without severe friction or failure.",
    },
  },

  required: [
    "worstCaseScenario",
    "risksAndVulnerabilities",
    "singlePointsOfFailure",
    "unintendedConsequences",
    "worstCaseSolution",
    "viabilityScore",
  ],
};

module.exports = PessimisticSchema;