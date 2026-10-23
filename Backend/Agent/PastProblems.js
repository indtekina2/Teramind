const Run = require("../models/Run");

const stopWords = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "being",
  "between", "but", "can", "could", "did", "does", "for", "from", "have", "how",
  "into", "its", "just", "make", "more", "most", "not", "our", "should", "some",
  "than", "that", "the", "their", "then", "there", "these", "they", "this", "those",
  "through", "want", "what", "when", "where", "which", "who", "will", "with", "would",
  "you", "your",
]);

function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter((token) => !stopWords.has(token)) || []
  );
}

function similarity(left, right) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared++;
  }
  return shared / (left.size + right.size - shared);
}

async function searchPastProblems(problem, excludeRunId) {
  const queryTokens = tokenize(problem);
  if (!queryTokens.size) {
    return { success: true, data: { matches: [], message: "No searchable terms were provided." } };
  }

  const filter = { status: "completed" };
  if (excludeRunId) filter._id = { $ne: excludeRunId };

  const runs = await Run.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .select("title prompt finalContext createdAt")
    .lean();

  const matches = runs
    .map((run) => ({
      title: run.title,
      prompt: run.prompt,
      similarity: similarity(queryTokens, tokenize(`${run.title} ${run.prompt}`)),
      takeaways: (run.finalContext || [])
        .map((item) => item?.information)
        .filter((item) => typeof item === "string" && item.trim())
        .slice(0, 3),
      createdAt: run.createdAt,
    }))
    .filter((run) => run.similarity >= 0.08)
    .sort((left, right) => right.similarity - left.similarity || right.createdAt - left.createdAt)
    .slice(0, 3);

  return {
    success: true,
    data: {
      matches,
      message: matches.length ? "Related completed analyses were found." : "No similar past problems were found.",
    },
  };
}

module.exports = searchPastProblems;
