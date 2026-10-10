/**
 * VoiceCraft Main Application Controller
 * Handles user interactions, settings synchronization, generation lifecycle, and audio generation.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const textInput = document.getElementById('textInput');
  const charCountEl = document.getElementById('charCount');
  const clearTextBtn = document.getElementById('clearTextBtn');
  const generateBtn = document.getElementById('generateBtn');
  const generateBtnText = document.getElementById('generateBtnText');
  const genStatusRow = document.getElementById('genStatusRow');
  const genStatusText = document.getElementById('genStatusText');
  const errorBanner = document.getElementById('errorBanner');
  const errorBannerMessage = document.getElementById('errorBannerMessage');
  const closeErrorBannerBtn = document.getElementById('closeErrorBannerBtn');


  // Voice Settings Elements
  const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsSummaryBadge = document.getElementById('settingsSummaryBadge');
  const modelSelect = document.getElementById('modelSelect');
  const stabilitySlider = document.getElementById('stabilitySlider');
  const stabilityVal = document.getElementById('stabilityVal');
  const similaritySlider = document.getElementById('similaritySlider');
  const similarityVal = document.getElementById('similarityVal');
  const styleSlider = document.getElementById('styleSlider');
  const styleVal = document.getElementById('styleVal');
  const speakerBoostToggle = document.getElementById('speakerBoostToggle');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');

  // State
  let isGenerating = false;
  let apiConfig = { configured: false, connected: false };

  // Sample prompt templates
  const SAMPLES = {
    narrator: "The first move is what sets everything in motion. The wind carried secrets through the quiet valley, whispering of forgotten kings and ancient promises waiting to be renewed.",
    product: "Introducing VoiceCraft. High-fidelity synthetic speech, crafted with rich emotional nuance, instant responsiveness, and studio-grade audio clarity.",
    meditation: "Take a slow, deep breath in through your nose. Pause for a peaceful moment, and gently exhale. Let tension dissolve as you settle into the present.",
    conversational: "Hello and welcome! We're delighted to have you with us today. Let me know how I can help bring your creative ideas to life."
  };

  // Default voice settings values
  const DEFAULTS = {
    model: 'eleven_multilingual_v2',
    stability: 0.50,
    similarityBoost: 0.75,
    style: 0.00,
    speakerBoost: true
  };

  // Toast notification helper
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-dot"></span>
      <span class="toast-message">${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  // Show error banner
  function showErrorBanner(message) {
    errorBannerMessage.innerHTML = escapeHtml(message);
    errorBanner.classList.remove('hidden');
  }

  function hideErrorBanner() {
    errorBanner.classList.add('hidden');
    errorBannerMessage.innerHTML = '';
  }

  closeErrorBannerBtn.addEventListener('click', hideErrorBanner);

  // Initialize Player
  const player = new AudioPlayer({
    onRegenerate: () => {
      handleGenerate();
    }
  });

  // Initialize History Manager
  const history = new HistoryManager({
    onPlayItem: (item) => {
      // Handled inside HistoryManager
    },
    onLoadItem: (item) => {
      textInput.value = item.text;
      updateCharCounter();
      if (item.voiceId) {
        const found = voiceSelector.voices.find(v => v.id === item.voiceId);
        if (found) {
          voiceSelector.selectVoice(found);
        }
      }
      showToast('Text and voice loaded into generator', 'info');
      textInput.focus();
    }
  });

  // Initialize Voice Selector
  const voiceSelector = new VoiceSelector({
    onSelect: (voice) => {
      // Voice selected
    }
  });

  // Load voices catalog
  await voiceSelector.loadVoices();

  // Character counter and clear text handling
  function updateCharCounter() {
    const len = textInput.value.length;
    const max = 2500;
    charCountEl.textContent = `${len.toLocaleString()} / ${max.toLocaleString()}`;

    charCountEl.classList.toggle('limit-near', len > max * 0.85 && len < max);
    charCountEl.classList.toggle('limit-reached', len >= max);
    clearTextBtn.disabled = len === 0;
  }

  textInput.addEventListener('input', () => {
    updateCharCounter();
    hideErrorBanner();
  });

  clearTextBtn.addEventListener('click', () => {
    textInput.value = '';
    updateCharCounter();
    textInput.focus();
  });

  // Sample prompt chips
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.sample;
      if (SAMPLES[type]) {
        textInput.value = SAMPLES[type];
        updateCharCounter();
        textInput.focus();
        hideErrorBanner();
      }
    });
  });

  // Voice Settings Accordion
  toggleSettingsBtn.addEventListener('click', () => {
    const isExpanded = toggleSettingsBtn.getAttribute('aria-expanded') === 'true';
    toggleSettingsBtn.setAttribute('aria-expanded', (!isExpanded).toString());
    settingsPanel.classList.toggle('collapsed', isExpanded);
  });

  // Sliders value display & synchronization
  function updateSettingsBadge() {
    const stab = parseFloat(stabilitySlider.value).toFixed(2);
    const sim = parseFloat(similaritySlider.value).toFixed(2);
    settingsSummaryBadge.textContent = `${stab} / ${sim}`;
  }

  stabilitySlider.addEventListener('input', (e) => {
    stabilityVal.textContent = parseFloat(e.target.value).toFixed(2);
    updateSettingsBadge();
  });

  similaritySlider.addEventListener('input', (e) => {
    similarityVal.textContent = parseFloat(e.target.value).toFixed(2);
    updateSettingsBadge();
  });

  styleSlider.addEventListener('input', (e) => {
    styleVal.textContent = parseFloat(e.target.value).toFixed(2);
  });

  resetSettingsBtn.addEventListener('click', () => {
    modelSelect.value = DEFAULTS.model;
    stabilitySlider.value = DEFAULTS.stability;
    stabilityVal.textContent = DEFAULTS.stability.toFixed(2);
    similaritySlider.value = DEFAULTS.similarityBoost;
    similarityVal.textContent = DEFAULTS.similarityBoost.toFixed(2);
    styleSlider.value = DEFAULTS.style;
    styleVal.textContent = DEFAULTS.style.toFixed(2);
    speakerBoostToggle.checked = DEFAULTS.speakerBoost;
    updateSettingsBadge();
    showToast('Voice settings reset to defaults', 'info');
  });

  // Generation Workflow
  async function handleGenerate() {
    if (isGenerating) return;

    hideErrorBanner();
    const text = textInput.value.trim();

    // Validation 1: Text empty
    if (!text) {
      showErrorBanner('Please enter some text in the input box before generating speech.');
      textInput.focus();
      return;
    }

    // Validation 2: Voice selected
    const selectedVoice = voiceSelector.getSelectedVoice();
    if (!selectedVoice) {
      showErrorBanner('Please select a voice from the dropdown.');
      return;
    }

    // Selected Settings
    const modelId = modelSelect.value;
    const modelName = modelSelect.options[modelSelect.selectedIndex]?.text.split('(')[0].trim() || 'Eleven Multilingual v2';
    const voiceSettings = {
      stability: parseFloat(stabilitySlider.value),
      similarityBoost: parseFloat(similaritySlider.value),
      style: parseFloat(styleSlider.value),
      speakerBoost: speakerBoostToggle.checked
    };

    // UI Loading State
    setGeneratingState(true);

    try {
      genStatusText.textContent = `Synthesizing audio with ${selectedVoice.name}...`;
      const result = await API.generateSpeech({
        text,
        voiceId: selectedVoice.id,
        modelId,
        voiceSettings
      });
      showToast('Voice generated successfully!', 'success');

      // Load into Audio Player
      player.loadAudio({
        blob: result.blob,
        url: result.url,
        voice: selectedVoice,
        modelName,
        text,
        autoplay: false
      });

      // Add to History
      await history.addItem({
        text,
        voice: selectedVoice,
        modelName,
        blob: result.blob,
        url: result.url
      });

    } catch (err) {
      console.error('Generation failure:', err);
      let errorMsg = err.message || 'An unexpected error occurred during generation.';
      const isAuthError = err.status === 401 || err.code === 'NO_API_KEY';
      const isQuotaError = err.status === 429;

      if (isAuthError) {
        showErrorBanner('ElevenLabs API Key error: Please set ELEVENLABS_API_KEY in your server environment or .env file.');
      } else if (isQuotaError) {
        showErrorBanner('ElevenLabs Quota Exceeded: Your account character limit has been reached.');
      } else {
        showErrorBanner(`Generation Error: ${errorMsg}`);
      }
    } finally {
      setGeneratingState(false);
    }
  }

  function setGeneratingState(generating) {
    isGenerating = generating;
    generateBtn.disabled = generating;

    if (generating) {
      generateBtnText.textContent = 'Generating...';
      genStatusRow.classList.remove('hidden');
      genStatusText.textContent = 'Synthesizing audio with ElevenLabs...';
    } else {
      generateBtnText.textContent = 'Generate Voice';
      genStatusRow.classList.add('hidden');
    }
  }

  // Generate Button Click
  generateBtn.addEventListener('click', handleGenerate);

  // Keyboard shortcut: Ctrl + Enter / Cmd + Enter
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
