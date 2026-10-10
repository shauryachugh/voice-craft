/**
 * VoiceCraft API Client Module
 * Handles all server-side interactions cleanly without exposing secrets.
 */

const API = {
  // Check API key connection & quota status
  async getStatus() {
    try {
      const res = await fetch('/api/status');
      return await res.json();
    } catch (err) {
      return { configured: false, connected: false, error: err.message };
    }
  },

  // Save & verify API key
  async setApiKey(apiKey) {
    const res = await fetch('/api/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to verify ElevenLabs API key');
    }
    return data;
  },

  // Clear API key
  async clearApiKey() {
    const res = await fetch('/api/key', {
      method: 'DELETE'
    });
    return await res.json();
  },


  // Get dynamic voices catalog from ElevenLabs
  async getVoices() {
    try {
      const res = await fetch('/api/voices');
      const data = await res.json();
      return data.voices || [];
    } catch (err) {
      console.error('Error fetching voices:', err);
      return [];
    }
  },

  // Generate Speech with ElevenLabs
  async generateSpeech({ text, voiceId, modelId, voiceSettings }) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId,
        modelId,
        voiceSettings
      })
    });

    if (!res.ok) {
      let errorMsg = 'Failed to generate speech';
      let errorCode = null;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.error || errorMsg;
        errorCode = errorJson.code || errorJson.status;
      } catch (e) {
        errorMsg = await res.text();
      }
      const err = new Error(errorMsg);
      err.code = errorCode;
      err.status = res.status;
      throw err;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return { blob, url, isDemo: false };
  },

  // Demo fallback generation (plays preview audio when no key is set yet)
  async generateDemoSpeech(voiceId) {
    const res = await fetch('/api/demo-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId })
    });

    if (!res.ok) {
      throw new Error('Failed to generate preview audio');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return { blob, url, isDemo: true };
  }
};

window.API = API;
