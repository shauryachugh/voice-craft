# VoiceCraft – AI Voice Generator

VoiceCraft is a modern, subtle, and premium web application for generating high-fidelity AI speech powered by ElevenLabs.

## Features

- **Modern Minimal SaaS Design**: Subtle, elegant dark theme inspired by high-end design systems (Linear, Raycast, Vercel) with near-black charcoal backgrounds, soft micro-borders, and restrained accents.
- **Dynamic Voice Catalog**: Automatically fetches available voices directly from the ElevenLabs API, complete with gender, accent, and style descriptors, along with an inline audio sample preview for each voice.
- **Search & Category Filters**: Search voices by name or filter by female, male, narration, or conversational styles.
- **Collapsible Voice Settings**: Fine-tune stability, similarity / clarity, style exaggeration, speaker boost, and choose between models (`eleven_multilingual_v2`, `eleven_turbo_v2_5`, `eleven_flash_v2_5`, `eleven_monolingual_v1`).
- **Interactive Audio Player**:
  - SVG Play/Pause controls
  - Dynamic interactive audio waveform track with scrubbable seeking
  - Elapsed and total duration time indicators
  - Playback speed switcher (1.0x, 1.25x, 1.5x)
  - Volume slider and one-click mute
  - Direct MP3 file download with formatted filenames
  - "Generate Again" one-click action
- **Generation History**:
  - Recent generations stored locally in IndexedDB & localStorage
  - Instant inline playback, download, and "reuse in editor" actions
- **Secure Backend**:
  - Server-side Node.js Express proxy
  - ElevenLabs API keys are never exposed to client-side scripts
  - Convenient in-app key setup modal with live quota usage indicator

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure ElevenLabs API Key
Either:
- Set your key in `.env`:
  ```env
  ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here
  PORT=3000
  ```
- Or launch the app and click **API Key Setup** in the top-right header to configure and verify your key directly through the secure UI.

### 3. Run the Server
```bash
npm run dev
# or
npm start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack
- **Backend**: Node.js, Express, dotenv, cors
- **Frontend**: Semantic HTML5, Vanilla CSS3 (Custom Design System), ES6+ JavaScript
