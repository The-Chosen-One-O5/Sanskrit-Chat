// OpenAI-compatible chat completions proxy with Groq (primary) and Cerebras (fallback)
// Runs securely on Vercel serverless (Node.js environment)

// --- Configuration with sane defaults ---
const CONFIG = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL || 'meta-llama/llama-4-maverick-17b-128e-instruct',
  CEREBRAS_MODEL: process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  CEREBRAS_BASE_URL: process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1',
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '2', 10)
};

// Sanskrit translation system instruction for backward compatibility
const SANSKRIT_TRANSLATION_INSTRUCTION = "You are an expert Sanskrit language translator. Translate the user's input (which may be English or Hinglish) into pure, correct Sanskrit using the Devanagari script. Do not include any explanation, commentary, or extra text, only the translated Sanskrit phrase.";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call an OpenAI-compatible chat completions endpoint with retry and timeout.
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function callChatCompletions({
  baseUrl,
  apiKey,
  messages,
  model,
  temperature = 0.7,
  max_tokens = 1000,
  stream = false,
  timeout,
  maxRetries,
  providerName = 'Provider'
}) {
  const startTime = Date.now();
  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens,
    stream
  };

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        const error = new Error(`${providerName} error ${response.status}: ${errorText}`);

        // Retry on 429 (rate limit) or 5xx errors
        if (response.status === 429 || response.status >= 500) {
          lastError = error;
          throw error;
        }

        // Mark as non-retryable for other 4xx errors
        error.noRetry = true;
        throw error;
      }

      const result = await response.json();
      const latency = Date.now() - startTime;

      // Privacy-safe logging
      console.log(`[${providerName}] Success - Model: ${model}, Latency: ${latency}ms`);

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        lastError = new Error(`${providerName} request timed out after ${timeout}ms`);
      } else {
        lastError = error;
      }

      if (lastError.noRetry || attempt === maxRetries) {
        break;
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.warn(
        `[${providerName}] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${backoffMs}ms...`
      );
      await delay(backoffMs);
    }
  }

  const latency = Date.now() - startTime;
  console.error(
    `[${providerName}] Failed after ${maxRetries + 1} attempts. Latency: ${latency}ms. Error: ${lastError?.message || lastError}`
  );
  throw lastError;
}

/**
 * Main handler for the translate endpoint.
 */
module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    if (!CONFIG.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error: GROQ_API_KEY not set.' });
    }

    let requestData;
    try {
      requestData = req.body || {};
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON in request body.' });
    }

    let messages;
    let isLegacyTranslation = false;

    if (requestData.prompt && typeof requestData.prompt === 'string') {
      isLegacyTranslation = true;
      messages = [
        { role: 'system', content: SANSKRIT_TRANSLATION_INSTRUCTION },
        { role: 'user', content: requestData.prompt }
      ];
    } else if (Array.isArray(requestData.messages)) {
      messages = requestData.messages;
    } else {
      return res.status(400).json({
        error: "Invalid request format. Provide either 'prompt' (string) or 'messages' (array)."
      });
    }

    const temperature =
      requestData.temperature !== undefined ? requestData.temperature : 0.7;
    const max_tokens =
      requestData.max_tokens !== undefined ? requestData.max_tokens : 1000;
    const stream = requestData.stream === true;

    if (stream) {
      return res.status(400).json({
        error: 'Streaming not yet supported. Set stream=false or omit it.'
      });
    }

    let result;
    let usedProvider = null;

    try {
      result = await callChatCompletions({
        baseUrl: CONFIG.GROQ_BASE_URL,
        apiKey: CONFIG.GROQ_API_KEY,
        messages,
        model: requestData.model || CONFIG.GROQ_MODEL,
        temperature,
        max_tokens,
        stream,
        timeout: CONFIG.REQUEST_TIMEOUT_MS,
        maxRetries: CONFIG.MAX_RETRIES,
        providerName: 'Groq'
      });
      usedProvider = 'Groq';
    } catch (groqError) {
      console.warn(`[Groq] Failed completely: ${groqError.message}`);

      if (!CONFIG.CEREBRAS_API_KEY) {
        return res.status(503).json({
          error: `Groq failed and no Cerebras fallback configured. Error: ${groqError.message}`
        });
      }

      try {
        result = await callChatCompletions({
          baseUrl: CONFIG.CEREBRAS_BASE_URL,
          apiKey: CONFIG.CEREBRAS_API_KEY,
          messages,
          model: requestData.model || CONFIG.CEREBRAS_MODEL,
          temperature,
          max_tokens,
          stream,
          timeout: CONFIG.REQUEST_TIMEOUT_MS,
          maxRetries: CONFIG.MAX_RETRIES,
          providerName: 'Cerebras'
        });
        usedProvider = 'Cerebras';
      } catch (cerebrasError) {
        console.error(`[Cerebras] Failed completely: ${cerebrasError.message}`);
        return res.status(503).json({
          error: `Both Groq and Cerebras failed. Groq: ${groqError.message}. Cerebras: ${cerebrasError.message}`
        });
      }
    }

    const messageContent = result?.choices?.[0]?.message?.content?.trim();

    const responsePayload = {
      ...result,
      provider: usedProvider
    };

    if (messageContent) {
      responsePayload.text = messageContent;
      responsePayload.response = messageContent;
      responsePayload.content = messageContent;

      if (isLegacyTranslation) {
        responsePayload.sanskritText = messageContent;
      }
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error('Unhandled error in translate API:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
