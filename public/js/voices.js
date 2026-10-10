/**
 * VoiceCraft Voice Selector Manager
 * Handles dynamic ElevenLabs voice fetching, searchable dropdown, category filters, and sample previews.
 */

class VoiceSelector {
  constructor({ onSelect }) {
    this.onSelect = onSelect;
    this.voices = [];
    this.filteredVoices = [];
    this.selectedVoice = null;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.previewAudio = document.getElementById('samplePreviewAudio');
    this.currentlyPlayingId = null;

    // DOM Elements
    this.trigger = document.getElementById('voiceDropdownTrigger');
    this.dropdown = document.getElementById('voiceDropdownMenu');
    this.searchInput = document.getElementById('voiceSearchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.voicesListEl = document.getElementById('voicesList');
    this.categoryFilters = document.getElementById('categoryFilters');
    this.refreshBtn = document.getElementById('refreshVoicesBtn');

    // Trigger info elements
    this.triggerAvatar = document.getElementById('triggerVoiceAvatar');
    this.triggerInitials = document.getElementById('triggerVoiceInitials');
    this.triggerName = document.getElementById('triggerVoiceName');
    this.triggerMeta = document.getElementById('triggerVoiceMeta');
    this.triggerCategory = document.getElementById('triggerVoiceCategory');

    this.initEvents();
  }

  initEvents() {
    // Toggle dropdown
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!this.dropdown.contains(e.target) && !this.trigger.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Search input
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.clearSearchBtn.classList.toggle('hidden', !this.searchQuery);
      this.applyFilters();
    });

    // Clear search
    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.clearSearchBtn.classList.add('hidden');
      this.applyFilters();
      this.searchInput.focus();
    });

    // Category filter chips
    this.categoryFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      this.categoryFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      this.currentFilter = chip.dataset.filter;
      this.applyFilters();
    });

    // Refresh voices button
    this.refreshBtn?.addEventListener('click', async () => {
      this.refreshBtn.classList.add('spinning');
      await this.loadVoices();
      this.refreshBtn.classList.remove('spinning');
    });

    // Handle preview audio playback completion
    this.previewAudio.addEventListener('ended', () => {
      this.stopPreview();
    });

    this.previewAudio.addEventListener('pause', () => {
      this.stopPreview();
    });

    // Escape key closes dropdown
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.dropdown.classList.contains('hidden')) {
        this.closeDropdown();
      }
    });
  }

  toggleDropdown() {
    const isExpanded = this.trigger.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    this.dropdown.classList.remove('hidden');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.searchInput.focus();
  }

  closeDropdown() {
    this.dropdown.classList.add('hidden');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.stopPreview();
  }

  async loadVoices() {
    this.voicesListEl.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-tertiary); font-size: 0.8rem;">Loading ElevenLabs voices...</div>';
    
    try {
      this.voices = await API.getVoices();
      
      if (!this.voices || this.voices.length === 0) {
        this.voicesListEl.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-tertiary); font-size: 0.8rem;">No voices found. Please check connection.</div>';
        return;
      }

      // Default selection (prefer Rachel or Adam or first voice)
      const defaultVoice = this.voices.find(v => v.name.toLowerCase().includes('rachel')) 
        || this.voices.find(v => v.name.toLowerCase().includes('adam')) 
        || this.voices[0];

      if (!this.selectedVoice && defaultVoice) {
        this.selectVoice(defaultVoice, false);
      }

      this.applyFilters();
    } catch (err) {
      console.error('Failed to load voices:', err);
      this.voicesListEl.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--color-danger); font-size: 0.8rem;">Failed to load voices.</div>';
    }
  }

  applyFilters() {
    this.filteredVoices = this.voices.filter(voice => {
      // Search query check
      const name = (voice.name || '').toLowerCase();
      const desc = (voice.description || '').toLowerCase();
      const labels = voice.labels ? Object.values(voice.labels).join(' ').toLowerCase() : '';
      const textToSearch = `${name} ${desc} ${labels}`;

      const matchesSearch = !this.searchQuery || textToSearch.includes(this.searchQuery);

      // Category / Gender / Style filter
      let matchesFilter = true;
      if (this.currentFilter !== 'all') {
        const filter = this.currentFilter.toLowerCase();
        const gender = voice.labels?.gender?.toLowerCase() || '';
        const useCase = voice.labels?.use_case?.toLowerCase() || '';
        const descText = (voice.description || '').toLowerCase();

        if (filter === 'female' || filter === 'male') {
          matchesFilter = gender === filter || descText.includes(filter);
        } else if (filter === 'narration') {
          matchesFilter = useCase.includes('narration') || descText.includes('narration') || descText.includes('audiobook');
        } else if (filter === 'conversational') {
          matchesFilter = useCase.includes('conversational') || descText.includes('casual') || descText.includes('conversation');
        }
      }

      return matchesSearch && matchesFilter;
    });

    this.renderVoicesList();
  }

  renderVoicesList() {
    if (this.filteredVoices.length === 0) {
      this.voicesListEl.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-tertiary); font-size: 0.8rem;">No matching voices found.</div>';
      return;
    }

    this.voicesListEl.innerHTML = '';

    this.filteredVoices.forEach(voice => {
      const isSelected = this.selectedVoice && this.selectedVoice.id === voice.id;
      const isPlaying = this.currentlyPlayingId === voice.id;

      // Extract metadata badges
      const accent = voice.labels?.accent ? voice.labels.accent.charAt(0).toUpperCase() + voice.labels.accent.slice(1) : '';
      const gender = voice.labels?.gender ? voice.labels.gender.charAt(0).toUpperCase() + voice.labels.gender.slice(1) : '';
      const useCase = voice.labels?.use_case ? voice.labels.use_case.charAt(0).toUpperCase() + voice.labels.use_case.slice(1) : '';
      
      const metaParts = [accent, gender, useCase].filter(Boolean);
      const metaString = metaParts.length > 0 ? metaParts.join(' • ') : (voice.description || 'ElevenLabs Voice');

      const initial = (voice.name || 'V').charAt(0).toUpperCase();

      const item = document.createElement('div');
      item.className = `voice-item ${isSelected ? 'selected' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      item.dataset.voiceId = voice.id;

      item.innerHTML = `
        <div class="voice-item-left">
          <div class="voice-item-avatar">${initial}</div>
          <div class="voice-item-text">
            <div class="voice-item-name-row">
              <span class="voice-item-name">${this.escapeHtml(voice.name)}</span>
            </div>
            <span class="voice-item-desc">${this.escapeHtml(metaString)}</span>
          </div>
        </div>
        <div class="voice-item-right">
          ${voice.preview_url ? `
            <button
              class="btn-sample-play ${isPlaying ? 'playing' : ''}"
              type="button"
              title="${isPlaying ? 'Pause preview' : 'Play voice sample'}"
              data-preview-url="${voice.preview_url}"
              data-voice-id="${voice.id}"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                ${isPlaying 
                  ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>' 
                  : '<polygon points="5 3 19 12 5 21 5 3"/>'}
              </svg>
            </button>
          ` : ''}
          <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      `;

      // Select item on click
      item.addEventListener('click', (e) => {
        // If clicked preview button, handle audio preview instead of selecting
        if (e.target.closest('.btn-sample-play')) {
          const btn = e.target.closest('.btn-sample-play');
          const previewUrl = btn.dataset.previewUrl;
          const voiceId = btn.dataset.voiceId;
          this.togglePreview(voiceId, previewUrl);
          return;
        }

        this.selectVoice(voice);
        this.closeDropdown();
      });

      this.voicesListEl.appendChild(item);
    });
  }

  selectVoice(voice, triggerCallback = true) {
    this.selectedVoice = voice;

    // Update Trigger UI
    const initial = (voice.name || 'V').charAt(0).toUpperCase();
    this.triggerInitials.textContent = initial;
    this.triggerName.textContent = voice.name;

    const accent = voice.labels?.accent ? voice.labels.accent.charAt(0).toUpperCase() + voice.labels.accent.slice(1) : '';
    const gender = voice.labels?.gender ? voice.labels.gender.charAt(0).toUpperCase() + voice.labels.gender.slice(1) : '';
    const useCase = voice.labels?.use_case ? voice.labels.use_case.charAt(0).toUpperCase() + voice.labels.use_case.slice(1) : '';
    const metaParts = [accent, gender, useCase].filter(Boolean);
    this.triggerMeta.textContent = metaParts.length > 0 ? metaParts.join(' • ') : (voice.description || 'ElevenLabs Voice');
    
    this.triggerCategory.textContent = voice.category || 'Premade';

    // Highlight selected item in list
    this.voicesListEl.querySelectorAll('.voice-item').forEach(el => {
      const isThis = el.dataset.voiceId === voice.id;
      el.classList.toggle('selected', isThis);
      el.setAttribute('aria-selected', isThis ? 'true' : 'false');
    });

    if (triggerCallback && typeof this.onSelect === 'function') {
      this.onSelect(voice);
    }
  }

  togglePreview(voiceId, previewUrl) {
    if (!previewUrl) return;

    if (this.currentlyPlayingId === voiceId && !this.previewAudio.paused) {
      this.stopPreview();
    } else {
      this.stopPreview();
      this.currentlyPlayingId = voiceId;
      this.previewAudio.src = previewUrl;
      this.previewAudio.play().catch(e => console.warn('Preview play blocked:', e));
      this.renderVoicesList();
    }
  }

  stopPreview() {
    this.currentlyPlayingId = null;
    this.previewAudio.pause();
    this.previewAudio.currentTime = 0;
    this.renderVoicesList();
  }

  getSelectedVoice() {
    return this.selectedVoice;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.VoiceSelector = VoiceSelector;
