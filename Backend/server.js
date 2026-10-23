const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const { rateLimit } = require("express-rate-limit");
const Run = require("./models/Run");

const app = express();
const port = Number(process.env.PORT) || 4000;
const frontendBuildPath = path.resolve(__dirname, "..", "Frontend", "dist");

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: mongoose.connection.readyState === 1 ? "ok" : "degraded",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    modelConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.get("/api/runs", async (_request, response, next) => {
  try {
    const runs = await Run.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .select("title prompt status iterations createdAt error")
      .lean();
    response.json({ runs });
  } catch (error) {
    next(error);
  }
});

app.get("/api/runs/:id", async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ error: "Invalid run ID." });
  }

  try {
    const run = await Run.findById(request.params.id).lean();
    if (!run) {
      return response.status(404).json({ error: "Run not found." });
    }
    response.json({ run });
  } catch (error) {
    next(error);
  }
});

const runLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many analyses started. Please wait a few minutes and try again." },
});

app.post("/api/runs", runLimiter, async (request, response, next) => {
  const prompt = typeof request.body?.prompt === "string" ? request.body.prompt.trim() : "";
  if (!prompt) {
    return response.status(400).json({ error: "Enter a question or problem to analyze." });
  }
  if (prompt.length > 8000) {
    return response.status(400).json({ error: "Your prompt must be 8,000 characters or fewer." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return response.status(503).json({ error: "The AI service is not configured. Add GEMINI_API_KEY to the project .env file." });
  }

  try {
    const run = await Run.create({
      title: prompt.replace(/\s+/g, " ").slice(0, 96),
      prompt,
      humanInLoop: request.body?.humanInLoop !== false,
    });

    try {
      const { runOrchestrator } = require("./Agent/Orchestrator");
      const result = await runOrchestrator(prompt, 24, "gemini-3.1-flash-lite", {
        humanInLoop: run.humanInLoop,
        runId: run.id,
      });
      run.status = result.awaitingInput ? "awaiting_input" : result.success ? "completed" : "failed";
      run.iterations = result.iterations || result.history?.length || 0;
      run.finalContext = result.finalContext || [];
      run.history = result.history || [];
      run.pendingQuestions = result.pendingQuestions || [];
      run.error = result.success || result.awaitingInput ? null : result.reason || "The analysis reached its step limit.";
      await run.save();
      return response.status(201).json({ run });
    } catch (error) {
      run.status = "failed";
      run.error = error.message || "The analysis could not be completed.";
      await run.save();
      return response.status(502).json({ error: run.error, runId: run.id });
    }
  } catch (error) {
    next(error);
  }
});

app.post("/api/runs/:id/respond", async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ error: "Invalid run ID." });
  }

  const answer = typeof request.body?.answer === "string" ? request.body.answer.trim() : "";
  if (!answer) {
    return response.status(400).json({ error: "Enter an answer before continuing." });
  }
  if (answer.length > 8000) {
    return response.status(400).json({ error: "Your answer must be 8,000 characters or fewer." });
  }

  try {
    const run = await Run.findById(request.params.id);
    if (!run) {
      return response.status(404).json({ error: "Run not found." });
    }
    if (!run.humanInLoop || run.status !== "awaiting_input") {
      return response.status(409).json({ error: "This analysis is not waiting for user input." });
    }

    run.clarifications.push({
      questions: run.pendingQuestions,
      answer,
    });
    run.pendingQuestions = [];
    run.status = "running";
    run.error = null;
    await run.save();

    try {
      const { runOrchestrator } = require("./Agent/Orchestrator");
      const clarifiedPrompt = [
        run.prompt,
        ...run.clarifications.map((clarification) => `User clarification: ${clarification.answer}`),
      ].join("\n\n");
      const result = await runOrchestrator(clarifiedPrompt, 24, "gemini-3.1-flash-lite", {
        humanInLoop: true,
        runId: run.id,
        history: run.history,
        finalContext: run.finalContext,
        currentStep: run.iterations,
        resumeAfterInput: true,
      });
      run.status = result.awaitingInput ? "awaiting_input" : result.success ? "completed" : "failed";
      run.iterations = result.iterations || result.history?.length || 0;
      run.finalContext = result.finalContext || [];
      run.history = result.history || [];
      run.pendingQuestions = result.pendingQuestions || [];
      run.error = result.success || result.awaitingInput ? null : result.reason || "The analysis reached its step limit.";
      await run.save();
      return response.json({ run });
    } catch (error) {
      run.status = "failed";
      run.error = error.message || "The analysis could not be completed.";
      await run.save();
      return response.status(502).json({ error: run.error, runId: run.id });
    }
  } catch (error) {
    next(error);
  }
});

app.use(express.static(frontendBuildPath));
app.use((request, response, next) => {
  const indexPath = path.join(frontendBuildPath, "index.html");
  if (request.method === "GET" && request.accepts("html") && !request.path.startsWith("/api") && fs.existsSync(indexPath)) {
    return response.sendFile(indexPath, (error) => {
      if (error) next(error);
    });
  }
  next();
});
app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found." });
});

app.use((error, _request, response, _next) => {
  console.error("[API]", error);
  response.status(500).json({ error: "An unexpected server error occurred." });
});

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required. Copy .env.example to .env and configure MongoDB.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`Teramind API listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("[Startup]", error.message);
    process.exitCode = 1;
  });
}

module.exports = app;
