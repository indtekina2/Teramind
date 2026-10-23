// Agents
const interpretProblem = require("./Agent/interpreter");
const Critic = require("./Agent/critic")
const Optimist = require("./Agent/Optimist.js")
const Pessimist = require("./Agent/Pessimist")
const searchPastProblems = require("./Agent/PastProblems");
const summarize = require("./Agent/Summary");

// Agents information
// Schemas
const interpretationSchema = require("./Schema/InterpreterSchema");
const CriticSchema = require("./Schema/CriticSchema");
const OptimistSchema = require("./Schema/OptimisticSchema");
const PessimisticSchema = require("./Schema/PessimisticSchema");
const SummarySchema = require("./Schema/SummarySchema");


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
    name: "PastProblems",
    description:
      "Searches completed analyses for similar past problems and returns their saved takeaways as historical context.",
    input: {
      problem: "The interpreted problem to compare with previous analyses.",
      excludeRunId: "The current run ID, so it is not matched against itself.",
    },
    agent: searchPastProblems,
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
  {
    name: "Summary",
    description:
      "Reads the Optimist, Pessimist, and Critic assessments and produces the final balanced answer and recommendation.",
    schema: SummarySchema,
    input: {
      problem: "The original user problem.",
      optimist: "The Optimist's structured assessment serialized as JSON.",
      pessimist: "The Pessimist's structured assessment serialized as JSON.",
      critic: "The Critic's latest structured assessment serialized as JSON.",
    },
    agent: summarize,
  },
];

module.exports = Agents;
