// This code runs securely on the Vercel server (Node.js environment).
// It accesses the GROQ_API_KEY from environment variables.

// Use the model ID defined in the client-side code
const GROQ_MODEL_ID = "openai/gpt-oss-120b";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Handles the incoming request from the client to translate text.
 * @param {import('@vercel/node').VercelRequest} req 
 * @param {import('@vercel/node').VercelResponse} res 
 */
export default async function (req, res) {
    // 1. Check for API Key
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: "Server configuration error: GROQ_API_KEY not set." });
    }

    // 2. Check for POST method and required body
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Missing 'prompt' in request body." });
    }

    // 3. Prepare the Groq API payload
    const payload = {
        model: GROQ_MODEL_ID,
        messages: [
            {
                role: "system",
                content: "You are an expert Sanskrit language translator. Translate the user's input (which may be English or Hinglish) into pure, correct Sanskrit using the Devanagari script. Do not include any explanation, commentary, or extra text, only the translated Sanskrit phrase."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.1,
        max_tokens: 100
    };

    // 4. Call the external Groq API securely
    try {
        const groqResponse = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // Key is used securely on the server
                'Authorization': `Bearer ${GROQ_API_KEY}` 
            },
            body: JSON.stringify(payload)
        });

        if (!groqResponse.ok) {
            const errorText = await groqResponse.text();
            throw new Error(`Groq API returned status ${groqResponse.status}: ${errorText}`);
        }

        const result = await groqResponse.json();
        const sanskritText = result.choices?.[0]?.message?.content?.trim();

        if (!sanskritText) {
            return res.status(500).json({ error: "Translation response was empty or malformed." });
        }
        
        // 5. Return the clean translation to the client
        return res.status(200).json({ sanskritText });

    } catch (e) {
        console.error("Error calling Groq API:", e);
        return res.status(500).json({ error: `Translation processing failed: ${e.message}` });
    }
}
