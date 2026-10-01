const { SchemaType } = require("@google/generative-ai");

// How the agent should respond
const interpretationSchema = {
  type: SchemaType.OBJECT,

  properties: {
    summary: {
      type: SchemaType.STRING,
    },

    Main_Problem: {
      type: SchemaType.ARRAY,

      items: {
        type: SchemaType.OBJECT,

        properties: {
          problem: {
            type: SchemaType.STRING,
          },

          reasoning: {
            type: SchemaType.STRING,
          },
        },

        required: ["problem", "reasoning"],
      },
    },

    Other_Problems: {
      type: SchemaType.ARRAY,

      items: {
        type: SchemaType.STRING,
      },
    },

    additional_requirements: {
      type: SchemaType.ARRAY,

      items: {
        type: SchemaType.STRING,
      },
    },
    information_extracted: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          Information: {
            type: SchemaType.STRING,
          },
          Reasoning: {
            type: SchemaType.STRING,
          },
        },
        required: ["Information", "Reasoning"],
      },
    },
    goals: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
    },
    additional_needed_info: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      }
    }
  },

  required: ["summary", "Main_Problem", "goals"],
};

module.exports = interpretationSchema;