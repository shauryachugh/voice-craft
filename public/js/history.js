/**
 * VoiceCraft Recent Generations History Manager
 * Stores generated speech sessions in localStorage + IndexedDB for persistent audio retrieval.
 */

class HistoryManager {
  constructor({ onPlayItem, onLoadItem }) {
    this.onPlayItem = onPlayItem;
    this.onLoadItem = onLoadItem;
    this.storageKey = 'voicecraft_history_v1';
    this.items = [];
    this.db = null;
    this.currentlyPlayingId = null;
    this.historyAudio = new Audio();

    this.container = document.getElementById('historyList');
    this.emptyState = document.getElementById('historyEmptyState');
    this.countBadge = document.getElementById('historyCountBadge');
    this.clearBtn = document.getElementById('clearHistoryBtn');

    this.initAudioEvents();
    this.initIndexedDB().then(() => {
      this.loadHistory();
    });

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your generation history?')) {
          this.clearAll();
        }
      });
    }
  }

  // Setup IndexedDB for storing audio blobs
  initIndexedDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve();
        return;
      }

      const request = indexedDB.open('VoiceCraftDB', 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('audio_cache')) {
          db.createObjectStore('audio_cache', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };

      request.onerror = () => {
        console.warn('IndexedDB not available, falling back to memory/session storage');
        resolve();
      };
    });
  }

  initAudioEvents() {
    this.historyAudio.addEventListener('ended', () => {
      this.setPlayState(null);
    });

    this.historyAudio.addEventListener('pause', () => {
      if (this.currentlyPlayingId) {
        this.setPlayState(null);
      }
    });
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      this.items = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.items = [];
    }
    this.render();
  }

  saveMetadata() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {
      console.warn('Could not save history to localStorage:', e);
    }
  }

  async storeAudioBlob(id, blob) {
    if (!this.db || !blob) return;
    try {
      const tx = this.db.transaction('audio_cache', 'readwrite');
      const store = tx.objectStore('audio_cache');
      store.put({ id, blob });
    } catch (e) {
      console.warn('Error saving audio to IndexedDB:', e);
    }
  }

  async getAudioBlob(id) {
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('audio_cache', 'readonly');
        const store = tx.objectStore('audio_cache');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ? req.result.blob : null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async addItem({ text, voice, modelName, blob, url }) {
    const id = 'gen_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const item = {
      id,
      text: text.trim(),
      voiceName: voice?.name || 'ElevenLabs Voice',
      voiceId: voice?.id || '',
      modelName: modelName || 'Eleven Multilingual v2',
      createdAt: new Date().toISOString(),
      url: url || null
    };

    // Store in IndexedDB
    if (blob) {
      await this.storeAudioBlob(id, blob);
    }

    // Keep max 20 items
    this.items.unshift(item);
    if (this.items.length > 20) {
      this.items = this.items.slice(0, 20);
    }

    this.saveMetadata();
    this.render();
  }

  deleteItem(id) {
    if (this.currentlyPlayingId === id) {
      this.historyAudio.pause();
      this.currentlyPlayingId = null;
    }
    this.items = this.items.filter(item => item.id !== id);
    this.saveMetadata();

    if (this.db) {
      try {
        const tx = this.db.transaction('audio_cache', 'readwrite');
        tx.objectStore('audio_cache').delete(id);
      } catch (e) {}
    }

    this.render();
  }

  clearAll() {
    this.historyAudio.pause();
    this.currentlyPlayingId = null;
    this.items = [];
    this.saveMetadata();

    if (this.db) {
      try {
        const tx = this.db.transaction('audio_cache', 'readwrite');
        tx.objectStore('audio_cache').clear();
      } catch (e) {}
    }

    this.render();
  }

  async togglePlayItem(item, buttonEl) {
    if (this.currentlyPlayingId === item.id && !this.historyAudio.paused) {
      this.historyAudio.pause();
      this.setPlayState(null);
      return;
    }

    // Resolve audio source
    let audioUrl = item.url;
    if (!audioUrl) {
      const blob = await this.getAudioBlob(item.id);
      if (blob) {
        audioUrl = URL.createObjectURL(blob);
        item.url = audioUrl; // Cache in session
      }
    }

    if (!audioUrl) {
      alert('Audio file is no longer available in cache.');
      return;
    }

    // Stop previous
    this.historyAudio.pause();
    this.setPlayState(item.id);

    this.historyAudio.src = audioUrl;
    this.historyAudio.play().catch(err => {
      console.warn('Playback error:', err);
      this.setPlayState(null);
    });
  }

  setPlayState(activeId) {
    this.currentlyPlayingId = activeId;
    const allButtons = this.container.querySelectorAll('.history-play-btn');
    allButtons.forEach(btn => {
      const isThis = btn.dataset.id === activeId;
      const playIcon = btn.querySelector('.play-svg');
      const pauseIcon = btn.querySelector('.pause-svg');
      if (playIcon && pauseIcon) {
        playIcon.classList.toggle('hidden', isThis);
        pauseIcon.classList.toggle('hidden', !isThis);
      }
    });
  }

  async downloadItem(item) {
    let audioUrl = item.url;
    if (!audioUrl) {
      const blob = await this.getAudioBlob(item.id);
      if (blob) {
        audioUrl = URL.createObjectURL(blob);
      }
    }

    if (!audioUrl) {
      alert('Audio file is unavailable for download.');
      return;
    }

    const safeName = item.voiceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voicecraft_${safeName}_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  render() {
    const hasItems = this.items.length > 0;
    this.emptyState.classList.toggle('hidden', hasItems);
    this.clearBtn?.classList.toggle('hidden', !hasItems);
    this.countBadge.textContent = `${this.items.length} ${this.items.length === 1 ? 'item' : 'items'}`;

    // Remove existing rendered items
    const existingCards = this.container.querySelectorAll('.history-item');
    existingCards.forEach(card => card.remove());

    if (!hasItems) return;

    this.items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.dataset.id = item.id;

      const timeAgo = this.formatRelativeTime(item.createdAt);
      const isPlaying = this.currentlyPlayingId === item.id;

      el.innerHTML = `
        <div class="history-item-left">
          <button class="history-play-btn" type="button" data-id="${item.id}" aria-label="Play generation">
            <svg class="play-svg ${isPlaying ? 'hidden' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <svg class="pause-svg ${isPlaying ? '' : 'hidden'}" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>
          <div class="history-details">
            <div class="history-text" title="${this.escapeHtml(item.text)}">${this.escapeHtml(item.text)}</div>
            <div class="history-meta">
              <span class="history-voice-pill">${this.escapeHtml(item.voiceName)}</span>
              <span>&bull;</span>
              <span>${timeAgo}</span>
            </div>
          </div>
        </div>
        <div class="history-item-right">
          <button class="btn-icon-ghost btn-load" type="button" title="Reuse text in generator">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
          </button>
          <button class="btn-icon-ghost btn-dl" type="button" title="Download MP3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
          <button class="btn-icon-ghost delete btn-del" type="button" title="Delete from history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      // Play button click
      const playBtn = el.querySelector('.history-play-btn');
      playBtn.addEventListener('click', () => {
        this.togglePlayItem(item, playBtn);
      });

      // Load item into editor
      el.querySelector('.btn-load').addEventListener('click', () => {
        if (typeof this.onLoadItem === 'function') {
          this.onLoadItem(item);
        }
      });

      // Download MP3
      el.querySelector('.btn-dl').addEventListener('click', () => {
        this.downloadItem(item);
      });

      // Delete item
      el.querySelector('.btn-del').addEventListener('click', () => {
        this.deleteItem(item.id);
      });

      this.container.appendChild(el);
    });
  }

  formatRelativeTime(isoString) {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now - date) / 1000);

      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return 'Recently';
    }
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

window.HistoryManager = HistoryManager;
