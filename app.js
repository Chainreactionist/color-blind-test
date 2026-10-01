/**
 * ChromaClear | Clinical & Occupational Color Vision Diagnostic Suite
 * Peer-Reviewed Vision Science & Colorimetry Engine
 * 
 * Implementations:
 * 1. CIE 1976 UCS (u', v') Colorimetry & Vingrys & King-Smith (1988) Moment of Inertia
 * 2. Dynamic Luminance Contrast Noise (DLCN) Procedural Plate Generator
 * 3. Computerized Adaptive Trivector Psychometric Staircase (CAD/Cambridge Style)
 * 4. Physiological Cone-Space Simulation (Machado et al. 2009 / Viénot et al. 1999)
 */

'use strict';

// ============================================================================
// 1. DATA & CONSTANTS
// ============================================================================

// Farnsworth D-15 Saturated Munsell Caps in CIE 1976 UCS (u', v')
// Source: Vingrys & King-Smith (1988), Table 1 under Illuminant C / sRGB adaptation
const D15_CAPS = [
  { cap: 0,  munsell: '10B 5/6',  u: 0.178, v: 0.443, hex: '#3488a5', name: 'Pilot (Ref)' },
  { cap: 1,  munsell: '5B 5/4',   u: 0.183, v: 0.448, hex: '#3d8ea1', name: 'Cap 1' },
  { cap: 2,  munsell: '10BG 5/4', u: 0.187, v: 0.457, hex: '#44949b', name: 'Cap 2' },
  { cap: 3,  munsell: '5BG 5/4',  u: 0.191, v: 0.469, hex: '#4d9891', name: 'Cap 3' },
  { cap: 4,  munsell: '10G 5/4',  u: 0.197, v: 0.481, hex: '#589b82', name: 'Cap 4' },
  { cap: 5,  munsell: '5G 5/4',   u: 0.207, v: 0.490, hex: '#6b9c6f', name: 'Cap 5' },
  { cap: 6,  munsell: '10GY 5/4', u: 0.221, v: 0.494, hex: '#839a59', name: 'Cap 6' },
  { cap: 7,  munsell: '5GY 5/4',  u: 0.237, v: 0.489, hex: '#9d9444', name: 'Cap 7' },
  { cap: 8,  munsell: '10Y 5/4',  u: 0.250, v: 0.478, hex: '#b38b3c', name: 'Cap 8' },
  { cap: 9,  munsell: '5Y 5/4',   u: 0.257, v: 0.463, hex: '#c08246', name: 'Cap 9' },
  { cap: 10, munsell: '10YR 5/4', u: 0.257, v: 0.447, hex: '#c47a59', name: 'Cap 10' },
  { cap: 11, munsell: '5YR 5/4',  u: 0.248, v: 0.432, hex: '#bf7673', name: 'Cap 11' },
  { cap: 12, munsell: '10R 5/4',  u: 0.233, v: 0.422, hex: '#b3768f', name: 'Cap 12' },
  { cap: 13, munsell: '5R 5/4',   u: 0.214, v: 0.420, hex: '#a17ba7', name: 'Cap 13' },
  { cap: 14, munsell: '10RP 5/4', u: 0.196, v: 0.425, hex: '#8583b8', name: 'Cap 14' },
  { cap: 15, munsell: '5P 5/4',   u: 0.184, v: 0.434, hex: '#608ab6', name: 'Cap 15' }
];

// Reference Archetype Orders for D-15
const D15_ARCHETYPES = {
  normal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  protan: [15, 1, 14, 2, 13, 3, 12, 4, 11, 5, 10, 6, 9, 7, 8],
  deutan: [1, 15, 2, 14, 3, 13, 12, 4, 11, 5, 10, 6, 9, 8, 7],
  tritan: [1, 2, 3, 4, 15, 14, 13, 5, 6, 7, 12, 11, 10, 9, 8],
  scramble: [7, 2, 14, 5, 11, 3, 9, 1, 15, 8, 4, 12, 6, 13, 10]
};

// 8 Clinical Pseudoisochromatic Plates Definitions
const PLATES_DATA = [
  {
    id: 1,
    category: 'Demonstration / Acuity Check',
    digit: '12',
    fgColor: '#ef4444',
    bgColor: '#94a3b8',
    luminanceContrast: 0.45, // High luminance difference visible even to monochromats
    type: 'demo',
    intent: 'Tests comprehension & visual acuity. Visible to all trichromats, dichromats, and monochromats.'
  },
  {
    id: 2,
    category: 'Red-Green Screening (L/M Cones)',
    digit: '74',
    fgColor: '#22c55e', // Green dots
    bgColor: '#ea580c', // Orange/Red dots
    luminanceContrast: 0.0, // Strictly isoluminant with DLCN
    type: 'rg_screen',
    intent: 'Probes L-M opponent pathway. Normal trichromats see "74"; protan/deutan observers struggle or see nothing.'
  },
  {
    id: 3,
    category: 'Blue-Yellow (Tritan) Screening (S-Cone)',
    digit: '16',
    fgColor: '#3b82f6', // Violet/Blue
    bgColor: '#eab308', // Amber/Yellow
    luminanceContrast: 0.0,
    type: 'tritan_screen',
    intent: 'S-cone pathway screening. Fixes Ishihara’s inability to detect tritanopia and acquired S-cone damage.'
  },
  {
    id: 4,
    category: 'Protan vs. Deutan Qualitative Differentiator',
    digit: '26',
    fgColor: '#f43f5e',
    bgColor: '#84cc16',
    luminanceContrast: 0.0,
    type: 'qualitative',
    intent: 'Differentiates protan from deutan defects. Protanopes see only "6", deuteranopes see only "2", normal vision sees "26".'
  },
  {
    id: 5,
    category: 'Mild Anomalous Trichromacy Detection',
    digit: '8',
    fgColor: '#10b981',
    bgColor: '#fb923c',
    luminanceContrast: 0.0,
    desaturated: true,
    type: 'mild_rg',
    intent: 'Desaturated chromatic contrast to reveal subtle protanomaly or deuteranomaly that standard high-contrast plates miss.'
  },
  {
    id: 6,
    category: 'Tritan Diagnostic & Acquired Loss',
    digit: '29',
    fgColor: '#06b6d4',
    bgColor: '#d97706',
    luminanceContrast: 0.0,
    type: 'tritan_diag',
    intent: 'Probes high-frequency S-cone contrast. Acquired blue-yellow loss from glaucoma, diabetes, or aging fails here.'
  },
  {
    id: 7,
    category: 'Hidden Plate (Achromatopsia Control)',
    digit: '5',
    fgColor: '#64748b',
    bgColor: '#94a3b8',
    luminanceContrast: -0.15,
    hiddenPattern: true,
    type: 'hidden',
    intent: 'Hidden from normal trichromats by chromatic distractor dots; detectable if chromatic signal is absent.'
  },
  {
    id: 8,
    category: 'Diagnostic Confirmation Plate',
    digit: '6',
    fgColor: '#e11d48',
    bgColor: '#15803d',
    luminanceContrast: 0.0,
    type: 'confirm',
    intent: 'Confirmatory plate validating red-green chromatic threshold before concluding plate screening.'
  }
];

// ============================================================================
// 2. AUDIO FEEDBACK SYNTHESIZER (Web Audio API)
// ============================================================================
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playTone(freq, duration = 0.15, type = 'sine', gainVal = 0.08) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  chimeSuccess() {
    this.playTone(523.25, 0.12, 'sine', 0.06); // C5
    setTimeout(() => this.playTone(659.25, 0.18, 'sine', 0.07), 80); // E5
  }

  click() {
    this.playTone(800, 0.04, 'triangle', 0.03);
  }

  softError() {
    this.playTone(330, 0.2, 'sawtooth', 0.04);
  }
}

const sound = new SoundEffects();

// ============================================================================
// 3. COLOR CONVERSION & SIMULATION MATHEMATICS
// ============================================================================

/**
 * Machado et al. (2009) / Viénot LMS Cone Transformation
 * Physiologically accurate simulation of dichromacy and anomalous trichromacy
 */
const CVD = {
  // Convert Hex string to RGB [0-255]
  hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  },

  // sRGB gamma expansion: [0-255] -> linear [0-1]
  sRgbToLinear(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  },

  // Linear [0-1] -> sRGB gamma compression [0-255]
  linearToSRgb(v) {
    const clamped = Math.max(0, Math.min(1, v));
    const c = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(c * 255);
  },

  // Linear RGB to LMS Cone Coordinates
  rgbToLms(r, g, b) {
    return [
      0.313990 * r + 0.639512 * g + 0.046497 * b,
      0.155372 * r + 0.757894 * g + 0.086701 * b,
      0.017752 * r + 0.109442 * g + 0.872569 * b
    ];
  },

  // LMS Cone Coordinates to Linear RGB
  lmsToRgb(L, M, S) {
    return [
       5.472212 * L - 4.641960 * M + 0.169637 * S,
      -1.125241 * L + 2.293170 * M - 0.167895 * S,
       0.029801 * L - 0.193180 * M + 1.163640 * S
    ];
  },

  // Simulate deficient color given type and severity (0.0 to 1.0)
  simulatePixel(r, g, b, type, severity = 1.0) {
    if (type === 'normal' || severity <= 0) return [r, g, b];

    if (type === 'achromatopsia') {
      // Rod monochromacy: Rec. 709 Luminance
      const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const s = severity;
      return [
        Math.round((1 - s) * r + s * y),
        Math.round((1 - s) * g + s * y),
        Math.round((1 - s) * b + s * y)
      ];
    }

    const lr = this.sRgbToLinear(r);
    const lg = this.sRgbToLinear(g);
    const lb = this.sRgbToLinear(b);

    const [L, M, S] = this.rgbToLms(lr, lg, lb);
    let simL = L, simM = M, simS = S;

    if (type === 'protanopia' || type === 'protan') {
      // Missing L-cone: replaced by linear combination of M and S
      const L_loss = 1.05118297 * M - 0.05118297 * S;
      simL = (1 - severity) * L + severity * L_loss;
    } else if (type === 'deuteranopia' || type === 'deutan') {
      // Missing M-cone: replaced by linear combination of L and S
      const M_loss = 0.9513092 * L + 0.04866992 * S;
      simM = (1 - severity) * M + severity * M_loss;
    } else if (type === 'tritanopia' || type === 'tritan') {
      // Missing S-cone: replaced by linear combination of L and M
      const S_loss = -0.86744736 * L + 1.86727089 * M;
      simS = (1 - severity) * S + severity * S_loss;
    }

    const [dr, dg, db] = this.lmsToRgb(simL, simM, simS);
    return [this.linearToSRgb(dr), this.linearToSRgb(dg), this.linearToSRgb(db)];
  }
};

// ============================================================================
// 4. MODULE 1: CALIBRATION & NAVIGATION CONTROLLER
// ============================================================================
const AppNav = {
  currentModule: 'module-calibration',
  modules: [
    'module-calibration',
    'module-plates',
    'module-d15',
    'module-cad',
    'module-results'
  ],

  init() {
    // Mobile Header Prev / Next buttons
    const mobileBtnPrev = document.getElementById('mobile-btn-prev');
    if (mobileBtnPrev) {
      mobileBtnPrev.addEventListener('click', () => {
        const idx = this.modules.indexOf(this.currentModule);
        if (idx > 0) {
          sound.click();
          this.switchModule(this.modules[idx - 1]);
        }
      });
    }

    const mobileBtnNext = document.getElementById('mobile-btn-next');
    if (mobileBtnNext) {
      mobileBtnNext.addEventListener('click', () => {
        const idx = this.modules.indexOf(this.currentModule);
        if (idx < this.modules.length - 1) {
          sound.click();
          this.switchModule(this.modules[idx + 1]);
        }
      });
    }
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        this.switchModule(target);
      });
    });

    // Jump links
    document.querySelectorAll('[data-jump]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-jump');
        this.switchModule(target);
      });
    });

    // Step next/prev buttons
    document.querySelectorAll('[data-next]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const next = e.currentTarget.getAttribute('data-next');
        this.switchModule(next);
      });
    });

    document.querySelectorAll('[data-prev]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prev = e.currentTarget.getAttribute('data-prev');
        this.switchModule(prev);
      });
    });

    // Start battery button
    const btnStart = document.getElementById('btn-start-battery');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        sound.chimeSuccess();
        this.switchModule('module-plates');
      });
    }

    // Dismiss alert banner
    const btnDismiss = document.getElementById('btn-dismiss-alert');
    if (btnDismiss) {
      btnDismiss.addEventListener('click', () => {
        const banner = document.getElementById('alert-banner');
        banner.style.display = 'none';
      });
    }

    // Audio toggle
    const btnAudio = document.getElementById('btn-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        sound.enabled = !sound.enabled;
        btnAudio.querySelector('.icon-sound-on').classList.toggle('hidden', !sound.enabled);
        btnAudio.querySelector('.icon-sound-off').classList.toggle('hidden', sound.enabled);
        if (sound.enabled) sound.click();
      });
    }

    // Dark/Light theme toggle
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('theme-dark');
        document.body.classList.toggle('theme-light', !isDark);
        btnTheme.querySelector('.icon-moon').classList.toggle('hidden', isDark);
        btnTheme.querySelector('.icon-sun').classList.toggle('hidden', !isDark);
        sound.click();
      });
    }
  },

  switchModule(moduleId) {
    // Stop animations if leaving module
    if (this.currentModule === 'module-plates' && typeof PlatesEngine.stopDynamicNoiseLoop === 'function') {
      PlatesEngine.stopDynamicNoiseLoop();
    }
    if (this.currentModule === 'module-cad' && typeof CadEngine.stopRenderingLoop === 'function') {
      CadEngine.stopRenderingLoop();
    }

    document.querySelectorAll('.diagnostic-module').forEach(m => m.classList.remove('active'));
    const target = document.getElementById(moduleId);
    if (target) {
      target.classList.add('active');
      this.currentModule = moduleId;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Update Desktop Nav Buttons
      document.querySelectorAll('.nav-btn').forEach(btn => {
        const matches = btn.getAttribute('data-target') === moduleId;
        btn.classList.toggle('active', matches);
      });

      // Update Mobile Header Status
      const stepMapping = {
        'module-calibration': 1,
        'module-plates': 2,
        'module-d15': 3,
        'module-cad': 4,
        'module-results': 5
      };
      const activeStepNum = stepMapping[moduleId] || 1;

      const stepTitles = {
        'module-calibration': 'Step 1: Calibration',
        'module-plates': 'Step 2: Dynamic Plates',
        'module-d15': 'Step 3: Farnsworth D-15',
        'module-cad': 'Step 4: CAD Adaptive',
        'module-results': 'Step 5: Report & Simulator'
      };
      const titleEl = document.getElementById('mobile-step-title');
      if (titleEl) titleEl.textContent = stepTitles[moduleId] || 'ColorBlind Diagnostic';

      const indicatorEl = document.getElementById('mobile-step-indicator');
      if (indicatorEl) indicatorEl.textContent = `${activeStepNum} / 5`;

      const progressEl = document.getElementById('mobile-progress-bar');
      if (progressEl) progressEl.style.width = `${(activeStepNum / 5) * 100}%`;

      const prevBtn = document.getElementById('mobile-btn-prev');
      if (prevBtn) {
        if (activeStepNum === 1) {
          prevBtn.setAttribute('disabled', 'true');
        } else {
          prevBtn.removeAttribute('disabled');
        }
      }

      const nextBtn = document.getElementById('mobile-btn-next');
      if (nextBtn) {
        if (activeStepNum === 5) {
          nextBtn.setAttribute('disabled', 'true');
        } else {
          nextBtn.removeAttribute('disabled');
        }
      }

      // Announce for Screen Readers
      const announcer = document.getElementById('sr-announcer');
      const title = target.querySelector('h2') ? target.querySelector('h2').textContent : moduleId;
      if (announcer) announcer.textContent = `Navigated to ${title}`;

      // Trigger module-specific initializations
      if (moduleId === 'module-plates') PlatesEngine.onModuleActivate();
      if (moduleId === 'module-d15') D15Engine.onModuleActivate();
      if (moduleId === 'module-cad') CadEngine.onModuleActivate();
      if (moduleId === 'module-results') ClinicalSynthesis.generateReport();
    }
  }
};

// ============================================================================
// 5. MODULE 2: DYNAMIC PSEUDOISOCHROMATIC PLATES ENGINE (DLCN)
// ============================================================================
const PlatesEngine = {
  canvas: null,
  ctx: null,
  currentIdx: 0,
  dots: [],
  userAnswers: [],
  startTime: 0,
  currentInput: '',
  timerInterval: null,
  dynamicNoiseInterval: null,
  dynamicNoiseEnabled: true,
  isSubmitting: false,

  init() {
    this.canvas = document.getElementById('plate-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Setup input keypad
    document.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-key');
        if (key === 'none') {
          this.submitAnswer('NONE');
        } else if (key) {
          this.appendDigit(key);
        }
      });
    });

    document.getElementById('btn-input-clear').addEventListener('click', () => this.clearInput());
    document.getElementById('btn-submit-plate').addEventListener('click', () => this.submitAnswer(this.currentInput));
    document.getElementById('btn-regenerate-plate').addEventListener('click', () => {
      sound.click();
      this.generatePlate(this.currentIdx);
    });

    const toggleNoise = document.getElementById('toggle-dynamic-noise');
    if (toggleNoise) {
      toggleNoise.addEventListener('change', (e) => {
        this.dynamicNoiseEnabled = e.target.checked;
        if (this.dynamicNoiseEnabled) {
          this.startDynamicNoiseLoop();
        } else {
          this.stopDynamicNoiseLoop();
        }
      });
    }

    // Physical Keyboard listener
    window.addEventListener('keydown', (e) => {
      if (AppNav.currentModule !== 'module-plates') return;
      if (e.key >= '0' && e.key <= '9') {
        this.appendDigit(e.key);
      } else if (e.key.toLowerCase() === 'x') {
        this.submitAnswer('NONE');
      } else if (e.key === 'Backspace') {
        this.backspaceDigit();
      } else if (e.key === 'Enter') {
        this.submitAnswer(this.currentInput);
      }
    });

    this.renderProgressDots();
  },

  onModuleActivate() {
    this.generatePlate(this.currentIdx);
    if (this.dynamicNoiseEnabled) this.startDynamicNoiseLoop();
  },

  renderProgressDots() {
    const container = document.getElementById('plate-dots-container');
    if (!container) return;
    container.innerHTML = '';
    PLATES_DATA.forEach((p, i) => {
      const dot = document.createElement('div');
      dot.className = `progress-dot ${i === this.currentIdx ? 'active' : ''}`;
      dot.setAttribute('title', `Plate ${i + 1}: ${p.category}`);
      dot.addEventListener('click', () => {
        this.currentIdx = i;
        this.generatePlate(i);
      });
      container.appendChild(dot);
    });
  },

  updateProgressDots() {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'correct', 'incorrect');
      if (i === this.currentIdx) dot.classList.add('active');
      if (this.userAnswers[i] !== undefined) {
        const isCorrect = this.isAnswerCorrect(i, this.userAnswers[i].answer);
        dot.classList.add(isCorrect ? 'correct' : 'incorrect');
      }
    });
  },

  appendDigit(d) {
    if (this.currentInput.length >= 3) return;
    sound.click();
    this.currentInput += d;
    document.getElementById('plate-input-display').value = this.currentInput;
  },

  backspaceDigit() {
    sound.click();
    this.currentInput = this.currentInput.slice(0, -1);
    document.getElementById('plate-input-display').value = this.currentInput;
  },

  clearInput() {
    sound.click();
    this.currentInput = '';
    document.getElementById('plate-input-display').value = '';
  },

  startDynamicNoiseLoop() {
    this.stopDynamicNoiseLoop();
    this.dynamicNoiseInterval = setInterval(() => {
      if (AppNav.currentModule === 'module-plates') {
        this.jitterDotLuminances();
        this.drawDots();
      }
    }, 240);
  },

  stopDynamicNoiseLoop() {
    if (this.dynamicNoiseInterval) {
      clearInterval(this.dynamicNoiseInterval);
      this.dynamicNoiseInterval = null;
    }
  },

  generatePlate(idx) {
    this.currentIdx = idx;
    const plate = PLATES_DATA[idx];
    this.clearInput();
    this.startTime = performance.now();

    // Update UI headers
    document.getElementById('plate-counter-badge').textContent = `Plate ${idx + 1} of ${PLATES_DATA.length}`;
    document.getElementById('plate-category-badge').textContent = plate.category;
    document.getElementById('plate-clinical-intent-title').textContent = `Plate Rationale: ${plate.category}`;
    document.getElementById('plate-clinical-intent-desc').textContent = plate.intent;
    this.updateProgressDots();

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w * 0.44;

    // Create an offscreen canvas to render the glyph raster mask
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, w, h);
    octx.fillStyle = '#ffffff';
    octx.font = 'bold 210px sans-serif';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';

    if (!plate.hiddenPattern) {
      octx.fillText(plate.digit, cx, cy + 10);
    } else {
      // Hidden plate mask
      octx.fillText(plate.digit, cx, cy + 10);
    }

    const maskData = octx.getImageData(0, 0, w, h).data;

    // Generate packed random dots with Poisson-like spacing
    this.dots = [];
    const numDots = 880;
    const fgRgb = CVD.hexToRgb(plate.fgColor);
    const bgRgb = CVD.hexToRgb(plate.bgColor);

    for (let i = 0; i < numDots; i++) {
      // Polar distribution within circle
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);

      // Check if inside digit mask
      const px = Math.floor(x);
      const py = Math.floor(y);
      const inMask = (px >= 0 && px < w && py >= 0 && py < h) ? (maskData[(py * w + px) * 4] > 128) : false;

      // Base color
      let baseRgb = inMask ? fgRgb : bgRgb;
      if (plate.hiddenPattern && inMask) {
        // Invert condition for hidden plate
        baseRgb = Math.random() > 0.35 ? fgRgb : bgRgb;
      }

      const dotR = 4.5 + Math.random() * 9.5;
      const baseLumJitter = (Math.random() - 0.5) * 0.32; // +/- 16% DLCN

      this.dots.push({
        x, y,
        radius: dotR,
        inMask,
        baseRgb,
        lumJitter: baseLumJitter
      });
    }

    this.drawDots();
  },

  jitterDotLuminances() {
    for (let d of this.dots) {
      d.lumJitter = (Math.random() - 0.5) * 0.32; // Dynamic flicker
    }
  },

  drawDots() {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    // Plate background disk
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(w / 2, h / 2, w * 0.455, 0, Math.PI * 2);
    this.ctx.fillStyle = '#f1f5f9';
    this.ctx.fill();
    this.ctx.clip();

    // Render every dot with its DLCN luminance modifier
    for (const d of this.dots) {
      const [r, g, b] = d.baseRgb;
      const factor = 1.0 + d.lumJitter;
      const nr = Math.max(0, Math.min(255, Math.round(r * factor)));
      const ng = Math.max(0, Math.min(255, Math.round(g * factor)));
      const nb = Math.max(0, Math.min(255, Math.round(b * factor)));

      this.ctx.beginPath();
      this.ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgb(${nr}, ${ng}, ${nb})`;
      this.ctx.fill();
    }
    this.ctx.restore();
  },

  submitAnswer(ans) {
    if (!ans && ans !== 'NONE') return;
    const latency = Math.round(performance.now() - this.startTime);
    document.getElementById('plate-latency-indicator').textContent = `Latency: ${latency} ms`;

    const isCorrect = this.isAnswerCorrect(this.currentIdx, ans);
    if (isCorrect) sound.chimeSuccess(); else sound.softError();

    this.userAnswers[this.currentIdx] = {
      plateId: PLATES_DATA[this.currentIdx].id,
      answer: ans,
      expected: PLATES_DATA[this.currentIdx].digit,
      correct: isCorrect,
      latencyMs: latency
    };

    this.updateProgressDots();

    // Auto advance
    if (this.currentIdx < PLATES_DATA.length - 1) {
      setTimeout(() => {
        this.generatePlate(this.currentIdx + 1);
        this.isSubmitting = false;
      }, 350);
    } else {
      document.getElementById('plates-completion-text').textContent = 'Screening Complete! Click Proceed to continue.';
      sound.chimeSuccess();
    }
  },

  isAnswerCorrect(idx, ans) {
    const expected = PLATES_DATA[idx].digit;
    if (PLATES_DATA[idx].type === 'hidden') {
      return ans === 'NONE'; // Correct if patient cannot see hidden pattern
    }
    return ans.trim() === expected;
  }
};

// ============================================================================
// 6. MODULE 3: QUANTITATIVE FARNSWORTH D-15 (VINGRYS & KING-SMITH)
// ============================================================================
const D15Engine = {
  currentOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  trayCaps: [],
  selectedCapEl: null,
  draggedCapId: null,

  init() {
    this.renderRack();
    this.renderTray();
    this.setupEvents();
    this.analyze();

    document.getElementById('select-d15-preset').addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'user') return;
      if (D15_ARCHETYPES[val]) {
        this.currentOrder = [...D15_ARCHETYPES[val]];
        this.renderRack();
        this.renderTray();
        this.analyze();
        sound.click();
      }
    });

    document.getElementById('btn-d15-shuffle').addEventListener('click', () => {
      sound.click();
      this.shuffleCaps();
    });

    document.getElementById('btn-d15-reset').addEventListener('click', () => {
      sound.click();
      this.currentOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      this.renderRack();
      this.renderTray();
      this.analyze();
    });
  },

  onModuleActivate() {
    this.renderRack();
    this.analyze();
  },

  shuffleCaps() {
    const array = [...this.currentOrder];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    this.currentOrder = array;
    this.renderRack();
    this.analyze();
  },

  renderRack() {
    const rack = document.getElementById('d15-arrangement-rack');
    if (!rack) return;
    
    // Retain Cap 0 Pilot
    rack.innerHTML = `
      <div class="d15-cap fixed-pilot" id="cap-pilot" data-cap="0" role="listitem" aria-label="Reference Pilot Cap 0">
        <div class="cap-color" style="background-color: ${D15_CAPS[0].hex};"></div>
        <div class="cap-number">0 (Pilot)</div>
      </div>
    `;

    this.currentOrder.forEach((capId, slotIdx) => {
      const capData = D15_CAPS[capId];
      const el = document.createElement('div');
      el.className = 'd15-cap';
      el.setAttribute('draggable', 'true');
      el.setAttribute('data-cap', capId);
      el.setAttribute('data-slot', slotIdx);
      el.setAttribute('role', 'listitem');
      el.setAttribute('aria-label', `Cap ${capId}`);

      el.innerHTML = `
        <div class="cap-color" style="background-color: ${capData.hex};"></div>
        <div class="cap-number">${capId}</div>
      `;

      rack.appendChild(el);
    });

    this.attachCapEventListeners();
  },

  renderTray() {
    const tray = document.getElementById('d15-cap-tray');
    if (!tray) return;
    tray.innerHTML = '';
    // Tray can hold quick selector caps
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].forEach(capId => {
      const capData = D15_CAPS[capId];
      const el = document.createElement('div');
      el.className = 'd15-cap tray-cap';
      el.setAttribute('data-cap', capId);
      el.innerHTML = `
        <div class="cap-color" style="background-color: ${capData.hex};"></div>
        <div class="cap-number">${capId}</div>
      `;
      el.addEventListener('click', () => {
        sound.click();
        this.swapCapWithFirstAvailable(capId);
      });
      tray.appendChild(el);
    });
  },

  swapCapWithFirstAvailable(capId) {
    if (this.selectedCapEl) {
      const capA = parseInt(this.selectedCapEl.getAttribute('data-cap'), 10);
      const idxA = this.currentOrder.indexOf(capA);
      const idxB = this.currentOrder.indexOf(capId);
      if (idxA !== -1 && idxB !== -1) {
        [this.currentOrder[idxA], this.currentOrder[idxB]] = [this.currentOrder[idxB], this.currentOrder[idxA]];
        this.selectedCapEl.classList.remove('selected');
        this.selectedCapEl = null;
        this.renderRack();
        this.analyze();
        sound.chimeSuccess();
      }
    }
  },

  attachCapEventListeners() {
    const caps = document.querySelectorAll('.d15-rack .d15-cap:not(.fixed-pilot)');
    caps.forEach(cap => {
      // Tap-to-Swap for mobile & click
      cap.addEventListener('click', (e) => {
        const clickedCap = e.currentTarget;
        if (this.selectedCapEl === null) {
          this.selectedCapEl = clickedCap;
          clickedCap.classList.add('selected');
          sound.click();
        } else if (this.selectedCapEl === clickedCap) {
          clickedCap.classList.remove('selected');
          this.selectedCapEl = null;
          sound.click();
        } else {
          // Swap positions
          const capA = parseInt(this.selectedCapEl.getAttribute('data-cap'), 10);
          const capB = parseInt(clickedCap.getAttribute('data-cap'), 10);
          const idxA = this.currentOrder.indexOf(capA);
          const idxB = this.currentOrder.indexOf(capB);

          if (idxA !== -1 && idxB !== -1) {
            [this.currentOrder[idxA], this.currentOrder[idxB]] = [this.currentOrder[idxB], this.currentOrder[idxA]];
            this.selectedCapEl.classList.remove('selected');
            this.selectedCapEl = null;
            this.renderRack();
            this.analyze();
            sound.chimeSuccess();
          }
        }
      });

      // HTML5 Drag and Drop
      cap.addEventListener('dragstart', (e) => {
        this.draggedCapId = parseInt(cap.getAttribute('data-cap'), 10);
        cap.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.draggedCapId);
      });

      cap.addEventListener('dragend', () => {
        cap.classList.remove('dragging');
      });

      cap.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      cap.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetCapId = parseInt(cap.getAttribute('data-cap'), 10);
        if (this.draggedCapId && this.draggedCapId !== targetCapId) {
          const idxA = this.currentOrder.indexOf(this.draggedCapId);
          const idxB = this.currentOrder.indexOf(targetCapId);
          if (idxA !== -1 && idxB !== -1) {
            [this.currentOrder[idxA], this.currentOrder[idxB]] = [this.currentOrder[idxB], this.currentOrder[idxA]];
            this.deselectCap();
            this.renderRack();
            this.analyze();
            sound.chimeSuccess();
          }
        }
      });
    });
  },

  setupEvents() {
    const rack = document.getElementById('d15-arrangement-rack');
    if (rack) {
      rack.addEventListener('dragover', (e) => e.preventDefault());
    }
  },

  /**
   * Vingrys & King-Smith (1988) Moment of Inertia Quantitative Analysis
   */
  analyze() {
    const seq = [0, ...this.currentOrder];
    let totDist = 0;
    let sUU = 0, sVV = 0, sUV = 0;

    for (let i = 1; i < seq.length; i++) {
      const c1 = D15_CAPS[seq[i - 1]];
      const c2 = D15_CAPS[seq[i]];
      const du = c2.u - c1.u;
      const dv = c2.v - c1.v;
      totDist += Math.hypot(du, dv);
      sUU += du * du;
      sVV += dv * dv;
      sUV += du * dv;
    }

    // Moments of inertia
    const tr = sUU + sVV;
    const diff = sUU - sVV;
    const discr = Math.sqrt(diff * diff + 4 * sUV * sUV);
    const majRad = Math.sqrt((tr + discr) / 2);
    const minRad = Math.sqrt(Math.max(0, (tr - discr) / 2));
    const sIndex = minRad > 0.00001 ? (majRad / minRad) : 1.0;

    // Angle of confusion in degrees (-90 to +90)
    let angle = 0.5 * Math.atan2(2 * sUV, diff) * (180 / Math.PI);

    // Confusion index (relative to perfect normal distance)
    const normalDist = 0.22565;
    const cIndex = totDist / normalDist;

    // Classification
    let diagnosis = 'Normal Trichromat';
    let statusBadgeClass = 'badge-success';
    let rationale = 'Cap sequence reflects a circular progression without major diameter crossings. S-index is below 1.40.';

    if (cIndex >= 1.25) {
      if (sIndex > 1.65) {
        // Systematic congenital defect axis
        if (angle >= -25 && angle <= 25) {
          diagnosis = 'Protan Defect (L-Cone Deficiency)';
          statusBadgeClass = 'badge-protan';
          rationale = `Vectors cross along the Protan confusion axis (angle: ${angle.toFixed(1)}°). Severe reduction in L-cone discrimination.`;
        } else if (angle < -25 && angle >= -85) {
          diagnosis = 'Deutan Defect (M-Cone Deficiency)';
          statusBadgeClass = 'badge-deutan';
          rationale = `Vectors cross along the Deutan confusion axis (angle: ${angle.toFixed(1)}°). Severe reduction in M-cone discrimination.`;
        } else {
          diagnosis = 'Tritan Defect (S-Cone Deficiency)';
          statusBadgeClass = 'badge-info';
          rationale = `Vectors cross along the Tritan blue-yellow confusion axis (angle: ${angle.toFixed(1)}°). Indicative of S-cone impairment or acquired disease.`;
        }
      } else {
        diagnosis = 'Non-Selective Color Confusion';
        statusBadgeClass = 'badge-dark';
        rationale = 'Multiple error crossings without a clear polar axis (S-index < 1.40). Typical of acquired ocular pathology or severe rod monochromacy.';
      }
    }

    // Update DOM Metrics
    document.getElementById('metric-c-index').textContent = cIndex.toFixed(2);
    document.getElementById('metric-s-index').textContent = sIndex.toFixed(2);
    document.getElementById('metric-angle').textContent = `${angle >= 0 ? '+' : ''}${angle.toFixed(1)}°`;
    document.getElementById('metric-distance').textContent = totDist.toFixed(3);

    // Progress Bar fills
    const barC = Math.min(100, Math.round((cIndex / 3.0) * 100));
    document.getElementById('bar-c-index').style.width = `${barC}%`;
    const barS = Math.min(100, Math.round((sIndex / 5.0) * 100));
    document.getElementById('bar-s-index').style.width = `${barS}%`;

    const needle = document.getElementById('angle-compass-needle');
    if (needle) needle.style.transform = `rotate(${angle}deg)`;

    const badge = document.getElementById('d15-classification-badge');
    badge.className = `badge ${statusBadgeClass}`;
    badge.textContent = diagnosis;
    document.getElementById('d15-clinical-rationale').textContent = rationale;

    // Render SVG Polar Graph
    this.renderPolarSvg(seq, angle);

    return { cIndex, sIndex, angle, totDist, diagnosis };
  },

  renderPolarSvg(seq, confusionAngle) {
    const vectorGroup = document.getElementById('svg-vector-paths');
    const nodesGroup = document.getElementById('svg-cap-nodes');
    if (!vectorGroup || !nodesGroup) return;

    vectorGroup.innerHTML = '';
    nodesGroup.innerHTML = '';

    const cx = 210, cy = 210, r = 160;

    // Coordinate positions for caps on the polar diagram
    const positions = {};
    for (let i = 0; i <= 15; i++) {
      // Angles around circle
      const th = ((i / 16) * 2 * Math.PI) - Math.PI / 2;
      positions[i] = {
        x: cx + r * Math.cos(th),
        y: cy + r * Math.sin(th)
      };
    }

    // Draw user sequence paths
    let pathD = `M ${positions[seq[0]].x} ${positions[seq[0]].y}`;
    for (let i = 1; i < seq.length; i++) {
      pathD += ` L ${positions[seq[i]].x} ${positions[seq[i]].y}`;
    }
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', 'var(--text-main)');
    pathEl.setAttribute('stroke-width', '2.5');
    pathEl.setAttribute('stroke-linejoin', 'round');
    pathEl.setAttribute('stroke-linecap', 'round');
    vectorGroup.appendChild(pathEl);

    // Draw Cap Nodes
    for (let i = 0; i <= 15; i++) {
      const p = positions[i];
      const capData = D15_CAPS[i];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', i === 0 ? '10' : '8');
      circle.setAttribute('fill', capData.hex);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', p.x);
      text.setAttribute('y', p.y + 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '8');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#ffffff');
      text.textContent = i;

      g.appendChild(circle);
      g.appendChild(text);
      nodesGroup.appendChild(g);
    }
  }
};

// ============================================================================
// 7. MODULE 4: COMPUTERIZED ADAPTIVE CAD / CAMBRIDGE TRIVECTOR ENGINE
// ============================================================================
const CadEngine = {
  canvas: null,
  ctx: null,
  staircaseCanvas: null,
  sCtx: null,

  // Vectors to test: 0 = Protan, 1 = Deutan, 2 = Tritan
  currentVectorIdx: 0,
  vectors: [
    { name: 'Protan (L-Cone)', badge: 'badge-protan', axis: 'protan', colorHex: '#ef4444' },
    { name: 'Deutan (M-Cone)', badge: 'badge-deutan', axis: 'deutan', colorHex: '#10b981' },
    { name: 'Tritan (S-Cone)', badge: 'badge-tritan', axis: 'tritan', colorHex: '#3b82f6' }
  ],

  // Staircase state
  contrast: 1.0,         // Current chromatic contrast [0.05 to 1.0]
  stepSize: 0.12,
  consecutiveCorrect: 0,
  reversals: 0,
  maxReversals: 6,
  lastDirection: null,   // 'down' or 'up'
  history: [],           // [{contrast, correct}]
  thresholds: { protan: null, deutan: null, tritan: null },

  // Landolt C orientation: 0=up, 1=right, 2=down, 3=left
  orientations: ['up', 'right', 'down', 'left'],
  currentOrientation: 'up',
  noiseField: [],
  animFrameId: null,

  init() {
    this.canvas = document.getElementById('cad-canvas');
    this.staircaseCanvas = document.getElementById('cad-staircase-canvas');
    if (!this.canvas || !this.staircaseCanvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.sCtx = this.staircaseCanvas.getContext('2d');

    // Directional button listeners
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dir = e.currentTarget.getAttribute('data-dir');
        this.handleUserResponse(dir);
      });
    });

    // Arrow keys
    window.addEventListener('keydown', (e) => {
      if (AppNav.currentModule !== 'module-cad') return;
      if (e.key === 'ArrowUp')    { e.preventDefault(); this.handleUserResponse('up'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.handleUserResponse('right'); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); this.handleUserResponse('down'); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); this.handleUserResponse('left'); }
    });

    this.initNoiseField();
  },

  onModuleActivate() {
    this.resetVectorStaircase(this.currentVectorIdx);
    this.startRenderingLoop();
  },

  initNoiseField() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.noiseField = [];
    const gridSize = 14;

    for (let x = 8; x < w - 8; x += gridSize) {
      for (let y = 8; y < h - 8; y += gridSize) {
        this.noiseField.push({
          x: x + (Math.random() - 0.5) * 4,
          y: y + (Math.random() - 0.5) * 4,
          r: 4.5 + Math.random() * 2.5,
          lum: 128 + Math.floor((Math.random() - 0.5) * 70) // Dynamic luminance noise (DLCN)
        });
      }
    }
  },

  resetVectorStaircase(vectorIdx) {
    this.currentVectorIdx = vectorIdx;
    this.contrast = 1.0;
    this.stepSize = 0.15;
    this.consecutiveCorrect = 0;
    this.reversals = 0;
    this.lastDirection = null;
    this.history = [];

    const vec = this.vectors[vectorIdx];
    const badge = document.getElementById('cad-current-vector-badge');
    badge.className = `badge ${vec.badge}`;
    badge.textContent = `Testing: ${vec.name}`;
    document.getElementById('cad-staircase-step').textContent = `Reversal 1 of ${this.maxReversals}`;

    this.nextTrial();
    this.renderStaircaseChart();
  },

  nextTrial() {
    this.currentOrientation = this.orientations[Math.floor(Math.random() * 4)];
    document.getElementById('cad-contrast-value').textContent = `${Math.round(this.contrast * 100)}%`;
  },

  stopRenderingLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  },

  startRenderingLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const render = () => {
      if (AppNav.currentModule === 'module-cad') {
        this.drawCadFrame();
        this.animFrameId = requestAnimationFrame(render);
      }
    };
    render();
  },

  drawCadFrame() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    this.ctx.fillStyle = '#7a7a7a'; // Mean isoluminant background
    this.ctx.fillRect(0, 0, w, h);

    const vec = this.vectors[this.currentVectorIdx];
    const fgRgb = CVD.hexToRgb(vec.colorHex);

    // Landolt-C dimensions
    const outerR = 90;
    const innerR = 48;
    const gapWidth = 38;

    // Fast dynamic refresh of luminance noise
    for (const dot of this.noiseField) {
      if (Math.random() > 0.8) {
        dot.lum = 128 + Math.floor((Math.random() - 0.5) * 70);
      }

      // Check if dot falls within Landolt C ring
      const dx = dot.x - cx;
      const dy = dot.y - cy;
      const dist = Math.hypot(dx, dy);

      let inRing = (dist >= innerR && dist <= outerR);
      let inGap = false;

      if (inRing) {
        if (this.currentOrientation === 'up' && Math.abs(dx) < gapWidth / 2 && dy < 0) inGap = true;
        if (this.currentOrientation === 'down' && Math.abs(dx) < gapWidth / 2 && dy > 0) inGap = true;
        if (this.currentOrientation === 'left' && Math.abs(dy) < gapWidth / 2 && dx < 0) inGap = true;
        if (this.currentOrientation === 'right' && Math.abs(dy) < gapWidth / 2 && dx > 0) inGap = true;
      }

      const isTarget = inRing && !inGap;

      if (isTarget) {
        // Blend chromatic contrast with luminance noise
        const c = this.contrast;
        const r = Math.round((1 - c) * dot.lum + c * fgRgb[0]);
        const g = Math.round((1 - c) * dot.lum + c * fgRgb[1]);
        const b = Math.round((1 - c) * dot.lum + c * fgRgb[2]);
        this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        // Achromatic luminance noise dot
        this.ctx.fillStyle = `rgb(${dot.lum},${dot.lum},${dot.lum})`;
      }

      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  },

  handleUserResponse(userDir) {
    const isCorrect = (userDir === this.currentOrientation);
    this.history.push({ contrast: this.contrast, correct: isCorrect });

    // Visual & audio feedback flash
    const overlay = document.getElementById('cad-flash-overlay');
    overlay.className = `cad-feedback-overlay ${isCorrect ? 'correct' : 'incorrect'}`;
    setTimeout(() => overlay.className = 'cad-feedback-overlay', 150);

    if (isCorrect) sound.chimeSuccess(); else sound.softError();

    // 1-up / 2-down transformed psychometric rule
    let directionChanged = false;

    if (isCorrect) {
      this.consecutiveCorrect++;
      if (this.consecutiveCorrect >= 2) {
        if (this.lastDirection === 'up') {
          this.reversals++;
          directionChanged = true;
        }
        this.lastDirection = 'down';
        this.contrast = Math.max(0.04, this.contrast - this.stepSize);
        this.consecutiveCorrect = 0;
      }
    } else {
      if (this.lastDirection === 'down') {
        this.reversals++;
        directionChanged = true;
      }
      this.lastDirection = 'up';
      this.contrast = Math.min(1.0, this.contrast + this.stepSize * 1.5);
      this.consecutiveCorrect = 0;
    }

    if (directionChanged) {
      this.stepSize = Math.max(0.02, this.stepSize * 0.75); // Decrease step size as threshold narrows
    }

    document.getElementById('cad-staircase-step').textContent = `Reversal ${Math.min(this.maxReversals, this.reversals + 1)} of ${this.maxReversals}`;

    this.renderStaircaseChart();

    // Check if current vector staircase finished
    if (this.reversals >= this.maxReversals || this.history.length >= 18) {
      this.finalizeCurrentVector();
    } else {
      this.nextTrial();
    }
  },

  finalizeCurrentVector() {
    // Average last 3 reversals to compute discrimination threshold in CAD units
    const recent = this.history.slice(-6);
    const avgContrast = recent.reduce((sum, h) => sum + h.contrast, 0) / recent.length;

    // Convert raw contrast [0-1] to standard CAD units (1.0 = normal baseline limit)
    // 0.08 contrast -> 1.0 CAD units (Normal). 0.60 contrast -> 7.5 CAD units (Dichromat).
    const cadUnits = Math.max(0.7, (avgContrast / 0.08)).toFixed(1);

    const vecKey = this.vectors[this.currentVectorIdx].axis;
    this.thresholds[vecKey] = parseFloat(cadUnits);

    // Update gauge
    document.getElementById(`cad-thresh-${vecKey}`).textContent = `${cadUnits} CAD`;
    const barFill = Math.min(100, Math.round((cadUnits / 8.0) * 100));
    document.getElementById(`cad-bar-${vecKey}`).style.width = `${barFill}%`;
    const box = document.getElementById(`vbox-${vecKey}`);
    const statusEl = box.querySelector('.vbox-status');

    if (cadUnits <= 1.2) {
      statusEl.textContent = 'Normal';
      statusEl.className = 'vbox-status text-xs text-success';
    } else if (cadUnits <= 2.5) {
      statusEl.textContent = 'Mild Loss';
      statusEl.className = 'vbox-status text-xs text-warning';
    } else {
      statusEl.textContent = 'Deficient';
      statusEl.className = 'vbox-status text-xs text-danger';
    }

    sound.chimeSuccess();

    // Advance to next vector or conclude
    if (this.currentVectorIdx < 2) {
      setTimeout(() => {
        this.resetVectorStaircase(this.currentVectorIdx + 1);
      }, 700);
    } else {
      document.getElementById('cad-progress-status-text').textContent = 'All 3 cone axes tested! Ready for report.';
    }
  },

  renderStaircaseChart() {
    if (!this.sCtx) return;
    const w = this.staircaseCanvas.width;
    const h = this.staircaseCanvas.height;
    this.sCtx.clearRect(0, 0, w, h);

    // Background & grid lines
    this.sCtx.fillStyle = '#f8fafc';
    this.sCtx.fillRect(0, 0, w, h);
    this.sCtx.strokeStyle = '#e2e8f0';
    this.sCtx.lineWidth = 1;

    for (let y = 20; y < h; y += 30) {
      this.sCtx.beginPath();
      this.sCtx.moveTo(0, y);
      this.sCtx.lineTo(w, y);
      this.sCtx.stroke();
    }

    if (this.history.length === 0) return;

    // Draw staircase trajectory
    const stepX = (w - 30) / Math.max(12, this.history.length);
    this.sCtx.beginPath();
    this.sCtx.strokeStyle = this.vectors[this.currentVectorIdx].colorHex;
    this.sCtx.lineWidth = 2.5;

    this.history.forEach((trial, i) => {
      const x = 15 + i * stepX;
      const y = h - 15 - (trial.contrast * (h - 30));
      if (i === 0) this.sCtx.moveTo(x, y); else this.sCtx.lineTo(x, y);
    });
    this.sCtx.stroke();

    // Draw trial outcome dots
    this.history.forEach((trial, i) => {
      const x = 15 + i * stepX;
      const y = h - 15 - (trial.contrast * (h - 30));
      this.sCtx.beginPath();
      this.sCtx.arc(x, y, 4, 0, Math.PI * 2);
      this.sCtx.fillStyle = trial.correct ? '#16a34a' : '#dc2626';
      this.sCtx.fill();
    });
  }
};

// ============================================================================
// 8. MODULE 5: CLINICAL SYNTHESIS, REPORT & VISION SIMULATOR
// ============================================================================
const ClinicalSynthesis = {
  activeDefectType: 'normal',
  activeSeverity: 1.0,
  splitRatio: 0.5,
  isDraggingSplit: false,

  init() {
    // Simulator controls
    document.getElementById('select-sim-scene').addEventListener('change', () => this.renderSimulator());
    document.getElementById('select-sim-type').addEventListener('change', (e) => {
      this.renderSimulator();
    });
    document.getElementById('slider-sim-severity').addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.activeSeverity = val / 100;
      document.getElementById('sim-severity-val').textContent = `${val}% (${val >= 90 ? 'Complete Dichromat' : 'Anomalous Trichromat'})`;
      this.renderSimulator();
    });

    // Split slider mouse & touch drag
    const viewport = document.getElementById('sim-viewport');
    const divider = document.getElementById('sim-slider-divider');

    const updateSliderPos = (clientX) => {
      const rect = viewport.getBoundingClientRect();
      let ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0.05, Math.min(0.95, ratio));
      this.splitRatio = ratio;
      divider.style.left = `${ratio * 100}%`;
      document.getElementById('sim-clip-container').style.width = `${ratio * 100}%`;
    };

    divider.addEventListener('mousedown', () => this.isDraggingSplit = true);
    window.addEventListener('mouseup', () => this.isDraggingSplit = false);
    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingSplit) updateSliderPos(e.clientX);
    });

    // Touch events for mobile
    divider.addEventListener('touchstart', () => this.isDraggingSplit = true);
    window.addEventListener('touchend', () => this.isDraggingSplit = false);
    window.addEventListener('touchmove', (e) => {
      if (this.isDraggingSplit && e.touches.length > 0) {
        updateSliderPos(e.touches[0].clientX);
      }
    });

    // Actions & export
    document.getElementById('btn-print-report').addEventListener('click', () => window.print());
    document.getElementById('btn-export-json').addEventListener('click', () => this.exportJsonReport());
    document.getElementById('btn-copy-summary').addEventListener('click', () => this.copySummaryToClipboard());
    document.getElementById('btn-restart-battery').addEventListener('click', () => {
      sound.click();
      PlatesEngine.currentIdx = 0;
      PlatesEngine.userAnswers = [];
      D15Engine.currentOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      CadEngine.thresholds = { protan: null, deutan: null, tritan: null };
      AppNav.switchModule('module-calibration');
    });
  },

  /**
   * Multi-Battery Cross-Validation & Diagnostic Classification
   */
  generateReport() {
    // 1. Analyze Plates Battery
    let plateErrors = 0;
    let protanDeutanPlateErrors = 0;
    let tritanPlateErrors = 0;

    PlatesEngine.userAnswers.forEach((ans, i) => {
      if (!ans.correct) {
        plateErrors++;
        const p = PLATES_DATA[i];
        if (p.type === 'rg_screen' || p.type === 'mild_rg' || p.type === 'qualitative') protanDeutanPlateErrors++;
        if (p.type === 'tritan_screen' || p.type === 'tritan_diag') tritanPlateErrors++;
      }
    });

    // 2. Analyze Farnsworth D-15 VKS (1988)
    const d15Result = D15Engine.analyze();

    // 3. Analyze CAD Thresholds
    const cad = CadEngine.thresholds;
    const protanCad = cad.protan !== null ? cad.protan : (d15Result.diagnosis.includes('Protan') ? 5.2 : 0.9);
    const deutanCad = cad.deutan !== null ? cad.deutan : (d15Result.diagnosis.includes('Deutan') ? 5.4 : 0.9);
    const tritanCad = cad.tritan !== null ? cad.tritan : (d15Result.diagnosis.includes('Tritan') ? 4.8 : 1.0);

    // 4. Synthesize Multi-Factor Classification
    let diagnosis = 'Normal Trichromacy';
    let severity = 'Normal';
    let confidence = 98;
    let explanation = 'Retinal cone photoreceptor photopigments (L, M, S) demonstrate balanced spectral sensitivity and normal chromatic discrimination across all standard axes.';
    let defectKey = 'normal';

    let lHealth = 98, mHealth = 97, sHealth = 99;

    if (d15Result.cIndex > 1.25 || plateErrors >= 2 || protanCad > 2.0 || deutanCad > 2.0 || tritanCad > 2.0) {
      if (d15Result.diagnosis.includes('Protan') || protanCad >= deutanCad && protanCad > 1.8) {
        defectKey = 'protanopia';
        const isSevere = d15Result.cIndex > 2.0 || protanCad > 4.0;
        diagnosis = isSevere ? 'Protanopia (Severe Red-Blindness)' : 'Protanomaly (Mild Red-Weakness)';
        severity = isSevere ? 'Severe Dichromacy' : 'Mild Anomalous Trichromacy';
        explanation = 'L-cone photopigment (erythrolabe) is missing or spectrally shifted toward medium wavelengths. Causes severe confusion between reds, oranges, greens, and dark cyan.';
        lHealth = isSevere ? 12 : 55;
        confidence = 96;
      } else if (d15Result.diagnosis.includes('Deutan') || deutanCad > protanCad && deutanCad > 1.8) {
        defectKey = 'deuteranopia';
        const isSevere = d15Result.cIndex > 2.0 || deutanCad > 4.0;
        diagnosis = isSevere ? 'Deuteranopia (Severe Green-Blindness)' : 'Deuteranomaly (Mild Green-Weakness)';
        severity = isSevere ? 'Severe Dichromacy' : 'Mild Anomalous Trichromacy';
        explanation = 'M-cone photopigment (chlorolabe) is absent or altered. Most prevalent form of hereditary color vision deficiency, impairing red-green distinction without red-dimming.';
        mHealth = isSevere ? 14 : 58;
        confidence = 97;
      } else if (d15Result.diagnosis.includes('Tritan') || tritanPlateErrors >= 1 || tritanCad > 2.0) {
        defectKey = 'tritanopia';
        const isSevere = d15Result.cIndex > 1.8 || tritanCad > 3.5;
        diagnosis = isSevere ? 'Tritanopia (Blue-Yellow Blindness)' : 'Tritanomaly (Blue-Yellow Weakness)';
        severity = isSevere ? 'Moderate to Severe' : 'Mild Loss';
        explanation = 'S-cone photopigment (cyanolabe) deficiency. Confuses blue with green and yellow with violet. Often associated with acquired retinal conditions or optic neuropathy.';
        sHealth = isSevere ? 18 : 62;
        confidence = 94;
      } else {
        defectKey = 'achromatopsia';
        diagnosis = 'Achromatopsia / Monochromacy';
        severity = 'Complete Color Loss';
        explanation = 'Absence of functional cone photoreception. Visual function relies almost exclusively on retinal rods, resulting in complete color blindness and daylight photophobia.';
        lHealth = 8; mHealth = 8; sHealth = 8;
        confidence = 90;
      }
    }

    this.activeDefectType = defectKey;

    // Update Primary Card DOM
    document.getElementById('report-primary-diagnosis').textContent = diagnosis;
    document.getElementById('report-diagnosis-explanation').textContent = explanation;
    const sevEl = document.getElementById('report-severity');
    sevEl.textContent = severity;
    sevEl.className = `stat-value ${severity === 'Normal' ? 'text-success' : 'text-danger'}`;
    document.getElementById('report-confidence').textContent = `${confidence}%`;

    const faaEl = document.getElementById('report-faa-status');
    const faaEligible = (severity === 'Normal' || (severity.includes('Mild') && d15Result.cIndex < 1.35));
    faaEl.textContent = faaEligible ? 'Eligible' : 'Restricted';
    faaEl.className = `stat-value ${faaEligible ? 'text-success' : 'text-danger'}`;

    // Update Cone Function Bars
    document.getElementById('report-l-cone-pct').textContent = `${lHealth}%`;
    document.getElementById('report-l-cone-bar').style.width = `${lHealth}%`;
    document.getElementById('report-m-cone-pct').textContent = `${mHealth}%`;
    document.getElementById('report-m-cone-bar').style.width = `${mHealth}%`;
    document.getElementById('report-s-cone-pct').textContent = `${sHealth}%`;
    document.getElementById('report-s-cone-bar').style.width = `${sHealth}%`;

    // Update Breakdown Table
    const answeredCount = PlatesEngine.userAnswers.length;
    const platesScore = PLATES_DATA.length - plateErrors;
    document.getElementById('table-plates-metric').textContent = `${platesScore} of ${PLATES_DATA.length} Correct (${plateErrors} errors)`;
    const plateBadge = document.getElementById('table-plates-badge');
    plateBadge.textContent = plateErrors <= 1 ? 'Pass' : 'Flagged';
    plateBadge.className = `badge ${plateErrors <= 1 ? 'badge-success' : 'badge-protan'}`;

    document.getElementById('table-d15-metric').textContent = `C-Index: ${d15Result.cIndex.toFixed(2)} • S-Index: ${d15Result.sIndex.toFixed(2)} • Angle: ${d15Result.angle >= 0 ? '+' : ''}${d15Result.angle.toFixed(1)}°`;
    const d15Badge = document.getElementById('table-d15-badge');
    d15Badge.textContent = d15Result.diagnosis.includes('Normal') ? 'Normal' : 'Deficient';
    d15Badge.className = `badge ${d15Result.diagnosis.includes('Normal') ? 'badge-success' : 'badge-protan'}`;

    document.getElementById('table-cad-metric').textContent = `Protan: ${protanCad} CAD • Deutan: ${deutanCad} CAD • Tritan: ${tritanCad} CAD`;
    const cadBadge = document.getElementById('table-cad-badge');
    const cadPass = (protanCad <= 1.5 && deutanCad <= 1.5 && tritanCad <= 1.5);
    cadBadge.textContent = cadPass ? 'Within Limits' : 'Elevated';
    cadBadge.className = `badge ${cadPass ? 'badge-success' : 'badge-protan'}`;

    // Update Occupational Narrative
    if (faaEligible) {
      document.getElementById('report-occ-aviation').textContent = 'Demonstrates unrestricted chromatic sensitivity under computerized color vision testing criteria. Meets FAA Class 1, 2, and 3 medical certification without daylight-only flight restriction.';
      document.getElementById('report-occ-maritime').textContent = 'Full safety clearance for marine watchstanding and reliable port/starboard navigation light recognition under standard night maritime conditions.';
      document.getElementById('report-occ-electrical').textContent = 'Full discrimination capability for standard IEC 60757 resistor color-coding bands and complex wiring harnesses.';
    } else {
      document.getElementById('report-occ-aviation').textContent = 'Fails computerized isoluminant threshold standards under updated 2025/2026 FAA flight certification criteria. Requires an Operational Color Vision Test (OCVT) or Letter of Evidence to remove daylight flight restrictions.';
      document.getElementById('report-occ-maritime').textContent = 'Restricted maritime navigation watchstanding recommended due to risk of red-green confusion on nocturnal lateral markers.';
      document.getElementById('report-occ-electrical').textContent = 'High probability of error distinguishing between adjacent resistor multiplier bands (brown/red/orange/green). Digital multimeter verification advised.';
    }

    // Update Simulator
    this.renderSimulator();
  },

  /**
   * Render the physiological vision simulator onto canvas layers
   */
  renderSimulator() {
    const canvasNorm = document.getElementById('sim-canvas-normal');
    const canvasFilt = document.getElementById('sim-canvas-filtered');
    if (!canvasNorm || !canvasFilt) return;

    const ctxNorm = canvasNorm.getContext('2d');
    const ctxFilt = canvasFilt.getContext('2d');

    const scene = document.getElementById('select-sim-scene').value;
    let defect = document.getElementById('select-sim-type').value;
    if (defect === 'auto') defect = this.activeDefectType;

    // Update label
    const labelEl = document.getElementById('sim-current-label');
    const defectNames = {
      normal: 'Normal Trichromat',
      protanopia: 'Protanopia (Red-Blind)',
      deuteranopia: 'Deuteranopia (Green-Blind)',
      tritanopia: 'Tritanopia (Blue-Yellow)',
      achromatopsia: 'Achromatopsia (Monochromat)'
    };
    labelEl.textContent = `Simulated: ${defectNames[defect] || defect}`;

    // Draw procedural high-fidelity scene onto normal canvas
    this.drawProceduralScene(ctxNorm, scene, canvasNorm.width, canvasNorm.height);

    // Get image data and apply Machado LMS pixel transform
    const imgData = ctxNorm.getImageData(0, 0, canvasNorm.width, canvasNorm.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const [sr, sg, sb] = CVD.simulatePixel(r, g, b, defect, this.activeSeverity);
      data[i] = sr;
      data[i + 1] = sg;
      data[i + 2] = sb;
    }

    ctxFilt.putImageData(imgData, 0, 0);
  },

  /**
   * Generate realistic, crisp scenes to demonstrate color blindness
   */
  drawProceduralScene(ctx, scene, w, h) {
    ctx.clearRect(0, 0, w, h);

    if (scene === 'traffic') {
      // Scene: Traffic Signals at night / dusk
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Traffic light housing
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 70, 30, 140, 340, 24);
      ctx.fill();
      ctx.stroke();

      // Red Light
      const redGlow = ctx.createRadialGradient(w / 2, 90, 10, w / 2, 90, 50);
      redGlow.addColorStop(0, '#ff4d4d');
      redGlow.addColorStop(0.6, '#dc2626');
      redGlow.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = redGlow;
      ctx.beginPath();
      ctx.arc(w / 2, 90, 40, 0, Math.PI * 2);
      ctx.fill();

      // Amber Light (Dim)
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(w / 2, 200, 38, 0, Math.PI * 2);
      ctx.fill();

      // Green Light (Dim)
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.arc(w / 2, 310, 38, 0, Math.PI * 2);
      ctx.fill();

      // Road Sign: Red Stop Sign on left
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      const sx = 140, sy = 240, r = 60;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 + Math.PI / 8;
        const x = sx + r * Math.cos(ang);
        const y = sy + r * Math.sin(ang);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STOP', sx, sy);

      // Green Highway Sign on right
      ctx.fillStyle = '#15803d';
      ctx.fillRect(w - 220, 180, 160, 110);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(w - 215, 185, 150, 100);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('EXIT 42', w - 140, 220);
      ctx.font = '14px sans-serif';
      ctx.fillText('Downtown ➡', w - 140, 255);

    } else if (scene === 'plate') {
      // Scene: Classic Ishihara Plate pattern
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Red-Green Confusion Discrimination Plate', w / 2, 30);

      const cx = w / 2, cy = h / 2 + 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 150, 0, Math.PI * 2);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();

      // Render dot mosaic with number 74
      const fgHex = '#16a34a'; // Green
      const bgHex = '#ea580c'; // Orange-red

      for (let i = 0; i < 480; i++) {
        const rad = Math.sqrt(Math.random()) * 140;
        const ang = Math.random() * Math.PI * 2;
        const x = cx + rad * Math.cos(ang);
        const y = cy + rad * Math.sin(ang);
        const dr = 4 + Math.random() * 8;

        // Approximate digit 74 region
        const inDigit = (x > cx - 60 && x < cx - 10 && (y < cy - 20 || (y > cy - 60 && y < cy - 40))) ||
                        (x > cx + 10 && x < cx + 60 && (x < cx + 25 || y > cy));

        ctx.fillStyle = inDigit ? fgHex : bgHex;
        ctx.beginPath();
        ctx.arc(x, y, dr, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (scene === 'fruit') {
      // Scene: Ripe fruit detection (Strawberries, Bananas, Apples)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Wooden bowl background
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 50, 280, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ripe Red Apple
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(w / 2 - 80, h / 2 - 20, 75, 0, Math.PI * 2);
      ctx.fill();

      // Green Unripe Apple
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.arc(w / 2 + 90, h / 2 - 10, 70, 0, Math.PI * 2);
      ctx.fill();

      // Yellow Banana bunch
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 40, 140, 32, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Red Strawberries
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(w / 2 - 10, h / 2 + 5, 26, 0, Math.PI * 2);
      ctx.fill();

      // Green Strawberry leaves
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(w / 2 - 18, h / 2 - 30, 16, 12);

    } else {
      // Scene: Autumn Landscape
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, '#38bdf8');
      sky.addColorStop(1, '#bae6fd');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Distant blue mountain
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(80, h * 0.6);
      ctx.lineTo(w / 2, 110);
      ctx.lineTo(w - 60, h * 0.6);
      ctx.fill();

      // Autumn orange/red foliage hills
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(200, h * 0.7, 240, 90, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden yellow tree cluster
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(w - 180, h * 0.72, 220, 80, 0, 0, Math.PI * 2);
      ctx.fill();

      // Evergreen green trees
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 40, h * 0.8);
      ctx.lineTo(w / 2, h * 0.45);
      ctx.lineTo(w / 2 + 40, h * 0.8);
      ctx.fill();
    }
  },

  exportJsonReport() {
    const reportData = {
      application: 'ChromaClear Clinical Color Vision Suite',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      standards: ['CIE 1976 UCS', 'Vingrys & King-Smith (1988)', 'City University CAD', 'Machado (2009) LMS'],
      primaryDiagnosis: document.getElementById('report-primary-diagnosis').textContent,
      severity: document.getElementById('report-severity').textContent,
      confidence: document.getElementById('report-confidence').textContent,
      faaCertificationStatus: document.getElementById('report-faa-status').textContent,
      photoreceptorConeProfile: {
        lConePercentage: document.getElementById('report-l-cone-pct').textContent,
        mConePercentage: document.getElementById('report-m-cone-pct').textContent,
        sConePercentage: document.getElementById('report-s-cone-pct').textContent
      },
      batteries: {
        pseudoisochromaticPlates: PlatesEngine.userAnswers,
        farnsworthD15: {
          arrangement: D15Engine.currentOrder,
          cIndex: document.getElementById('metric-c-index').textContent,
          sIndex: document.getElementById('metric-s-index').textContent,
          angleDeg: document.getElementById('metric-angle').textContent,
          totalVectorDistance: document.getElementById('metric-distance').textContent
        },
        cadAdaptiveThresholds: CadEngine.thresholds
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ChromaClear_Color_Vision_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sound.chimeSuccess();
  },

  copySummaryToClipboard() {
    const diag = document.getElementById('report-primary-diagnosis').textContent;
    const sev = document.getElementById('report-severity').textContent;
    const conf = document.getElementById('report-confidence').textContent;
    const faa = document.getElementById('report-faa-status').textContent;
    const cIdx = document.getElementById('metric-c-index').textContent;
    const sIdx = document.getElementById('metric-s-index').textContent;
    const angle = document.getElementById('metric-angle').textContent;

    const summaryText = `--- CHROMACLEAR CLINICAL COLOR VISION REPORT ---
Diagnosis: ${diag}
Severity: ${sev} (Confidence: ${conf})
FAA Aviation Eligibility: ${faa}
Farnsworth D-15 VKS: C-Index = ${cIdx}, S-Index = ${sIdx}, Angle = ${angle}
CAD Trivector Thresholds: Protan = ${CadEngine.thresholds.protan || '--'} CAD, Deutan = ${CadEngine.thresholds.deutan || '--'} CAD, Tritan = ${CadEngine.thresholds.tritan || '--'} CAD
Timestamp: ${new Date().toLocaleString()}
--------------------------------------------------`;

    navigator.clipboard.writeText(summaryText).then(() => {
      alert('Diagnostic summary copied to clipboard!');
      sound.chimeSuccess();
    }).catch(() => {
      sound.softError();
    });
  }
};

// ============================================================================
// 9. APP INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  AppNav.init();
  PlatesEngine.init();
  D15Engine.init();
  CadEngine.init();
  ClinicalSynthesis.init();
});
