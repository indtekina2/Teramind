# Teramind

Teramind is a multi-agent analysis workspace. Describe a decision or problem and its Interpreter, Past Problems, Optimist, Pessimist, Critic, and Summary agents work through it; runs and their results are saved in MongoDB.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB, local or hosted
- A Gemini API key

## Run locally

1. Create a `.env` file in the project root using `.env.example` as a template:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/teramind
   GEMINI_API_KEY=your_gemini_api_key
   PORT=4000
   ```

2. Install the workspace dependencies and start both apps:

   ```sh
   npm install
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173). The API listens on port 4000; Vite proxies `/api` requests to it during development.

For production, run `npm run build` and then `npm start`; the API serves the built frontend from the same port (4000 by default). In development, the Vite frontend runs on port 5173 and proxies `/api` to the API.

## API

- `GET /api/health` — API, database, and model configuration status
- `GET /api/runs` — latest 30 saved analyses
- `GET /api/runs/:id` — one analysis, including its agent history
- `POST /api/runs` — run an analysis; JSON body: `{ "prompt": "...", "humanInLoop": true }`
- `POST /api/runs/:id/respond` — continue an analysis paused for clarification; JSON body: `{ "answer": "..." }`

The API requires `MONGODB_URI`; analysis requests also require `GEMINI_API_KEY`. The API rate-limits new analyses to 10 per IP per 15 minutes.

The analysis form enables **Ask me when more information is needed** by default. When an agent reports that essential information is missing, the run pauses and can be resumed with the user's answer. Turn the setting off to let agents continue without pausing. The Past Problems agent searches the 100 most recent completed analyses and adds up to three similar results to the team's context.

After the Optimist and Pessimist assessments, the Critic reviews both. If it is not satisfied, the Orchestrator routes its feedback to a relevant agent and asks the Critic to review again, for up to three Critic rounds. The Summary agent then synthesizes the latest Optimist, Pessimist, and Critic results; if the review limit was reached, the summary reports remaining concerns.
