const { SchemaType } = require("@google/generative-ai");

const CriticSchema = {
    type: SchemaType.OBJECT,

    properties: {
        verdict: {
            type: SchemaType.STRING,
            description:
                "Overall assessment of the idea or plan. Clearly state whether it is sound, flawed, uncertain, or requires more information.",
        },

        flaws: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,

                properties: {
                    issue: {
                        type: SchemaType.STRING,
                        description:
                            "The specific flaw, contradiction, false premise, or weakness identified.",
                    },

                    explanation: {
                        type: SchemaType.STRING,
                        description:
                            "Why this is a problem and how it affects the idea or plan.",
                    },

                    severity: {
                        type: SchemaType.STRING,
                        enum: [
                            "critical",
                            "major",
                            "minor"
                        ],
                        description:
                            "How seriously this flaw affects the validity or success of the idea.",
                    },
                },

                required: [
                    "issue",
                    "explanation",
                    "severity"
                ],
            },
        },

        missingInformation: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.STRING,
            },
            description:
                "Important information that is missing and prevents the idea from being evaluated confidently.",
        },

        falsePremises: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.STRING,
            },
            description:
                "Assumptions or premises that appear factually incorrect, unsupported, or logically invalid.",
        },

        strengths: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.STRING,
            },
            description:
                "Parts of the idea that are logically sound or particularly strong. The critic should not invent weaknesses when the idea is actually solid.",
        },

        recommendation: {
            type: SchemaType.STRING,
            description:
                "What should be changed, investigated, or considered based on the critique.",
        },

        confidence: {
            type: SchemaType.STRING,
            enum: [
                "high",
                "medium",
                "low"
            ],
            description:
                "How confident the critic is in its assessment given the available information.",
        },
    },

    required: [
        "verdict",
        "flaws",
        "missingInformation",
        "falsePremises",
        "strengths",
        "recommendation",
        "confidence"
    ],
};

module.exports = CriticSchema;