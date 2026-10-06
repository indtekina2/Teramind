// Agents
const interpretProblem = require("./Agent/interpreter");
const Critic = require("./Agent/critic")
const Optimist = require("./Agent/Optimist.js")
const Pessimist = require("./Agent/Pessimist")

// Agents information
// Schemas
const interpretationSchema = require("./Schema/InterpreterSchema");
const CriticSchema = require("./Schema/CriticSchema");
const OptimistSchema = require("./Schema/OptimisticSchema");
const PessimisticSchema = require("./Schema/PessimisticSchema");


// Agents metadata registry
const Agents = [
  {
    name: "Interpreter",
    description:
      "Interprets raw user descriptions and structures them into clear problems, goals, facts, and constraints.",
    schema: interpretationSchema,
    input: {
      userMessage: "The raw problem or request provided by the user.",
    },
    agent: interpretProblem,
  },
  {
    name: "Critic",
    description:
      "Evaluates a proposed solution against the original problem. Identifies logical flaws, false premises, missing information, unsupported assumptions, and weaknesses.",
    schema: CriticSchema,
    input: {
      problem: "The original problem or objective.",
      solution: "The proposed solution or answer that should be evaluated.",
    },
    agent: Critic,
  },
  {
    name: "Optimist",
    description:
      "Analyzes a problem to discover hidden opportunities, leveraged strengths, and formulates the single best constructive solution with step-by-step execution.",
    schema: OptimistSchema,
    input: {
      problem: "The problem, bottleneck, or challenge that needs an optimal solution.",
    },
    agent: Optimist,
  },
  {
    name: "Pessimist",
    description:
      "Stress-tests a problem by identifying systemic vulnerabilities, single points of failure, unintended consequences, and realistic worst-case outcomes.",
    schema: PessimisticSchema,
    input: {
      problem: "The problem, proposal, or situation to audit for worst-case risks and failure modes.",
    },
    agent: Pessimist,
  },
];

module.exports = Agents;

