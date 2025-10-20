// This code runs securely on the Vercel server (Node.js environment).
// It accesses the TYPEGPT_API_KEY from environment variables.

const TYPEGPT_API_URL = "https://inference.typegpt.net/v1/chat/completions";
const PRIMARY_MODEL_ID = "deepseek-ai/DeepSeek-V3.2-Exp";
const FALLBACK_MODEL_ID = "Qwen/Qwen3-30B-A3B";

const SYSTEM_INSTRUCTION = "You are an expert Sanskrit language translator. Translate the user's input (which may be English or Hinglish) into pure, correct Sanskrit using the Devanagari script. Do not include any explanation, commentary, or extra text, only the translated Sanskrit phrase.";

/**
 * Executes a translation call to the TypeGPT API.
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

    const response = await fetch(TYPEGPT_API_URL, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        // Throw an error that includes the model ID for logging purposes
        throw new Error(`API returned status ${response.status} for model ${modelId}: ${errorText}`);
    }

    const result = await response.json();
    const sanskritText = result.choices?.[0]?.message?.content?.trim();

    if (!sanskritText) {
        throw new Error(`Translation response from model ${modelId} was empty or malformed.`);
    }
    
    return sanskritText;
}


/**
 * Handles the incoming request from the client to translate text, running both models in parallel.
 */
module.exports = async function (req, res) {
    try {
        // 1. Check for API Key
        const API_KEY = process.env.TYPEGPT_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: "Server configuration error: TYPEGPT_API_KEY not set." });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: "Method Not Allowed. Use POST." });
        }

        let prompt;
        try {
            prompt = req.body?.prompt;
        } catch (_) {
            prompt = undefined;
        }

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: "Missing 'prompt' in request body." });
        }

        // 2. Run both the primary and fallback translation calls in parallel.
        // We use Promise.allSettled to wait for both results without failing immediately on the first rejection.
        const primaryPromise = getTranslation(prompt, PRIMARY_MODEL_ID, API_KEY);
        const fallbackPromise = getTranslation(prompt, FALLBACK_MODEL_ID, API_KEY);

        const [primaryResult, fallbackResult] = await Promise.allSettled([primaryPromise, fallbackPromise]);

        let sanskritText = null;

        // 3. Prioritize the result: Primary success > Fallback success
        if (primaryResult.status === 'fulfilled') {
            sanskritText = primaryResult.value;
        } else if (fallbackResult.status === 'fulfilled') {
            sanskritText = fallbackResult.value;
        }

        // 4. Handle complete failure
        if (!sanskritText) {
            console.error("Both translation models failed:", {
                primaryError: primaryResult.reason?.message || String(primaryResult.reason),
                fallbackError: fallbackResult.reason?.message || String(fallbackResult.reason)
            });
            return res.status(503).json({ error: `Translation failed after trying both primary (${PRIMARY_MODEL_ID}) and fallback (${FALLBACK_MODEL_ID}) models.` });
        }

        // 5. Return success result
        return res.status(200).json({ sanskritText });
    } catch (err) {
        console.error("Unhandled error in translate API:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
