/* ==========================================================================
   MEDITATION COACH - STARFIELD, AURORA & COSMIC VORTEX CANVAS ENGINE
   ========================================================================== */

class MeditationCanvas {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.isActive = false;

    // Background Elements
    this.stars = [];
    this.time = 0;

    // Cosmic Breathing Vortex Elements
    this.vortexParticles = [];
    this.vortexParticleCount = 320;
    this.breathState = 'idle';      // 'idle', 'inhale', 'hold', 'exhale'
    this.breathProgress = 0;        // float 0.0 -> 1.0
    this.isRestingState = false;    // holds are either hold-inhale or rest-exhale

    // Bind methods to preserve lexical scope
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
  }

  /**
   * Initializes the canvas element and sets up event listeners
   * @param {HTMLCanvasElement} canvasElement 
   * @param {boolean} isLogoMode
   */
  init(canvasElement, isLogoMode = false) {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.isLogoMode = isLogoMode;

    if (this.isLogoMode) {
      this.vortexParticleCount = 100;
    }
    
    // Set initial size
    this.resize();
    
    // Listen for resize events
    if (!this.isLogoMode) {
      window.addEventListener('resize', this.resize);
    }
  }

  /**
   * Adjusts canvas dimensions to match container size.
   * Leverages devicePixelRatio to prevent blurriness on mobile retina screens.
   */
  resize() {
    if (!this.canvas || !this.ctx) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Re-seed background stars (only if not logo mode)
    if (!this.isLogoMode) {
      this.initStars(width, height);
    }
    
    // Re-seed vortex particles centered in the canvas
    this.initVortex(width, height);
  }

  /**
   * Fills stars array with randomized background particles
   */
  initStars(width, height) {
    this.stars = [];
    const starCount = Math.floor((width * height) / 4500); // density factor

    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.0 + 0.3,
        alpha: Math.random(),
        twinkleSpeed: Math.random() * 0.01 + 0.004,
        driftX: Math.random() * 0.03 - 0.015,
        driftY: Math.random() * 0.01 - 0.03  // slow drift upwards
      });
    }
  }

  /**
   * Seeds the vortex particles centered in the view
   */
  initVortex(width, height) {
    this.vortexParticles = [];
    
    for (let i = 0; i < this.vortexParticleCount; i++) {
      // Base radius dictates the natural ring spread
      let baseRadius;
      if (this.isLogoMode) {
        baseRadius = 5 + Math.pow(Math.random(), 1.5) * 35;
      } else {
        baseRadius = 30 + Math.pow(Math.random(), 1.5) * 130;
      }
      
      this.vortexParticles.push({
        angle: Math.random() * Math.PI * 2,
        radius: baseRadius,
        baseRadius: baseRadius,
        size: this.isLogoMode ? (Math.random() * 0.9 + 0.4) : (Math.random() * 1.6 + 0.6),
        alpha: Math.random() * 0.7 + 0.3,
        orbitDirection: Math.random() > 0.15 ? 1 : -1,
        color: { r: 100, g: 120, b: 200 }
      });
    }
  }

  /**
   * Sets the current breathing state and normalized completion progress
   * @param {string} state - 'inhale', 'hold', 'exhale'
   * @param {number} progress - 0.0 to 1.0
   * @param {boolean} isResting - true for the exhale rest hold
   */
  setBreathingState(state, progress, isResting = false) {
    this.breathState = state;
    this.breathProgress = progress;
    this.isRestingState = isResting;
  }

  /**
   * Starts the animation loop
   */
  start() {
    if (this.isActive) return;
    this.isActive = true;
    
    this.resize();
    this.loop();
  }

  /**
   * Stops the loop and clears the frame to save battery
   */
  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  /**
   * Completely clears canvas elements
   */
  clear() {
    if (!this.ctx || !this.canvas) return;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, width, height);
  }

  /**
   * Master animation loop
   */
  loop() {
    if (!this.isActive) return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(this.loop);
  }

  /**
   * Increments time and updates background stars + vortex particles positions
   */
  update() {
    this.time += 0.002;

    if (this.isLogoMode) {
      // Autonomous breathing cycle for the logo: 12 second cycle
      // 0-4s: inhale, 4-8s: hold, 8-12s: exhale
      const cycleTime = (Date.now() / 1000) % 12;
      if (cycleTime < 4) {
        this.breathState = 'inhale';
        this.breathProgress = cycleTime / 4;
        this.isRestingState = false;
      } else if (cycleTime < 8) {
        this.breathState = 'hold';
        this.breathProgress = (cycleTime - 4) / 4;
        this.isRestingState = false;
      } else {
        this.breathState = 'exhale';
        this.breathProgress = (cycleTime - 8) / 4;
        this.isRestingState = false;
      }
    } else {
      // Sync state and smooth progress from the breathing timing coach in real time
      if (window.breathingCoach && window.breathingCoach.isRunning) {
        const elapsed = Date.now() - window.breathingCoach.stateStartTime;
        const duration = window.breathingCoach.currentStateDuration * 1000;
        this.breathProgress = Math.min(elapsed / duration, 1.0);
        this.breathState = window.breathingCoach.currentStateName;
        this.isRestingState = window.breathingCoach.isRestingState;
      } else if (window.breathingCoach && window.breathingCoach.pausedElapsed > 0) {
        // Maintain paused state progress
        const duration = window.breathingCoach.currentStateDuration * 1000;
        this.breathProgress = Math.min(window.breathingCoach.pausedElapsed / duration, 1.0);
        this.breathState = window.breathingCoach.currentStateName;
        this.isRestingState = window.breathingCoach.isRestingState;
      } else {
        this.breathState = 'idle';
        this.breathProgress = 0;
        this.isRestingState = false;
      }
    }

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    // 1. Update background stars
    this.stars.forEach(star => {
      star.x += star.driftX;
      star.y += star.driftY;

      if (star.x < 0) star.x = width;
      if (star.x > width) star.x = 0;
      if (star.y < 0) star.y = height;
      if (star.y > height) star.y = height;

      star.alpha += star.twinkleSpeed;
      if (star.alpha >= 1.0 || star.alpha <= 0.1) {
        star.twinkleSpeed = -star.twinkleSpeed;
      }
    });

    // 2. Update Vortex Particles
    this.vortexParticles.forEach(p => {
      // Rotational velocities depending on state (faster on inhale collapse)
      let rotSpeed = 0.01;
      if (this.breathState === 'inhale') {
        rotSpeed = 0.012 + 0.024 * this.breathProgress; // speeds up as it collapses
      } else if (this.breathState === 'exhale') {
        rotSpeed = 0.032 * (1 - this.breathProgress) + 0.008; // slows down as it expands
      } else if (this.breathState === 'hold') {
        rotSpeed = this.isRestingState ? 0.008 : 0.015; // slow drift on rest, steady orbit on hold
      } else {
        rotSpeed = 0.01; // default slow drift
      }

      p.angle += rotSpeed * p.orbitDirection;

      // Radius scaling depending on state
      let targetRadius = p.baseRadius;
      
      if (this.breathState === 'inhale') {
        // Spiral inwards towards a singularity
        // Combine progress with sine easing for natural organic speed change
        const easeProgress = Math.sin((this.breathProgress * Math.PI) / 2);
        targetRadius = p.baseRadius * (1 - easeProgress * 0.95);
      } else if (this.breathState === 'exhale') {
        // Spiral outwards to full size
        const easeProgress = 1 - Math.cos((this.breathProgress * Math.PI) / 2);
        targetRadius = p.baseRadius * (0.05 + easeProgress * 0.95);
      } else if (this.breathState === 'hold') {
        if (this.isRestingState) {
          // Exhale rest: particles drift in a wide, slow-moving gas cloud
          targetRadius = p.baseRadius * (0.95 + 0.05 * Math.sin(this.time * 2 + p.angle));
        } else {
          // Inhale hold: particles form a tight, energized orbital ring with a minor heartbeat pulse
          const heartbeat = Math.sin(this.time * 12) * (this.isLogoMode ? 0.8 : 2.5); // reduced heartbeat pulse in logo mode
          targetRadius = (this.isLogoMode ? 4 : 12) + heartbeat + (p.baseRadius * 0.12);
        }
      } else {
        // Idle/prepare: gentle breathing cycle simulation
        targetRadius = p.baseRadius * (0.8 + 0.08 * Math.sin(this.time * 2 + p.angle));
      }

      // Smoothly slide the radius towards target using Lerp (0.08 interpolation speed)
      p.radius += (targetRadius - p.radius) * 0.08;

      // Color target shifting depending on state
      let targetColor = { r: 100, g: 130, b: 210 }; // Idle/Rest: dim lavender
      
      if (this.breathState === 'inhale') {
        // Inhale: Glowing Aqua/Teal
        targetColor = { r: 100, g: 223, b: 223 };
      } else if (this.breathState === 'exhale') {
        // Exhale: Glowing Twilight Violet/Pink
        targetColor = { r: 189, g: 178, b: 255 };
      } else if (this.breathState === 'hold') {
        if (this.isRestingState) {
          // Rest: Deep Ethereal Blue
          targetColor = { r: 80, g: 150, b: 230 };
        } else {
          // Hold: Solar Gold/Orange
          targetColor = { r: 255, g: 209, b: 102 };
        }
      }

      // Smoothly interpolate RGB color channels
      p.color.r += (targetColor.r - p.color.r) * 0.1;
      p.color.g += (targetColor.g - p.color.g) * 0.1;
      p.color.b += (targetColor.b - p.color.b) * 0.1;
    });
  }

  /**
   * Performs the actual canvas draws
   */
  draw() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = this.isLogoMode ? (height / 2) : (height / 2 - 40); 

    if (!this.isLogoMode) {
      // 1. Draw Deep Space Background
      this.ctx.fillStyle = '#060612';
      this.ctx.fillRect(0, 0, width, height);

      // 2. Draw Aurora Borealis Gradient Layers
      const auroraAX = width * (0.5 + 0.3 * Math.sin(this.time));
      const auroraAY = height * (0.2 + 0.15 * Math.cos(this.time * 1.3));
      const radiusA = Math.max(width * 0.9, 350);
      const gradientA = this.ctx.createRadialGradient(auroraAX, auroraAY, 10, auroraAX, auroraAY, radiusA);
      gradientA.addColorStop(0, 'rgba(100, 223, 223, 0.08)');
      gradientA.addColorStop(0.5, 'rgba(100, 223, 223, 0.02)');
      gradientA.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = gradientA;
      this.ctx.fillRect(0, 0, width, height);

      const auroraBX = width * (0.3 + 0.25 * Math.cos(this.time * 0.8));
      const auroraBY = height * (0.4 + 0.1 * Math.sin(this.time * 1.7));
      const radiusB = Math.max(width * 0.8, 300);
      const gradientB = this.ctx.createRadialGradient(auroraBX, auroraBY, 10, auroraBX, auroraBY, radiusB);
      gradientB.addColorStop(0, 'rgba(189, 178, 255, 0.06)');
      gradientB.addColorStop(0.4, 'rgba(189, 178, 255, 0.01)');
      gradientB.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = gradientB;
      this.ctx.fillRect(0, 0, width, height);

      // 3. Draw Twinkling Background Stars
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.stars.forEach(star => {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      });
    } else {
      // Logo mode: clear the canvas to keep background transparent
      this.ctx.clearRect(0, 0, width, height);
    }

    // 4. Draw Center Glowing core (Singularity flare)
    let coreSize = 0;
    let coreColor = 'rgba(100, 223, 223, 0.45)'; // Teal default
    
    if (this.breathState === 'inhale') {
      coreSize = (this.isLogoMode ? 5 : 16) * this.breathProgress;
    } else if (this.breathState === 'hold' && !this.isRestingState) {
      // Pulse golden singularity
      coreSize = (this.isLogoMode ? 5 : 16) + Math.sin(this.time * 12) * (this.isLogoMode ? 1.0 : 3.5);
      coreColor = 'rgba(255, 209, 102, 0.5)';
    } else if (this.breathState === 'exhale') {
      coreSize = (this.isLogoMode ? 5 : 16) * (1 - this.breathProgress);
      coreColor = 'rgba(189, 178, 255, 0.4)';
    }

    if (coreSize > 0.5) {
      const coreGrad = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize * 2.8);
      coreGrad.addColorStop(0, coreColor);
      coreGrad.addColorStop(0.3, coreColor.replace('0.5', '0.15').replace('0.45', '0.15').replace('0.4', '0.12'));
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = coreGrad;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, coreSize * 2.8, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 5. Draw Swirling Vortex Particles
    // Perspective squash: Y coordinates compressed by 0.45 (1.0 in logo mode for circular symmetry)
    const squashFactor = this.isLogoMode ? 1.0 : 0.45; 

    this.vortexParticles.forEach(p => {
      // Calculate coordinates relative to center
      const projX = centerX + Math.cos(p.angle) * p.radius;
      const projY = centerY + Math.sin(p.angle) * p.radius * squashFactor;

      // Glow effect for larger particles or when close to core
      const maxRadius = this.isLogoMode ? 40 : 160;
      const distanceRatio = 1 - Math.min(p.radius / maxRadius, 1);
      const intensity = p.alpha * (0.8 + 0.2 * distanceRatio);

      // Generate color string dynamically
      const colorStr = `rgba(${Math.round(p.color.r)}, ${Math.round(p.color.g)}, ${Math.round(p.color.b)}, ${intensity})`;

      this.ctx.fillStyle = colorStr;
      
      // Shadow glow for core particles to look extra premium (only if not logo mode for performance)
      if (!this.isLogoMode && p.radius < 40 && (this.breathState === 'inhale' || this.breathState === 'hold')) {
        this.ctx.shadowBlur = 3;
        this.ctx.shadowColor = colorStr;
      }

      this.ctx.beginPath();
      // Particles scale up slightly as they approach the center
      const scaleSize = p.size * (1 + 0.6 * distanceRatio);
      this.ctx.arc(projX, projY, scaleSize, 0, Math.PI * 2);
      this.ctx.fill();

      // Reset shadows
      if (!this.isLogoMode) {
        this.ctx.shadowBlur = 0;
      }
    });
  }

  /**
   * Destroys listeners on close
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
  }
}

// Instantiate and export globally
window.meditationCanvas = new MeditationCanvas();
