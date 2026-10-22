/**
 * VoiceCraft - Netlify Serverless Function: Speech Generation
 * Route: /api/generate -> /.netlify/functions/generate
 * Calls official ElevenLabs API: POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
 * Securely uses server-side process.env.ELEVENLABS_API_KEY.
 * Never exposes secrets or returns stack traces to the client.
 */

const ELEVENLABS_TTS_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MAX_TEXT_LENGTH = 5000;
const VOICE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validates and processes the speech generation request
 */
async function processSpeechGeneration(rawBody) {
  const apiKey = process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.trim() : '';

  // 1. Validate API Key configuration
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
    return {
      status: 503,
      isBinary: false,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        error: 'Configuration Error',
        message: 'ElevenLabs API key is not configured. Please add the ELEVENLABS_API_KEY environment variable in Netlify Site Configuration (or in your local .env file).',
        configured: false,
      }),
    };
  }

  // 2. Parse request payload
  let payload;
  try {
    payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch (err) {
    return {
      status: 400,
      isBinary: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Invalid Request',
        message: 'Request body must be valid JSON.',
      }),
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      status: 400,
      isBinary: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Invalid Request',
        message: 'Request payload must be an object containing "text" and "voiceId".',
      }),
    };
  }

  const { text, voiceId, modelId, stability, similarityBoost } = payload;

  // 3. Validate text
  if (typeof text !== 'string' || !text.trim()) {
    return {
      status: 400,
      isBinary: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Validation Error',
        message: 'Text is required and cannot be empty.',
      }),
    };
  }

  const trimmedText = text.trim();
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return {
      status: 400,
      isBinary: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Validation Error',
        message: `Text exceeds maximum allowed length of ${MAX_TEXT_LENGTH} characters (current: ${trimmedText.length}).`,
      }),
    };
  }

  // 4. Validate voiceId
  if (typeof voiceId !== 'string' || !VOICE_ID_REGEX.test(voiceId.trim())) {
    return {
      status: 400,
      isBinary: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Validation Error',
        message: 'A valid Voice ID is required.',
      }),
    };
  }

  const cleanVoiceId = voiceId.trim();

  // 5. Build ElevenLabs TTS Request
  const allowedModels = ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_monolingual_v1'];
  const selectedModel = allowedModels.includes(modelId) ? modelId : 'eleven_multilingual_v2';

  const cleanStability = typeof stability === 'number' && stability >= 0 && stability <= 1 ? stability : 0.5;
  const cleanSimilarity = typeof similarityBoost === 'number' && similarityBoost >= 0 && similarityBoost <= 1 ? similarityBoost : 0.75;

  const targetUrl = `${ELEVENLABS_TTS_BASE_URL}/${encodeURIComponent(cleanVoiceId)}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: trimmedText,
        model_id: selectedModel,
        voice_settings: {
          stability: cleanStability,
          similarity_boost: cleanSimilarity,
        },
      }),
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

      let sanitizedMessage = 'Failed to generate speech audio from ElevenLabs.';
      if (status === 401 || status === 403) {
        sanitizedMessage = 'Invalid or unauthorized ElevenLabs API key. Please check your account credentials in Netlify settings.';
      } else if (status === 429) {
        sanitizedMessage = 'ElevenLabs quota or rate limit exceeded. Please check your credit balance.';
      } else if (status === 400 || status === 404 || status === 422) {
        sanitizedMessage = errorDetail && typeof errorDetail === 'string'
          ? `ElevenLabs error: ${errorDetail.slice(0, 150)}`
          : 'The specified voice or parameters are invalid.';
      } else if (status >= 500) {
        sanitizedMessage = 'ElevenLabs voice service is temporarily unavailable. Please try again shortly.';
      }

      return {
        status: status >= 400 && status < 600 ? status : 502,
        isBinary: false,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({
          error: 'Generation Failed',
          status,
          message: sanitizedMessage,
        }),
      };
    }

    // Read binary audio
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      status: 200,
      isBinary: true,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="voicecraft-speech.mp3"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Length': String(audioBuffer.length),
      },
      buffer: audioBuffer,
    };
  } catch (err) {
    return {
      status: 502,
      isBinary: false,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        error: 'Network Error',
        message: 'Could not connect to ElevenLabs API to generate speech. Please check your connection.',
      }),
    };
  }
}

/**
 * Netlify Functions 2.0 Web Request handler
 */
export default async function (req, context) {
  // Check if Web Request format
  if (req && typeof req.headers?.get === 'function') {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method Not Allowed',
          message: 'Only POST requests are supported on /api/generate.',
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Allow': 'POST, OPTIONS',
          },
        }
      );
    }

    let rawBody = '';
    try {
      rawBody = await req.text();
    } catch {
      rawBody = '';
    }

    const result = await processSpeechGeneration(rawBody);

    if (result.isBinary) {
      return new Response(result.buffer, {
        status: result.status,
        headers: result.headers,
      });
    }

    return new Response(result.body, {
      status: result.status,
      headers: result.headers,
    });
  }

  // Fallback for classic Netlify Functions v1 (event, context)
  const event = req;
  const httpMethod = event?.httpMethod || 'POST';

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only POST requests are supported on /api/generate.',
      }),
    };
  }

  const rawBody = event?.body || '';
  const result = await processSpeechGeneration(rawBody);

  if (result.isBinary) {
    return {
      statusCode: result.status,
      headers: result.headers,
      body: result.buffer.toString('base64'),
      isBase64Encoded: true,
    };
  }

  return {
    statusCode: result.status,
    headers: result.headers,
    body: result.body,
  };
}

// Named export for v1 compatibility
export const handler = async (event, context) => {
  const httpMethod = event?.httpMethod || 'POST';

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only POST requests are supported on /api/generate.',
      }),
    };
  }

  const rawBody = event?.body || '';
  const result = await processSpeechGeneration(rawBody);

  if (result.isBinary) {
    return {
      statusCode: result.status,
      headers: result.headers,
      body: result.buffer.toString('base64'),
      isBase64Encoded: true,
    };
  }

  return {
    statusCode: result.status,
    headers: result.headers,
    body: result.body,
  };
};
