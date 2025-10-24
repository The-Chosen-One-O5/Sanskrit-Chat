# Sanskrit Universal Chat & AI Study Mentor

Static web application hosted on Vercel with two experiences:

- **`index.html`** — Real-time Sanskrit chat with automatic translation backed by Firebase and serverless AI translation
- **`magic.html`** — AI Study Mentor dashboard supporting chats, flashcards, quizzes, and analysis workflows

The app relies on the `/api/translate` serverless function as a proxy for OpenAI-compatible chat completions. This function now uses **Groq** as the primary provider with **Cerebras** as the fallback to ensure reliable, low-latency completions.

## Getting Started

1. Install dependencies (if you plan to run any local tooling)

   ```bash
   npm install
   ```

2. Copy the example environment file and populate credentials:

   ```bash
   cp .env.example .env
   ```

   Populate the required keys:

   - `GROQ_API_KEY` – required (primary provider)
   - `CEREBRAS_API_KEY` – optional but recommended (fallback provider)

   Optional overrides are available for models, base URLs, timeout, and retry counts. Default values are suitable for most cases.

3. Deploy to Vercel or run locally with your preferred static server; the serverless function will honor the environment variables above.

## `/api/translate` Contract

- Accepts either a legacy request (`{ "prompt": "..." }`) or an OpenAI-compatible payload (`{ "messages": [...] }`).
- Returns an OpenAI chat-completion style response. For legacy callers, a `sanskritText` field is also included for backward compatibility.
- Automatically retries transient errors, timing out after `REQUEST_TIMEOUT_MS`, and falls back to Cerebras when configured.
- Streaming responses are not yet supported (set `stream=false`).

## Firebase

Both HTML entry points depend on Firebase Firestore and Auth. Ensure environment configuration (`__firebase_config`) is passed via Vercel or replaced with your own project credentials when self-hosting.

---

For more detailed architecture information, refer to inline comments within `index.html` and `magic.html`.
