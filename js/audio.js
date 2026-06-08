/* ==========================================================================
   MEDITATION COACH - WEB AUDIO SYNTH ENGINE
   ========================================================================= */

class MeditationAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    
    // Master Nodes
    this.masterGain = null;
    
    // Volume configuration values (default)
    this.volumes = {
      drone: 0.7,
      rain: 0.3,
      bowl: 0.4,
      binaural: 0.0 // starts disabled
    };

    // Keep track of active audio source nodes so we can stop them
    this.activeNodes = [];
  }

  /**
   * Initializes the Audio Context and builds the node topology.
   * Safe to call repeatedly; will only initialize once.
   */
  init() {
    if (this.ctx) return;

    // Create AudioContext (handling browser variations)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Setup Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime); // Start silent
    this.masterGain.connect(this.ctx.destination);
  }

  /**
   * Starts all looping ambient generators (Drone, Rain, Binaural)
   */
  start() {
    this.init();
    
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Resume context if suspended (browser autoplay policy safety)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // 1. Create and Start Meditation Drone
    this.setupDrone();

    // 2. Create and Start Ambient Rain
    this.setupRain();

    // 3. Create and Start Binaural Beats
    this.setupBinauralBeats();

    // Fade in Master Gain smoothly (0.8 seconds)
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 1.2);
  }

  /**
   * Stops/fades out all ambient audio loop nodes
   */
  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // Fade out Master Gain smoothly (0.8 seconds)
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.8);

    // After fade out completes, stop and disconnect nodes
    setTimeout(() => {
      if (this.isPlaying) return; // Abort if user clicked play again during fade

      this.activeNodes.forEach(node => {
        try {
          node.stop();
        } catch (e) {
          // Some nodes might not be stoppable (e.g. filters, gains)
        }
        try {
          node.disconnect();
        } catch (e) {}
      });
      this.activeNodes = [];
    }, 900);
  }

  /**
   * Meditation Drone Synth
   * Layered oscillators passing through a sweeping lowpass filter
   */
  setupDrone() {
    const droneGainNode = this.ctx.createGain();
    droneGainNode.gain.setValueAtTime(this.volumes.drone, this.ctx.currentTime);
    droneGainNode.connect(this.masterGain);
    this.activeNodes.push(droneGainNode);

    // Filter to keep the drone warm and deep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, this.ctx.currentTime); // Base cut-off
    filter.Q.setValueAtTime(3, this.ctx.currentTime);
    filter.connect(droneGainNode);
    this.activeNodes.push(filter);

    // LFO to modulate the filter cutoff (creating a slow "breathing" swell)
    const filterLFO = this.ctx.createOscillator();
    filterLFO.frequency.setValueAtTime(0.08, this.ctx.currentTime); // very slow: 12.5s cycle
    
    const filterLFOGain = this.ctx.createGain();
    filterLFOGain.gain.setValueAtTime(80, this.ctx.currentTime); // sweeps +- 80Hz
    
    filterLFO.connect(filterLFOGain);
    filterLFOGain.connect(filter.frequency);
    
    filterLFO.start();
    this.activeNodes.push(filterLFO);
    this.activeNodes.push(filterLFOGain);

    // Drone Oscillator frequencies (Root A2 = 110Hz)
    const oscillators = [
      { type: 'sawtooth', freq: 110.0, gain: 0.25 }, // Root
      { type: 'triangle', freq: 110.3, gain: 0.25 }, // Detuned Root for phasing
      { type: 'sine', freq: 165.0, gain: 0.20 },     // Perfect Fifth (E3)
      { type: 'triangle', freq: 220.0, gain: 0.15 }, // Octave (A3)
      { type: 'sine', freq: 55.0, gain: 0.15 }        // Sub-bass (A1 = 55Hz)
    ];

    oscillators.forEach(config => {
      const osc = this.ctx.createOscillator();
      osc.type = config.type;
      osc.frequency.setValueAtTime(config.freq, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(config.gain, this.ctx.currentTime);

      // Connect: Osc -> OscGain -> filter
      osc.connect(oscGain);
      oscGain.connect(filter);
      
      osc.start();
      
      this.activeNodes.push(osc);
      this.activeNodes.push(oscGain);
    });

    // Save reference to adjust volume in real time
    this.droneGainNode = droneGainNode;
  }

  /**
   * Procedural Ambient Rain Sound
   * Generated via filtered white noise modulated by a wind LFO
   */
  setupRain() {
    // 1. Generate White Noise Buffer
    const bufferSize = 2 * this.ctx.sampleRate; // 2 seconds of loopable noise
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // 2. Setup Rain Channel Gain
    const rainGainNode = this.ctx.createGain();
    rainGainNode.gain.setValueAtTime(this.volumes.rain, this.ctx.currentTime);
    rainGainNode.connect(this.masterGain);
    this.activeNodes.push(rainGainNode);

    // 3. Filters to make it sound like rain (low/mid frequency noise)
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(800, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(0.7, this.ctx.currentTime);

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1200, this.ctx.currentTime);

    // 4. LFO to simulate rising and falling wind/rain volume swells
    const rainLFO = this.ctx.createOscillator();
    rainLFO.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8.3s cycle
    
    const rainLFOGain = this.ctx.createGain();
    rainLFOGain.gain.setValueAtTime(0.12, this.ctx.currentTime); // Modulate gain by up to 12%

    // Connections: Source -> Bandpass -> Lowpass -> RainGain -> Master
    noiseSource.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(rainGainNode);

    // Connect LFO: LFO -> LFOGain -> RainGain.gain
    rainLFO.connect(rainLFOGain);
    rainLFOGain.connect(rainGainNode.gain);

    // Start sources
    noiseSource.start();
    rainLFO.start();

    this.activeNodes.push(noiseSource);
    this.activeNodes.push(bandpass);
    this.activeNodes.push(lowpass);
    this.activeNodes.push(rainLFO);
    this.activeNodes.push(rainLFOGain);

    this.rainGainNode = rainGainNode;
  }

  /**
   * Binaural Beats Generator
   * Promotes deep sleep/relaxation waves (6Hz Theta difference)
   */
  setupBinauralBeats() {
    const binauralGainNode = this.ctx.createGain();
    binauralGainNode.gain.setValueAtTime(this.volumes.binaural, this.ctx.currentTime);
    binauralGainNode.connect(this.masterGain);
    this.activeNodes.push(binauralGainNode);

    // Channel merger for Stereo separation
    const merger = this.ctx.createChannelMerger(2);
    merger.connect(binauralGainNode);
    this.activeNodes.push(merger);

    // Left channel carrier: 100Hz sine
    const leftOsc = this.ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(100.0, this.ctx.currentTime);
    leftOsc.connect(merger, 0, 0); // Connect osc to left channel
    leftOsc.start();
    this.activeNodes.push(leftOsc);

    // Right channel carrier: 106Hz sine (creating 6Hz Theta binaural difference)
    const rightOsc = this.ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(106.0, this.ctx.currentTime);
    rightOsc.connect(merger, 0, 1); // Connect osc to right channel
    rightOsc.start();
    this.activeNodes.push(rightOsc);

    this.binauralGainNode = binauralGainNode;
  }

  /**
   * Play a brief, clean chime for the pre-session countdown
   * @param {number} pitch Frequency in Hz (e.g. 523.25 for C5)
   */
  triggerCountdownChime(pitch = 523.25) {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);

    // Fast attack, short decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);

    // Clean up connections
    setTimeout(() => {
      try {
        gainNode.disconnect();
        osc.disconnect();
      } catch (e) {}
    }, 500);
  }

  /**
   * Resonant Singing Bowl Strike Synth
   * Uses sine waves tuned to metallic harmonic frequencies and slow envelope decay.
   */
  triggerBowl() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // Overall bowl strike gain node
    const bowlStrikeGain = this.ctx.createGain();
    bowlStrikeGain.gain.setValueAtTime(0, now);
    // Exponential strike (rapid rise, slow decay)
    bowlStrikeGain.gain.linearRampToValueAtTime(this.volumes.bowl, now + 0.08);
    bowlStrikeGain.gain.setValueAtTime(this.volumes.bowl, now + 0.1);
    bowlStrikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 8.0); // 8 seconds decay
    
    bowlStrikeGain.connect(this.masterGain);

    // Harmonics of a physical singing bowl (Base: A3 = 220Hz)
    const harmonics = [
      { freq: 220.0, gain: 0.5 },
      { freq: 440.3, gain: 0.25 }, // detuned slightly for metallic beating
      { freq: 660.1, gain: 0.15 },
      { freq: 882.5, gain: 0.1 },
      { freq: 1204.0, gain: 0.05 },
      { freq: 1541.2, gain: 0.03 }
    ];

    harmonics.forEach(harm => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(harm.freq, now);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(harm.gain, now);

      // Add a slight vibrato to make it sound richer
      const vibrato = this.ctx.createOscillator();
      vibrato.frequency.value = 4.5; // 4.5Hz vibrato
      const vibratoGain = this.ctx.createGain();
      vibratoGain.gain.value = 1.5; // slight detuning
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      vibrato.start();
      osc.connect(gainNode);
      gainNode.connect(bowlStrikeGain);
      
      osc.start(now);
      osc.stop(now + 8.2);
      vibrato.stop(now + 8.2);
    });

    // Cleanup nodes from memory after sound ends
    setTimeout(() => {
      bowlStrikeGain.disconnect();
    }, 8500);
  }

  /**
   * Deeper Completion Gong Synth
   * Rich low-frequency sound that marks the end of meditation
   */
  triggerGong() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    const gongGain = this.ctx.createGain();
    gongGain.gain.setValueAtTime(0, now);
    gongGain.gain.linearRampToValueAtTime(0.8, now + 0.15); // slower strike
    gongGain.gain.exponentialRampToValueAtTime(0.0001, now + 12.0); // 12 seconds decay
    gongGain.connect(this.masterGain);

    // Deep heavy tones (Base: G2 = 98Hz)
    const tones = [
      { freq: 98.0, gain: 0.6 },
      { freq: 147.2, gain: 0.4 },
      { freq: 196.1, gain: 0.3 },
      { freq: 294.5, gain: 0.2 },
      { freq: 392.8, gain: 0.1 }
    ];

    tones.forEach(tone => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(tone.gain, now);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(gongGain);

      osc.start(now);
      osc.stop(now + 12.2);
    });

    setTimeout(() => {
      gongGain.disconnect();
    }, 12500);
  }

  /**
   * Adjust volumes in real time from sliders
   */
  setDroneVolume(vol) {
    this.volumes.drone = parseFloat(vol);
    if (this.droneGainNode) {
      this.droneGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.droneGainNode.gain.linearRampToValueAtTime(this.volumes.drone, this.ctx.currentTime + 0.1);
    }
  }

  setRainVolume(vol) {
    this.volumes.rain = parseFloat(vol);
    if (this.rainGainNode) {
      // Offset by the LFO modulation average to keep the volume dynamic but scaled
      this.rainGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.rainGainNode.gain.linearRampToValueAtTime(this.volumes.rain, this.ctx.currentTime + 0.1);
    }
  }

  setBowlVolume(vol) {
    this.volumes.bowl = parseFloat(vol);
  }

  setBinauralVolume(vol) {
    this.volumes.binaural = parseFloat(vol);
    if (this.binauralGainNode) {
      this.binauralGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.binauralGainNode.gain.linearRampToValueAtTime(this.volumes.binaural, this.ctx.currentTime + 0.1);
    }
  }
}

// Instantiate and export the engine to the global scope
window.audioEngine = new MeditationAudioEngine();
