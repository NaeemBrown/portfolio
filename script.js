const scene = document.querySelector('.scene');
const world = document.querySelector('.world');
const figure = document.querySelector('.figure');
const nav = document.querySelector('.poi-nav');
const buttons = [...nav.querySelectorAll('[data-poi]')];
const markers = [...world.querySelectorAll('[data-marker]')];
const status = document.querySelector('#travel-status');
const introSpeech = document.querySelector('.intro-speech');
const introSpeechLine = introSpeech?.querySelector('.intro-speech__line');
const introSpeechPaper = introSpeech?.querySelector('.intro-speech__paper');
const introSpeechCopy = introSpeech?.querySelector('p');
let introSpeechStart = Infinity; // when he speaks, set by the opening (see the start)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const panels = [...document.querySelectorAll('[data-scene-panel]')];
const mapButton = document.querySelector('.map-button');
let openPanelId = null;
const FOLD_AWAY_MS = 650; // the About letter's fold-away, see styles.css

function openPanel(id) {
  const panel = panels.find((item) => item.dataset.scenePanel === id);
  if (!panel) return;

  panels.forEach((item) => {
    item.classList.remove('is-folding');
    item.hidden = item !== panel;
  });
  panel.scrollTop = 0;
  panel.querySelectorAll('[data-panel-scroll]').forEach((el) => {
    el.scrollTop = 0;
  });
  scene.classList.add('has-open-panel');
  scene.dataset.openScene = id;
  mapButton.hidden = false;
  livingVisited(id); // living: remembered, and its dot on the route filled in
  if (openPanelId !== id) {
    if (id === 'about') [0, 0.3, 0.66].forEach((at) => sfx.rustle(0.25, at));
    else if (id !== 'skills') sfx.rustle(0.35, 0.12); // the terminal has its own
  }
  openPanelId = id;
  window.setTimeout(() => panel.querySelector('h1')?.focus({ preventScroll: true }), 30);
}

function closePanel(restoreFocus = false) {
  if (openPanelId && openPanelId !== 'skills') [0.09, 0.23].forEach((at) => sfx.rustle(0.15, at));
  panels.forEach((panel) => {
    if (panel.hidden) return;
    // A folding panel plays its fold-away first, unless it is reopened.
    if ('fold' in panel.dataset && !reducedMotion.matches) {
      panel.classList.add('is-folding');
      window.setTimeout(() => {
        if (!panel.classList.contains('is-folding')) return;
        panel.classList.remove('is-folding');
        panel.hidden = true;
      }, FOLD_AWAY_MS);
    } else {
      panel.hidden = true;
    }
  });
  scene.classList.remove('has-open-panel');
  delete scene.dataset.openScene;
  mapButton.hidden = true;
  openPanelId = null;

  if (restoreFocus) {
    document.querySelector('[aria-current="location"]')?.focus();
  }
}

function continueJourney(restoreFocus = true) {
  // He gets up from the fire, or steps back from the bench, when the panel
  // is put away.
  state.wantSeat = false;
  state.wantBench = false;
  state.wantForge = false;
  if (state.destinationId === experienceScene) state.experienceActive = false; // the timetable stays shut
  if (typeof hideCampfireProps === 'function') hideCampfireProps();
  if (typeof campEmoteIndex !== 'undefined') campEmoteIndex = 0;
  closePanel(restoreFocus);
}

mapButton.addEventListener('click', () => {
  sfx.tick();
  continueJourney(true);
});

/* ---------------------------------------------------------------- the rig
   Every joint carries transform-box: view-box, so a px in these transforms
   is one viewBox unit and the angles below are the ones the solver emitted. */

function side(which) {
  return {
    thigh: document.querySelector(`.leg--${which} .leg__thigh`),
    shin: document.querySelector(`.leg--${which} .leg__shin`),
    foot: document.querySelector(`.leg--${which} .leg__foot`),
    upper: document.querySelector(`.arm--${which} .arm__upper`),
    fore: document.querySelector(`.arm--${which} .arm__fore`),
  };
}

const rig = {
  root: document.querySelector('.rig'),
  lean: document.querySelector('.lean'),
  near: side('near'),
  far: side('far'),
};

const CHANNELS = ['thigh', 'knee', 'ankle', 'shoulder', 'elbow'];
const mix = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function track(list, phase) {
  const p = ((phase % 100) + 100) % 100;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (p >= list[i][0]) {
      const a = list[i];
      const b = list[i + 1];
      if (!b) return a[1];
      return a[1] + (b[1] - a[1]) * ((p - a[0]) / (b[0] - a[0]));
    }
  }
  return list[0][1];
}

function limb(gait, phase) {
  const out = {};
  for (const channel of CHANNELS) out[channel] = track(gait[channel], phase);
  return out;
}

/* The far leg and arm read the same tracks half a cycle later, which also
   leaves each arm swinging opposite its own leg. */
function pose(gait, phase) {
  return {
    near: limb(gait, phase),
    far: limb(gait, phase + 50),
    bob: track(gait.bob, phase),
    lean: gait.lean,
  };
}

function mixPose(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const out = {
    near: {},
    far: {},
    bob: mix(a.bob, b.bob, t),
    lean: mix(a.lean, b.lean, t),
    spin: mix(a.spin || 0, b.spin || 0, t),
  };
  for (const channel of CHANNELS) {
    out.near[channel] = mix(a.near[channel], b.near[channel], t);
    out.far[channel] = mix(a.far[channel], b.far[channel], t);
  }
  return out;
}

function applySide(el, p) {
  el.thigh.style.transform = `rotate(${p.thigh.toFixed(2)}deg)`;
  el.shin.style.transform = `rotate(${p.knee.toFixed(2)}deg)`;
  el.foot.style.transform = `rotate(${p.ankle.toFixed(2)}deg)`;
  el.upper.style.transform = `rotate(${p.shoulder.toFixed(2)}deg)`;
  el.fore.style.transform = `rotate(${p.elbow.toFixed(2)}deg)`;
}

function applyPose(p, flip, shift = 0, verticalShift = 0) {
  rig.root.style.transform = `translateY(${p.bob.toFixed(2)}px) rotate(${(p.spin || 0).toFixed(2)}deg)`;
  rig.lean.style.transform = `rotate(${p.lean.toFixed(2)}deg)`;
  applySide(rig.near, p.near);
  applySide(rig.far, p.far);
  figure.style.transform = `translateX(calc(-50% + ${shift.toFixed(2)}px)) translateY(${verticalShift.toFixed(2)}px) scaleX(${flip.toFixed(3)})`;
}

/* -------------------------------------------------------------- movement */

const UNITS_TALL = 242; // the figure's viewBox height
const WALK_CYCLE = 0.95; // seconds per walk cycle
const RUN_CYCLE = 0.46; // seconds per sprint cycle
const RUN_ABOVE = 2.2; // break into a run past this many body heights
const WALK_BELOW = 1.1; // and drop back to a walk inside this many
const ARRIVED = 1.5; // px
const TURN_TIME = 0.22; // seconds to pivot on the spot
const TURN_MIN_SCALE = 0.35; // keep him visible while his facing direction swaps
const CAMERA_FOLLOW_MAX = 220; // px/s; prevents a skipped opening from snapping sideways

/* The About stop is a campfire. He sits on the log there, the camera slides
   over to frame him beside the fire, and the About letter unfolds. */
const SIT_TIME = 0.85; // seconds to sit down, or to stand back up
const COMPOSE_TIME = 0.9; // seconds for the camera to frame the campfire
const SEAT_DROP = 52; // viewBox units his hip sinks onto the log
const SEAT_BACK = 40; // units his hip slides back behind his planted feet
const FIRE_SIDE = 1; // the fire is to the right of the seat, so he faces right
const CAMP_CENTRE = 0.33; // middle of the log-and-fire group, in body heights
const campScene = 'about';

/* The Projects stop is a workbench. He leans over it with his hands planted
   on the top, then the camera swings round and up behind his head to look
   down at the bench over his shoulders. */
const projectScene = 'projects';
const experienceScene = 'experience';
const skillsScene = 'skills';
const BENCH_SIDE = 1; // the bench stands right of the mark, so he faces right
const DESK = { near: 30, far: 226, half: 124, top: 102, slab: 8 }; // units from the mark
// What he builds on and from (see the build): the board in the middle of the
// bench, a tray of parts at its left end and a bin at its right, and where
// in them each colour of part is kept; and the hammer, from grip to head,
// lying left of the board.
const BOARD = [110, DESK.top, 0];
const STOCK = {
  ink: [57, DESK.top + 3, -108],
  teal: [69, DESK.top + 3, -108],
  glass: [80, DESK.top + 3, -108],
  amber: [58, DESK.top + 6, 106],
  red: [67, DESK.top + 6, 113],
  paper: [70, DESK.top + 6, 100],
};
const HAMMER = { grip: [80, DESK.top + 1.5, -64], head: [104, DESK.top + 3, -57] };
const BEND_TIME = 1.1; // seconds to lean over the bench and plant his hands
const UNBEND_TIME = 0.6; // seconds to straighten up again
const BEND_LEAN = 38; // degrees; a positive lean tips his head the way he faces
const BEND_BACK = 6; // units his hip sits back to balance the lean
const BEND_DROP = 1; // units his knees give
const PALM_X = { near: 86, far: 83 }; // where each hand lands, units ahead of the mark
const PALM_Z = 46; // and how far out to either side, which shows from behind
const SHOULDER_Z = 20; // half his shoulder width, which also only shows from behind
const CAMERA_HOLD = 0.3; // seconds he studies the bench before the camera moves
const CAMERA_IN = 2.2; // seconds for the camera to swing round behind him
const CAMERA_OUT = 1.4; // and to swing back out when he leaves
const CAMERA_PITCH = 74; // degrees the camera ends up looking down
const CAMERA_DISTANCE = 340; // units from the pivot once round, which sets the perspective
const PIVOT = [136, DESK.top, 0]; // the point on the bench top the camera swings about
const benchX = Number(buttons.find((button) => button.dataset.poi === projectScene).dataset.position);
const experienceX = Number(buttons.find((button) => button.dataset.poi === experienceScene).dataset.position);
const campX = Number(buttons.find((button) => button.dataset.poi === campScene).dataset.position);
const skillsX = Number(buttons.find((button) => button.dataset.poi === skillsScene)?.dataset.position || 9400);
world.style.setProperty('--camp-x', `${campX}px`);
world.style.setProperty('--experience-x', `${experienceX}px`);
world.style.setProperty('--skills-x', `${skillsX}px`);
const WORLD_END = 10400; // px, as .floor's width in styles.css
const narrowScreen = window.matchMedia('(max-width: 760px)');

/* ------------------------------------------------------------- audio engine */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = localStorage.getItem('cv_sound_enabled') === 'true';
    this.stepAlt = false;
    this.lastStepTime = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.enabled ? 0.35 : 0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  set(on) {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.enabled = on;
    localStorage.setItem('cv_sound_enabled', String(this.enabled));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? 0.35 : 0, this.ctx.currentTime, 0.05);
    }
    return this.enabled;
  }

  toggle() {
    return this.set(!this.enabled);
  }

  ensureReady() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  step(isSprint = false) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastStepTime < (isSprint ? 0.11 : 0.22)) return;
    this.lastStepTime = now;
    this.stepAlt = !this.stepAlt;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const baseFreq = isSprint ? (this.stepAlt ? 175 : 155) : (this.stepAlt ? 130 : 115);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + (isSprint ? 0.038 : 0.058));

    const vol = isSprint ? 0.16 : 0.11;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isSprint ? 0.042 : 0.065));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  skid() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  jump() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  land() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // A handcar's wheel over a rail joint.
  clack() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.03);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  anvil(strike = 1) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const baseFreq = 780 + (strike % 3) * 60;
    const freqs = [baseFreq, baseFreq * 2.76, baseFreq * 5.4, baseFreq * 8.1];
    const decays = [0.45, 0.28, 0.18, 0.09];
    const amps = [0.35, 0.22, 0.14, 0.08];

    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(amps[idx], now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decays[idx]);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + decays[idx]);
    });

    const clickLen = Math.floor(this.ctx.sampleRate * 0.015);
    const clickBuf = this.ctx.createBuffer(1, clickLen, this.ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickLen; i++) clickData[i] = (Math.random() * 2 - 1) * (1 - i / clickLen);
    const click = this.ctx.createBufferSource();
    click.buffer = clickBuf;
    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.28, now);
    click.connect(clickGain);
    clickGain.connect(this.masterGain);
    click.start(now);
  }

  quench() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 0.8;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  bite() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    for (let k = 0; k < 2; k++) {
      const t = now + k * 0.08;
      const len = Math.floor(this.ctx.sampleRate * 0.04);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 1600 + k * 400;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.038);

      src.connect(filt);
      filt.connect(gain);
      gain.connect(this.masterGain);
      src.start(t);
    }
  }

  swat() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /* The rest are built from two parts: a tone, one oscillator gliding from
     one pitch to another, and hiss, noise through a filter. Each takes an
     `at`, seconds from now, so a sound can be several of them in a row. */

  // Whether anything should play: sound on, and the audio started.
  get live() {
    return this.enabled && Boolean(this.ctx);
  }

  tone(freq, { type = 'sine', to = freq, vol = 0.1, dur = 0.1, at = 0, attack = 0.004 } = {}) {
    if (!this.live) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // A second of white noise, made once.
  noise() {
    if (!this.noiseBuffer) {
      this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }

  hiss({ type = 'bandpass', freq = 2000, to = freq, q = 1, vol = 0.1, dur = 0.2, at = 0, attack = 0.01 } = {}) {
    if (!this.live) return;
    const t = this.ctx.currentTime + at;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise();
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(attack, dur / 2));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(filter).connect(gain).connect(this.masterGain);
    source.start(t, Math.random() * 0.5);
    source.stop(t + dur + 0.02);
  }

  // A click, for buttons.
  tick(high = false) {
    this.tone(high ? 1500 : 1000, { type: 'triangle', to: high ? 1150 : 760, vol: 0.1, dur: 0.05 });
    this.hiss({ type: 'highpass', freq: 5000, vol: 0.03, dur: 0.02, attack: 0.001 });
  }

  // A faint one, for the pointer passing over them.
  hover() {
    const now = performance.now();
    if (now - (this.lastHover || 0) < 70) return;
    this.lastHover = now;
    this.tone(2100, { vol: 0.02, dur: 0.03 });
  }

  // A speech bubble opening.
  pop(at = 0) {
    this.tone(300, { to: 780, vol: 0.1, dur: 0.07, at });
  }

  // His voice: a soft blip a syllable, a gap between words, rising at a
  // question, from `at` seconds from now.
  babble(text, at = 0) {
    const words = text.trim().split(/\s+/).slice(0, 8);
    const asking = text.trim().endsWith('?');
    let when = at;
    let blips = 0;
    words.forEach((word, w) => {
      const syllables = Math.max(1, Math.min(3, Math.round(word.replace(/[^a-z]/gi, '').length / 3)));
      for (let s = 0; s < syllables && blips < 14; s += 1, blips += 1) {
        const rise = asking && w === words.length - 1 ? 1.25 + 0.1 * s : 1;
        const freq = 470 * rise * (0.88 + Math.random() * 0.3);
        this.tone(freq, { type: 'triangle', to: freq * 0.92, vol: 0.065, dur: 0.05, at: when, attack: 0.006 });
        when += 0.065;
      }
      when += 0.05;
    });
  }

  // A two-note chime going up: done, it worked.
  chime(at = 0) {
    [1319, 1976].forEach((freq, i) => {
      this.tone(freq, { vol: 0.08, dur: 0.5, at: at + i * 0.09 });
      this.tone(freq * 2.01, { vol: 0.02, dur: 0.25, at: at + i * 0.09 });
    });
  }

  // A glittering run up, for the N coming right.
  sparkle(at = 0) {
    [1047, 1319, 1568, 2093, 2637].forEach((freq, i) => {
      this.tone(freq, { vol: 0.05, dur: 0.4, at: at + i * 0.055 });
    });
    this.hiss({ type: 'highpass', freq: 6000, vol: 0.03, dur: 0.4, at, attack: 0.05 });
  }

  // Stone settling into place.
  thunk(at = 0) {
    this.tone(150, { to: 52, vol: 0.26, dur: 0.28, at });
    this.hiss({ type: 'lowpass', freq: 700, vol: 0.1, dur: 0.12, at, attack: 0.002 });
  }

  // Air rushing past something flung, rising or falling in pitch.
  whoosh(dur = 0.6, at = 0, rising = true) {
    this.hiss({ freq: rising ? 380 : 2600, to: rising ? 2600 : 380, q: 1.4, vol: 0.55, dur, at, attack: dur * 0.45 });
  }

  // Paper being unfolded or folded.
  rustle(dur = 0.3, at = 0) {
    for (let i = 0; i < 6; i += 1) {
      this.hiss({
        type: 'highpass', freq: 2500 + Math.random() * 2500, vol: 0.04 + Math.random() * 0.05,
        dur: 0.04 + Math.random() * 0.06, at: at + Math.random() * dur, attack: 0.005,
      });
    }
  }

  // A knock on wood; `pitch` above 1 for smaller, lighter things.
  tap(pitch = 1, at = 0) {
    this.tone(420 * pitch, { type: 'triangle', to: 170 * pitch, vol: 0.14, dur: 0.07, at });
    this.hiss({ freq: 1800 * pitch, vol: 0.04, dur: 0.03, at, attack: 0.001 });
  }

  // A laptop lid clicking open or shut.
  lid(open) {
    this.tap(open ? 1.5 : 1.1);
    this.tone(open ? 3200 : 2400, { type: 'square', vol: 0.02, dur: 0.015, at: 0.02 });
  }

  // A small hammer on a model: a bright tink.
  tink(strike = 0) {
    const freq = 1900 + (strike % 3) * 150;
    this.tone(freq, { vol: 0.09, dur: 0.2 });
    this.tone(freq * 2.7, { vol: 0.025, dur: 0.08 });
    this.hiss({ type: 'highpass', freq: 3000, vol: 0.05, dur: 0.02, attack: 0.001 });
  }

  // A puff of breath, blowing on something hot.
  breath(at = 0) {
    this.hiss({ type: 'lowpass', freq: 1100, to: 500, vol: 0.4, dur: 0.3, at, attack: 0.06 });
  }

  // Hands rubbed together, stroke after stroke, for `dur` seconds.
  rub(dur = 1.5, at = 0) {
    for (let s = 0; s * 0.17 < dur; s += 1) {
      this.hiss({ freq: 1400 + (s % 2) * 500, q: 0.8, vol: 0.22, dur: 0.14, at: at + s * 0.17, attack: 0.05 });
    }
  }

  // A station bell: two strikes.
  bell(at = 0) {
    [0, 0.22].forEach((gap) => {
      this.tone(988, { vol: 0.09, dur: 0.8, at: at + gap });
      this.tone(988 * 2.76, { vol: 0.025, dur: 0.3, at: at + gap });
    });
  }

  // A board of flaps turning over, as a station sign drops in.
  flaps(at = 0) {
    for (let i = 0; i < 7; i += 1) {
      this.tone(1900 - i * 90, { type: 'triangle', to: 1100, vol: 0.09, dur: 0.02, at: at + i * 0.03 });
    }
  }

  // The fire, heard more the nearer he is (`level` 0..1): a low roar that
  // fades in and out, and crackles popping at random, `dt` seconds' worth.
  fire(level, dt) {
    if (!this.ctx) return;
    if (!this.fireBed) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.noise();
      source.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.fireBed = this.ctx.createGain();
      this.fireBed.gain.value = 0;
      source.connect(filter).connect(this.fireBed).connect(this.masterGain);
      source.start();
    }
    this.fireBed.gain.setTargetAtTime(this.enabled ? 0.35 * level : 0, this.ctx.currentTime, 0.4);
    if (!this.live || level < 0.03) return;
    if (Math.random() < dt * 10 * level) {
      this.hiss({ freq: 1500 + Math.random() * 3500, q: 3, vol: (0.08 + Math.random() * 0.17) * level, dur: 0.012 + Math.random() * 0.03, attack: 0.001 });
    }
    if (Math.random() < dt * 1.2 * level) this.hiss({ type: 'lowpass', freq: 320, vol: 0.4 * level, dur: 0.09, attack: 0.004 });
  }
}

const sfx = new SoundEngine();

// The audio can only start once they have done something, so it starts on
// their first press of anything, not only once they have walked him.
window.addEventListener('pointerdown', () => sfx.ensureReady(), { passive: true });

// Sound toggle button UI setup
const soundToggleBtn = document.querySelector('.sound-toggle');
function updateSoundToggleUI(enabled) {
  if (!soundToggleBtn) return;
  soundToggleBtn.setAttribute('aria-pressed', String(enabled));
  soundToggleBtn.classList.toggle('is-active', enabled);
  const iconOff = soundToggleBtn.querySelector('.sound-toggle__icon--off');
  const iconOn = soundToggleBtn.querySelector('.sound-toggle__icon--on');
  // SVG elements have no `hidden` property, so the attribute is set.
  iconOff?.toggleAttribute('hidden', enabled);
  iconOn?.toggleAttribute('hidden', !enabled);
}

if (soundToggleBtn) {
  updateSoundToggleUI(sfx.enabled);
  soundToggleBtn.addEventListener('click', () => {
    const active = sfx.toggle();
    updateSoundToggleUI(active);
    if (active) sfx.chime();
  });
}

const start = Number(buttons[0].dataset.position);
const state = {
  x: start,
  target: start,
  facing: 1,
  flip: 1,
  speed: 0,
  phase: 0,
  moving: false,
  sprinting: false,
  turning: 0,
  turnFrom: 1,
  turnTo: 1,
  label: 'the start',
  destinationId: 'start', // the name statue, where the site opens (see the start)
  announced: true,
  tilt: 0,
  skidding: false,
  nextSkidPuff: 0,
  wantSeat: false,
  wantBench: false,
  wantForge: false,
  typeIn: 0, // how far he has leant in to the Skills console's keyboard
  typeHold: 0, // seconds at the keys
  termView: 0, // how far round behind him the camera has come there
  turbo: false,
  hop: null,
  strollUntil: 0, // leaving the start he walks, not runs, until past his name
  introShift: null, // how far the opening has slid the camera, px
  seat: 0,
  compose: 0,
  inspect: 0,
  inspectHold: 0,
  projectView: 0,
  benchAside: 0,
  experienceActive: false,
  courseTime: 0,
  jump: null,
  courseRise: 0,
};

/* ------------------------------------------------------ cursor interaction
   A mouse/trackpad gets an arrow drawn in the same ink as the figure. It
   swings a little on its tip as it moves, and over him it darkens and rings,
   since he can be poked: entering his silhouette is a poke; pressing on him
   is a push. The reaction is layered over the pose produced by the main
   gait solver, so navigation and the rest of the character animation keep
   their own state. */

const inkCursor = document.querySelector('.ink-cursor');
const cursorSwing = inkCursor?.querySelector('.ink-cursor__swing');
const CURSOR_TIP = [5, 4]; // px from the cursor's corner to the tip of the arrow
const finePointer = window.matchMedia('(pointer: fine)');
const pointerPlay = {
  x: -100,
  y: -100,
  lastX: -100,
  lastY: -100,
  lastMove: 0,
  speed: 0,
  visible: false,
  insideFigure: false,
  velocityX: 0, // px a second, sideways
  swing: 0, // degrees the arrow hangs off true on its tip
  swingShown: '',
  reaction: null,
  cooldownUntil: 0,
};

const pointerPostures = {
  swat: [
    { at: 0, lean: 0 },
    { at: 0.13, lean: -13, bob: 2, near: { shoulder: 44, elbow: -72 } },
    { at: 0.3, lean: -9, near: { shoulder: 62, elbow: -105 }, far: { shoulder: 18 } },
    { at: 0.48, lean: 11, spin: 2, near: { shoulder: -96, elbow: 24 }, far: { shoulder: -28 } },
    { at: 0.65, lean: 7, near: { shoulder: -76, elbow: 12 } },
    { at: 1, lean: 0 },
  ],
  shove: [
    { at: 0, lean: 0 },
    { at: 0.14, lean: -16, bob: 3, near: { shoulder: 36, elbow: -66 }, far: { shoulder: 34, elbow: -58 } },
    { at: 0.34, lean: -10, near: { shoulder: 52, elbow: -92 }, far: { shoulder: 48, elbow: -86 } },
    { at: 0.53, lean: 15, spin: 1.5, near: { shoulder: -84, elbow: 4 }, far: { shoulder: -62, elbow: -4 } },
    { at: 0.72, lean: 10, near: { shoulder: -72, elbow: 8 }, far: { shoulder: -56, elbow: 3 } },
    { at: 1, lean: 0 },
  ],
};

function copyPose(source) {
  return {
    near: { ...source.near },
    far: { ...source.far },
    bob: source.bob,
    lean: source.lean,
    spin: source.spin || 0,
  };
}

function poseWithPosture(base, posture) {
  const out = copyPose(base);
  if (posture.bob !== undefined) out.bob += posture.bob;
  if (posture.lean !== undefined) out.lean += posture.lean;
  if (posture.spin !== undefined) out.spin += posture.spin;
  if (posture.near) Object.assign(out.near, posture.near);
  if (posture.far) Object.assign(out.far, posture.far);
  return out;
}

// living: a pose `progress` (0..1) of the way through `keyframes`, each an
// offset from `base` as poseWithPosture takes it, smoothstepped between. A
// keyframe's `near` or `far` can aim the hand at a point instead, as
// `{ hand: [x, y] }` in rig units inside the bob, or the foot, as
// `{ foot: [x, y] }`; the act comes back to `base` if the last is `{ at: 1 }`.
function postureAt(keyframes, progress, base) {
  let index = keyframes.findIndex((keyframe) => keyframe.at >= progress);
  if (index < 0) return postured(base, keyframes[keyframes.length - 1]);
  if (index === 0) index = 1;
  const from = keyframes[index - 1];
  const to = keyframes[Math.min(index, keyframes.length - 1)];
  const span = Math.max(0.001, to.at - from.at);
  let amount = clamp((progress - from.at) / span, 0, 1);
  amount = amount * amount * (3 - 2 * amount);
  return mixPose(postured(base, from), postured(base, to), amount);
}

function postured(base, posture) {
  const out = poseWithPosture(base, { ...posture, near: null, far: null });
  for (const which of ['near', 'far']) {
    if (!posture[which]) continue;
    const { hand, foot, ...angles } = posture[which];
    Object.assign(out[which], angles);
    if (foot) Object.assign(out[which], reach(out.bob, foot[0], foot[1]));
    if (hand) {
      // The same angle a turn either way can be mixed from the long way
      // round, swinging an arm up behind him; take the one nearest where it
      // hung.
      const arm = armReach(out.lean, hand[0], hand[1]);
      arm.shoulder -= 360 * Math.round((arm.shoulder - base[which].shoulder) / 360);
      Object.assign(out[which], arm);
    }
  }
  return out;
}

function figurePointerHit(x, y) {
  if (!finePointer.matches || !inkCursor) return false;
  const style = getComputedStyle(figure);
  if (style.visibility === 'hidden' || Number(style.opacity) < 0.2) return false;
  const rect = figure.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const centreX = rect.left + rect.width * 0.5;
  const centreY = rect.top + rect.height * 0.54;
  const radiusX = rect.width * 0.36 + 9;
  const radiusY = rect.height * 0.5;
  const dx = (x - centreX) / radiusX;
  const dy = (y - centreY) / radiusY;
  return dx * dx + dy * dy <= 1;
}

function startPointerReaction(kind, now = performance.now()) {
  if (now < pointerPlay.cooldownUntil || !figurePointerHit(pointerPlay.x, pointerPlay.y)) return;
  cancelAmbient(); // living: a poke stops whatever he was doing by himself
  const rect = figure.getBoundingClientRect();
  const side = pointerPlay.x >= rect.left + rect.width / 2 ? 1 : -1;
  pointerPlay.reaction = {
    kind,
    side,
    startedAt: now,
    duration: kind === 'shove' ? 1120 : 920,
    impactAt: kind === 'shove' ? 0.5 : 0.44,
    impacted: false,
  };
  pointerPlay.cooldownUntil = now + (kind === 'shove' ? 1280 : 1050);
  scene.dataset.cursorReaction = kind;
  inkCursor.classList.add('is-poking');
  window.setTimeout(() => inkCursor.classList.remove('is-poking'), 150);
}

function knockCursorAway(reaction) {
  // Play visual impact recoil without displacing physical mouse coordinates
  inkCursor.classList.remove('is-swatted');
  void inkCursor.offsetWidth;
  inkCursor.classList.add('is-swatted');
  window.setTimeout(() => inkCursor.classList.remove('is-swatted'), 320);
  scene.dataset.cursorReaction = `${reaction.kind}-impact`;
}

function pointerReactionPose(base, now) {
  const reaction = pointerPlay.reaction;
  if (!reaction) return { pose: base, flip: state.flip };

  const progress = clamp((now - reaction.startedAt) / reaction.duration, 0, 1);
  if (!reaction.impacted && progress >= reaction.impactAt) {
    reaction.impacted = true;
    knockCursorAway(reaction);
  }

  const reacted = postureAt(pointerPostures[reaction.kind], progress, base);

  const faceIn = clamp(progress / 0.14, 0, 1);
  const faceOut = 1 - clamp((progress - 0.82) / 0.18, 0, 1);
  const faceAmount = Math.min(faceIn, faceOut);
  const reactionFlip = mix(state.flip, reaction.side, faceAmount);

  if (progress >= 1) {
    pointerPlay.reaction = null;
    delete scene.dataset.cursorReaction;
    return { pose: base, flip: state.flip };
  }
  return { pose: reacted, flip: reactionFlip };
}

const placeCursor = (x, y) => {
  inkCursor.style.transform = `translate3d(${(x - CURSOR_TIP[0]).toFixed(1)}px, ${(y - CURSOR_TIP[1]).toFixed(1)}px, 0)`;
};

function updateInkCursor(dt) {
  if (!inkCursor || !finePointer.matches) return;
  // Position is kept in lockstep with mouse coordinates for 0 latency
  placeCursor(pointerPlay.x, pointerPlay.y);

  // It swings back off true as it is dragged sideways, like a tag on a
  // string, and settles once the mouse stops.
  if (performance.now() - pointerPlay.lastMove > 60) pointerPlay.velocityX = 0;
  const swingTo = reducedMotion.matches ? 0 : clamp(-pointerPlay.velocityX / 90, -16, 16);
  pointerPlay.swing += (swingTo - pointerPlay.swing) * Math.min(1, dt * 14);
  const swing = pointerPlay.swing.toFixed(1);
  if (swing !== pointerPlay.swingShown) {
    cursorSwing.style.transform = `rotate(${swing}deg)`;
    pointerPlay.swingShown = swing;
  }

  // Over him it darkens and rings, even when he walks under a still mouse.
  const overHim = pointerPlay.visible && !inkCursor.classList.contains('is-over-action') &&
    figurePointerHit(pointerPlay.x, pointerPlay.y);
  inkCursor.classList.toggle('is-on-figure', overHim);
}

if (inkCursor && finePointer.matches) {
  document.documentElement.classList.add('has-ink-cursor');

  function updateCursorPos(clientX, clientY) {
    pointerPlay.lastX = pointerPlay.x = clientX;
    pointerPlay.lastY = pointerPlay.y = clientY;
    // Immediate 1:1 hardware synchronization (zero frame latency)
    placeCursor(clientX, clientY);
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const now = performance.now();
    const elapsed = Math.max(8, now - pointerPlay.lastMove);
    const distance = Math.hypot(event.clientX - pointerPlay.lastX, event.clientY - pointerPlay.lastY);
    pointerPlay.speed = (distance / elapsed) * 1000;
    pointerPlay.velocityX = mix(pointerPlay.velocityX, ((event.clientX - pointerPlay.lastX) / elapsed) * 1000, 0.5);
    pointerPlay.lastMove = now;
    pointerPlay.visible = true;

    updateCursorPos(event.clientX, event.clientY);

    const isOverInteractive = Boolean(event.target.closest('button, a, summary, [role="tab"], [role="button"], input, select, textarea, .navbar, .about-paper, .projects-sheet, .line-sheet, .sprint-hint'));
    inkCursor.classList.toggle('is-over-action', isOverInteractive);
    if (!isOverInteractive) {
      inkCursor.classList.add('is-visible');
    }

    const hitsFigure = figurePointerHit(event.clientX, event.clientY);
    if (hitsFigure && !pointerPlay.insideFigure) {
      startPointerReaction(pointerPlay.speed > 720 ? 'shove' : 'swat', now);
    }
    pointerPlay.insideFigure = hitsFigure;
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    inkCursor.classList.add('is-pressing');
    if (figurePointerHit(event.clientX, event.clientY)) {
      pointerPlay.cooldownUntil = Math.min(pointerPlay.cooldownUntil, performance.now());
      startPointerReaction('shove');
      sfx.swat();
    }
  }, { passive: true });

  window.addEventListener('pointerup', () => inkCursor.classList.remove('is-pressing'), { passive: true });
  window.addEventListener('pointercancel', () => inkCursor.classList.remove('is-pressing'), { passive: true });
  window.addEventListener('blur', () => inkCursor.classList.remove('is-pressing'));

  document.documentElement.addEventListener('mouseenter', () => {
    pointerPlay.visible = true;
  });

  document.documentElement.addEventListener('mouseleave', () => {
    pointerPlay.visible = false;
    pointerPlay.insideFigure = false;
    inkCursor.classList.remove('is-visible');
    inkCursor.classList.remove('is-pressing');
  });
}

/* ----------------------------------------------------------- run effects */

const speedLines = document.createElement('div');
speedLines.className = 'speed-lines';
speedLines.setAttribute('aria-hidden', 'true');
speedLines.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
figure.before(speedLines);

// Throws a puff of dust from world position x. It lives in the world layer,
// so it hangs where it was kicked up while the camera follows him away. In
// another `host` it is kicked up from (x, top) there.
function spawnDust(x, dir, unit, { count = 4, power = 1, host = world, top = 0 } = {}) {
  if (reducedMotion.matches) return;
  const puff = document.createElement('span');
  puff.className = 'dust';
  puff.style.left = `${x.toFixed(1)}px`;
  if (top) puff.style.top = `${top.toFixed(1)}px`;
  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement('i');
    const r = Math.random();
    const size = (6 + r * 8) * unit * power;
    bit.style.setProperty('--size', `${size.toFixed(1)}px`);
    bit.style.setProperty('--dx', `${(dir * (18 + Math.random() * 40) * unit * power).toFixed(1)}px`);
    bit.style.setProperty('--dy', `${(-(5 + Math.random() * 20) * unit * power).toFixed(1)}px`);
    bit.style.setProperty('--life', `${Math.round(420 + Math.random() * 260)}ms`);
    bit.style.setProperty('--delay', `${Math.round(Math.random() * 60)}ms`);
    bit.style.setProperty('--alpha', (0.22 + Math.random() * 0.16).toFixed(2));
    puff.append(bit);
  }
  host.append(puff);
  window.setTimeout(() => puff.remove(), 900);
}

/* ------------------------------------------------------------ nav route */

// The navbar doubles as a route map: stops sit under each destination and a
// runner dot shows where he is between them.
const runner = nav.querySelector('.poi-nav__runner');
const stops = buttons.map((button) => Number(button.dataset.position));
nav.style.setProperty('--count', buttons.length);
let navWidth = nav.clientWidth;
new ResizeObserver(() => {
  navWidth = nav.clientWidth;
}).observe(nav);

let runnerTransform = '';
function placeRunner(x, stretch) {
  let i = 0;
  while (i < stops.length - 2 && x > stops[i + 1]) i += 1;
  const along = clamp(i + (x - stops[i]) / (stops[i + 1] - stops[i]), 0, stops.length - 1);
  const px = ((along + 0.5) / stops.length) * navWidth;
  const transform = `translate3d(${px.toFixed(1)}px, 0, 0) scaleX(${stretch.toFixed(2)})`;
  if (transform !== runnerTransform) {
    runner.style.transform = transform;
    runnerTransform = transform;
  }
}

/* ---------------------------------------------------------------- sitting */

const ease = (t) => t * t * (3 - 2 * t);

// Each bubble draws its outline, fills in, then shows its words.
function drawIntroSpeech(now) {
  if (!introSpeechLine || !introSpeechPaper || !introSpeechCopy || introSpeech?.hidden) return;

  const elapsed = reducedMotion.matches ? Infinity : now - introSpeechStart;
  const lineProgress = ease(clamp((elapsed - 30) / 420, 0, 1));
  const paperProgress = ease(clamp((elapsed - 50) / 220, 0, 1));
  const copyProgress = ease(clamp((elapsed - 220) / 220, 0, 1));

  introSpeechLine.style.strokeDasharray = lineProgress >= 0.999 ? 'none' : '100 100';
  introSpeechLine.style.strokeDashoffset = (100 * (1 - lineProgress)).toFixed(3);
  introSpeechPaper.style.fillOpacity = paperProgress.toFixed(3);
  introSpeechCopy.style.opacity = copyProgress.toFixed(3);
  introSpeechCopy.style.transform = `translateY(${(4 * (1 - copyProgress)).toFixed(2)}px)`;
}

// Says `html` in the bubble over his head. A bubble already up shrinks away
// into its tail first, and the new one pops out of it and draws in.
let speechTimer = 0;
function speak(html) {
  if (!introSpeech) return;
  window.clearTimeout(speechTimer);
  const show = () => {
    introSpeechCopy.innerHTML = html;
    introSpeech.hidden = false;
    introSpeech.classList.remove('is-dismissed', 'is-popping');
    void introSpeech.offsetWidth; // so the pop plays again
    introSpeech.classList.add('is-popping');
    introSpeechStart = performance.now();
    const words = [...introSpeechCopy.children]
      .filter((el) => !el.classList.contains('intro-speech__choices'))
      .map((el) => el.textContent)
      .join(' ');
    sfx.pop();
    sfx.babble(words, 0.18);
  };
  const up = !introSpeech.hidden && !introSpeech.classList.contains('is-dismissed') && introSpeechStart !== Infinity;
  if (up) {
    introSpeech.classList.remove('is-popping');
    introSpeech.classList.add('is-dismissed');
    speechTimer = window.setTimeout(show, 200);
  } else {
    show();
  }
}
introSpeech?.addEventListener('animationend', (event) => {
  if (event.animationName === 'bubble-pop') introSpeech.classList.remove('is-popping');
});

// Takes the bubble away, after `delay` ms.
function hushSpeech(delay = 0) {
  if (!introSpeech) return;
  window.clearTimeout(speechTimer);
  const leave = () => {
    introSpeech.classList.remove('is-popping');
    introSpeech.classList.add('is-dismissed');
    speechTimer = window.setTimeout(() => {
      introSpeech.hidden = true;
    }, reducedMotion.matches ? 0 : 300);
  };
  if (delay > 0) speechTimer = window.setTimeout(leave, delay);
  else leave();
}
const speechUp = () => Boolean(introSpeech) && !introSpeech.hidden && !introSpeech.classList.contains('is-dismissed');
const smoother = (t) => t * t * t * (t * (6 * t - 15) + 10);
const RAD = Math.PI / 180;
const deg = (radians) => radians / RAD;

// Two-bone IK: thigh and knee angles that put the ankle on (ax, ay), with
// the knee bending forward. Same rig numbers as the gait solver.
function reach(bob, ax, ay) {
  const dx = ax - 70;
  const dy = ay - (144 + bob);
  const length = Math.min(Math.hypot(dx, dy), 50 + 48 - 0.15);
  const line = deg(Math.atan2(-dx, dy));
  const alpha = deg(Math.acos(clamp((50 * 50 + length * length - 48 * 48) / (2 * 50 * length), -1, 1)));
  const kappa = deg(Math.acos(clamp((50 * 50 + 48 * 48 - length * length) / (2 * 50 * 48), -1, 1)));
  const thigh = line - alpha;
  const knee = 180 - kappa;
  return { thigh, knee, ankle: -(thigh + knee) }; // foot flat on the floor
}

/* Campfire props and emote cycle:
   Emote 0: Warming hands & rubbing hands by the fire (~10s)
   Emote 1: Roasting a marshmallow, blowing to cool, making a s'more, & eating it (~14.5s) */
const campfireProps = {
  stick: document.querySelector('.prop-stick'),
  stickWood: document.querySelector('.prop-stick__wood'),
  mallowGroup: document.querySelector('.prop-stick__mallow-group'),
  toasted: document.querySelector('.prop-stick__mallow-toasted'),
  smore: document.querySelector('.prop-smore'),
  bite: document.querySelector('.prop-smore__bite'),
  biteStretch: document.querySelector('.prop-smore__bite-stretch'),
  crackerFar: document.querySelector('.prop-cracker-far'),
  breath: document.querySelector('.prop-breath'),
};

function hideCampfireProps() {
  if (!campfireProps.stick) return;
  campfireProps.stick.style.opacity = '0';
  if (campfireProps.stickWood) campfireProps.stickWood.setAttribute('d', 'M70 138 L70 192');
  if (campfireProps.mallowGroup) {
    campfireProps.mallowGroup.style.transform = '';
    campfireProps.mallowGroup.style.opacity = '1';
  }
  campfireProps.toasted.style.opacity = '0';
  campfireProps.smore.style.opacity = '0';
  campfireProps.bite.style.opacity = '0';
  if (campfireProps.biteStretch) campfireProps.biteStretch.style.opacity = '0';
  campfireProps.crackerFar.style.opacity = '0';
  campfireProps.breath.style.opacity = '0';
}

let campEmoteIndex = 0; // 0 = warm hands, 1 = smore
let campEmoteStart = 0;
let smoreThrown = false;
let smoreCount = 0;
const DURATION_WARM = 10.0;
const DURATION_SMORE = 15.0;

function nextCampEmote() {
  campEmoteIndex = (campEmoteIndex + 1) % 2;
  campEmoteStart = performance.now();
  smoreThrown = false;
  hideCampfireProps();
}

// A bitten s'more, not yet placed in the world. living: shared with the ones
// laid back down from an earlier visit (living.js, restoreSmores).
function makeSmore() {
  const smoreEl = document.createElement('div');
  smoreEl.className = 'world-smore';
  smoreEl.innerHTML = `<svg viewBox="0 0 22 14" width="22" height="14" aria-hidden="true">
    <!-- Bottom Cracker -->
    <rect x="1" y="9.5" width="18" height="3.2" rx="0.8" fill="#dca158" stroke="#784415" stroke-width="0.8" />
    <circle cx="4.5" cy="11.1" r="0.4" fill="#9e5c20" />
    <circle cx="8" cy="11.1" r="0.4" fill="#9e5c20" />
    <circle cx="11.5" cy="11.1" r="0.4" fill="#9e5c20" />
    <circle cx="15" cy="11.1" r="0.4" fill="#9e5c20" />

    <!-- Melted Chocolate Slab -->
    <rect x="2.5" y="7.5" width="15" height="2.2" rx="0.5" fill="#2e1305" />
    <line x1="4" y1="8.1" x2="15" y2="8.1" stroke="#4a220c" stroke-width="0.5" stroke-linecap="round" />

    <!-- Gooey Melted Marshmallow -->
    <path d="M2 4.2 C0.5 5.6 0.5 8.2 2 9.2 C6 9.6 14 9.6 18 9.2 C19.5 8.2 19.5 5.6 18 4.2 C14 3.8 6 3.8 2 4.2 Z" fill="#fff8eb" stroke="#b0651e" stroke-width="0.7" />
    <path d="M2.5 4.5 Q10 5.2 17.5 4.5" stroke="#b0651e" stroke-width="0.8" fill="none" />
    <path d="M2.6 8.8 Q1.8 11.2 2.8 11.6 Q3.6 11.2 3.3 8.8 Z" fill="#fff8eb" stroke="#b0651e" stroke-width="0.5" />

    <!-- Top Cracker -->
    <rect x="1" y="1.2" width="18" height="3.2" rx="0.8" fill="#dca158" stroke="#784415" stroke-width="0.8" />
    <circle cx="4.5" cy="2.8" r="0.4" fill="#9e5c20" />
    <circle cx="8" cy="2.8" r="0.4" fill="#9e5c20" />
    <circle cx="11.5" cy="2.8" r="0.4" fill="#9e5c20" />
    <circle cx="15" cy="2.8" r="0.4" fill="#9e5c20" />

    <!-- Scalloped Teeth Bite Mark Cutout -->
    <path d="M12.8 0 C10 3 10.5 5.5 12 7 C10.5 8.5 10 11 12.8 14 L22 14 L22 0 Z" fill="var(--paper)" />
    <path d="M11.8 6.5 Q11 7 11.8 7.5" stroke="#e6c898" stroke-width="0.7" fill="none" />
  </svg>`;
  return smoreEl;
}

// Where the `index`th s'more thrown lands, in world px: by the fire, a
// little further along or back each time, in a run of five.
function smoreLanding(index, unit) {
  return campX + (135 + (index % 5) * 8 - 16) * unit;
}

// Launches a bitten s'more that flies in a parabolic arc from his hand
// to the ground by the campfire, and remains permanently in the world.
function launchFlyingSmore(unit = 1) {
  const smoreEl = makeSmore();
  world.append(smoreEl);

  const startX = campX + 15 * unit;
  const startY = -135 * unit;
  const landX = smoreLanding(smoreCount, unit);
  smoreCount += 1;
  livingSmoreThrown(); // living: counted, and scratched into the log

  const duration = 620; // ms flight time
  const startTime = performance.now();
  const tilt = 12 + (Math.random() * 16 - 8);

  function fly(time) {
    const elapsed = time - startTime;
    const p = Math.min(elapsed / duration, 1);
    const x = startX + (landX - startX) * p;
    const y = startY + (0 - startY) * p - 55 * unit * Math.sin(Math.PI * p);
    const rot = p * 280;

    if (p < 1) {
      smoreEl.style.left = `${x.toFixed(1)}px`;
      smoreEl.style.transform = `translate(-50%, -100%) translateY(${y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
      requestAnimationFrame(fly);
    } else {
      // Landed on the floor! Stays permanently in the world layer.
      smoreEl.style.left = `${landX.toFixed(1)}px`;
      smoreEl.style.transform = `translate(-50%, -100%) rotate(${tilt.toFixed(1)}deg)`;
      spawnDust(landX, 1, unit, { count: 3, power: 0.5 });
      sfx.tap(0.8);
    }
  }
  requestAnimationFrame(fly);
}

// The sounds of what he does by the fire, as he gets to each: rubbing his
// hands, then with the s'more, pulling out the stick, blowing on it, the
// empty stick dropped, the squish, and the toss. Coming back to it after a
// while starts afresh rather than playing everything missed.
let campHeard = { index: -1, t: 0, at: 0 };
function campSounds(index, t, now) {
  const fresh = campHeard.index !== index || now - campHeard.at > 200 || t < campHeard.t;
  const before = fresh ? t : campHeard.t;
  campHeard = { index, t, at: now };
  const passed = (at) => before < at && t >= at;
  if (index === 0) {
    if (passed(3.65)) sfx.rub(1.8);
    return;
  }
  if (passed(0.7)) sfx.whoosh(0.3);
  if (passed(7.35)) sfx.breath();
  if (passed(7.87)) sfx.breath();
  if (passed(9.6)) sfx.tap(0.8);
  if (passed(10.05)) sfx.hiss({ type: 'lowpass', freq: 900, vol: 0.3, dur: 0.14 });
  if (passed(12.3)) sfx.whoosh(0.4);
}

const campfireEl = document.querySelector('.campfire');
const campSeatEl = document.querySelector('.camp-seat');
if (campfireEl) campfireEl.addEventListener('click', () => { if (state.seat > 0.5) nextCampEmote(); });
if (campSeatEl) campSeatEl.addEventListener('click', () => { if (state.seat > 0.5) nextCampEmote(); });

// Blends the standing pose into sitting on the log, e = 0..1. His feet stay
// where the idle stance put them (+4 and -5 units) while the hip slides back
// and sinks, so solving the legs each frame keeps both feet planted.
function seatPose(p, e, now, unit = 1) {
  const legBob = mix(GAITS.idle.bob[0][1], SEAT_DROP, e);
  p.bob = mix(p.bob, SEAT_DROP, e);
  Object.assign(p.near, reach(legBob, 74 + SEAT_BACK * e, 242));
  Object.assign(p.far, reach(legBob, 65 + SEAT_BACK * e, 242));

  if (reducedMotion.matches) {
    hideCampfireProps();
    p.near.shoulder = mix(p.near.shoulder, -46, e);
    p.near.elbow = mix(p.near.elbow, -44, e);
    p.far.shoulder = mix(p.far.shoulder, -38, e);
    p.far.elbow = mix(p.far.elbow, -54, e);
    p.lean = mix(p.lean, -14, e);
    return;
  }

  if (e < 0.2) {
    hideCampfireProps();
  }

  // Manage automatic emote cycling
  if (!campEmoteStart) campEmoteStart = now;
  const currentDuration = campEmoteIndex === 0 ? DURATION_WARM : DURATION_SMORE;
  let t = (now - campEmoteStart) / 1000;
  if (t >= currentDuration) {
    campEmoteIndex = (campEmoteIndex + 1) % 2;
    campEmoteStart = now;
    smoreThrown = false;
    t = 0;
  }
  campSounds(campEmoteIndex, t, now);

  let targetLean, nearTargetX, nearTargetY, farTargetX, farTargetY;
  let stickOp = 0, stickPull = 0, toastOp = 0, stickSlide = 0, smoreOp = 0, biteOp = 0, crackerFarOp = 0, breathOp = 0;

  if (campEmoteIndex === 0) {
    // ---------------- Emote 0: Warming hands & rubbing hands
    let reachT = 0;
    if (t < 1.4) reachT = ease(t / 1.4);
    else if (t < 3.2) reachT = 1.0;
    else if (t < 3.8) reachT = mix(1.0, 0.35, ease((t - 3.2) / 0.6));
    else if (t < 5.8) reachT = 0.35;
    else if (t < 6.6) reachT = mix(0.35, 1.0, ease((t - 5.8) / 0.8));
    else if (t < 8.2) reachT = 1.0;
    else reachT = mix(1.0, 0.0, ease((t - 8.2) / 1.8));

    let rubActive = 0;
    if (t >= 3.6 && t < 5.8) {
      if (t < 4.1) rubActive = ease((t - 3.6) / 0.5);
      else if (t < 5.4) rubActive = 1.0;
      else rubActive = 1.0 - ease((t - 5.4) / 0.4);
    }

    const breath = Math.sin(now / 1250);
    const heatFlutter = Math.sin(now / 320) * 1.2 * reachT * (1 - rubActive);
    const heatWaverX = Math.cos(now / 480) * 0.7 * reachT * (1 - rubActive);

    const rubStroke = Math.sin((now / 1000) * Math.PI * 6.0) * 3.5 * rubActive;
    const rubSlipY = Math.cos((now / 1000) * Math.PI * 6.0) * 1.5 * rubActive;

    targetLean = mix(-14, -8, reachT) + breath * 0.5;
    nearTargetX = mix(114, 126, reachT) + rubStroke + heatWaverX;
    nearTargetY = mix(90, 92, reachT) + rubSlipY + heatFlutter;
    farTargetX = mix(111, 126, reachT) - rubStroke + heatWaverX * 0.7;
    farTargetY = mix(93, 92, reachT) - rubSlipY - heatFlutter * 0.8;
  } else {
    // ---------------- Emote 1: Reach into pocket, pull out stick, roast, extract, & eat s'more
    if (t < 0.6) {
      // 1a. Reach down into hip pocket
      const p = ease(t / 0.6);
      targetLean = mix(-14, -12, p);
      nearTargetX = mix(114, 62, p);
      nearTargetY = mix(90, 138, p);
      farTargetX = 100;
      farTargetY = 108;
      stickOp = 0;
    } else if (t < 2.0) {
      // 1b. PULL STICK OUT OF POCKET! Emerges smoothly as hand pulls up and forward
      const p = (t - 0.6) / 1.4;
      stickPull = clamp(p, 0, 1);
      stickOp = 1;
      if (p < 0.4) {
        const p1 = ease(p / 0.4);
        targetLean = mix(-12, -10, p1);
        nearTargetX = mix(62, 68, p1);
        nearTargetY = mix(138, 108, p1);
      } else {
        const p2 = ease((p - 0.4) / 0.6);
        targetLean = mix(-10, -3, p2);
        nearTargetX = mix(68, 124, p2);
        nearTargetY = mix(108, 96, p2);
      }
      farTargetX = 100;
      farTargetY = 108;
    } else if (t < 6.8) {
      // 2. Roast over flames - marshmallow toasts to golden brown!
      stickOp = 1;
      stickPull = 1;
      toastOp = ease(clamp((t - 2.8) / 3.2, 0, 1));
      targetLean = -3 + Math.sin(now / 1100) * 0.6;
      const twirl = Math.sin(now / 360) * 1.5;
      const waverY = Math.cos(now / 480) * 1.2;
      nearTargetX = 124 + twirl;
      nearTargetY = 96 + waverY;
      farTargetX = 100 + Math.sin(now / 1200) * 0.8;
      farTargetY = 108;
    } else if (t < 8.2) {
      // 3. Pull back to mouth level and blow puffs of air to cool
      stickOp = 1;
      stickPull = 1;
      toastOp = 1;
      const p = ease((t - 6.8) / 1.4);
      const blowPulse = t > 7.3 && t < 8.1 ? Math.sin((t - 7.3) * 12) : 0;
      targetLean = mix(-3, -7, p) + (blowPulse > 0 ? blowPulse * 0.4 : 0);
      nearTargetX = mix(124, 86, p);
      nearTargetY = mix(96, 75, p);
      farTargetX = mix(100, 78, p);
      farTargetY = mix(108, 114, p);
      breathOp = blowPulse > 0.2 ? 0.8 : 0;
    } else if (t < 8.8) {
      // 4. Bring stick down in front of chest, far hand brings bottom cracker + chocolate to the marshmallow
      stickOp = 1;
      stickPull = 1;
      toastOp = 1;
      const p = ease((t - 8.2) / 0.6);
      targetLean = mix(-7, -6, p);
      nearTargetX = mix(86, 95, p);
      nearTargetY = mix(75, 96, p);
      crackerFarOp = p;
      farTargetX = mix(78, 115, p);
      farTargetY = mix(114, 96, p);
    } else if (t < 9.6) {
      // 5. EXTRACTING STICK FROM MARSHMALLOW! Far hand clamps cracker, near hand pulls stick backward
      stickOp = 1;
      stickPull = 1;
      toastOp = 1;
      crackerFarOp = 1;
      const p = ease((t - 8.8) / 0.8);
      stickSlide = p * 38; // Wooden stick visibly slides backwards out of the marshmallow!
      targetLean = -6;
      nearTargetX = mix(95, 78, p); // Near hand pulls stick back
      nearTargetY = mix(96, 110, p);
      farTargetX = mix(115, 112, p); // Far hand holds marshmallow & cracker steady
      farTargetY = mix(96, 96, p);
    } else if (t < 10.3) {
      // 6. Near hand drops empty stick, brings top cracker down (squish!)
      toastOp = 1;
      const p = ease((t - 9.6) / 0.7);
      stickOp = 1 - p; // Empty stick drops away
      crackerFarOp = 1 - p;
      smoreOp = p; // Complete s'more (with that very marshmallow) takes over!
      targetLean = mix(-6, -6, p);
      nearTargetX = mix(78, 83, p); // Near hand moves up to press top cracker
      nearTargetY = mix(110, 77, p);
      farTargetX = mix(112, 100, p);
      farTargetY = mix(96, 85, p);
    } else if (t < 11.5) {
      // 7. Both hands bring s'more to mouth, CHOMP!
      smoreOp = 1;
      const p = ease(clamp((t - 10.3) / 0.6, 0, 1));
      targetLean = mix(-6, -8, p);
      const chewT = (t >= 11.0) ? Math.sin((t - 11.0) * 25) * 0.5 : 0;
      targetLean += chewT * 0.4;
      nearTargetX = 83;
      nearTargetY = 77; // S'more at (86, 42) directly on mouth!
      farTargetX = mix(100, 86, p);
      farTargetY = mix(85, 78, p);
      if (t >= 11.0 && !biteOp) sfx.bite();
      biteOp = t >= 11.0 ? 1 : 0;
    } else if (t < 12.1) {
      // 8. Look at bitten s'more / reaction ("whoa, so hot & gooey!")
      smoreOp = 1;
      biteOp = 1;
      const p = ease((t - 11.5) / 0.6);
      targetLean = mix(-8, -6, p) + Math.sin((t - 11.5) * 12) * 0.3;
      nearTargetX = mix(83, 105, p);
      nearTargetY = mix(77, 80, p);
      farTargetX = mix(86, 100, p);
      farTargetY = mix(78, 108, p);
    } else if (t < 12.6) {
      // 9. Prep dip & FLICK TOSS! Launch into the world
      const p = ease((t - 12.1) / 0.5);
      targetLean = mix(-6, -2, p);
      nearTargetX = mix(105, 126, p);
      nearTargetY = mix(80, 80, p);
      farTargetX = 100;
      farTargetY = 108;

      if (t >= 12.5) {
        smoreOp = 0;
        biteOp = 0;
        if (!smoreThrown) {
          smoreThrown = true;
          launchFlyingSmore(unit);
        }
      } else {
        smoreOp = 1;
        biteOp = 1;
      }
    } else if (t < 13.5) {
      // 10. Follow-through & dust hands clean (double clap)
      const followT = ease((t - 12.6) / 0.9);
      targetLean = mix(-2, -6, followT);
      const clap = (t >= 13.0) ? Math.sin((t - 13.0) * 18) * 2.0 : 0;
      nearTargetX = mix(126, 114, followT) + clap;
      nearTargetY = mix(80, 94, followT);
      farTargetX = mix(100, 112, followT) - clap;
      farTargetY = mix(108, 96, followT);
    } else {
      // 11. Settle back into log with satisfaction
      const settleT = ease(clamp((t - 13.5) / 1.5, 0, 1));
      targetLean = mix(-6, -14, settleT) + Math.sin(now / 1250) * 0.6;
      nearTargetX = 114;
      nearTargetY = mix(94, 90, settleT);
      farTargetX = mix(112, 111, settleT);
      farTargetY = mix(96, 93, settleT);
    }
  }

  // Update prop visual opacities and geometries scaled by sitting progress e
  if (campfireProps.stick) {
    const fade = e * e;
    campfireProps.stick.style.opacity = (stickOp * fade).toFixed(2);

    if (campfireProps.stickWood) {
      if (t >= 0.6 && t < 2.0) {
        // Emerging from pocket
        const tipY = 138 + 54 * stickPull;
        campfireProps.stickWood.setAttribute('d', `M70 138 L70 ${tipY.toFixed(1)}`);
      } else if (stickSlide > 0) {
        // Sliding out of marshmallow
        const startY = 138 - stickSlide;
        const endY = 192 - stickSlide;
        campfireProps.stickWood.setAttribute('d', `M70 ${startY.toFixed(1)} L70 ${endY.toFixed(1)}`);
      } else {
        campfireProps.stickWood.setAttribute('d', 'M70 138 L70 192');
      }
    }

    if (campfireProps.mallowGroup) {
      if (t >= 0.6 && t < 2.0) {
        if (stickPull < 0.65) {
          campfireProps.mallowGroup.style.opacity = '0';
        } else {
          campfireProps.mallowGroup.style.opacity = '1';
          const mscale = clamp((stickPull - 0.65) / 0.35, 0, 1);
          campfireProps.mallowGroup.style.transform = `scale(${mscale.toFixed(2)})`;
          campfireProps.mallowGroup.style.transformOrigin = '70px 182px';
        }
      } else {
        campfireProps.mallowGroup.style.opacity = '1';
        campfireProps.mallowGroup.style.transform = '';
      }
    }

    campfireProps.toasted.style.opacity = (toastOp * fade).toFixed(2);
    campfireProps.smore.style.opacity = (smoreOp * fade).toFixed(2);
    campfireProps.bite.style.opacity = (biteOp * fade).toFixed(2);
    if (campfireProps.biteStretch) campfireProps.biteStretch.style.opacity = (biteOp * fade).toFixed(2);
    campfireProps.crackerFar.style.opacity = (crackerFarOp * fade).toFixed(2);
    campfireProps.breath.style.opacity = (breathOp * fade).toFixed(2);
  }
const nearIK = armReach(targetLean, nearTargetX, nearTargetY);
  const farIK = armReach(targetLean, farTargetX, farTargetY);

  p.near.shoulder = mix(p.near.shoulder, nearIK.shoulder, e);
  p.near.elbow = mix(p.near.elbow, nearIK.elbow, e);
  p.far.shoulder = mix(p.far.shoulder, farIK.shoulder, e);
  p.far.elbow = mix(p.far.elbow, farIK.elbow, e);
  p.lean = mix(p.lean, targetLean, e);
}

// Where a hand hangs, in rig units inside the bob, for a given lean and arm.
function handAt(lean, shoulder, elbow) {
  const a = (lean + shoulder) * RAD;
  const b = a + elbow * RAD;
  return [
    70 + 70 * Math.sin(lean * RAD) - 38 * Math.sin(a) - 30 * Math.sin(b),
    144 - 70 * Math.cos(lean * RAD) + 38 * Math.cos(a) + 30 * Math.cos(b),
  ];
}

// Two-bone IK for an arm: shoulder and elbow angles that put the hand on
// (hx, hy), in rig units inside the bob, with the elbow bending back.
function armReach(lean, hx, hy) {
  const dx = hx - (70 + 70 * Math.sin(lean * RAD));
  const dy = hy - (144 - 70 * Math.cos(lean * RAD));
  const length = clamp(Math.hypot(dx, dy), 8.5, 38 + 30 - 0.15);
  const line = deg(Math.atan2(-dx, dy));
  const alpha = deg(Math.acos(clamp((38 * 38 + length * length - 30 * 30) / (2 * 38 * length), -1, 1)));
  const kappa = deg(Math.acos(clamp((38 * 38 + 30 * 30 - length * length) / (2 * 38 * 30), -1, 1)));
  return { shoulder: line + alpha - lean, elbow: kappa - 180 };
}

/* --------------------------------------------------
   Running In-Stride Flares:
   1. Hydration Sip (Back Pocket Inventory Pull & Drink)
   2. Forearm Sweat Wipe (Bead Accumulation & Wipe Off)
   Fires off randomly when continuously running for > 0.5 seconds.
-------------------------------------------------- */

const runFlareProps = {
  bottle: document.getElementById('hand-water-bottle'),
  bottleLiquid: document.getElementById('bottle-liquid'),
  drinkStream: document.getElementById('drink-stream'),
  sweatGroup: document.getElementById('forehead-sweat-group'),
  sweatBead1: document.getElementById('sweat-bead-1'),
  sweatBead2: document.getElementById('sweat-bead-2'),
  sweatBead3: document.getElementById('sweat-bead-3'),
  sweatBead4: document.getElementById('sweat-bead-4'),
  sweatTrickle: document.getElementById('sweat-trickle-drip'),
  sweatSheen: document.getElementById('sweat-wipe-sheen'),
  sweatSpray: document.getElementById('sweat-flick-spray'),
};

function hideRunFlareProps() {
  if (runFlareProps.bottle) runFlareProps.bottle.style.opacity = '0';
  if (runFlareProps.bottleLiquid) runFlareProps.bottleLiquid.style.transform = 'translateY(0)';
  if (runFlareProps.drinkStream) runFlareProps.drinkStream.style.opacity = '0';
  if (runFlareProps.sweatGroup) runFlareProps.sweatGroup.style.opacity = '0';
  [runFlareProps.sweatBead1, runFlareProps.sweatBead2, runFlareProps.sweatBead3, runFlareProps.sweatBead4].forEach(b => {
    if (b) b.style.opacity = '0';
  });
  if (runFlareProps.sweatTrickle) runFlareProps.sweatTrickle.style.opacity = '0';
  if (runFlareProps.sweatSheen) runFlareProps.sweatSheen.style.opacity = '0';
  if (runFlareProps.sweatSpray) runFlareProps.sweatSpray.style.opacity = '0';
  livingHideRunProps(); // living: and living.js's (on the run)
}

function updateFlareDropletSpray(flickP) {
  const sprayGroup = runFlareProps.sweatSpray;
  if (!sprayGroup) return;
  if (flickP <= 0 || flickP >= 1.0) {
    sprayGroup.style.opacity = '0';
    return;
  }
  sprayGroup.style.opacity = '1';
  const droplets = sprayGroup.querySelectorAll('circle');
  const configs = [
    { dx: -34, dy: -12, grav: 22, r0: 2.2 },
    { dx: -46, dy: -4,  grav: 26, r0: 1.8 },
    { dx: -28, dy: 10,  grav: 20, r0: 1.5 },
    { dx: -38, dy: 16,  grav: 24, r0: 1.4 },
    { dx: -52, dy: 2,   grav: 28, r0: 1.7 },
    { dx: -22, dy: 22,  grav: 18, r0: 1.2 }
  ];
  droplets.forEach((drop, i) => {
    const c = configs[i % configs.length];
    const cx = 58 + c.dx * flickP;
    const cy = 24 + c.dy * flickP + c.grav * flickP * flickP;
    const r = Math.max(0.5, c.r0 * (1 - 0.4 * flickP));
    const opacity = Math.max(0, 1 - flickP);
    drop.setAttribute('cx', cx.toFixed(1));
    drop.setAttribute('cy', cy.toFixed(1));
    drop.setAttribute('r', r.toFixed(1));
    drop.style.opacity = opacity.toFixed(2);
  });
}

function evaluateRunHydrate(t, lean) {
  let hx, hy, weight = 0, leanOffset = 0;
  let bottleVisible = false;
  let bottleScale = 1.0;
  let drinkingActive = false;

  if (t < 0.20) {
    const p = ease(t / 0.20);
    weight = p;
    hx = mix(70, 50, p);
    hy = mix(110, 142, p);
  } else if (t < 0.38) {
    const p = (t - 0.20) / 0.18;
    weight = 1.0;
    hx = 50; hy = 142;
    bottleVisible = true;
    bottleScale = clamp(p * 1.2, 0.2, 1.0);
  } else if (t < 0.52) {
    const p = ease((t - 0.38) / 0.14);
    weight = 1.0;
    bottleVisible = true;
    hx = mix(50, 78, p) + 16 * Math.sin(p * Math.PI);
    hy = mix(142, 38, p);
    leanOffset = 5.5 * p;
  } else if (t < 0.72) {
    weight = 1.0;
    bottleVisible = true;
    const gulp = Math.sin(t * 24);
    hx = 78 + gulp * 0.8;
    hy = 38 + Math.abs(gulp) * 0.6;
    leanOffset = 5.5 + gulp * 0.8;
    drinkingActive = true;
  } else if (t < 0.86) {
    const p = ease((t - 0.72) / 0.14);
    weight = 1.0;
    bottleVisible = true;
    hx = mix(78, 50, p) + 12 * Math.sin(p * Math.PI);
    hy = mix(38, 142, p);
    leanOffset = 5.5 * (1 - p);
  } else if (t < 0.92) {
    const p = (t - 0.86) / 0.06;
    weight = 1.0;
    hx = 50; hy = 142;
    bottleVisible = p < 0.5;
    bottleScale = 1.0 - p;
  } else {
    const p = ease((t - 0.92) / 0.08);
    weight = 1.0 - p;
    hx = mix(50, 70, p);
    hy = mix(142, 110, p);
    bottleVisible = false;
  }

  const ik = armReach(lean + leanOffset, hx, hy);
  return {
    ...ik,
    weight,
    leanOffset,
    bottleVisible,
    bottleScale,
    drinkingActive
  };
}

function evaluateRunSweat(t, lean) {
  let hx, hy, weight = 0, leanOffset = 0;
  let beadsVisible = false;
  let beadsClearedCount = 0;
  let trickleVisible = false;
  let trickleX = 88, trickleY = 18, trickleAngle = 0;
  let sheenOpacity = 0;
  let flickSpray = false;
  let flickP = 0;

  if (t < 0.16) {
    weight = 0;
    hx = 70; hy = 110;
  } else if (t < 0.40) {
    const p = (t - 0.16) / 0.24;
    weight = 0;
    hx = 70; hy = 110;
    beadsVisible = true;
    trickleVisible = true;
    const angle = mix(-42, 10, ease(p)) * RAD;
    trickleX = 70 + 23 * Math.cos(angle);
    trickleY = 32 + 23 * Math.sin(angle);
    trickleAngle = (angle / RAD) + 90;
  } else if (t < 0.52) {
    const p = ease((t - 0.40) / 0.12);
    weight = p;
    beadsVisible = true;
    trickleVisible = true;
    trickleX = 70 + 23 * Math.cos(10 * RAD);
    trickleY = 32 + 23 * Math.sin(10 * RAD);
    trickleAngle = 100;
    hx = mix(70, 85, p);
    hy = mix(110, 24, p);
    leanOffset = -2.5 * p;
  } else if (t < 0.70) {
    const p = (t - 0.52) / 0.18;
    weight = 1.0;
    hx = mix(85, 58, p);
    hy = 24;
    leanOffset = -2.5 * (1 - p * 0.5);
    beadsVisible = true;
    if (hx <= 93) beadsClearedCount = 1;
    if (hx <= 91) beadsClearedCount = 2;
    if (hx <= 88) beadsClearedCount = 3;
    if (hx <= 84) { beadsClearedCount = 4; trickleVisible = false; }
    if (hx <= 76) beadsClearedCount = 5;
    sheenOpacity = Math.sin(p * Math.PI) * 0.75;
  } else if (t < 0.84) {
    const p = (t - 0.70) / 0.14;
    const ep = ease(p);
    weight = 1.0;
    hx = mix(58, 52, ep);
    hy = mix(24, 40, ep);
    leanOffset = Math.sin(ep * Math.PI * 2) * 1.5;
    beadsVisible = false;
    beadsClearedCount = 5;
    flickP = p;
    flickSpray = true;
  } else {
    const p = ease((t - 0.84) / 0.16);
    weight = 1.0 - p;
    hx = mix(52, 70, p);
    hy = mix(40, 110, p);
    beadsVisible = false;
    beadsClearedCount = 5;
  }

  const ik = armReach(lean + leanOffset, hx, hy);
  return {
    ...ik,
    weight,
    leanOffset,
    beadsVisible,
    beadsClearedCount,
    trickleVisible,
    trickleX,
    trickleY,
    trickleAngle,
    sheenOpacity,
    flickSpray,
    flickP
  };
}

const runFlareState = {
  continuousRunTime: 0,
  triggerThreshold: 0.5,
  cooldown: 0,
  active: null, // { type: 'hydrate' | 'sweat', elapsed: 0, duration: number }
};

function updateRunFlares(dt, final, isRunning, speedFade) {
  if (reducedMotion.matches) {
    hideRunFlareProps();
    return;
  }

  if (isRunning) {
    runFlareState.continuousRunTime += dt;
    if (runFlareState.cooldown > 0) {
      runFlareState.cooldown -= dt;
    }

    if (!runFlareState.active && runFlareState.continuousRunTime >= runFlareState.triggerThreshold && runFlareState.cooldown <= 0) {
      // living: now and then one of living.js's instead (RUN_FLARES, on the run).
      const type = livingRunFlare() || (Math.random() < 0.5 ? 'hydrate' : 'sweat');
      runFlareState.active = {
        type,
        elapsed: 0,
        duration: RUN_FLARES[type]?.duration ?? (type === 'hydrate' ? 3.6 : 3.2)
      };
      runFlareState.triggerThreshold = 0.5 + Math.random() * 0.4;
    }
  } else {
    runFlareState.continuousRunTime = 0;
    runFlareState.triggerThreshold = 0.5;
  }

  if (!runFlareState.active) {
    hideRunFlareProps();
    return;
  }

  const flare = runFlareState.active;
  flare.elapsed += dt;
  if (flare.elapsed >= flare.duration) {
    runFlareState.active = null;
    runFlareState.cooldown = 2.5 + Math.random() * 3.5;
    hideRunFlareProps();
    return;
  }

  // If runner stopped or dropped to a stand, cleanly cancel and return arm
  if (speedFade <= 0.05) {
    runFlareState.active = null;
    hideRunFlareProps();
    return;
  }

  const t = clamp(flare.elapsed / flare.duration, 0, 1.0);
  const fade = speedFade;

  if (flare.type === 'hydrate') {
    const ar = evaluateRunHydrate(t, final.lean);
    const weight = ar.weight * fade;
    final.near.shoulder = mix(final.near.shoulder, ar.shoulder, weight);
    final.near.elbow = mix(final.near.elbow, ar.elbow, weight);
    if (ar.leanOffset) final.lean += ar.leanOffset * weight;

    if (runFlareProps.bottle) {
      runFlareProps.bottle.style.opacity = ar.bottleVisible ? (1 * fade).toFixed(2) : '0';
      runFlareProps.bottle.style.transform = `scale(${ar.bottleScale || 1.0})`;
    }
    if (runFlareProps.bottleLiquid) {
      runFlareProps.bottleLiquid.style.transform = ar.drinkingActive ? 'translateY(4px)' : 'translateY(0)';
    }
    if (runFlareProps.drinkStream) {
      runFlareProps.drinkStream.style.opacity = (ar.drinkingActive && fade > 0.5) ? '1' : '0';
    }
    if (runFlareProps.sweatGroup) runFlareProps.sweatGroup.style.opacity = '0';
    if (runFlareProps.sweatSpray) runFlareProps.sweatSpray.style.opacity = '0';

  } else if (flare.type === 'sweat') {
    const ar = evaluateRunSweat(t, final.lean);
    const weight = ar.weight * fade;
    final.near.shoulder = mix(final.near.shoulder, ar.shoulder, weight);
    final.near.elbow = mix(final.near.elbow, ar.elbow, weight);
    if (ar.leanOffset) final.lean += ar.leanOffset * weight;

    if (runFlareProps.bottle) runFlareProps.bottle.style.opacity = '0';
    if (runFlareProps.drinkStream) runFlareProps.drinkStream.style.opacity = '0';

    if (runFlareProps.sweatGroup) {
      runFlareProps.sweatGroup.style.opacity = (ar.beadsVisible && fade > 0.3) ? (1 * fade).toFixed(2) : '0';
    }
    if (ar.beadsVisible) {
      if (runFlareProps.sweatBead1) runFlareProps.sweatBead1.style.opacity = ar.beadsClearedCount >= 1 ? '0' : '1';
      if (runFlareProps.sweatBead2) runFlareProps.sweatBead2.style.opacity = ar.beadsClearedCount >= 2 ? '0' : '1';
      if (runFlareProps.sweatBead3) runFlareProps.sweatBead3.style.opacity = ar.beadsClearedCount >= 3 ? '0' : '1';
      if (runFlareProps.sweatBead4) runFlareProps.sweatBead4.style.opacity = ar.beadsClearedCount >= 4 ? '0' : '1';

      if (runFlareProps.sweatTrickle) {
        if (ar.trickleVisible) {
          runFlareProps.sweatTrickle.style.opacity = '1';
          runFlareProps.sweatTrickle.setAttribute('transform', `translate(${ar.trickleX.toFixed(1)}, ${ar.trickleY.toFixed(1)}) rotate(${ar.trickleAngle.toFixed(1)})`);
        } else {
          runFlareProps.sweatTrickle.style.opacity = '0';
        }
      }
    } else {
      [runFlareProps.sweatBead1, runFlareProps.sweatBead2, runFlareProps.sweatBead3, runFlareProps.sweatBead4].forEach(b => {
        if (b) b.style.opacity = '0';
      });
      if (runFlareProps.sweatTrickle) runFlareProps.sweatTrickle.style.opacity = '0';
    }

    if (runFlareProps.sweatSheen) {
      runFlareProps.sweatSheen.style.opacity = ((ar.sheenOpacity || 0) * fade).toFixed(2);
    }

    updateFlareDropletSpray(ar.flickP || 0);
  } else if (RUN_FLARES[flare.type]) {
    // living: one of living.js's (on the run).
    RUN_FLARES[flare.type].pose(t, final, fade, flare);
  }
}

// At the Projects stop he leans over the bench from the hips and plants a
// hand either side of the drawing on it, t = 0..1. His body leads and his
// arms follow; each hand travels in a low arc from where it hung to its spot
// on the bench top, and both feet stay where he stopped. Returns how far his
// hip has sat back, in units, and how far his arms have come.
function bendPose(p, t, now) {
  const body = ease(clamp(t / 0.75, 0, 1));
  const arms = ease(clamp((t - 0.2) / 0.8, 0, 1));
  const breath = reducedMotion.matches ? 0 : Math.sin(now / 1400);
  const back = BEND_BACK * body;

  p.bob = mix(p.bob, BEND_DROP + breath * 0.5, body);
  p.lean = mix(p.lean, BEND_LEAN + breath * 0.7, body);
  Object.assign(p.near, reach(p.bob, 74 + back, 242));
  Object.assign(p.far, reach(p.bob, 65 + back, 242));

  const palmY = 242 - DESK.top - 2 - p.bob;
  const lift = 14 * Math.sin(Math.PI * arms);
  const restingPalmX = {
    near: 70 + PALM_X.near + back,
    far: 70 + PALM_X.far + back,
  };

  for (const which of ['near', 'far']) {
    const arm = p[which];
    const [fromX, fromY] = handAt(p.lean, arm.shoulder, arm.elbow);
    Object.assign(arm, armReach(p.lean, mix(fromX, restingPalmX[which], arms), mix(fromY, palmY, arms) - lift));
  }
  return { back, arms };
}

// Where the space for a panel on the right begins, as the About letter's box
// and the Projects sheet (.about-paper, .projects-sheet) lay it out in
// styles.css. Narrow screens have no such space, so framing stays centred
// there, and the Projects sheet takes the lower part of the screen instead.
const SHEET_TOP = 0.52;
function panelLeft() {
  if (narrowScreen.matches) return sceneWidth;
  return sceneWidth - Math.max(0.04 * sceneWidth, 24) - Math.min(0.46 * sceneWidth, 620);
}

// Screen x for the middle of the log and fire once framed: centred in the
// space left of the letter.
function campFrameX() {
  return panelLeft() / 2;
}

let sceneWidth = 0;
let sceneHeight = 0;
let floorY = 0; // where the floor line sits in the scene, in px
let navHeight = 0;
function measureScene() {
  sceneWidth = scene.clientWidth;
  sceneHeight = scene.clientHeight;
  floorY = world.getBoundingClientRect().top - scene.getBoundingClientRect().top;
  navHeight = parseFloat(getComputedStyle(scene).getPropertyValue('--nav-h')) || 0;
}
measureScene();
window.addEventListener('resize', measureScene);

/* ------------------------------------------------------------- the bench
   The workbench and, while the camera moves, the figure are modelled in 3D
   in the rig's own units: origin on the floor at the Projects mark, X the way
   he faces, Y up and Z out of the screen towards you. Looked at square from
   the side through a flat camera, the model draws just as the side-on world
   does, and the camera can swing round from there. */

const benchCam = document.querySelector('.bench-cam');
const benchShadow = benchCam.querySelector('.bench-cam__shadow');
const benchLayer = benchCam.querySelector('.bench-cam__bench');
const benchFigure = benchCam.querySelector('.bench-cam__figure');
const figureParts = Object.fromEntries(
  [...benchFigure.querySelectorAll('[data-part]')].map((el) => [el.dataset.part, el]),
);
const spineFade = benchFigure.querySelector('#bench-spine-fade');

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const times = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalise = (a) => times(a, 1 / Math.hypot(...a));
const mean = (pts) => times(pts.reduce(add, [0, 0, 0]), 1 / pts.length);

// A block from one corner and its three edges, which must be square to one
// another, as six faces with outward normals.
function block(o, a, b, c) {
  const edges = [a, b, c];
  const faces = [];
  for (let axis = 0; axis < 3; axis += 1) {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    for (const end of [0, 1]) {
      const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([s, t]) => {
        const k = [0, 0, 0];
        k[axis] = end;
        k[u] = s;
        k[v] = t;
        return [0, 1, 2].map((i) => o[i] + k[0] * a[i] + k[1] * b[i] + k[2] * c[i]);
      });
      faces.push({ normal: times(normalise(edges[axis]), end ? 1 : -1), pts });
    }
  }
  return faces;
}
const box = (x0, x1, y0, y1, z0, z1) =>
  block([x0, y0, z0], [x1 - x0, 0, 0], [0, y1 - y0, 0], [0, 0, z1 - z0]);
const faceTowards = (faces, direction) => faces.find((face) => dot(face.normal, direction) > 0.99);

// Points round a circle about `centre`, square to `normal`.
function ring(centre, normal, r, count = 20) {
  const n = normalise(normal);
  const u = normalise(cross(n, Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const v = cross(n, u);
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * 2 * Math.PI;
    return add(centre, add(times(u, r * Math.cos(a)), times(v, r * Math.sin(a))));
  });
}

// The outline round a set of points on screen (Andrew's monotone chain).
function hull(points) {
  const sorted = [...points].sort((p, q) => p.x - q.x || p.y - q.y);
  const turn = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half(sorted.reverse())];
}

const at = (q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
const polyline = (camera, pts) => `M${pts.map((p) => at(camera.project(p))).join('L')}`;
const outline = (camera, pts) => `M${hull(pts.map((p) => camera.project(p))).map(at).join('L')}Z`;
const segments = (camera, list) => list.map((seg) => polyline(camera, seg)).join('');

/* The bench is a list of pieces, each drawn as a filled body with lines on
   it. Layers go down in order - legs and shelf, then the top, then what sits
   on it - and inside a sorted layer the farthest piece goes down first, so
   nearer pieces cover farther ones from wherever the camera is. */
const BENCH = (() => {
  const { near, far, half, top, slab } = DESK;
  const under = top - slab;
  const pieces = [];
  const piece = (layer, draw, pts, body = '', lines = '') =>
    pieces.push({ layer, draw, anchor: mean(pts), body, lines });
  const nothing = { body: '', lines: '' };

  // A solid shows the faces turned to the camera, and the detail lines drawn
  // on those faces.
  const solid = (layer, faces, details = [], lines = '') => piece(layer, (camera) => {
    let shown = '';
    let marks = '';
    for (const face of faces) {
      if (camera.sees(face.normal, face.pts[0])) shown += `${polyline(camera, face.pts)}Z`;
    }
    for (const [face, list] of details) {
      if (camera.sees(face.normal, face.pts[0])) marks += segments(camera, list);
    }
    return { body: shown, lines: marks };
  }, faces.flatMap((face) => face.pts), '', lines);

  // Something round and upright - a mug, a pot, a lamp base - is the outline
  // round both its rims, with the top rim drawn while the camera is above it.
  const round = (x, z, y0, height, r0, r1 = r0, handle = []) => {
    const bottom = ring([x, y0, z], [0, 1, 0], r0);
    const rim = ring([x, y0 + height, z], [0, 1, 0], r1);
    piece('top', (camera) => ({
      body: outline(camera, [...bottom, ...rim]) +
        (camera.sees([0, 1, 0], rim[0]) ? `${polyline(camera, rim)}Z` : ''),
      lines: segments(camera, handle),
    }), [...bottom, ...rim], '', 'bench-cam__lines--ink');
  };

  // Lying flat on the top, given as [x, z] corners.
  const onTop = (corners) => corners.map(([x, z]) => [x, top, z]);
  const flat = (corners, lines = []) => piece('flat', (camera) => {
    if (!camera.sees([0, 1, 0], [0, top, 0])) return nothing;
    return { body: `${polyline(camera, onTop(corners))}Z`, lines: segments(camera, lines) };
  }, onTop(corners), 'bench-cam__body--paper');

  // Just lines, like the lamp's arms.
  const strokes = (layer, list, lines = 'bench-cam__lines--ink') =>
    piece(layer, (camera) => ({ body: '', lines: segments(camera, list) }), list.flat(), '', lines);

  // Four square legs, an apron under the top with drawers on the side you
  // see, and a shelf low down with a toolbox and a stack of books on it.
  for (const [x0, x1] of [[near + 8, near + 15], [far - 15, far - 8]]) {
    for (const [z0, z1] of [[half - 15, half - 8], [8 - half, 15 - half]]) {
      solid('under', box(x0, x1, 0, under, z0, z1));
    }
  }
  const apron = box(near + 15, far - 15, under - 14, under, half - 13, half - 9);
  const drawers = [];
  for (const [x0, x1] of [[near + 22, near + 68], [near + 75, far - 75], [far - 68, far - 22]]) {
    const z = half - 9;
    const middle = (x0 + x1) / 2;
    drawers.push(
      [[x0, under - 12, z], [x1, under - 12, z], [x1, under - 2, z], [x0, under - 2, z], [x0, under - 12, z]],
      [[middle - 3, under - 7, z], [middle + 3, under - 7, z]],
    );
  }
  solid('under', apron, [[faceTowards(apron, [0, 0, 1]), drawers]]);
  solid('under', box(near + 15, far - 15, under - 14, under, 9 - half, 13 - half));
  solid('under', box(near + 9, near + 13, under - 14, under, 15 - half, half - 15));
  solid('under', box(far - 13, far - 9, under - 14, under, 15 - half, half - 15));
  solid('shelf', box(near + 15, far - 15, 24, 29, 15 - half, half - 15));
  solid('shelved', box(60, 100, 29, 47, 18, 66));
  strokes('shelved', [[[70, 47, 42], [70, 53, 42], [90, 53, 42], [90, 47, 42]]]);
  solid('shelved', box(124, 164, 29, 42, -72, -26));
  solid('shelved', box(180, 206, 29, 37, 10, 60));
  solid('shelved', box(183, 203, 37, 44, 14, 56));

  // The top, with a little grain along its edges.
  const slabFaces = box(near, far, under, top, -half, half);
  solid('slab', slabFaces, [
    [faceTowards(slabFaces, [0, 0, 1]), [
      [[near + 14, under + 3, half], [near + 50, under + 3, half]],
      [[near + 84, under + 5, half], [near + 110, under + 5, half]],
      [[far - 60, under + 3, half], [far - 22, under + 3, half]],
    ]],
    [faceTowards(slabFaces, [-1, 0, 0]), [
      [[near, under + 3, -60], [near, under + 3, -20]],
      [[near, under + 5, 30], [near, under + 5, 76]],
    ]],
  ]);

  // Papers under the lamp at the far left, one of them ruled, and a pencil.
  flat([[144, -112], [180, -118], [186, -72], [150, -66]]);
  flat([[154, -96], [192, -92], [190, -50], [152, -54]],
    [-86, -78, -70, -62].map((z) => [[160, top, z], [z === -62 ? 172 : 184, top, z + 0.5]]));
  strokes('flat', [[[196, top + 1, -74], [200, top + 1, -50]]]);

  // An angle-poise lamp on the far corner, with a warm pool of light where
  // its shade points.
  const lampFoot = [212, top + 3, -100];
  const lampElbow = [206, top + 62, -92];
  const lampHead = [166, top + 56, -64];
  const beam = normalise([-20, -56, 14]);
  const pool = ring(add(lampHead, times(beam, 56 / -beam[1])), [0, 1, 0], 32, 28);
  piece('light', (camera) => (camera.sees([0, 1, 0], [0, top, 0])
    ? { body: `${polyline(camera, pool)}Z`, lines: '' }
    : nothing), pool, 'bench-cam__body--light');
  round(212, -100, top, 3, 10);
  strokes('top', [[lampFoot, lampElbow, lampHead]]);
  const shadeRim = ring(add(lampHead, times(beam, 11)), beam, 9);
  const shadeTip = add(lampHead, times(beam, -3));
  piece('top', (camera) => ({
    body: outline(camera, [shadeTip, ...shadeRim]) +
      (camera.sees(beam, shadeRim[0]) ? `${polyline(camera, shadeRim)}Z` : ''),
    lines: '',
  }), [lampHead]);

  // A laptop at the far side facing him, with code on its screen and keys
  // and a pad on its base.
  const base = box(150, 180, top, top + 2, -21, 21);
  const keys = [162, 166, 170, 174].map((x) => [[x, top + 2, -15], [x, top + 2, 15]]);
  const pad = [[153, -6], [159, -6], [159, 6], [153, 6], [153, -6]].map(([x, z]) => [x, top + 2, z]);
  solid('top', base, [[faceTowards(base, [0, 1, 0]), [...keys, pad]]]);
  const tilt = 14 * RAD;
  const hinge = [180, top + 2, -21];
  const across = [0, 0, 42];
  const upScreen = [28 * Math.sin(tilt), 28 * Math.cos(tilt), 0];
  const screen = block(hinge, across, upScreen, [1.6 * Math.cos(tilt), -1.6 * Math.sin(tilt), 0]);
  const onScreen = (s, t) => add(hinge, add(times(across, s), times(upScreen, t)));
  const code = [[0.12, 0.58], [0.12, 0.44], [0.2, 0.66], [0.2, 0.38], [0.12, 0.3]];
  solid('top', screen, [[faceTowards(screen, [-Math.cos(tilt), Math.sin(tilt), 0]), [
    [onScreen(0.06, 0.1), onScreen(0.94, 0.1), onScreen(0.94, 0.92), onScreen(0.06, 0.92), onScreen(0.06, 0.1)],
    ...code.map(([s, length], row) => [onScreen(s, 0.8 - row * 0.13), onScreen(s + length, 0.8 - row * 0.13)]),
  ]]]);

  // A mug by the laptop, a couple of books, and a plant on the far corner.
  round(150, 42, top, 11, 6.5, 6.5, [[[143.5, top + 8.5, 42], [139.5, top + 8.5, 42], [139.5, top + 3, 42], [143.5, top + 3, 42]]]);
  solid('top', box(166, 196, top, top + 7, 40, 78));
  solid('top', box(169, 193, top + 7, top + 12, 44, 74));
  round(208, 98, top, 12, 6, 8.5);
  const stem = [208, top + 11, 98];
  const leaves = [[0, 58, 20], [70, 40, 17], [140, 66, 22], [200, 44, 16], [260, 62, 19], [320, 38, 15]]
    .map(([turn, rise, length]) => {
      const out = [Math.cos(turn * RAD), 0, Math.sin(turn * RAD)];
      const side = [-out[2], 0, out[0]];
      const along = add(times(out, Math.cos(rise * RAD)), [0, Math.sin(rise * RAD), 0]);
      const middle = add(stem, times(along, length * 0.5));
      return [stem, add(middle, times(side, 4)), add(stem, times(along, length)), add(middle, times(side, -4))];
    });
  piece('top', (camera) => ({ body: leaves.map((leaf) => `${polyline(camera, leaf)}Z`).join(''), lines: '' }),
    leaves.flat(), 'bench-cam__body--leaf');

  // A ruler at the left, and a screwdriver and a spanner at the right.
  const rulerTicks = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const rx = 92 + t * 48;
    const rz = -84 + t * 6;
    const len = i % 5 === 0 ? 3.5 : 2;
    rulerTicks.push([[rx, top + 0.2, rz], [rx + len * 0.12, top + 0.2, rz + len * 0.99]]);
  }
  flat([[92, -84], [140, -78], [139, -73], [91, -79]], rulerTicks);
  flat([[96, 59], [110, 61], [109, 63], [95, 61]]);
  strokes('top', [
    [[95, top + 0.8, 60], [110, top + 0.8, 62]],
    [[110, top + 0.5, 62], [126, top + 0.5, 64]],
    [[126, top + 0.5, 63.5], [128, top + 0.5, 64.2]],
  ]);
  flat([[100, 73], [128, 78], [128, 81], [100, 76]]);
  strokes('top', [
    [[101, top + 0.5, 77], [97, top + 0.5, 78], [96, top + 0.5, 74], [99, top + 0.5, 72], [101, top + 0.5, 73]],
    [[128, top + 0.5, 78], [132, top + 0.5, 79], [133, top + 0.5, 82], [129, top + 0.5, 82], [128, top + 0.5, 79]],
  ]);

  // The green board he builds on, in the middle.
  const [bx, , bz] = BOARD;
  const boardCorners = [[bx - 36, bz - 36], [bx + 36, bz - 36], [bx + 36, bz + 36], [bx - 36, bz + 36]];
  const boardGrid = [];
  for (let g = -27; g <= 27; g += 9) {
    boardGrid.push([[bx + g, top, bz - 36], [bx + g, top, bz + 36]], [[bx - 36, top, bz + g], [bx + 36, top, bz + g]]);
  }
  piece('flat', (camera) => (camera.sees([0, 1, 0], [0, top, 0])
    ? { body: `${polyline(camera, onTop(boardCorners))}Z`, lines: segments(camera, boardGrid) }
    : nothing), onTop(boardCorners), 'bench-cam__body--mat', 'bench-cam__lines--mat');

  // The parts: a shallow tray of three at the left end, dark, teal and
  // glass, and a deep bin at the right of amber, red and white.
  const stockBits = (y, list) => list.forEach(([color, ...bits]) => {
    const squares = bits.map(([[x0, z0], [x1, z1]]) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);
    piece('top', (camera) => (camera.sees([0, 1, 0], [0, y, 0])
      ? { body: squares.map((sq) => `${polyline(camera, sq)}Z`).join(''), lines: '' }
      : nothing), squares.flat().map(([x, , z]) => [x, y + 2, z]), `bench-cam__part bench-cam__part--${color}`);
  });
  const hollow = (x0, x1, z0, z1, height, walls = []) => {
    solid('top', box(x0, x1, top, top + height, z0, z1));
    const y = top + height + 0.2;
    const inside = [[x0 + 1.5, z0 + 1.5], [x1 - 1.5, z0 + 1.5], [x1 - 1.5, z1 - 1.5], [x0 + 1.5, z1 - 1.5]]
      .map(([x, z]) => [x, y, z]);
    piece('top', (camera) => (camera.sees([0, 1, 0], [0, y, 0])
      ? { body: `${polyline(camera, inside)}Z`, lines: segments(camera, walls.map(([p, q]) => [[...p, y], [...q, y]].map(([x, z, yy]) => [x, yy, z]))) }
      : nothing), inside.map(([x, , z]) => [x, y + 1, z]), 'bench-cam__body--bin', 'bench-cam__lines--tray');
    return y;
  };
  const trayTop = hollow(50, 86, -122, -92, 5, [[[62, -120.5], [62, -93.5]], [[74, -120.5], [74, -93.5]]]);
  stockBits(trayTop, [
    ['ink', [[52.5, -119], [59.5, -112]], [[53.5, -105], [60, -98]]],
    ['teal', [[64, -118], [72, -111]], [[64.5, -104], [71, -97]]],
    ['glass', [[76, -119], [83, -112]], [[76, -105], [82.5, -98]]],
  ]);
  const binTop = hollow(50, 80, 92, 122, 10);
  stockBits(binTop, [
    ['amber', [[53, 97], [59, 103]], [[54, 109], [60, 115]]],
    ['red', [[62, 107], [67, 112]], [[72, 112], [77, 117]]],
    ['paper', [[64, 96], [70, 102]], [[72, 100], [77, 105]]],
  ]);

  const layers = ['under', 'shelf', 'shelved', 'slab', 'flat', 'light', 'top'];
  const sorted = new Set(['under', 'shelved', 'top']);
  const svg = (tag) => document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [index, item] of pieces.entries()) {
    item.index = index;
    item.rank = layers.indexOf(item.layer);
    item.sorted = sorted.has(item.layer);
    item.el = svg('g');
    item.bodyEl = svg('path');
    item.linesEl = svg('path');
    item.bodyEl.setAttribute('class', `bench-cam__body ${item.body}`.trim());
    item.linesEl.setAttribute('class', `bench-cam__lines ${item.lines}`.trim());
    item.el.append(item.bodyEl, item.linesEl);
    benchLayer.append(item.el);
  }
  return { pieces, top: faceTowards(slabFaces, [0, 1, 0]).pts };
})();

// An ellipse round the bench and his feet, for its shadow.
const SHADOW_CENTRE = (DESK.near + DESK.far) / 2 - 12;
const SHADOW = Array.from({ length: 36 }, (_, i) => [
  (DESK.far - DESK.near) * 0.8 * Math.cos((i / 36) * 2 * Math.PI),
  DESK.half * 1.15 * Math.sin((i / 36) * 2 * Math.PI),
]);

// A camera orbiting PIVOT. Yaw 0 looks at the side of him the world shows
// and a quarter turn looks along his back; pitch tips it down to look over
// his head. An invDistance of 0 is a flat, orthographic view, which is what
// the rest of the side-on world is, so the orbit can start from it exactly.
function orbitCamera({ yaw, pitch, invDistance, scale, x, y, pivot = PIVOT }) {
  const sy = Math.sin(yaw * RAD);
  const cy = Math.cos(yaw * RAD);
  const sp = Math.sin(pitch * RAD);
  const cp = Math.cos(pitch * RAD);
  const right = [cy, 0, sy];
  const up = [sy * sp, cp, -cy * sp];
  const ahead = [sy * cp, -sp, -cy * cp];
  return {
    pivot,
    project(p) {
      const rel = sub(p, pivot);
      const depth = dot(rel, ahead);
      const s = scale / Math.max(0.25, 1 + depth * invDistance); // px per unit here
      return { x: x + s * dot(rel, right), y: y - s * dot(rel, up), s, depth };
    },
    // Whether a face with this normal, through point p, faces the camera.
    sees(normal, p) {
      return dot(normal, sub(times(sub(pivot, p), invDistance), ahead)) > 1e-4;
    },
  };
}

let benchOrder = '';
function drawBenchPieces(camera) {
  const depth = new Map();
  for (const item of BENCH.pieces) {
    const { body, lines } = item.draw(camera);
    item.bodyEl.setAttribute('d', body);
    item.linesEl.setAttribute('d', lines);
    if (item.sorted) depth.set(item, camera.project(item.anchor).depth);
  }
  const order = [...BENCH.pieces].sort((a, b) => a.rank - b.rank ||
    (a.sorted ? depth.get(b) - depth.get(a) : a.index - b.index));
  const key = order.map((item) => item.index).join();
  if (key !== benchOrder) {
    benchOrder = key;
    for (const item of order) benchLayer.append(item.el);
  }
}

// Framing for the view round behind him, looking down over his head: the
// bench top fills the width between `left` and `right`, from under the
// navbar down to `bottom`. Given the whole screen his hips sit just below the
// bottom edge, so his back runs out of frame; squeezed into less room, the
// bench is too small for that and sits centred instead. Tall screens may crop
// the ends of the bench a little to keep it large.
// Frames `points` (the bench top by default) between `left` and `right`, and
// above `bottom`, keeping his hip in view unless `close`, which also keeps
// the ends of the bench in on tall screens.
function benchShot(left, right, bottom, pitch = CAMERA_PITCH, points = BENCH.top, close = false) {
  const probe = orbitCamera({
    yaw: 90, pitch, invDistance: 1 / CAMERA_DISTANCE, scale: 1, x: 0, y: 0,
  });
  let minX = Infinity;
  let maxX = -Infinity;
  let far = Infinity;
  let near = -Infinity;
  for (const p of points) {
    const q = probe.project(p);
    minX = Math.min(minX, q.x);
    maxX = Math.max(maxX, q.x);
    far = Math.min(far, q.y);
    near = Math.max(near, q.y);
  }
  const hip = close ? near : probe.project([-BEND_BACK, 242 - 144 - BEND_DROP, 0]).y; // once he is bent
  const frameTop = navHeight + sceneHeight * 0.05;
  const below = bottom + 16;
  const across = ((right - left - 2 * Math.max(20, sceneWidth * 0.05)) / (maxX - minX)) *
    (sceneWidth < sceneHeight && !close ? 1.3 : 1);
  const scale = Math.min(across, (below - frameTop) / (hip - far));
  const middle = (frameTop + bottom - Math.max(24, sceneHeight * 0.06)) / 2;
  const centred = middle - (scale * (far + near)) / 2;
  return {
    scale,
    x: (left + right) / 2 - (scale * (minX + maxX)) / 2,
    y: Math.max(frameTop - scale * far, Math.min(centred, below - scale * hip)),
  };
}

// His joints in the bench's space, from the same pose the rig is drawn with.
// The rig's side-on angles place every joint in X and Y exactly as the rig
// does; Z spreads his two sides apart, which only shows once the camera has
// left the side. `x` is where he stands, in units from the mark.
function figureJoints(p, x, spread) {
  const point = (vx, vy, z) => [x + vx - 70, 242 - vy, z];
  const hipY = 144 + p.bob;
  const along = (h) => [70 + h * Math.sin(p.lean * RAD), hipY - h * Math.cos(p.lean * RAD)];
  const joints = {
    hip: point(70, hipY, 0),
    neck: point(...along(89), 0),
    head: point(...along(112), 0),
    hips: [point(70, hipY, 7), point(70, hipY, -7)],
    shoulders: [point(...along(70), SHOULDER_Z), point(...along(70), -SHOULDER_Z)],
  };
  for (const [which, z] of [['near', 1], ['far', -1]]) {
    const q = p[which];
    let a = q.thigh * RAD;
    const knee = [70 - 50 * Math.sin(a), hipY + 50 * Math.cos(a)];
    a += q.knee * RAD;
    const ankle = [knee[0] - 48 * Math.sin(a), knee[1] + 48 * Math.cos(a)];
    a += q.ankle * RAD;
    const toe = [ankle[0] + 18 * Math.cos(a), ankle[1] + 18 * Math.sin(a)];
    joints[`${which}Leg`] = [
      point(70, hipY, 7 * z), point(...knee, 8 * z), point(...ankle, 8 * z), point(...toe, 8 * z),
    ];

    const shoulder = along(70);
    let b = (p.lean + q.shoulder) * RAD;
    const elbow = [shoulder[0] - 38 * Math.sin(b), shoulder[1] + 38 * Math.cos(b)];
    b += q.elbow * RAD;
    const hand = [elbow[0] - 30 * Math.sin(b), elbow[1] + 30 * Math.cos(b)];
    joints[`${which}Arm`] = [
      point(...shoulder, SHOULDER_Z * z),
      point(...elbow, mix(SHOULDER_Z, PALM_Z - 8, spread) * z),
      point(...hand, mix(SHOULDER_Z, PALM_Z, spread) * z),
    ];
  }
  return joints;
}

// `rig` is which drawing of him: the bench's, or the Skills console's.
const benchRig = { group: benchFigure, parts: figureParts, fade: spineFade, order: '' };
function drawFigure(camera, joints, e, rig = benchRig) {
  const { group, parts } = rig;
  // Lines thicken a little as the camera closes in, and more nearer to it.
  const weight = 4 * (1 + 0.3 * e);
  const pivotScale = camera.project(camera.pivot).s;
  const lineWidth = (s) => (weight * clamp(Math.sqrt(s / pivotScale), 0.7, 1.6)).toFixed(2);
  const stroke = (el, pts, extra = '') => {
    el.setAttribute('d', polyline(camera, pts) + extra);
    el.style.strokeWidth = lineWidth(pts.reduce((sum, p) => sum + camera.project(p).s, 0) / pts.length);
  };
  stroke(parts['far-leg'], joints.farLeg);
  stroke(parts['near-leg'], joints.nearLeg);
  // The bars across his shoulders and hips are points side-on, so they only
  // appear as the camera comes round.
  stroke(
    parts.spine,
    [joints.hip, joints.neck],
    polyline(camera, joints.shoulders) + polyline(camera, joints.hips),
  );

  const head = camera.project(joints.head);
  const headEl = parts.head;
  headEl.setAttribute('cx', head.x.toFixed(1));
  headEl.setAttribute('cy', head.y.toFixed(1));
  headEl.setAttribute('r', (23 * head.s).toFixed(2));
  headEl.style.strokeWidth = lineWidth(head.s);
  headEl.style.fillOpacity = ease(clamp(e / 0.3, 0, 1)).toFixed(3); // solid once he is between us and the bench

  const depth = { head: head.depth };
  for (const which of ['near', 'far']) {
    const [shoulder, elbow, hand] = joints[`${which}Arm`];
    const upper = parts[`${which}-upper`];
    const fore = parts[`${which}-fore`];
    stroke(upper, [shoulder, elbow]);
    stroke(fore.firstElementChild, [elbow, hand]);
    const palm = camera.project(hand);
    const dotEl = fore.lastElementChild;
    dotEl.setAttribute('cx', palm.x.toFixed(1));
    dotEl.setAttribute('cy', palm.y.toFixed(1));
    dotEl.setAttribute('r', (mix(2, 3, e) * palm.s).toFixed(2));
    depth[`${which}-upper`] = (camera.project(shoulder).depth + camera.project(elbow).depth) / 2;
    depth[`${which}-fore`] = (camera.project(elbow).depth + palm.depth) / 2;
  }

  // Head and arms cross over one another as the camera comes round, so they
  // are drawn farthest first.
  const order = Object.keys(depth).sort((a, b) => depth[b] - depth[a]);
  const key = order.join();
  if (key !== rig.order) {
    rig.order = key;
    for (const name of order) group.append(parts[name]);
  }
  group.style.setProperty('--behind', ease(clamp(e / 0.6, 0, 1)).toFixed(3));
  const legs = 1 - ease(clamp((e - 0.55) / 0.4, 0, 1));
  group.style.setProperty('--legs', legs.toFixed(3));

  // His back fades out below his shoulders along with his legs, so it runs
  // off into the foreground wherever the framing puts his hips.
  const neck = camera.project(joints.neck);
  const hip = camera.project(joints.hip);
  rig.fade.setAttribute('x1', neck.x.toFixed(1));
  rig.fade.setAttribute('y1', neck.y.toFixed(1));
  rig.fade.setAttribute('x2', hip.x.toFixed(1));
  rig.fade.setAttribute('y2', hip.y.toFixed(1));
  rig.fade.lastElementChild.style.stopOpacity = legs.toFixed(3);
}

/* The things he makes for each project, built on the board in the middle of
   the bench. For each part he steps along to the tray at the left end or the
   bin at the right, wherever that colour is kept, takes it with the hand on
   that side, passes it to his other hand as he steps back in, and sets it on
   the model from that side, so his head never hides the board. Last he taps
   it all together with the hammer from the front edge and stands back to
   look. Picking another project, he sweeps the old model back to where its
   parts are kept first. Bench units throughout; a part's `at` is the middle
   of its base from the middle of the board, before MODEL_SCALE. */
const MODEL_SCALE = 1.8;
const BUILD_PITCH = 70; // degrees the camera looks down once slid over to watch him build
const STAND = { tray: -58, bin: 58, left: -50, right: 50, hammer: -58, back: -58 }; // how far he has stepped right
const BUILD_LEAN = { step: 36, reach: 42, place: 50, back: 30 }; // degrees
const LIFT_TIME = 0.14; // seconds to lift a part out
const TOSS_TIME = 0.42; // seconds for a part swept off the board to land back where it is kept
const HAMMER_LENGTH = Math.hypot(...sub(HAMMER.head, HAMMER.grip));

const MODELS = [
  // Project 01: a robot.
  {
    strike: [0, 31, -3],
    parts: [
      { shape: 'box', at: [0, 0, -4.5], size: [6, 9, 5], color: 'ink' },
      { shape: 'box', at: [0, 0, 4.5], size: [6, 9, 5], color: 'ink' },
      { shape: 'box', at: [0, 9, 0], size: [12, 13, 16], color: 'teal' },
      { shape: 'box', at: [0, 10, -10.5], size: [5, 11, 4], color: 'amber' },
      { shape: 'box', at: [0, 10, 10.5], size: [5, 11, 4], color: 'amber' },
      { shape: 'box', at: [0, 22, 0], size: [10, 9, 10], color: 'paper', face: [0.3, 0.55, 0.7, 0.75] },
      { shape: 'round', at: [0, 31, 0], r: 1, h: 7, color: 'red' },
    ],
  },
  // Project 02: a rocket on its pad.
  {
    strike: [0, 2.5, -9],
    parts: [
      { shape: 'box', at: [0, 0, 0], size: [24, 2.5, 24], color: 'ink' },
      { shape: 'round', at: [0, 2.5, 0], r: 5, h: 26, color: 'paper' },
      { shape: 'box', at: [-7, 2.5, 0], size: [5, 9, 1.6], color: 'teal' },
      { shape: 'box', at: [7, 2.5, 0], size: [5, 9, 1.6], color: 'teal' },
      { shape: 'box', at: [0, 2.5, -7], size: [1.6, 9, 5], color: 'teal' },
      { shape: 'box', at: [0, 2.5, 7], size: [1.6, 9, 5], color: 'teal' },
      { shape: 'cone', at: [0, 28.5, 0], r: 5, h: 11, color: 'red' },
    ],
  },
  // Project 03: a sailboat, side-on to the camera so its sails show.
  {
    strike: [0, 7.5, -10],
    parts: [
      { shape: 'box', at: [0, 0, 0], size: [12, 6, 32], color: 'amber' },
      { shape: 'box', at: [0, 6, 0], size: [10, 1.5, 28], color: 'paper' },
      { shape: 'round', at: [0, 7.5, -2], r: 1.1, h: 30, color: 'ink' },
      { shape: 'sail', at: [0, 10, -2], pts: [[1, 0], [1, 26], [16, 0]], color: 'paper' },
      { shape: 'sail', at: [0, 10, -2], pts: [[-1, 0], [-1, 22], [-12, 0]], color: 'glass' },
      { shape: 'sail', at: [0, 37.5, -2], pts: [[0, 0], [0, -4], [6, -2]], color: 'red' },
    ],
  },
  // Project 04: an arcade cabinet.
  {
    strike: [3, 27, -3],
    parts: [
      { shape: 'box', at: [2, 0, 0], size: [14, 12, 16], color: 'ink' },
      { shape: 'box', at: [3, 12, 0], size: [12, 15, 16], color: 'ink' },
      { shape: 'box', at: [-3.4, 14, 0], size: [1.2, 10, 12], color: 'glass' },
      { shape: 'box', at: [-7.5, 10, 0], size: [5, 2, 16], color: 'amber' },
      { shape: 'round', at: [-8, 12, -4], r: 1, h: 4, color: 'red' },
      { shape: 'round', at: [-8, 12, 2], r: 1.4, h: 1, color: 'teal' },
      { shape: 'round', at: [-8, 12, 5.5], r: 1.4, h: 1, color: 'red' },
    ],
  },
  // Project 05: a camera on a tripod.
  {
    strike: [1, 25, -4],
    parts: [
      { shape: 'legs', at: [0, 0, 0], legs: [[-9, 0, -7], [-9, 0, 7], [9, 0, 0]], h: 16, color: 'ink' },
      { shape: 'box', at: [1, 16, 0], size: [10, 9, 14], color: 'ink' },
      { shape: 'box', at: [-6, 17.5, 0], size: [4, 6, 6], color: 'glass' },
      { shape: 'box', at: [3, 25, 3], size: [4, 3, 6], color: 'paper' },
      { shape: 'round', at: [4, 25, -4], r: 1.3, h: 1.5, color: 'red' },
    ],
  },
];

// How tall a part stands once scaled up, for carrying it by its top.
const partHeight = (def) => MODEL_SCALE * (def.shape === 'box' ? def.size[1]
  : def.shape === 'sail' ? Math.max(...def.pts.map(([, y]) => Math.abs(y))) : def.h);

// A part's body and lines, standing with the middle of its base at `at`,
// grown to `grow` of its size.
function partShape(camera, def, at, grow = 1) {
  const [x, y, z] = at;
  const k = MODEL_SCALE * grow;
  if (def.shape === 'box') {
    const [w, h, d] = times(def.size, k);
    const faces = box(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2);
    let body = '';
    for (const face of faces) if (camera.sees(face.normal, face.pts[0])) body += `${polyline(camera, face.pts)}Z`;
    let lines = '';
    if (def.face) {
      // A panel on the face turned towards him, as fractions of that face.
      const [s0, t0, s1, t1] = def.face;
      const front = x - w / 2 - 0.2;
      if (camera.sees([-1, 0, 0], [front, y, z])) {
        const p = (s, t) => [front, y + h * t, z - d / 2 + d * s];
        lines = `${polyline(camera, [p(s0, t0), p(s1, t0), p(s1, t1), p(s0, t1), p(s0, t0)])}`;
      }
    }
    return { body, lines };
  }
  if (def.shape === 'round' || def.shape === 'cone') {
    const bottom = ring([x, y, z], [0, 1, 0], def.r * k, 16);
    if (def.shape === 'cone') return { body: outline(camera, [...bottom, [x, y + def.h * k, z]]), lines: '' };
    const top = ring([x, y + def.h * k, z], [0, 1, 0], def.r * k, 16);
    return {
      body: outline(camera, [...bottom, ...top]) + (camera.sees([0, 1, 0], top[0]) ? `${polyline(camera, top)}Z` : ''),
      lines: '',
    };
  }
  if (def.shape === 'sail') {
    // Flat, standing across the view: [along, up] points in the z-y plane.
    return { body: `${polyline(camera, def.pts.map(([dz, dy]) => [x, y + dy * k, z + dz * k]))}Z`, lines: '' };
  }
  // Tripod legs: lines from the head down to the feet.
  const head = [x, y + def.h * k, z];
  return {
    body: '',
    lines: def.legs.map(([dx, dy, dz]) => polyline(camera, [head, [x + dx * k, y + dy * k, z + dz * k]])).join(''),
  };
}

// The hammer, from its grip to the middle of its head. Lying down its head
// lies flat; `roll` stands it up to strike.
function hammerShape(camera, grip, head, roll) {
  const along = normalise(sub(head, grip));
  const flat = normalise(cross(along, Math.abs(along[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]));
  const upright = cross(flat, along);
  const face = normalise(add(times(flat, 1 - roll), times(upright, roll)));
  const side = cross(face, along);
  const faces = (o, a, b, c) => block(o, a, b, c).filter((f) => camera.sees(f.normal, f.pts[0]))
    .map((f) => `${polyline(camera, f.pts)}Z`).join('');
  const handle = faces(sub(grip, add(times(face, 1.2), times(side, 1.2))),
    sub(head, grip), times(face, 2.4), times(side, 2.4));
  const block0 = sub(head, add(add(times(face, 5.5), times(side, 2.2)), times(along, 2.2)));
  return { handle, head: faces(block0, times(face, 11), times(side, 4.4), times(along, 4.4)) };
}

const benchBuild = benchCam.querySelector('.bench-cam__build');
const buildSparksEl = benchCam.querySelector('.bench-cam__sparks');
const build = {
  time: 0, before: 0, wanted: 0, shown: null, seq: null, plain: null, sparks: [], partEls: [], hammerEl: null,
};
const arcTo = (from, to, lift, s) => add(add(from, times(sub(to, from), s)), [0, lift * Math.sin(Math.PI * s), 0]);

// A track is a list of keys { t, v, lift } in time order. Between two keys
// its value eases from one to the next, arcing up by the later key's `lift`
// if it is a point. A hand's value may be null, for resting on the bench
// beside him wherever he stands.
function sample(track, t, resolve = (v) => v) {
  let i = 0;
  while (i < track.length - 1 && track[i + 1].t <= t) i += 1;
  const a = track[i];
  const b = track[i + 1];
  if (!b || t <= a.t) return resolve(a.v);
  const k = ease((t - a.t) / (b.t - a.t));
  const [from, to] = [resolve(a.v), resolve(b.v)];
  return typeof from === 'number' ? mix(from, to, k) : arcTo(from, to, b.lift, k);
}

// How he stands `t` seconds into the build clock: how far he has stepped
// right, his lean, a dip at each step, and where each hand is.
function buildPose(t) {
  const { tracks } = build.seq;
  const side = sample(tracks.side, t);
  const lean = sample(tracks.lean, t);
  // An idle hand rests on the bench out to its side, about an arm's length
  // from its shoulder, so nearer the edge the more upright he is.
  const shoulderX = -BEND_BACK + 70 * Math.sin(lean * RAD);
  const drop = 70 * Math.cos(lean * RAD) - BEND_BACK;
  const restX = clamp(shoulderX + Math.sqrt(Math.max(0, 60 ** 2 - drop ** 2 - 20 ** 2)), 34, 100);
  const rest = (out) => (v) => v ?? [restX, DESK.top + 1, side + out * 40];
  let bob = 0;
  const i = tracks.side.findLastIndex((key) => key.t <= t);
  const [a, b] = [tracks.side[i], tracks.side[i + 1]];
  if (a && b && a.v !== b.v) bob = -3 * Math.abs(Math.sin((2 * Math.PI * (t - a.t)) / (b.t - a.t)));
  return {
    side,
    bob,
    lean,
    R: sample(tracks.R, t, rest(1)),
    L: sample(tracks.L, t, rest(-1)),
  };
}

// Where everything is `t` seconds into the build clock: him, each part on
// the board, in his hand or flying home, and the hammer.
function buildState(t) {
  const seq = build.seq;
  if (!seq) return { parts: [], hammer: { ...HAMMER, roll: 0 }, pose: null };
  const pose = buildPose(t);
  const parts = [];
  for (const back of seq.returns) {
    const s = (t - back.t0) / TOSS_TIME;
    if (s < 0) parts.push({ def: back.def, at: back.from, grow: back.grow });
    else if (s < 1) {
      const k = ease(s);
      parts.push({ def: back.def, at: arcTo(back.from, STOCK[back.def.color], 24, k), grow: mix(back.grow, 0.3, k) });
    }
  }
  for (const part of seq.parts) {
    if (t < part.tGrab) continue;
    if (t >= part.tPlace) {
      parts.push({ def: part.def, at: part.slot, grow: 1, placed: part.tPlace });
      continue;
    }
    const hand = pose[t < part.tPass ? part.take : part.give];
    const grow = mix(0.3, 1, ease(clamp((t - part.tGrab) / LIFT_TIME, 0, 1)));
    parts.push({ def: part.def, at: sub(hand, [0, partHeight(part.def) * grow + 1, 0]), grow });
  }

  let hammer = { ...HAMMER, roll: 0 };
  if (seq.hammerBack && t < seq.hammerBack.t0 + TOSS_TIME) {
    const k = ease(clamp((t - seq.hammerBack.t0) / TOSS_TIME, 0, 1));
    const from = seq.hammerBack.from;
    hammer = { grip: arcTo(from.grip, HAMMER.grip, 16, k), head: arcTo(from.head, HAMMER.head, 16, k), roll: from.roll * (1 - k) };
  } else if (t >= seq.tPick && t < seq.tDrop) {
    const grip = pose.R;
    const aim = normalise(sub(sample(seq.tracks.aim, t), grip));
    const roll = ease(clamp(Math.min(t - seq.tPick, seq.tDrop - t) / 0.3, 0, 1));
    hammer = { grip, head: add(grip, times(aim, HAMMER_LENGTH)), roll, held: true };
  }
  return { parts, hammer, pose };
}

// Plans building `project` from wherever things are now: whatever is on the
// board is swept back to where it is kept, then the new model goes together.
function startBuild(project) {
  const t = build.time;
  const was = buildState(t);
  const now = was.pose ?? {
    side: 0,
    lean: BEND_LEAN,
    R: build.plain?.R ?? [80, DESK.top, PALM_Z],
    L: build.plain?.L ?? [77, DESK.top, -PALM_Z],
  };
  const tracks = { aim: [{ t, v: HAMMER.head, lift: 0 }] };
  for (const name of ['side', 'lean', 'R', 'L']) tracks[name] = [{ t, v: now[name], lift: 0 }];
  let T = t;
  let side = now.side;
  // Each move starts from where the last one left off, held there until T.
  const move = (name, d, v, lift = 0) => {
    const track = tracks[name];
    const last = track[track.length - 1];
    if (last.t < T) track.push({ t: T, v: last.v, lift: 0 });
    track.push({ t: T + d, v, lift });
  };
  // A few quick steps along the bench; a hand not given somewhere to go
  // comes to rest beside him.
  const stepTo = (to, lean, hands = {}) => {
    const d = clamp(0.12 + Math.abs(to - side) / 320, 0.18, 0.55);
    move('side', d, to);
    move('lean', d, lean);
    for (const name of ['R', 'L']) move(name, d, ...(hands[name] ?? [null, 5]));
    side = to;
    T += d;
  };

  // A sweep of the hand on the board's side of him clears it.
  const returns = was.parts.map((part, i) => ({ def: part.def, from: part.at, grow: part.grow, t0: T + 0.12 + i * 0.04 }));
  const hammerBack = was.hammer.held ? { from: was.hammer, t0: T } : null;
  if (returns.length) {
    const [hand, out] = side <= 0 ? ['R', 1] : ['L', -1];
    move(hand, 0.14, add(BOARD, [-8, 22, -24 * out]), 6);
    T += 0.14;
    move(hand, 0.26, add(BOARD, [-4, 16, 10 * out]), 4);
    T += 0.26;
    move(hand, 0.2, null, 6);
    T = Math.max(T, returns[returns.length - 1].t0 + TOSS_TIME - 0.2);
  }

  const model = MODELS[project];
  const parts = model.parts.map((def) => {
    const tray = STOCK[def.color][2] < 0;
    const [take, give] = tray ? ['L', 'R'] : ['R', 'L'];
    const out = tray ? -1 : 1;
    const height = partHeight(def);
    const slot = add(BOARD, times(def.at, MODEL_SCALE));
    const stock = STOCK[def.color];
    // Along to where it is kept, a hand coming over it.
    stepTo(tray ? STAND.tray : STAND.bin, BUILD_LEAN.step, { [take]: [add(stock, [0, 14, 0]), 8] });
    // Down in, and up with the part.
    move('lean', LIFT_TIME, BUILD_LEAN.reach);
    move(take, 0.14, stock);
    T += 0.14;
    const tGrab = T;
    move(take, LIFT_TIME, add(stock, [0, height + 8, 0]));
    T += LIFT_TIME;
    // Back in towards the board, passing it across in front of him.
    const spot = tray ? STAND.left : STAND.right;
    const meet = [66, DESK.top + Math.max(30, height + 10), spot];
    stepTo(spot, BUILD_LEAN.step, { [take]: [add(meet, [0, 0, 3 * out]), 6], [give]: [add(meet, [0, 0, -3 * out]), 6] });
    const tPass = T;
    // Over the model, and down onto it.
    move(take, 0.22, null, 4);
    move('lean', 0.22, BUILD_LEAN.place);
    move(give, 0.22, add(slot, [0, height + 14, 0]), 8);
    T += 0.22;
    move(give, 0.12, add(slot, [0, height + 1, 0]));
    T += 0.12;
    const tPlace = T;
    T += 0.05;
    return { def, slot, take, give, tGrab, tPass, tPlace };
  });

  // The hammer from the front edge, two taps, and back it goes.
  const strike = add(BOARD, times(model.strike, MODEL_SCALE));
  const raised = add(strike, [0, 14, 0]);
  stepTo(STAND.hammer, BUILD_LEAN.reach, { R: [add(HAMMER.grip, [0, 10, 0]), 8] });
  move('R', 0.16, HAMMER.grip);
  T += 0.16;
  const tPick = T;
  move('R', 0.32, add(strike, [-14, 13, -17]), 12);
  move('aim', 0.32, raised, 12);
  move('lean', 0.32, BUILD_LEAN.place);
  T += 0.32;
  const strikes = [];
  for (let i = 0; i < 2; i += 1) {
    move('aim', 0.08, strike);
    T += 0.08;
    strikes.push(T);
    move('aim', 0.16, raised);
    T += 0.16;
  }
  move('R', 0.32, HAMMER.grip, 12);
  move('aim', 0.32, HAMMER.head, 12);
  T += 0.32;
  const tDrop = T;
  // And he stands back to look at it.
  stepTo(STAND.back, BUILD_LEAN.back, { R: [[76, DESK.top + 1, -32], 6] });

  build.seq = { start: t, tracks, returns, hammerBack, parts, strikes, tPick, tDrop, end: T + 0.1 };
  build.shown = project;
}

// Moves the build on while the Projects sheet is open, and while the camera
// is still round behind him once it closes, so he finishes in view. Out of
// view it settles at once.
function updateBuild(dt, inView) {
  build.before = build.time;
  if (openPanelId === projectScene) {
    if (build.shown !== build.wanted) startBuild(build.wanted);
    build.time += reducedMotion.matches ? 60 : dt;
  } else if (build.seq && build.time < build.seq.end) {
    build.time = inView && !reducedMotion.matches ? build.time + dt : build.seq.end;
  }
}

// Draws the parts and the hammer, farthest first, with a few sparks where
// each part is set down and each time the hammer strikes.
function drawBuild(camera, dt) {
  const { parts, hammer } = buildState(build.time);
  const svg = (tag) => document.createElementNS('http://www.w3.org/2000/svg', tag);
  const items = parts.map((part) => ({
    depth: camera.project(add(part.at, [0, partHeight(part.def) / 2, 0])).depth,
    draw(el) {
      const { body, lines } = partShape(camera, part.def, part.at, part.grow);
      el.firstChild.setAttribute('class', `bench-cam__part bench-cam__part--${part.def.color}`);
      el.firstChild.setAttribute('d', body);
      el.lastChild.setAttribute('class', 'bench-cam__part-lines');
      el.lastChild.setAttribute('d', lines);
    },
  }));
  items.push({
    depth: camera.project(mean([hammer.grip, hammer.head])).depth,
    draw(el) {
      const shape = hammerShape(camera, hammer.grip, hammer.head, hammer.roll);
      el.firstChild.setAttribute('class', 'bench-cam__part bench-cam__part--amber');
      el.firstChild.setAttribute('d', shape.handle);
      el.lastChild.setAttribute('class', 'bench-cam__part bench-cam__part--ink');
      el.lastChild.setAttribute('d', shape.head);
    },
  });
  items.sort((a, b) => b.depth - a.depth);
  while (build.partEls.length < items.length) {
    const el = svg('g');
    el.append(svg('path'), svg('path'));
    benchBuild.append(el);
    build.partEls.push(el);
  }
  build.partEls.forEach((el, slot) => {
    const item = items[slot];
    el.toggleAttribute('hidden', !item);
    if (!item) return;
    item.draw(el);
    benchBuild.append(el);
  });

  // Sparks where a part lands or the hammer strikes, since the last frame.
  const seq = build.seq;
  const fresh = (at) => at > build.before && at <= build.time && build.time - build.before < 0.2;
  const burst = (at, count) => {
    for (let s = 0; s < count; s += 1) {
      build.sparks.push({
        at,
        speed: [(Math.random() - 0.5) * 70, 30 + Math.random() * 45, (Math.random() - 0.5) * 70],
        life: 0.25 + Math.random() * 0.12,
      });
    }
  };
  if (seq && !reducedMotion.matches) {
    for (const part of parts) {
      if (part.placed && fresh(part.placed)) {
        burst(add(part.at, [0, partHeight(part.def), 0]), 4);
        sfx.tap(1.2 + Math.random() * 0.3);
      }
    }
    seq.strikes.forEach((at, i) => {
      if (!fresh(at)) return;
      burst(add(BOARD, times(MODELS[build.shown].strike, MODEL_SCALE)), 7);
      sfx.tink(i);
    });
  }
  let sparks = '';
  build.sparks = build.sparks.filter((spark) => {
    spark.life -= dt;
    spark.speed[1] -= 220 * dt;
    spark.at = add(spark.at, times(spark.speed, dt));
    if (spark.life <= 0) return false;
    sparks += polyline(camera, [spark.at, sub(spark.at, times(spark.speed, 0.03))]);
    return true;
  });
  buildSparksEl?.setAttribute('d', sparks);
}

// An arm reaching for a point by IK, the elbow up and a little out. The
// arm stretches a little rather than fall short of the point.
function reachArm(shoulder, target, out = 1) {
  const [upper, fore] = [38, 30];
  const to = sub(target, shoulder);
  const distance = Math.hypot(...to);
  const stretch = Math.max(1, distance / (upper + fore - 0.5));
  const [a, b] = [upper * stretch, fore * stretch];
  const along = normalise(to);
  const cosine = clamp((a * a + distance * distance - b * b) / (2 * a * distance), -1, 1);
  const pole = [-0.35, 0.9, 0.25 * out];
  const bend = normalise(sub(pole, times(along, dot(pole, along))));
  const elbow = add(shoulder, add(times(along, a * cosine), times(bend, a * Math.sqrt(1 - cosine * cosine))));
  return [shoulder, elbow, target];
}

// His joints for the bench view: as the rig has him, or, once the camera has
// slid over (`w` of the way), as he goes about building.
function buildJoints(p, standX, spread, w) {
  const plain = figureJoints(p, standX, spread);
  build.plain = { R: plain.nearArm[2], L: plain.farArm[2] };
  if (w <= 0 || !build.seq) return plain;
  const pose = buildPose(build.time);
  const lean = mix(p.lean, pose.lean + (p.lean - BEND_LEAN), w);
  const joints = figureJoints({ ...p, lean }, standX, spread);
  const shift = [0, pose.bob * w, pose.side * w];
  const moved = {};
  for (const [name, value] of Object.entries(joints)) {
    moved[name] = Array.isArray(value[0]) ? value.map((q) => add(q, shift)) : add(value, shift);
  }
  const mixPoint = (a, b) => add(a, times(sub(b, a), w));
  for (const [hand, arm, out] of [['R', 'nearArm', 1], ['L', 'farArm', -1]]) {
    const reached = reachArm(moved[arm][0], mixPoint(plain[arm][2], pose[hand]), out);
    moved[arm] = reached.map((q, i) => mixPoint(plain[arm][i], q));
  }
  return moved;
}

// Draws the bench, and him with it once the camera is moving. `u` is how far
// round the camera has come and `aside` how far it has then slid over to
// leave room on the right; `markX` is the mark's x on screen, `rise` how far
// the camera has climbed with him at the Experience tower, and `standX` is
// where he stands, in units from the mark.
function drawBench(u, aside, unit, markX, rise, figurePose, standX, spread, now = performance.now(), dt = 0.016) {
  const onScreen = markX + DESK.far * unit > -40 && markX + DESK.near * unit < sceneWidth + 40;
  const show = u > 0 || onScreen;
  const drawHim = u > 0;
  benchCam.toggleAttribute('hidden', !show); // SVG elements have no .hidden
  benchFigure.toggleAttribute('hidden', !drawHim);
  figure.style.visibility = drawHim ? 'hidden' : '';
  updateBuild(dt, drawHim);
  if (!show) return;

  const e = smoother(u);
  const flat = { x: markX + PIVOT[0] * unit, y: floorY + 1 + rise - PIVOT[1] * unit };
  let camera;
  if (e === 0) {
    camera = orbitCamera({ yaw: 0, pitch: 0, invDistance: 0, scale: unit, ...flat });
  } else {
    let shot = benchShot(0, sceneWidth, sceneHeight);
    if (aside > 0) {
      // Slid over, the camera frames the whole bench top as he works along
      // it, looking a little less steeply down.
      const slid = narrowScreen.matches
        ? benchShot(0, sceneWidth, sceneHeight * SHEET_TOP, BUILD_PITCH, BENCH.top, true)
        : benchShot(0, panelLeft(), sceneHeight, BUILD_PITCH, BENCH.top, true);
      const a = ease(aside);
      shot = {
        scale: shot.scale * (slid.scale / shot.scale) ** a,
        x: mix(shot.x, slid.x, a),
        y: mix(shot.y, slid.y, a),
      };
    }
    camera = orbitCamera({
      yaw: 90 * e,
      pitch: mix(CAMERA_PITCH, BUILD_PITCH, ease(aside)) * e,
      invDistance: e / CAMERA_DISTANCE,
      scale: unit * (shot.scale / unit) ** e,
      x: mix(flat.x, shot.x, e),
      y: mix(flat.y, shot.y, e),
    });
  }

  // A soft shadow on the floor keeps the bench and him grounded once the
  // floor line has faded. Seen side-on it is edge-on, so it starts unseen.
  let shadow = '';
  for (const size of [1, 0.78, 0.56]) shadow += `${polyline(camera, SHADOW.map(([x, z]) => [
    SHADOW_CENTRE + x * size, 0, z * size,
  ]))}Z`;
  benchShadow.setAttribute('d', shadow);
  benchShadow.style.opacity = (0.035 * e).toFixed(3);

  benchLayer.style.setProperty('--zoom', (1 + 0.4 * e).toFixed(3));
  drawBenchPieces(camera);
  drawBuild(camera, dt);
  if (drawHim) drawFigure(camera, buildJoints(figurePose, standX, spread, ease(aside)), e);
}

/* ---------------------------------------------------- experience course
   The Experience stop is a city block, and arriving there he takes it on
   by himself: a spring onto the fire-escape ladder, a dive roll over the
   roof vent, a leap to the rope and a swing off it into a backflip, a
   front flip over the gap between rooftops, a dyno up the wall, and a
   backflip at the top. Each rooftop is a step in his career, and its sign
   drops in as he reaches it. It is laid out in figure units from the
   Experience mark - x to the right, y up from the floor - and the scenery
   is drawn from the same numbers, so his hands and feet land on its rungs,
   rope and holds. Leaving, he flips off towards wherever he is headed. */

const [P1, P2, P3] = [340, 680, 1020]; // rooftop heights
const TOWER = {
  decks: [[40, 800, P1], [130, 400, P2], [470, 720, P2], [-70, 236, P3]], // the rooftops
  ladder: 70, // the fire-escape ladder's middle
  vent: { x: 300, top: P1 + 56 }, // the roof vent he dive rolls over
  rope: { x: 760, top: 860, length: 510 },
  wall: [120, 236],
  banner: [-40, 200], // the poles the summit banner hangs between; the flag tops the first
};

// Experience is the railway line (see the experience line); ?experience=tower
// brings back this rooftop course instead.
const TOWER_MODE = new URLSearchParams(location.search).get('experience') === 'tower';

// The levels, bottom to top, are his career so far. `from` and `to` are
// [year, month] and space the line's stations; the 2025 month is a guess.
const CAREER = [
  {
    dates: '2020 – 2022', from: [2020, 1], to: [2022, 1],
    title: ['Web & UI/UX', 'Developer'], note: 'Freelance',
    summary: 'Building websites and web apps since 2020, shifting focus in 2022 to high-polish UI/UX design. Designing clean, custom front-end interfaces that look great for users and are easy for other developers to work with.',
  },
  {
    dates: '2022 – 2025', from: [2022, 1], to: [2025, 1],
    title: ['Infrastructure', 'Engineer'], note: 'Pet Plus',
    summary: 'Set up core IT infrastructure and code repos from scratch. Led the first automated synchronization between Lightspeed POS and Shopify, and negotiated partner API integrations.',
  },
  {
    dates: '2025 – Present', from: [2025, 1], to: null,
    title: ['Systems', 'Engineer'], note: 'Pet Plus',
    summary: 'Built custom in-house software saving $5,000+ (R82,200). Rebuilt company web storefront with Cloudflare DNS slashing LCP from 40s to ~1s, created Lightspeed financial dashboards, and developed DOM injection tools.',
  },
];
const CLIMB_HIP = 102; // his hip above the foot of a climb before he rises
const CLIMB_VIEW = 0.62; // how far down the screen his feet stay as the camera climbs
const SEGMENT_BLEND = 0.12; // seconds each move eases in from the one before
const JUMP_GRAVITY = 1400; // units a second squared
const JUMP_HOP = 320; // units a second upwards as he pushes off
const JUMP_CROUCH = 0.18; // seconds
const JUMP_LAND = 0.55; // seconds

// Which limb moves when on a climb: each holds on, then moves up one step
// in its quarter of the cycle, so three are always holding. Heights are
// from the foot of the climb; ladder rungs sit 30 apart from 20 up.
const LADDER_GRIP = {
  step: 60,
  near: { hand: [170, 0], foot: [50, 0.75] },
  far: { hand: [200, 0.5], foot: [20, 0.25] },
};
const ROPE_GRIP = {
  step: 56,
  near: { hand: [170, 0], foot: [20, 0.3] },
  far: { hand: [198, 0.5], foot: [20, 0.3] },
};

// A repeatable wobble in -0.5..0.5, for the climbing wall's holds.
const wobble = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s) - 0.5;
};

const clonePose = (p) => ({ near: { ...p.near }, far: { ...p.far }, bob: p.bob, lean: p.lean, spin: p.spin || 0 });
const arc = ([x0, y0], [x1, y1], peak, s) => [mix(x0, x1, s), mix(y0, y1, s) + 4 * peak * s * (1 - s)];
const around = (a) => a - 360 * Math.round(a / 360); // the same turn, within half a turn of upright
const place = (hip, pose, flip, mode) => ({ x: hip[0], lift: hip[1] - 98 + pose.bob, flip, mode, pose });

// His pose with the hip at `hip` and each hand and foot pinned by IK to a
// point on the tower, all in tower units, facing `flip`.
function gripPose(base, flip, hip, limbs, lean) {
  const p = clonePose(base);
  p.bob = 0;
  p.lean = lean;
  p.spin = 0;
  const local = ([x, y]) => [70 + (x - hip[0]) * flip, 144 - (y - hip[1])];
  for (const side of ['near', 'far']) {
    Object.assign(p[side], reach(0, ...local(limbs[side].foot)));
    Object.assign(p[side], armReach(lean, ...local(limbs[side].hand)));
  }
  return p;
}

// Loaded to spring: knees bent over planted feet, arms swung back.
function crouchPose(base, depth) {
  const p = clonePose(base);
  const k = depth / 40;
  p.bob = depth;
  Object.assign(p.near, reach(depth, 78, 242));
  Object.assign(p.far, reach(depth, 64, 242));
  p.near.shoulder = mix(base.near.shoulder, 46, k);
  p.far.shoulder = mix(base.far.shoulder, 36, k);
  p.near.elbow = mix(base.near.elbow, -28, k);
  p.far.elbow = mix(base.far.elbow, -36, k);
  p.lean = mix(base.lean, 24, k);
  return p;
}

const setPose = (base, near, far, lean) => {
  const p = clonePose(base);
  Object.assign(p.near, near);
  Object.assign(p.far, far);
  p.lean = lean;
  p.bob = 0;
  p.spin = 0;
  return p;
};
// Knees to chest, arms round the shins.
const tuckPose = (base) => setPose(base,
  { thigh: -128, knee: 150, ankle: -20, shoulder: -54, elbow: -104 },
  { thigh: -116, knee: 142, ankle: -26, shoulder: -42, elbow: -116 }, 24);
// Stretched out long, arms overhead.
const reachPose = (base) => setPose(base,
  { thigh: -6, knee: 10, ankle: 24, shoulder: -176, elbow: -4 },
  { thigh: 8, knee: 18, ankle: 18, shoulder: -164, elbow: -10 }, -2);
// Flying flat: arms out in front, legs together behind.
const divePose = (base) => setPose(base,
  { thigh: 14, knee: 8, ankle: 30, shoulder: -172, elbow: -4 },
  { thigh: 22, knee: 16, ankle: 24, shoulder: -166, elbow: -8 }, 0);
// Falling open: arms wide, knees soft.
const fallPose = (base) => setPose(base,
  { thigh: -30, knee: 42, ankle: -10, shoulder: -118, elbow: -20 },
  { thigh: -8, knee: 60, ankle: -20, shoulder: -84, elbow: -30 }, 6);
// Hanging from his hands, knees brought up or legs swung back.
const hangPose = (base, pike) => setPose(base,
  { thigh: mix(18, -80, pike), knee: mix(16, 36, pike), ankle: 20, shoulder: -178, elbow: -2 },
  { thigh: mix(26, -70, pike), knee: mix(22, 48, pike), ankle: 20, shoulder: -172, elbow: -6 }, 0);
// The sprint leans into it (the gait's own run leans back).
const sprint = (distance) => ({ ...pose(GAITS.run, (distance / GAITS.run.travel) * 100), lean: 14, spin: 0 });

// Where a climb's hold is: `index` counts up the holds one limb uses.
function holdAt(climb, side, limb, index) {
  const [base] = climb.grip[side][limb];
  const reachIn = limb === 'hand' ? climb.hand : climb.foot;
  const jitter = climb.jitter ? climb.jitter * wobble(index * 4 + (side === 'near' ? 0 : 2) + (limb === 'hand' ? 1 : 0)) : 0;
  const y = climb.y0 + base + climb.grip.step * index;
  // Where the holds run out, the last handholds are the edge of the deck.
  return [climb.x - climb.flip * reachIn + jitter, limb === 'hand' ? Math.min(y, climb.handTop ?? y) : y];
}

// Hip and limb positions once a climb has raised him `rise` units.
function climbState(climb, rise) {
  const limbs = {};
  for (const side of ['near', 'far']) {
    limbs[side] = {};
    for (const limb of ['hand', 'foot']) {
      const start = climb.grip[side][limb][1];
      const cycle = rise / climb.grip.step;
      const n = Math.floor(cycle);
      const move = ease(clamp((cycle - n - start) / 0.25, 0, 1));
      const from = holdAt(climb, side, limb, n);
      const to = holdAt(climb, side, limb, n + 1);
      const lift = Math.sin(Math.PI * move);
      limbs[side][limb] = [
        mix(from[0], to[0], move) - climb.flip * lift * (limb === 'hand' ? 7 : 5),
        mix(from[1], to[1], move) + lift * (limb === 'hand' ? 4 : 10),
      ];
    }
  }
  return { hip: [climb.x - climb.flip * climb.hip, climb.y0 + CLIMB_HIP + rise], limbs };
}

function heldAt(climb, rise, base) {
  const { hip, limbs } = climbState(climb, rise);
  return place(hip, gripPose(base, climb.flip, hip, limbs, climb.lean), climb.flip, climb.mode);
}

// Over the top of a climb: a knee up onto the deck, the other foot after it,
// and he lets go and stands up.
function mountAt(c, u, base) {
  const f = c.flip;
  const top = climbState(c, c.rise);
  const e = ease(u);
  const hip = [mix(top.hip[0], c.land, e), mix(top.hip[1], c.top + 98, e) + 16 * Math.sin(Math.PI * u)];
  const stepTo = (from, to, a, b) => {
    const k = ease(clamp((u - a) / (b - a), 0, 1));
    return [mix(from[0], to[0], k), mix(from[1], to[1], k) + 18 * Math.sin(Math.PI * k)];
  };
  const edge = [c.x + f * 18, c.top];
  const limbs = {
    near: {
      hand: top.limbs.near.hand,
      foot: stepTo(stepTo(top.limbs.near.foot, edge, 0.05, 0.45), [c.land + f * 4, c.top], 0.72, 0.97),
    },
    far: { hand: top.limbs.far.hand, foot: stepTo(top.limbs.far.foot, [c.land - f * 5, c.top], 0.42, 0.82) },
  };
  const climbing = gripPose(base, f, hip, limbs, mix(c.lean, 0, e));
  const letGo = ease(clamp((u - 0.35) / 0.35, 0, 1));
  for (const side of ['near', 'far']) {
    climbing[side].shoulder = mix(climbing[side].shoulder, base[side].shoulder, letGo);
    climbing[side].elbow = mix(climbing[side].elbow, base[side].elbow, letGo);
  }
  const standing = mixPose(climbing, base, ease(clamp((u - 0.82) / 0.18, 0, 1)));
  return place(hip, standing, f, 'mount');
}

// The rope's angle through the swing, degrees, positive swinging right.
const SWING = [[0, 0], [0.42, 26], [1, -32]];
function swingAngle(t) {
  for (let i = 1; i < SWING.length; i += 1) {
    const [t1, a1] = SWING[i];
    const [t0, a0] = SWING[i - 1];
    if (t <= t1) return mix(a0, a1, (1 - Math.cos(Math.PI * clamp((t - t0) / (t1 - t0), 0, 1))) / 2);
  }
  return SWING[SWING.length - 1][1];
}
const ropeAt = (below, angle) => [
  TOWER.rope.x + below * Math.sin(angle * RAD),
  TOWER.rope.top - below * Math.cos(angle * RAD),
];
const ROPE_GRAB = 100; // how far below the beam his hands hold the rope to swing
const HANG = 138; // hands to hip, arms straight overhead

/* The routine, move by move. Each move takes its time in seconds and gives
   where he is and how he stands a given time into it, from his resting pose.
   Committed moves - anything in the air - are finished before he leaves. */
const COURSE = (() => {
  const segments = [];
  const add = (mode, duration, at, committed = false) => segments.push({ mode, duration, at, committed });
  const reached = (level) => { segments[segments.length - 1].reaches = level; }; // this move starts on a new level
  const ladder = { mode: 'ladder', x: TOWER.ladder, flip: 1, y0: 0, top: P1, land: 106, hand: 2, foot: 14, hip: 28, lean: 6, grip: LADDER_GRIP, rise: 228 };
  const rope = { mode: 'rope', x: TOWER.rope.x, flip: 1, y0: P1, hand: 0, foot: 10, hip: 26, lean: -2, grip: ROPE_GRIP };
  const wall = { mode: 'wall', x: 220, flip: -1, y0: P2, top: P3, land: 184, hand: 2, foot: -6, hip: 28, lean: 5, grip: LADDER_GRIP, jitter: 14, handTop: P3 + 2, rise: 228 };
  const run = (from, to, y, duration) => add('run', duration, (t, base) => {
    const x = mix(from, to, t / duration);
    return { x, lift: y, flip: Math.sign(to - from), mode: 'run', pose: sprint(Math.abs(x - from)) };
  });
  // A crouch, a spring, and the catch: `grab` is where he ends up.
  const spring = (mode, duration, from, y, flip, grab, peak) => add(mode, duration, (t, base) => {
    const load = 0.32 * duration;
    const loaded = crouchPose(base, 30);
    if (t < load) {
      const p = mixPose(base, loaded, ease(t / load));
      return place([from, y + 98 - p.bob], p, flip, mode);
    }
    const s = (t - load) / (duration - load);
    const end = grab(base);
    const hip = arc([from, y + 68], [end.x, end.lift + 98 - end.pose.bob], peak, s);
    const p = s < 0.45
      ? mixPose(loaded, reachPose(base), ease(s / 0.45))
      : mixPose(reachPose(base), end.pose, ease((s - 0.45) / 0.55));
    return place(hip, p, flip, mode);
  }, true);
  // A flip through the air from one point to another, tucked in the middle;
  // `turns` is positive forwards.
  const flip = (mode, duration, from, to, peak, facing, turns, startPose, spinFrom = 0) => add(mode, duration, (t, base) => {
    const s = t / duration;
    const hip = arc(from, to, peak, s);
    const start = startPose(base);
    const landing = crouchPose(base, 28);
    const p = s < 0.2 ? mixPose(start, tuckPose(base), ease(s / 0.2))
      : s > 0.74 ? mixPose(tuckPose(base), landing, ease((s - 0.74) / 0.26))
      : tuckPose(base);
    p.spin = around(spinFrom + (360 * turns - spinFrom) * ease(clamp((s - 0.04) / 0.8, 0, 1)));
    return place(hip, p, facing, mode);
  }, true);
  const land = (x, y, duration, fromFlip, toFlip) => add('land', duration, (t, base) => {
    const k = t / duration;
    const p = crouchPose(base, 28 * (1 - ease(k)));
    return { x, lift: y, flip: mix(fromFlip, toFlip, ease(clamp((k - 0.25) / 0.75, 0, 1))), mode: 'land', pose: p };
  });

  // Spring onto the ladder, scramble up it and over onto the first deck.
  spring('leap', 0.62, 0, 0, 1, (base) => heldAt(ladder, 60, base), 24);
  add('ladder', 0.95, (t, base) => heldAt(ladder, mix(60, 228, t / 0.95), base));
  add('mount', 0.5, (t, base) => mountAt(ladder, t / 0.5, base), true);

  // Sprint at the roof vent and dive roll over it.
  run(106, 220, P1, 0.4);
  reached(1);
  add('dive', 0.9, (t, base) => {
    const s = t / 0.9;
    if (s < 0.5) {
      const k = s / 0.5;
      const p = mixPose(sprint(114), divePose(base), ease(clamp(k / 0.3, 0, 1)));
      p.spin = 95 * ease(k);
      return place(arc([220, P1 + 98], [336, P1 + 60], 70, k), p, 1, 'dive');
    }
    const k = (s - 0.5) / 0.5;
    const up = ease(clamp((k - 0.55) / 0.45, 0, 1));
    const p = mixPose(tuckPose(base), sprint(0), ease(clamp((k - 0.68) / 0.32, 0, 1)));
    p.spin = around(mix(95, 360, ease(k)));
    return place([mix(336, 402, k), P1 + mix(52, 98, up)], p, 1, 'dive');
  }, true);
  run(402, 690, P1, 0.75);

  // Leap and catch the rope high, climb it hand over hand, swing, and let go
  // into a backflip onto the second deck.
  spring('leap', 0.5, 690, P1, 1, (base) => heldAt(rope, 60, base), 30);
  add('rope', 1.05, (t, base) => ({ ...heldAt(rope, mix(60, 230, t / 1.05), base), rope: 0 }));
  add('swing', 1.0, (t, base) => {
    const angle = swingAngle(t);
    const hands = ropeAt(ROPE_GRAB, angle);
    const hip = ropeAt(ROPE_GRAB + HANG, angle);
    // Knees drive up on the swing forward and sweep back through.
    const pike = t < 0.42 ? ease(t / 0.42) : t < 0.78 ? 1 - ease((t - 0.42) / 0.36) : 0.8 * ease((t - 0.78) / 0.22);
    const p = hangPose(base, pike);
    p.spin = -angle;
    return { ...place(hip, p, 1, 'swing'), rope: angle, hands };
  }, true);
  const letGo = ropeAt(ROPE_GRAB + HANG, SWING[SWING.length - 1][1]);
  flip('backflip', 0.8, letGo, [640, P2 + 70], 90, 1, -1, (base) => hangPose(base, 0.8), 32);
  land(640, P2, 0.34, 1, -1);
  reached(2);

  // Along the second deck and a front flip over the gap.
  run(640, 490, P2, 0.5);
  flip('flip', 0.8, [490, P2 + 98], [372, P2 + 70], 96, -1, 1, () => sprint(0));
  land(372, P2, 0.26, -1, -1);
  run(372, 300, P2, 0.28);

  // Spring to the wall, then a dyno: sink onto the holds, throw for the
  // next ones two holds up, and catch them.
  spring('leap', 0.55, 300, P2, -1, (base) => heldAt(wall, 60, base), 22);
  add('wall', 0.4, (t, base) => heldAt(wall, mix(60, 100, t / 0.4), base));
  add('dyno', 0.62, (t, base) => {
    const s = t / 0.62;
    const { hip, limbs } = climbState(wall, 100);
    const sunk = [hip[0] - 6, hip[1] - 28];
    const loaded = gripPose(base, -1, sunk, limbs, 14);
    if (s < 0.3) {
      const k = ease(s / 0.3);
      const low = [mix(hip[0], sunk[0], k), mix(hip[1], sunk[1], k)];
      return place(low, gripPose(base, -1, low, limbs, mix(5, 14, k)), -1, 'dyno');
    }
    const k = (s - 0.3) / 0.7;
    const caught = heldAt(wall, 186, base);
    const p = k < 0.5
      ? mixPose(loaded, reachPose(base), ease(k / 0.5))
      : mixPose(reachPose(base), caught.pose, ease((k - 0.5) / 0.5));
    return place(arc(sunk, [caught.x, caught.lift + 98], 22, k), p, -1, 'dyno');
  }, true);
  add('wall', 0.36, (t, base) => heldAt(wall, mix(186, 228, t / 0.36), base));
  add('mount', 0.5, (t, base) => mountAt(wall, t / 0.5, base), true);

  // Under the banner, a standing backflip, and a fist in the air.
  run(184, 60, P3, 0.46);
  reached(3);
  add('backflip', 0.95, (t, base) => {
    const s = t / 0.95;
    const loaded = crouchPose(base, 32);
    if (s < 0.2) {
      const p = mixPose(base, loaded, ease(s / 0.2));
      return place([60, P3 + 98 - p.bob], p, -1, 'backflip');
    }
    const k = (s - 0.2) / 0.8;
    const p = k < 0.16 ? mixPose(loaded, reachPose(base), ease(k / 0.16))
      : k < 0.3 ? mixPose(reachPose(base), tuckPose(base), ease((k - 0.16) / 0.14))
      : k > 0.76 ? mixPose(tuckPose(base), crouchPose(base, 30), ease((k - 0.76) / 0.24))
      : tuckPose(base);
    p.spin = around(-360 * ease(clamp((k - 0.08) / 0.78, 0, 1)));
    return place(arc([60, P3 + 66], [74, P3 + 68], 110, k), p, -1, 'backflip');
  }, true);
  add('cheer', 0.8, (t, base) => {
    const k = ease(t / 0.8);
    const cheer = setPose(base,
      { ...base.near, shoulder: -138, elbow: -42 },
      { ...base.far, shoulder: 14 }, -4);
    const p = mixPose(crouchPose(base, 30 * (1 - k)), cheer, k);
    return { x: 74, lift: P3, flip: -1, mode: 'cheer', pose: p };
  });
  add('rest', 1.2, (t, base) => {
    const cheer = setPose(base, { ...base.near, shoulder: -138, elbow: -42 }, { ...base.far, shoulder: 14 }, -4);
    return { x: 74, lift: P3, flip: -1, mode: 'rest', pose: mixPose(cheer, base, ease(clamp((t - 0.5) / 0.7, 0, 1))) };
  });

  let total = 0;
  const reveals = []; // when he reaches each level
  for (const segment of segments) {
    segment.start = total;
    if (segment.reaches) reveals[segment.reaches - 1] = total;
    total += segment.duration;
  }
  return { segments, total, wall, reveals };
})();

// The move at a time into the routine, and how far into it.
function courseSegment(time) {
  const at = clamp(time, 0, COURSE.total);
  let index = 0;
  for (let i = 0; i < COURSE.segments.length; i += 1) if (at >= COURSE.segments[i].start) index = i;
  const segment = COURSE.segments[index];
  return { segment, index, t: Math.min(at - segment.start, segment.duration) };
}

// Where he is and how he stands a given time into the routine. Each move
// eases in from where the one before left him.
function courseAt(time, base) {
  const { segment, index, t } = courseSegment(time);
  let here = segment.at(t, base);
  if (index > 0 && t < SEGMENT_BLEND) {
    const before = COURSE.segments[index - 1];
    const was = before.at(before.duration, base);
    const w = ease(t / SEGMENT_BLEND);
    here = {
      ...here,
      x: mix(was.x, here.x, w),
      lift: mix(was.lift, here.lift, w),
      flip: mix(was.flip, here.flip, w),
      pose: mixPose(was.pose, here.pose, w),
    };
  }
  return here;
}

// Leaving the tower: a crouch, a flip off towards wherever he is headed, a
// fall the camera follows, and a landing on one knee.
function startJump(unit, here) {
  const dir = Math.sign(state.target - (experienceX + here.x * unit)) || (here.flip >= 0 ? 1 : -1);
  const air = (JUMP_HOP + Math.sqrt(JUMP_HOP * JUMP_HOP + 2 * JUMP_GRAVITY * here.lift)) / JUMP_GRAVITY;
  state.jump = {
    t: 0, from: here.x, lift: here.lift, flip: here.flip, dir, air, dusted: false,
    land: here.x + dir * (130 + 0.15 * here.lift), // further from higher up
  };
}

function jumpAt(jump, base) {
  const { t, air } = jump;
  const loaded = crouchPose(base, 26);
  if (t < JUMP_CROUCH) {
    const k = ease(t / JUMP_CROUCH);
    const set = courseAt(state.courseTime, base);
    return { x: jump.from, lift: jump.lift, flip: mix(jump.flip, jump.dir, k), mode: 'jump', pose: mixPose(set.pose, loaded, k) };
  }
  if (t < JUMP_CROUCH + air) {
    const a = (t - JUMP_CROUCH) / air;
    // A front flip off the top, then open and falling, legs reaching down.
    const flipFor = Math.min(0.62, 0.55 / air);
    const tucked = a < flipFor;
    let p;
    if (tucked) {
      p = a < 0.12 ? mixPose(loaded, tuckPose(base), ease(a / 0.12)) : tuckPose(base);
      p.spin = around(360 * ease(clamp(a / flipFor, 0, 1)));
    } else {
      const open = ease(clamp((a - flipFor) / 0.15, 0, 1));
      p = mixPose(tuckPose(base), fallPose(base), open);
      const down = ease(clamp((a - 0.8) / 0.2, 0, 1));
      p.near.thigh = mix(p.near.thigh, -40, down);
      p.near.knee = mix(p.near.knee, 50, down);
      p.far.thigh = mix(p.far.thigh, 10, down);
      p.far.knee = mix(p.far.knee, 40, down);
    }
    const seconds = t - JUMP_CROUCH;
    return {
      x: mix(jump.from, jump.land, a),
      lift: Math.max(0, jump.lift + JUMP_HOP * seconds - (JUMP_GRAVITY * seconds * seconds) / 2),
      flip: jump.dir, mode: 'jump', pose: p,
    };
  }
  // Down on one knee, a hand to the floor, and back up.
  const k = clamp((t - JUMP_CROUCH - air) / JUMP_LAND, 0, 1);
  return { x: jump.land, lift: 0, flip: jump.dir, mode: 'jump', pose: kneelLanding(base, k) };
}

// Runs the routine while he is at Experience, and his jump off it when he
// leaves. Anything in the air is finished first; from the floor he just
// goes.
function updateCourse(dt, unit) {
  if (!TOWER_MODE) return;
  if (!state.jump && state.courseTime > 0 && state.destinationId !== experienceScene) {
    const { segment, t } = courseSegment(state.courseTime);
    if (reducedMotion.matches) {
      state.courseTime = 0;
    } else if (segment.committed && t < segment.duration) {
      state.courseTime = Math.min(segment.start + segment.duration, state.courseTime + dt);
    } else {
      const here = courseAt(state.courseTime, pose(GAITS.idle, 0));
      if (here.lift < 8) {
        state.x = experienceX + here.x * unit;
        state.facing = state.flip = here.flip >= 0 ? 1 : -1;
        state.courseTime = 0;
      } else {
        startJump(unit, here);
      }
    }
  }

  if (state.jump) {
    const jump = state.jump;
    jump.t += dt;
    if (!jump.dusted && jump.t >= JUMP_CROUCH + jump.air) {
      jump.dusted = true;
      const at = experienceX + jump.land * unit;
      spawnDust(at, 1, unit, { count: 7, power: 1.4 });
      spawnDust(at, -1, unit, { count: 7, power: 1.4 });
    }
    if (jump.t >= JUMP_CROUCH + jump.air + JUMP_LAND) {
      state.x = experienceX + jump.land * unit;
      state.facing = state.flip = jump.dir;
      state.courseTime = 0;
      state.jump = null;
      // Sent back to Experience mid-air, he walks back to its mark.
      if (state.destinationId === experienceScene) {
        state.experienceActive = false;
        state.announced = false;
        scene.setAttribute('aria-busy', 'true');
      }
    }
    return;
  }

  if (state.experienceActive) {
    state.courseTime = reducedMotion.matches ? COURSE.total : Math.min(COURSE.total, state.courseTime + dt);
  }
}

// The rope swings with him, then keeps swinging on its own and settles.
let towerRope = null;
const ropeSwing = { angle: 0, speed: 0 };
function updateRope(dt, heldAngle) {
  if (heldAngle !== undefined) {
    ropeSwing.speed = dt > 0 ? (heldAngle - ropeSwing.angle) / dt : 0;
    ropeSwing.angle = heldAngle;
  } else if (Math.abs(ropeSwing.angle) > 0.02 || Math.abs(ropeSwing.speed) > 0.02) {
    const pull = -(JUMP_GRAVITY / TOWER.rope.length) * Math.sin(ropeSwing.angle * RAD) / RAD;
    ropeSwing.speed += (pull - 0.9 * ropeSwing.speed) * dt;
    ropeSwing.angle += ropeSwing.speed * dt;
  } else {
    return;
  }
  towerRope?.setAttribute('transform', `rotate(${(-ropeSwing.angle).toFixed(2)} ${TOWER.rope.x} ${-TOWER.rope.top})`);
}

// Draws the tower into its SVG from the same numbers he climbs by, and sets
// its box so one viewBox unit is one figure unit.
let towerSigns = [];
function buildTower(svg) {
  const [left, right, top] = [-270, 985, 1480];
  svg.setAttribute('viewBox', `${left} ${-top} ${right - left} ${top + 6}`);
  svg.style.left = `calc(var(--experience-x) + var(--fig-h) * ${(left / 242).toFixed(4)})`;
  svg.style.width = `calc(var(--fig-h) * ${((right - left) / 242).toFixed(4)})`;
  svg.style.height = `calc(var(--fig-h) * ${((top + 6) / 242).toFixed(4)})`;

  const out = [];
  const pt = ([x, y]) => `${x.toFixed(1)} ${(-y).toFixed(1)}`;
  const path = (cls, ...lines) => out.push(`<path class="${cls}" d="${lines.map((line) => `M${line.map(pt).join('L')}`).join('')}" />`);
  const block = (cls, x0, y0, x1, y1, round = 0) => out.push(
    `<rect class="${cls}" x="${x0}" y="${-y1}" width="${x1 - x0}" height="${y1 - y0}"${round ? ` rx="${round}"` : ''} />`,
  );
  const text = (cls, x, y, words) => out.push(`<text class="${cls}" x="${x}" y="${-y}">${words.replace(/&/g, '&amp;')}</text>`);

  // A cable sagging between two points.
  const cable = (cls, from, to, sag) => {
    const line = [];
    for (let i = 0; i <= 24; i += 1) {
      const s = i / 24;
      line.push([mix(from[0], to[0], s), mix(from[1], to[1], s) - 4 * sag * s * (1 - s)]);
    }
    path(cls, line);
  };

  // Ruler ticks under the ground line, like the survey drawing.
  const ticks = [];
  for (let x = -255; x <= 975; x += 58) ticks.push([[x, -14], [x, 0]]);
  path('tower__hatch', ...ticks);

  // The faded skyline behind: plain blocks, two antennas, a truss bridge in
  // the gap between the mid rooftops, and a zipline strung between two of
  // the far blocks.
  for (const [x0, x1, h] of [[-250, -196, 460], [388, 462, 520], [545, 655, 800], [742, 822, 560], [892, 978, 640]]) {
    path('tower__backdrop', [[x0, 0], [x0, h], [x1, h], [x1, 0]]);
  }
  path('tower__backdrop', [[-223, 460], [-223, 512]], [[-230, 478], [-216, 478]], [[-233, 494], [-213, 494]]);
  path('tower__backdrop', [[908, 640], [908, 702]], [[901, 658], [915, 658]], [[898, 676], [918, 676]]);
  const truss = [[[398, 742], [472, 742]], [[398, 700], [472, 700]], [[398, 700], [398, 742]], [[472, 700], [472, 742]]];
  for (let x = 398; x < 472; x += 18.5) truss.push([[x, 700], [x + 18.5, 742]], [[x, 742], [x + 18.5, 700]]);
  path('tower__truss', ...truss);
  cable('tower__cable tower__cable--far', [600, 800], [935, 640], 40);

  // The water tower by the entrance: a banded tank on cross-braced legs,
  // its own skinny ladder, and a conical roof.
  const wl = (y) => -162 + (10 / 430) * y; // the left leg's x at height y
  const wr = (y) => -88 - (10 / 430) * y; // the right leg's
  const stand = [[[wl(0), 0], [wl(430), 430]], [[wr(0), 0], [wr(430), 430]]];
  for (const [y0, y1] of [[20, 225], [225, 425]]) {
    stand.push([[wl(y0), y0], [wr(y0), y0]], [[wl(y1), y1], [wr(y1), y1]],
      [[wl(y0), y0], [wr(y1), y1]], [[wr(y0), y0], [wl(y1), y1]]);
  }
  path('tower__stand', ...stand);
  const towerRungs = [];
  for (let y = 30; y < 430; y += 40) towerRungs.push([[-170, y], [-160, y]]);
  path('tower__tower-ladder', [[-170, 0], [-170, 425]], [[-160, 0], [-160, 425]], ...towerRungs);
  block('tower__tank', -172, 430, -78, 545);
  path('tower__tank-band', [[-172, 468], [-78, 468]], [[-172, 506], [-78, 506]]);
  out.push(`<path class="tower__tank-roof" d="M${pt([-178, 545])}L${pt([-125, 600])}L${pt([-72, 545])}Z" />`);

  // The buildings: each deck is a rooftop and its block runs to the ground,
  // the tallest drawn first so the lower ones overlap it, each with a
  // coping-stone lip along the roof's edge.
  for (const [x0, x1, y] of [...TOWER.decks].sort((a, b) => b[2] - a[2])) {
    block('tower__block', x0, 0, x1, y);
    block('tower__coping', x0 - 4, y - 6, x1 + 4, y);
  }

  // The first block's face: party lines where the frontages meet, and a few
  // windows kept clear of the ladder.
  path('tower__seam', [[300, 0], [300, 334]], [[560, 0], [560, 334]]);
  for (const x of [130, 420, 620]) {
    for (const y of [110, 220]) block('tower__window', x, y, x + 50, y + 60);
  }

  // The fire-escape ladder, rungs where his hands and feet go.
  const lx = TOWER.ladder;
  const rungs = [];
  for (let y = 20; y <= 440; y += 30) rungs.push([[lx - 15, y], [lx + 15, y]]);
  path('tower__ladder', [[lx - 15, 0], [lx - 15, 454]], [[lx + 15, 0], [lx + 15, 454]], ...rungs);

  // The roof vent he dive rolls over, louvred, with a flue on top.
  const { x: hx, top: ht } = TOWER.vent;
  block('tower__vent', hx - 24, P1, hx + 24, ht - 2);
  block('tower__vent', hx - 28, ht - 2, hx + 28, ht + 2);
  const louvers = [];
  for (let y = P1 + 12; y < ht - 10; y += 8.5) louvers.push([[hx - 18, y], [hx + 18, y]]);
  path('tower__louver', ...louvers);
  path('tower__pipe', [[hx + 6, ht + 2], [hx + 6, ht + 16]], [[hx, ht + 16], [hx + 12, ht + 16]]);

  // A skylight on the second rooftop, a drainpipe down the third, and the
  // billboard frame its sign hangs from.
  block('tower__vent', 150, P2, 206, P2 + 14);
  path('tower__louver', [[160, P2 + 7], [196, P2 + 7]]);
  path('tower__pipe', [[726, P2 - 8], [726, 24], [734, 8]]);
  block('tower__frame', 465, P2, 475, 1045);
  block('tower__frame', 715, P2, 725, 1045);
  block('tower__frame', 461, 1035, 729, 1045);
  path('tower__frame-brace', [[470, 990], [500, 1035]], [[720, 990], [690, 1035]]);

  // The climbing wall on the tall block's face, with a hold wherever his
  // hands and feet will go and a scatter of others.
  const [wx0, wx1] = TOWER.wall;
  block('tower__wall', wx0, P2, wx1, P3);
  path('tower__seam', [[wx0, (P2 + P3) / 2], [wx1, (P2 + P3) / 2]], [[(wx0 + wx1) / 2, P2], [(wx0 + wx1) / 2, P3]]);
  const wall = COURSE.wall;
  const holds = [];
  for (const side of ['near', 'far']) {
    for (const limb of ['hand', 'foot']) {
      for (let i = 0; wall.y0 + wall.grip[side][limb][0] + wall.grip.step * i < P3 - 10; i += 1) {
        const [x, y] = holdAt(wall, side, limb, i);
        holds.push([x + (limb === 'foot' ? wall.flip * 10 : 0), y - (limb === 'hand' ? 2 : 0)]);
      }
    }
  }
  for (let i = 0; i < 16; i += 1) holds.push([wx0 + 14 + (wobble(i + 40) + 0.5) * 60, P2 + 20 + (wobble(i + 90) + 0.5) * 300]);
  holds.forEach(([x, y], i) => {
    const r = 4 + (wobble(i + 7) + 0.5) * 2.5;
    out.push(`<ellipse class="tower__hold" cx="${x.toFixed(1)}" cy="${(-y).toFixed(1)}" rx="${(r * 1.3).toFixed(1)}" ry="${r.toFixed(1)}" />`);
  });

  // The mast on the first rooftop's edge: a ball-topped pole, the arm the
  // rope hangs from with its pulley, and a strut back to the pole. The rope
  // sits in a group so it can swing about the arm.
  const { x: rx, top: rt } = TOWER.rope;
  path('tower__mast', [[828, P1], [828, 886]], [[736, 866], [828, 866]]);
  path('tower__strut', [[820, 772], [752, 862]]);
  block('tower__frame', 821, P1, 835, P1 + 14);
  out.push(`<circle class="tower__knob" cx="828" cy="${-890}" r="4.5" />`);
  out.push(`<circle class="tower__pulley" cx="${rx}" cy="${-(rt + 2)}" r="5.5" />`);
  const twist = [];
  for (let y = P1 + 16; y < rt - 8; y += 14) twist.push([[rx - 2.5, y], [rx + 2.5, y + 6]]);
  out.push('<g class="tower__rope-line">');
  path('tower__rope', [[rx, rt - 4], [rx, P1 + 10]]);
  path('tower__twist', ...twist);
  out.push(`<ellipse class="tower__knot" cx="${rx}" cy="${-(P1 + 12)}" rx="5" ry="4" />`);
  out.push('</g>');

  // The summit: a railing, the banner's poles with ball finials, and the
  // flag on the first.
  path('tower__rail', [[-70, P3 + 44], [30, P3 + 44]], ...[-45, -20, 5, 30].map((x) => [[x, P3], [x, P3 + 44]]));
  const [bannerLeft, bannerRight] = TOWER.banner;
  path('tower__pole', [[bannerLeft, P3], [bannerLeft, 1460]], [[bannerRight, P3], [bannerRight, 1446]]);
  out.push(`<circle class="tower__knob" cx="${bannerLeft}" cy="${-1463.5}" r="3.5" />`);
  out.push(`<circle class="tower__knob" cx="${bannerRight}" cy="${-1449.5}" r="3.5" />`);
  out.push(`<path class="tower__flag" d="M${pt([bannerLeft, 1460])}L${pt([bannerLeft + 54, 1444])}L${pt([bannerLeft, 1428])}Z" />`);

  // A sign for each level of his career, hung on chains so it can drop in
  // and swing when he gets there: on the mid block's face, from the
  // billboard frame, and the banner between the summit poles.
  const signs = [
    { x: 265, hang: P2 - 12, width: 214 },
    { x: 595, hang: 1035, width: 214 },
    { x: (bannerLeft + bannerRight) / 2, hang: 1420, width: bannerRight - bannerLeft - 6, banner: true },
  ];
  signs.forEach((sign, level) => {
    const job = CAREER[level];
    const top = sign.hang - (sign.banner ? 6 : 14);
    const height = 38 + 16 * job.title.length + 12;
    const x0 = sign.x - sign.width / 2;
    const x1 = sign.x + sign.width / 2;
    out.push(`<g class="tower__sign${sign.banner ? ' tower__sign--banner' : ''}" data-level="${level + 1}">`);
    path('tower__chain', [[x0 + 18, sign.hang], [x0 + 18, top]], [[x1 - 18, sign.hang], [x1 - 18, top]]);
    block('tower__board', x0, top - height, x1, top, 4);
    block('tower__board-edge', x0, top - 7, x1, top, 0);
    text('tower__sign-dates', x0 + 14, top - 21, job.dates.toUpperCase());
    job.title.forEach((line, i) => text('tower__sign-title', x0 + 14, top - 38 - i * 16, line));
    text('tower__sign-note', x0 + 14, top - height + 11, job.note);
    out.push('</g>');
  });

  svg.innerHTML = out.join('');
  towerRope = svg.querySelector('.tower__rope-line');
  towerSigns = [...svg.querySelectorAll('.tower__sign')];
}
if (TOWER_MODE) buildTower(document.querySelector('.experience-course-world'));

// Each level's sign is up once he has reached it, and all come down again
// when the routine starts over.
function updateSigns() {
  towerSigns.forEach((sign, i) => {
    const reached = state.courseTime >= COURSE.reveals[i] || (reducedMotion.matches && state.experienceActive);
    sign.classList.toggle('is-reached', reached);
  });
}

/* ---------------------------------------------------------- experience line
   The Experience stop is the start of a railway line, and his career runs
   along it. Each sleeper is a month, so the stations sit as far apart as
   the jobs lasted, and a departures board by the buffer stop lists every
   stop at a glance. He steps up onto the handcar waiting there and pumps
   it down the line, pulling up at each station as its sign drops in, until
   the rails run out at today and are only pencilled in beyond. The
   timetable opens there. Leaving, the car brakes and he hops off towards
   wherever he is headed. Like the tower, it is laid out in figure units
   from the Experience mark, and the car is drawn from the numbers he pumps
   by, so his hands stay on the handle and his feet on the deck. */

const RAIL = 8; // the rails' top above the floor
const CAR = {
  home: 142, // its middle, waiting at the start of the line
  half: 128, // half the deck's length
  deck: 46, // the deck's top above the floor
  axle: 80, // each axle from the middle
  wheel: 18, // wheel radius; the wheels run on the rails
  post: 28, // the pump's post from the middle
  pivot: 118, // the beam's pivot above the deck
  beam: 64, // pivot to each end of the beam
  grip: 14, // how far each handle stands off the beam's end
  swing: 17, // degrees the beam rocks either way
  stand: -96, // his hip from the middle, pumping the back handle
  stroke: 360, // units the car rolls for each stroke of the pump
};
const RIDE = {
  top: 700, // units a second
  accel: 1000, // units a second squared
  brake: 1400,
  board: 0.6, // seconds to step up onto the deck and take the handle
  dwell: 0.75, // seconds at each station
  letGo: 0.7, // seconds to let go and look down the line at the end
  alight: 0.5, // seconds to hop down off it
};
const SIGN_AHEAD = 165; // each station's sign hangs this far ahead of where he pulls up
const CANOPY = 400; // the station canopies' height, which hangs the signs clear of his head

// His career along the line: `at` turns a month into how far down the line
// he stands on it, a sleeper a month. The stops are where he pulls up, at
// each job's first month and then today. The months shrink as the years
// pass, so the line never runs on into Skills.
const monthOf = ([year, month]) => year * 12 + month - 1;
const LINE = (() => {
  const today = new Date();
  const now = today.getFullYear() * 12 + today.getMonth();
  const start = monthOf(CAREER[0].from);
  const first = 320; // where he stands at the first stop
  const month = Math.min(28, 1400 / Math.max(1, now - start));
  const at = (m) => first + (m - start) * month;
  const stops = [...CAREER.map((job) => at(monthOf(job.from))), at(now)];
  const railEnd = stops[stops.length - 1] - CAR.stand + CAR.half + 24; // just past the car's nose at today
  return { start, now, month, at, stops, buffer: -34, railEnd, end: railEnd + 230 };
})();

const handcar = {
  x: CAR.home, // its middle
  speed: 0, // units a second
  rolled: 0, // units its wheels have turned through, which also works the pump
  stage: 'off', // 'board', 'ride', 'dwell', 'done', 'brake' or 'alight'; 'off' when he is not on it
  t: 0, // seconds into the stage
  next: 0, // the stop he is heading for
  reached: 0, // how many stops he has reached, so how many signs are up
  from: null, // where he stood to board, or how he stood as he began to hop off
  dir: 1, // which way he hops off
  last: null, // where he was and how he stood last frame
  shift: 0, // how far the camera has slid to look down the line, px
  lift: 0, // how far it has lifted the scene clear of a narrow screen's timetable, px
};

// The beam's tilt in degrees, positive with the back handle up. The pump is
// geared to the wheels, so it goes as the car rolls.
const beamAngle = () => CAR.swing * Math.sin((2 * Math.PI * handcar.rolled) / CAR.stroke);

// The back handle, for the car's middle at `x` and the beam at `beta`: the
// beam's end, and then out square to the beam on its stem.
function carHandle(x, beta) {
  const a = beta * RAD;
  return [
    x + CAR.post - CAR.beam * Math.cos(a) + CAR.grip * Math.sin(a),
    CAR.deck + CAR.pivot + CAR.beam * Math.sin(a) + CAR.grip * Math.cos(a),
  ];
}

// Pumping: hands on the back handle and feet planted on the deck. He sinks
// and leans in as he drives the handle down, and straightens as it rises.
function pumpAt(base, x, beta, pant = 0) {
  const up = (beta / CAR.swing + 1) / 2; // 0 with the handle down, 1 up
  const hipX = x + CAR.stand;
  const hip = [hipX, CAR.deck + 98 - mix(12, 3, up) - pant];
  const hand = carHandle(x, beta);
  const limbs = {
    near: { hand: [hand[0] + 1, hand[1]], foot: [hipX + 10, CAR.deck] },
    far: { hand: [hand[0] - 1, hand[1]], foot: [hipX - 12, CAR.deck] },
  };
  return place(hip, gripPose(base, 1, hip, limbs, mix(26, 12, up)), 1, 'pump');
}

// Up onto the back of the deck: a foot up, the other after it, and his
// hands onto the handle.
function boardAt(base, k) {
  const beta = beamAngle();
  const end = pumpAt(base, handcar.x, beta);
  const from = handcar.from;
  const e = ease(k);
  const hip = [mix(from, end.x, e), mix(98, end.lift + 98, e) + 12 * Math.sin(Math.PI * k)];
  const stepTo = (a, b, start, to) => {
    const s = ease(clamp((k - a) / (b - a), 0, 1));
    return [mix(start[0], to[0], s), mix(start[1], to[1], s) + 20 * Math.sin(Math.PI * s)];
  };
  const hand = carHandle(handcar.x, beta);
  const limbs = {
    near: { hand, foot: stepTo(0.05, 0.5, [from + 8, 0], [end.x + 10, CAR.deck]) },
    far: { hand, foot: stepTo(0.45, 0.95, [from - 6, 0], [end.x - 12, CAR.deck]) },
  };
  const p = gripPose(base, 1, hip, limbs, mix(base.lean, end.pose.lean, e));
  const grab = ease(clamp((k - 0.3) / 0.6, 0, 1));
  for (const side of ['near', 'far']) {
    p[side].shoulder = mix(base[side].shoulder, p[side].shoulder, grab);
    p[side].elbow = mix(base[side].elbow, p[side].elbow, grab);
  }
  return place(hip, p, 1, 'board');
}

// At the end of the line he lets go, straightens up, and points on down the
// pencilled-in track.
function lookAt(base, k) {
  const held = pumpAt(base, handcar.x, beamAngle());
  const standing = clonePose(base);
  Object.assign(standing.near, reach(standing.bob, 80, 242), armReach(2, 152, 54)); // past his reach, so straight
  Object.assign(standing.far, reach(standing.bob, 58, 242));
  standing.lean = 2;
  const e = ease(k);
  return { x: held.x, lift: mix(held.lift, CAR.deck, e), flip: 1, mode: 'look', pose: mixPose(held.pose, standing, e) };
}

// Down off the deck towards wherever he is headed, turning in the air if
// that is back up the line, and landing on bent knees.
function alightAt(base, k) {
  const { from, dir } = handcar;
  const air = Math.min(k / 0.7, 1);
  const crouched = crouchPose(base, 22);
  const pose = k < 0.7
    ? mixPose(from.pose, crouched, ease(clamp(air / 0.5, 0, 1)))
    : crouchPose(base, 22 * (1 - ease((k - 0.7) / 0.3)));
  return {
    x: mix(from.x, from.x + dir * 70, ease(air)),
    lift: k < 0.7 ? mix(from.lift, 0, air * air) + 26 * Math.sin(Math.PI * air) : 0,
    flip: mix(from.flip, dir, ease(clamp(air / 0.6, 0, 1))),
    mode: 'alight',
    pose,
  };
}

// Where he is and how he stands on the line, from his resting pose.
function lineAt(base) {
  const h = handcar;
  const here = h.stage === 'board' ? boardAt(base, clamp(h.t / RIDE.board, 0, 1))
    : h.stage === 'alight' ? alightAt(base, clamp(h.t / RIDE.alight, 0, 1))
    : h.stage === 'done' ? lookAt(base, clamp(h.t / RIDE.letGo, 0, 1))
    : pumpAt(base, h.x, beamAngle(), h.stage === 'dwell' ? 1.5 * Math.sin(h.t * 9) : 0);
  h.last = here;
  return here;
}

// Rolls the car on, and clacks each axle over the rail joint at every new
// year.
function rollCar(step) {
  const year = 12 * LINE.month;
  const joint = LINE.at(monthOf([Math.floor(LINE.start / 12) + 1, 1]));
  const crossed = (x) => Math.floor((x - joint) / year);
  const before = [crossed(handcar.x - CAR.axle), crossed(handcar.x + CAR.axle)];
  handcar.x += step;
  handcar.rolled += step;
  if (crossed(handcar.x - CAR.axle) !== before[0] || crossed(handcar.x + CAR.axle) !== before[1]) sfx.clack();
}

// Pumps the car towards `goal`, easing down into it; true once there.
function rollTo(goal, dt) {
  const away = goal - handcar.x;
  const wanted = Math.min(RIDE.top, Math.sqrt(2 * RIDE.brake * Math.max(0, away)));
  const rate = wanted > handcar.speed ? RIDE.accel : RIDE.brake;
  handcar.speed = Math.max(0, handcar.speed + clamp(wanted - handcar.speed, -rate * dt, rate * dt));
  const step = Math.min(handcar.speed * dt, Math.max(0, away));
  rollCar(step);
  return away - step <= 0.01;
}

// Where to send him for Experience: on the car he stays put; otherwise to
// the back of the car, wherever it stands.
function lineBoarding(unit) {
  if (handcar.stage !== 'off') return state.x;
  return experienceX + (handcar.x - CAR.home) * unit;
}

function hopOff() {
  handcar.from = handcar.last;
  handcar.dir = Math.sign(state.target - state.x) || -1;
  handcar.stage = 'alight';
  handcar.t = 0;
  handcar.speed = 0;
  sfx.jump();
}

// Runs the ride while he is at Experience, and his hop off when he leaves.
function updateLine(dt, unit) {
  if (TOWER_MODE) return;
  const h = handcar;
  const last = LINE.stops.length - 1;
  const carAt = (i) => LINE.stops[i] - CAR.stand;
  const staying = state.destinationId === experienceScene;

  // Sent elsewhere: the car brakes and he hops off. Stepping up is finished
  // first; with reduced motion he is simply off.
  if (!staying && ['ride', 'dwell', 'done', 'brake'].includes(h.stage)) {
    if (reducedMotion.matches) h.stage = 'off';
    else if (h.stage === 'ride') h.stage = 'brake';
    else if (h.stage !== 'brake') hopOff();
  }

  if (h.stage === 'off') {
    // The car goes back to the start of the line once it is out of sight.
    if (h.x !== CAR.home) {
      const fromMiddle = Math.abs(experienceX + h.x * unit - state.x);
      if (fromMiddle > sceneWidth / 2 + (CAR.half + 80) * unit) {
        Object.assign(h, { x: CAR.home, speed: 0, rolled: 0, next: 0, reached: 0 });
      }
    }
    const ready = staying && state.experienceActive && state.speed === 0 && state.turning === 0 &&
      state.facing === 1 && Math.abs(state.target - state.x) <= ARRIVED;
    if (!ready) return;
    if (h.x === CAR.home) {
      h.next = 0;
      h.reached = 0;
    }
    if (reducedMotion.matches) {
      Object.assign(h, { x: carAt(last), next: last, reached: LINE.stops.length, stage: 'done', t: RIDE.letGo });
      return;
    }
    h.from = (state.x - experienceX) / unit;
    h.stage = 'board';
    h.t = 0;
    sfx.step(false);
    return;
  }

  h.t += dt;
  if (h.stage === 'board' && h.t >= RIDE.board) {
    h.stage = 'ride';
    h.t = 0;
  } else if (h.stage === 'ride' && rollTo(carAt(h.next), dt)) {
    h.x = carAt(h.next);
    h.speed = 0;
    h.reached = Math.max(h.reached, h.next + 1);
    h.stage = h.next === last ? 'done' : 'dwell';
    sfx.bell();
    sfx.flaps(0.15);
    h.t = 0;
  } else if (h.stage === 'dwell' && h.t >= RIDE.dwell) {
    h.next += 1;
    h.stage = 'ride';
    h.t = 0;
  } else if (h.stage === 'done') {
    if (state.experienceActive && h.t >= RIDE.letGo && openPanelId !== experienceScene) openPanel(experienceScene);
  } else if (h.stage === 'brake') {
    if (staying) {
      h.stage = 'ride'; // sent back before the car stopped, so he pumps on
    } else {
      h.speed = Math.max(0, h.speed - RIDE.brake * dt);
      rollCar(Math.min(h.speed * dt, carAt(last) - h.x));
      if (h.speed === 0) hopOff();
    }
  } else if (h.stage === 'alight') {
    const k = h.t / RIDE.alight;
    if (k >= 0.7 && k - dt / RIDE.alight < 0.7) {
      const at = experienceX + (h.from.x + h.dir * 70) * unit;
      spawnDust(at, 1, unit, { count: 4, power: 0.8 });
      spawnDust(at, -1, unit, { count: 4, power: 0.8 });
      sfx.land();
    }
    if (k >= 1) {
      state.x = experienceX + (h.from.x + h.dir * 70) * unit;
      state.facing = state.flip = h.dir;
      h.stage = 'off';
      // Sent back to Experience as he hopped off, he walks back to the car.
      if (staying) {
        state.target = lineBoarding(unit);
        state.announced = false;
        scene.setAttribute('aria-busy', 'true');
      } else if (state.destinationId === null) {
        state.target = state.x;
      }
    }
  }
}

// How far to slide the camera for the line: ahead of him as he rides, so
// the stations come into view, and clear of the timetable once it is open.
// On a narrow screen the timetable takes the bottom of the screen instead,
// so the scene lifts above it.
function lineFraming(dt) {
  const h = handcar;
  const open = openPanelId === experienceScene;
  let shift = 0;
  let lift = 0;
  if (!TOWER_MODE && ['ride', 'dwell', 'brake', 'done'].includes(h.stage)) {
    shift = open && !narrowScreen.matches ? 0.3 * panelLeft() - sceneWidth / 2 : -0.18 * sceneWidth;
  }
  if (open && narrowScreen.matches) lift = Math.max(0, floorY - (SHEET_TOP * sceneHeight - 24));
  const k = reducedMotion.matches ? 1 : Math.min(1, dt * 2.4);
  h.shift += (shift - h.shift) * k;
  h.lift += (lift - h.lift) * k;
  return h.shift;
}

// Draws the line into the Experience SVG from the numbers above, and sets
// its box so one viewBox unit is one figure unit, as the tower does. Its
// bottom edge is the floor; the years are marked off below it. The signs
// and the departures board are cut to fit their words, so it waits for the
// typeface before it measures them.
let lineCar = null;
let lineSigns = [];
function buildLine(svg) {
  const [left, right, top] = [-620, LINE.end + 40, 480];
  svg.setAttribute('viewBox', `${left} ${-top} ${right - left} ${top}`);
  svg.style.left = `calc(var(--experience-x) + var(--fig-h) * ${(left / 242).toFixed(4)})`;
  svg.style.width = `calc(var(--fig-h) * ${((right - left) / 242).toFixed(4)})`;
  svg.style.height = `calc(var(--fig-h) * ${(top / 242).toFixed(4)})`;

  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  svg.append(probe);
  const measure = (cls, words) => {
    probe.setAttribute('class', cls);
    probe.textContent = words;
    return probe.getBBox().width;
  };

  const out = [];
  const n = (v) => Number(v.toFixed(1));
  const pt = ([x, y]) => `${n(x)} ${n(-y)}`;
  const path = (cls, ...lines) => out.push(`<path class="${cls}" d="${lines.map((line) => `M${line.map(pt).join('L')}`).join('')}" />`);
  const block = (cls, x0, y0, x1, y1, round = 0) => out.push(
    `<rect class="${cls}" x="${n(x0)}" y="${n(-y1)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}"${round ? ` rx="${round}"` : ''} />`,
  );
  const circle = (cls, x, y, r) => out.push(`<circle class="${cls}" cx="${n(x)}" cy="${n(-y)}" r="${r}" />`);
  const text = (cls, x, y, words, anchor) => out.push(
    `<text class="${cls}" x="${n(x)}" y="${n(-y)}"${anchor ? ` text-anchor="${anchor}"` : ''}>${words.replace(/&/g, '&amp;')}</text>`,
  );
  const { at, stops, month, railEnd } = LINE;

  // A sign for each job, hung from its station's canopy on chains so it can
  // drop in, and as wide as its words need.
  const signs = CAREER.map((job, i) => {
    const width = 30 + Math.max(
      measure('line__sign-dates', job.dates.toUpperCase()),
      ...job.title.map((line) => measure('line__sign-title', line)),
      measure('line__sign-note', job.note),
    );
    const mid = stops[i] + SIGN_AHEAD;
    return { job, x0: mid - width / 2, x1: mid + width / 2 };
  });

  // The stations, on the far side of the track: a platform, and a canopy on
  // two posts with the station's name on its roof. Jobs at the same place
  // share a station, as both Pet Plus ones do.
  const stations = [];
  signs.forEach((sign) => {
    const prev = stations[stations.length - 1];
    if (prev && prev.name === sign.job.note) prev.x1 = sign.x1 + 34;
    else stations.push({ name: sign.job.note, x0: sign.x0 - 34, x1: sign.x1 + 34 });
  });
  for (const { name, x0, x1 } of stations) {
    block('line__platform', x0 - 30, 0, x1 + 30, 26);
    path('line__post', [[x0 + 10, 26], [x0 + 10, CANOPY]], [[x1 - 10, 26], [x1 - 10, CANOPY]]);
    block('line__canopy', x0 - 10, CANOPY, x1 + 10, CANOPY + 12);
    const mid = (x0 + x1) / 2;
    const half = measure('line__station-name', name.toUpperCase()) / 2 + 13;
    block('line__nameboard', mid - half, CANOPY + 16, mid + half, CANOPY + 38, 2);
    path('line__post', [[mid - half + 12, CANOPY + 12], [mid - half + 12, CANOPY + 16]],
      [[mid + half - 12, CANOPY + 12], [mid + half - 12, CANOPY + 16]]);
    text('line__station-name', mid, CANOPY + 22, name.toUpperCase(), 'middle');
  }
  signs.forEach(({ job, x0, x1 }, i) => {
    const hang = CANOPY - 18;
    const height = 38 + 16 * job.title.length + 12;
    out.push(`<g class="line__sign" data-stop="${i}">`);
    path('line__chain', [[x0 + 18, CANOPY], [x0 + 18, hang]], [[x1 - 18, CANOPY], [x1 - 18, hang]]);
    block('line__board', x0, hang - height, x1, hang, 4);
    block('line__board-edge', x0, hang - 7, x1, hang);
    text('line__sign-dates', x0 + 15, hang - 21, job.dates.toUpperCase());
    job.title.forEach((line, j) => text('line__sign-title', x0 + 15, hang - 38 - j * 16, line));
    text('line__sign-note', x0 + 15, hang - height + 11, job.note);
    out.push('</g>');
  });

  // The departures board by the buffer stop: every job at a glance, the
  // latest first, on a gantry, with its right edge just short of the mark.
  {
    const rows = [...CAREER].reverse();
    const dates = Math.max(...rows.map((job) => measure('line__dep-date', job.dates.toUpperCase())));
    const titles = Math.max(...rows.flatMap((job) => [
      measure('line__dep-title', job.title.join(' ')), measure('line__dep-note', job.note),
    ]));
    const x1 = -60;
    const x0 = x1 - (16 + dates + 22 + titles + 16);
    const column = x0 + 16 + dates + 22;
    const topY = 452;
    const height = 48 + rows.length * 44;
    path('line__gantry', [[x0 + 24, 0], [x0 + 24, topY + 14]], [[x1 - 24, 0], [x1 - 24, topY + 14]],
      [[x0 + 10, topY + 14], [x1 - 10, topY + 14]]);
    block('line__board', x0, topY - height, x1, topY, 4);
    block('line__board-head', x0, topY - 30, x1, topY, 4);
    text('line__dep-head', x0 + 16, topY - 20, 'DEPARTURES');
    text('line__dep-head line__dep-head--right', x1 - 16, topY - 20, 'ALL STOPS', 'end');
    rows.forEach((job, i) => {
      const y = topY - 52 - i * 44;
      if (i > 0) path('line__dep-rule', [[x0 + 12, y + 20], [x1 - 12, y + 20]]);
      text(`line__dep-date${i === 0 ? ' line__dep-date--now' : ''}`, x0 + 16, y, job.dates.toUpperCase());
      text('line__dep-title', column, y, job.title.join(' '));
      text('line__dep-note', column, y - 15, job.note);
    });
  }

  // The track: a sleeper a month and a rail joint at every new year, laid
  // as far as today and pencilled in beyond it, with survey stakes.
  const first = at(LINE.start);
  const sleepers = [];
  const sketched = [];
  for (let x = first - Math.floor((first - LINE.buffer) / month) * month; x <= LINE.end; x += month) {
    (x < railEnd ? sleepers : sketched).push(x);
  }
  for (const x of sleepers) block('line__sleeper', x - 6, 0, x + 6, 5);
  for (const x of sketched) block('line__sleeper line__sleeper--sketch', x - 6, 0, x + 6, 5);
  path('line__rail', [[LINE.buffer, RAIL - 1.5], [railEnd, RAIL - 1.5]]);
  path('line__rail line__rail--sketch', [[railEnd + 4, RAIL - 1.5], [LINE.end, RAIL - 1.5]]);
  const years = [];
  for (let year = Math.floor(LINE.start / 12) + 1; year * 12 <= LINE.now; year += 1) years.push(year);
  for (const year of years) block('line__joint', at(year * 12) - 5, RAIL - 4, at(year * 12) + 5, RAIL + 1);
  for (const x of [railEnd + 80, railEnd + 180]) {
    path('line__stake', [[x, 0], [x, 38]]);
    out.push(`<path class="line__flag" d="M${pt([x, 38])}L${pt([x + 16, 33])}L${pt([x, 28])}Z" />`);
  }

  // A semaphore signal past the car, its arm at danger until he sets off.
  {
    const x = 300;
    path('line__signal-post', [[x, 0], [x, 292]], [[x - 12, 0], [x + 12, 0]], [[x, 250], [x + 22, 250], [x + 22, 238]]);
    circle('line__signal-cap', x, 296, 4.5);
    out.push(`<g class="line__signal-arm" style="transform-origin: ${x}px ${-278}px">`);
    block('line__arm', x - 70, 272, x + 4, 284, 1);
    block('line__arm-stripe', x - 56, 272, x - 47, 284);
    circle('line__signal-lens', x + 10, 278, 5.5);
    out.push('</g>');
  }

  // The buffer stop at the start of the line.
  {
    const b = LINE.buffer;
    path('line__buffer-brace', [[b - 6, 40], [b - 44, 0]], [[b - 6, 22], [b - 26, 0]]);
    block('line__buffer', b - 10, 0, b, 46);
    block('line__buffer', b, 26, b + 8, 42);
    circle('line__buffer-lamp', b - 5, 54, 4);
  }

  // The years, marked off under the floor from the first job to today.
  path('line__axis', [[first, -6], [at(LINE.now), -6]],
    ...years.map((year) => [[at(year * 12), -2], [at(year * 12), -14]]),
    [[first, -2], [first, -12]]);
  text('line__year', first, -30, CAREER[0].dates.split(' – ')[0].toUpperCase(), 'middle');
  for (const year of years) text('line__year', at(year * 12), -30, String(year), 'middle');
  path('line__axis line__axis--now', [[at(LINE.now), 0], [at(LINE.now), -16]]);
  text('line__year line__year--now', at(LINE.now), -30, 'NOW', 'middle');

  // The handcar, drawn about its middle so it can roll: the deck on its
  // frame, the wheels on the rails, the pump's post, and the beam that rocks
  // on it, with a lamp and a drum of cable up front.
  {
    const { half, deck, axle, wheel, post, pivot, beam } = CAR;
    const wy = RAIL + wheel;
    out.push(`<g class="line__car" transform="translate(${CAR.home} 0)">`);
    block('line__lamp', half - 16, deck, half - 2, deck + 18, 2);
    block('line__lamp-glass', half - 4, deck + 5, half - 1, deck + 13);
    circle('line__drum', 62, deck + 17, 16);
    circle('line__drum-core', 62, deck + 17, 5.5);
    path('line__post-leg', [[post - 22, deck], [post - 3, deck + pivot]], [[post + 22, deck], [post + 3, deck + pivot]],
      [[post - 15, deck + 36], [post + 15, deck + 36]]);
    block('line__frame', -half, deck - 12, half, deck);
    path('line__frame-line', [[-half + 6, deck - 6], [half - 6, deck - 6]]);
    for (const x of [-axle, axle]) {
      block('line__axlebox', x - 8, wy - 2, x + 8, deck - 12);
      circle('line__wheel', x, wy, wheel);
      circle('line__rim', x, wy, wheel - 5);
      out.push(`<g class="line__spokes" data-x="${x}">`);
      path('line__spoke', ...[0, 60, 120].map((a) => {
        const [c, s] = [Math.cos(a * RAD) * (wheel - 5), Math.sin(a * RAD) * (wheel - 5)];
        return [[x - c, wy - s], [x + c, wy + s]];
      }));
      out.push('</g>');
      circle('line__hub', x, wy, 3.5);
    }
    out.push('<g class="line__beam">');
    path('line__beam-bar', [[post - beam, deck + pivot], [post + beam, deck + pivot]]);
    path('line__grip-stem', [[post - beam, deck + pivot], [post - beam, deck + pivot + CAR.grip]],
      [[post + beam, deck + pivot], [post + beam, deck + pivot + CAR.grip]]);
    circle('line__handle', post - beam, deck + pivot + CAR.grip, 4.5);
    circle('line__handle', post + beam, deck + pivot + CAR.grip, 4.5);
    out.push('</g>');
    circle('line__pivot', post, deck + pivot, 5);
    out.push('</g>');
  }

  svg.innerHTML = out.join('');
  svg.classList.add('is-line');
  const car = svg.querySelector('.line__car');
  lineCar = {
    root: car,
    beam: car.querySelector('.line__beam'),
    spokes: [...car.querySelectorAll('.line__spokes')],
    signal: svg.querySelector('.line__signal-arm'),
  };
  lineSigns = [...svg.querySelectorAll('.line__sign')];
}
if (!TOWER_MODE) document.fonts.ready.then(() => buildLine(document.querySelector('.experience-course-world')));

// Moves the car and its moving parts, and drops each station's sign once he
// has reached it.
let lineDrawn = '';
function drawLine() {
  if (!lineCar) return;
  const beta = beamAngle();
  const turn = deg(handcar.rolled / CAR.wheel);
  const key = `${handcar.x.toFixed(2)} ${beta.toFixed(2)} ${turn.toFixed(1)}`;
  if (key !== lineDrawn) {
    lineDrawn = key;
    lineCar.root.setAttribute('transform', `translate(${handcar.x.toFixed(2)} 0)`);
    lineCar.beam.setAttribute('transform', `rotate(${beta.toFixed(2)} ${CAR.post} ${-(CAR.deck + CAR.pivot)})`);
    for (const spokes of lineCar.spokes) {
      spokes.setAttribute('transform', `rotate(${turn.toFixed(1)} ${spokes.dataset.x} ${-(RAIL + CAR.wheel)})`);
    }
  }
  lineSigns.forEach((sign, i) => sign.classList.toggle('is-reached', i < handcar.reached));
  lineCar.signal.classList.toggle('is-clear', !['off', 'board', 'alight'].includes(handcar.stage));
}

// The timetable's stops, the latest first, filled from CAREER.
{
  const list = document.querySelector('.line-stops');
  [...CAREER].reverse().forEach((job, i) => {
    const item = document.createElement('li');
    item.className = `line-stop${i === 0 ? ' is-current' : ''}`;
    item.style.setProperty('--row', i);
    const dates = document.createElement('p');
    dates.className = 'line-stop__dates';
    dates.textContent = job.dates;
    const title = document.createElement('h2');
    title.textContent = job.title.join(' ');
    const where = document.createElement('p');
    where.className = 'line-stop__where';
    where.textContent = job.note;
    const summary = document.createElement('p');
    summary.className = 'line-stop__summary';
    summary.textContent = job.summary;
    item.append(dates, title, where, summary);
    list?.append(item);
  });
}

/* ---------------------------------------------------------- the surroundings
   The stops stand somewhere rather than on a bare line: round each is a set
   of its own - woods and a tent at the campfire, a shed round the bench, a
   control room round the console, street lamps at his name - and
   signposts point the way between them. It is all drawn in figure units,
   so it scales with him. */

const SVG_NS = 'http://www.w3.org/2000/svg';

// A pen for scenery: SVG markup from points in figure units, y up from the
// floor.
function scenePen() {
  const out = [];
  const n = (v) => +v.toFixed(1);
  const pt = ([x, y]) => `${n(x)} ${n(-y)}`;
  return {
    line(cls, ...lines) {
      out.push(`<path class="${cls}" d="${lines.map((l) => `M${l.map(pt).join('L')}`).join('')}" />`);
    },
    poly(cls, points) {
      out.push(`<path class="${cls}" d="M${points.map(pt).join('L')}Z" />`);
    },
    // Scalloped, like a cloud or a tree's crown: an outward arc between
    // each pair of points, which run clockwise on screen.
    bumps(cls, points) {
      let d = `M${pt(points[0])}`;
      for (let i = 1; i < points.length; i += 1) {
        const r = n(0.62 * Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
        d += `A${r} ${r} 0 0 1 ${pt(points[i])}`;
      }
      out.push(`<path class="${cls}" d="${d}Z" />`);
    },
    rect(cls, x0, y0, x1, y1, r = 0) {
      out.push(`<rect class="${cls}" x="${n(x0)}" y="${n(-y1)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}"${r ? ` rx="${r}"` : ''} />`);
    },
    circle(cls, x, y, r, style = '') {
      out.push(`<circle class="${cls}" cx="${n(x)}" cy="${n(-y)}" r="${n(r)}"${style ? ` style="${style}"` : ''} />`);
    },
    text(cls, x, y, words, anchor = 'middle') {
      out.push(`<text class="${cls}" x="${n(x)}" y="${n(-y)}" text-anchor="${anchor}">${words.replace(/&/g, '&amp;')}</text>`);
    },
    open(attrs) { out.push(`<g ${attrs}>`); },
    close() { out.push('</g>'); },
    markup: () => out.join(''),
  };
}

// Points round an ellipse for `bumps`, clockwise on screen from angle
// `from` to `to` (radians, anticlockwise from the right), a little uneven.
function scallopPoints(cx, cy, rx, ry, count, seed, from = 2 * Math.PI, to = 0) {
  const points = [];
  for (let i = 0; i <= count; i += 1) {
    const a = mix(from, to, i / count);
    const k = 1 + 0.16 * wobble(seed + i * 5.7);
    points.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return points;
}

// A pine: three tiers of boughs, the lowest sweeping up to a stub of trunk.
function pine(p, cls, x, h) {
  const w = h * 0.2;
  const side = [[0.46, 0.66], [0.24, 0.67], [0.74, 0.38], [0.42, 0.4], [1, 0.06], [0.24, 0.1]];
  const t = Math.max(2.5, w * 0.09);
  p.poly(cls, [
    [x, h],
    ...side.map(([k, f]) => [x + w * k, h * f]),
    [x + t, h * 0.1], [x + t, 0], [x - t, 0], [x - t, h * 0.1],
    ...side.map(([k, f]) => [x - w * k, h * f]).reverse(),
  ]);
}

// A low bush sitting on the floor.
function bush(p, cls, x, w, h, seed) {
  p.bumps(cls, scallopPoints(x, 0, w / 2, h, 5, seed, Math.PI, 0));
}

// A wire slung between two points.
function wire(p, cls, a, b, sag) {
  const points = [];
  for (let i = 0; i <= 16; i += 1) {
    const s = i / 16;
    points.push([mix(a[0], b[0], s), mix(a[1], b[1], s) - 4 * sag * s * (1 - s)]);
  }
  p.line(cls, points);
}

// A set round a stop: an SVG in the world, behind everything there, with
// its origin at `anchor` px along the floor and drawn in figure units.
function worldSet(cls, anchor, left, right, top, draw) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `set ${cls}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', `${left} ${-top} ${right - left} ${top}`);
  svg.style.left = `calc(${anchor}px + var(--fig-h) * ${(left / 242).toFixed(4)})`;
  svg.style.width = `calc(var(--fig-h) * ${((right - left) / 242).toFixed(4)})`;
  svg.style.height = `calc(var(--fig-h) * ${(top / 242).toFixed(4)})`;
  const p = scenePen();
  draw(p);
  svg.innerHTML = p.markup();
  world.prepend(svg);
  return svg;
}

// Grass and pebbles along the floor between x0 and x1.
function tufts(p, x0, x1, seed, every = 70) {
  const blades = [];
  for (let x = x0, i = 0; x < x1; x += every * (0.6 + wobble(seed + i) + 0.5), i += 1) {
    if (wobble(seed + i * 3.3) > 0.2) {
      p.circle('s-pebble', x + 20, 2.5, 2.5 + 2 * (wobble(seed + i * 1.9) + 0.5));
      continue;
    }
    const h = 10 + 8 * (wobble(seed + i * 2.7) + 0.5);
    blades.push([[x - 6, h * 0.7], [x - 2, 0], [x + 1, h], [x + 3, 0], [x + 8, h * 0.8]]);
  }
  p.line('s-grass', ...blades);
}

// The woods and a tent round the campfire. The log is at -91..11 and the
// fire at 99..249.
function buildCamp() {
  worldSet('set--camp', campX, -660, 660, 500, (p) => {
    pine(p, 's-tree', -575, 470);
    pine(p, 's-tree', 450, 420);
    // A ridge tent, its door open towards the fire, and its guy lines.
    const t = -300;
    p.line('s-thin', [[t, 150], [t - 150, 0]], [[t, 150], [t + 140, 0]]);
    p.poly('s-paper', [[t - 96, 0], [t, 150], [t + 92, 0]]);
    p.poly('s-dark', [[t + 6, 0], [t + 24, 96], [t + 56, 0]]);
    p.line('s-edge', [[t + 24, 96], [t + 66, 0]], [[t, 150], [t, 164]]);
    // A lantern on a hooked pole by the tent. living: a fixture, which can
    // go out and be tapped back on (living.js, the incidents).
    const l = -170;
    p.line('s-edge', [[l, 0], [l, 200]], [[l, 200], [l + 30, 200], [l + 30, 190]]);
    p.open('class="s-fixture" data-fixture="lantern"');
    p.circle('s-glow', l + 30, 170, 26);
    p.rect('s-paper', l + 22, 160, l + 38, 184, 2);
    p.rect('s-amber', l + 26, 164, l + 34, 178, 1);
    p.line('s-sparks', [[l + 16, 186], [l + 10, 192]], [[l + 44, 186], [l + 50, 192]], [[l + 30, 190], [l + 30, 196]]);
    p.close();
    // Firewood stacked beyond the fire, and a stump with an axe in it.
    for (const [x, y] of [[300, 11], [322, 11], [344, 11], [311, 31], [333, 31], [322, 51]]) {
      p.circle('s-paper', x, y, 11);
      p.circle('s-thin', x, y, 4);
    }
    p.rect('s-paper', 382, 0, 418, 34);
    p.line('s-thin', [[388, 34], [412, 34]]);
    p.line('s-edge', [[400, 34], [428, 84]]);
    p.poly('s-dark', [[392, 30], [404, 44], [414, 36], [406, 26]]);
    tufts(p, -640, 640, 3);
  });
}

// A lean-to workshop round the bench, which stands at 30..226 with its top
// at 102: a plank wall, a pegboard of tools, shelves, and timber outside.
function buildShop() {
  worldSet('set--shop', benchX, -370, 470, 400, (p) => {
    p.rect('s-wall', -150, 0, 392, 292);
    const planks = [];
    for (let y = 36; y < 292; y += 36) planks.push([[-150, y], [392, y]]);
    p.line('s-seam', ...planks);
    p.rect('s-paper', -162, 0, -146, 306);
    p.rect('s-paper', 382, 0, 398, 284);
    p.poly('s-roof', [[-196, 322], [436, 296], [436, 282], [-196, 308]]);
    p.rect('s-paper', 50, 318, 200, 344, 3);
    p.text('s-label', 125, 326, 'WORKSHOP');
    // The pegboard, and his tools on it.
    p.rect('s-board', -6, 130, 252, 278, 3);
    const holes = [];
    for (let y = 142; y < 272; y += 16) for (let x = 6; x < 248; x += 16) holes.push([[x, y], [x, y + 0.1]]);
    p.line('s-holes', ...holes);
    p.rect('s-paper', 8, 234, 32, 262, 5); // the saw
    p.poly('s-paper', [[32, 258], [98, 252], [98, 244], [32, 236]]);
    p.line('s-thin', [[40, 237], [96, 244]]);
    p.line('s-edge', [[124, 150], [124, 232]]); // the hammer
    p.poly('s-paper', [[106, 232], [140, 232], [146, 240], [140, 246], [106, 246]]);
    p.line('s-edge', [[160, 162], [178, 236]]); // the spanner
    p.circle('s-paper', 180, 244, 9);
    p.rect('s-dark', 196, 212, 206, 240, 2); // screwdrivers
    p.line('s-edge', [[201, 212], [201, 184]]);
    p.rect('s-amber', 214, 218, 224, 244, 2);
    p.line('s-edge', [[219, 218], [219, 192]]);
    p.circle('s-edge', 226, 160, 15); // a coil of network cable
    p.circle('s-edge', 226, 160, 10);
    p.line('s-edge', [[238, 150], [246, 138]]);
    p.rect('s-paper', 243, 128, 251, 138, 1);
    p.rect('s-paper', 14, 140, 100, 152, 2); // a spirit level
    p.rect('s-amber', 52, 143, 62, 149, 2);
    // Shelves with jars and tins.
    p.line('s-edge', [[266, 196], [376, 196]], [[266, 252], [376, 252]], [[272, 196], [284, 184]], [[370, 196], [358, 184]]);
    for (const [x, w, h] of [[276, 18, 26], [300, 22, 34], [328, 16, 20], [350, 20, 28]]) {
      p.rect('s-paper', x, 196, x + w, 196 + h, 2);
      p.line('s-thin', [[x, 196 + h - 5], [x + w, 196 + h - 5]]);
    }
    for (const [x, w, h] of [[274, 40, 22], [322, 28, 30], [356, 16, 16]]) p.rect('s-paper', x, 252, x + w, 252 + h, 2);
    // Timber leaning outside, and a sawhorse.
    p.poly('s-paper', [[-210, 0], [-198, 0], [-172, 250], [-184, 250]]);
    p.poly('s-paper', [[-236, 0], [-224, 0], [-190, 226], [-202, 226]]);
    p.line('s-edge', [[-338, 0], [-322, 76]], [[-306, 0], [-322, 76]], [[-262, 0], [-246, 76]], [[-230, 0], [-246, 76]]);
    p.rect('s-paper', -346, 76, -222, 88, 2);
    tufts(p, -450, -150, 17, 90);
    tufts(p, 400, 470, 19, 90);
  });
}

// A control room round the console (its desk at 29..202, its monitor up
// to 318, the tower at 214..268): a wall with a door, a status board and a
// clock, racks of servers, and a cable tray feeding it all. The blinking
// lights go on a small layer of their own over it, so they repaint only
// themselves.
function buildOps() {
  const lights = [];
  const light = (x, y, r, style, cls = 's-led') => lights.push([x, y, r, style, cls]);
  worldSet('set--ops', skillsX, -270, 620, 500, (p) => {
    p.rect('s-wall', -250, 0, 600, 470);
    p.line('s-seam', [[-250, 16], [600, 16]], [[-250, 458], [600, 458]]);
    p.rect('s-paper', -230, 0, -148, 206, 2);
    p.rect('s-thin', -214, 128, -164, 188, 2);
    p.circle('s-ink', -160, 100, 3);
    p.rect('s-dark', -224, 222, -154, 246, 3);
    p.text('s-label s-label--light', -189, 229, 'OPS');
    // The status board: a graph of the week's uptime.
    p.rect('s-dark', -110, 236, 16, 336, 4);
    const graph = [];
    for (let i = 0; i <= 12; i += 1) graph.push([-98 + i * 8.5, 262 + 20 * (0.5 + 0.5 * Math.sin(i * 1.3)) + 8 * wobble(i)]);
    p.line('s-graph', graph);
    // living: the readout says DEGRADED while a rack is failing, and counts
    // what he has fixed (living.js, the incidents).
    p.open('data-fixture="readout"');
    p.text('s-readout', -98, 312, 'UPTIME 99.98%', 'start');
    p.close();
    p.open('data-fixture="fixed-count"');
    p.text('s-readout s-readout--fixed', -98, 244, ' ', 'start');
    p.close();
    light(4, 318, 3, '--led: #7fd08f; --d: 2.4s; --delay: -0.4s');
    // A clock over the monitor.
    p.circle('s-paper', 120, 404, 20);
    p.line('s-edge', [[120, 404], [120, 418]], [[120, 404], [130, 398]]);
    // The cable tray, and cables dropping to the racks and the console.
    const rungs = [];
    for (let x = -40; x <= 590; x += 22) rungs.push([[x, 426], [x, 440]]);
    p.line('s-thin', ...rungs);
    p.line('s-edge', [[-44, 426], [594, 426]], [[-44, 440], [594, 440]]);
    wire(p, 's-cable', [240, 426], [252, 236], -30);
    wire(p, 's-cable', [330, 426], [340, 322], -12);
    wire(p, 's-cable', [424, 426], [432, 322], -12);
    wire(p, 's-cable', [516, 426], [524, 322], -12);
    // Three racks of servers, lights blinking.
    [300, 392, 484].forEach((x0, r) => {
      p.rect('s-rack', x0, 0, x0 + 84, 322, 3);
      const units = [];
      for (let y = 30, u = 0; y < 300; y += 26, u += 1) {
        units.push([[x0 + 8, y], [x0 + 76, y]]);
        // A few lights blink, the rest stay lit; with no --d a light is steady.
        const led = ['#7fd08f', '#7fd08f', '#f0b64a'][(u + r) % 3];
        const blink = (u * 5 + r * 3) % 4 === 0 ? `; --d: ${(1.2 + ((u * 7 + r * 3) % 9) * 0.35).toFixed(2)}s; --delay: -${((u * 5 + r * 11) % 7) * 0.3}s` : '';
        // living: one light, on the middle rack at hand height, is the one
        // that fails (living.js, the incidents).
        light(x0 + 16, y + 13, 2.6, `--led: ${led}${blink}`, r === 1 && u === 5 ? 's-led s-led--watch' : 's-led');
        light(x0 + 26, y + 13, 2.6, '--led: #7fd08f');
        p.line('s-vent', [[x0 + 40, y + 9], [x0 + 70, y + 9]], [[x0 + 40, y + 17], [x0 + 70, y + 17]]);
      }
      p.line('s-rack-seam', ...units);
    });
  });
  worldSet('set--lights', skillsX, -10, 570, 330, (p) => {
    for (const [x, y, r, style, cls] of lights) p.circle(cls, x, y, r, style);
  });
}

// Street lamps at either end of his name, which runs `STATUE.width` units
// back from `nameEnd`, and a few bushes. The left lamp stands well behind
// where he sits to code at the start (230 units short of the name), clear
// of the broken N and his speech bubble.
function buildStart() {
  const w = STATUE.width;
  worldSet('set--start', nameEnd, -w - 720, 260, 380, (p) => {
    for (const x of [-w - 580, 110]) {
      // living: each lamp is a fixture that can fail and be thumped back
      // on (living.js, the incidents); its sparks show only while it fails.
      p.open(`class="s-fixture" data-fixture="lamp-${x > 0 ? 'right' : 'left'}"`);
      p.rect('s-paper', x - 9, 0, x + 9, 16, 2);
      p.line('s-edge', [[x, 16], [x, 300]], [[x, 300], [x + 8, 314], [x + 30, 318]]);
      p.poly('s-paper s-shade', [[x + 18, 318], [x + 42, 318], [x + 36, 300], [x + 24, 300]]);
      p.circle('s-glow s-glow--soft', x + 30, 296, 22);
      p.line('s-sparks', [[x + 14, 300], [x + 6, 292]], [[x + 46, 300], [x + 54, 292]], [[x + 30, 290], [x + 30, 280]]);
      p.close();
    }
    bush(p, 's-tree', -w - 470, 110, 50, 5);
    bush(p, 's-tree', 190, 120, 56, 9);
    tufts(p, -w - 700, -w - 60, 29, 80);
    tufts(p, 60, 250, 31, 80);
  });
}

// A fingerpost at `anchor` px, an arm for each neighbouring stop. living:
// each arm is its own group, turning about the post, so one can work loose
// and be pushed back (living.js, the incidents); `name` finds the post.
const signText = document.createElement('canvas').getContext('2d');
function signpost(anchor, arms, name = '') {
  signText.font = '700 12px Stickline, Arial, sans-serif';
  const svg = worldSet('set--sign', anchor, -170, 170, 240, (p) => {
    p.rect('s-post', -5, 0, 5, 212, 1);
    p.poly('s-paper', [[-8, 212], [0, 222], [8, 212]]);
    arms.forEach(([label, dir], i) => {
      const y = 188 - i * 36;
      const w = signText.measureText(label.toUpperCase()).width + 0.12 * 12 * label.length + 30;
      const [root, tip] = [-dir * 10, dir * (w - 10)];
      p.open(`class="s-arm" data-arm="${i}" style="transform-origin: ${dir > 0 ? '0%' : '100%'} 50%"`);
      p.poly('s-sign', [[root, y - 12], [tip - dir * 12, y - 12], [tip, y], [tip - dir * 12, y + 12], [root, y + 12]]);
      p.text('s-sign-text', (root + tip - dir * 12) / 2, y - 4.5, label.toUpperCase());
      p.close();
    });
    tufts(p, -40, 40, anchor, 30);
  });
  if (name) svg.dataset.sign = name;
}

function buildSurroundings() {
  buildStart();
  buildCamp();
  buildShop();
  buildOps();
  signpost(nameEnd + 190, [['About Me', 1]], 'start');
  signpost((campX + benchX) / 2, [['Projects', 1], ['About Me', -1]], 'camp-bench');
  signpost((benchX + experienceX) / 2, [['Experience', 1], ['Projects', -1]], 'bench-line');
}
document.fonts.ready.then(buildSurroundings);
/* -------------------------------------------------------------- the start
   The site opens at a statue of his name, left of the campfire, with its N
   knocked out of shape. He walks on with his laptop bag, sits down short of
   the N and codes up the site's controls: he asks whether you would like
   sound and shoots the sound button up to the navbar, then drops the
   controls on the floor, flips them up into his hand with his foot and
   tosses them over his shoulder down to the bottom left. He walks
   over to the N, codes a fix, hits Enter, and the N snaps back together.
   Then he walks off past the rest of the name - too wide for the screen, so
   it comes into view as he goes - and on to the campfire. */

const NAME = 'NAEEM BROWN';
const NAME_ROLE = 'SYSTEMS & INFRASTRUCTURE ENGINEER'; // cut into the plinth
const LETTER_TALL = 280; // units; he is 242
const LETTER_GAP = 34;
const PLINTH = 40;
const NAME_TO_CAMP = 700; // px from the end of the name to the campfire
const STROLL = 2.6; // his pace past the name, in walking speeds

// Block capitals as stone pieces in units, y down from the top of the
// letter. The bowls of B, R and O are paths with a hole in them.
const quad = (...pts) => `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
const slab = (x0, y0, x1, y1) => quad([x0, y0], [x1, y0], [x1, y1], [x0, y1]);
const LETTERS = {
  N: [220, [slab(0, 0, 56, 280), quad([0, 0], [62, 0], [220, 280], [158, 280]), slab(164, 0, 220, 280)]],
  A: [240, [slab(56, 152, 184, 200), quad([0, 280], [58, 280], [135, 0], [77, 0]), quad([240, 280], [182, 280], [105, 0], [163, 0])]],
  E: [180, [slab(0, 0, 56, 280), slab(0, 0, 180, 56), slab(0, 112, 150, 168), slab(0, 224, 180, 280)]],
  M: [270, [slab(0, 0, 56, 280), slab(214, 0, 270, 280), quad([0, 0], [60, 0], [165, 220], [105, 220]), quad([270, 0], [210, 0], [105, 220], [165, 220])]],
  B: [210, [slab(0, 0, 56, 280), 'M20 0H130A64 64 0 0 1 130 128H20ZM56 44H126A20 20 0 0 1 126 84H56Z',
    'M20 128H140A70 76 0 0 1 140 280H20ZM56 172H136A24 32 0 0 1 136 236H56Z']],
  R: [214, [slab(0, 0, 56, 280), 'M20 0H132A68 72 0 0 1 132 144H20ZM56 44H128A24 28 0 0 1 128 100H56Z',
    quad([92, 144], [152, 144], [214, 280], [154, 280])]],
  O: [250, ['M0 140A125 140 0 1 1 250 140A125 140 0 1 1 0 140ZM56 140A69 84 0 1 0 194 140A69 84 0 1 0 56 140Z']],
  W: [320, [quad([0, 0], [58, 0], [108, 280], [50, 280]), quad([131, 70], [189, 70], [108, 280], [50, 280]),
    quad([131, 70], [189, 70], [270, 280], [212, 280]), quad([262, 0], [320, 0], [270, 280], [212, 280])]],
  ' ': [110, []],
};
// How the N's three pieces have slipped: degrees about a corner, then a
// nudge, in letter units.
const N_BROKEN = [
  { turn: -6, about: [56, 280], nudge: [0, 0] },
  { turn: -32, about: [220, 280], nudge: [-14, 18] },
  { turn: 13, about: [164, 280], nudge: [6, 0] },
];

const statueSvg = document.querySelector('.name-statue');
const STATUE = (() => {
  const letters = [];
  let x = 0;
  for (const ch of NAME) {
    const [width, pieces] = LETTERS[ch];
    letters.push({ ch, x, width, pieces });
    x += width + LETTER_GAP;
  }
  const width = x - LETTER_GAP;
  const top = PLINTH + LETTER_TALL + 40;
  statueSvg.setAttribute('viewBox', `-60 ${-top} ${width + 120} ${top + 6}`);
  statueSvg.style.left = `calc(var(--name-end) - var(--fig-h) * ${((width + 60) / 242).toFixed(4)})`;
  statueSvg.style.width = `calc(var(--fig-h) * ${((width + 120) / 242).toFixed(4)})`;
  statueSvg.style.height = `calc(var(--fig-h) * ${((top + 6) / 242).toFixed(4)})`;

  const out = [];
  out.push(`<rect class="statue__plinth" x="-40" y="${-PLINTH}" width="${width + 80}" height="${PLINTH}" />`);
  out.push(`<rect class="statue__ledge" x="-48" y="${-PLINTH - 8}" width="${width + 96}" height="10" />`);
  out.push(`<text class="statue__engraving" x="${width / 2}" y="-12" text-anchor="middle">${NAME_ROLE.replace(/&/g, '&amp;')}</text>`);
  letters.forEach((letter, i) => {
    const broken = letter.ch === 'N' && i === 0;
    out.push(`<g transform="translate(${letter.x} ${-PLINTH - 8 - LETTER_TALL})">`);
    out.push(`<g class="statue__letter${broken ? ' statue__glitch' : ''}" data-letter="${i}">`);
    if (broken) {
      // The N's pieces move on their own, so each keeps its own side.
      letter.pieces.forEach((d) => out.push(
        `<g class="statue__piece"><path class="statue__side" transform="translate(9 7)" d="${d}" /><path class="statue__front" d="${d}" /></g>`,
      ));
      out.push('<g class="statue__sparks">');
      for (let s = 0; s < 8; s += 1) {
        const a = (s / 8) * 2 * Math.PI;
        const [cx, cy] = [110 + 150 * Math.cos(a), 140 + 170 * Math.sin(a)];
        out.push(`<path d="M${cx.toFixed(0)} ${cy.toFixed(0)}L${(cx + 26 * Math.cos(a)).toFixed(0)} ${(cy + 26 * Math.sin(a)).toFixed(0)}" />`);
      }
      out.push('</g>');
    } else {
      letter.pieces.forEach((d) => out.push(`<path class="statue__side" transform="translate(9 7)" d="${d}" />`));
      letter.pieces.forEach((d) => out.push(`<path class="statue__front" d="${d}" />`));
      if (letter.pieces.length) {
        const w = letter.width;
        out.push(`<path class="statue__chisel" d="M${(w * 0.12).toFixed(0)} 30l14 -6M${(w * 0.18).toFixed(0)} 240l18 6" />`);
      }
    }
    out.push('</g></g>');
  });
  statueSvg.innerHTML = out.join('');
  const n = statueSvg.querySelector('[data-letter="0"]');
  return { width, letters, n, pieces: [...n.querySelectorAll('.statue__piece')] };
})();

// Where the name ends, the campfire being NAME_TO_CAMP further on.
world.style.setProperty('--name-end', `${campX - NAME_TO_CAMP}px`);
const nameEnd = campX - NAME_TO_CAMP;
const nameStart = (unit) => nameEnd - STATUE.width * unit;

// The N's pieces, `k` of the way from broken back to whole, with a little
// overshoot as they snap into place.
function setN(k) {
  const back = k >= 1 ? 1 : 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;
  STATUE.pieces.forEach((piece, i) => {
    const { turn, about, nudge } = N_BROKEN[i];
    const off = 1 - back;
    piece.setAttribute('transform',
      `translate(${(nudge[0] * off).toFixed(2)} ${(nudge[1] * off).toFixed(2)}) rotate(${(turn * off).toFixed(2)} ${about[0]} ${about[1]})`);
  });
}

// The code he writes in the opening, in highlighted pieces: comment,
// selector or name, keyword or property, value and punctuation. The editor
// types each file out as he types, and he sends each somewhere with Enter:
// the sound button up to the navbar, the controls down to the floor, and
// the fix into the N.
const FIX_CODE = [
  ['/* straighten the N */', 'c'], ['\n', ''],
  ['.statue .letter-n', 's'], [' {', 'p'], ['\n  ', ''],
  ['rotate', 'k'], [': ', 'p'], ['0deg', 'v'], [';', 'p'], ['\n  ', ''],
  ['translate', 'k'], [': ', 'p'], ['0 0', 'v'], [';', 'p'], ['\n  ', ''],
  ['animation', 'k'], [': ', 'p'], ['none', 'v'], [';', 'p'], ['\n', ''],
  ['}', 'p'],
];
// Its last two lines hold the visitor's answer, so are written once it is in.
const soundCode = (answer) => [
  ['// ask if they want sound', 'c'], ['\n', ''],
  ['const', 'k'], [' on = ', 'p'], ['await', 'k'], [' ask', 's'], ['();', 'p'], ['\n', ''],
  ['toggle', 's'], ['.set(', 'p'], ['on', 'v'], [');', 'p'], [` // ${answer}`, 'c'], ['\n', ''],
  ['nav', 's'], ['.dock(', 'p'], ['toggle', 'v'], [', ', 'p'], ["'right'", 'v'], [');', 'p'],
];
const CONTROLS_CODE = [
  ['/* how to get around */', 'c'], ['\n', ''],
  ['.controls', 's'], [' {', 'p'], ['\n  ', ''],
  ['keys', 'k'], [': ', 'p'], ['A D SPACE W', 'v'], [';', 'p'], ['\n  ', ''],
  ['dock', 'k'], [': ', 'p'], ['bottom left', 'v'], [';', 'p'], ['\n', ''],
  ['}', 'p'],
];
const codeLength = (code) => code.reduce((sum, [text]) => sum + text.length, 0);
const FIX_LENGTH = codeLength(FIX_CODE);
const CONTROLS_LENGTH = codeLength(CONTROLS_CODE);
const SOUND_ASKED = codeLength(soundCode('').slice(0, 8)); // up to where he stops to ask
const editor = document.querySelector('.intro-editor');
const editorCode = editor?.querySelector('code');
const editorTitle = editor?.querySelector('.intro-editor__bar span');
let editorFile = { name: 'name.css', code: FIX_CODE };
let editorShown = -1;

// Shows the first `count` characters of the open file, highlighted,
// numbered and with the caret after them.
function typeCode(count) {
  if (!editorCode || count === editorShown) return;
  editorShown = count;
  const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let left = count;
  let html = '';
  for (const [text, kind] of editorFile.code) {
    if (left <= 0) break;
    const shown = text.slice(0, left);
    left -= shown.length;
    html += kind ? `<span class="tk-${kind}">${escape(shown)}</span>` : shown;
  }
  const lines = `${html}<span class="intro-editor__caret"></span>`.split('\n');
  editorCode.innerHTML = lines
    .map((line, i) => `<span class="intro-editor__line"><span class="intro-editor__number">${i + 1}</span>${line}</span>`)
    .join('\n');
}

// Puts a file up in the editor; a new one pops up afresh.
function openFile(name, code) {
  if (!editor || (editorFile.name === name && editorFile.code === code)) return;
  const fresh = editorFile.name !== name;
  editorFile = { name, code };
  editorShown = -1;
  if (!fresh) return;
  editorTitle.textContent = name;
  intro.sent = false;
  editor.classList.remove('is-applied', 'is-sent');
  editor.style.animation = 'none';
  void editor.offsetWidth; // so the pop plays again
  editor.style.animation = '';
}

const laptop = document.querySelector('.laptop');
const laptopLid = laptop.querySelector('.laptop__lid');
const laptopFace = laptop.querySelector('.laptop__face');
const laptopHalo = laptop.querySelector('.laptop__halo');
const laptopLines = [...laptop.querySelectorAll('.laptop__code')];
const LID = { hinge: [22, 0], across: [18, -14], length: 34, open: 80 }; // in laptop units

// His laptop bag, in rig units, placed by the middle of its top. It hangs
// from his shoulder BAG.hang off it, by a strap from a ring at its front
// corner, BAG.ring from there, which runs up his back. Sitting, he sets it
// down behind him BAG.rest across and slips the strap off, so that it lies
// over the bag and down behind it (STRAP_DOWN, the rest of its curve from
// the ring); that is where he reaches into it for the laptop. He leaves it
// by his name at the end (.start-bag).
const bag = document.querySelector('.bag');
const bagStraps = [...bag.querySelectorAll('.bag__strap, .bag__strap-band')];
const bagBody = bag.querySelector('.bag__body');
const bagFlap = bag.querySelector('.bag__flap');
const BAG = { tall: 31, strap: 53, hang: [-30, 50], rest: 24, ring: [21, 1.5] };
const SIT_BOB = 90; // how far his hip drops to sit on the floor
const bagMouth = [BAG.rest, 242 - SIT_BOB - BAG.tall + 3]; // inside the bob, him sitting
const STRAP_DOWN = [[6, -16], [-40, -12], [-54, BAG.tall]];
const curve = (from, points) => `M${from.map((v) => v.toFixed(1)).join(' ')}C${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}`;

// Hangs the bag from his shoulder, or sets it down behind him `seat` of the
// way, swinging `swing` degrees, its flap `flap` of the way open and its
// strap `off` of the way slipped from his shoulder.
function placeBag(p, { seat, swing, flap, off }) {
  const shoulder = [70 + 70 * Math.sin(p.lean * RAD), 144 - 70 * Math.cos(p.lean * RAD)];
  const floor = 242 - p.bob - BAG.tall; // how high its top is, set on the floor
  // Bending over, it slides round towards his back.
  const hang = [shoulder[0] + BAG.hang[0] - 0.9 * Math.max(0, p.lean - 4), shoulder[1] + BAG.hang[1]];
  const k = ease(seat);
  const top = [mix(hang[0], BAG.rest, k), Math.min(mix(hang[1], floor, k), floor)];
  const turn = swing * (1 - k) * RAD;
  bagBody.setAttribute('transform', `translate(${top[0].toFixed(2)} ${top[1].toFixed(2)}) rotate(${deg(turn).toFixed(2)})`);
  bagFlap.setAttribute('transform', `scale(1 ${(1 - 1.4 * flap).toFixed(3)})`);
  const ring = [
    top[0] + BAG.ring[0] * Math.cos(turn) - BAG.ring[1] * Math.sin(turn),
    top[1] + BAG.ring[0] * Math.sin(turn) + BAG.ring[1] * Math.cos(turn),
  ];
  // Slack, the strap sags.
  const sag = 0.6 * Math.max(0, BAG.strap - Math.hypot(shoulder[0] - ring[0], shoulder[1] - ring[1]));
  const worn = [0.33, 0.67, 1].map((a) => [mix(ring[0], shoulder[0], a), mix(ring[1], shoulder[1], a) + (a < 1 ? sag : 0)]);
  const points = worn.map(([x, y], i) => [mix(x, top[0] + STRAP_DOWN[i][0], off), mix(y, top[1] + STRAP_DOWN[i][1], off)]);
  const d = curve(ring, points);
  bagStraps.forEach((strap) => strap.setAttribute('d', d));
}

// The bag where he leaves it, drawn like the one he carries, with the floor
// at y = 0.
const startBag = document.createElementNS(SVG_NS, 'svg');
startBag.setAttribute('class', 'start-bag');
startBag.setAttribute('aria-hidden', 'true');
startBag.setAttribute('viewBox', '-64 -42 100 42');
startBag.setAttribute('hidden', '');
startBag.style.width = `calc(var(--fig-h) * ${(100 / 242).toFixed(4)})`;
startBag.style.height = `calc(var(--fig-h) * ${(42 / 242).toFixed(4)})`;
{
  const d = curve([BAG.ring[0], BAG.ring[1] - BAG.tall], STRAP_DOWN.map(([x, y]) => [x, y - BAG.tall]));
  const straps = ['bag__strap', 'bag__strap-band'].map((name) => {
    const strap = document.createElementNS(SVG_NS, 'path');
    strap.setAttribute('class', name);
    strap.setAttribute('d', d);
    return strap;
  });
  const body = bagBody.cloneNode(true);
  body.setAttribute('transform', `translate(0 ${-BAG.tall})`);
  startBag.append(...straps, body);
  world.append(startBag);
}

// Leaves the bag on the floor, the middle of its top `offset` units along
// from the end of his name; `dropped` if he was cut short and let it fall
// where he stood.
function leaveBag(offset, dropped) {
  bag.setAttribute('hidden', '');
  startBag.style.left = `calc(var(--name-end) + var(--fig-h) * ${((offset - 64) / 242).toFixed(4)})`;
  startBag.classList.toggle('is-dropped', dropped);
  startBag.removeAttribute('hidden');
}

// The controls, which he writes, drops, flips up and tosses down to the
// bottom left. On the floor they are a copy CAPSULE.length units long, their
// middle CAPSULE.at units on from where he first sits. He steps CAPSULE.step
// units up to them, stamps on their near end to flip them up into his hand,
// and throws them back over his shoulder. The scene is at the page's top
// left, so its px are the page's.
const controlsHint = document.querySelector('.sprint-hint');
const CAPSULE = { length: 130, at: 150, step: 55 };
const DROP = { fall: 0.28, hop: 0.2, from: 64, bounce: 10 }; // falling onto the floor: seconds, and units high
const POP = 0.55; // seconds they are in the air, flipped up
let capsule = null; // the copy: its element, size, and last place on screen

const bezier = (a, bend, b, k) => (1 - k) ** 2 * a + 2 * k * (1 - k) * bend + k * k * b;
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeInOut = (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (2 - 2 * k) ** 3 / 2);
const overshoot = (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;

// The copies in the air, and their flights, stopped if the opening is.
const flights = new Map();

// Moves `el`, fixed at the page's top left, along `at(k)` for k from 0 to 1:
// { x, y } its middle on screen, `turn` in degrees, `sx` and `sy` its scale
// and `alpha` its opacity, and for the controls `edge`, their outline's
// width in their own px, and `ink`, how dark it is.
function animateAlong(el, at, { duration, delay = 0, steps = 48 }) {
  const [w, h] = [el.offsetWidth, el.offsetHeight];
  const frames = [];
  for (let i = 0; i <= steps; i += 1) {
    const { x, y, turn = 0, sx = 1, sy = sx, alpha = 1, edge, ink } = at(i / steps);
    const frame = {
      offset: i / steps,
      opacity: alpha,
      transform: `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${turn.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`,
    };
    if (edge !== undefined) Object.assign(frame, capsuleEdge(edge, ink));
    frames.push(frame);
  }
  const flight = el.animate(frames, { duration, delay, fill: 'both' });
  flights.set(el, flight);
  return flight;
}

// Faint copies of `el` a moment behind it on the same path, streaking the
// fast part of it, `from` to `to` of the way along.
function trail(el, at, duration, host, from, to) {
  [0.24, 0.1].forEach((alpha, i) => {
    const ghost = el.cloneNode(true);
    ghost.classList.add('intro-flyer--ghost');
    host.append(ghost);
    const fade = (k) => alpha * clamp((k - from) / 0.06, 0, 1) * clamp((to - k) / 0.08, 0, 1);
    const flight = animateAlong(ghost, (k) => ({ ...at(k), alpha: fade(k) }), { duration, delay: 40 * (i + 1) });
    flight.onfinish = () => {
      flights.delete(ghost);
      ghost.remove();
    };
  });
}

// A copy of `el` to fly, out of the page's flow and out of reach.
function flyer(el) {
  const copy = el.cloneNode(true);
  copy.classList.remove('is-waiting');
  copy.classList.add('intro-flyer');
  copy.setAttribute('aria-hidden', 'true');
  copy.removeAttribute('aria-label');
  copy.tabIndex = -1;
  return copy;
}

// Shows the sound button or the controls in their place, landing with a
// squash if `bounce`.
function landTool(el, bounce) {
  if (!el?.classList.contains('is-waiting')) return;
  el.classList.remove('is-waiting');
  if (!bounce || reducedMotion.matches) return;
  el.classList.add('is-landing');
  el.addEventListener('animationend', () => el.classList.remove('is-landing'), { once: true });
}

// Enter on the sound file: the button pops up out of the editor, which
// flinches, hangs there a beat, then shoots off in a curve to its place in
// the navbar, stretching as it goes, and lands with a pulse.
function shootSoundButton() {
  if (!soundToggleBtn || !editor) return;
  const copy = flyer(soundToggleBtn);
  document.body.append(copy);
  const box = editor.getBoundingClientRect();
  const to = soundToggleBtn.getBoundingClientRect();
  const start = [box.right - 48, box.top + 14];
  const up = [start[0] - 12, start[1] - 50];
  const end = [to.left + to.width / 2, to.top + to.height / 2];
  const bend = [mix(up[0], end[0], 0.3), Math.min(up[1], end[1]) - 90];
  const at = (k) => {
    if (k < 0.2) {
      const u = k / 0.2;
      return { x: mix(start[0], up[0], easeOut(u)), y: mix(start[1], up[1], easeOut(u)), turn: -14 * u, sx: 0.15 + 0.85 * overshoot(u), alpha: clamp(u * 5, 0, 1) };
    }
    if (k < 0.27) return { x: up[0], y: up[1] + 3 * Math.sin(((k - 0.2) / 0.07) * Math.PI), turn: -14 };
    const u = easeInOut((k - 0.27) / 0.73);
    const stretch = 0.16 * Math.sin(Math.PI * u);
    return { x: bezier(up[0], bend[0], end[0], u), y: bezier(up[1], bend[1], end[1], u), turn: -14 * (1 - u), sx: 1 + stretch, sy: 1 - 0.5 * stretch };
  };
  const duration = 1100;
  const flight = animateAlong(copy, at, { duration });
  trail(copy, at, duration, document.body, 0.36, 0.93);
  editor.classList.add('is-kicked');
  editor.addEventListener('animationend', () => editor.classList.remove('is-kicked'), { once: true });
  sfx.pop();
  window.setTimeout(() => flights.has(copy) && sfx.whoosh(0.75), 0.27 * duration);
  flight.onfinish = () => {
    flights.delete(copy);
    copy.remove();
    landTool(soundToggleBtn, true);
    sfx.clack();
  };
}

// The outline of the controls while he has them, `edge` px wide in their
// own px and `ink` dark. Small, they are drawn in his ink so they read, the
// line kept as wide as his on screen; as they land they take on their own
// light edge again.
const EDGE = 1.8; // px on screen
const capsuleEdge = (edge, ink = 0.8) => ({ borderWidth: `${edge.toFixed(2)}px`, borderColor: `rgba(32, 32, 31, ${ink.toFixed(3)})` });

// Enter on the controls: they fall out of the editor onto the floor ahead.
function dropCapsule() {
  if (!controlsHint) return;
  const el = flyer(controlsHint);
  el.classList.add('intro-capsule');
  el.style.opacity = '0';
  scene.append(el);
  capsule = { el, w: el.offsetWidth, h: el.offsetHeight, last: null, landed: 0 };
}

// Where the controls lie on the floor, their middle on screen, with the
// camera `camera` px off his spot.
const capsuleSpot = (unit, camera) => [
  sceneWidth / 2 + camera + (CAPSULE.at - intro.stop) * unit,
  floorY + 1 - (intro.capTall / 2) * unit,
];

function placeCapsule({ x, y, turn, sx, sy = sx }, alpha) {
  const { el, w, h } = capsule;
  el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${turn.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  el.style.opacity = alpha.toFixed(3);
  Object.assign(el.style, capsuleEdge(EDGE / Math.min(sx, sy)));
}

// Let go of over his shoulder, they sail up and back in a high lob, turning
// over the way his arm swung them and settling level as they come down,
// growing as they come towards you, and land in the bottom left with a
// squash, a shadow under them and a puff of dust.
function throwCapsule(unit) {
  const { el, last } = capsule;
  const box = controlsHint.getBoundingClientRect();
  const end = [box.left + box.width / 2, box.top + box.height / 2];
  const lift = Math.max(90, 0.32 * Math.hypot(end[0] - last.x, end[1] - last.y));
  const bend = [mix(last.x, end[0], 0.42), Math.min(last.y, end[1]) - lift];
  const settle = -360 * Math.ceil((300 - last.turn) / 360); // most of a turn on, level
  const at = (k) => {
    const sx = mix(last.sx, 1, k * k);
    const landing = clamp((k - 0.8) / 0.2, 0, 1);
    return {
      x: bezier(last.x, bend[0], end[0], k),
      y: bezier(last.y, bend[1], end[1], k),
      turn: mix(last.turn, settle, easeOut(k)),
      sx,
      edge: mix(EDGE / sx, 1, landing),
      ink: mix(0.8, 0.18, landing),
    };
  };
  const duration = 1000;
  const flight = animateAlong(el, at, { duration });
  trail(el, at, duration, scene, 0.04, 0.9);
  const shade = document.createElement('span');
  shade.className = 'tool-shadow';
  Object.assign(shade.style, { left: `${box.left}px`, top: `${box.bottom - 6}px`, width: `${box.width}px` });
  scene.append(shade);
  const dark = shade.animate([
    { opacity: 0, transform: 'scale(0.3, 0.5)' },
    { opacity: 0, transform: 'scale(0.3, 0.5)', offset: 0.4 },
    { opacity: 1, transform: 'scale(1)', offset: 0.77 },
    { opacity: 0, transform: 'scale(1.15, 1)' },
  ], { duration: duration * 1.3, fill: 'forwards' });
  flights.set(shade, dark);
  dark.onfinish = () => {
    flights.delete(shade);
    shade.remove();
  };
  sfx.whoosh(0.9);
  flight.onfinish = () => {
    flights.delete(el);
    el.remove();
    capsule = null;
    landTool(controlsHint, true);
    sfx.land();
    for (const dir of [-1, 1]) {
      spawnDust(end[0] + dir * box.width * 0.3, dir, unit, { count: 4, power: 0.9, host: scene, top: box.bottom });
    }
  };
}

// Puts the sound button and the controls in their places at once, and
// drops anything in the air, when the opening is over or cut short.
function settleTools() {
  flights.forEach((flight, el) => {
    flight.cancel();
    el.remove();
  });
  flights.clear();
  capsule?.el.remove();
  capsule = null;
  landTool(soundToggleBtn, false);
  landTool(controlsHint, false);
  introSpeech?.querySelectorAll('[data-sound]').forEach((button) => {
    button.disabled = true;
  });
}

// The opening, phase by phase: its name, how long it takes in seconds, and
// what he is doing. Walking on, and walking over to the N, take as long as
// the walk does, so those are planned on the first frame, as is whether he
// makes the controls at all: a narrow screen has none, so there he walks
// straight to his spot by the N and sets up the sound and fixes the N there.
const WALK_ON = 1.75; // his pace walking, in walking speeds
const ASK_WAIT = 12; // seconds he waits to be told about sound, before going on without
// When he says hi, walking on, and that he needs a sec, and the soonest he
// asks about sound, so there is time to read that; in seconds from the start.
const HELLO = { hi: 1.5, sec: 3.1, ask: 5.3 };
const INTRO = [
  ['enter', 0, 'walk'],
  ['sit1', 0.6, 'sit'], ['fetch1', 0.75, 'fetch'], ['open1', 0.3, 'open'],
  ['code1', 1.4, 'type'], ['ask', 0.45, 'look'], ['code2', 0.9, 'type'],
  ['wind1', 0.3, 'wind'], ['slam1', 0.14, 'slam'], ['sent1', 0.75, 'hold'],
  ['code3', 1.6, 'type'], ['wind2', 0.3, 'wind'], ['slam2', 0.14, 'slam'], ['sent2', 0.9, 'hold'],
  ['shut1', 0.3, 'shut'], ['stow1', 0.55, 'stow'], ['rise1', 0.6, 'rise'],
  ['step', 0.5, 'walk'], ['kick', 0.4, 'kick'], ['catch', 0.5, 'catch'], ['toss', 0.8, 'toss'],
  ['brush', 0.5, 'brush'], ['walk', 0, 'walk'],
  ['ponder', 0.8, 'ponder'], ['sit', 0.6, 'sit'], ['fetch', 0.75, 'fetch'], ['open', 0.3, 'open'],
  ['type', 1.7, 'type'], ['look', 0.7, 'look'], ['rush', 1.0, 'type'],
  ['windup', 0.35, 'wind'], ['slam', 0.14, 'slam'], ['react', 1.3, 'react'],
  ['close', 0.3, 'shut'], ['stow', 0.55, 'stow'], ['rise', 0.6, 'rise'], ['present', 1.0, 'present'],
];
const INTRO_INDEX = Object.fromEntries(INTRO.map(([name], i) => [name, i]));
// What the opening leaves out without the controls.
const CONTROLS_ONLY = new Set(['code3', 'wind2', 'slam2', 'sent2', 'shut1', 'stow1', 'rise1', 'step', 'kick',
  'catch', 'toss', 'brush', 'walk', 'ponder', 'sit', 'fetch', 'open']);
const KICKED = 0.62; // how far through the kick his foot comes down on the controls
const DIP = 0.3; // how far through the toss he has dipped, ready to swing
const SWUNG = 0.58; // and has swung his arm up and over
const TOSSED = 0.56; // and lets go of them
const CATCH = [120, 112]; // where he catches them, inside the bob
const INTRO_AT = {};
const INTRO_LEN = {};
let introLength = 0;

const intro = {
  active: !reducedMotion.matches && !returning, // living: someone back again is greeted instead (living.js)
  t: 0,
  from: null, // units left of his spot where he walks on from, off screen
  stop: 0, // units short of his spot where he first sits down
  controls: false, // whether he makes the controls
  capTall: 12, // the controls' height on the floor, in units
  answered: false,
  waited: 0, // seconds he has waited for an answer
  soundCode: soundCode(''),
  capsuleAt: 0, // when the controls dropped
  thrown: false,
  fixAt: null, // when the N started snapping back
  sent: false, // the editor has been sent off
  keys: 0, // characters typed, for the key clicks
  steps: null, // steps walked, for the footfalls
  here: null, // where he is in it, this frame
  dxPx: 0,
  last: null, // his last pose, height and place, to ease out of if interrupted
  release: null,
  leave: false, // the opening is done and he should set off
};

function planIntro(unit) {
  // He walks on from just past the left edge of the screen as first framed,
  // to a first spot well short of the N, so the controls land between him
  // and the street lamp, with room for his bag behind him.
  const spot = sceneWidth / 2 + startFraming(unit); // his spot by the N, px across the screen
  intro.from = (spot + 90) / unit;
  intro.controls = Boolean(controlsHint) && getComputedStyle(controlsHint).display !== 'none';
  if (intro.controls) {
    intro.stop = Math.max(CAPSULE.step + 40, clamp((spot - 16) / unit - 90, 0, 600));
    intro.capTall = (CAPSULE.length * controlsHint.offsetHeight) / controlsHint.offsetWidth;
  }
  const pace = (WALK_ON * GAITS.walk.travel) / WALK_CYCLE; // units a second
  introLength = 0;
  for (const [name, seconds] of INTRO) {
    let length = !intro.controls && CONTROLS_ONLY.has(name) ? 0 : seconds;
    if (name === 'enter') length = (intro.from - intro.stop) / pace;
    // Where he walks on quickly, he types on a little longer before asking.
    if (name === 'code1') length = Math.max(seconds, HELLO.ask - introLength);
    if (name === 'walk' && intro.controls) length = (intro.stop - CAPSULE.step) / pace;
    INTRO_AT[name] = introLength;
    INTRO_LEN[name] = length;
    introLength += length;
  }
}

// Which phase the opening is in at `t` seconds, and how far through it.
function introPhase(t) {
  for (const [name, , kind] of INTRO) {
    if (INTRO_LEN[name] > 0 && t < INTRO_AT[name] + INTRO_LEN[name]) {
      return { name, kind, s: clamp((t - INTRO_AT[name]) / INTRO_LEN[name], 0, 1) };
    }
  }
  const [name, , kind] = INTRO[INTRO.length - 1];
  return { name, kind, s: 1 };
}
// How far through phase `name` the opening is at `t`: 0 before, 1 after.
const through = (name, t) => (INTRO_LEN[name] > 0
  ? clamp((t - INTRO_AT[name]) / INTRO_LEN[name], 0, 1)
  : Number(t >= INTRO_AT[name]));
const lerp2 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k)];

// Their answer: sound goes on or off, and he types it in. Unanswered, he
// leaves sound as it was.
const SOUND_QUESTION = '<span>Would you like sound?</span>'
  + '<span class="intro-speech__choices"><button type="button" data-sound="on">Yes</button>'
  + '<button type="button" data-sound="off">No</button></span>';
function answerSound(on, unanswered = false) {
  if (intro.answered) return;
  intro.answered = true;
  intro.soundCode = soundCode(on ? 'yes!' : unanswered ? 'maybe later' : 'no');
  if (!unanswered) {
    sfx.set(on);
    updateSoundToggleUI(on);
    sfx.chime(); // heard only if that was a yes
  }
  introSpeech?.querySelectorAll('[data-sound]').forEach((button) => {
    button.classList.toggle('is-chosen', !unanswered && (button.dataset.sound === 'on') === on);
    button.disabled = true;
  });
  hushSpeech(unanswered ? 0 : 520);
}
introSpeech?.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-sound]');
  if (choice && !choice.disabled) answerSound(choice.dataset.sound === 'on');
});

// Sitting cross-legged on the floor.
function floorSitPose(base, lean) {
  const p = clonePose(base);
  p.bob = SIT_BOB;
  Object.assign(p.near, { thigh: -86, knee: 140, ankle: -54 });
  Object.assign(p.far, { thigh: -80, knee: 145, ankle: -65 });
  p.lean = lean;
  return p;
}

// Where a leg's ankle is, his hip dropped `bob`, in rig units.
function ankleAt(leg, bob) {
  const a = leg.thigh * RAD;
  const b = (leg.thigh + leg.knee) * RAD;
  return [70 - 50 * Math.sin(a) - 48 * Math.sin(b), 144 + bob + 50 * Math.cos(a) + 48 * Math.cos(b)];
}

// Keeps his feet (or those on `sides`) where they are in `base`, whatever
// his hip does in `p`.
function plant(p, base, sides = ['near', 'far']) {
  for (const side of sides) Object.assign(p[side], reach(p.bob, ankleAt(base[side], base.bob)[0], 242));
}

// Down on one knee from a drop, a hand to the floor, and back up; `k` 0..1.
function kneelLanding(base, k) {
  const hold = 1 - ease(clamp((k - 0.35) / 0.65, 0, 1));
  const p = clonePose(base);
  p.bob = 64 * hold;
  Object.assign(p.near, reach(p.bob, 104, 242));
  Object.assign(p.far, reach(p.bob, 26, 242));
  p.near.shoulder = mix(base.near.shoulder, -10, hold);
  p.near.elbow = mix(base.near.elbow, -6, hold);
  p.far.shoulder = mix(base.far.shoulder, 72, hold);
  p.far.elbow = mix(base.far.elbow, -24, hold);
  p.lean = mix(base.lean, 40, hold);
  p.spin = 0;
  return p;
}

// The laptop on his lap, set along his near thigh: its middle and its turn,
// in rig units.
function lapAt(p) {
  const t = p.near.thigh * RAD;
  const along = [-Math.sin(t), Math.cos(t)];
  return { x: 70 + 30 * along[0], y: 144 + 30 * along[1] - 5, turn: deg(Math.atan2(along[1], along[0])) };
}
const onLaptop = (lap, lx, ly) => {
  const a = lap.turn * RAD;
  return [lap.x + lx * Math.cos(a) - ly * Math.sin(a), lap.y + lx * Math.sin(a) + ly * Math.cos(a)];
};
function handAtPose(p, which) {
  return handAt(p.lean, p[which].shoulder, p[which].elbow);
}

// Seated at the laptop in phase `name` (of kind `kind`), `s` through it:
// his pose, and where the laptop is.
function seatedAt(t, base, name, kind, s, out) {
  let lean = 14;
  if (kind === 'look') lean = name === 'ask' ? mix(14, -10, ease(s)) : mix(14, -12, Math.sin(Math.PI * s));
  if (name === 'ask') lean += 1.5 * Math.sin(intro.waited * 2.4); // shifting about while he waits
  if (name === 'code2') lean = mix(-10, 14, ease(clamp(s / 0.3, 0, 1)));
  // Leaning back to reach into the bag.
  if (kind === 'fetch') lean = 14 - 28 * Math.sin(Math.PI * clamp(s / 0.8, 0, 1));
  if (kind === 'stow') lean = 14 - 28 * Math.sin(Math.PI * clamp((s - 0.2) / 0.8, 0, 1));
  const p = floorSitPose(base, lean);
  const lap = lapAt(p);
  const keys = [onLaptop(lap, 3, -4), onLaptop(lap, 14, -9)];
  const up = [keys[1][0] - 14, keys[1][1] - 78];
  const enter = [keys[1][0] + 8, keys[1][1]];
  const tap = (speed, offset) => 2.8 * Math.max(0, Math.sin(t * speed * 2 * Math.PI + offset));
  let near = keys[1];
  let far = keys[0];
  let lid = 1;
  let at = 'lap';

  if (kind === 'fetch') {
    // Reaching back into the bag, and bringing the laptop round onto his lap.
    const round = ease(clamp((s - 0.4) / 0.6, 0, 1));
    near = s < 0.4
      ? lerp2(handAtPose(p, 'near'), bagMouth, ease(s / 0.4))
      : [mix(bagMouth[0], keys[1][0], round), mix(bagMouth[1], keys[1][1] - 6, round) - 16 * Math.sin(Math.PI * round)];
    far = handAtPose(p, 'far');
    lid = 0;
    at = s < 0.4 ? null : s < 0.98 ? 'hand' : 'lap';
    out.bag.flap = Math.sin(Math.PI * clamp(s / 0.6, 0, 1));
  } else if (kind === 'open') {
    lid = ease(s);
  } else if (kind === 'type') {
    // Typing, and faster when he rushes the end of the fix.
    const speed = name === 'rush' ? 11 : name === 'type' ? 8 : 9;
    near = [near[0], near[1] - tap(speed, 0)];
    far = [far[0], far[1] - tap(speed, 1.7)];
  } else if (kind === 'look') {
    // Looking up with his hands on the keys, drumming one while he waits.
    if (name === 'ask') far = [far[0], far[1] - 2.4 * Math.max(0, Math.sin(intro.waited * 2 * Math.PI * 1.4))];
  } else if (kind === 'wind') {
    near = lerp2(keys[1], up, ease(s));
  } else if (kind === 'slam') {
    near = lerp2(up, enter, s * s);
  } else if (kind === 'hold') {
    // A beat on Enter while it goes, then back to the keys.
    near = s < 0.35 ? enter : lerp2(enter, keys[1], ease(clamp((s - 0.35) / 0.4, 0, 1)));
  } else if (kind === 'react') {
    // A beat on the key while the fix lands, then a fist in the air.
    near = s < 0.58 ? enter : null;
  } else if (kind === 'shut') {
    lid = 1 - ease(s);
  } else if (kind === 'stow') {
    // The laptop back into the bag, and his hands off the keys.
    const hanging = handAtPose(p, 'near');
    near = s < 0.6
      ? [mix(keys[1][0], bagMouth[0], ease(s / 0.6)), mix(keys[1][1], bagMouth[1], ease(s / 0.6)) - 14 * Math.sin((Math.PI * s) / 0.6)]
      : lerp2(bagMouth, hanging, ease((s - 0.6) / 0.4));
    far = lerp2(keys[0], handAtPose(p, 'far'), ease(clamp(s / 0.5, 0, 1)));
    lid = 0;
    at = s < 0.6 ? 'hand' : null;
    out.bag.flap = Math.sin(Math.PI * clamp((s - 0.2) / 0.65, 0, 1));
  }

  if (near) Object.assign(p.near, armReach(p.lean, near[0], near[1]));
  else Object.assign(p.near, { shoulder: -122, elbow: -62 }); // a fist up in front of his face
  Object.assign(p.far, armReach(p.lean, far[0], far[1]));
  if (kind === 'react') {
    // He sits back to watch the N come right.
    p.lean = mix(14, -14, Math.sin(Math.PI * clamp((s - 0.12) / 0.88, 0, 1)));
    if (near) Object.assign(p.near, armReach(p.lean, near[0], near[1]));
    Object.assign(p.far, armReach(p.lean, far[0], far[1]));
  }
  const bump = kind === 'hold' || kind === 'react' ? 3 * Math.max(0, 1 - s * 4) : 0;
  out.computer = at && { at, lid, bump, lap, hand: at === 'hand' ? near : null };
  out.bag.seat = 1;
  out.bag.off = 1;
  out.hands = true;
  return p;
}

// Where he is in the opening at `t` seconds: his pose, how far short of his
// spot by the N he is, and what he has in hand.
function introAt(t, base) {
  const { name, kind, s } = introPhase(t);
  const index = INTRO_INDEX[name];
  const first = -intro.stop; // where he sits first, in units from his spot
  const near = first + CAPSULE.step; // and where he stands to flip up the controls
  const out = {
    pose: base, lift: 0, dx: 0, flip: 1, computer: null, hold: null, hands: false, stride: null,
    bag: { seat: 0, swing: 0, flap: 0, off: 0 },
  };

  if (name === 'enter') out.dx = mix(-intro.from, first, s);
  else if (index < INTRO_INDEX.step) out.dx = first;
  else if (name === 'step') out.dx = mix(first, near, smoother(s));
  else if (index < INTRO_INDEX.walk) out.dx = near;
  else if (name === 'walk') out.dx = mix(near, 0, s);

  let p = base;
  if (kind === 'walk') {
    // Walking, with the bag swinging, and easing to a stand at the end. On
    // the way on he waves hello.
    const walked = Math.abs(out.dx - (name === 'enter' ? -intro.from : name === 'step' ? first : near));
    out.stride = walked;
    p = pose(GAITS.walk, (walked / GAITS.walk.travel) * 100);
    if (name === 'enter') {
      const seconds = t - INTRO_AT.enter;
      const waving = ease(clamp((seconds - HELLO.hi + 0.25) / 0.3, 0, 1)) * ease(clamp((INTRO_AT.sit1 - 0.3 - t) / 0.3, 0, 1));
      const wave = Math.sin(seconds * 2.6 * 2 * Math.PI);
      p.near.shoulder = mix(p.near.shoulder, -138 + 6 * wave, waving);
      p.near.elbow = mix(p.near.elbow, -22 + 34 * wave, waving);
    }
    const setOff = name === 'enter' ? 1 : s / (name === 'step' ? 0.2 : 0.12);
    p = mixPose(base, p, ease(clamp(Math.min(setOff, (1 - s) / (name === 'step' ? 0.2 : 0.1)), 0, 1)));
    out.bag.swing = 4 * Math.sin((walked / GAITS.walk.travel) * 4 * Math.PI);
  } else if (kind === 'sit') {
    p = s < 0.5 ? mixPose(base, crouchPose(base, 40), ease(s / 0.5)) : mixPose(crouchPose(base, 40), floorSitPose(base, 14), ease((s - 0.5) / 0.5));
    out.bag.seat = s;
    out.bag.off = ease(clamp((s - 0.3) / 0.7, 0, 1)); // slipping the strap off as he sits
  } else if (kind === 'rise') {
    p = s < 0.5 ? mixPose(floorSitPose(base, 14), crouchPose(base, 40), ease(s / 0.5)) : mixPose(crouchPose(base, 40), base, ease((s - 0.5) / 0.5));
    // The last time up, he leaves the bag where it is.
    if (name === 'rise') {
      out.bag.seat = 1;
      out.bag.off = 1;
    } else {
      out.bag.seat = 1 - s;
      out.bag.off = 1 - ease(clamp((s - 0.2) / 0.6, 0, 1)); // shrugging it back on
    }
  } else if (kind === 'ponder') {
    // A hand to his chin, looking the broken N over.
    const k = Math.sin(Math.PI * s);
    const chin = setPose(base, { ...base.near, shoulder: -34, elbow: -128 }, { ...base.far, shoulder: -12, elbow: -78 }, -7);
    p = mixPose(base, chin, ease(Math.min(1, k * 1.6)));
  } else if (kind === 'kick') {
    // A foot lifted over the near end of the controls and stamped down on it
    // at KICKED, flipping them up; the knee he stands on gives a little and
    // his arms go out for balance.
    p = clonePose(base);
    const end = 70 + CAPSULE.at - CAPSULE.step - CAPSULE.length / 2; // their near end, from his hip
    const stance = ankleAt(base.near, base.bob);
    const raised = [end - 12, 242 - 36];
    const stamped = [end - 5, 242 - intro.capTall * 0.6];
    const foot = s < 0.5 ? lerp2(stance, raised, ease(s / 0.5))
      : s < KICKED ? lerp2(raised, stamped, ((s - 0.5) / (KICKED - 0.5)) ** 2)
        : lerp2(stamped, stance, ease((s - KICKED) / (1 - KICKED)));
    const effort = Math.sin(Math.PI * s);
    p.bob = base.bob + 4 * effort;
    p.lean = mix(base.lean, 8, effort);
    plant(p, base, ['far']);
    Object.assign(p.near, reach(p.bob, foot[0], foot[1]));
    p.near.shoulder = mix(base.near.shoulder, -22, effort);
    p.far.shoulder = mix(base.far.shoulder, 28, effort);
    out.hands = true;
  } else if (kind === 'catch') {
    // Watching them flip up, a hand out for them, and his knees and hand
    // giving a little as they land in it.
    p = clonePose(base);
    const reachOut = ease(clamp(s / 0.7, 0, 1));
    const caught = INTRO_AT.kick + KICKED * INTRO_LEN.kick + POP;
    const give = Math.sin(Math.PI * clamp((t - caught) / 0.24, 0, 1));
    p.lean = mix(base.lean, -5, reachOut);
    p.bob = base.bob + 5 * give;
    plant(p, base);
    const hand = lerp2(handAtPose(base, 'near'), CATCH, reachOut);
    Object.assign(p.near, armReach(p.lean, hand[0], hand[1] + 6 * give));
    out.hold = { turn: 0 };
    out.hands = true;
  } else if (kind === 'toss') {
    // A dip, then his arm swung up over his head and back, letting go of them
    // behind him at TOSSED without a look, and on round down his back. He
    // rises onto his toes with it, arching back.
    p = clonePose(base);
    const caught = armReach(-5, CATCH[0], CATCH[1]);
    const dipped = armReach(10, 108, 150);
    let arm;
    if (s < DIP) {
      const k = ease(s / DIP);
      p.lean = mix(-5, 10, k);
      p.bob = base.bob + 8 * k;
      arm = { shoulder: mix(caught.shoulder, dipped.shoulder, k), elbow: mix(caught.elbow, dipped.elbow, k) };
    } else if (s < SWUNG) {
      const k = ((s - DIP) / (SWUNG - DIP)) ** 2; // speeding up
      p.lean = mix(10, -14, k);
      p.bob = base.bob + mix(8, -2, k);
      arm = { shoulder: mix(dipped.shoulder, -235, k), elbow: mix(dipped.elbow, -12, k) };
    } else {
      const k = ease((s - SWUNG) / (1 - SWUNG));
      p.lean = mix(-14, base.lean, k);
      p.bob = base.bob + mix(-2, 0, k);
      // A turn on from where it hung, which draws the same.
      arm = { shoulder: mix(-235, base.near.shoulder - 360, k), elbow: mix(-12, base.near.elbow, k) };
    }
    plant(p, base);
    Object.assign(p.near, arm);
    p.far.shoulder = mix(base.far.shoulder, -45, Math.sin(Math.PI * clamp((s - 0.2) / 0.7, 0, 1)));
    if (s < TOSSED) out.hold = { turn: 0.5 * (arm.shoulder - caught.shoulder) };
    out.hands = true;
  } else if (kind === 'brush') {
    // Dusting his hands off: done.
    p = clonePose(base);
    const k = ease(Math.min(1, 1.5 * Math.sin(Math.PI * s)));
    const rub = 7 * Math.sin(s * 4 * Math.PI);
    const nearHand = lerp2(handAtPose(base, 'near'), [104 + rub, 116], k);
    const farHand = lerp2(handAtPose(base, 'far'), [98 - rub, 120], k);
    Object.assign(p.near, armReach(p.lean, nearHand[0], nearHand[1]));
    Object.assign(p.far, armReach(p.lean, farHand[0], farHand[1]));
    out.hands = true;
  } else if (kind === 'present') {
    // Up from the N, an arm swept out to the world: have a look around.
    p = clonePose(base);
    const k = ease(clamp(s / 0.35, 0, 1)) * (1 - ease(clamp((s - 0.72) / 0.28, 0, 1)));
    p.near.shoulder = mix(base.near.shoulder, mix(-60, -118, ease(clamp(s / 0.5, 0, 1))), k);
    p.near.elbow = mix(base.near.elbow, -8, k);
    p.lean = mix(base.lean, -3, k);
    out.bag.seat = 1;
    out.bag.off = 1;
    out.hands = true;
  } else {
    p = seatedAt(t, base, name, kind, s, out);
  }
  if (kind === 'kick' || kind === 'catch' || kind === 'toss') out.bag.swing = 0.6 * (base.lean - p.lean);
  out.pose = p;
  return out;
}

// Sets the laptop in his hand or on his lap, its lid `lid` of the way open,
// and as many lines of code on the screen as he has typed.
function placeLaptop(computer, typed = 0) {
  laptop.toggleAttribute('hidden', !computer);
  if (!computer) return;
  const { lap } = computer;
  const [x, y, turn] = computer.at === 'hand'
    ? [computer.hand[0], computer.hand[1] - 6, 0]
    : [lap.x, lap.y + computer.bump, lap.turn];
  laptop.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${turn.toFixed(2)})`);
  // The lid swings up about the hinge: its unit square spans the hinge one
  // way and the lid's length the other.
  const a = LID.open * computer.lid * RAD;
  const up = [-LID.length * Math.cos(a), -LID.length * Math.sin(a)];
  laptopLid.setAttribute('transform',
    `matrix(${LID.across[0]} ${LID.across[1]} ${up[0].toFixed(2)} ${up[1].toFixed(2)} ${LID.hinge[0]} ${LID.hinge[1]})`);
  const open = clamp((computer.lid - 0.35) / 0.45, 0, 1);
  laptopFace.style.opacity = open.toFixed(3);
  laptopHalo.style.opacity = open.toFixed(3);
  laptopLines.forEach((line, i) => {
    line.style.opacity = typed * laptopLines.length > i ? '1' : '0';
  });
}

// Runs the opening: returns his pose and place while it plays, and eases
// him out of it if you set off somewhere before it finishes.
function drawStart(dt, now, base, unit) {
  if (intro.fixAt !== null) {
    const k = clamp((intro.t - intro.fixAt) / 0.8, 0, 1);
    setN(k);
    if (k >= 1) intro.fixAt = null;
  }
  if (!intro.active) {
    if (intro.fixAt !== null) intro.t += dt;
    if (!intro.release) return null;
    intro.release.t += dt;
    const w = ease(clamp(intro.release.t / 0.35, 0, 1));
    if (w >= 1) intro.release = null;
    return { pose: mixPose(intro.last.pose, base, w), lift: intro.last.lift * (1 - w), dx: 0 };
  }

  if (intro.from === null) planIntro(unit);
  // Having asked, he waits for an answer, or until he has waited long enough.
  const before = intro.t;
  let t = before + dt;
  if (!intro.answered && t >= INTRO_AT.code2) {
    intro.waited += dt;
    t = INTRO_AT.code2 - 1e-4;
    if (intro.waited >= ASK_WAIT) answerSound(sfx.enabled, true);
  }
  intro.t = t;
  const here = introAt(t, base);
  intro.here = here;
  intro.dxPx = here.dx * unit;
  state.flip = here.flip;
  state.facing = here.flip >= 0 ? 1 : -1;
  const passed = (at) => before < at && t >= at;

  // What he says, bubble by bubble.
  // With the controls, he says who he is once they have landed.
  const welcome = intro.controls ? INTRO_AT.walk + 0.35 : INTRO_AT.type;
  if (passed(INTRO_AT.enter + HELLO.hi)) speak('<span>Hi there!</span>');
  if (passed(INTRO_AT.enter + HELLO.sec)) speak('<span>Give me a sec,</span><span>gotta sort something out first.</span>');
  if (passed(INTRO_AT.ask + 0.05)) speak(SOUND_QUESTION);
  if (intro.controls && passed(INTRO_AT.code3 + 0.1)) speak('<span>Almost done&hellip;</span>');
  if (intro.controls && passed(INTRO_AT.toss)) hushSpeech(); // out of the way of the throw
  if (passed(welcome)) speak('<span>Anyways, I&rsquo;m Naeem.</span><span>Welcome to my portfolio!</span>');
  if (passed(welcome + 3.6)) hushSpeech();
  if (passed(INTRO_AT.present + 0.1)) speak('<span>Have a look around!</span>');

  // The editor is up while the lid is: the sound file, then the controls,
  // then, after he has walked over, the fix. Each types out as he types.
  const file = t < INTRO_AT.code3 ? 'sound' : t < INTRO_AT.shut1 ? 'controls' : 'name';
  if (file === 'sound') openFile('sound.js', intro.soundCode);
  else if (file === 'controls') openFile('controls.css', CONTROLS_CODE);
  else openFile('name.css', FIX_CODE);
  const typed = file === 'sound'
    ? (t < INTRO_AT.code2 ? SOUND_ASKED * through('code1', t) : mix(SOUND_ASKED, codeLength(intro.soundCode), through('code2', t)))
    : file === 'controls'
      ? CONTROLS_LENGTH * through('code3', t)
      // The fix: most of it, a pause while he looks up at the N, then the rest.
      : FIX_LENGTH * (t < INTRO_AT.look ? 0.62 * through('type', t) : t < INTRO_AT.rush ? 0.62 : mix(0.62, 1, through('rush', t)));
  const count = Math.round(typed);
  showEditor((t >= INTRO_AT.open1 + 0.2 && t < INTRO_AT.shut1) || (t >= INTRO_AT.open + 0.2 && t < INTRO_AT.close));
  typeCode(count);
  placeLaptop(here.computer, count / codeLength(editorFile.code));
  if (count > intro.keys) sfx.key();
  intro.keys = count;

  // Enter sends each file off: the sound button up to the navbar, the
  // controls down to the floor ahead of him, and the fix into the N, which
  // snaps back together as it lands.
  if (passed(INTRO_AT.sent1)) applyEditor();
  if (passed(INTRO_AT.sent1 + 0.12)) shootSoundButton();
  if (intro.controls) {
    if (passed(INTRO_AT.sent2)) applyEditor();
    if (passed(INTRO_AT.sent2 + 0.25)) {
      // It shrinks away to where they fall from.
      const [x, y] = capsuleSpot(unit, state.introShift);
      sendEditor([x, y - DROP.from * unit]);
    }
    if (passed(INTRO_AT.sent2 + 0.6)) {
      dropCapsule();
      intro.capsuleAt = t;
    }
    // The stamp that flips them up, and the catch.
    const popAt = INTRO_AT.kick + KICKED * INTRO_LEN.kick;
    if (passed(popAt)) {
      sfx.step(false);
      sfx.jump();
    }
    if (passed(popAt + POP)) sfx.key();
  }
  if (passed(INTRO_AT.react)) applyEditor();
  if (passed(INTRO_AT.react + 0.3)) sendEditor(nSpot(unit));
  if (passed(INTRO_AT.react + 0.72)) fixN(unit);

  const during = (name, k) => INTRO_LEN[name] > 0 && passed(INTRO_AT[name] + k * INTRO_LEN[name]);
  if (during('open1', 0) || during('open', 0)) sfx.lid(true);
  if (during('shut1', 1) || during('close', 1)) sfx.lid(false);
  if (during('fetch1', 0.3) || during('fetch', 0.3) || during('stow1', 0.45) || during('stow', 0.45)) sfx.rustle(0.3);
  if (during('sit1', 0.95) || during('sit', 0.95)) sfx.tap(0.5);

  // A footfall each step, once sound is on.
  if (here.stride !== null) {
    const steps = Math.floor(here.stride / (GAITS.walk.travel / 2));
    if (intro.steps !== null && steps > intro.steps) sfx.step(false);
    intro.steps = steps;
  } else {
    intro.steps = null;
  }

  if (t >= introLength) finishIntro(true);
  intro.last = { pose: here.pose, lift: here.lift, dx: here.dx };
  return here;
}

// Draws what he has with him in the opening, once his pose `p` is final:
// the bag on him or beside him, and the controls on the floor or in his
// hand. `camera` is how far the camera is off his spot and `walkingOn` how
// far he is off it, px.
function drawStartProps(p, flip, unit, camera, walkingOn) {
  const here = intro.active ? intro.here : null;
  if (!here) return;
  bag.removeAttribute('hidden');
  placeBag(p, here.bag);
  if (!capsule || intro.thrown) return;
  const t = intro.t;
  if (t >= INTRO_AT.toss + TOSSED * INTRO_LEN.toss) {
    intro.thrown = true;
    throwCapsule(unit);
    return;
  }
  const scale = (CAPSULE.length * unit) / capsule.w;
  const popAt = INTRO_AT.kick + KICKED * INTRO_LEN.kick;
  const [floorX, floorMid] = capsuleSpot(unit, camera);
  // In his hand, which holds them by the middle.
  const hand = handAtPose(p, 'near');
  const held = {
    x: sceneWidth / 2 + camera + walkingOn + (hand[0] - 70) * unit * flip,
    y: floorY + 1 - (242 - hand[1] - p.bob) * unit,
    turn: (here.hold?.turn ?? 0) * flip,
    sx: scale,
  };
  if (t >= popAt + POP) {
    capsule.last = held;
  } else if (t >= popAt) {
    // Flipped up off the floor by his stamp, turning over once on the way up
    // to his hand.
    const u = (t - popAt) / POP;
    const top = Math.min(floorMid, held.y) - 40 * unit;
    capsule.last = {
      x: bezier(floorX, (floorX + held.x) / 2, held.x, u),
      y: bezier(floorMid, 2 * top - (floorMid + held.y) / 2, held.y, u),
      turn: -360 * easeOut(u) * flip,
      sx: scale,
    };
  } else {
    // Dropped onto the floor: popping into being, stretching as they fall,
    // squashing flat as they hit, a little bounce, and settled.
    const since = t - intro.capsuleAt;
    const { fall, hop, from, bounce } = DROP;
    const lift = since < fall ? from * (1 - (since / fall) ** 2)
      : since < fall + hop ? bounce * 4 * ((since - fall) / hop) * (1 - (since - fall) / hop)
        : 0;
    const hit = (at, amount) => amount * Math.sin(Math.PI * clamp((since - at) / 0.12, 0, 1));
    const squash = hit(fall, 0.3) + hit(fall + hop, 0.14);
    const stretch = since < fall ? (0.14 * since) / fall : 0;
    const grow = mix(0.5, 1, overshoot(clamp(since / 0.14, 0, 1)));
    const sy = (1 - squash) * (1 + stretch);
    capsule.last = {
      x: floorX,
      y: floorY + 1 - (lift + (intro.capTall * sy) / 2) * unit,
      turn: 0,
      sx: scale * grow * (1 + 0.6 * squash) * (1 - 0.5 * stretch),
      sy: scale * grow * sy,
    };
    const landed = since < fall ? 0 : since < fall + hop ? 1 : 2;
    if (landed > capsule.landed) {
      capsule.landed = landed;
      const x = state.x + (CAPSULE.at - intro.stop) * unit;
      if (landed === 1) {
        spawnDust(x, 1, unit, { count: 3, power: 0.8 });
        spawnDust(x, -1, unit, { count: 3, power: 0.8 });
        sfx.land();
      }
    }
  }
  placeCapsule(capsule.last, clamp((t - intro.capsuleAt) * 12, 0, 1));
}

// The editor sits over him, kept on screen.
function showEditor(shown) {
  if (!editor) return;
  if (editor.hidden === shown) {
    editor.hidden = !shown;
    editor.classList.remove('is-applied', 'is-sent');
    intro.sent = false;
  }
  if (!shown || intro.sent) return;
  const width = editor.offsetWidth;
  const middle = sceneWidth / 2 + state.introShift + intro.dxPx;
  editor.style.left = `${clamp(middle - width * 0.62, 12, sceneWidth - width - 12).toFixed(1)}px`;
}

// Enter: the file is applied, with a click and a chime.
function applyEditor() {
  editor?.classList.add('is-applied');
  sfx.key();
  sfx.chime(0.05);
}

// Sends the editor off to [x, y] on screen, shrinking away as it goes.
function sendEditor([x, y]) {
  if (!editor || editor.hidden) return;
  intro.sent = true;
  const box = editor.getBoundingClientRect();
  const sceneBox = scene.getBoundingClientRect();
  editor.style.setProperty('--to-x', `${(x - (box.left - sceneBox.left + box.width / 2)).toFixed(1)}px`);
  editor.style.setProperty('--to-y', `${(y - (box.top - sceneBox.top + box.height / 2)).toFixed(1)}px`);
  editor.classList.add('is-sent');
}

// The middle of the N, on screen.
const nSpot = (unit) => [
  sceneWidth / 2 + state.introShift + (nameStart(unit) + 110 * unit - state.x),
  floorY - (PLINTH + 8 + LETTER_TALL / 2) * unit,
];

function fixN(unit) {
  if (intro.fixAt !== null || STATUE.n.classList.contains('is-fixed')) return;
  intro.fixAt = intro.t;
  STATUE.n.classList.remove('statue__glitch');
  STATUE.n.classList.add('is-fixed');
  sfx.thunk();
  sfx.sparkle(0.12);
  const foot = nameStart(unit) + 110 * unit;
  spawnDust(foot, 1, unit, { count: 5, power: 1.1 });
  spawnDust(foot, -1, unit, { count: 5, power: 1.1 });
}

// Ends the opening: at its end he strolls off past his name to the
// campfire, leaving his bag; cut short, he drops the bag where he is, fixes
// the N anyway, the sound button and the controls go straight to their
// places, and he eases out of his pose.
function finishIntro(completed) {
  if (!intro.active) return;
  intro.active = false;
  intro.here = null;
  placeLaptop(null);
  showEditor(false);
  settleTools();
  const unit = parseFloat(getComputedStyle(figure).height) / UNITS_TALL;
  if (!completed) {
    hushSpeech();
    if (intro.last) {
      // Cut short mid-stride, he carries on from where he is actually
      // standing, with the camera easing over to him rather than jumping.
      const along = intro.last.dx * unit;
      state.x += along;
      state.introShift += along;
      intro.last.dx = 0;
      intro.release = { t: 0 };
    }
  }
  // Caught mid-turn, he finishes it at once.
  state.facing = state.flip = state.flip >= 0 ? 1 : -1;
  leaveBag((state.x - nameEnd) / unit + (BAG.rest - 70) * state.facing, !completed);
  if (intro.fixAt === null && !STATUE.n.classList.contains('is-fixed')) fixN(unit);
  intro.leave = completed;
}

// Cuts the opening short, or sends his last word off, when you set off
// yourself.
function skipIntro() {
  finishIntro(false);
  if (speechUp()) hushSpeech();
}

// Sets him off from the start once the opening is done, his last word
// staying a moment as he goes. It runs at the top of a frame, before that
// frame measures how far he has to go.
function leaveStart() {
  if (!intro.leave) return;
  intro.leave = false;
  goTo(buttons[0], { keepSpeech: true });
  state.strollUntil = nameEnd;
  hushSpeech(1700);
}

// How far to slide the camera during the opening: at first so the name's
// N and A fill the screen beside him, then looking ahead as he strolls past
// the rest of it.
function startFraming(unit) {
  if (intro.active) {
    const aRight = nameStart(unit) + (LETTERS.N[0] + LETTER_GAP + LETTERS.A[0] + 20) * unit;
    const want = sceneWidth - (sceneWidth / 2 + (aRight - state.x));
    return clamp(want, -0.36 * sceneWidth, 0.3 * sceneWidth);
  }
  if (state.x < state.strollUntil && state.destinationId === campScene) return -0.16 * sceneWidth;
  return 0;
}
// With motion reduced there is no opening: the N is whole, the bag is down
// and the sound button and the controls are in their places. living: nor
// is there for someone back again, who finds it all as they left it and
// is greeted instead (living.js, updateGreeting).
if (reducedMotion.matches || returning) {
  setN(1);
  STATUE.n.classList.remove('statue__glitch');
  settleTools();
  leaveBag(-(STATUE.width + 230) + BAG.rest - 70, false);
} else {
  setN(0);
}

// He starts beside the N, facing it.
{
  const unit = parseFloat(getComputedStyle(figure).height) / UNITS_TALL;
  state.x = state.target = nameStart(unit) - 230 * unit; // clear of the fallen N
}

let last = 0;
function frame(now) {
  const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
  last = now;
  updateInkCursor(dt);
  drawIntroSpeech(now);

  const unit = parseFloat(getComputedStyle(figure).height) / UNITS_TALL;
  const bodyHeight = unit * UNITS_TALL;
  const walkPx = (GAITS.walk.travel / WALK_CYCLE) * unit;
  const runPx = (GAITS.run.travel / RUN_CYCLE) * unit;

  // living: louder in the dark (living.js, the sounds of the day).
  sfx.fire(clamp(1 - Math.abs(state.x - (campX + 1.03 * bodyHeight)) / (0.8 * sceneWidth), 0, 1) ** 2 * fireLoudness(), dt);

  leaveStart();
  livingFrameStart(); // living: sends him anywhere living.js asked to last frame
  updateWalkingMovement();
  updateCourse(dt, unit);
  updateLine(dt, unit);
  const courseEngaged = TOWER_MODE
    ? state.experienceActive || state.courseTime > 0 || state.jump !== null
    : handcar.stage !== 'off';

  const delta = state.target - state.x;
  const away = Math.abs(delta);
  const dir = delta === 0 ? 0 : Math.sign(delta);

  // Far from the marker he runs, and closing in he drops back to a walk. The
  // two thresholds differ so he cannot flicker between gaits at the boundary.
  if (!state.sprinting && away > RUN_ABOVE * bodyHeight) state.sprinting = true;
  if (state.sprinting && away < WALK_BELOW * bodyHeight && !state.turbo) state.sprinting = false;
  if (state.turbo && away > ARRIVED) state.sprinting = true;
  const strolling = state.x < state.strollUntil;
  if (strolling && !state.turbo) state.sprinting = false;
  const turboFactor = 2.4;
  const cruise = state.sprinting
    ? (state.turbo ? runPx * turboFactor : runPx)
    : strolling
    ? STROLL * walkPx
    : walkPx;

  // Ease down into the marker instead of stopping dead on it.
  const brake = state.turbo ? 4.8 * runPx : 2.4 * walkPx;
  let wanted =
    away <= ARRIVED
      ? 0
      : Math.min(cruise, Math.sqrt(2 * brake * Math.max(0, away - ARRIVED)));

  // Leaving the bench, the camera swings back out to the side and he
  // straightens up before he turns and walks away.
  const leavingBench = (state.inspect > 0 || state.projectView > 0 || state.benchAside > 0) &&
    state.destinationId !== projectScene;
  const leavingExperience = state.jump !== null || (courseEngaged && (!TOWER_MODE || state.destinationId !== experienceScene)); // he lands before he sets off
  const leavingTerminal = (state.typeIn > 0 || state.termView > 0) && state.destinationId !== skillsScene;
  if (leavingBench || leavingExperience || leavingTerminal) wanted = 0;

  // A marker behind him means pulling up, pivoting, then setting off again.
  // Arriving at the camp he turns to face the fire before he sits, and at
  // the Projects mark he turns to face the bench.
  const faceTo = leavingBench || leavingExperience || leavingTerminal ? state.facing
    : away > ARRIVED ? dir
    : state.wantSeat ? FIRE_SIDE
    : state.destinationId === projectScene ? BENCH_SIDE
    : state.destinationId === skillsScene ? 1
    : state.destinationId === experienceScene && !TOWER_MODE ? 1 // facing down the line to board
    : ambient.face ? ambient.face // living: turning to something he is up to by himself
    : state.facing;
  const needsTurn = faceTo !== state.facing;
  if (needsTurn || state.turning > 0) wanted = 0;

  // Sitting pins him in place: he stands up before he sets off. living: so
  // does sitting down by himself (living.js, ambient.pinned).
  if (state.seat > 0 || ambient.pinned) wanted = 0;

  // He launches hard into a sprint and brakes harder still.
  const rate =
    wanted > state.speed
      ? state.sprinting ? (state.turbo ? 3.8 * runPx : 1.25 * runPx) : 2.6 * walkPx
      : Math.max(4.2 * walkPx, 1.7 * runPx);
  const before = state.speed;
  state.speed = Math.max(
    0,
    state.speed + clamp(wanted - state.speed, -rate * dt, rate * dt),
  );
  // A clamped step can consume the target before velocity has decayed. Do
  // not keep playing a running gait once the position is already settled.
  if (away <= ARRIVED && !state.hop) state.speed = 0;

  // Lean into acceleration and sit back against braking.
  const accel = dt > 0 ? (state.speed - before) / dt : 0;
  const lunge = clamp(accel / (1.25 * runPx), -1, 1);
  const tiltTo = lunge > 0 ? -8 * lunge : -13 * lunge;
  state.tilt += (tiltTo - state.tilt) * Math.min(1, dt * 8);

  // Pulling up out of a sprint scuffs dust out in front of his feet.
  const heading = state.flip >= 0 ? 1 : -1;
  const airborne = Boolean(state.hop || courseEngaged);
  if (state.turbo && state.speed > runPx * 0.9 && Math.random() < 0.38 && !airborne) {
    spawnDust(state.x - heading * 8 * unit, -heading, unit, { count: 3, power: 1.25 });
  }
  if (!state.skidding && state.speed > 0.6 * runPx && wanted < state.speed * 0.6 && !airborne) {
    state.skidding = true;
    state.nextSkidPuff = 0;
    if (now - (state.lastSkidTime || 0) > 360) {
      state.lastSkidTime = now;
      sfx.skid();
    }
  }
  if (state.skidding) {
    if (state.speed < 0.9 * walkPx || airborne) state.skidding = false;
    else if (now >= state.nextSkidPuff) {
      const isHighSpeed = state.speed > runPx;
      spawnDust(state.x + heading * 10 * unit, heading, unit, {
        count: isHighSpeed ? 8 : 5,
        power: isHighSpeed ? 1.4 : 0.9,
      });
      state.nextSkidPuff = now + (isHighSpeed ? 90 : 120);
    }
  }

  if (needsTurn && state.turning === 0 && state.speed < walkPx * 0.04) {
    state.turning = 1e-6;
    state.turnFrom = state.flip;
    state.turnTo = faceTo;
  }
  if (state.turning > 0) {
    // If player reversed input back toward original direction mid-turn:
    if (faceTo !== state.turnTo) {
      state.turnTo = faceTo;
      state.turnFrom = state.flip;
      state.turning = Math.max(1e-6, 1 - state.turning);
    }
    state.turning += dt / TURN_TIME;
    if (state.turning >= 1) {
      state.turning = 0;
      state.facing = state.turnTo;
      state.flip = state.turnTo;
    } else {
      const e = state.turning * state.turning * (3 - 2 * state.turning);
      // Passing a signed scale through zero makes the whole figure disappear
      // edge-on. Squash to a readable minimum, swap, then widen again.
      const half = e < 0.5 ? e * 2 : (1 - e) * 2;
      const fromSide = Math.sign(state.turnFrom) || state.facing;
      const fromScale = Math.max(Math.abs(state.turnFrom), TURN_MIN_SCALE);
      state.flip = e < 0.5
        ? fromSide * mix(fromScale, TURN_MIN_SCALE, half)
        : state.turnTo * mix(TURN_MIN_SCALE, 1, 1 - half);
    }
  }

  const settled =
    state.wantSeat && away <= ARRIVED && state.speed === 0 &&
    state.turning === 0 && state.facing === FIRE_SIDE;
  if (reducedMotion.matches) {
    state.seat = settled ? 1 : 0;
    state.compose = settled ? 1 : 0;
  } else {
    const framing = settled && state.seat > 0.85;
    state.compose = clamp(state.compose + (framing ? dt : -1.25 * dt) / COMPOSE_TIME, 0, 1);
    const seated = settled || state.compose > 0.35; // stay down while the camera pulls back
    state.seat = clamp(state.seat + (seated ? dt : -dt) / SIT_TIME, 0, 1);
  }
  if (settled && state.compose >= 0.4 && openPanelId !== campScene) openPanel(campScene);

  // At the bench he leans over it, holds a moment, then the camera comes
  // round behind him and slides over to leave room on the right. Leaving
  // runs it backwards: the camera slides back and returns to the side, and
  // only then does he straighten up.
  const inspecting =
    state.wantBench && state.destinationId === projectScene && away <= ARRIVED &&
    state.speed === 0 && state.turning === 0 && state.facing === BENCH_SIDE;
  if (reducedMotion.matches) {
    state.inspect = inspecting ? 1 : 0;
  } else if (inspecting) {
    state.inspect = Math.min(1, state.inspect + dt / BEND_TIME);
  } else if (state.projectView === 0) {
    state.inspect = Math.max(0, state.inspect - dt / UNBEND_TIME);
  }

  if (inspecting && state.inspect === 1) state.inspectHold += dt;
  else state.inspectHold = 0;

  const wantsProjectView = inspecting && state.inspectHold >= CAMERA_HOLD;
  if (reducedMotion.matches) {
    state.projectView = inspecting ? 1 : 0;
    state.benchAside = inspecting ? 1 : 0;
  } else {
    if (wantsProjectView) state.projectView = Math.min(1, state.projectView + dt / CAMERA_IN);
    else if (state.benchAside === 0) state.projectView = Math.max(0, state.projectView - dt / CAMERA_OUT);
    const slide = wantsProjectView && state.projectView === 1 ? dt : -1.25 * dt;
    state.benchAside = clamp(state.benchAside + slide / COMPOSE_TIME, 0, 1);
  }
  if (wantsProjectView && state.benchAside >= 0.65 && openPanelId !== projectScene) openPanel(projectScene);

  // At the Skills console he leans in to the keyboard, holds a moment, and
  // the camera comes round behind his shoulder; the terminal opens once it
  // is there. Leaving, the camera comes back before he straightens up.
  const typing =
    state.wantForge && state.destinationId === skillsScene && away <= ARRIVED &&
    state.speed === 0 && state.turning === 0 && state.facing === 1;
  if (reducedMotion.matches) {
    state.typeIn = typing ? 1 : 0;
    state.termView = typing ? 1 : 0;
  } else {
    if (typing) state.typeIn = Math.min(1, state.typeIn + dt / TYPE_TIME);
    else if (state.termView === 0) state.typeIn = Math.max(0, state.typeIn - dt / UNTYPE_TIME);
    state.typeHold = typing && state.typeIn === 1 ? state.typeHold + dt : 0;
    if (typing && state.typeHold >= TERM_HOLD) state.termView = Math.min(1, state.termView + dt / CAMERA_IN);
    else if (!typing) state.termView = Math.max(0, state.termView - dt / CAMERA_OUT);
  }
  if (typing && state.termView >= 0.94 && openPanelId !== skillsScene) openPanel(skillsScene);

  const moveHeading = needsTurn ? state.facing : (dir || state.facing);
  let step = state.speed * dt * moveHeading;
  if (!needsTurn && Math.abs(step) > away) step = delta;
  state.x = clamp(state.x + step, 0, WORLD_END);
  if ((state.x <= 0 && moveHeading < 0) || (state.x >= WORLD_END && moveHeading > 0)) {
    state.speed = 0;
  }

  if (!state.moving && state.speed > walkPx * 0.05) {
    state.moving = true;
    state.phase = 0; // set off from the stance rather than mid-stride
    if (state.sprinting && !airborne) {
      spawnDust(state.x - heading * 6 * unit, -heading, unit, { count: 7, power: 1.3 });
    }
  }
  if (state.moving && state.speed < walkPx * 0.02) state.moving = false;

  const runBlend = clamp((state.speed - walkPx) / (runPx - walkPx), 0, 1);
  const moveBlend = clamp(state.speed / (0.5 * walkPx), 0, 1);

  // Phase advances with ground covered, never with time, so the planted foot
  // keeps pace with the world at any speed and at any blend between gaits.
  const travel = mix(GAITS.walk.travel, GAITS.run.travel, runBlend);
  const lastPhase = state.phase;
  state.phase += ((Math.abs(step) / unit) / travel) * 100;

  // Each toe-off at a run kicks dust back from where the toe left the floor.
  if (!airborne) {
    if (runBlend > 0.35) {
      const { toeOff, toeOffX } = GAITS.run;
      for (const at of [toeOff, toeOff + 50]) {
        if (Math.floor((state.phase - at) / 100) > Math.floor((lastPhase - at) / 100)) {
          spawnDust(state.x + heading * toeOffX * unit, -heading, unit, {
            count: 4,
            power: 0.6 + 0.5 * runBlend,
          });
          sfx.step(state.turbo || runBlend > 0.6);
        }
      }
    } else if (state.speed > 0.15 * walkPx) {
      for (const at of [0, 50]) {
        if (Math.floor((state.phase - at) / 100) > Math.floor((lastPhase - at) / 100)) {
          sfx.step(false);
        }
      }
    }
  }

  const moved = mixPose(
    pose(GAITS.walk, state.phase),
    pose(GAITS.run, state.phase),
    runBlend,
  );
  const resting = pose(GAITS.idle, 0);
  if (!reducedMotion.matches) {
    const breath = Math.sin(now / 1250);
    resting.bob += breath * 0.7;
    resting.near.shoulder += breath * 0.6;
    resting.far.shoulder += breath * 0.6;
  }
  let final = mixPose(resting, moved, moveBlend);
  const turboLean = state.turbo && state.speed > walkPx * 0.8 ? -18 : 0;
  final.lean += (state.tilt + turboLean) * moveBlend;
  if (state.turbo && state.speed > runPx * 0.85) {
    final.bob += 3.5;
  }

  // Ground jump hop mechanic
  let hopPx = 0;
  if (state.hop && reducedMotion.matches) state.hop = null;
  if (state.hop) {
    state.hop.t += dt;
    if (state.hop.t < state.hop.duration) {
      const p = state.hop.t / state.hop.duration;
      hopPx = Math.sin(p * Math.PI) * state.hop.height * unit;
      final.near.knee += 24 * Math.sin(p * Math.PI);
      final.far.knee += 28 * Math.sin(p * Math.PI);
      final.near.ankle += 18 * Math.sin(p * Math.PI);
      final.far.ankle += 18 * Math.sin(p * Math.PI);
    } else {
      state.hop = null;
      if (!courseEngaged) {
        spawnDust(state.x, 1, unit, { count: 4, power: 0.8 });
        spawnDust(state.x, -1, unit, { count: 4, power: 0.8 });
        sfx.land();
      }
    }
  }

  // On the tower, the course sets where he is and how he moves; on the line,
  // the handcar does, and he is wherever it has taken him.
  let course = null;
  if (courseEngaged) {
    course = !TOWER_MODE ? lineAt(final)
      : state.jump ? jumpAt(state.jump, final)
      : courseAt(state.courseTime, final);
    final = course.pose;
    state.flip = course.flip;
    state.facing = course.flip >= 0 ? 1 : -1;
    if (!TOWER_MODE) {
      state.x = experienceX + course.x * unit;
      if (state.destinationId === experienceScene) state.target = state.x;
    }
  }
  if (TOWER_MODE) {
    updateRope(dt, course?.rope);
    updateSigns();
  } else {
    drawLine();
  }

  // The opening at the start, or easing out of it.
  const opening = drawStart(dt, now, final, unit);
  if (opening) final = opening.pose;
  const walkingOn = opening ? opening.dx * unit : 0; // px short of his spot, walking on

  const seatE = ease(state.seat);
  if (seatE > 0) seatPose(final, seatE, now, unit);
  const bend = state.inspect > 0 ? bendPose(final, state.inspect, now) : { back: 0, arms: 0 };

  if (state.typeIn > 0) typePose(final, state.typeIn, now);
  updateTerminal(dt);
  final = livingPose(final, dt, now, unit); // living: what he gets up to by himself (living.js)
  const pointerResponse = state.typeIn > 0 ? { pose: final, flip: state.flip } : pointerReactionPose(final, now);
  final = pointerResponse.pose;
  // Site-native entrance previews use this same rig and frame loop. The
  // optional hook supplies only a pose and screen offset; the real world,
  // camera, navbar, figure, and responsive measurements remain untouched.
  const entrancePreview = window.siteEntranceFrame?.(dt, now, final, unit) || null;
  if (entrancePreview) final = entrancePreview.pose;

  // Running in-stride action flares (Hydration Sip & Forearm Sweat Wipe)
  const isRunningGait = state.moving &&
    (runBlend > 0.35 || state.sprinting) &&
    state.speed > walkPx * 1.05 &&
    !courseEngaged &&
    !opening &&
    state.seat === 0 &&
    state.inspect === 0 &&
    state.typeIn === 0 &&
    !state.hop &&
    state.turning === 0 &&
    !pointerPlay.reaction;

  const speedFade = clamp((state.speed - walkPx * 0.4) / (walkPx * 0.4), 0, 1);
  updateRunFlares(dt, final, isRunningGait, speedFade);

  // Framing the camp slides the camera so the log and fire sit off to one
  // side, clear of the letter. Everything on screen shifts by the same amount.
  let frameShift = 0;
  if (state.compose > 0) {
    const campMiddle = sceneWidth / 2 + (campX + CAMP_CENTRE * bodyHeight - state.x);
    frameShift = (campFrameX() - campMiddle) * ease(state.compose);
  }
  const startShift = startFraming(unit);
  if (state.introShift === null || reducedMotion.matches) {
    state.introShift = startShift;
  } else {
    const follow = (startShift - state.introShift) * Math.min(1, dt * 2.2);
    const maxFollow = CAMERA_FOLLOW_MAX * dt;
    state.introShift += clamp(follow, -maxFollow, maxFollow);
  }
  frameShift += state.introShift;
  frameShift += lineFraming(dt);
  if (introSpeech && !introSpeech.hidden) {
    // Over his head, but kept on screen when the opening frames him near an
    // edge. The numbers mirror .intro-speech's width and tail offset. With
    // the editor up it sits above that, until the editor has gone.
    const half = introSpeech.offsetWidth / 2;
    const tail = 0.17 * half; // the tail sits a little right of the middle
    const middle = clamp(sceneWidth / 2 + frameShift + walkingOn - tail, half + 8, sceneWidth - half - 8);
    introSpeech.style.left = `${middle.toFixed(1)}px`;
    const overEditor = editor && !editor.hidden;
    introSpeech.style.bottom = overEditor ? `${(sceneHeight - editor.offsetTop + 12).toFixed(1)}px` : '';
  }
  const hipShift = -(SEAT_BACK * seatE + bend.back) * unit * state.facing;
  // Up the tower the camera rises with him, keeping his feet a little below
  // the middle of the screen, and follows him back down when he jumps off.
  const liftPx = course ? course.lift * unit : 0;
  const riseTo = Math.max(0, liftPx - (floorY - sceneHeight * CLIMB_VIEW));
  state.courseRise = reducedMotion.matches
    ? riseTo
    : state.courseRise + (riseTo - state.courseRise) * Math.min(1, dt * 5);
  const dropping = opening ? opening.lift * unit : 0;
  const entranceShift = entrancePreview?.shift || 0;
  const entranceLift = entrancePreview?.lift || 0;
  const displayFlip = entrancePreview?.flip || pointerResponse.flip;
  const sceneRise = state.courseRise - handcar.lift; // the line lifts the scene over a narrow screen's timetable
  applyPose(final, displayFlip, frameShift + hipShift + walkingOn + entranceShift,
    sceneRise - liftPx - dropping - hopPx - entranceLift);
  drawStartProps(final, displayFlip, unit, frameShift, walkingOn);

  // The bench draws itself whenever it is in view, and draws him too while
  // the camera is away from the side. The world's own floor and markers
  // fade as the camera lifts off them.
  const renderX = course ? experienceX + course.x * unit : state.x;
  const markX = sceneWidth / 2 + frameShift + (benchX - renderX);
  drawBench(state.projectView, state.benchAside, unit, markX, sceneRise, final,
    (state.x - benchX) / unit - bend.back, bend.arms, now, dt);
  const termMarkX = sceneWidth / 2 + frameShift + (skillsX - renderX);
  drawTerminal(state.termView, unit, termMarkX, sceneRise, final, (state.x - skillsX) / unit);
  const worldFade = 1 - ease(clamp(Math.max(state.projectView, state.termView) / 0.45, 0, 1));
  scene.style.setProperty('--project-world-opacity', worldFade.toFixed(4));
  scene.style.setProperty('--project-ground-opacity', (0.22 * worldFade).toFixed(4));

  const isTurboActive = !reducedMotion.matches && state.turbo && state.speed > runPx * 1.05;
  const rush = reducedMotion.matches ? 0 : clamp((runBlend - 0.55) / 0.45, 0, 1);
  speedLines.style.opacity = isTurboActive ? '1' : rush.toFixed(2);
  speedLines.style.transform = `translateX(calc(-50% + ${(frameShift + hipShift + walkingOn + entranceShift).toFixed(2)}px)) translateY(${(sceneRise - liftPx - dropping - hopPx - entranceLift).toFixed(2)}px) scaleX(${displayFlip.toFixed(3)})`;
  speedLines.classList.toggle('is-rushing', rush > 0 || isTurboActive);
  speedLines.classList.toggle('is-turbo', isTurboActive);
  scene.classList.toggle('is-turbo', isTurboActive);

  const worldTransform = `translate3d(${(sceneWidth / 2 - renderX + frameShift).toFixed(2)}px, ${sceneRise.toFixed(2)}px, 0)`;
  world.style.transform = worldTransform;
  livingView({ renderX, shift: frameShift, rise: sceneRise, transform: worldTransform, unit }); // living: where the camera is
  placeRunner(state.x, 1 + (isTurboActive ? 2.8 : 1.6) * runBlend * moveBlend); // a dot at rest, a dash at a sprint

  if (course) scene.dataset.experienceMode = course.mode;
  else delete scene.dataset.experienceMode;

  if (state.destinationId && state.destinationId !== 'roam' &&
      !state.announced && away <= ARRIVED && state.speed === 0 && !state.hop) {
    state.announced = true;
    scene.removeAttribute('aria-busy');
    status.textContent = `Arrived at ${state.label}`;
    state.x = state.target; // land exactly on the mark, so the camp's seat lines up
    if (state.destinationId === campScene) state.wantSeat = true; // the letter opens once he is seated
    else if (state.destinationId === projectScene) state.wantBench = true; // the sheet opens once the camera is round
    else if (state.destinationId === experienceScene) state.experienceActive = true; // he takes on the tower
    else if (state.destinationId === skillsScene) {
      state.wantForge = true;
      state.facing = state.flip = 1;
      showForgeProps();
    }
    else if (state.destinationId === 'incident') livingArrived(); // living: at something broken, to fix it
    else openPanel(state.destinationId);
  }
  scene.dataset.gait =
    entrancePreview?.gait || (intro.active && intro.here?.hands ? 'coding'
      : ambient.act?.hands ? 'coding' // living: hands shown for what he does by himself
      : state.seat > 0.5 ? 'sitting'
      : state.inspect > 0.5 ? 'inspecting'
      : course && ['board', 'pump'].includes(course.mode) ? 'pumping'
      : course && ['look', 'alight'].includes(course.mode) ? 'idle'
      : course && ['ladder', 'wall', 'dyno'].includes(course.mode) ? 'climbing'
      : course && ['rope', 'swing', 'mount'].includes(course.mode) ? 'rope-climbing'
      : course && course.mode === 'run' ? 'running'
      : course && course.mode !== 'rest' ? 'flipping'
      : moveBlend < 0.1 ? 'idle' : isTurboActive ? 'sprinting' : runBlend > 0.5 ? 'running' : 'walking');

  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------ navigation */

function goTo(button, { keepSpeech = false } = {}) {
  finishIntro(false); // set off before the opening is over
  state.strollUntil = 0;
  if (!keepSpeech) hushSpeech();

  const id = button.dataset.poi;
  if (openPanelId === id) return;
  if (openPanelId) closePanel();
  state.wantSeat = false;
  state.wantBench = false;
  state.wantForge = false;
  hideCampfireProps();
  hideForgeProps();
  campEmoteIndex = 0;
  if (id !== experienceScene) state.experienceActive = false;

  state.target = Number(button.dataset.position);
  if (id === experienceScene && !TOWER_MODE) {
    state.target = lineBoarding(parseFloat(getComputedStyle(figure).height) / UNITS_TALL);
  }
  state.label = button.textContent.trim();
  state.destinationId = id;

  buttons.forEach((item) => {
    if (item === button) item.setAttribute('aria-current', 'location');
    else item.removeAttribute('aria-current');
  });
  markers.forEach((marker) => {
    marker.classList.toggle('is-active', marker.dataset.marker === id);
  });

  if (reducedMotion.matches) {
    state.facing = state.flip = Math.sign(state.target - state.x) || state.facing;
    state.x = state.target;
    state.announced = true;
    scene.removeAttribute('aria-busy');
    status.textContent = `At ${state.label}`;
    if (id === campScene) {
      state.wantSeat = true;
      state.facing = state.flip = FIRE_SIDE;
    } else if (id === experienceScene) {
      state.experienceActive = true;
    } else if (id === projectScene) {
      state.wantBench = true;
      state.facing = state.flip = BENCH_SIDE;
    } else if (id === skillsScene) {
      state.wantForge = true;
      state.facing = state.flip = 1;
      showForgeProps();
    } else {
      openPanel(id);
    }
    return;
  }

  if (Math.abs(state.target - state.x) <= ARRIVED) {
    state.announced = true;
    status.textContent = `At ${state.label}`;
    if (id === campScene) state.wantSeat = true;
    else if (id === projectScene) state.wantBench = true;
    else if (id === experienceScene) state.experienceActive = true;
    else if (id === skillsScene) {
      state.wantForge = true;
      state.facing = state.flip = 1;
      showForgeProps();
    }
    else openPanel(id);
    return;
  }

  state.announced = false;
  scene.setAttribute('aria-busy', 'true');
  status.textContent = `Heading to ${state.label}`;
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    sfx.tick();
    goTo(button);
  });
  button.addEventListener('pointerenter', () => sfx.hover());
});

nav.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const current = buttons.indexOf(document.activeElement);
  const step = event.key === 'ArrowRight' ? 1 : -1;
  const next = (current + step + buttons.length) % buttons.length;
  buttons[next].focus();
  goTo(buttons[next]);
});

requestAnimationFrame(frame);

/* -------------------------------------------------------- projects sheet */

// The projects listed on the sheet. Their names fill the list, so this is
// the one place to change them.
const projectData = [
  {
    title: 'Project 01',
    description: 'A focused case study can live here: the problem, the approach, and what the finished work achieved.',
  },
  {
    title: 'Project 02',
    description: 'Use this space for a second build, including the decisions, iterations, and result worth highlighting.',
  },
  {
    title: 'Project 03',
    description: 'A third project can show range, experimentation, and another side of how you solve problems.',
  },
  {
    title: 'Project 04',
    description: 'A fourth project could be something smaller or stranger: a tool, an experiment, a side project.',
  },
  {
    title: 'Project 05',
    description: 'The fifth can be the most recent work, or the one that best shows where you are heading next.',
  },
];
const projectTabs = [...document.querySelectorAll('[data-project-tab]')];
const projectDetail = document.querySelector('.project-detail');
const twoDigits = (n) => String(n).padStart(2, '0');

projectTabs.forEach((tab, index) => {
  tab.querySelector('.project-list__name').textContent = projectData[index].title;
});

function selectProject(index, focus = false) {
  const item = projectData[index];
  if (!item) return;

  projectTabs.forEach((tab, tabIndex) => {
    tab.setAttribute('aria-selected', String(tabIndex === index));
    tab.tabIndex = tabIndex === index ? 0 : -1;
  });
  projectDetail.setAttribute('aria-labelledby', projectTabs[index].id);
  projectDetail.querySelector('.project-label').textContent =
    `${twoDigits(index + 1)} of ${twoDigits(projectData.length)}`;
  projectDetail.querySelector('h2').textContent = item.title;
  projectDetail.querySelector('.project-description').textContent = item.description;
  projectDetail.querySelector('a').setAttribute('aria-label', `View ${item.title}`);
  if (focus) projectTabs[index].focus();
  build.wanted = index; // he builds it on the bench while the sheet is open
}

projectTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    sfx.tick(true);
    selectProject(index);
  });
  tab.addEventListener('keydown', (event) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    selectProject((index + step + projectTabs.length) % projectTabs.length, true);
  });
});
selectProject(0);

/* ------------------------------------------------------ experience course */

const experienceScroll = document.querySelector('.experience-scroll');
const careerPath = document.querySelector('#career-path');
const climber = document.querySelector('#experience-climber');
const chapterButtons = [...document.querySelectorAll('[data-chapter]')];
const chapterDetail = document.querySelector('.chapter-detail');
const chapterCopy = [
  'Building websites and web apps since 2020, shifting focus in 2022 to creating exceptional UI/UX designs. Designing clean, custom front-end interfaces that look great for users and are easy for other developers to work with.',
  'Set up core IT infrastructure from the ground up at Pet Plus, including internal systems, code repos, and Google Workspace. Led the first automated synchronization between Lightspeed POS and Shopify so inventory and sales synced without a hitch.',
  'Built bespoke in-house software saving $5,000+ (R82,200). Rebuilt the web storefront with Cloudflare DNS, slashing LCP from 40s to ~1s. Created custom Lightspeed POS and Shopify dashboards and injected custom apps directly into Lightspeed.',
  'Continuing to push the envelope on user-first interface design, performance optimization, and custom software that bridges business needs with delightful user experiences.',
];
let activeChapter = 0;
let experienceFrame;

function setChapter(index, updateScroll = false) {
  if (index < 0 || index >= chapterButtons.length) return;
  activeChapter = index;
  chapterButtons.forEach((button, buttonIndex) => {
    if (buttonIndex === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  chapterDetail.firstElementChild.textContent = `Chapter 0${index + 1}`;
  chapterDetail.lastElementChild.textContent = chapterCopy[index];

  if (updateScroll) {
    const max = experienceScroll.scrollHeight - experienceScroll.clientHeight;
    experienceScroll.scrollTo({
      top: max * (index / (chapterButtons.length - 1)),
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  }
}

function updateExperience() {
  experienceFrame = null;
  const max = experienceScroll.scrollHeight - experienceScroll.clientHeight;
  const progress = max > 0 ? experienceScroll.scrollTop / max : 0;
  const length = careerPath.getTotalLength();
  const point = careerPath.getPointAtLength(length * progress);
  climber.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
  const chapter = Math.min(chapterButtons.length - 1, Math.round(progress * 3));
  if (chapter !== activeChapter) setChapter(chapter);
}

experienceScroll.addEventListener('scroll', () => {
  if (!experienceFrame) experienceFrame = requestAnimationFrame(updateExperience);
}, { passive: true });
chapterButtons.forEach((button, index) => {
  button.addEventListener('click', () => setChapter(index, true));
});

/* ------------------------------------------------------------ skills terminal */

/* The Skills stop is an operator's console with a huge old CRT on it. He
   steps up and puts his hands on the keyboard, the camera comes round behind
   him and over his shoulder as it does at the Projects bench, the screen
   warms up, and he types the skills out: `skills --list`, then `skills show`
   for whichever group is picked on the screen. The console is drawn in
   figure units from his mark: x ahead of him, y up, z towards the side the
   world is seen from. */
const skillData = [
  {
    slug: 'os-security',
    title: 'Operating Systems & Security',
    description: 'Running and hardening Windows Server estates, and guarding the edge with web application firewalls, certificates, firewalls, VPNs and intrusion detection.',
    tags: ['Windows Server', 'Windows', 'WAF', 'SSL / PKI', 'Gate firewalls', 'VPNs', 'IDS / IPS', 'Load balancing'],
  },
  {
    slug: 'net-auth',
    title: 'Networking & Authentication',
    description: 'Who gets in, and how: single sign-on, directory services and network authentication, down to the packets, with APIs tested for holes before anyone else finds them.',
    tags: ['SAML', 'OAuth', 'LDAP', 'RADIUS', 'TCP/IP', 'API security testing'],
  },
  {
    slug: 'cloud-monitoring',
    title: 'Cloud & Monitoring',
    description: 'Infrastructure as code on Azure, containers, pipelines with security built in, recovery plans that work, and the dashboards that show what is healthy.',
    tags: ['Azure', 'Kubernetes / Docker', 'CI/CD (security-integrated)', 'Terraform', 'Disaster recovery', 'ELK', 'SQL'],
  },
  {
    slug: 'collab-tools',
    title: 'Collaboration & Tools',
    description: 'Keeping the work visible and the team moving: version control, tickets and docs, and running Microsoft 365 for the whole company.',
    tags: ['Git / GitHub', 'Jira', 'Confluence', 'Microsoft 365 admin', 'Asana', 'MS Project'],
  },
  {
    slug: 'scripting',
    title: 'Programming & Scripting',
    description: 'Automating the repetitive and the risky: provisioning, patching and reporting scripts, and the odd tool when nothing off the shelf fits.',
    tags: ['Python', 'PowerShell', 'Bash', 'C#', 'SQL', 'Java'],
  },
];

const TYPE_LEAN = 14; // degrees he leans in to type
const TYPE_TIME = 0.8; // seconds to lean in and put his hands on the keys
const UNTYPE_TIME = 0.5; // and to straighten up again
const TERM_HOLD = 0.25; // seconds at the keys before the camera moves
const TERM_YAW = 104; // degrees round: behind him and over his left shoulder
const TERM_PITCH = 5; // degrees it looks down
const TERM_DISTANCE = 190; // units from the screen once round
const TYPE_RATE = 24; // characters a second

// The keyboard's top, and the CRT's glass, which the terminal is drawn on.
// The monitor is so big he stands at its right-hand end, so from behind his
// head sits by the glass's right edge rather than in front of the text.
const KEYS = [45, 112];
const MZ = -80; // how far left of him the middle of the monitor is
const GLASS = { x: 61.6, y0: 146, y1: 300, z0: MZ - 104, z1: MZ + 104 };
const TERM_PIVOT = [GLASS.x, (GLASS.y0 + GLASS.y1) / 2, MZ];
// Its corners as seen from behind him: top left, top right, bottom right,
// bottom left.
const GLASS_CORNERS = [
  [GLASS.x, GLASS.y1, GLASS.z0], [GLASS.x, GLASS.y1, GLASS.z1],
  [GLASS.x, GLASS.y0, GLASS.z1], [GLASS.x, GLASS.y0, GLASS.z0],
];

const termCam = document.querySelector('.term-cam');
const termLayer = termCam.querySelector('.term-cam__model');
const termFigureSvg = document.querySelector('.term-figure');
const termFigure = termFigureSvg.querySelector('.bench-cam__figure');
const termRig = {
  group: termFigure,
  parts: Object.fromEntries([...termFigure.querySelectorAll('[data-part]')].map((el) => [el.dataset.part, el])),
  fade: termFigure.querySelector('linearGradient'),
  order: '',
};

/* The console, as pieces like the bench's: each a filled body with lines on
   it, drawn in layers and, inside a layer, farthest first. */
const TERM_MODEL = (() => {
  const pieces = [];
  const nothing = { body: '', lines: '' };
  const piece = (layer, draw, pts, body = '', lines = '') => pieces.push({ layer, draw, anchor: mean(pts), body, lines });
  const visible = (camera, faces) => faces.filter((face) => camera.sees(face.normal, face.pts[0]))
    .map((face) => `${polyline(camera, face.pts)}Z`).join('');
  const solid = (layer, faces, body = '', details = [], lines = '') => piece(layer, (camera) => {
    let marks = '';
    for (const [face, list] of details) if (camera.sees(face.normal, face.pts[0])) marks += segments(camera, list);
    return { body: visible(camera, faces), lines: marks };
  }, faces.flatMap((face) => face.pts), body, lines);
  // Something flat on a face: shown while that face is turned to the camera.
  const decal = (layer, normal, pts, body, lines = []) => piece(layer, (camera) => (camera.sees(normal, pts[0])
    ? { body: `${polyline(camera, pts)}Z`, lines: segments(camera, lines) }
    : nothing), pts, body);
  // A solid tapering from one rectangle to another, like a CRT's back.
  const frustum = (front, back) => {
    const middle = mean([...front, ...back]);
    const faces = [front, back];
    for (let i = 0; i < 4; i += 1) faces.push([front[i], front[(i + 1) % 4], back[(i + 1) % 4], back[i]]);
    return faces.map((pts) => {
      let normal = normalise(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
      if (dot(normal, sub(mean(pts), middle)) < 0) normal = times(normal, -1);
      return { normal, pts };
    });
  };
  const rect = (x, y0, y1, z0, z1) => [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]];

  // The console: a cabinet with panels on its side, and a top.
  const cabinet = box(30, 196, 0, 100, -210, 126);
  const side = faceTowards(cabinet, [0, 0, 1]);
  const front = faceTowards(cabinet, [-1, 0, 0]);
  solid(1, cabinet, 'term-cam__beige', [
    [side, [
      [[44, 14, 126], [182, 14, 126], [182, 86, 126], [44, 86, 126], [44, 14, 126]],
      ...[30, 38, 46].map((y) => [[140, y, 126], [172, y, 126]]),
      [[58, 64, 126], [64, 64, 126]],
    ]],
    [front, [
      [[30, 14, -194], [30, 14, 110]],
      [[30, 86, -194], [30, 86, 110]],
      ...[-120, -80, -40].map((z) => [[30, 24, z - 12], [30, 24, z + 12]]),
    ]],
  ]);
  solid(2, box(24, 202, 100, 108, -216, 132), 'term-cam__beige');

  // A server tower beside it, lights blinking.
  const tower = box(214, 268, 0, 236, -44, 44);
  solid(1, tower, 'term-cam__dark', [
    [faceTowards(tower, [0, 0, 1]), [70, 100, 130, 160].map((y) => [[222, y, 44], [260, y, 44]])],
    [faceTowards(tower, [-1, 0, 0]), [70, 100, 130, 160].map((y) => [[214, y, -34], [214, y, 34]])],
  ], 'term-cam__lines--light');
  for (let i = 0; i < 6; i += 1) {
    const y = 214 - (i % 3) * 8;
    const u = 224 + Math.floor(i / 3) * 10;
    decal(3, [0, 0, 1], [[u, y, 44.2], [u + 5, y, 44.2], [u + 5, y + 3, 44.2], [u, y + 3, 44.2]], `term-cam__led term-cam__led--${i}`);
    const z = -26 + Math.floor(i / 3) * 12;
    decal(3, [-1, 0, 0], [[213.8, y, z], [213.8, y, z + 5], [213.8, y + 3, z + 5], [213.8, y + 3, z]], `term-cam__led term-cam__led--${i}`);
  }

  // Cables from the monitor's back, down behind the console and across to
  // the tower.
  const cable = (pts) => piece(2, (camera) => ({ body: '', lines: polyline(camera, pts) }), pts, '', 'term-cam__cable');
  cable([[196, 200, MZ - 20], [205, 180, MZ - 24], [206, 130, MZ - 30], [204, 108, MZ - 36]]);
  cable([[196, 214, MZ + 10], [208, 200, -20], [214, 190, -10]]);

  // The monitor: a stand, the tapering back of the tube, and the bezel,
  // with the glass, a power light, two knobs and a note stuck on.
  solid(2, box(96, 150, 108, 130, MZ - 56, MZ + 56), 'term-cam__beige');
  const housing = frustum(rect(76, 132, 314, MZ - 118, MZ + 118), rect(198, 176, 276, MZ - 64, MZ + 64));
  piece(3, (camera) => ({ body: visible(camera, housing), lines: '' }), housing.flatMap((f) => f.pts), 'term-cam__beige-dark');
  const bezel = box(62, 76, 128, 318, MZ - 124, MZ + 124);
  const face = faceTowards(bezel, [-1, 0, 0]);
  solid(4, bezel, 'term-cam__beige', [
    [face, [
      [[62, 140, MZ - 110], [62, 306, MZ - 110], [62, 306, MZ + 110], [62, 140, MZ + 110], [62, 140, MZ - 110]],
      [[62, 134, MZ - 112], [62, 134, MZ - 84]],
    ]],
    [faceTowards(bezel, [0, 0, 1]), [[[64, 300, MZ + 124], [74, 300, MZ + 124]], [[64, 150, MZ + 124], [74, 150, MZ + 124]]]],
  ]);
  decal(5, [-1, 0, 0], GLASS_CORNERS, 'term-cam__glass', [
    [[GLASS.x, GLASS.y1 - 12, GLASS.z0 + 10], [GLASS.x, GLASS.y1 - 12, GLASS.z0 + 70]],
    [[GLASS.x, GLASS.y1 - 22, GLASS.z0 + 10], [GLASS.x, GLASS.y1 - 22, GLASS.z0 + 46]],
  ]);
  decal(5, [-1, 0, 0], [[61.8, 133, MZ + 100], [61.8, 136, MZ + 100], [61.8, 136, MZ + 106], [61.8, 133, MZ + 106]], 'term-cam__power');
  for (const z of [MZ + 80, MZ + 90]) {
    const knob = ring([61.8, 135, z], [-1, 0, 0], 3, 12);
    piece(5, (camera) => (camera.sees([-1, 0, 0], knob[0]) ? { body: `${polyline(camera, knob)}Z`, lines: '' } : nothing), knob, 'term-cam__dark');
  }

  // The keyboard, with its rows of keys, and a mug by it.
  const keyboard = box(33, 59, 108, KEYS[1], -40, 40);
  const keyRows = [];
  for (let row = 0; row < 5; row += 1) {
    const x = 36 + row * 4.8;
    for (let z = -37; z < 36; z += 6.2) keyRows.push([[x, KEYS[1] + 0.1, z], [x, KEYS[1] + 0.1, z + 4.4]]);
  }
  solid(6, keyboard, 'term-cam__beige', [[faceTowards(keyboard, [0, 1, 0]), keyRows]], 'term-cam__keys');
  const mugBottom = ring([46, 108, -150], [0, 1, 0], 6.5, 16);
  const mugRim = ring([46, 120, -150], [0, 1, 0], 6.5, 16);
  piece(6, (camera) => ({
    body: outline(camera, [...mugBottom, ...mugRim]) + (camera.sees([0, 1, 0], mugRim[0]) ? `${polyline(camera, mugRim)}Z` : ''),
    lines: segments(camera, [[[46, 117, -143.5], [46, 117, -139.5], [46, 111, -139.5], [46, 111, -143.5]]]),
  }), [...mugBottom, ...mugRim], 'term-cam__mug', 'bench-cam__lines--ink');

  const svg = (tag) => document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [index, item] of pieces.entries()) {
    item.index = index;
    item.el = svg('g');
    item.bodyEl = svg('path');
    item.linesEl = svg('path');
    item.bodyEl.setAttribute('class', `bench-cam__body ${item.body}`.trim());
    item.linesEl.setAttribute('class', `bench-cam__lines ${item.lines}`.trim());
    item.el.append(item.bodyEl, item.linesEl);
    termLayer.append(item.el);
  }
  return pieces;
})();

let termOrder = '';
function drawTermModel(camera) {
  const depth = new Map();
  for (const item of TERM_MODEL) {
    const { body, lines } = item.draw(camera);
    item.bodyEl.setAttribute('d', body);
    item.linesEl.setAttribute('d', lines);
    depth.set(item, camera.project(item.anchor).depth);
  }
  const order = [...TERM_MODEL].sort((a, b) => a.layer - b.layer || depth.get(b) - depth.get(a));
  const key = order.map((item) => item.index).join();
  if (key !== termOrder) {
    termOrder = key;
    for (const item of order) termLayer.append(item.el);
  }
}

// The camera once round: the glass filling most of the screen, a little
// left of middle so his head and shoulder sit to its right.
function termShot() {
  const probe = orbitCamera({
    yaw: TERM_YAW, pitch: TERM_PITCH, invDistance: 1 / TERM_DISTANCE, scale: 1, x: 0, y: 0, pivot: TERM_PIVOT,
  });
  const pts = GLASS_CORNERS.map((p) => probe.project(p));
  const minX = Math.min(...pts.map((q) => q.x));
  const maxX = Math.max(...pts.map((q) => q.x));
  const minY = Math.min(...pts.map((q) => q.y));
  const maxY = Math.max(...pts.map((q) => q.y));
  const narrow = narrowScreen.matches;
  const room = sceneHeight - navHeight;
  const scale = Math.min(
    ((narrow ? 0.94 : 0.64) * sceneWidth) / (maxX - minX),
    ((narrow ? 0.62 : 0.8) * room) / (maxY - minY),
  );
  const middleX = narrow ? sceneWidth / 2 : sceneWidth * 0.44;
  const middleY = navHeight + room * (narrow ? 0.4 : 0.5);
  return {
    scale,
    x: middleX - (scale * (minX + maxX)) / 2,
    y: middleY - (scale * (minY + maxY)) / 2,
  };
}

// His pose at the keys, t = 0..1: he leans in and his hands go down onto the
// keyboard in a low arc, his feet where he stopped; while he types, his
// hands pat the keys in turn.
function typePose(p, t, now) {
  const body = ease(clamp(t / 0.7, 0, 1));
  const arms = ease(clamp((t - 0.15) / 0.85, 0, 1));
  const breath = reducedMotion.matches ? 0 : Math.sin(now / 1400);
  p.bob = mix(p.bob, 0.5 + breath * 0.4, body);
  p.lean = mix(p.lean, TYPE_LEAN + breath * 0.5, body);
  Object.assign(p.near, reach(p.bob, 76, 242));
  Object.assign(p.far, reach(p.bob, 64, 242));
  const lift = 12 * Math.sin(Math.PI * arms);
  const tapping = term.typing && !reducedMotion.matches ? 1 : 0;
  for (const [which, dx, phase] of [['near', -3, 0], ['far', 5, Math.PI]]) {
    const arm = p[which];
    const [fromX, fromY] = handAt(p.lean, arm.shoulder, arm.elbow);
    const tap = 3.5 * tapping * Math.max(0, Math.sin(now / 1000 * 2 * Math.PI * 5.5 + phase));
    Object.assign(arm, armReach(p.lean,
      mix(fromX, 70 + KEYS[0] + dx, arms),
      mix(fromY, 242 - KEYS[1] - 1.5 - p.bob, arms) - lift - tap));
  }
}

// Draws the console, and him with it once the camera is moving. `u` is how
// far round the camera has come, `markX` the mark's x on screen and `standX`
// where he stands, in units from it.
function drawTerminal(u, unit, markX, rise, figurePose, standX) {
  const onScreen = markX + 30 * unit > -40 && markX - 60 * unit < sceneWidth + 280 * unit;
  const show = u > 0 || onScreen;
  const drawHim = u > 0;
  termCam.toggleAttribute('hidden', !show);
  termFigureSvg.toggleAttribute('hidden', !drawHim);
  if (drawHim) figure.style.visibility = 'hidden';
  if (!show) return;

  const e = smoother(u);
  const flat = { x: markX + TERM_PIVOT[0] * unit, y: floorY + 1 + rise - TERM_PIVOT[1] * unit };
  let camera;
  if (e === 0) {
    camera = orbitCamera({ yaw: 0, pitch: 0, invDistance: 0, scale: unit, ...flat, pivot: TERM_PIVOT });
  } else {
    const shot = termShot();
    camera = orbitCamera({
      yaw: TERM_YAW * e,
      pitch: TERM_PITCH * e,
      invDistance: e / TERM_DISTANCE,
      scale: unit * (shot.scale / unit) ** e,
      x: mix(flat.x, shot.x, e),
      y: mix(flat.y, shot.y, e),
      pivot: TERM_PIVOT,
    });
  }
  termLayer.style.setProperty('--zoom', (1 + 0.5 * e).toFixed(3));
  drawTermModel(camera);
  termCam.classList.toggle('is-on', term.power);
  if (drawHim) drawFigure(camera, figureJoints(figurePose, standX, 0), e, termRig);
  placeTermScreen(camera);
  livingTermNote(camera); // living: the sticky note of commands, on the bezel
}

/* ---------------------------------------------------- the terminal itself */

const termPanel = document.querySelector('.term-panel');
const termScreen = document.querySelector('.term-screen');
const termBoot = [...termScreen.querySelectorAll('[data-boot]')];
const termListLine = termScreen.querySelector('.term-line--list');
const termShowLine = termScreen.querySelector('.term-line--show');
const termHint = termScreen.querySelector('.term-line--hint');
const skillTabs = [...termScreen.querySelectorAll('[data-skill-tab]')];
const skillDetail = termScreen.querySelector('.term-out');
const term = {
  power: false, // the screen is lit
  booted: false,
  typing: false, // he is typing a command, so his hands pat the keys
  ops: [],
  selected: 0,
  shown: null,
  size: null,
};

// The screen sits on the glass: sized to about the glass's size once the
// camera is round, so the text is drawn near its own size, then mapped
// onto the glass's corners wherever the camera is.
function placeTermScreen(camera) {
  if (termPanel.hidden) return;
  if (!term.size) {
    const shot = termShot();
    const final = orbitCamera({
      yaw: TERM_YAW, pitch: TERM_PITCH, invDistance: 1 / TERM_DISTANCE, scale: shot.scale, x: shot.x, y: shot.y, pivot: TERM_PIVOT,
    });
    const [a, b, c, d] = GLASS_CORNERS.map((p) => final.project(p));
    const w = Math.round((Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - d.x, c.y - d.y)) / 2);
    const h = Math.round((Math.hypot(d.x - a.x, d.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y)) / 2);
    term.size = [w, h];
    termScreen.style.width = `${w}px`;
    termScreen.style.height = `${h}px`;
    termScreen.style.fontSize = `${clamp(w / (narrowScreen.matches ? 32 : 46), 10, 21).toFixed(2)}px`;
  }
  const [w, h] = term.size;
  const [p0, p1, p2, p3] = GLASS_CORNERS.map((p) => camera.project(p));
  termScreen.style.transform = quadMatrix(w, h, p0, p1, p2, p3);
}

// A CSS matrix3d taking a w by h box onto four corners on screen: top left,
// top right, bottom right, bottom left.
function quadMatrix(w, h, p0, p1, p2, p3) {
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const det = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / det;
  const k = (dx1 * sy - sx * dy1) / det;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + k * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + k * p3.y;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, p0.x, p0.y, 0, 1];
  return `matrix3d(${m.map((v) => v.toFixed(6)).join(',')})`;
}

// Queues things for the terminal to do in turn: wait, type into an element,
// or run something at once.
const termWait = (s) => term.ops.push({ kind: 'wait', left: s });
const termType = (el, text) => term.ops.push({ kind: 'type', el, text, done: 0, acc: 0 });
const termRun = (fn) => term.ops.push({ kind: 'run', fn });

function bootTerminal() {
  term.ops = [];
  term.booted = false;
  term.power = true;
  termScreen.classList.remove('is-off');
  termScreen.classList.add('is-booting');
  termBoot.forEach((el) => el.classList.remove('is-shown'));
  termListLine.classList.remove('is-shown');
  termListLine.querySelector('.term-typed').textContent = '';
  skillTabs.forEach((tab) => tab.classList.remove('is-shown'));
  termHint.classList.remove('is-shown');
  termShowLine.classList.remove('is-shown');
  skillDetail.classList.remove('is-shown');
  livingTermReset(); // living: the visitor's prompt goes too, until it is up
  sfx.crt?.();
  termWait(0.55);
  termRun(() => termScreen.classList.remove('is-booting'));
  termBoot.forEach((el) => {
    termRun(() => el.classList.add('is-shown'));
    termWait(0.14);
  });
  termWait(0.25);
  termRun(() => termListLine.classList.add('is-shown'));
  termWait(0.2);
  termType(termListLine.querySelector('.term-typed'), 'skills --list');
  termWait(0.18);
  skillTabs.forEach((tab) => {
    termRun(() => tab.classList.add('is-shown'));
    termWait(0.07);
  });
  termRun(() => termHint.classList.add('is-shown'));
  termRun(() => {
    term.booted = true;
    showSkill(term.selected);
    livingTermReady(); // living: and a prompt for the visitor to type at
  });
}

// Types `skills show` for a group and prints what it knows.
function showSkill(index) {
  const skill = skillData[index];
  term.shown = index;
  term.ops = term.ops.filter((op) => !op.show); // a new command replaces one half typed
  const typed = termShowLine.querySelector('.term-typed');
  const title = skillDetail.querySelector('.term-title');
  const description = skillDetail.querySelector('.term-description');
  const tags = skillDetail.querySelector('.term-tags');
  const start = term.ops.length;
  termRun(() => {
    livingTermSkill(); // living: clears what the visitor ran, so this is the latest
    typed.textContent = '';
    termShowLine.classList.add('is-shown');
    skillDetail.classList.remove('is-shown');
    title.classList.remove('is-shown');
    description.classList.remove('is-shown');
    title.textContent = skill.title;
    description.textContent = skill.description;
    tags.innerHTML = skill.tags.map((tag) => `<li>${tag}</li>`).join('');
  });
  termWait(0.15);
  termType(typed, `skills show ${skill.slug}`);
  termWait(0.16);
  termRun(() => {
    skillDetail.classList.add('is-shown');
    title.classList.add('is-shown');
  });
  termWait(0.1);
  termRun(() => description.classList.add('is-shown'));
  termWait(0.12);
  skill.tags.forEach((tag, i) => {
    termRun(() => tags.children[i]?.classList.add('is-shown'));
    termWait(0.05);
  });
  term.ops.slice(start).forEach((op) => { op.show = true; });
}

// Runs the queue for `dt` seconds: waits and types take their time, the
// rest happens at once. Reduced motion runs it all straight through.
function runTerminal(dt) {
  let budget = reducedMotion.matches ? Infinity : dt;
  while (term.ops.length && budget > 0) {
    const op = term.ops[0];
    if (op.kind === 'wait') {
      const use = Math.min(budget, op.left);
      op.left -= use;
      budget -= use;
      if (op.left <= 1e-6) term.ops.shift();
    } else if (op.kind === 'type') {
      op.acc += budget === Infinity ? op.text.length : budget * TYPE_RATE;
      budget = 0;
      const n = Math.min(op.text.length, Math.floor(op.acc));
      if (n > op.done) {
        op.el.textContent = op.text.slice(0, n);
        if (!reducedMotion.matches) sfx.key?.();
        op.done = n;
      }
      if (n >= op.text.length) term.ops.shift();
    } else {
      term.ops.shift();
      op.fn();
    }
  }
  // living: his hands also pat the keys while the visitor types (living.js).
  term.typing = term.ops[0]?.kind === 'type' || performance.now() < livingTyping.until;
}

// Picks a group on the screen; he types it out.
function selectSkill(index, focus = false) {
  if (!skillData[index]) return;
  term.selected = index;
  skillTabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
  });
  skillDetail.setAttribute('aria-labelledby', skillTabs[index].id);
  if (focus) skillTabs[index].focus();
  if (term.booted && term.shown !== index) showSkill(index);
}

skillTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    sfx.tick(true);
    selectSkill(index);
  });
  tab.addEventListener('keydown', (event) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    selectSkill((index + step + skillTabs.length) % skillTabs.length, true);
  });
});

// Boots when the screen opens, runs while it is open, and goes dark after.
let termWasOpen = false;
function updateTerminal(dt) {
  const open = openPanelId === skillsScene;
  if (open && !termWasOpen) {
    term.size = null;
    bootTerminal();
  }
  if (!open && termWasOpen) {
    term.ops = [];
    term.typing = false;
    term.booted = false;
    term.shown = null;
    term.power = false;
    livingTermClosed(); // living: the prompt goes, and whatever the visitor ran
  }
  termWasOpen = open;
  if (open) runTerminal(dt);
}
window.addEventListener('resize', () => { term.size = null; });

// A soft click for each key, and the thump and whine of the tube warming.
SoundEngine.prototype.key = function key() {
  if (!this.enabled || !this.ctx) return;
  const now = this.ctx.currentTime;
  if (now - (this.lastKey || 0) < 0.03) return;
  this.lastKey = now;
  const length = Math.floor(this.ctx.sampleRate * 0.02);
  const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const source = this.ctx.createBufferSource();
  source.buffer = buffer;
  const filter = this.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2200 + Math.random() * 900, now);
  const gain = this.ctx.createGain();
  gain.gain.setValueAtTime(0.35, now);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(this.masterGain);
  source.start(now);
};
SoundEngine.prototype.crt = function crt() {
  if (!this.enabled || !this.ctx) return;
  const now = this.ctx.currentTime;
  const thump = this.ctx.createOscillator();
  const thumpGain = this.ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(90, now);
  thump.frequency.exponentialRampToValueAtTime(40, now + 0.25);
  thumpGain.gain.setValueAtTime(0.5, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  thump.connect(thumpGain);
  thumpGain.connect(this.masterGain);
  thump.start(now);
  thump.stop(now + 0.3);
  const whine = this.ctx.createOscillator();
  const whineGain = this.ctx.createGain();
  whine.type = 'sine';
  whine.frequency.setValueAtTime(15000, now);
  whineGain.gain.setValueAtTime(0.0001, now);
  whineGain.gain.exponentialRampToValueAtTime(0.02, now + 0.2);
  whineGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  whine.connect(whineGain);
  whineGain.connect(this.masterGain);
  whine.start(now);
  whine.stop(now + 1.2);
};

// The rest of the page still calls these from when this stop was a forge.
function showForgeProps() {}
function hideForgeProps() {}

selectSkill(0);

/* ------------------------------------------------------------- sprint controls */

/* ------------------------------------------------------------- walking & sprint controls */

const sprintHintEl = document.querySelector('.sprint-hint');
const hintKbdMap = {
  left: sprintHintEl?.querySelector('kbd[data-key="left"]'),
  right: sprintHintEl?.querySelector('kbd[data-key="right"]'),
  sprint: sprintHintEl?.querySelector('kbd[data-key="sprint"]'),
  jump: sprintHintEl?.querySelector('kbd[data-key="jump"]'),
};

const inputKeys = {
  left: false,
  right: false,
  sprint: false,
};

function updateHintKeys() {
  if (hintKbdMap.left) hintKbdMap.left.classList.toggle('is-pressed', inputKeys.left);
  if (hintKbdMap.right) hintKbdMap.right.classList.toggle('is-pressed', inputKeys.right);
  if (hintKbdMap.sprint) hintKbdMap.sprint.classList.toggle('is-pressed', inputKeys.sprint);
}

function beginManualTravel() {
  if (openPanelId) {
    const focusWasInPanel = panels.some((panel) => panel.contains(document.activeElement));
    continueJourney(false);
    if (focusWasInPanel) document.activeElement?.blur();
  }
  state.wantSeat = false;
  state.wantBench = false;
  state.wantForge = false;
  state.experienceActive = false;
  hideCampfireProps();
  hideForgeProps();
  state.destinationId = 'roam';
  state.announced = false;
  scene.removeAttribute('aria-busy');
  status.textContent = 'Exploring';
  buttons.forEach((button) => button.removeAttribute('aria-current'));
  markers.forEach((marker) => marker.classList.remove('is-active'));
}

function stopManualTravel() {
  if (state.destinationId !== 'roam') return;
  const unit = parseFloat(getComputedStyle(figure).height) / UNITS_TALL;
  const walkPx = (GAITS.walk.travel / WALK_CYCLE) * unit;
  const runPx = (GAITS.run.travel / RUN_CYCLE) * unit;
  const deceleration = Math.max(4.2 * walkPx, 1.7 * runPx);
  const rawDir = Math.sign(state.target - state.x);
  const isOpposite = rawDir !== 0 && rawDir !== state.facing;
  const heading = isOpposite ? state.facing : (rawDir || state.facing);
  const stoppingDistance = Math.max(
    state.speed * 0.2,
    (state.speed ** 2) / (2 * deceleration) + ARRIVED,
  );
  state.target = clamp(state.x + heading * stoppingDistance, 0, WORLD_END);
  state.destinationId = null;
  state.announced = true;
  state.turbo = false;
}

function updateWalkingMovement() {
  if (inputKeys.left || inputKeys.right) {
    skipIntro();
    const dir = (inputKeys.right ? 1 : 0) - (inputKeys.left ? 1 : 0);
    if (dir === 0) {
      stopManualTravel();
      return;
    }

    if (state.destinationId !== 'roam') beginManualTravel();
    state.turbo = inputKeys.sprint;
    state.sprinting = inputKeys.sprint;
    state.target = clamp(state.x + dir * (state.turbo ? 450 : 180), 0, WORLD_END);
  } else if (state.destinationId === 'roam') {
    if (inputKeys.sprint) {
      state.turbo = true;
      state.sprinting = true;
      const heading = state.flip >= 0 ? 1 : -1;
      state.target = clamp(state.x + heading * 450, 0, WORLD_END);
    } else {
      stopManualTravel();
    }
  }
}

function triggerJump() {
  const isTowerActive = TOWER_MODE && (state.experienceActive || state.courseTime > 0 || state.jump !== null);
  if (state.hop || state.jump || state.seat > 0 || state.inspect > 0 || state.typeIn > 0 || isTowerActive || handcar.stage !== 'off' || openPanelId !== null) return;
  sfx.ensureReady();
  skipIntro();
  if (state.wantForge) {
    state.wantForge = false;
    hideForgeProps();
  }
  if (!reducedMotion.matches) {
    state.hop = { t: 0, duration: 0.44, height: 46 };
    sfx.jump();
  }

  if (hintKbdMap.jump) {
    hintKbdMap.jump.classList.add('is-pressed');
    setTimeout(() => hintKbdMap.jump?.classList.remove('is-pressed'), 240);
  }
}

function setTurboState(active) {
  if (active && !inputKeys.sprint) sfx.whoosh(0.4);
  inputKeys.sprint = active;
  state.turbo = active;
  updateHintKeys();

  if (active) {
    sfx.ensureReady();
    skipIntro();
    if (state.destinationId !== 'roam') beginManualTravel();

    state.sprinting = true;
    const heading = (inputKeys.right ? 1 : 0) - (inputKeys.left ? 1 : 0) || (state.flip >= 0 ? 1 : -1);
    state.target = clamp(state.x + heading * 450, 0, WORLD_END);
  } else {
    if (!inputKeys.left && !inputKeys.right) stopManualTravel();
  }
}

window.addEventListener('keydown', (event) => {
  // living: with the terminal up, letters type at its prompt rather than
  // walk him off (living.js); the arrow keys still do.
  if (livingTermKey(event)) return;
  const interactive = event.target.closest?.(
    'button, a, input, textarea, select, summary, [contenteditable], [role="button"], [role="tab"]',
  );
  if (event.defaultPrevented || interactive) return;

  sfx.ensureReady();

  if (['KeyA', 'ArrowLeft'].includes(event.code)) {
    inputKeys.left = true;
    updateWalkingMovement();
    updateHintKeys();
  } else if (['KeyD', 'ArrowRight'].includes(event.code)) {
    inputKeys.right = true;
    updateWalkingMovement();
    updateHintKeys();
  } else if (event.code === 'Space') {
    event.preventDefault();
    setTurboState(true);
    updateWalkingMovement();
  } else if (['KeyW', 'ArrowUp'].includes(event.code)) {
    event.preventDefault();
    triggerJump();
  }
});

window.addEventListener('keyup', (event) => {
  if (['KeyA', 'ArrowLeft'].includes(event.code)) {
    inputKeys.left = false;
    updateWalkingMovement();
    updateHintKeys();
  } else if (['KeyD', 'ArrowRight'].includes(event.code)) {
    inputKeys.right = false;
    updateWalkingMovement();
    updateHintKeys();
  } else if (event.code === 'Space') {
    setTurboState(false);
    updateWalkingMovement();
  }
});

window.addEventListener('blur', () => {
  inputKeys.left = false;
  inputKeys.right = false;
  setTurboState(false);
  updateWalkingMovement();
  updateHintKeys();
});

// Mobile / touch screen drag locomotion
let touchDragStartX = null;
let touchDragActive = false;

window.addEventListener('touchstart', (event) => {
  // living: nor from the terminal's glass, where a tap is for typing.
  if (event.touches.length === 1 && !event.target.closest('button, a, nav, article, input, .term-screen')) {
    touchDragStartX = event.touches[0].clientX;
    touchDragActive = true;
    sfx.ensureReady();
  }
}, { passive: true });

window.addEventListener('touchmove', (event) => {
  if (!touchDragActive || touchDragStartX === null || event.touches.length !== 1) return;
  const currentX = event.touches[0].clientX;
  let diff = currentX - touchDragStartX;
  const maxDrag = 42;
  if (diff > maxDrag) {
    touchDragStartX = currentX - maxDrag;
    diff = maxDrag;
  } else if (diff < -maxDrag) {
    touchDragStartX = currentX + maxDrag;
    diff = -maxDrag;
  }
  if (Math.abs(diff) > 12) {
    inputKeys.left = diff < 0;
    inputKeys.right = diff > 0;
    updateWalkingMovement();
    updateHintKeys();
  } else if (inputKeys.left || inputKeys.right) {
    inputKeys.left = false;
    inputKeys.right = false;
    updateWalkingMovement();
    updateHintKeys();
  }
}, { passive: true });

function endTouchDrag() {
  if (touchDragActive) {
    touchDragActive = false;
    touchDragStartX = null;
    inputKeys.left = false;
    inputKeys.right = false;
    updateWalkingMovement();
    updateHintKeys();
  }
}

window.addEventListener('touchend', endTouchDrag, { passive: true });
window.addEventListener('touchcancel', endTouchDrag, { passive: true });

// living: the living world starts once everything above is in place.
startLiving();



