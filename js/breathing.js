/* ==========================================================================
   AETHER - BREATHING COORDINATOR (EPOCH TIMING SYNCED)
   ========================================================================= */

class BreathingCoach {
  constructor() {
    this.orbElement = null;
    this.promptElement = null;
    this.timerId = null;
    
    // Cycle States configuration (Inhale -> Hold -> Exhale: 4-4-4)
    this.states = [
      { name: 'inhale', duration: 4, label: 'Inhale' },
      { name: 'hold',   duration: 4, label: 'Hold' },
      { name: 'exhale', duration: 4, label: 'Exhale' }
    ];

    this.currentIndex = -1;
    this.secondsLeftInState = 0;
    this.isRunning = false;

    // Epoch timing states for smooth canvas animations
    this.stateStartTime = 0;
    this.currentStateDuration = 1;
    this.currentStateName = 'idle';
    this.isRestingState = false;
    this.pausedElapsed = 0;
  }

  /**
   * Links DOM elements and resets state
   * @param {HTMLElement} orbElement 
   * @param {HTMLElement} promptElement 
   */
  init(orbElement, promptElement) {
    this.orbElement = orbElement;
    this.promptElement = promptElement;
    this.reset();
  }

  /**
   * Resets breathing state variables and clears DOM classes
   */
  reset() {
    this.stop();
    this.currentIndex = -1;
    this.secondsLeftInState = 0;
    this.stateStartTime = 0;
    this.currentStateDuration = 1;
    this.currentStateName = 'idle';
    this.isRestingState = false;
    this.pausedElapsed = 0;
    
    if (this.promptElement) {
      this.promptElement.innerHTML = `
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.6; margin-bottom: 2px;">Prepare</div>
        <div style="font-size: 26px; font-weight: 700;">Get Ready</div>
      `;
    }
  }

  /**
   * Configures the breathing pattern states list dynamically
   * @param {string} patternKey - 'box', 'sleep', 'calm', 'energize'
   */
  setPattern(patternKey) {
    const presets = {
      box: [
        { name: 'inhale', duration: 4, label: 'Inhale' },
        { name: 'hold',   duration: 4, label: 'Hold' },
        { name: 'exhale', duration: 4, label: 'Exhale' },
        { name: 'hold',   duration: 4, label: 'Rest', isResting: true }
      ],
      sleep: [
        { name: 'inhale', duration: 4, label: 'Inhale' },
        { name: 'hold',   duration: 7, label: 'Hold' },
        { name: 'exhale', duration: 8, label: 'Exhale' }
      ],
      calm: [
        { name: 'inhale', duration: 5, label: 'Inhale' },
        { name: 'exhale', duration: 5, label: 'Exhale' }
      ],
      energize: [
        { name: 'inhale', duration: 2, label: 'Inhale' },
        { name: 'exhale', duration: 2, label: 'Exhale' }
      ]
    };

    this.states = presets[patternKey] || presets.box;
    this.reset();
  }

  /**
   * Starts the breathing cycle
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.pausedElapsed = 0;
    this.advance();
    
    // Run second-by-second countdown timer for text display
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  /**
   * Pauses the breathing timer, saving current progress
   */
  pause() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    // Record exactly how much time has passed in current state
    this.pausedElapsed = Date.now() - this.stateStartTime;
  }

  /**
   * Resumes the breathing timer, offsetting the start epoch
   */
  resume() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Adjust start time so the canvas animation resumes exactly where it paused
    this.stateStartTime = Date.now() - this.pausedElapsed;
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  /**
   * Stops the breathing timer completely
   */
  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Ticks down the text countdown every second
   */
  tick() {
    if (!this.isRunning) return;

    this.secondsLeftInState--;

    // If current state duration is up, transition to next state
    if (this.secondsLeftInState <= 0) {
      this.advance();
    } else {
      this.updatePromptText();
    }
  }

  /**
   * Transitions to the next state in the queue
   */
  advance() {
    this.currentIndex = (this.currentIndex + 1) % this.states.length;
    const currentState = this.states[this.currentIndex];
    
    this.secondsLeftInState = currentState.duration;
    this.currentStateDuration = currentState.duration;
    this.currentStateName = currentState.name;
    this.isRestingState = currentState.isResting || false;
    this.stateStartTime = Date.now();
    this.pausedElapsed = 0;

    this.updatePromptText();

    // Trigger transition sound chimes on key states
    if (window.audioEngine && window.audioEngine.isPlaying) {
      if (currentState.name === 'inhale') {
        window.audioEngine.triggerBowl();
      } else if (currentState.name === 'exhale') {
        setTimeout(() => {
          if (this.isRunning && this.states[this.currentIndex].name === 'exhale') {
            window.audioEngine.triggerBowl();
          }
        }, 100);
      }
    }
  }

  /**
   * Updates text inside the orb indicating state and time left
   */
  updatePromptText() {
    if (!this.promptElement) return;

    const currentState = this.states[this.currentIndex];
    
    // Choose distinct color for each phase for maximum visibility
    let phaseColor = 'var(--color-accent-teal)';
    if (currentState.name === 'hold') phaseColor = 'var(--color-accent-gold)';
    if (currentState.name === 'exhale') phaseColor = 'var(--color-accent-pink)';

    this.promptElement.innerHTML = `
      <div style="font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: ${phaseColor}; text-shadow: 0 0 15px rgba(255, 255, 255, 0.1); margin-bottom: 2px;">
        ${currentState.label}
      </div>
      <div style="font-size: 14px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.5px;">
        ${this.secondsLeftInState}s
      </div>
    `;
  }
}

// Instantiate and export globally
window.breathingCoach = new BreathingCoach();
