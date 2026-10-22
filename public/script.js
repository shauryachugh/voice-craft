/**
 * VoiceCraft — Frontend Application Script
 * Clean vanilla JavaScript architecture managing:
 * - Text-to-speech workspace & sample texts
 * - Real ElevenLabs voice library fetching & searching (/api/voices)
 * - Audio synthesis requests (/api/generate)
 * - Custom audio player controls & MP3 downloads
 * - In-memory session history with resource cleanup (URL.revokeObjectURL)
 * - API connection status & setup guide
 */

(function () {
  'use strict';

  // ==========================================================================
  // Sample Texts
  // ==========================================================================
  const SAMPLE_TEXTS = {
    audiobook:
      'The lighthouse had stood upon the jagged promontory for over a century, its lantern cutting through the dense coastal fog like a solitary diamond in the dark. Below, the relentless waves crashed against granite cliffs, whispering ancient secrets only the wind could comprehend.',
    product:
      'Introducing NovaFlow — the next evolution in generative voice intelligence. Experience lifelike intonation, multi-lingual emotional depth, and sub-second synthesis designed to power your apps, games, and storytelling at scale.',
    mindful:
      'Take a slow, deep breath in... and gently let it go. Allow your shoulders to drop, releasing whatever tension you have been carrying today. You are present, grounded, and fully capable of navigating whatever comes next.',
    welcome:
      'Welcome to the platform! We are thrilled to have you with us. Your workspace has been personalized and is ready to explore. If you need any assistance along the way, our dedicated support team is here 24/7 to guide you.',
  };

  // ==========================================================================
  // State Management
  // ==========================================================================
  const state = {
    apiConfigured: false,
    voices: [],
    selectedVoiceId: null,
    currentAudioBlob: null,
    currentAudioUrl: null,
    currentAudioDuration: 0,
    audioElement: new Audio(),
    previewAudioElement: new Audio(),
    activePreviewVoiceId: null,
    isPlaying: false,
    playbackSpeed: 1.0,
    sessionHistory: [],
    isGenerating: false,
  };

  // ==========================================================================
  // DOM Elements Cache
  // ==========================================================================
  const DOM = {
    // Header & Status
    apiStatusBadge: document.getElementById('btn-api-status'),
    apiStatusText: document.getElementById('api-status-text'),
    btnOpenGuide: document.getElementById('btn-open-guide'),
    configBanner: document.getElementById('config-banner'),
    btnBannerGuide: document.getElementById('btn-banner-guide'),
    btnBannerRetry: document.getElementById('btn-banner-retry'),

    // Workspace & Text Input
    charCounter: document.getElementById('char-counter'),
    ttsTextInput: document.getElementById('tts-text-input'),
    inputError: document.getElementById('input-error'),
    btnClearText: document.getElementById('btn-clear-text'),
    readingTimeEst: document.getElementById('reading-time-est'),
    sampleButtons: document.querySelectorAll('.chip-btn'),

    // Voice Selection
    selectedVoiceDisplay: document.getElementById('selected-voice-display'),
    selectedVoiceName: document.getElementById('selected-voice-name'),
    selectedVoiceCategory: document.getElementById('selected-voice-category'),
    selectedVoiceDesc: document.getElementById('selected-voice-desc'),
    selectedVoiceTags: document.getElementById('selected-voice-tags'),
    btnPlayVoicePreview: document.getElementById('btn-play-voice-preview'),
    previewPlayIcon: document.getElementById('preview-play-icon'),
    voiceQuickSelect: document.getElementById('voice-quick-select'),
    btnBrowseVoices: document.getElementById('btn-browse-voices'),

    // Model & Sliders
    selectModel: document.getElementById('select-model'),
    rangeStability: document.getElementById('range-stability'),
    valStability: document.getElementById('val-stability'),
    rangeSimilarity: document.getElementById('range-similarity'),
    valSimilarity: document.getElementById('val-similarity'),
    btnGenerateSpeech: document.getElementById('btn-generate-speech'),
    generateBtnText: document.getElementById('generate-btn-text'),
    generateIcon: document.getElementById('generate-icon'),

    // Player
    playerEmptyState: document.getElementById('player-empty-state'),
    playerActiveState: document.getElementById('player-active-state'),
    currentClipVoice: document.getElementById('current-clip-voice'),
    currentClipTime: document.getElementById('current-clip-time'),
    currentClipChars: document.getElementById('current-clip-chars'),
    progressContainer: document.getElementById('player-progress-container'),
    progressFill: document.getElementById('player-progress-fill'),
    scrubHandle: document.getElementById('player-scrub-handle'),
    timeCurrent: document.getElementById('time-current'),
    timeDuration: document.getElementById('time-duration'),
    btnMainPlay: document.getElementById('btn-main-play'),
    mainPlayIcon: document.getElementById('main-play-icon'),
    mainPauseIcon: document.getElementById('main-pause-icon'),
    btnReplay5: document.getElementById('btn-replay-5'),
    btnSkip5: document.getElementById('btn-skip-5'),
    btnSpeedToggle: document.getElementById('btn-speed-toggle'),
    btnMuteToggle: document.getElementById('btn-mute-toggle'),
    volIcon: document.getElementById('vol-icon'),
    volumeSlider: document.getElementById('volume-slider'),
    btnDownloadMp3: document.getElementById('btn-download-mp3'),

    // History
    historyContainer: document.getElementById('history-container'),
    historyEmpty: document.getElementById('history-empty'),
    btnClearHistory: document.getElementById('btn-clear-history'),

    // Voice Library Modal
    modalVoiceLibrary: document.getElementById('modal-voice-library'),
    btnCloseVoiceModal: document.getElementById('btn-close-voice-modal'),
    voiceSearchInput: document.getElementById('voice-search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    voiceCategoryFilter: document.getElementById('voice-category-filter'),
    btnRefreshVoices: document.getElementById('btn-refresh-voices'),
    voiceGridContainer: document.getElementById('voice-grid-container'),
    modalVoiceCount: document.getElementById('modal-voice-count'),

    // Setup Guide Modal
    modalSetupGuide: document.getElementById('modal-setup-guide'),
    btnCloseGuideModal: document.getElementById('btn-close-guide-modal'),
    btnGuideTestConnection: document.getElementById('btn-guide-test-connection'),
    guideTestResult: document.getElementById('guide-test-result'),

    // Toasts
    toastContainer: document.getElementById('toast-container'),
  };

  // ==========================================================================
  // Helper: Toast Notifications
  // ==========================================================================
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span style="flex: 1;">${escapeHtml(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // ==========================================================================
  // API Status & Voice Fetching
  // ==========================================================================
  async function fetchVoices(showNotifications = false) {
    updateApiStatus('checking', 'Connecting...');

    try {
      const response = await fetch('/api/voices', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();

      if (response.status === 503 || data.configured === false) {
        state.apiConfigured = false;
        state.voices = [];
        updateApiStatus('warning', 'Key Required');
        showConfigBanner(true);
        populateVoiceSelect([]);
        renderVoiceGrid([]);
        if (showNotifications) {
          showToast('ELEVENLABS_API_KEY is not configured in Netlify settings.', 'warning', 5000);
        }
        return false;
      }

      if (!response.ok) {
        state.apiConfigured = true;
        updateApiStatus('error', 'API Error');
        showConfigBanner(false);
        const errMsg = data.message || 'Failed to fetch voices from ElevenLabs.';
        if (showNotifications) {
          showToast(errMsg, 'error', 5000);
        }
        return false;
      }

      // Success
      state.apiConfigured = true;
      state.voices = Array.isArray(data.voices) ? data.voices : [];
      updateApiStatus('connected', `ElevenLabs Connected (${state.voices.length} voices)`);
      showConfigBanner(false);

      populateVoiceSelect(state.voices);
      renderVoiceGrid(state.voices);

      // Auto-select first voice if none selected
      if (!state.selectedVoiceId && state.voices.length > 0) {
        selectVoice(state.voices[0].voice_id);
      }

      if (showNotifications) {
        showToast(`Loaded ${state.voices.length} voices from ElevenLabs.`, 'success');
      }
      return true;
    } catch (err) {
      updateApiStatus('error', 'Connection Failed');
      if (showNotifications) {
        showToast('Unable to connect to /api/voices endpoint.', 'error', 4000);
      }
      return false;
    }
  }

  function updateApiStatus(status, text) {
    DOM.apiStatusBadge.className = `api-status-badge status-${status}`;
    DOM.apiStatusText.textContent = text;
  }

  function showConfigBanner(visible) {
    if (visible) {
      DOM.configBanner.classList.remove('hidden');
    } else {
      DOM.configBanner.classList.add('hidden');
    }
  }

  // ==========================================================================
  // Voice Library UI Rendering
  // ==========================================================================
  function populateVoiceSelect(voices) {
    DOM.voiceQuickSelect.innerHTML = '';

    if (!voices || voices.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = state.apiConfigured ? 'No voices found' : 'ELEVENLABS_API_KEY required';
      opt.disabled = true;
      opt.selected = true;
      DOM.voiceQuickSelect.appendChild(opt);
      return;
    }

    voices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.voice_id;
      const accent = voice.accent ? ` (${voice.accent})` : '';
      option.textContent = `${voice.name}${accent} — ${voice.category}`;
      if (voice.voice_id === state.selectedVoiceId) {
        option.selected = true;
      }
      DOM.voiceQuickSelect.appendChild(option);
    });
  }

  function selectVoice(voiceId) {
    const voice = state.voices.find((v) => v.voice_id === voiceId);
    if (!voice) return;

    state.selectedVoiceId = voiceId;
    DOM.voiceQuickSelect.value = voiceId;

    // Update active card
    DOM.selectedVoiceName.textContent = voice.name;
    DOM.selectedVoiceCategory.textContent = voice.category;
    DOM.selectedVoiceDesc.textContent = voice.description || 'ElevenLabs Neural Voice Model';

    // Tags
    DOM.selectedVoiceTags.innerHTML = '';
    const tags = [];
    if (voice.accent) tags.push(voice.accent);
    if (voice.gender) tags.push(voice.gender);
    if (voice.use_case) tags.push(voice.use_case);
    if (tags.length === 0 && voice.labels) {
      Object.values(voice.labels).slice(0, 3).forEach((val) => tags.push(val));
    }

    tags.forEach((tagText) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = tagText;
      DOM.selectedVoiceTags.appendChild(tag);
    });

    // Preview button visibility
    if (voice.preview_url) {
      DOM.btnPlayVoicePreview.style.display = 'inline-flex';
      DOM.btnPlayVoicePreview.onclick = () => toggleVoicePreview(voice);
    } else {
      DOM.btnPlayVoicePreview.style.display = 'none';
    }

    // Update modal cards highlight
    const cards = DOM.voiceGridContainer.querySelectorAll('.voice-card-item');
    cards.forEach((card) => {
      if (card.dataset.voiceId === voiceId) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  function toggleVoicePreview(voice) {
    if (!voice.preview_url) {
      showToast('No audio preview available for this voice.', 'warning');
      return;
    }

    if (state.activePreviewVoiceId === voice.voice_id && !state.previewAudioElement.paused) {
      // Pause
      state.previewAudioElement.pause();
      state.activePreviewVoiceId = null;
      updatePreviewIcons();
      return;
    }

    // Stop existing
    state.previewAudioElement.pause();
    state.previewAudioElement.src = voice.preview_url;
    state.activePreviewVoiceId = voice.voice_id;
    updatePreviewIcons();

    state.previewAudioElement.play().catch((err) => {
      showToast('Could not play audio preview: ' + err.message, 'error');
      state.activePreviewVoiceId = null;
      updatePreviewIcons();
    });

    state.previewAudioElement.onended = () => {
      state.activePreviewVoiceId = null;
      updatePreviewIcons();
    };
  }

  function updatePreviewIcons() {
    const isPlayingCurrent = state.activePreviewVoiceId === state.selectedVoiceId && !state.previewAudioElement.paused;
    DOM.previewPlayIcon.innerHTML = isPlayingCurrent
      ? `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`
      : `<polygon points="5 3 19 12 5 21 5 3"/>`;

    // Also update icons in the modal
    const modalButtons = DOM.voiceGridContainer.querySelectorAll('.btn-preview-modal');
    modalButtons.forEach((btn) => {
      const vid = btn.dataset.voiceId;
      const isVoicePlaying = state.activePreviewVoiceId === vid && !state.previewAudioElement.paused;
      btn.innerHTML = isVoicePlaying
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Stop</span>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Preview</span>`;
    });
  }

  function renderVoiceGrid(voices) {
    DOM.voiceGridContainer.innerHTML = '';

    if (!voices || voices.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.gridColumn = '1 / -1';
      emptyDiv.style.textAlign = 'center';
      emptyDiv.style.padding = '3rem 1rem';
      emptyDiv.style.color = 'var(--text-muted)';
      emptyDiv.innerHTML = state.apiConfigured
        ? '<p>No voices match your search criteria.</p>'
        : '<p>Voice library requires an ElevenLabs API key. Configure <code>ELEVENLABS_API_KEY</code> to load official voices.</p>';
      DOM.voiceGridContainer.appendChild(emptyDiv);
      DOM.modalVoiceCount.textContent = '0 voices';
      return;
    }

    DOM.modalVoiceCount.textContent = `${voices.length} voice${voices.length === 1 ? '' : 's'} available`;

    voices.forEach((voice) => {
      const card = document.createElement('div');
      card.className = `voice-card-item ${voice.voice_id === state.selectedVoiceId ? 'selected' : ''}`;
      card.dataset.voiceId = voice.voice_id;

      const tags = [];
      if (voice.accent) tags.push(voice.accent);
      if (voice.gender) tags.push(voice.gender);
      if (voice.use_case) tags.push(voice.use_case);

      const tagsHtml = tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');

      card.innerHTML = `
        <div class="voice-card-top">
          <h3 class="voice-card-title">${escapeHtml(voice.name)}</h3>
          <span class="badge badge-subtle">${escapeHtml(voice.category)}</span>
        </div>
        <p class="voice-card-desc">${escapeHtml(voice.description || 'ElevenLabs Neural Synthesized Voice')}</p>
        <div class="voice-card-meta">${tagsHtml}</div>
        <div class="voice-card-footer">
          ${
            voice.preview_url
              ? `<button class="btn-ghost btn-xs btn-preview-modal" data-voice-id="${voice.voice_id}" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>Preview</span>
                </button>`
              : `<span style="font-size: 0.72rem; color: var(--text-muted);">No preview</span>`
          }
          <button class="btn-primary btn-xs btn-select-modal" data-voice-id="${voice.voice_id}" type="button">Select</button>
        </div>
      `;

      // Select handler
      const selectBtn = card.querySelector('.btn-select-modal');
      selectBtn.addEventListener('click', () => {
        selectVoice(voice.voice_id);
        closeVoiceModal();
        showToast(`Selected voice: ${voice.name}`, 'info');
      });

      // Preview handler
      const previewBtn = card.querySelector('.btn-preview-modal');
      if (previewBtn) {
        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleVoicePreview(voice);
        });
      }

      DOM.voiceGridContainer.appendChild(card);
    });
  }

  function filterVoices() {
    const query = DOM.voiceSearchInput.value.trim().toLowerCase();
    const category = DOM.voiceCategoryFilter.value.toLowerCase();

    DOM.btnClearSearch.classList.toggle('hidden', query.length === 0);

    const filtered = state.voices.filter((voice) => {
      // Category filter
      if (category !== 'all' && voice.category.toLowerCase() !== category) {
        return false;
      }

      // Query filter
      if (!query) return true;

      const nameMatch = voice.name?.toLowerCase().includes(query);
      const descMatch = voice.description?.toLowerCase().includes(query);
      const accentMatch = voice.accent?.toLowerCase().includes(query);
      const genderMatch = voice.gender?.toLowerCase().includes(query);
      const useCaseMatch = voice.use_case?.toLowerCase().includes(query);

      return nameMatch || descMatch || accentMatch || genderMatch || useCaseMatch;
    });

    renderVoiceGrid(filtered);
  }

  // ==========================================================================
  // Workspace & Input Handlers
  // ==========================================================================
  function updateCharCount() {
    const text = DOM.ttsTextInput.value;
    const len = text.length;
    DOM.charCounter.textContent = `${len.toLocaleString()} / 5,000`;

    if (len >= 5000) {
      DOM.charCounter.className = 'char-counter at-limit';
    } else if (len >= 4500) {
      DOM.charCounter.className = 'char-counter near-limit';
    } else {
      DOM.charCounter.className = 'char-counter';
    }

    // Estimate spoken duration (~150 words per minute => 2.5 words per sec)
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const seconds = Math.round(words / 2.5);
    DOM.readingTimeEst.textContent = `~${seconds}s speech duration (${words} words)`;

    // Clear error message if user starts typing
    if (len > 0) {
      DOM.inputError.classList.add('hidden');
    }
  }

  function loadSampleText(sampleKey) {
    if (SAMPLE_TEXTS[sampleKey]) {
      DOM.ttsTextInput.value = SAMPLE_TEXTS[sampleKey];
      updateCharCount();
      DOM.ttsTextInput.focus();
      showToast(`Loaded "${sampleKey}" sample text`, 'info');
    }
  }

  function clearText() {
    DOM.ttsTextInput.value = '';
    updateCharCount();
    DOM.inputError.classList.add('hidden');
    DOM.ttsTextInput.focus();
  }

  // ==========================================================================
  // Audio Generation (/api/generate)
  // ==========================================================================
  async function generateSpeech() {
    if (state.isGenerating) return;

    const text = DOM.ttsTextInput.value.trim();
    if (!text) {
      DOM.inputError.textContent = 'Please enter text to synthesize before generating.';
      DOM.inputError.classList.remove('hidden');
      DOM.ttsTextInput.focus();
      showToast('Text input is empty.', 'warning');
      return;
    }

    if (!state.selectedVoiceId) {
      showToast('Please select an ElevenLabs voice first.', 'warning');
      return;
    }

    setGeneratingState(true);

    try {
      const payload = {
        text,
        voiceId: state.selectedVoiceId,
        modelId: DOM.selectModel.value,
        stability: parseFloat(DOM.rangeStability.value),
        similarityBoost: parseFloat(DOM.rangeSimilarity.value),
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg, application/json',
        },
        body: JSON.stringify(payload),
      });

      // Handle Error Responses
      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: 'Unexpected server response' };
        }

        if (response.status === 503 || errorData?.configured === false) {
          showConfigBanner(true);
          updateApiStatus('warning', 'Key Required');
          showToast(
            'ELEVENLABS_API_KEY is not configured in Netlify. Please set it to generate audio.',
            'warning',
            6000
          );
        } else {
          const msg = errorData?.message || 'Speech generation failed.';
          showToast(msg, 'error', 5000);
        }
        setGeneratingState(false);
        return;
      }

      // Check Content-Type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio')) {
        const errorData = await response.json();
        showToast(errorData?.message || 'Unexpected response format.', 'error');
        setGeneratingState(false);
        return;
      }

      // Success: Received MP3 audio stream
      const audioBlob = await response.blob();
      loadGeneratedAudio(audioBlob, text, state.selectedVoiceId);
      showToast('Speech generated successfully!', 'success');
    } catch (err) {
      showToast('Network error while requesting speech generation.', 'error', 4000);
    } finally {
      setGeneratingState(false);
    }
  }

  function setGeneratingState(isGenerating) {
    state.isGenerating = isGenerating;
    DOM.btnGenerateSpeech.disabled = isGenerating;

    if (isGenerating) {
      DOM.generateIcon.innerHTML = `<div class="spinner"></div>`;
      DOM.generateBtnText.textContent = 'Synthesizing audio...';
    } else {
      DOM.generateIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>`;
      DOM.generateBtnText.textContent = 'Generate Speech';
    }
  }

  // ==========================================================================
  // Audio Player Controls & Session Management
  // ==========================================================================
  function loadGeneratedAudio(blob, text, voiceId) {
    // 1. Release previous temporary audio URL if any
    if (state.currentAudioUrl) {
      URL.revokeObjectURL(state.currentAudioUrl);
    }

    state.currentAudioBlob = blob;
    state.currentAudioUrl = URL.createObjectURL(blob);
    state.audioElement.src = state.currentAudioUrl;
    state.audioElement.playbackRate = state.playbackSpeed;

    const voice = state.voices.find((v) => v.voice_id === voiceId);
    const voiceName = voice ? voice.name : 'ElevenLabs Voice';

    // Show Active State
    DOM.playerEmptyState.classList.add('hidden');
    DOM.playerActiveState.classList.remove('hidden');

    DOM.currentClipVoice.textContent = voiceName;
    DOM.currentClipTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    DOM.currentClipChars.textContent = `${text.length} chars`;

    // Reset progress
    DOM.progressFill.style.width = '0%';
    DOM.scrubHandle.style.left = '0%';
    DOM.timeCurrent.textContent = '0:00';

    // Auto play
    state.audioElement.play().catch(() => {
      // Browser autoplay policies might require user gesture
      updateMainPlayState(false);
    });

    // Add to session history
    const historyItem = {
      id: 'clip_' + Date.now(),
      blob: blob,
      audioUrl: URL.createObjectURL(blob), // distinct URL for history playback
      text: text,
      voiceName: voiceName,
      voiceId: voiceId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    state.sessionHistory.unshift(historyItem);
    renderSessionHistory();
  }

  function toggleMainPlay() {
    if (!state.currentAudioUrl) return;

    if (state.audioElement.paused) {
      state.audioElement.play().catch((err) => {
        showToast('Playback error: ' + err.message, 'error');
      });
    } else {
      state.audioElement.pause();
    }
  }

  function updateMainPlayState(isPlaying) {
    state.isPlaying = isPlaying;
    if (isPlaying) {
      DOM.mainPlayIcon.classList.add('hidden');
      DOM.mainPauseIcon.classList.remove('hidden');
    } else {
      DOM.mainPlayIcon.classList.remove('hidden');
      DOM.mainPauseIcon.classList.add('hidden');
    }
  }

  function seekRelative(deltaSeconds) {
    if (!state.currentAudioUrl) return;
    state.audioElement.currentTime = Math.max(0, Math.min(state.audioElement.duration || 0, state.audioElement.currentTime + deltaSeconds));
  }

  function handleScrub(e) {
    if (!state.currentAudioUrl || !state.audioElement.duration) return;
    const rect = DOM.progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    state.audioElement.currentTime = ratio * state.audioElement.duration;
  }

  function cyclePlaybackSpeed() {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(state.playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    state.playbackSpeed = speeds[nextIndex];
    state.audioElement.playbackRate = state.playbackSpeed;
    DOM.btnSpeedToggle.textContent = `${state.playbackSpeed.toFixed(1)}x`;
  }

  function downloadCurrentAudio() {
    if (!state.currentAudioBlob) {
      showToast('No audio available to download.', 'warning');
      return;
    }

    const voice = state.voices.find((v) => v.voice_id === state.selectedVoiceId);
    const voiceName = (voice ? voice.name : 'Speech').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `VoiceCraft-${voiceName}-${Date.now()}.mp3`;

    const a = document.createElement('a');
    a.href = state.currentAudioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast(`Downloading ${filename}`, 'info');
  }

  // ==========================================================================
  // Session History Management
  // ==========================================================================
  function renderSessionHistory() {
    DOM.historyContainer.innerHTML = '';

    if (state.sessionHistory.length === 0) {
      DOM.historyContainer.appendChild(DOM.historyEmpty);
      return;
    }

    state.sessionHistory.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.id = item.id;

      el.innerHTML = `
        <div class="history-item-left">
          <div class="history-meta-row">
            <span class="history-voice">${escapeHtml(item.voiceName)}</span>
            <span class="history-time">${escapeHtml(item.timestamp)}</span>
          </div>
          <p class="history-snippet">${escapeHtml(item.text)}</p>
        </div>
        <div class="history-item-actions">
          <button class="btn-ghost btn-icon btn-xs btn-history-play" title="Play clip" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <button class="btn-ghost btn-icon btn-xs btn-history-download" title="Download MP3" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button class="btn-ghost btn-icon btn-xs btn-history-delete" title="Delete" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;

      // Play history clip in main player
      el.querySelector('.btn-history-play').addEventListener('click', () => {
        loadHistoryClip(item);
      });

      // Download history clip
      el.querySelector('.btn-history-download').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = item.audioUrl;
        a.download = `VoiceCraft-${item.voiceName.replace(/\s+/g, '_')}-${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      // Delete history item & release its URL
      el.querySelector('.btn-history-delete').addEventListener('click', () => {
        URL.revokeObjectURL(item.audioUrl);
        state.sessionHistory = state.sessionHistory.filter((h) => h.id !== item.id);
        renderSessionHistory();
      });

      DOM.historyContainer.appendChild(el);
    });
  }

  function loadHistoryClip(item) {
    if (state.currentAudioUrl) {
      URL.revokeObjectURL(state.currentAudioUrl);
    }

    state.currentAudioBlob = item.blob;
    state.currentAudioUrl = URL.createObjectURL(item.blob);
    state.audioElement.src = state.currentAudioUrl;
    state.audioElement.playbackRate = state.playbackSpeed;

    DOM.playerEmptyState.classList.add('hidden');
    DOM.playerActiveState.classList.remove('hidden');

    DOM.currentClipVoice.textContent = item.voiceName;
    DOM.currentClipTime.textContent = item.timestamp;
    DOM.currentClipChars.textContent = `${item.text.length} chars`;

    DOM.progressFill.style.width = '0%';
    DOM.scrubHandle.style.left = '0%';
    DOM.timeCurrent.textContent = '0:00';

    state.audioElement.play().catch(() => {});
    showToast(`Loaded "${item.voiceName}" clip from session history.`, 'info');
  }

  function clearAllHistory() {
    if (state.sessionHistory.length === 0) return;

    // Revoke all object URLs
    state.sessionHistory.forEach((item) => {
      if (item.audioUrl) {
        URL.revokeObjectURL(item.audioUrl);
      }
    });

    state.sessionHistory = [];
    renderSessionHistory();
    showToast('Session history cleared.', 'info');
  }

  // ==========================================================================
  // Modal Management
  // ==========================================================================
  function openVoiceModal() {
    DOM.modalVoiceLibrary.classList.remove('hidden');
    DOM.voiceSearchInput.focus();
  }

  function closeVoiceModal() {
    DOM.modalVoiceLibrary.classList.add('hidden');
  }

  function openGuideModal() {
    DOM.modalSetupGuide.classList.remove('hidden');
    DOM.guideTestResult.classList.add('hidden');
  }

  function closeGuideModal() {
    DOM.modalSetupGuide.classList.add('hidden');
  }

  async function testApiFromGuide() {
    DOM.btnGuideTestConnection.disabled = true;
    DOM.guideTestResult.className = 'guide-test-result';
    DOM.guideTestResult.innerHTML = 'Testing connection to ElevenLabs API...';
    DOM.guideTestResult.classList.remove('hidden');

    const success = await fetchVoices(false);
    DOM.btnGuideTestConnection.disabled = false;

    if (success) {
      DOM.guideTestResult.className = 'guide-test-result success';
      DOM.guideTestResult.innerHTML = `<strong>Success!</strong> ElevenLabs API key is verified and operational (${state.voices.length} voices loaded).`;
    } else {
      DOM.guideTestResult.className = 'guide-test-result error';
      DOM.guideTestResult.innerHTML = `<strong>Configuration Missing:</strong> <code>ELEVENLABS_API_KEY</code> is either not set or invalid. Please check your Netlify site environment variables.`;
    }
  }

  // ==========================================================================
  // Event Listeners Binding
  // ==========================================================================
  function initEventListeners() {
    // Text Input & Samples
    DOM.ttsTextInput.addEventListener('input', updateCharCount);

    DOM.sampleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const sampleKey = btn.dataset.sample;
        loadSampleText(sampleKey);
      });
    });

    DOM.btnClearText.addEventListener('click', clearText);

    // Keyboard shortcut (Ctrl+Enter or Cmd+Enter)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateSpeech();
      }
      if (e.key === 'Escape') {
        closeVoiceModal();
        closeGuideModal();
      }
    });

    // Voice Switcher & Sliders
    DOM.voiceQuickSelect.addEventListener('change', (e) => {
      selectVoice(e.target.value);
    });

    DOM.btnBrowseVoices.addEventListener('click', openVoiceModal);
    DOM.btnCloseVoiceModal.addEventListener('click', closeVoiceModal);
    DOM.modalVoiceLibrary.addEventListener('click', (e) => {
      if (e.target === DOM.modalVoiceLibrary) closeVoiceModal();
    });

    DOM.rangeStability.addEventListener('input', (e) => {
      DOM.valStability.textContent = `${Math.round(e.target.value * 100)}%`;
    });

    DOM.rangeSimilarity.addEventListener('input', (e) => {
      DOM.valSimilarity.textContent = `${Math.round(e.target.value * 100)}%`;
    });

    DOM.btnGenerateSpeech.addEventListener('click', generateSpeech);

    // Audio Element Events
    state.audioElement.addEventListener('play', () => updateMainPlayState(true));
    state.audioElement.addEventListener('pause', () => updateMainPlayState(false));
    state.audioElement.addEventListener('ended', () => {
      updateMainPlayState(false);
      DOM.progressFill.style.width = '0%';
      DOM.scrubHandle.style.left = '0%';
      DOM.timeCurrent.textContent = '0:00';
    });

    state.audioElement.addEventListener('loadedmetadata', () => {
      state.currentAudioDuration = state.audioElement.duration;
      DOM.timeDuration.textContent = formatTime(state.audioElement.duration);
    });

    state.audioElement.addEventListener('timeupdate', () => {
      const cur = state.audioElement.currentTime;
      const dur = state.audioElement.duration || 1;
      const pct = (cur / dur) * 100;
      DOM.progressFill.style.width = `${pct}%`;
      DOM.scrubHandle.style.left = `${pct}%`;
      DOM.timeCurrent.textContent = formatTime(cur);
    });

    // Player Controls
    DOM.btnMainPlay.addEventListener('click', toggleMainPlay);
    DOM.btnReplay5.addEventListener('click', () => seekRelative(-5));
    DOM.btnSkip5.addEventListener('click', () => seekRelative(5));
    DOM.btnSpeedToggle.addEventListener('click', cyclePlaybackSpeed);
    DOM.progressContainer.addEventListener('click', handleScrub);

    // Volume & Mute
    DOM.volumeSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      state.audioElement.volume = vol;
      state.audioElement.muted = vol === 0;
      DOM.volIcon.innerHTML = vol === 0
        ? `<line x1="1" y1="1" x2="23" y2="23"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>`
        : `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
    });

    DOM.btnMuteToggle.addEventListener('click', () => {
      state.audioElement.muted = !state.audioElement.muted;
      DOM.volumeSlider.value = state.audioElement.muted ? 0 : state.audioElement.volume || 1;
    });

    DOM.btnDownloadMp3.addEventListener('click', downloadCurrentAudio);

    // History
    DOM.btnClearHistory.addEventListener('click', clearAllHistory);

    // Search and Filters
    DOM.voiceSearchInput.addEventListener('input', filterVoices);
    DOM.btnClearSearch.addEventListener('click', () => {
      DOM.voiceSearchInput.value = '';
      filterVoices();
      DOM.voiceSearchInput.focus();
    });
    DOM.voiceCategoryFilter.addEventListener('change', filterVoices);
    DOM.btnRefreshVoices.addEventListener('click', () => fetchVoices(true));

    // Guide Modal
    DOM.btnOpenGuide.addEventListener('click', openGuideModal);
    DOM.btnBannerGuide.addEventListener('click', openGuideModal);
    DOM.btnBannerRetry.addEventListener('click', () => fetchVoices(true));
    DOM.apiStatusBadge.addEventListener('click', openGuideModal);
    DOM.btnCloseGuideModal.addEventListener('click', closeGuideModal);
    DOM.modalSetupGuide.addEventListener('click', (e) => {
      if (e.target === DOM.modalSetupGuide) closeGuideModal();
    });
    DOM.btnGuideTestConnection.addEventListener('click', testApiFromGuide);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    initEventListeners();
    updateCharCount();
    // Fetch live voices from serverless endpoint
    fetchVoices(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
