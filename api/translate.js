const PRIMARY_MODEL = process.env.PRIMARY_MODEL || 'gemini-2.5-flash-preview-05-20';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || 'openai/gpt-oss-120b';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt instructing the AI on its translation task
const SYSTEM_PROMPT = "You are an expert translator. Your sole task is to translate the given English or Hinglish text accurately and elegantly into Sanskrit. Provide ONLY the Sanskrit translation as your response, without any greetings, commentary, or the original text. If the text is a question, ensure the Sanskrit translation is also a question.";

/**
 * Handles the translation request using a primary model and falls back to a secondary model on failure.
 * @param {string} prompt - The text to translate.
 * @param {string} modelName - The model ID to use (Gemini or Groq).
 * @param {string} apiKey - The API key for the corresponding service.
 * @param {string} apiUrl - The base API URL.
 * @returns {Promise<string>} The translated Sanskrit text.
 */
async function fetchTranslation(prompt, modelName, apiKey, apiUrl) {
    if (!apiKey) {
        throw new Error(`API Key for ${modelName} is not set.`);
    }

    const payload = {
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
        model: modelName,
        temperature: 0.3,
        max_tokens: 200,
        // Groq uses stream=false in the request body for non-streaming
        // Gemini uses the URL for model name
    };

    let url;
    if (modelName.startsWith('gemini')) {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    } else {
        url = apiUrl; // Use the custom Groq URL
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Groq and other OpenAI-compatible APIs use 'Authorization' header
            ...(modelName !== PRIMARY_MODEL && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        // Capture specific error message for better logging
        let errorData = await response.json().catch(() => ({}));
        let message = errorData.error?.message || errorData.message || `HTTP error! Status: ${response.status}`;
        throw new Error(`External API failed: ${modelName} - ${message}`);
    }

    const result = await response.json();
    let text = "";

    if (modelName.startsWith('gemini')) {
        text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
        // Groq (OpenAI format)
        text = result.choices?.[0]?.message?.content;
    }
    
    if (!text) {
        throw new Error(`${modelName} returned empty content.`);
    }

    return text.trim();
}


/**
 * Main Vercel serverless function handler.
 * @param {object} request - The Vercel request object.
 */
export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return new Response(JSON.stringify({ message: 'Missing prompt in request body.' }), { status: 400 });
        }

        let sanskritText;
        
        // --- 1. TRY PRIMARY MODEL (GEMINI) ---
        try {
            sanskritText = await fetchTranslation(prompt, PRIMARY_MODEL, GEMINI_API_KEY, null);
            return new Response(JSON.stringify({ sanskritText, model: PRIMARY_MODEL }), { status: 200 });
        } catch (error) {
            console.error(`Primary Model (${PRIMARY_MODEL}) failed. Falling back to ${FALLBACK_MODEL}. Error:`, error.message);
            // If primary model fails, proceed to fallback
        }

        // --- 2. TRY FALLBACK MODEL (GROQ) ---
        try {
            sanskritText = await fetchTranslation(prompt, FALLBACK_MODEL, GROQ_API_KEY, GROQ_API_URL);
            return new Response(JSON.stringify({ sanskritText, model: FALLBACK_MODEL }), { status: 200 });
        } catch (error) {
            console.error(`Fallback Model (${FALLBACK_MODEL}) also failed. Final Error:`, error.message);
            // If fallback model also fails, return the failure
            return new Response(JSON.stringify({ message: `Translation failed after multiple attempts. Last error: ${error.message}` }), { status: 503 });
        }

    } catch (error) {
        console.error("Proxy processing error:", error);
        return new Response(JSON.stringify({ message: 'Internal Server Error during processing.', error: error.message }), { status: 500 });
    }
}
