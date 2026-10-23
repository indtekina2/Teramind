const mongoose = require("mongoose");

const runSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    prompt: {
      type: String,
      required: true,
      maxlength: 8000,
    },
    status: {
      type: String,
      enum: ["running", "awaiting_input", "completed", "failed"],
      default: "running",
    },
    iterations: {
      type: Number,
      default: 0,
    },
    finalContext: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    history: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    humanInLoop: {
      type: Boolean,
      default: true,
    },
    pendingQuestions: {
      type: [String],
      default: [],
    },
    clarifications: {
      type: [
        {
          questions: [String],
          answer: String,
        },
      ],
      default: [],
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Run || mongoose.model("Run", runSchema);
