// This code runs securely on the Vercel server (Node.js environment).
// It accesses the TYPEGPT_API_KEY from environment variables.

const TYPEGPT_API_URL = "https://inference.typegpt.net/v1/chat/completions";
const PRIMARY_MODEL_ID = "deepseek-ai/DeepSeek-V3.2-Exp";
const FALLBACK_MODEL_ID = "Qwen/Qwen3-30B-A3B";

const SYSTEM_INSTRUCTION = "You are an expert Sanskrit language translator. Translate the user's input (which may be English or Hinglish) into pure, correct Sanskrit using the Devanagari script. Do not include any explanation, commentary, or extra text, only the translated Sanskrit phrase.";

/**
 * Executes a translation call to the TypeGPT API with retries.
 * @param {string} prompt - The text to translate.
 * @param {string} modelId - The model to use for translation.
 * @param {string} apiKey - The secure API key.
 * @returns {Promise<string>} The translated Sanskrit text.
 */
async function getTranslation(prompt, modelId, apiKey) {
    const payload = {
        model: modelId,
        messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 100
    };

    const groqResponse = await fetch(TYPEGPT_API_URL, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify(payload)
    });

    if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        throw new Error(`API returned status ${groqResponse.status} for model ${modelId}: ${errorText}`);
    }

    const result = await groqResponse.json();
    const sanskritText = result.choices?.[0]?.message?.content?.trim();

    if (!sanskritText) {
        throw new Error(`Translation response from model ${modelId} was empty or malformed.`);
    }
    
    return sanskritText;
}


/**
 * Handles the incoming request from the client to translate text, using a fallback model on failure.
 * @param {import('@vercel/node').VercelRequest} req 
 * @param {import('@vercel/node').VercelResponse} res 
 */
export default async function (req, res) {
    // 1. Check for API Key
    const API_KEY = process.env.TYPEGPT_API_KEY; // Using the new variable name
    if (!API_KEY) {
        return res.status(500).json({ error: "Server configuration error: TYPEGPT_API_KEY not set." });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Missing 'prompt' in request body." });
    }

    let sanskritText = null;

    // 2. Try Primary Model (DeepSeek)
    try {
        sanskritText = await getTranslation(prompt, PRIMARY_MODEL_ID, API_KEY);
    } catch (primaryError) {
        console.warn(`Primary model (${PRIMARY_MODEL_ID}) failed. Attempting fallback...`, primaryError.message);

        // 3. Try Fallback Model (Qwen)
        try {
            sanskritText = await getTranslation(prompt, FALLBACK_MODEL_ID, API_KEY);
        } catch (fallbackError) {
            console.error(`Fallback model (${FALLBACK_MODEL_ID}) also failed.`, fallbackError.message);
            // If both fail, return a server error
            return res.status(503).json({ error: `Translation failed after trying both primary (${PRIMARY_MODEL_ID}) and fallback (${FALLBACK_MODEL_ID}) models.` });
        }
    }

    // 4. Return success result
    return res.status(200).json({ sanskritText });
}
