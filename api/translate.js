// This file runs as a Vercel Serverless Function and securely hides your API Key.
// It acts as a middleman between your client-side index.html and the external GLM API.

// --- CUSTOM API CONFIGURATION ---
const CUSTOM_MODEL_ID = "zai-org/GLM-4.5";
const CUSTOM_API_BASE_URL = "https://glmapi-sy57.onrender.com/v1";

// Vercel Serverless function handler
export default async function handler(req, res) {
    
    // 1. Security Check: Only allow POST requests from the front-end
    if (req.method !== 'POST') {
        // Return 405 Method Not Allowed if someone tries to access it directly via GET
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 2. Get API Key securely from Vercel Environment Variables
    // The key MUST be set in Vercel Settings as the variable name TRANSLATION_API_KEY.
    const apiKey = process.env.TRANSLATION_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ message: 'Server configuration error: TRANSLATION_API_KEY is missing.' });
    }

    // 3. Get the user's prompt (text to be translated) sent from the front-end
    const { prompt: originalText } = req.body;

    if (!originalText) {
        return res.status(400).json({ message: 'Missing text prompt in request body.' });
    }
    
    // The system prompt guides the LLM to only output the Sanskrit translation
    const systemPrompt = "You are an expert translator. Your sole task is to translate the given English or Hinglish text accurately and elegantly into Sanskrit. Provide ONLY the Sanskrit translation as your response, without any greetings, commentary, or the original text. If the text is a question, ensure the Sanskrit translation is also a question.";

    // 4. Construct the Payload for the External API (OpenAI/GLM style format)
    const payload = {
        model: CUSTOM_MODEL_ID,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: originalText }
        ],
        max_tokens: 100,
        temperature: 0.7,
        stream: false
    };

    try {
        // 5. Forward the Request to your Custom Render API Endpoint
        const apiResponse = await fetch(`${CUSTOM_API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // Attach the secret key from the environment variable here
                'Authorization': `Bearer ${apiKey}` 
            },
            body: JSON.stringify(payload)
        });

        const apiData = await apiResponse.json();

        if (!apiResponse.ok) {
            // Handle HTTP errors returned by the external API (e.g., 401 Invalid Key, 429 Rate Limit)
            console.error("External API error:", apiData);
            return res.status(apiResponse.status).json({ 
                message: `External API failed: ${apiData.error?.message || apiData.message || 'Unknown API error'}` 
            });
        }
        
        // 6. Extract the translation from the standard completion response structure
        const sanskritText = apiData.choices?.[0]?.message?.content?.trim();

        if (!sanskritText) {
             return res.status(500).json({ message: 'External API returned empty or malformed translation.' });
        }

        // 7. Send the clean, translated text back to the client (index.html)
        // The client expects a JSON object with the key 'sanskritText'
        return res.status(200).json({ sanskritText });

    } catch (error) {
        console.error('Proxy request failed:', error);
        return res.status(500).json({ message: `Internal server error during translation: ${error.message}` });
    }
}
