// Agents
const interpretProblem = require("./Agent/interpreter");
const interpretationSchema = require("./Schema/InterpreterSchema");

const Critic = require("./Agent/critic")
const CriticSchema = require("./Schema/CriticSchema")

// const Optimist = require("./Agent/Optimist")
// const Pessimist = require("./Agent/Pessimist")

// Agents information
const Agents = [
    {
        name: "Interpreter",
        description: "Interprets the problem and returns the information needed for the next agent",
        schema: interpretationSchema,
        agent: interpretProblem,
        requriedInput: "The problem asked by the user. Returns a response that can be understood by other agents",
    },
    {
        name: "Critic",

        description:
            "Evaluates a proposed solution against the original problem. Identifies logical flaws, false premises, missing information, unsupported assumptions, and weaknesses.",
        schema: CriticSchema,

        input: {
            problem: "The original problem or objective.",
            solution: "The proposed solution or answer that should be evaluated."
        },

        agent: Critic
    },
    // {
    //     name: "Optimist",
    //     description: "Describes what happens when things go right and the plan succeeds. Also Argues for the postive sides. Should only be used when the user is unsure of what to do in real life",
    //     schema: CriticSchema,
    //     agent: Optimist,
    //     requiredInput: "Any idea that needs to be checked for the best case scenarios and positive outcomes"
    // },
    // {
    //     name: "Pessimist",
    //     description: "Describes what happens when things go wrong and the plan fails. Also Argues for the negetive outcomes. Should only be used when the user is unsure of what to do in real life",
    //     schema: CriticSchema,
    //     agent: Pessimist,
    //     requiredInput: "Any idea that needs to be checked for the worst case scenarios and negetive outcomes"
    // }
]

module.exports = Agents;

