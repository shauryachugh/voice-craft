# VoiceCraft — Secure AI Voice Generator SaaS

VoiceCraft is a high-performance, secure AI voice generator SaaS powered by the official **ElevenLabs API** and hosted seamlessly on **Netlify** using serverless edge/backend functions.

![VoiceCraft Dark Theme Interface](https://raw.githubusercontent.com/VoiceCraft/assets/main/preview.png)

---

## Architecture Overview

```
VoiceCraft/
├── public/                 # Static frontend assets
│   ├── index.html          # Semantic HTML5 layout
│   ├── style.css           # Premium dark theme styling
│   └── script.js           # Vanilla JS application logic & player
├── netlify/
│   └── functions/          # Serverless backend functions
│       ├── voices.mjs      # GET  /api/voices   (Secure ElevenLabs voice listing)
│       └── generate.mjs    # POST /api/generate (Secure TTS audio synthesis)
├── test/
│   └── test-functions.mjs  # Automated backend validation test suite
├── netlify.toml            # Netlify build, publish & redirects configuration
├── package.json            # Node project configuration & dev scripts
├── .gitignore              # Strict ignore rules for secrets and node_modules
├── .env.example            # Environment variable template (placeholders only)
└── README.md               # Comprehensive documentation
```

### Security Architecture

- **Zero-Exposure Policy**: The ElevenLabs API key is **never** sent to the browser, stored in client-side code, or tracked in git commits.
- **Serverless Isolation**: All requests to ElevenLabs are proxied via serverless functions (`netlify/functions/voices.mjs` and `netlify/functions/generate.mjs`).
- **Sanitized Responses**: Backend functions scrub error messages and upstream headers before returning responses to the browser, eliminating credential and stack leakage.
- **Memory Hygiene**: Generated audio blobs are tracked in memory during browser sessions, and temporary object URLs are freed (`URL.revokeObjectURL`) to prevent memory bloat.

---

## 1. Project Setup

### Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended).
- **npm**: v9.0.0 or later.
- **Git**: Installed and configured.
- **Netlify Account**: Free or Pro tier at [netlify.com](https://www.netlify.com).
- **ElevenLabs Account**: API key from [elevenlabs.io](https://elevenlabs.io).

### Installation

Clone the repository (or initialize locally):

```bash
cd VoiceCraft
npm install
```

---

## 2. Local Development

You can run VoiceCraft locally using the Netlify CLI:

```bash
# Start Netlify local development server with functions emulation
npm run dev
# or
npx netlify dev
```

The application will be served at `http://localhost:8888`. Netlify CLI automatically spins up both the static frontend from `public/` and mounts serverless functions under `/.netlify/functions/` (aliased to `/api/*` as configured in `netlify.toml`).

### Local Environment Variables (Optional)

To test live voice generation locally without committing credentials:

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set your key:
   ```env
   ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key
   ```
3. Verify that `.gitignore` contains `.env` (already pre-configured).

> **Important**: The application gracefully displays a configuration guidance banner if `ELEVENLABS_API_KEY` is not present, allowing complete UI verification without configuring a real key.

---

## 3. Safe Git Initialization and Pushing to GitHub

Ensure no secrets or build artifacts are committed before pushing to GitHub.

### Step 1: Verify Ignored Files

Verify that `.env` and `node_modules` are ignored:

```bash
git status --ignored
```

Check that `.env` is listed under "Ignored files".

### Step 2: Initialize Git and Commit

```bash
# Initialize git repository
git init

# Add all tracked files
git add .

# Verify staged files (ensure NO .env or credentials are staged)
git status

# Commit
git commit -m "feat: initial commit of VoiceCraft SaaS platform"
```

### Step 3: Create GitHub Repository and Push

1. Open [github.com/new](https://github.com/new) and create a repository (e.g. `voicecraft`). Keep it private or public based on your preference.
2. Link your local repo and push:

```bash
git remote add origin https://github.com/<your-username>/voicecraft.git
git branch -M main
git push -u origin main
```

---

## 4. Importing the GitHub Repository into Netlify

1. Log in to [Netlify Dashboard](https://app.netlify.com).
2. Click **Add new site** &rarr; **Import an existing project**.
3. Select **GitHub** and authorize access to your `voicecraft` repository.
4. Netlify will detect the configuration automatically from `netlify.toml`:
   - **Base directory**: `.` (empty or root)
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
5. Click **Deploy VoiceCraft**.

---

## 5. Adding `ELEVENLABS_API_KEY` in Netlify

Your ElevenLabs API key must be injected via Netlify's encrypted site settings:

1. In the Netlify site dashboard, navigate to:
   **Site configuration** &rarr; **Environment variables**
2. Click **Add a variable** &rarr; **Add a single variable**.
3. Fill in the fields:
   - **Key**: `ELEVENLABS_API_KEY`
   - **Value**: Paste your secret ElevenLabs API key (starts with `sk_` or similar hexadecimal string)
   - **Scopes**: Keep default (Builds, Functions, Post-processing)
4. Click **Create variable**.

---

## 6. Redeploying After Environment Variable Changes

Environment variables in Netlify apply to new builds and serverless function deployments.

1. In your Netlify dashboard, go to the **Deploys** tab.
2. Click the **Trigger deploy** dropdown on the right.
3. Select **Clear cache and deploy site**.
4. Once the deployment finishes (typically 15-30 seconds), your serverless functions will have access to `process.env.ELEVENLABS_API_KEY`.

---

## 7. Testing `/api/voices` and `/api/generate`

### Health Checking `/api/voices`

You can verify your deployment directly via `curl` or in the browser:

```bash
curl -X GET https://<your-site-name>.netlify.app/api/voices
```

Expected response when key is properly configured:
```json
{
  "voices": [
    {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "name": "Rachel",
      "category": "premade",
      "accent": "american",
      "gender": "female"
    }
  ],
  "total": 45,
  "configured": true
}
```

### Testing Speech Generation `/api/generate`

```bash
curl -X POST https://<your-site-name>.netlify.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Welcome to VoiceCraft AI.",
    "voiceId": "21m00Tcm4TlvDq8ikWAM"
  }' \
  --output test-speech.mp3
```

Check that `test-speech.mp3` is saved and plays clear speech.

---

## 8. Troubleshooting Errors

| Status Code | Cause | Solution |
| :--- | :--- | :--- |
| **503 Configuration Error** | `ELEVENLABS_API_KEY` is not defined in Netlify or local environment. | Add the variable in Netlify Site Configuration &rarr; Environment variables, then trigger a redeploy. |
| **401 / 403 Unauthorized** | ElevenLabs rejected the API key (invalid, expired, or lacking TTS permissions). | Verify your key at [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys) and update Netlify. |
| **404 Not Found** | URL path mismatch or Netlify redirect rewrite issue. | Verify `netlify.toml` contains `[[redirects]]` mapping `/api/voices` and `/api/generate` to `/.netlify/functions/*`. |
| **405 Method Not Allowed** | Incorrect HTTP method used (e.g. GET on `/api/generate` or POST on `/api/voices`). | Use `GET` for `/api/voices` and `POST` for `/api/generate`. |
| **429 Too Many Requests** | ElevenLabs character quota or concurrency rate limit reached. | Check your subscription tier and credits balance on the ElevenLabs dashboard. |
| **502 Upstream Error** | ElevenLabs server connectivity timeout or upstream outage. | Verify [ElevenLabs status page](https://status.elevenlabs.io) and retry in a few moments. |

---

## 9. Preventing API Abuse and Unexpected Usage

Since ElevenLabs bills based on synthesized characters, consider implementing the following safeguards before public commercial launch:

1. **Text Length Constraints**: VoiceCraft frontend and backend already enforce a maximum limit of **5,000 characters** per request.
2. **Netlify Rate Limiting**: Enable Netlify Edge rate limiting or Cloudflare proxying in front of `/api/generate` to limit requests per IP (e.g., max 10 requests per minute).
3. **Authentication / Turnstile**: Add user authentication (e.g. Netlify Identity, Supabase, Clerk) or Cloudflare Turnstile CAPTCHA to `/api/generate` to ensure only registered users consume speech credits.
4. **ElevenLabs Tier Hard Limits**: Set up usage notifications and hard balance caps in your ElevenLabs Billing settings to prevent unexpected charges.

---

## 10. Rotating a Leaked or Compromised API Key

If an API key is ever accidentally exposed or compromised:

1. **Revoke Immediately**: Go to [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys), locate the compromised key, and click **Delete / Revoke**.
2. **Generate New Key**: Click **Create New Key**, give it a descriptive name (e.g., `VoiceCraft Production`), and copy the new value.
3. **Update Netlify**: Go to Netlify Dashboard &rarr; Site Configuration &rarr; Environment variables &rarr; Edit `ELEVENLABS_API_KEY` with the new key.
4. **Trigger Redeploy**: Under Deploys &rarr; Trigger deploy &rarr; Clear cache and deploy site.
5. **Verify**: Test the `/api/voices` endpoint to confirm the new key is active.

---

## Testing & Verification

Run the built-in automated backend test suite:

```bash
npm test
```

This validates:
- Missing-key 503 response.
- HTTP method restrictions (405).
- Input validation (empty text, invalid voice IDs, character limits).
- Netlify Functions format compatibility.

---

## License

MIT License &copy; 2026 VoiceCraft.
