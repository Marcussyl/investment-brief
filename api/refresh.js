// Vercel Serverless Function: CORS proxy for Cursor webhook
// This proxy forwards refresh requests to api2.cursor.sh with proper CORS headers

export default async function handler(req, res) {
  // CORS configuration
  const origin = req.headers.origin;
  
  // Determine allowed origin
  let allowOrigin = 'https://marcussyl.github.io'; // fallback
  
  if (origin) {
    // Allow Vercel deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      allowOrigin = origin;
    }
    // Allow custom domain from environment (optional)
    else if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) {
      allowOrigin = origin;
    }
    // Allow localhost development
    else if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      allowOrigin = origin;
    }
    // Allow GitHub Pages (transition)
    else if (origin === 'https://marcussyl.github.io') {
      allowOrigin = origin;
    }
  }
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Set CORS headers for POST response
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  // Check environment variables
  const webhookUrl = process.env.REFRESH_WEBHOOK_URL;
  const webhookAuth = process.env.REFRESH_WEBHOOK_AUTH;
  
  if (!webhookUrl || !webhookAuth) {
    console.error('Missing environment variables: REFRESH_WEBHOOK_URL or REFRESH_WEBHOOK_AUTH');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Webhook not configured. Set REFRESH_WEBHOOK_URL and REFRESH_WEBHOOK_AUTH in Vercel environment.'
    });
  }
  
  try {
    // Forward request to Cursor webhook
    const upstreamRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': webhookAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'investment-brief-update-btn',
        proxy: 'vercel'
      })
    });
    
    // Read response body
    let responseBody;
    const contentType = upstreamRes.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseBody = await upstreamRes.json();
    } else {
      responseBody = await upstreamRes.text();
    }
    
    // Return upstream status and body (without exposing secrets)
    return res.status(upstreamRes.status).json({
      ok: upstreamRes.ok,
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      body: responseBody
    });
    
  } catch (error) {
    console.error('Webhook forward failed:', error);
    return res.status(502).json({
      error: 'Bad Gateway',
      message: 'Failed to reach upstream webhook',
      detail: error.message
    });
  }
}
