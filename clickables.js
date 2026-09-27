/* ======================================================================
   Things to click. Ten things in the world answer a click (a tap on a
   phone): the letters of his name ring, the street lamps switch, the fire
   flares, the axe has him chopping, the tent snores, the fingerposts send
   him off, the tools come down off the pegboard, the clock turns the day
   on, the servers ripple and, at night, the stars shoot. Each answers at
   once. He joins in only while he is free (isFree), walking over first if
   it needs him there, the way he goes to fix things (the incidents in
   living.js). Clicked too much, some break or come loose, and he puts them
   right.

   What they have found is remembered (memory.data.found), counted on the
   ops board (FOUND 3/10) and listed by `found` in the terminal. The sounds
   are in SOUND_FILES (script.js; SOUNDS-clickables.md is where they came
   from); each falls back to one made from sfx's own parts.

   Loaded after living.js and teleports.js, before script.js: like them, it
   only uses script.js's globals inside functions called later. Its top
   level names all start with click, to keep clear of the other files'.
   ====================================================================== */

// The ten, in the order he passes them, as the terminal names them.
const CLICK_THINGS = {
  name: 'the letters of his name',
  lamp: 'the street lamps',
  fire: 'the campfire',
  axe: 'the axe in the stump',
  tent: 'the tent',
  sign: 'the fingerposts',
  tools: 'the tools on the pegboard',
  clock: 'the clock in the control room',
  rack: 'the server racks',
  stars: 'the stars, at night',
};

// Where the woodpile grows, a split at a time (script.js, buildCamp draws
// them hidden): units from the camp's mark, and up from the floor.
const CLICK_SPARE_AT = [[278, 11], [366, 11], [289, 31], [355, 31], [300, 51], [344, 51]];

// The tools off the pegboard: where he stands to reach each (units from the
// bench's mark), his hand on its grip and holding it up to use it (rig
// units), and what he says. Their shapes are the scenery's (buildShop) and
// again in his hand (index.html, .prop-tool).
const CLICK_TOOLS = {
  saw: { stand: 8, grip: [82, 6], hold: [104, 108], line: 'Measure twice.' },
  hammer: { stand: 99, grip: [95, 67], hold: [100, 96], line: 'Everything looks like a nail.' },
  spanner: { stand: 138, grip: [95, 67], hold: [100, 98], line: 'Righty tighty.' },
  level: { stand: 32, grip: [95, 96], hold: [106, 104], line: 'Dead level.' },
};
// The click area over each, in units from the bench's mark: left, right,
// bottom and top.
const CLICK_TOOL_BOX = {
  saw: [6, 100, 230, 264],
  hammer: [104, 148, 148, 248],
  spanner: [154, 192, 156, 255],
  level: [12, 102, 136, 156],
};

// The letters of his name as a pentatonic scale, C4 up to A5, left to
// right; and the stone notes in the sound library each is tuned from.
const CLICK_NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
const CLICK_STONES = [['stoneC4', 261.63], ['stoneG4', 392.0], ['stoneE5', 659.25]];

// What he says as the clock brings round each part of the day, and making
// wishes, one after another.
const CLICK_PART_LINES = { dawn: 'Morning already?', day: 'Lunch time.', dusk: 'Getting dark.', night: 'Is it that late?' };
const CLICK_WISHES = ['Made a wish.', 'Another one!', 'Can&rsquo;t tell you what I wished for.', 'That&rsquo;s plenty of wishes.'];

// The fingerposts (script.js, signpost), where each stands, and the stops
// their arms name.
const CLICK_POSTS = {
  start: () => nameEnd + 190,
  'camp-bench': () => (campX + benchX) / 2,
  'bench-line': () => (benchX + experienceX) / 2,
};
const CLICK_PLACES = { 'ABOUT ME': 'about', PROJECTS: 'projects', EXPERIENCE: 'experience' };

const clicker = {
  built: false,
  live: null, // whether things take clicks now: not in the opening, the world in view
  fireOff: null, // the fire's area off, the About stop's own taking the click
  wishable: null, // the stars out, and taking clicks
  hits: [],
  guides: new Set(), // one quiet amber hint for each kind of discovery
  guideAt: 0,
  guidePrompted: false,
  fireHit: null,
  arms: {}, // the fingerposts' arms, by `${post}:${index}`
  leds: [], // each rack's lights, top to bottom
  letters: [], // the statue's letters that are letters (not the space), left to right
  errand: null, // him going to something clicked, or at it: { id, phase, ... }
  later: null, // what he'll do once he's up off the floor: { fn, until }
  seq: [], // the letters played, the latest last
  lampClicks: {},
  armClicks: {},
  spun: null, // an arm spun round the wrong way, waiting for him
  fireClicks: [],
  tentClicks: 0,
  rackClicks: [],
  clockTurn: null, // the clock turning the day on: { part, half, ticks, heard }
  handsAt: '',
  hands: null,
  nudged: false,
};

const clickGuide = document.querySelector('.discovery-guide');
const clickGuideToggle = clickGuide?.querySelector('.discovery-guide__toggle');
const clickGuideNote = clickGuide?.querySelector('.discovery-guide__note');
const clickGuideDismiss = clickGuide?.querySelector('.discovery-guide__dismiss');
const clickGuideCount = clickGuide?.querySelector('[data-click-found]');
const clickGuideLive = clickGuide?.querySelector('[data-click-live]');
const clickGuideAction = clickGuide?.querySelector('[data-click-action]');
const clickStarAccess = document.querySelector('.click-star-access');

function clickGuideOpen(open, remember = false) {
  if (!clickGuideToggle || !clickGuideNote) return;
  clickGuideToggle.setAttribute('aria-expanded', String(open));
  clickGuideNote.hidden = !open;
  clickGuide.classList.toggle('is-open', open);
  if (remember) {
    memory.data.clickGuideSeen = true;
    memory.save();
  }
}

clickGuideToggle?.addEventListener('click', () => {
  const open = clickGuideToggle.getAttribute('aria-expanded') !== 'true';
  clickGuideOpen(open, !open);
});
clickGuideDismiss?.addEventListener('click', () => clickGuideOpen(false, true));
document.addEventListener('pointerdown', (event) => {
  if (clickGuideNote?.hidden || clickGuide?.contains(event.target)) return;
  clickGuideOpen(false, true);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || clickGuideNote?.hidden) return;
  event.preventDefault();
  clickGuideOpen(false, true);
  clickGuideToggle?.focus({ preventScroll: true });
});

/* ------------------------------------------------------------- helpers */

// Plays `group` from the sound library if it has it, otherwise `fallback`.
function clickSound(group, options, fallback) {
  if (sfx.sample?.(group, options)) return;
  fallback?.();
}

// Puts `cls` on `el` for `ms`, starting its animation over if it was on.
const clickTimers = new WeakMap();
function clickFlash(el, cls, ms) {
  if (!el) return;
  const timers = clickTimers.get(el) || {};
  clickTimers.set(el, timers);
  window.clearTimeout(timers[cls]);
  el.classList.remove(cls);
  el.getBoundingClientRect();
  el.classList.add(cls);
  timers[cls] = window.setTimeout(() => el.classList.remove(cls), ms);
}

// A value `s` of the way through `keys` ([at, value], values numbers or
// lists of them), eased between each.
function clickTrack(keys, s) {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i += 1) {
    const [s1, v1] = keys[i];
    if (s > s1) continue;
    const [s0, v0] = keys[i - 1];
    const k = ease(clamp((s - s0) / Math.max(1e-4, s1 - s0), 0, 1));
    return Array.isArray(v0) ? v0.map((v, j) => mix(v, v1[j], k)) : mix(v0, v1, k);
  }
  return keys[keys.length - 1][1];
}

// A prop in his near hand, shown or not, turned so it stands at `angle`
// degrees from how it is drawn whatever his arm is doing (as the mug on
// the run is kept level).
function clickHold(el, p, angle, shown) {
  if (!el) return;
  el.setAttribute('opacity', shown ? '1' : '0');
  if (shown) el.style.transform = `rotate(${(angle - (p.lean + p.near.shoulder + p.near.elbow)).toFixed(1)}deg)`;
}

// His legs bent `k` of the way down into a crouch `depth` units deep, the
// rest of him left as it is.
function clickCrouch(p, depth, k) {
  if (k <= 0) return;
  const c = crouchPose(p, depth);
  p.bob = mix(p.bob, c.bob, k);
  for (const side of ['near', 'far']) {
    blendSide(p[side], { thigh: c[side].thigh, knee: c[side].knee, ankle: c[side].ankle }, k);
  }
}

// An act whose pose is `pose(s, p, act)`, `s` of the way through it, over
// a copy of his own.
function clickAct(kind, duration, pose, extra = {}) {
  return {
    kind,
    duration,
    hands: true,
    ...extra,
    pose(base, act) {
      return pose(clamp(act.t / duration, 0, 1), clonePose(base), act);
    },
  };
}

// Says `html`, unless the opening or a stop's paper is up. It answers what
// they've just done, so it takes the place of anything he was saying.
function clickSay(html, ms = 2000) {
  if (!intro.active && !openPanelId) remark(`<span>${html}</span>`, ms);
}

// Whether he can see to something clicked: standing about with nothing else
// on (the click has already stopped whatever he was doing by himself).
function clickHeCan() {
  return clicker.built && isFree() && incident.phase === 'none' && !clicker.errand && !clicker.later;
}

// Runs `fn` once he is up off the floor, if he is still free to.
function clickWhenUp(fn) {
  clicker.later = { fn, until: performance.now() + 2000 };
}

// Whether one of the incidents' fixtures is being played with, so it isn't
// picked to break by itself meanwhile (living.js, updateIncidents).
function clickBusy(id) {
  return id === 'sign' && clicker.spun?.key === 'camp-bench:0';
}

// Breaks fixture `id` now, the visitor's doing: he's paged, says `line`,
// and fixes it as he fixes anything (living.js, the incidents).
function clickBreak(id, line) {
  if (livingReduced.matches || incident.phase !== 'none' || clicker.errand) return false;
  cancelAmbient();
  incident.say = line;
  incident.byVisitor = true;
  startIncident(id);
  return true;
}

/* ----------------------------------------------------------- his errands
   Something clicked that he goes to: he walks over, as to something broken,
   and does `act` there. Walked off on the way, it's dropped; cut short
   there, it ends early. */

function clickErrand(id, { x, face, label, act, done = null }) {
  const errand = { id, x, face, act, done, phase: 'start' };
  clicker.errand = errand;
  soon(() => {
    if (clicker.errand !== errand) return;
    errand.phase = 'travel';
    state.target = clamp(x, 0, WORLD_END);
    state.destinationId = 'clickable';
    state.label = label;
    state.announced = false;
    status.textContent = `Heading over to ${label}`;
  });
}

// At it (script.js, frame, on arriving).
function clickArrived() {
  const errand = clicker.errand;
  if (!errand || errand.phase !== 'travel') return;
  errand.phase = 'act';
  const act = errand.act();
  const end = act.end;
  act.end = (cancelled) => {
    end?.(cancelled);
    clickErrandOver(errand, cancelled);
  };
  startAct(act);
  ambient.face = errand.face;
}

function clickErrandOver(errand, cancelled) {
  if (clicker.errand !== errand) return;
  clicker.errand = null;
  if (state.destinationId === 'clickable') {
    state.destinationId = null;
    state.announced = true;
  }
  errand.done?.(cancelled);
}

/* ------------------------------------------------------------ his acts */

// A look up at a lamp he has just seen switch.
function clickGlanceAct() {
  return clickAct('glance', 1.3, (s, p) => {
    p.lean -= 6 * between(s, 0.05, 0.95, 0.3, 0.3);
    return p;
  }, { hands: false });
}

// Clapping: the hands meeting in front of him, five times.
function clickClapAct() {
  let claps = 0;
  return clickAct('clap', 2.3, (s, p, act) => {
    const w = between(s, 0.02, 0.98, 0.14, 0.14);
    const t = act.t;
    const open = t < 0.35 ? 1 : 0.5 + 0.5 * Math.cos(2 * Math.PI * 3 * (t - 0.35));
    aimArm(p, 'near', ...leaned(p.lean, 99 + 5 * open, 96), w);
    aimArm(p, 'far', ...leaned(p.lean, 95 - 5 * open, 98), w);
    const n = t < 0.35 ? 0 : Math.floor((t - 0.35) * 3 + 0.5);
    if (n > claps && n <= 5) {
      claps = n;
      clickSound('clap', { vol: 0.3, vary: 0.05 }, () => sfx.hiss({ freq: 1400, q: 1.2, vol: 0.3, dur: 0.06, attack: 0.002 }));
    }
    return p;
  });
}

// Leaning back from the fire roaring up, a hand up to shield his face.
function clickRecoilAct() {
  return clickAct('recoil', 2.0, (s, p) => {
    const w = between(s, 0.02, 0.95, 0.12, 0.3);
    p.lean -= 10 * w;
    aimArm(p, 'far', ...leaned(p.lean, 98, 36), w);
    aimArm(p, 'near', ...leaned(p.lean, 60, 118), 0.8 * w);
    return p;
  });
}

// His wrist up to look at his watch: tapped twice, shaken, looked at again.
function clickWatchAct() {
  const watch = document.querySelector('.figure .prop-watch');
  let taps = 0;
  return clickAct('watch', 3.0, (s, p) => {
    const w = between(s, 0.03, 0.95, 0.12, 0.12);
    p.lean += 4 * w;
    const shake = s > 0.6 && s < 0.78 ? 3.5 * Math.sin((s - 0.6) * 2 * Math.PI * 7) : 0;
    aimArm(p, 'near', ...leaned(p.lean, 97, 62 + shake), w);
    const tap = Math.max(between(s, 0.3, 0.42, 0.05, 0.05), between(s, 0.46, 0.56, 0.04, 0.05));
    aimArm(p, 'far', ...leaned(p.lean, 95, 67), tap);
    const n = s > 0.51 ? 2 : s > 0.36 ? 1 : 0;
    if (n > taps) {
      taps = n;
      // The recording has both taps in it.
      if (n === 1) clickSound('watchTap', { vol: 0.3, vary: 0.02 }, () => sfx.tone(3000, { type: 'triangle', vol: 0.04, dur: 0.03 }));
      else if (!sfx.samplesReady) sfx.tone(3000, { type: 'triangle', vol: 0.04, dur: 0.03 });
    }
    watch?.setAttribute('opacity', w > 0.05 ? '1' : '0');
    return p;
  }, { end: () => watch?.setAttribute('opacity', '0') });
}

// Pointing up at a shooting star, then his hands together, making a wish.
function clickWishAct() {
  return clickAct('wish', 3.4, (s, p) => {
    const point = between(s, 0.02, 0.42, 0.1, 0.08);
    const hands = between(s, 0.4, 0.97, 0.1, 0.12);
    p.lean += 7 * hands - 4 * point;
    aimArm(p, 'near', ...leaned(p.lean, 110, 2), point);
    aimArm(p, 'near', ...leaned(p.lean, 97, 96), hands);
    aimArm(p, 'far', ...leaned(p.lean, 93, 98), hands);
    return p;
  });
}

// The axe out of the stump, a round set on it, and split: he stands to
// the left of the stump, 334 units from the camp's mark, facing it. Hand
// targets in rig units (the near one inside the bob, the far one not, as
// it reaches the stump crouching), the axe's angle in degrees.
const CLICK_CHOP = {
  lean: [[0, 3], [0.1, 40], [0.14, 40], [0.22, 12], [0.27, 38], [0.34, 38], [0.43, -8], [0.47, -8], [0.52, 40], [0.62, 38], [0.74, 6], [1, 3]],
  near: [[0, [125, 156]], [0.14, [125, 156]], [0.22, [100, 108]], [0.27, [96, 118]], [0.34, [96, 118]], [0.43, [74, 14]], [0.47, [74, 14]],
    [0.52, [125, 156]], [0.62, [125, 156]], [0.74, [100, 128]], [0.82, [99, 104]], [0.94, [99, 104]], [1, [96, 130]]],
  far: [[0.2, [100, 130]], [0.27, [132, 194]], [0.31, [132, 194]], [0.4, [102, 110]], [0.43, [72, 18]], [0.47, [72, 18]],
    [0.52, [121, 158]], [0.62, [121, 158]], [0.72, [96, 132]], [0.8, [95, 106]], [0.94, [95, 106]], [1, [92, 130]]],
  axe: [[0, 165], [0.12, 165], [0.22, 20], [0.34, 15], [0.43, -30], [0.47, -30], [0.52, 165], [1, 165]],
  crouch: [[0.2, 0], [0.27, 1], [0.34, 1], [0.41, 0]],
};

function clickChopAct() {
  const duration = 3.8;
  const prop = document.querySelector('.figure .prop-axe');
  const stuck = document.querySelector('.s-axe');
  const block = document.querySelector('.s-block');
  const halves = [...document.querySelectorAll('.s-half')];
  const softClap = () => clickSound('clap', { vol: 0.12, rate: 1.1, vary: 0.05 }, () => sfx.hiss({ freq: 1600, q: 1.2, vol: 0.12, dur: 0.05, attack: 0.002 }));
  const beats = [
    [0.12, () => {
      stuck?.classList.add('is-lifted');
      clickSound('axePull', { vol: 0.32, vary: 0.03 }, () => noises.creak());
    }],
    [0.3, () => {
      block?.classList.add('is-set');
      sfx.tap(0.8);
    }],
    [0.46, () => clickSound('swish', { vol: 0.3, vary: 0.06 }, () => sfx.hiss({ freq: 2600, to: 500, q: 1.4, vol: 0.2, dur: 0.22, attack: 0.08 }))],
    [0.52, () => {
      block?.classList.remove('is-set');
      clickSplit(halves);
      clickSound('axeChop', { vol: 0.44, vary: 0.04 }, () => {
        sfx.thunk();
        sfx.hiss({ freq: 2200, to: 900, q: 1, vol: 0.18, dur: 0.12, attack: 0.002 });
      });
    }],
    [0.62, () => stuck?.classList.remove('is-lifted')],
    [0.68, () => {
      clickStack();
      clickSound('woodStack', { vol: 0.32, vary: 0.05 }, () => [0, 0.08, 0.17].forEach((at) => sfx.tap(1.2 + at, at)));
    }],
    [0.84, softClap],
    [0.91, softClap],
  ];
  let next = 0;
  return {
    kind: 'chop',
    duration,
    hands: true,
    pose(base, act) {
      const s = clamp(act.t / duration, 0, 1);
      while (next < beats.length && s >= beats[next][0]) beats[next++][1]();
      const p = clonePose(base);
      const w = between(s, 0.02, 0.97, 0.08, 0.1);
      clickCrouch(p, 44, clickTrack(CLICK_CHOP.crouch, s));
      p.lean = mix(base.lean, clickTrack(CLICK_CHOP.lean, s), w);
      const clap = s > 0.8 && s < 0.94 ? 4 * Math.abs(Math.sin(((s - 0.8) * Math.PI) / 0.07)) : 0;
      const [nx, ny] = clickTrack(CLICK_CHOP.near, s);
      aimArm(p, 'near', nx + clap, ny, w);
      const [fx, fy] = clickTrack(CLICK_CHOP.far, s);
      aimArm(p, 'far', fx - clap, fy - p.bob, Math.max(between(s, 0.2, 0.62, 0.06, 0.06), between(s, 0.78, 0.96, 0.05, 0.05)));
      clickHold(prop, p, clickTrack(CLICK_CHOP.axe, s), s >= 0.12 && s < 0.62);
      return p;
    },
    end() {
      prop?.setAttribute('opacity', '0');
      stuck?.classList.remove('is-lifted');
      block?.classList.remove('is-set');
    },
  };
}

// The two halves of the round, flying off the stump onto the pile.
function clickSplit(halves) {
  const [sx, sy] = CLICK_SPARE_AT[Math.min(memory.data.woodpile || 0, CLICK_SPARE_AT.length - 1)];
  halves.forEach((half, j) => {
    if (livingReduced.matches) return;
    const dx = sx - (j ? 402 : 390);
    const dy = -(sy - 46);
    const turn = j ? 1 : -1;
    half.classList.add('is-flying');
    half.animate([
      { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
      { transform: `translate(${(dx / 2 + 8 * turn).toFixed(1)}px, ${(dy / 2 - 46).toFixed(1)}px) rotate(${200 * turn}deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${380 * turn}deg)`, opacity: 0.3 },
    ], { duration: 520, easing: 'linear' }).onfinish = () => half.classList.remove('is-flying');
  });
}

// One more log on the pile, remembered.
function clickStack() {
  const n = memory.data.woodpile || 0;
  if (n >= CLICK_SPARE_AT.length) return;
  memory.data.woodpile = n + 1;
  memory.save();
  const spare = document.querySelector(`.s-spare[data-spare="${n}"]`);
  spare?.classList.add('is-stacked');
  if (!livingReduced.matches) clickFlash(spare, 'is-new', 500);
}

// Crouched at the tent's door, peeking in; with `withBird`, it bursts out
// past him and he jumps back. He stands right of the door, facing it.
function clickPeekAct(withBird) {
  const duration = 3.0;
  let flap = false;
  let burst = false;
  return clickAct('peek', duration, (s, p) => {
    const jolt = withBird ? between(s, 0.42, 0.98, 0.04, 0.35) : 0;
    const k = between(s, 0.04, withBird ? 0.46 : 0.8, 0.22, withBird ? 0.05 : 0.18);
    clickCrouch(p, 30, k);
    p.lean = mix(p.lean, 30, k) - 14 * jolt;
    aimArm(p, 'near', 118, 182 - p.bob, between(s, 0.1, withBird ? 0.44 : 0.74, 0.12, 0.08));
    if (withBird) aimArm(p, 'far', ...leaned(p.lean, 90, 40), jolt);
    if (!flap && s > 0.2) {
      flap = true;
      clickSound('tentFlap', { vol: 0.28, vary: 0.04 }, () => sfx.rustle(0.3));
    }
    if (withBird && !burst && s > 0.42) {
      burst = true;
      livingBirdBurst(campX - 262 * view.unit, 40 * view.unit);
    }
    return p;
  });
}

// A tool off the pegboard: up to it, down with it to use it, and back.
function clickToolAct(id) {
  const tool = CLICK_TOOLS[id];
  const duration = 3.8;
  const prop = document.querySelector('.figure .prop-tool');
  const shape = prop?.querySelector(`[data-prop="${id}"]`);
  const bubble = shape?.querySelector('.prop-tool__bubble');
  const board = document.querySelector(`.s-tool[data-tool="${id}"]`);
  const done = new Set();
  const cue = (key, s, at, fn) => {
    if (s >= at && !done.has(key)) {
      done.add(key);
      fn();
    }
  };
  prop?.querySelectorAll('[data-prop]').forEach((g) => { g.style.display = g === shape ? '' : 'none'; });
  const ratchet = () => clickSound('ratchet', { vol: 0.24, vary: 0.04 }, () => {
    for (let i = 0; i < 4; i += 1) sfx.hiss({ freq: 4000, q: 4, vol: 0.12, dur: 0.015, at: i * 0.035, attack: 0.001 });
  });
  return clickAct('tool', duration, (s, p) => {
    const u = clamp((s - 0.32) / 0.4, 0, 1); // how far through using it
    const using = between(s, 0.32, 0.72, 0.04, 0.04);
    const w = between(s, 0.02, 0.97, 0.12, 0.1);
    let [x, y] = clickTrack([[0, tool.grip], [0.2, tool.grip], [0.32, tool.hold], [0.72, tool.hold], [0.84, tool.grip], [1, tool.grip]], s);
    let angle = 0;
    if (id === 'hammer') {
      const flip = clamp((u - 0.1) / 0.5, 0, 1);
      angle = 360 * ease(flip);
      y -= 10 * Math.sin(Math.PI * flip) * using;
      cue('catch', s, 0.56, () => sfx.tap(1.3));
    } else if (id === 'spanner') {
      angle = 48 * Math.sin(u * 2 * Math.PI * 1.5) * using;
      cue('r1', s, 0.42, ratchet);
      cue('r2', s, 0.56, ratchet);
    } else if (id === 'level') {
      angle = 8 * (1 - ease(clamp(u / 0.8, 0, 1))) * Math.cos(u * 14) * using;
      bubble?.setAttribute('cx', (70 + mix(-4.5, 0, ease(clamp(u / 0.7, 0, 1)))).toFixed(2));
      cue('level', s, 0.62, () => sfx.tick(true));
    } else if (id === 'saw') {
      angle = 16 * using;
      x += 9 * Math.sin(u * 2 * Math.PI * 3) * using;
      for (let n = 0; n < 3; n += 1) {
        cue(`stroke${n}`, s, 0.32 + ((n + 0.25) / 3) * 0.4, () => clickSound('sawStroke', { vol: 0.28, vary: 0.05 },
          () => sfx.hiss({ freq: 3000, to: 1800, q: 1.5, vol: 0.09, dur: 0.16 })));
      }
    }
    aimArm(p, 'near', x, y, w);
    const held = s >= 0.18 && s < 0.84;
    board?.classList.toggle('is-taken', held);
    clickHold(prop, p, angle, held);
    cue('take', s, 0.18, () => clickSound('pegboardLift', { vol: 0.24, vary: 0.05 }, () => sfx.tink(2)));
    cue('say', s, 0.3, () => clickSay(tool.line, 1900));
    cue('back', s, 0.84, () => clickSound('pegboardLift', { vol: 0.2, vary: 0.05 }, () => sfx.tink(0)));
    return p;
  }, {
    end() {
      board?.classList.remove('is-taken');
      prop?.setAttribute('opacity', '0');
      bubble?.setAttribute('cx', '70');
    },
  });
}

/* ---------------------------------------------------- what they each do */

// The world px of something `x` units from `anchor`.
const clickAt = (anchor, x) => anchor + x * view.unit;

// A note of the scale, `order` letters along: a stone note repitched from
// the nearest in the library, or a struck bar made from tones.
function clickNote(order) {
  const f = CLICK_NOTES[order];
  const nearest = [...CLICK_STONES].sort((a, b) => Math.abs(Math.log(f / a[1])) - Math.abs(Math.log(f / b[1])));
  if (nearest.some(([group, base]) => sfx.sample?.(group, { vol: 0.34, rate: f / base, vary: 0 }))) return;
  sfx.tone(f, { vol: 0.12, dur: 1.2, attack: 0.004 });
  sfx.tone(f * 2, { vol: 0.03, dur: 0.5 });
  sfx.tone(f * 4.07, { type: 'triangle', vol: 0.02, dur: 0.12 });
  sfx.hiss({ type: 'highpass', freq: 3000, vol: 0.03, dur: 0.02, attack: 0.001 });
}

// Played in order, left to right: the name lights up in a wave, and he
// claps if he's about.
function clickNamePlayed() {
  memory.data.namePlayed = (memory.data.namePlayed || 0) + 1;
  memory.save();
  if (!livingReduced.matches) {
    clicker.letters.forEach((i, order) => {
      const el = document.querySelector(`.statue__letter[data-letter="${i}"]`);
      el?.style.setProperty('--wave', `${(order * 0.08).toFixed(2)}s`);
      clickFlash(el, 'is-played', 2400);
    });
  }
  sfx.sparkle(0.25);
  if (!clickHeCan()) return;
  const middle = clickAt(nameEnd, -STATUE.width / 2);
  clickWhenUp(() => {
    if (!livingReduced.matches) {
      startAct(clickClapAct());
      ambient.face = Math.sign(middle - state.x) || state.facing;
    }
    clickSay('You played my name!', 2600);
  });
}

// The camp fire's embers, a burst of them flying up.
function clickEmbers(n) {
  const fire = document.querySelector('.campfire');
  if (!fire || livingReduced.matches) return;
  for (let i = 0; i < n; i += 1) {
    const ember = document.createElement('span');
    ember.className = 'click-ember';
    ember.style.setProperty('--x', `${(Math.random() * 30 - 15).toFixed(1)}%`);
    ember.style.setProperty('--drift', `${(Math.random() * 44 - 22).toFixed(0)}px`);
    ember.style.setProperty('--rise', `${(-0.35 - Math.random() * 0.35).toFixed(2)}`);
    ember.style.setProperty('--d', `${(0.9 + Math.random() * 0.8).toFixed(2)}s`);
    ember.style.animationDelay = `${(Math.random() * 0.25).toFixed(2)}s`;
    fire.append(ember);
    window.setTimeout(() => ember.remove(), 2200);
  }
}

// The tent snoring: its sides rising and falling twice, and z's drifting
// out of the door.
function clickSnore() {
  const tent = document.querySelector('.s-tent');
  if (!livingReduced.matches) clickFlash(tent, 'is-snoring', 2600);
  [0, 1.25].forEach((at) => clickSound('snore', { vol: 0.34, at, vary: 0.04 },
    () => sfx.hiss({ type: 'lowpass', freq: 260, to: 520, q: 6, vol: 0.16, dur: 1.05, at, attack: 0.5 })));
  if (livingReduced.matches) return;
  [0, 1.25].forEach((breath) => {
    for (let i = 0; i < 3; i += 1) {
      const z = document.createElement('span');
      z.className = 'click-z';
      z.textContent = 'z';
      z.style.left = `calc(${campX}px + var(--fig-h) * ${((-280 + i * 7) / UNITS_TALL).toFixed(4)})`;
      z.style.top = `calc(var(--fig-h) * ${(-(104 + i * 5) / UNITS_TALL).toFixed(4)})`;
      z.style.setProperty('--z', (0.8 + i * 0.2).toFixed(2));
      z.style.animationDelay = `${(breath + 0.3 + i * 0.25).toFixed(2)}s`;
      world.append(z);
      window.setTimeout(() => z.remove(), (breath + 2.2) * 1000);
    }
  });
}

// A spun arm, round the wrong way and upside down.
function clickSpin(arm) {
  const el = arm.el;
  clicker.spun = arm;
  el.style.transition = 'none';
  el.style.transform = 'rotate(180deg)';
  el.animate([
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(570deg)', offset: 0.78 },
    { transform: 'rotate(540deg)' },
  ], { duration: 1500, easing: 'cubic-bezier(0.15, 0.6, 0.35, 1)' });
  clickSound('signSpin', { vol: 0.32, vary: 0.02 }, () => noises.creak());
  noises.clunk(1.2);
  // He stops to see to it, if he can: free, or on his way where it sent him
  // (and then the navbar no longer says he's going there).
  const going = state.destinationId === arm.place && !state.announced;
  if (incident.phase !== 'none' || clicker.errand || !(isFree() || going)) return;
  if (going) {
    buttons.forEach((button) => button.removeAttribute('aria-current'));
    markers.forEach((marker) => marker.classList.remove('is-active'));
  }
  clickArmFix(arm);
}

// Put right: round the right way, with a bounce.
function clickUnspin(arm) {
  const el = arm.el;
  if (clicker.spun === arm) clicker.spun = null;
  el.style.transform = '';
  noises.creak();
  const done = () => { el.style.transition = ''; };
  if (livingReduced.matches) {
    done();
    return;
  }
  el.animate([
    { transform: 'rotate(180deg)' },
    { transform: 'rotate(-14deg)', offset: 0.72 },
    { transform: 'rotate(0deg)' },
  ], { duration: 650, easing: 'ease-out' }).onfinish = done;
}

// Over to a spun arm to put it right, as he pushes up a loose one (FIX_PUSH
// is for the top arm; lower ones are reached lower).
function clickArmFix(arm) {
  const drop = 188 - arm.y;
  const frames = FIX_PUSH.map((f) => (f.near?.hand ? { ...f, near: { ...f.near, hand: [f.near.hand[0], f.near.hand[1] + drop] } } : f));
  clickSay('That&rsquo;s not right.', 1600);
  clickErrand('sign', {
    x: arm.anchor() + arm.dir * 20 * view.unit,
    face: -arm.dir,
    label: 'the signpost',
    act: () => keyframeAct('fix', 2.4, frames, {
      hands: true,
      beats: { 0.34: () => clickUnspin(arm), 0.76: () => sfx.tap(1.2), 0.9: () => sfx.tap(1.2) },
    }),
    done: (cancelled) => { if (!cancelled && clicker.spun !== arm) clickSay('Better.', 1400); },
  });
}

// The lights of rack `r` running top to bottom.
function clickRipple(r) {
  if (livingReduced.matches) return;
  (clicker.leds[r] || []).forEach(({ el, row }) => {
    el.style.setProperty('--ripple', `${(row * 0.06).toFixed(2)}s`);
    clickFlash(el, 'is-rippling', 1100);
  });
}

// A star shooting off: it goes out, a streak flies from it, and it comes
// back a few seconds later.
function clickShoot(star) {
  star.classList.add('is-wished');
  window.setTimeout(() => star.classList.remove('is-wished'), 4200);
  clickSound('shootingStar', { vol: 0.3, vary: 0.02 }, () => {
    sfx.tone(2600, { to: 700, vol: 0.04, dur: 0.8 });
    sfx.hiss({ freq: 6000, to: 1500, q: 1, vol: 0.05, dur: 0.8, attack: 0.1 });
  });
  if (livingReduced.matches || !skyStars) return;
  // From where the star is on the screen (the stars wheel through the
  // night, so not where it was placed).
  const box = star.getBoundingClientRect();
  const sky = skyStars.getBoundingClientRect();
  const trail = document.createElement('b');
  trail.className = 'shooting-star';
  trail.style.left = `${(box.left + box.width / 2 - sky.left).toFixed(1)}px`;
  trail.style.top = `${(box.top + box.height / 2 - sky.top).toFixed(1)}px`;
  trail.style.setProperty('--dir', box.left + box.width / 2 < sky.left + sky.width / 2 ? '1' : '-1');
  skyStars.append(trail);
  window.setTimeout(() => trail.remove(), 1400);
}

// Which way he turns to face a star: its place on the screen against his.
function clickStarSide(star) {
  const scene0 = scene.getBoundingClientRect().left;
  const x = star.getBoundingClientRect().left - scene0;
  return Math.sign(x - (sceneWidth / 2 + view.shift)) || state.facing;
}

const CLICK_PRESS = {
  // A letter of his name: it rings its note.
  name(part) {
    const i = Number(part);
    const order = clicker.letters.indexOf(i);
    if (order < 0) return;
    const el = document.querySelector(`.statue__letter[data-letter="${i}"]`);
    if (el && !livingReduced.matches) restartClass(el, 'is-struck');
    clickNote(order);
    clicker.seq = [...clicker.seq, order].slice(-clicker.letters.length);
    if (clicker.seq.length === clicker.letters.length && clicker.seq.every((v, k) => v === k)) {
      clicker.seq = [];
      clickNamePlayed();
    }
  },

  // A street lamp: switched off or on, and kept so until the hour next
  // switches it. Flicked four times in quick succession, it pops.
  lamp(part) {
    const light = SWITCHED.find((item) => item.id === part);
    if (!light) return;
    if (FIXTURES[part]?.broken || incident.id === part) {
      sfx.tap(1.4);
      return;
    }
    const now = performance.now();
    const recent = (clicker.lampClicks[part] || []).filter((at) => now - at < 1800).concat(now);
    clicker.lampClicks[part] = recent;
    if (recent.length >= 4 && clickBreak(part, 'Easy on the switch.')) {
      clicker.lampClicks[part] = [];
      holdLamp(part, null);
      clickSound('bulbPop', { vol: 0.36, vary: 0.02 }, () => {
        sfx.tone(1400, { type: 'square', to: 300, vol: 0.05, dur: 0.08 });
        sfx.hiss({ freq: 1800, to: 600, vol: 0.3, dur: 0.14, attack: 0.002 });
      });
      return;
    }
    const on = !lamps.lit[part];
    holdLamp(part, on);
    switchLight(light, on, true);
    if (!clickHeCan() || livingReduced.matches) return;
    const head = clickAt(nameEnd, (part === 'lamp-left' ? -STATUE.width - 580 : 110) + 30);
    clickWhenUp(() => {
      startAct(clickGlanceAct());
      ambient.face = Math.sign(head - state.x) || state.facing;
    });
  },

  // The fire: it flares up and throws sparks. Three quick clicks and it
  // roars.
  fire() {
    const el = document.querySelector('.campfire');
    const now = performance.now();
    clicker.fireClicks = clicker.fireClicks.filter((at) => now - at < 1600).concat(now);
    const roar = clicker.fireClicks.length >= 3;
    if (roar) clicker.fireClicks = [];
    if (!livingReduced.matches) {
      clickFlash(el, 'is-stoked', 1300);
      if (roar) clickFlash(el, 'is-roaring', 2600);
    }
    clickEmbers(roar ? 14 : 6);
    if (roar) clickSound('fireRoar', { vol: 0.44, vary: 0.02 }, () => sfx.hiss({ type: 'lowpass', freq: 180, to: 1100, vol: 0.5, dur: 1.8, attack: 0.3 }));
    else clickSound('fireFlare', { vol: 0.38, vary: 0.05 }, () => sfx.hiss({ type: 'lowpass', freq: 250, to: 1400, vol: 0.35, dur: 0.7, attack: 0.12 }));
    for (let i = 0; i < (roar ? 5 : 3); i += 1) {
      const at = 0.08 + i * 0.13 + Math.random() * 0.06;
      clickSound('firePop', { vol: 0.2, at, vary: 0.08 }, () => sfx.hiss({ freq: 2600 + Math.random() * 1600, q: 3, vol: 0.12, dur: 0.03, at, attack: 0.002 }));
    }
    if (!roar || !clickHeCan()) return;
    const fire = clickAt(campX, 174);
    clickWhenUp(() => {
      if (!livingReduced.matches) {
        startAct(clickRecoilAct());
        ambient.face = Math.sign(fire - state.x) || state.facing;
      }
      clickSay('Easy, it&rsquo;s a campfire.', 2200);
    });
  },

  // The axe in the stump: he comes over and splits a log for the pile.
  axe() {
    if (clicker.errand?.id === 'axe') return;
    const stuck = document.querySelector('.s-axe');
    const full = (memory.data.woodpile || 0) >= CLICK_SPARE_AT.length;
    if (!clickHeCan() || full) {
      if (!livingReduced.matches) clickFlash(stuck, 'is-wiggled', 600);
      sfx.tap(0.8);
      if (full && clickHeCan()) clickWhenUp(() => clickSay('That&rsquo;ll do for winter.', 2200));
      return;
    }
    if (livingReduced.matches) {
      clickStack();
      clickSay((memory.data.woodpile || 0) >= CLICK_SPARE_AT.length ? 'That&rsquo;ll do for winter.' : 'One more for the pile.', 2000);
      return;
    }
    clickWhenUp(() => clickErrand('axe', {
      x: clickAt(campX, 334),
      face: 1,
      label: 'the woodpile',
      act: clickChopAct,
      done: (cancelled) => {
        if (!cancelled && (memory.data.woodpile || 0) >= CLICK_SPARE_AT.length) clickSay('That&rsquo;ll do for winter.', 2400);
      },
    }));
  },

  // The tent: something inside snores. He goes and looks; every third
  // time, the bird bursts out.
  tent() {
    if (clicker.errand?.id === 'tent') return;
    clicker.tentClicks += 1;
    const withBird = clicker.tentClicks % 3 === 0;
    clickSnore();
    const door = [clickAt(campX, -262), 40 * view.unit];
    if (!clickHeCan()) {
      if (withBird) window.setTimeout(() => livingBirdBurst(...door), 1500);
      return;
    }
    clickWhenUp(() => {
      clickSay('Hello?', 1400);
      if (livingReduced.matches) {
        window.setTimeout(() => clickSay('Nobody&rsquo;s in there.', 2000), 1800);
        return;
      }
      clickErrand('tent', {
        x: clickAt(campX, -196),
        face: -1,
        label: 'the tent',
        act: () => clickPeekAct(withBird),
        done: (cancelled) => {
          if (!cancelled) clickSay(withBird ? 'So that&rsquo;s who it was.' : 'Nobody&rsquo;s in there.', 2200);
        },
      });
    });
  },

  // A fingerpost's arm: he goes where it points, as the navbar sends him.
  // Three clicks on one in quick succession spin it round the wrong way.
  sign(part) {
    const arm = clicker.arms[part];
    if (!arm) return;
    if (clicker.spun === arm || (part === 'camp-bench:0' && FIXTURES.sign.broken)) {
      noises.creak();
      return;
    }
    const now = performance.now();
    const recent = (clicker.armClicks[part] || []).filter((at) => now - at < 2200).concat(now);
    clicker.armClicks[part] = recent;
    if (recent.length >= 3 && !clicker.spun && !livingReduced.matches) {
      clicker.armClicks[part] = [];
      clickSpin(arm);
      return;
    }
    if (!livingReduced.matches) {
      arm.el.animate([{ rotate: '0deg' }, { rotate: `${6 * arm.dir}deg` }, { rotate: `${-3 * arm.dir}deg` }, { rotate: '0deg' }], { duration: 500, easing: 'ease-out' });
    }
    sfx.tap(1.1);
    if (recent.length > 1) return;
    const button = buttons.find((item) => item.dataset.poi === arm.place);
    if (!button || state.destinationId === arm.place) return;
    sfx.tick();
    goTo(button, { keepSpeech: true });
    clickSay(`${arm.label}? This way.`, 1600);
  },

  // A tool on the pegboard: it swings on its peg, and he comes and takes
  // it down to show it off.
  tools(part) {
    const tool = CLICK_TOOLS[part];
    const el = document.querySelector(`.s-tool[data-tool="${part}"]`);
    if (!tool || !el || el.classList.contains('is-taken')) return;
    if (!livingReduced.matches) clickFlash(el, 'is-jostled', 650);
    clickSound('pegboardLift', { vol: 0.24, vary: 0.05 }, () => sfx.tink(1));
    if (!clickHeCan()) return;
    if (livingReduced.matches) {
      clickWhenUp(() => clickSay(tool.line, 1800));
      return;
    }
    clickWhenUp(() => clickErrand('tools', {
      x: clickAt(benchX, tool.stand),
      face: 1,
      label: 'the pegboard',
      act: () => clickToolAct(part),
    }));
  },

  // The clock: its hands spin on to the next part of the day, and the
  // world with them (as T does). He checks his watch.
  clock() {
    const before = shownPart();
    pickTime(DAYPARTS[(DAYPARTS.indexOf(before) + 1) % DAYPARTS.length]);
    const part = shownPart();
    clicker.clockTurn = { part, half: Math.floor(wrapHour(skyClock.hour) * 2), ticks: 0, heard: clickHeCan() };
    clickSound('clockTick', { vol: 0.22, vary: 0.03 }, () => sfx.tick(true));
    if (!clicker.clockTurn.heard || livingReduced.matches) return;
    const clock = clickAt(skillsX, 120);
    clickWhenUp(() => {
      startAct(clickWatchAct());
      ambient.face = Math.sign(clock - state.x) || state.facing;
    });
  },

  // A server rack: its lights run down it and its fans spin up. Five
  // clicks in quick succession and it goes down.
  rack(part) {
    clickRipple(Number(part));
    clickSound('serverSpinup', { vol: 0.3, vary: 0.03 }, () => sfx.hiss({ freq: 300, to: 1500, q: 2, vol: 0.12, dur: 0.8, attack: 0.25 }));
    const now = performance.now();
    clicker.rackClicks = clicker.rackClicks.filter((at) => now - at < 2600).concat(now);
    if (clicker.rackClicks.length >= 5 && clickBreak('rack', 'Did you just DDoS me?')) clicker.rackClicks = [];
  },

  // A star, at night: it shoots, and he makes a wish.
  stars(part) {
    const star = skyStars?.children[Number(part)];
    if (!star || star.tagName !== 'I' || star.classList.contains('is-wished')) return;
    clickShoot(star);
    memory.data.wishes = (memory.data.wishes || 0) + 1;
    memory.save();
    const n = memory.data.wishes;
    clickSound('wishChime', { vol: 0.28, at: 0.9, vary: 0.02 },
      () => [1047, 1568, 2093].forEach((f, i) => sfx.tone(f, { vol: 0.04, dur: 1.2, at: 0.9 + i * 0.1 })));
    if (!clickHeCan()) return;
    const side = clickStarSide(star);
    clickWhenUp(() => {
      if (!livingReduced.matches) {
        startAct(clickWishAct());
        ambient.face = side;
      }
      clickSay(CLICK_WISHES[Math.min(n, CLICK_WISHES.length) - 1], 2400);
    });
  },
};

function clickPress(id, part) {
  if (!CLICK_PRESS[id]) return;
  CLICK_PRESS[id](part);
  clickFound(id);
}

/* ------------------------------------------------------------ finding */

const clickFoundCount = () => Object.keys(CLICK_THINGS).filter((id) => memory.data.found?.[id]).length;

function clickFound(id) {
  memory.data.found ||= {};
  if (memory.data.found[id]) return;
  memory.data.found[id] = true;
  memory.save();
  scene.querySelectorAll(`.click-hit[data-click="${id}"]`).forEach((el) => el.classList.add('is-found'));
  if (id === 'stars') skyStars?.classList.add('is-found');
  clickCountBoard();
  const n = clickFoundCount();
  if (clickGuideLive) clickGuideLive.textContent = `Discovered ${CLICK_THINGS[id]}. ${n} of ${Object.keys(CLICK_THINGS).length} found.`;
  clickFlash(clickGuideToggle, 'is-celebrating', 850);
}

// The ops board's count of what they've found.
function clickCountBoard() {
  const text = document.querySelector('[data-fixture="found-count"] text');
  const n = clickFoundCount();
  if (text) text.textContent = n ? `FOUND ${n}/${Object.keys(CLICK_THINGS).length}` : ' ';
  if (clickGuideCount) clickGuideCount.textContent = `${n}/${Object.keys(CLICK_THINGS).length}`;
  if (clickGuideToggle) clickGuideToggle.setAttribute('aria-label', `World secrets: ${n} of ${Object.keys(CLICK_THINGS).length} discovered`);
  clickGuide?.classList.toggle('is-complete', n === Object.keys(CLICK_THINGS).length);
}

/* --------------------------------------------------------- building it */

// A click area in the world over units [x0, x1] from `anchor` px, from y0
// to y1 up from the floor, placed as worldSet places scenery so it keeps
// up with resizes.
function clickHit(id, part, anchor, [x0, x1], [y0, y1], label) {
  const el = document.createElement('span');
  const u = (v) => (v / UNITS_TALL).toFixed(4);
  el.className = 'click-hit';
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', label || `Interact with ${CLICK_THINGS[id]}`);
  el.setAttribute('aria-disabled', 'true');
  el.tabIndex = -1;
  el.dataset.click = id;
  if (part !== null) el.dataset.part = String(part);
  el.style.left = `calc(${anchor.toFixed(1)}px + var(--fig-h) * ${u(x0)})`;
  el.style.width = `calc(var(--fig-h) * ${u(x1 - x0)})`;
  el.style.top = `calc(var(--fig-h) * ${u(-y1)})`;
  el.style.height = `calc(var(--fig-h) * ${u(y1 - y0)})`;
  if (!clicker.guides.has(id)) {
    clicker.guides.add(id);
    el.classList.add('is-guide');
  }
  if (memory.data.found?.[id]) el.classList.add('is-found');
  world.append(el);
  clicker.hits.push(el);
  return el;
}

function clickBuild() {
  // The letters of his name.
  const letterFoot = PLINTH + 8;
  STATUE.letters.forEach((letter, i) => {
    if (!letter.pieces.length) return;
    clicker.letters.push(i);
    clickHit('name', i, nameEnd, [letter.x - STATUE.width, letter.x - STATUE.width + letter.width], [letterFoot, letterFoot + LETTER_TALL], `Play name letter ${clicker.letters.length} of 10`);
  });
  // The street lamps, post and head.
  [[-STATUE.width - 580, 'lamp-left'], [110, 'lamp-right']].forEach(([x, id]) => clickHit('lamp', id, nameEnd, [x - 16, x + 48], [0, 328], `Switch the ${id === 'lamp-left' ? 'left' : 'right'} street lamp`));
  // The camp: the fire, the axe in its stump, the tent.
  clicker.fireHit = clickHit('fire', null, campX, [110, 238], [0, 140], 'Stoke the campfire');
  clickHit('axe', null, campX, [372, 424], [0, 104], 'Use the axe in the stump');
  clickHit('tent', null, campX, [-396, -208], [0, 150], 'Check the tent');
  // Each fingerpost arm, where it is drawn.
  document.querySelectorAll('.set--sign[data-sign]').forEach((set) => {
    const post = set.dataset.sign;
    const anchor = CLICK_POSTS[post];
    if (!anchor) return;
    set.querySelectorAll('.s-arm[data-arm]').forEach((el) => {
      const box = el.getBBox();
      const label = el.querySelector('.s-sign-text')?.textContent.trim() || '';
      const key = `${post}:${el.dataset.arm}`;
      clicker.arms[key] = {
        key, el, anchor, label: label.charAt(0) + label.slice(1).toLowerCase(),
        place: CLICK_PLACES[label],
        dir: el.style.transformOrigin.startsWith('0%') ? 1 : -1,
        y: -(box.y + box.height / 2),
      };
      clickHit('sign', key, anchor(), [box.x, box.x + box.width], [-(box.y + box.height), -box.y], `Travel to ${clicker.arms[key].label}`);
    });
  });
  // The pegboard's tools.
  Object.entries(CLICK_TOOL_BOX).forEach(([id, [x0, x1, y0, y1]]) => clickHit('tools', id, benchX, [x0, x1], [y0, y1], `Use the ${id} on the pegboard`));
  // The control room: its clock, and the three racks with their lights.
  clickHit('clock', null, skillsX, [96, 144], [380, 428], 'Turn the control-room clock');
  const circles = [...document.querySelectorAll('.set--lights circle')];
  [300, 392, 484].forEach((x0, r) => {
    clickHit('rack', r, skillsX, [x0, x0 + 84], [0, 322], `Activate server rack ${r + 1}`);
    const leds = circles.filter((c) => {
      const cx = Number(c.getAttribute('cx'));
      return cx >= x0 && cx <= x0 + 84;
    });
    const rows = [...new Set(leds.map((c) => Number(c.getAttribute('cy'))))].sort((a, b) => a - b);
    clicker.leds[r] = leds.map((el) => ({ el, row: rows.indexOf(Number(el.getAttribute('cy'))) }));
  });
  clicker.hands = {
    hour: document.querySelector('.s-hand--hour'),
    minute: document.querySelector('.s-hand--minute'),
  };
  // The woodpile as they left it.
  for (let i = 0; i < Math.min(memory.data.woodpile || 0, CLICK_SPARE_AT.length); i += 1) {
    document.querySelector(`.s-spare[data-spare="${i}"]`)?.classList.add('is-stacked');
  }
  clickCountBoard();
  if (memory.data.found?.stars) skyStars?.classList.add('is-found');
  if (clickGuideAction) clickGuideAction.textContent = window.matchMedia('(pointer: coarse)').matches ? 'tap' : 'click';
  clicker.built = true;
}

// Once the world is built (living.js, startLiving).
function startClickables() {
  document.fonts.ready.then(clickBuild);
}

document.addEventListener('click', (event) => {
  if (!clicker.built || !clicker.live) return;
  const star = event.target.closest?.('.sky-stars.is-wishable i');
  if (star) {
    clickPress('stars', String([...skyStars.children].indexOf(star)));
    return;
  }
  const hit = event.target.closest?.('.click-hit');
  if (hit && !hit.classList.contains('is-off')) clickPress(hit.dataset.click, hit.dataset.part);
});

// Enter or Space on a thing reached with Tab presses it. One clicked with
// the mouse keeps focus too, but then Space is his sprint, as it is after
// any click (keyFocus, script.js).
document.addEventListener('keydown', (event) => {
  const hit = event.target.closest?.('.click-hit');
  if (!hit || hit !== keyFocus || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  if (!event.repeat && clicker.built && clicker.live && !hit.classList.contains('is-off')) {
    clickPress(hit.dataset.click, hit.dataset.part);
  }
});

clickStarAccess?.addEventListener('click', () => {
  if (!clicker.built || !clicker.wishable) return;
  const stars = [...skyStars.children];
  const star = stars.find((el) => el.tagName === 'I' && !el.classList.contains('is-wished'));
  if (star) clickPress('stars', String(stars.indexOf(star)));
});

function clickHitAvailability() {
  clicker.hits.forEach((hit) => {
    const available = Boolean(clicker.live && !hit.classList.contains('is-off'));
    hit.tabIndex = available ? 0 : -1;
    hit.setAttribute('aria-disabled', String(!available));
  });
}

/* ---------------------------------------------------------- each frame */

// The clock's hands on the hour the sky shows; ticking while a click turns
// the day on, and chiming when it gets there.
function clickClockHands() {
  const h = wrapHour(skyClock.hour);
  const shown = h.toFixed(3);
  if (shown !== clicker.handsAt && clicker.hands?.hour) {
    clicker.handsAt = shown;
    clicker.hands.hour.style.transform = `rotate(${((h % 12) * 30).toFixed(1)}deg)`;
    clicker.hands.minute.style.transform = `rotate(${((h % 1) * 360).toFixed(1)}deg)`;
  }
  const turn = clicker.clockTurn;
  if (!turn) return;
  const half = Math.floor(h * 2);
  if (half !== turn.half && turn.ticks < 40) {
    turn.half = half;
    turn.ticks += 1;
    clickSound('clockTick', { vol: 0.14, vary: 0.05 }, () => sfx.hiss({ freq: 5000, q: 3, vol: 0.05, dur: 0.012, attack: 0.001 }));
  }
  if (skyClock.sweep) return;
  clicker.clockTurn = null;
  clickSound('clockChime', { vol: 0.24, vary: 0.01 }, () => sfx.chime());
  if (turn.heard) clickSay(CLICK_PART_LINES[turn.part], 2000);
}

// Each frame (living.js, livingPose).
function updateClickables() {
  if (!clicker.built) return;
  const now = performance.now();
  // Nothing takes clicks in the opening, or with the world faded away from
  // (at the bench, the terminal, the chalkboard).
  const shown = parseFloat(scene.style.getPropertyValue('--project-world-opacity') || '1') > 0.9;
  const live = !intro.active && !intro.release && shown;
  if (live !== clicker.live) {
    clicker.live = live;
    scene.classList.toggle('has-clicks', live);
    clickGuide?.classList.toggle('is-live', live);
    if (live && !clicker.guideAt) clicker.guideAt = now + 1400;
    clickHitAvailability();
  }
  // Give any welcome/ambient line time to finish fading before introducing
  // the discoveries note, so the visitor only has one message to read.
  if (live && !clicker.guidePrompted && !canSpeak()) clicker.guideAt = now + 350;
  if (live && !clicker.guidePrompted && !memory.data.clickGuideSeen && now >= clicker.guideAt && !openPanelId && canSpeak()) {
    clicker.guidePrompted = true;
    clickGuideOpen(true);
  }
  // The fire leaves its click to the About stop when that would take it.
  const fireOff = nearStop === campScene;
  if (fireOff !== clicker.fireOff) {
    clicker.fireOff = fireOff;
    clicker.fireHit?.classList.toggle('is-off', fireOff);
    clickHitAvailability();
  }
  // The stars, once there are any to see.
  const wishable = live && skyAt(skyClock.hour).stars > 0.45;
  if (wishable !== clicker.wishable) {
    clicker.wishable = wishable;
    skyStars?.classList.toggle('is-wishable', wishable);
    if (clickStarAccess) {
      clickStarAccess.hidden = !wishable;
      clickStarAccess.disabled = !wishable;
    }
  }
  clickClockHands();

  // What he's waiting to do until he's up off the floor.
  const later = clicker.later;
  if (later && !ambient.out && !state.hop) {
    clicker.later = null;
    if (isFree() && incident.phase === 'none' && !clicker.errand) later.fn();
  } else if (later && now > later.until) {
    clicker.later = null;
  }

  // Walked off on his way to something: it's dropped.
  const errand = clicker.errand;
  if (errand?.phase === 'travel' && state.destinationId !== 'clickable') clickErrandOver(errand, true);

  // An arm left spun round: he sees to it once he's free near it.
  const spun = clicker.spun;
  if (spun && !clicker.errand && !clicker.later && incident.phase === 'none' && isFree() && idle.quiet > 2.5 &&
      !ambient.act && !ambient.out && Math.abs(spun.anchor() - state.x) < sceneWidth * 1.2) {
    clickArmFix(spun);
  }

  // Once a visit, a minute in, if they've hardly clicked anything, he says
  // they can; for three visits at most.
  if (!clicker.nudged && now > 60e3 && idle.quiet > 6 && isFree() && canSpeak() && !ambient.act &&
      !clicker.errand && incident.phase === 'none' && clickFoundCount() < 2 && (memory.data.clickNudges || 0) < 3) {
    clicker.nudged = true;
    memory.data.clickNudges = (memory.data.clickNudges || 0) + 1;
    memory.save();
    remark(`<span>Most things round here do something</span><span>if you ${finePointer.matches ? 'click' : 'tap'} them.</span>`, 3400);
  }
}

/* --------------------------------------------------------- the terminal */

TERM_COMMANDS.found = () => {
  const ids = Object.keys(CLICK_THINGS);
  const got = ids.filter((id) => memory.data.found?.[id]);
  if (!got.length) {
    termSay(['nothing found yet.', ['most things out there do something if you click them.', 'dim']]);
    return;
  }
  termSay([
    `found ${got.length} of ${ids.length}:`,
    ...got.map((id) => `  ${CLICK_THINGS[id]}`),
    got.length < ids.length
      ? [`${ids.length - got.length} still to find. keep clicking.`, 'dim']
      : ['all of them. thanks for poking about!', 'dim'],
  ]);
};

TERM_COMMANDS.wishes = () => {
  const n = memory.data.wishes || 0;
  termSay(n
    ? [`${n} ${n === 1 ? 'wish' : 'wishes'} made on shooting stars.`, ['can\'t tell you what they were.', 'dim']]
    : ['no wishes yet.', ['click a star, one night.', 'dim']]);
};

// `ls found` as well as `found`.
const clickLs = TERM_COMMANDS.ls;
TERM_COMMANDS.ls = (args, line) => (args.some((a) => a.replace(/\/$/, '') === 'found') ? TERM_COMMANDS.found() : clickLs(args, line));
TERM_LISTED.push('found', 'wishes');

/* ------------------------------------------------------------ for testing */

window.alive.clicks = {
  state: clicker,
  // Clicks thing `id` (and `part` of it, as its click area names it),
  // without the pointer.
  press(id, part = null) {
    clickPress(id, part === null ? undefined : String(part));
  },
  found: () => ({ ...memory.data.found }),
  // Where on screen the click area for `id` (and `part`) is: its middle.
  at(id, part = null) {
    const selector = `.click-hit[data-click="${id}"]${part === null ? '' : `[data-part="${part}"]`}`;
    const box = document.querySelector(selector)?.getBoundingClientRect();
    return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2, w: box.width, h: box.height } : null;
  },
};
