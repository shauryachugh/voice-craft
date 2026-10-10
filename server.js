import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize ElevenLabsClient with process.env.ELEVENLABS_API_KEY by default
let apiKey = process.env.ELEVENLABS_API_KEY?.trim() || undefined;
let elevenlabs = new ElevenLabsClient({
  apiKey: apiKey, // Defaults to process.env.ELEVENLABS_API_KEY
});

// Fallback high-quality voices catalog in case of offline/network limits
const FALLBACK_VOICES = [
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    category: "premade",
    description: "Warm, captivating storyteller with a resonant British tone.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/JBFqnCBsd6RMkjVDRZzb/e6206d1a-0721-4787-ac34-a0027780005a.mp3",
    labels: { gender: "male", accent: "british", age: "middle_aged", use_case: "narration" }
  },
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    category: "premade",
    description: "Calm, natural, and warm. Great for narration, audiobooks, and conversational AI.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/df6788f9-1965-4e70-b30a-fb3caf82c57f.mp3",
    labels: { gender: "female", accent: "american", age: "young", use_case: "conversational" }
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    category: "premade",
    description: "Strong, energetic, and expressive. Perfect for games and commercials.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/AZnzlk1XvdvUeBnXmlld/50dd645c-9d48-47c9-ad33-659a43a0e716.mp3",
    labels: { gender: "female", accent: "american", age: "young", use_case: "expressive" }
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    category: "premade",
    description: "Soft, gentle, and pleasant. Ideal for mindfulness, reading, and customer service.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01524e93-47c0-449e-bee2-6f29ab26e4e5.mp3",
    labels: { gender: "female", accent: "american", age: "young", use_case: "narration" }
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    category: "premade",
    description: "Well-rounded, smooth, and friendly tone. Great for tutorials and narration.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/38d8f8f0-0412-4017-8e67-d86161476685.mp3",
    labels: { gender: "male", accent: "american", age: "young", use_case: "narration" }
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    category: "premade",
    description: "Young, clear, and upbeat. Perfect for educational content and mobile apps.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/MF3mGyEYCl7XYWbV9V6O/d8ec6dcd-2db6-4aad-ac6d-176d65421a2d.mp3",
    labels: { gender: "female", accent: "american", age: "young", use_case: "narration" }
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    category: "premade",
    description: "Deep, authentic, and calm. Great for storytelling, documentaries, and podcasts.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/TxGEqnHWrfWFTfGW9XjX/3a384e96-3023-455b-80df-c3619ea62886.mp3",
    labels: { gender: "male", accent: "american", age: "young", use_case: "narration" }
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    category: "premade",
    description: "Crisp, authoritative, and articulate. Excellent for news and corporate training.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/VR6AewLTigWG4xSOukaG/66e839e5-9c94-4364-882e-f14d8721cac6.mp3",
    labels: { gender: "male", accent: "american", age: "middle_aged", use_case: "narration" }
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    category: "premade",
    description: "Deep, warm, and resonant voice. Ideal for voiceovers, books, and podcasts.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/6734175b-0820-4959-93e1-51296d749c87.mp3",
    labels: { gender: "male", accent: "american", age: "middle_aged", use_case: "narration" }
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    category: "premade",
    description: "Dynamic and raspy character voice. Great for video games and drama.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/yoZ06aMxZJJ28mfd3POQ/ac98a287-3d1d-44a6-9ba4-e9fbab23b811.mp3",
    labels: { gender: "male", accent: "american", age: "young", use_case: "animation" }
  },
  {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger",
    category: "premade",
    description: "Laid-back, casual, and resonant voice for conversational listening.",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
    labels: { gender: "male", accent: "american", age: "middle_aged", use_case: "conversational" }
  }
];

// Check status of ElevenLabs API connection
app.get('/api/status', async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    return res.json({
      configured: false,
      connected: false,
      message: 'ELEVENLABS_API_KEY environment variable is not set.'
    });
  }

  try {
    const userSub = await elevenlabs.user.subscription.get();
    return res.json({
      configured: true,
      connected: true,
      tier: userSub.tier || 'Active',
      character_count: userSub.character_count ?? 0,
      character_limit: userSub.character_limit ?? 10000,
      status: userSub.status || 'active'
    });
  } catch (error) {
    // If the key is scoped (e.g. text-to-speech enabled without user_read permission), it is still fully active
    if (error.message?.includes('user_read') || error.message?.includes('missing_permissions')) {
      return res.json({
        configured: true,
        connected: true,
        tier: 'Active API Key',
        character_count: 0,
        character_limit: 100000,
        status: 'active'
      });
    }
    return res.json({
      configured: true,
      connected: false,
      error: error.message || 'Could not connect to ElevenLabs API with current key.'
    });
  }
});

// Configure and verify ElevenLabs API key
app.post('/api/key', async (req, res) => {
  const { apiKey: newApiKey } = req.body;
  if (!newApiKey || typeof newApiKey !== 'string' || !newApiKey.trim()) {
    return res.status(400).json({ error: 'API key is required.' });
  }

  const cleanKey = newApiKey.trim();

  // Test the key with ElevenLabs
  try {
    const testClient = new ElevenLabsClient({ apiKey: cleanKey });
    const userSub = await testClient.user.subscription.get();

    // Key is verified! Update running process and client
    process.env.ELEVENLABS_API_KEY = cleanKey;
    apiKey = cleanKey;
    elevenlabs = testClient;

    // Persist to .env file
    try {
      const envPath = path.join(__dirname, '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (/^ELEVENLABS_API_KEY=/m.test(envContent)) {
        envContent = envContent.replace(/^ELEVENLABS_API_KEY=.*$/m, `ELEVENLABS_API_KEY=${cleanKey}`);
      } else {
        envContent += `\nELEVENLABS_API_KEY=${cleanKey}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (fsErr) {
      console.warn('Could not write key to .env file:', fsErr.message);
    }

    return res.json({
      success: true,
      connected: true,
      tier: userSub.tier || 'Active',
      character_count: userSub.character_count ?? 0,
      character_limit: userSub.character_limit ?? 10000,
      status: userSub.status || 'active'
    });
  } catch (error) {
    console.error('API Key verification failed:', error.message);
    let errMsg = 'Invalid ElevenLabs API key or unauthorized.';
    if (error.statusCode === 401 || (error.message && error.message.includes('401'))) {
      errMsg = 'Invalid API key. Please check your ElevenLabs API key and try again.';
    } else if (error.message) {
      errMsg = error.message;
    }
    return res.status(400).json({
      success: false,
      error: errMsg
    });
  }
});

// Clear ElevenLabs API key
app.delete('/api/key', (req, res) => {
  process.env.ELEVENLABS_API_KEY = '';
  apiKey = undefined;
  elevenlabs = new ElevenLabsClient({ apiKey: undefined });

  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/^ELEVENLABS_API_KEY=.*$/m, 'ELEVENLABS_API_KEY=');
      fs.writeFileSync(envPath, envContent, 'utf8');
    }
  } catch (e) {
    console.warn('Could not clear key in .env:', e.message);
  }

  return res.json({ success: true, message: 'API key cleared.' });
});

// Get available voices dynamically from ElevenLabs
app.get('/api/voices', async (req, res) => {
  try {
    if (process.env.ELEVENLABS_API_KEY?.trim()) {
      const response = await elevenlabs.voices.getAll();
      const voicesList = (response.voices || []).map(v => ({
        id: v.voice_id || v.id,
        name: v.name,
        category: v.category || 'premade',
        description: v.description || (v.labels ? Object.values(v.labels).filter(Boolean).join(', ') : ''),
        preview_url: v.preview_url || (v.verified_languages?.[0]?.preview_url) || null,
        labels: v.labels || {},
        highQualityBaseModelIds: v.high_quality_base_model_ids || []
      }));

      if (voicesList.length > 0) {
        return res.json({
          success: true,
          source: 'elevenlabs_sdk',
          voices: voicesList
        });
      }
    }

    // Public API fetch fallback
    const publicRes = await fetch('https://api.elevenlabs.io/v1/voices');
    if (publicRes.ok) {
      const data = await publicRes.json();
      const voices = (data.voices || []).map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category || 'premade',
        description: v.description || (v.labels ? Object.values(v.labels).filter(Boolean).join(', ') : ''),
        preview_url: v.preview_url || (v.verified_languages?.[0]?.preview_url) || null,
        labels: v.labels || {},
        highQualityBaseModelIds: v.high_quality_base_model_ids || []
      }));

      // Ensure George is first or prominent
      const george = FALLBACK_VOICES[0];
      if (!voices.some(v => v.id === george.id)) {
        voices.unshift(george);
      }

      return res.json({
        success: true,
        source: 'public_api',
        voices
      });
    }

    return res.json({
      success: true,
      source: 'fallback',
      voices: FALLBACK_VOICES
    });
  } catch (error) {
    console.error('Error fetching voices:', error.message);
    return res.json({
      success: true,
      source: 'fallback',
      voices: FALLBACK_VOICES
    });
  }
});

// Supported models list
app.get('/api/models', (req, res) => {
  res.json({
    models: [
      {
        id: 'eleven_multilingual_v2',
        name: 'Eleven Multilingual v2',
        description: 'Best emotional richness, 29 languages. Recommended for high-fidelity speech.',
        default: true
      },
      {
        id: 'eleven_turbo_v2_5',
        name: 'Eleven Turbo v2.5',
        description: 'Ultra-fast low latency, optimized for real-time and streaming.',
        default: false
      },
      {
        id: 'eleven_flash_v2_5',
        name: 'Eleven Flash v2.5',
        description: 'Blazing fast, 32 languages, exceptionally efficient.',
        default: false
      },
      {
        id: 'eleven_monolingual_v1',
        name: 'Eleven Monolingual v1',
        description: 'Classic high-accuracy English model.',
        default: false
      }
    ]
  });
});

// Text-to-Speech Generation endpoint using @elevenlabs/elevenlabs-js
app.post('/api/generate', async (req, res) => {
  const { text, voiceId, modelId, voiceSettings } = req.body;

  // Validation
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text prompt is required.' });
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: 'Text exceeds maximum limit of 5,000 characters.' });
  }

  const targetVoiceId = voiceId || 'JBFqnCBsd6RMkjVDRZzb'; // Defaults to George

  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    return res.status(401).json({
      error: 'ELEVENLABS_API_KEY is not configured in your environment or .env file.',
      code: 'NO_API_KEY'
    });
  }

  try {
    // Generate audio using official ElevenLabsClient
    const audioStream = await elevenlabs.textToSpeech.convert(
      targetVoiceId,
      {
        text: text.trim(),
        modelId: modelId || 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
          stability: Math.max(0, Math.min(1, Number(voiceSettings?.stability ?? 0.50))),
          similarityBoost: Math.max(0, Math.min(1, Number(voiceSettings?.similarityBoost ?? 0.75))),
          style: Math.max(0, Math.min(1, Number(voiceSettings?.style ?? 0.00))),
          useSpeakerBoost: Boolean(voiceSettings?.speakerBoost ?? true)
        }
      }
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `inline; filename="voicecraft-${targetVoiceId}-${Date.now()}.mp3"`,
      'Cache-Control': 'no-cache'
    });

    // Pipe Readable stream to response
    const nodeStream = Readable.fromWeb(audioStream);
    nodeStream.pipe(res);

  } catch (error) {
    console.error('ElevenLabs generation error:', error);
    const status = error.statusCode || error.status || 500;
    return res.status(status).json({
      error: error.message || 'Generation failed with ElevenLabs API.',
      status
    });
  }
});

// Demo preview generation (sample audio fallback)
app.post('/api/demo-generate', async (req, res) => {
  const { voiceId } = req.body;
  const voice = FALLBACK_VOICES.find(v => v.id === voiceId) || FALLBACK_VOICES[0];
  const previewUrl = voice.preview_url;

  try {
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) {
      return res.status(500).json({ error: 'Could not fetch sample audio preview.' });
    }
    const audioBuf = await audioRes.arrayBuffer();
    const buffer = Buffer.from(audioBuf);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename="demo-${voice.id}.mp3"`,
      'X-Demo-Mode': 'true'
    });
    return res.send(buffer);
  } catch (e) {
    return res.status(500).json({ error: `Failed loading sample: ${e.message}` });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiConfigured: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`VoiceCraft server running at http://localhost:${PORT}`);
});
