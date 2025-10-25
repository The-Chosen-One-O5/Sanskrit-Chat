// imgbb image upload proxy
// Runs securely on Vercel serverless (Node.js environment)

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      console.error('IMGBB_API_KEY not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error: IMGBB_API_KEY not set.' });
    }

    // Get the image data from the request body
    // The body should contain the base64-encoded image
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    console.log('Uploading image to imgbb...');
    
    // Create URL-encoded form data for imgbb API
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', image);
    
    // Upload to imgbb
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      console.error(`imgbb API error ${response.status}: ${errorText}`);
      return res.status(response.status).json({ 
        error: `imgbb API error: ${errorText}` 
      });
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('imgbb upload failed:', data);
      return res.status(400).json({ 
        error: data.error?.message || 'Upload failed' 
      });
    }

    console.log('Image uploaded successfully to imgbb');
    
    return res.status(200).json(data);
  } catch (err) {
    console.error('Unhandled error in upload-image API:', err);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: err.message 
    });
  }
};
