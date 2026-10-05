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
        },
        context: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    information: {
                        type: SchemaType.STRING,
                    },
                    reasoning: {
                        type: SchemaType.STRING,
                    },
                },
                required: ["information", "reasoning"],
            },
        },
        inputForNextAgents: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.STRING,
            },
        },
        reasoning: {
            type: SchemaType.STRING,
        },
    },
    required: ["nextAgent", "context", "inputForNextAgent", "Reasoning"],
};

module.exports = OrchestratorSchema;