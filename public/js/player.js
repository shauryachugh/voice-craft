/**
 * VoiceCraft Audio Player Module
 * High-precision custom audio player with waveform scrubber, volume, speed, and download.
 */

class AudioPlayer {
  constructor({ onRegenerate }) {
    this.onRegenerate = onRegenerate;
    this.audio = document.getElementById('audioElement');
    this.section = document.getElementById('audioPlayerSection');
    
    // UI Elements
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.waveformTrack = document.getElementById('waveformTrack');
    this.waveformBarsEl = document.getElementById('waveformBars');
    this.waveformProgress = document.getElementById('waveformProgress');
    this.waveformHandle = document.getElementById('waveformHandle');
    this.currentTimeDisplay = document.getElementById('currentTimeDisplay');
    this.durationDisplay = document.getElementById('durationDisplay');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.muteBtn = document.getElementById('muteBtn');
    this.volHighIcon = document.getElementById('volHighIcon');
    this.volMutedIcon = document.getElementById('volMutedIcon');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.regenerateBtn = document.getElementById('regenerateBtn');

    // Meta elements
    this.playerVoiceAvatar = document.getElementById('playerVoiceAvatar');
    this.playerVoiceTitle = document.getElementById('playerVoiceTitle');
    this.playerMetaText = document.getElementById('playerMetaText');

    this.currentBlob = null;
    this.currentFileName = 'voicecraft-speech.mp3';
    this.isDragging = false;
    this.lastVolume = 1.0;

    this.initWaveformBars();
    this.initEvents();
  }

  // Generate subtle visual waveform bars
  initWaveformBars() {
    this.waveformBarsEl.innerHTML = '';
    const barCount = 48;
    // Curated smooth speech waveform heights
    const pattern = [20, 35, 60, 45, 75, 90, 65, 40, 80, 100, 85, 55, 30, 45, 70, 95, 80, 50, 65, 85, 70, 40, 30, 50, 75, 90, 85, 60, 40, 65, 85, 100, 75, 45, 35, 60, 80, 70, 50, 40, 30, 25, 45, 60, 40, 30, 20, 15];

    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'waveform-bar';
      const heightPercent = pattern[i % pattern.length];
      bar.style.height = `${heightPercent}%`;
      this.waveformBarsEl.appendChild(bar);
    }
  }

  initEvents() {
    // Play/Pause button
    this.playPauseBtn.addEventListener('click', () => {
      this.togglePlay();
    });

    // Native audio events
    this.audio.addEventListener('timeupdate', () => {
      if (!this.isDragging) {
        this.updateProgress();
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.durationDisplay.textContent = this.formatTime(this.audio.duration);
    });

    this.audio.addEventListener('ended', () => {
      this.setPlayingState(false);
      this.updateProgress(100);
    });

    this.audio.addEventListener('play', () => {
      this.setPlayingState(true);
    });

    this.audio.addEventListener('pause', () => {
      this.setPlayingState(false);
    });

    // Waveform Scrubbing / Seeking
    const handleSeek = (e) => {
      const rect = this.waveformTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      if (this.audio.duration) {
        this.audio.currentTime = percentage * this.audio.duration;
        this.updateProgress(percentage * 100);
      }
    };

    this.waveformTrack.addEventListener('click', handleSeek);

    this.waveformTrack.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      handleSeek(e);

      const onMouseMove = (moveEvent) => {
        if (this.isDragging) handleSeek(moveEvent);
      };

      const onMouseUp = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Speed Controls
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.dataset.speed);
        this.audio.playbackRate = speed;
      });
    });

    // Volume Slider
    this.volumeSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      this.setVolume(vol);
    });

    // Mute Button
    this.muteBtn.addEventListener('click', () => {
      if (this.audio.volume > 0) {
        this.lastVolume = this.audio.volume;
        this.setVolume(0);
        this.volumeSlider.value = 0;
      } else {
        this.setVolume(this.lastVolume || 1.0);
        this.volumeSlider.value = this.lastVolume || 1.0;
      }
    });

    // Download Button
    this.downloadBtn.addEventListener('click', () => {
      this.downloadAudio();
    });

    // Regenerate Button
    this.regenerateBtn.addEventListener('click', () => {
      if (typeof this.onRegenerate === 'function') {
        this.onRegenerate();
      }
    });
  }

  // Load new audio source into player
  loadAudio({ blob, url, voice, modelName, text, autoplay = false }) {
    this.currentBlob = blob;
    this.currentVoice = voice;
    this.currentText = text;

    const safeVoiceName = (voice?.name || 'speech').toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.currentFileName = `voicecraft_${safeVoiceName}_${Date.now()}.mp3`;

    // Metadata UI
    const initial = (voice?.name || 'V').charAt(0).toUpperCase();
    this.playerVoiceAvatar.textContent = initial;
    this.playerVoiceTitle.textContent = voice?.name || 'Custom Voice';
    this.playerMetaText.textContent = `Generated audio • ${modelName || 'Eleven Multilingual v2'}`;

    this.audio.src = url;
    this.audio.currentTime = 0;
    this.updateProgress(0);
    this.currentTimeDisplay.textContent = '0:00';
    this.durationDisplay.textContent = '0:00';

    // Show player section smoothly
    this.section.classList.remove('hidden');

    // Scroll smoothly into view if on mobile/smaller screens
    if (window.innerWidth <= 768) {
      this.section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (autoplay) {
      this.audio.play().catch(e => console.warn('Autoplay prevented:', e));
    }
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play().catch(e => console.warn('Playback error:', e));
    } else {
      this.audio.pause();
    }
  }

  setPlayingState(isPlaying) {
    this.playIcon.classList.toggle('hidden', isPlaying);
    this.pauseIcon.classList.toggle('hidden', !isPlaying);
    this.playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause audio' : 'Play audio');
  }

  updateProgress(explicitPercentage = null) {
    let percentage = 0;
    if (explicitPercentage !== null) {
      percentage = explicitPercentage;
    } else if (this.audio.duration) {
      percentage = (this.audio.currentTime / this.audio.duration) * 100;
    }

    this.waveformProgress.style.width = `${percentage}%`;
    this.waveformHandle.style.left = `${percentage}%`;
    this.waveformTrack.setAttribute('aria-valuenow', Math.round(percentage));

    this.currentTimeDisplay.textContent = this.formatTime(this.audio.currentTime);

    // Update active waveform bars
    const bars = this.waveformBarsEl.querySelectorAll('.waveform-bar');
    const passedBarsCount = Math.floor((percentage / 100) * bars.length);
    bars.forEach((bar, index) => {
      bar.classList.toggle('passed', index <= passedBarsCount);
    });
  }

  setVolume(vol) {
    this.audio.volume = vol;
    const isMuted = vol === 0;
    this.volHighIcon.classList.toggle('hidden', isMuted);
    this.volMutedIcon.classList.toggle('hidden', !isMuted);
  }

  downloadAudio() {
    if (!this.audio.src) return;

    const a = document.createElement('a');
    a.href = this.audio.src;
    a.download = this.currentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

window.AudioPlayer = AudioPlayer;
