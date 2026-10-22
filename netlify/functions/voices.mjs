/**
 * VoiceCraft - Netlify Serverless Function: Voice Listing
 * Route: /api/voices -> /.netlify/functions/voices
 * Calls official ElevenLabs API: GET https://api.elevenlabs.io/v1/voices
 * Authenticates securely server-side via process.env.ELEVENLABS_API_KEY.
 * Never exposes secrets to frontend.
 */

const ELEVENLABS_VOICES_URL = 'https://api.elevenlabs.io/v1/voices';

/**
 * Core business logic for voice listing
 */
async function handleVoiceListing() {
  const apiKey = process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.trim() : '';

  // 1. Missing or placeholder configuration check
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
    return {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        error: 'Configuration Error',
        message: 'ElevenLabs API key is not configured. Please add the ELEVENLABS_API_KEY environment variable in Netlify Site Configuration (or in your local .env file).',
        configured: false,
        voices: [],
      }),
    };
  }

  // 2. Fetch from ElevenLabs API
  try {
    const upstreamRes = await fetch(ELEVENLABS_VOICES_URL, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!upstreamRes.ok) {
      const status = upstreamRes.status;
      let errorDetail = '';

      try {
        const errorJson = await upstreamRes.json();
        errorDetail = errorJson?.detail?.message || errorJson?.detail || errorJson?.message || '';
      } catch {
        errorDetail = await upstreamRes.text().catch(() => '');
      }

      let sanitizedMessage = 'Failed to fetch voices from ElevenLabs.';
      if (status === 401 || status === 403) {
        sanitizedMessage = 'Invalid or unauthorized ElevenLabs API key. Please verify your credentials in your ElevenLabs dashboard.';
      } else if (status === 429) {
        sanitizedMessage = 'ElevenLabs rate limit or quota exceeded. Please check your account credits and tier limits.';
      } else if (errorDetail && typeof errorDetail === 'string') {
        sanitizedMessage = `ElevenLabs error: ${errorDetail.slice(0, 150)}`;
      }

      return {
        status: status >= 400 && status < 600 ? status : 502,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({
          error: 'Upstream Error',
          status,
          message: sanitizedMessage,
          configured: true,
          voices: [],
        }),
      };
    }

    const data = await upstreamRes.json();
    const rawVoices = Array.isArray(data?.voices) ? data.voices : [];

    // Sanitize and structure voices metadata for frontend
    const voices = rawVoices.map((v) => ({
      voice_id: v.voice_id,
      name: v.name || 'Unnamed Voice',
      category: v.category || 'General',
      description: v.description || '',
      preview_url: v.preview_url || null,
      labels: v.labels || {},
      accent: v.labels?.accent || null,
      gender: v.labels?.gender || null,
      age: v.labels?.age || null,
      use_case: v.labels?.['use case'] || v.labels?.use_case || null,
    }));

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
      body: JSON.stringify({
        voices,
        total: voices.length,
        configured: true,
      }),
    };
  } catch (err) {
    return {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        error: 'Network Error',
        message: 'Could not connect to ElevenLabs API. Please check your internet connectivity.',
        configured: true,
        voices: [],
      }),
    };
  }
}

/**
 * Universal dispatcher supporting both Netlify Functions 2.0 (Request/Response)
 * and classic Netlify/AWS Lambda handler signatures.
 */
export default async function (req, context) {
  // If running under Netlify Functions 2.0 (Web Request)
  if (req && typeof req.headers?.get === 'function') {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({
          error: 'Method Not Allowed',
          message: 'Only GET requests are supported on this endpoint.',
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Allow': 'GET, OPTIONS',
          },
        }
      );
    }

    const result = await handleVoiceListing();
    return new Response(result.body, {
      status: result.status,
      headers: result.headers,
    });
  }

  // Fallback for classic Netlify Functions v1 (event, context)
  const event = req;
  const httpMethod = event?.httpMethod || 'GET';

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, OPTIONS',
      },
      body: JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only GET requests are supported on this endpoint.',
      }),
    };
  }

  const result = await handleVoiceListing();
  return {
    statusCode: result.status,
    headers: result.headers,
    body: result.body,
  };
}

// Named export for v1 compatibility
export const handler = async (event, context) => {
  const httpMethod = event?.httpMethod || 'GET';

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, OPTIONS',
      },
      body: JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only GET requests are supported on this endpoint.',
      }),
    };
  }

  const result = await handleVoiceListing();
  return {
    statusCode: result.status,
    headers: result.headers,
    body: result.body,
  };
};
