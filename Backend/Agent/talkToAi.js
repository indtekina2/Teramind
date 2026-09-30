const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Gemini client using the environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

const interpretProblem = require("./interpreter");
const specialtyMatcher = require("./specialtyMatcher");



async function talkToAi(req, res) {
    try {
        const { prompt } = req.body;
        console.log("Received prompt:", prompt);
        
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: "Prompt is required in the request body." });
        }

        // taking the input
        // const result = await model.generateContent(prompt);
        // const response = await result.response;
        // const text = response.text();

        // Interpret the problem
        const interpretedData = await interpretProblem(prompt);
        if (!interpretedData.success) {
            return res.status(interpretedData.code || 500).json({ success: false, error: interpretedData.error || "An error occurred while interpreting the problem." });
        }
        const specialties = await specialtyMatcher(interpretedData);
        if (!specialties.success) {
            return res.status(specialties.code || 500).json({ success: false, error: specialties.error || "An error occurred while matching specialties." });
        }

        res.json({ success: true, message: specialties.data });

    } catch (error) {

        console.error("Gemini API Error:", error.message);

        if (error.message.includes("429") || error.message.includes("Quota")) {
            return res.status(429).json({ success: false, error: "Rate limit exceeded. Please try again later." });
        }
        if (error.message.includes("403") || error.message.includes("API key")) {
            return res.status(403).json({ success: false, error: "Invalid or missing API key configuration." });
        }

        res.status(500).json({ success: false, error: "An internal error occurred while processing the AI request." });
    }
}

module.exports = talkToAi;