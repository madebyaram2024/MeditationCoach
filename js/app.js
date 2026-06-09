/* ==========================================================================
   MEDITATION COACH - MAIN APPLICATION COORDINATOR
   ========================================================================= */

class MeditationApp {
  constructor() {
    // Views
    this.welcomeView = document.getElementById('welcome-view');
    this.meditationView = document.getElementById('meditation-view');

    // Modals
    this.donationModal = document.getElementById('donation-modal');
    this.completionModal = document.getElementById('completion-modal');
    this.thankYouModal = document.getElementById('thankyou-modal');

    // UI Sliders
    this.volDroneSlider = document.getElementById('volume-drone');
    this.volRainSlider = document.getElementById('volume-rain');
    this.volBowlSlider = document.getElementById('volume-bowl');
    this.volBinauralSlider = document.getElementById('volume-binaural');

    // Interactive Buttons
    this.exitSessionBtn = document.getElementById('exit-session-btn');
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.audioToggleBtn = document.getElementById('audio-settings-toggle');
    this.mixerPanel = document.getElementById('mixer-panel');
    this.mixerCloseBtn = document.getElementById('mixer-close-btn');

    // Pre-Session Countdown Elements & State
    this.preSessionOverlay = document.getElementById('pre-session-overlay');
    this.preSessionCountdown = document.getElementById('pre-session-countdown');
    this.preSessionTitle = document.getElementById('pre-session-title');
    this.preSessionSubtitle = document.getElementById('pre-session-subtitle');
    this.preSessionTimerId = null;

    // State Variables
    this.sessionDuration = 0;
    this.secondsRemaining = 0;
    this.timerId = null;
    this.isPaused = false;
    this.stats = {
      sessions: 0,
      minutes: 0,
      streak: 0,
      lastSessionDate: ''
    };



    // Bind event handlers
    this.handleTimerBtnClick = this.handleTimerBtnClick.bind(this);
    this.togglePlayPause = this.togglePlayPause.bind(this);
    this.exitSession = this.exitSession.bind(this);
  }

  /**
   * Initializes the application.
   * Loads statistics, sets up event listeners, and links sub-components.
   */
  init() {
    this.loadStats();
    this.setupEventListeners();
    
    // Connect breathing coach to prompt element
    const breathingPrompt = document.getElementById('breathing-prompt');
    window.breathingCoach.init(null, breathingPrompt);

    // Initialize saved breathing pattern
    const savedPattern = localStorage.getItem('mc_breathing_pattern') || 'box';
    this.selectPattern(savedPattern);

    // Initialize Main Session Canvas (deferred start until session active)
    const auroraCanvas = document.getElementById('aurora-canvas');
    window.meditationCanvas.init(auroraCanvas);

    // Initialize & Start Logo Canvas (autonomous breathing preview)
    const logoCanvasEl = document.getElementById('logo-canvas');
    if (logoCanvasEl) {
      this.logoCanvas = new MeditationCanvas();
      this.logoCanvas.init(logoCanvasEl, true);
      this.logoCanvas.start();
    }
  }

  /**
   * Loads statistics from LocalStorage and updates the UI
   */
  loadStats() {
    this.stats.sessions = parseInt(localStorage.getItem('mc_sessions') || '0', 10);
    this.stats.minutes = parseFloat(localStorage.getItem('mc_minutes') || '0');
    this.stats.streak = parseInt(localStorage.getItem('mc_streak_count') || '0', 10);
    this.stats.lastSessionDate = localStorage.getItem('mc_last_session_date') || '';

    // Update Dashboard DOM
    document.getElementById('stat-sessions').textContent = this.stats.sessions;
    document.getElementById('stat-minutes').textContent = Math.round(this.stats.minutes);
    document.getElementById('stat-streak').textContent = this.stats.streak;
  }

  /**
   * Sets up interactive click/input listeners across DOM elements
   */
  setupEventListeners() {
    // 1. Selector Timer Buttons
    const timerBtns = document.querySelectorAll('.timer-btn');
    timerBtns.forEach(btn => btn.addEventListener('click', this.handleTimerBtnClick));

    // 2. Playback Session Controls
    this.playPauseBtn.addEventListener('click', this.togglePlayPause);
    this.exitSessionBtn.addEventListener('click', this.exitSession);

    // 3. Audio Mixer Panel Toggle
    this.audioToggleBtn.addEventListener('click', () => {
      this.mixerPanel.classList.add('active');
    });
    this.mixerCloseBtn.addEventListener('click', () => {
      this.mixerPanel.classList.remove('active');
    });

    // Helper to clear active preset button highlight
    const clearPresetActive = () => {
      document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    };

    // 4. Audio Mixer Volume Sliders
    this.volDroneSlider.addEventListener('input', (e) => {
      window.audioEngine.setDroneVolume(e.target.value);
      clearPresetActive();
    });
    this.volRainSlider.addEventListener('input', (e) => {
      window.audioEngine.setRainVolume(e.target.value);
      clearPresetActive();
    });
    this.volBowlSlider.addEventListener('input', (e) => {
      window.audioEngine.setBowlVolume(e.target.value);
      clearPresetActive();
    });
    this.volBinauralSlider.addEventListener('input', (e) => {
      window.audioEngine.setBinauralVolume(e.target.value);
      clearPresetActive();
    });

    // 5. Donation Modal Buttons
    const openDonationBtn = document.getElementById('open-donation-btn');
    const closeDonationBtn = document.getElementById('close-donation-btn');

    if (openDonationBtn) {
      openDonationBtn.addEventListener('click', () => {
        this.openDonationModal();
      });
    }
    
    if (closeDonationBtn) {
      closeDonationBtn.addEventListener('click', () => {
        this.donationModal.classList.remove('active');
      });
    }

    // Close Thank You Modal
    document.getElementById('thankyou-close-btn').addEventListener('click', () => {
      this.thankYouModal.classList.remove('active');
    });

    // 5b. Installation Instructions Modal Buttons & Tabs
    const openInstallBtn = document.getElementById('open-install-btn');
    const closeInstallBtn = document.getElementById('close-install-btn');
    const installDoneBtn = document.getElementById('install-done-btn');
    const installModal = document.getElementById('install-modal');

    if (openInstallBtn) {
      openInstallBtn.addEventListener('click', () => {
        installModal.classList.add('active');
      });
    }

    if (closeInstallBtn) {
      closeInstallBtn.addEventListener('click', () => {
        installModal.classList.remove('active');
      });
    }

    if (installDoneBtn) {
      installDoneBtn.addEventListener('click', () => {
        installModal.classList.remove('active');
      });
    }

    // Tab switcher logic
    const tabIos = document.getElementById('tab-btn-ios');
    const tabAndroid = document.getElementById('tab-btn-android');
    const tabDesktop = document.getElementById('tab-btn-desktop');

    const contentIos = document.getElementById('tab-content-ios');
    const contentAndroid = document.getElementById('tab-content-android');
    const contentDesktop = document.getElementById('tab-content-desktop');

    const switchInstallTab = (activeTabBtn, activeContentPanel) => {
      [tabIos, tabAndroid, tabDesktop].forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      [contentIos, contentAndroid, contentDesktop].forEach(panel => {
        if (panel) panel.classList.remove('active');
      });

      if (activeTabBtn) activeTabBtn.classList.add('active');
      if (activeContentPanel) activeContentPanel.classList.add('active');
    };

    if (tabIos && contentIos) {
      tabIos.addEventListener('click', () => switchInstallTab(tabIos, contentIos));
    }
    if (tabAndroid && contentAndroid) {
      tabAndroid.addEventListener('click', () => switchInstallTab(tabAndroid, contentAndroid));
    }
    if (tabDesktop && contentDesktop) {
      tabDesktop.addEventListener('click', () => switchInstallTab(tabDesktop, contentDesktop));
    }

    // 5c. Breathing Pattern Selector Button Listeners
    const patternBtns = document.querySelectorAll('.pattern-btn');
    patternBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const patternKey = e.currentTarget.getAttribute('data-pattern');
        this.selectPattern(patternKey);
      });
    });

    // 5d. Ambient Mixer Preset Button Listeners
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetKey = e.currentTarget.getAttribute('data-preset');
        this.applyAudioPreset(presetKey);
      });
    });

    // 5e. Global Haptic Feedback Trigger on all buttons
    const interactiveEls = document.querySelectorAll('button, a, .timer-btn, .pattern-btn, .preset-btn, .install-badge-btn');
    interactiveEls.forEach(el => {
      el.addEventListener('click', () => this.triggerHaptic());
    });

    // 6. Completion Modal Buttons
    document.getElementById('complete-done-btn').addEventListener('click', () => {
      this.completionModal.classList.remove('active');
      this.transitionToView(this.welcomeView);
    });

    document.getElementById('modal-donate-btn').addEventListener('click', () => {
      this.completionModal.classList.remove('active');
      this.openDonationModal();
    });
  }

  /**
   * Opens the donation modal with active preset value
   */
  openDonationModal() {
    this.donationModal.classList.add('active');
  }

  /**
   * Triggers a subtle tactile haptic vibration click on mobile devices
   */
  triggerHaptic() {
    if ('vibrate' in navigator) {
      navigator.vibrate(12); // subtle 12ms native pulse
    }
  }

  /**
   * Selects and configures the active breathing exercise pattern
   * @param {string} patternKey 
   */
  selectPattern(patternKey) {
    this.selectedPattern = patternKey;
    localStorage.setItem('mc_breathing_pattern', patternKey);

    // Update active visual highlights in DOM
    document.querySelectorAll('.pattern-btn').forEach(btn => {
      if (btn.getAttribute('data-pattern') === patternKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Propagate pattern to breathing coach
    if (window.breathingCoach) {
      window.breathingCoach.setPattern(patternKey);
    }
  }

  /**
   * Applies an ambient soundscape mixing preset
   * @param {string} presetKey 
   */
  applyAudioPreset(presetKey) {
    const presets = {
      space: { drone: 0.8, rain: 0.0, bowl: 0.3, binaural: 0.6 },
      rain: { drone: 0.4, rain: 0.85, bowl: 0.3, binaural: 0.0 },
      temple: { drone: 0.65, rain: 0.0, bowl: 0.8, binaural: 0.0 },
      focus: { drone: 0.5, rain: 0.15, bowl: 0.0, binaural: 0.7 }
    };

    const config = presets[presetKey];
    if (!config) return;

    // 1. Update sliders in UI
    this.volDroneSlider.value = config.drone;
    this.volRainSlider.value = config.rain;
    this.volBowlSlider.value = config.bowl;
    this.volBinauralSlider.value = config.binaural;

    // 2. Adjust volume nodes in audio engine
    if (window.audioEngine) {
      window.audioEngine.setDroneVolume(config.drone);
      window.audioEngine.setRainVolume(config.rain);
      window.audioEngine.setBowlVolume(config.bowl);
      window.audioEngine.setBinauralVolume(config.binaural);
    }

    // 3. Highlight the active preset button
    document.querySelectorAll('.preset-btn').forEach(btn => {
      if (btn.getAttribute('data-preset') === presetKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Transitions views using fade animations
   * @param {HTMLElement} targetView 
   */
  transitionToView(targetView) {
    this.welcomeView.classList.remove('active');
    this.meditationView.classList.remove('active');
    
    targetView.classList.add('active');
  }

  /**
   * Handles clicking timer selector buttons on welcome view
   */
  handleTimerBtnClick(e) {
    const timeValue = parseInt(e.currentTarget.getAttribute('data-time'), 10);
    this.startSession(timeValue);
  }

  /**
   * Starts a new meditation session with a pre-session countdown
   * @param {number} durationSeconds 
   */
  startSession(durationSeconds) {
    this.sessionDuration = durationSeconds;
    this.secondsRemaining = durationSeconds;
    this.isPaused = false;

    // Reset Play/Pause button visual
    document.getElementById('play-icon').classList.add('hidden');
    document.getElementById('pause-icon').classList.remove('hidden');

    // Transition view
    this.transitionToView(this.meditationView);

    // Close mixer panel if it was open from previous session
    this.mixerPanel.classList.remove('active');

    // Update initial timer displays to avoid showing previous session values
    this.updateTimerProgress();
    
    // Start Ambient Audio & Canvas immediately so they run in the background
    window.audioEngine.start();
    window.meditationCanvas.start();

    // Reset and show the pre-session countdown overlay
    if (this.preSessionTimerId) clearInterval(this.preSessionTimerId);
    
    this.preSessionOverlay.classList.remove('hidden');
    
    let count = 3;
    this.preSessionCountdown.textContent = count;
    
    // Trigger countdown scale/fade-in animation
    const triggerPulse = () => {
      this.preSessionCountdown.classList.remove('pulse');
      void this.preSessionCountdown.offsetWidth; // trigger reflow
      this.preSessionCountdown.classList.add('pulse');
    };
    
    triggerPulse();
    // Play initial tick chime
    window.audioEngine.triggerCountdownChime(523.25); // C5

    this.preSessionTimerId = setInterval(() => {
      count--;
      if (count > 0) {
        this.preSessionCountdown.textContent = count;
        triggerPulse();
        
        // Ascending tone feedback (D5, E5)
        const pitches = { 2: 587.33, 1: 659.25 };
        window.audioEngine.triggerCountdownChime(pitches[count] || 523.25);
      } else if (count === 0) {
        this.preSessionCountdown.textContent = "Good luck!";
        triggerPulse();
        
        // Start chimes: G5 tone and Singing Bowl strike
        window.audioEngine.triggerCountdownChime(783.99); // G5
        window.audioEngine.triggerBowl();
      } else {
        // Countdown finished, clean up pre-session timer
        clearInterval(this.preSessionTimerId);
        this.preSessionTimerId = null;

        // Fade out overlay
        this.preSessionOverlay.classList.add('hidden');

        // Start active meditation exercise
        this.startActualSession();
      }
    }, 1000);
  }

  /**
   * Starts the active session, launching main timers, breathing instructions, and quote rotations
   */
  startActualSession() {
    this.secondsRemaining = this.sessionDuration;
    this.isPaused = false;

    // Reset main timer display
    this.updateTimerProgress();

    // Start Breathing Coach instructions & state cycles
    window.breathingCoach.init(
      null,
      document.getElementById('breathing-prompt')
    );
    window.breathingCoach.start();



    // Start main countdown timer loop
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => this.tickSession(), 1000);
  }

  /**
   * Ticks down the session countdown timer
   */
  tickSession() {
    if (this.isPaused) return;

    this.secondsRemaining--;
    
    this.updateTimerProgress();

    // Session Completed!
    if (this.secondsRemaining <= 0) {
      this.completeSession();
    }
  }

  /**
   * Updates timer progress circle and text countdown
   */
  updateTimerProgress() {
    const displayMin = Math.floor(this.secondsRemaining / 60);
    const displaySec = this.secondsRemaining % 60;
    const timeString = `${displayMin}:${displaySec.toString().padStart(2, '0')}`;

    // Update texts
    document.getElementById('session-time-display').textContent = timeString;
    document.getElementById('countdown-text').textContent = timeString;

    // Update circular ring stroke-dashoffset (dasharray is 283)
    const progressCircle = document.getElementById('timer-progress-bar');
    const percentage = this.secondsRemaining / this.sessionDuration;
    const offset = 283 * (1 - percentage);
    progressCircle.style.strokeDashoffset = offset;
  }

  /**
   * Toggles pause/play state of the active meditation
   */
  togglePlayPause() {
    this.isPaused = !this.isPaused;

    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');

    if (this.isPaused) {
      // Pause visual indicators
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');

      // Stop Audio
      window.audioEngine.stop();

      // Pause Breathing Coach
      window.breathingCoach.pause();

      // Pause Canvas
      window.meditationCanvas.stop();
    } else {
      // Play visual indicators
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');

      // Resume Audio
      window.audioEngine.start();

      // Resume Breathing Coach
      window.breathingCoach.resume();

      // Resume Canvas
      window.meditationCanvas.start();
    }
  }

  /**
   * Exits current session immediately without saving stats
   */
  exitSession() {
    this.cleanupSession();
    this.transitionToView(this.welcomeView);
  }

  /**
   * Safely stops all active intervals, canvas, and audio elements
   */
  cleanupSession() {
    // Clear pre-session timer if active
    if (this.preSessionTimerId) {
      clearInterval(this.preSessionTimerId);
      this.preSessionTimerId = null;
    }
    this.preSessionOverlay.classList.add('hidden');

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    window.audioEngine.stop();
    window.breathingCoach.reset();
    window.meditationCanvas.stop(); // Stop main canvas when session is inactive to save battery
  }

  /**
   * Activates completion modals and saves user statistics
   */
  completeSession() {
    this.cleanupSession();

    // Trigger completion gong
    window.audioEngine.triggerGong();

    // Calculate duration in minutes
    const sessionMins = this.sessionDuration / 60;
    
    // Save to statistics
    this.saveCompletedSession(sessionMins);

    // Update Completion Modal Summary
    const displayMin = Math.floor(this.sessionDuration / 60);
    const displaySec = this.sessionDuration % 60;
    document.getElementById('summary-duration').textContent = `${displayMin}:${displaySec.toString().padStart(2, '0')}`;
    document.getElementById('summary-streak').textContent = this.stats.streak;

    // Show completion overlay
    this.completionModal.classList.add('active');
  }

  /**
   * Saves completed sessions and updates LocalStorage variables
   * @param {number} sessionMinutes 
   */
  saveCompletedSession(sessionMinutes) {
    // 1. Increment sessions and minutes
    this.stats.sessions += 1;
    this.stats.minutes += sessionMinutes;

    // 2. Calculate Streak
    const today = new Date().toDateString();
    const lastSession = this.stats.lastSessionDate;

    if (!lastSession) {
      this.stats.streak = 1;
    } else {
      const lastSessionDate = new Date(lastSession);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate - lastSessionDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Session was completed yesterday, increment streak
        this.stats.streak += 1;
      } else if (diffDays > 1) {
        // Missed a day, reset streak to 1
        this.stats.streak = 1;
      }
      // If diffDays is 0, session was completed today, streak remains unchanged.
    }

    this.stats.lastSessionDate = today;

    // Save back to LocalStorage
    localStorage.setItem('mc_sessions', this.stats.sessions);
    localStorage.setItem('mc_minutes', this.stats.minutes);
    localStorage.setItem('mc_streak_count', this.stats.streak);
    localStorage.setItem('mc_last_session_date', today);

    // Refresh Dashboard Display values
    this.loadStats();
  }

}

// Instantiate and initialize on DOM content load
document.addEventListener('DOMContentLoaded', () => {
  const app = new MeditationApp();
  app.init();
});
