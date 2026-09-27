/* ======================================================================
   Teleporting. A place on the navbar tapped twice in quick succession
   (clicked twice, with a mouse) and he teleports there instead of walking.
   The first tap sends him on his way as usual; the second, close behind
   it, has him stop and go by one of ten moves, then turn up at the stop,
   which opens as if he had walked. The moves come in a shuffled order,
   each once before any comes round again, and the order carries over
   between visits, so a visitor who keeps teleporting sees them all.

   Every move has the same three beats, and the engine (updateTeleport)
   runs them: `gather` while he pulls up and gets ready, `go` as he leaves
   (the world cuts to the stop at `cut` seconds in), and `arrive` at the
   stop, for `settle` seconds. A move lays its pose over his, sets how he's
   drawn (`c.look`: faded, squeezed, shifted, cut off above or below) and
   draws on two layers over the scene, in screen px (`c.back` under him,
   `c.front` over him). The camera keeps him in the middle of the screen,
   so where he leaves and where he lands are the same spot on it; moves
   that show the trip send something off one edge and bring it in from the
   other.

   The first time he runs somewhere far on a visit he says he can, until
   they have tried it. With motion reduced the first tap already puts him
   there, and none of this plays.

   Loaded after living.js, before script.js: like living.js, it only uses
   script.js's globals inside functions called later.
   ====================================================================== */

const TELEPORT_TAPS = 350; // ms between two taps that make a double tap
const TELEPORT_MIN = 1.2; // body heights: any nearer and he just walks
const TIP_AFTER = 0.8; // seconds into a run before he mentions it
const TIP_FAR = 6; // body heights still to go, for it to be worth mentioning
const TIP_VISITS = 3; // visits he mentions it on, if they never try it

const teleport = {
  phase: null, // 'wait' (clearing a stop first), 'focus', 'gone', 'appear'
  t: 0, // seconds into the phase
  id: null, // the move under way, a key of TELEPORT_MOVES
  move: null,
  c: null, // the move's working state (newContext)
  face: 1, // the way he faces on landing
  landing: false, // his landing asked for (soon)
  landed: false,
  landedFor: null, // the mark he was put down beside
  force: null, // for the tests: the move to use next
  lastTap: { button: null, at: 0 },
  tip: { said: false, running: 0, button: null, until: 0 },
};

const tpProps = {
  fingers: document.querySelector('.figure .prop-fingers'),
  aura: document.querySelector('.figure .prop-aura'),
  headband: document.querySelector('.figure .prop-headband'),
  tails: document.querySelector('.figure .prop-headband__tails'),
};

/* ------------------------------------------------------- the double tap */

// A click on a navbar place (script.js has already sent him there); the
// second on the same place within TELEPORT_TAPS makes it a teleport.
function navTapped(button) {
  const now = performance.now();
  const last = teleport.lastTap;
  const double = last.button === button && now - last.at < TELEPORT_TAPS;
  teleport.lastTap = double ? { button: null, at: 0 } : { button, at: now };
  if (double) startTeleport(button);
}

// Whether `id` is one of the navbar's places.
const isPlace = (id) => buttons.some((button) => button.dataset.poi === id);

function startTeleport(button) {
  if (livingReduced.matches || teleport.phase) return;
  // Already there (goTo let it be), or near enough to walk.
  if (state.destinationId !== button.dataset.poi) return;
  if (Math.abs(state.target - state.x) < TELEPORT_MIN * UNITS_TALL * view.unit) return;
  teleport.id = TELEPORT_MOVES[teleport.force] ? teleport.force : nextMove();
  teleport.force = null;
  teleport.move = TELEPORT_MOVES[teleport.id];
  teleport.phase = 'wait';
  teleport.t = 0;
  endTip();
}

// Whether he is clear of every stop's scene and of the opening, so free to
// go: up from the fire, back from the bench and the console, off the line.
function clearToGo() {
  return !intro.active && !intro.release && !openPanelId &&
    state.seat === 0 && state.compose === 0 && state.inspect === 0 && state.projectView === 0 &&
    state.benchAside === 0 && state.typeIn === 0 && state.termView === 0 && state.courseTime === 0 &&
    handcar.stage === 'off' && !state.jump && !state.hop && !state.experienceActive && !chalkBusy();
}

/* The moves still to come this round, shuffled, kept in memory so the
   round carries on next visit. A fresh round never opens with the move
   that closed the last. A move is only used up once he has gone by it:
   one called off (walked away from) comes up again next time. */
function teleportRound() {
  const ids = Object.keys(TELEPORT_MOVES);
  let round = Array.isArray(memory.data.teleportRound) ? memory.data.teleportRound.filter((id) => ids.includes(id)) : [];
  if (!round.length) {
    round = ids.slice();
    for (let i = round.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [round[i], round[j]] = [round[j], round[i]];
    }
    if (round.length > 1 && round[0] === memory.data.teleportLast) round.push(round.shift());
    memory.data.teleportRound = round;
    memory.save();
  }
  return round;
}

const nextMove = () => teleportRound()[0];

function useMove(id) {
  const round = teleportRound().filter((item) => item !== id);
  memory.data.teleportRound = round;
  memory.data.teleportLast = id;
  memory.data.teleportsSeen = { ...(memory.data.teleportsSeen || {}), [id]: true };
  memory.save();
}

/* ------------------------------------------------------------- the engine */

// Puts him down at his destination, just short of the mark (a stop opens
// on reaching it), facing the way the stop has him. Run from soon(), so
// the frame measures from here.
function teleportLand() {
  if (isPlace(state.destinationId)) {
    teleport.face = state.destinationId === experienceScene && TOWER_MODE ? Math.sign(state.target - state.x) || state.facing : 1;
    state.x = state.target - teleport.face * (ARRIVED + 1);
    memory.data.teleports = (memory.data.teleports || 0) + 1;
    memory.save();
  } else {
    teleport.face = state.facing; // walked off with the keys: he stays put
  }
  Object.assign(state, { speed: 0, moving: false, sprinting: false, skidding: false, turning: 0, strollUntil: 0 });
  state.facing = state.flip = teleport.face;
  teleport.landed = true;
  teleport.landedFor = state.target;
}

const freshLook = () => ({ opacity: 1, sx: 1, sy: 1, dx: 0, dy: 0, clipTop: 0, clipBottom: 0, scan: 0 });

// A move's working state for one teleport. `first(c, key)` is true the
// first time it's asked, for things that happen once (a sound, a flash).
function newContext(id) {
  return { id, dir: 1, at: null, look: freshLook(), shown: freshLook(), back: '', front: '', vignette: 0, data: {}, beats: new Set(), landed: false, now: 0, dt: 0 };
}

const first = (c, key) => {
  if (c.beats.has(key)) return false;
  c.beats.add(key);
  return true;
};

// How he's drawn besides his pose: faded, squeezed about his feet, shifted,
// cut off above clipTop or below clipBottom (px of his box), or striped.
function applyLook(l) {
  const style = figure.style;
  style.opacity = l.opacity >= 0.999 ? '' : Math.max(0, l.opacity).toFixed(2);
  style.scale = l.sx === 1 && l.sy === 1 ? '' : `${l.sx.toFixed(3)} ${l.sy.toFixed(3)}`;
  style.translate = l.dx || l.dy ? `${l.dx.toFixed(1)}px ${l.dy.toFixed(1)}px` : '';
  const top = Math.max(0, l.clipTop).toFixed(1);
  const bottom = Math.max(0, l.clipBottom).toFixed(1);
  style.clipPath = l.clipTop > 0 || l.clipBottom > 0
    ? `polygon(-60% ${top}px, 160% ${top}px, 160% calc(100% - ${bottom}px), -60% calc(100% - ${bottom}px))` : '';
  const mask = l.scan ? `repeating-linear-gradient(to bottom, #000 0 ${l.scan}px, transparent ${l.scan}px ${l.scan * 2}px)` : '';
  style.maskImage = mask;
  style.webkitMaskImage = mask;
  if (l.scan) style.maskPosition = style.webkitMaskPosition = `0 ${((performance.now() / 25) % (l.scan * 2)).toFixed(1)}px`;
}

// Where he is on screen, in the scene's px, as if nothing were shifting
// him: his middle, his feet, his height, which way he faces, the screen's
// size and where the navbar ends.
function tpAt() {
  const s = scene.getBoundingClientRect();
  const r = figure.getBoundingClientRect();
  const shown = teleport.c?.shown || freshLook();
  return {
    x: r.left + r.width / 2 - s.left - shown.dx,
    foot: r.bottom - s.top - shown.dy,
    h: UNITS_TALL * view.unit,
    unit: view.unit,
    f: state.facing,
    W: s.width,
    H: s.height,
    top: Math.max(0, nav.getBoundingClientRect().bottom - s.top),
  };
}

function endTeleport() {
  teleport.move?.end?.(teleport.c);
  Object.assign(teleport, { phase: null, landing: false, landed: false, c: null });
  figure.classList.remove('is-teleporting');
  applyLook(freshLook());
  tpProps.fingers?.setAttribute('opacity', '0');
  tpProps.aura?.setAttribute('opacity', '0');
  tpProps.headband?.setAttribute('opacity', '0');
  turnScene(null);
}

// Each frame, from livingPose: the teleport under way, and his pose with
// the move's laid over `p`.
function updateTeleport(p, dt, unit) {
  updateTip(dt, unit);
  const tp = teleport;
  if (!tp.phase) {
    if (tpFx.busy) paintFx(dt, null); // the last of the dust and dashes
    return p;
  }
  tp.t += dt;
  const bound = isPlace(state.destinationId);

  if (tp.phase === 'wait') {
    if (!bound) { endTeleport(); return p; }
    if (!clearToGo()) return p;
    tp.phase = 'focus';
    tp.t = 0;
    hushSpeech();
    figure.classList.add('is-teleporting');
    status.textContent = `Teleporting to ${state.label}`;
    tp.c = newContext(tp.id);
  }

  const move = tp.move;
  const c = tp.c;
  c.dt = dt;
  c.now = performance.now();
  c.look = freshLook();
  c.back = '';
  c.front = '';
  c.vignette = 0;
  c.landed = tp.landed;
  if (!(move.freeze && tp.phase !== 'focus' && c.at)) c.at = tpAt();
  let pose = p;

  if (tp.phase === 'focus') {
    // Walked off with the keys: he goes on foot.
    if (!bound) { endTeleport(); paintFx(dt, null); return p; }
    // He pulls up hard, into the move.
    const runPx = (GAITS.run.travel / RUN_CYCLE) * unit;
    state.speed = Math.max(0, state.speed - 4 * runPx * dt);
    c.dir = Math.sign(state.target - state.x) || state.facing;
    pose = move.gather(tp.t, pose, c) || pose;
    if (tp.t >= move.focus && state.speed === 0) {
      tp.phase = 'gone';
      tp.t = 0;
      useMove(tp.id);
    }
  }

  if (tp.phase === 'gone') {
    if (tp.t >= move.cut && !tp.landing) {
      tp.landing = true;
      soon(teleportLand);
    }
    if (tp.landed && tp.t >= move.cut + (move.gap ?? 0.1)) {
      tp.phase = 'appear';
      tp.t = 0;
    } else {
      pose = move.go(tp.t, pose, c) || pose;
    }
  }

  if (tp.phase === 'appear') {
    pose = move.arrive(tp.t, pose, c) || pose;
    if (tp.t >= move.settle) {
      // The last step onto the mark, and the stop opens as usual (unless
      // they have picked somewhere else meanwhile: he walks there).
      if (isPlace(state.destinationId) && state.target === tp.landedFor) soon(() => { state.x = state.target; });
      endTeleport();
      paintFx(dt, null);
      return pose;
    }
  }

  applyLook(c.look);
  c.shown = c.look;
  paintFx(dt, c);
  // Still or slowing: nothing else moves him until he is there.
  ambient.pinned = 1;
  return pose;
}

/* --------------------------------------------------- drawing over the scene
   Two svgs laid over the scene in its px: one under him (with the focus
   lines' clip, the darkening's gradient and the checkerboard), and one
   over him, just after him so the sky's wash still falls on it. The move
   draws into them each frame; the dust, dashes and crumbs (`tpFx.bits`)
   carry on by themselves until they've settled. */

const tpFx = { els: null, bits: [], busy: false, lines: [], rollAt: 0 };

function fxLayers() {
  if (tpFx.els) return tpFx.els;
  const make = (cls) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `teleport-fx ${cls}`);
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  };
  const back = make('teleport-fx--back');
  back.innerHTML = '<defs>'
    + '<radialGradient id="teleport-vignette" gradientUnits="userSpaceOnUse"><stop offset="0.3" stop-color="#20201f" stop-opacity="0"/><stop offset="1" stop-color="#20201f" stop-opacity="0.34"/></radialGradient>'
    + '<radialGradient id="teleport-glow"><stop offset="0" stop-color="#fff4d6" stop-opacity="0.95"/><stop offset="0.55" stop-color="#d8892f" stop-opacity="0.5"/><stop offset="1" stop-color="#d8892f" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="teleport-column" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8892f" stop-opacity="0"/><stop offset="0.55" stop-color="#d8892f" stop-opacity="0.26"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0.6"/></linearGradient>'
    + '<clipPath id="teleport-below-nav"><rect class="teleport-fx__room" x="-9999" y="0" width="99999" height="99999"/></clipPath>'
    + '<pattern id="teleport-checker" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#f7f5f0"/><rect width="6" height="6" fill="#d9d5cc"/><rect x="6" y="6" width="6" height="6" fill="#d9d5cc"/></pattern>'
    + '</defs><rect class="teleport-fx__vignette" width="100%" height="100%" fill="url(#teleport-vignette)" opacity="0"/><g class="teleport-fx__draw"></g>';
  const front = make('teleport-fx--front');
  front.innerHTML = '<g class="teleport-fx__draw"></g>';
  scene.append(back);
  figure.after(front);
  tpFx.els = {
    back: back.querySelector('.teleport-fx__draw'), front: front.querySelector('.teleport-fx__draw'),
    room: back.querySelector('.teleport-fx__room'), vignette: back.querySelector('.teleport-fx__vignette'),
    grad: back.querySelector('#teleport-vignette'), backHtml: '', frontHtml: '',
  };
  return tpFx.els;
}

const n1 = (v) => v.toFixed(1);
const n2 = (v) => v.toFixed(2);
// How far t is from a to b, 0..1.
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const easeIn = (k) => k * k;
// Up over a..a+rise, down over b-fall..b.
const hump = (t, a, b, rise, fall) => ease(span(t, a, a + rise)) * (1 - ease(span(t, b - fall, b)));

function paintFx(dt, c) {
  const els = fxLayers();
  let back = c ? c.back : '';
  let front = c ? c.front : '';
  // The bits flying about: dashes (ink or amber) that slow and shorten,
  // and crumbs that fall and lie on the floor, fading.
  tpFx.bits = tpFx.bits.filter((b) => {
    b.age += dt;
    if (b.age >= b.life) return false;
    if (b.kind === 'crumb') {
      b.vy += b.g * dt;
      b.x += b.vx * dt;
      b.y = Math.min(b.floor, b.y + b.vy * dt);
      if (b.y >= b.floor) { b.vx = 0; b.vy = 0; }
      const s = b.size;
      const o = 1 - span(b.age, b.life * 0.7, b.life);
      const svg = `<rect class="tp-solid" x="${n1(b.x - s)}" y="${n1(b.y - s * 0.6)}" width="${n1(2 * s)}" height="${n1(s * 1.2)}" opacity="${n2(0.7 * o)}"/>`;
      if (b.layer === 'front') front += svg; else back += svg;
      return true;
    }
    const drag = Math.exp(-4 * dt);
    b.vx *= drag;
    b.vy *= drag;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const tail = 0.07 * (1 - b.age / b.life);
    const svg = `<path class="${b.kind === 'spark' ? 'tp-amber-line' : 'tp-ink'}" stroke-width="${n1(b.width)}" d="M${n1(b.x)} ${n1(b.y)}l${n1(-b.vx * tail)} ${n1(-b.vy * tail)}"/>`;
    if (b.layer === 'front') front += svg; else back += svg;
    return true;
  });
  if (els.backHtml !== back) { els.back.innerHTML = back; els.backHtml = back; }
  if (els.frontHtml !== front) { els.front.innerHTML = front; els.frontHtml = front; }
  const vignette = c ? c.vignette : 0;
  if (vignette > 0.01 && c.at) {
    els.grad.setAttribute('cx', n1(c.at.x));
    els.grad.setAttribute('cy', n1(c.at.foot - 0.55 * c.at.h));
    els.grad.setAttribute('r', n1(Math.hypot(c.at.W, c.at.H) * 0.7));
  }
  els.vignette.setAttribute('opacity', n2(vignette));
  if (c?.at) els.room.setAttribute('y', n1(c.at.top));
  tpFx.busy = Boolean(teleport.phase || tpFx.bits.length);
}

// `n` dashes bursting from (x, y), up and to the sides.
function burst(n, x, y, h, { kind = 'dash', layer = 'back', speed = 1.4 } = {}) {
  for (let i = 0; i < n; i += 1) {
    const a = -Math.PI / 2 + ((i + Math.random() * 0.6) / n - 0.5) * Math.PI * 1.5;
    const v = h * (speed + Math.random() * 1.4);
    tpFx.bits.push({ kind, layer, x: x + (Math.random() - 0.5) * h * 0.2, y: y + (Math.random() - 0.5) * h * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 0.35 + Math.random() * 0.3, width: Math.max(1.4, h * 0.008) });
  }
  tpFx.busy = true;
}

// A crumb of eraser falling from (x, y) to the floor at `floor`.
function crumb(x, y, h, floor, life) {
  tpFx.bits.push({ kind: 'crumb', layer: 'front', x, y, vx: (Math.random() - 0.5) * h * 0.5, vy: -h * 0.2 * Math.random(), g: h * 5, floor, age: 0, life, size: h * (0.008 + Math.random() * 0.006) });
  tpFx.busy = true;
}

// Something in the world at world px `x`, that goes when its animation ends.
function worldMark(className, x) {
  const el = document.createElement('span');
  el.className = className;
  el.style.left = `${x.toFixed(1)}px`;
  world.append(el);
  el.addEventListener('animationend', (event) => { if (event.target === el) el.remove(); });
  window.setTimeout(() => el.remove(), 4000); // in case the animation never runs
}

// A flash of the whole screen, over everything, sky and all, a moment
// after the bolt that makes it.
function screenFlash() {
  const el = document.createElement('div');
  el.className = 'teleport-screenflash';
  el.style.animationDelay = '60ms';
  scene.append(el);
  el.addEventListener('animationend', () => el.remove());
  window.setTimeout(() => el.remove(), 1000);
}

// His near hand on screen, in the scene's px.
function handOnScreen() {
  const r = figure.querySelector('.arm--near .hand').getBoundingClientRect();
  const s = scene.getBoundingClientRect();
  return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top };
}

// A point on screen as rig units (x forward, y down), to aim a hand at.
const toRig = (at, x, y) => [70 + ((x - at.x) * at.f) / at.unit, 242 - (at.foot - y) / at.unit];

// A small label on a paper pill, centred on x.
function tag(x, y, text, o, h) {
  const size = Math.max(11, h * 0.06);
  const w = text.length * size * 0.62 + size * 1.4;
  return `<g opacity="${n2(o)}"><rect class="tp-paper" stroke-width="1.5" x="${n1(x - w / 2)}" y="${n1(y - size * 1.2)}" width="${n1(w)}" height="${n1(size * 1.8)}" rx="${n1(size * 0.6)}"/>`
    + `<text class="tp-text" font-size="${n1(size)}" x="${n1(x)}" y="${n1(y + size * 0.1)}" text-anchor="middle">${text}</text></g>`;
}

/* ----------------------------------------------------------------- sounds */

const tpSound = {
  hum() {
    sfx.tone(180, { to: 360, vol: 0.05, dur: 0.8, attack: 0.3 });
    sfx.tone(90, { type: 'sawtooth', to: 130, vol: 0.018, dur: 0.8, attack: 0.3 });
    sfx.hiss({ freq: 3000, to: 5200, q: 3, vol: 0.02, dur: 0.7, attack: 0.3 });
  },
  lock() {
    sfx.tone(1760, { vol: 0.045, dur: 0.3 });
    sfx.tone(2637, { vol: 0.03, dur: 0.35, at: 0.06 });
  },
  zipUp() {
    sfx.tone(480, { to: 3000, vol: 0.1, dur: 0.11, attack: 0.004 });
    sfx.hiss({ type: 'highpass', freq: 2500, to: 8000, vol: 0.07, dur: 0.12, attack: 0.002 });
  },
  zipDown() {
    sfx.tone(3000, { to: 600, vol: 0.09, dur: 0.13, attack: 0.004 });
    sfx.tone(110, { to: 45, vol: 0.14, dur: 0.3, at: 0.05 });
    sfx.hiss({ type: 'lowpass', freq: 900, vol: 0.08, dur: 0.25, at: 0.05, attack: 0.01 });
  },
  flick() {
    sfx.hiss({ freq: 1800, to: 700, q: 1.5, vol: 0.12, dur: 0.14, attack: 0.02 });
  },
  pop() {
    sfx.tone(190, { type: 'triangle', to: 55, vol: 0.18, dur: 0.14 });
    sfx.hiss({ type: 'lowpass', freq: 1400, to: 500, vol: 0.14, dur: 0.6, attack: 0.01 });
  },
  beam(up) {
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => {
      const k = up ? i : 7 - i;
      sfx.tone(1100 + k * 190, { vol: 0.025, dur: 0.22, at: i * 0.09, attack: 0.03 });
    });
    sfx.hiss({ type: 'highpass', freq: 5000, vol: 0.03, dur: 0.9, attack: 0.25 });
  },
  thunder() {
    sfx.hiss({ type: 'highpass', freq: 2500, vol: 0.2, dur: 0.07, attack: 0.001 });
    sfx.hiss({ type: 'lowpass', freq: 420, to: 110, vol: 0.4, dur: 1.4, at: 0.03, attack: 0.02 });
    sfx.tone(70, { type: 'sawtooth', to: 36, vol: 0.06, dur: 0.8, at: 0.03 });
  },
  rub(dur) {
    for (let at = 0; at < dur; at += 0.11) sfx.hiss({ freq: 1300 + Math.random() * 500, q: 2, vol: 0.07, dur: 0.07, at, attack: 0.01 });
  },
  scratch(dur) {
    for (let at = 0; at < dur; at += 0.07) sfx.hiss({ type: 'highpass', freq: 3500 + Math.random() * 2500, vol: 0.035, dur: 0.035, at: at + Math.random() * 0.03, attack: 0.003 });
  },
  slap() {
    sfx.tap(0.45);
    sfx.hiss({ type: 'lowpass', freq: 1200, vol: 0.12, dur: 0.08, attack: 0.002 });
  },
  slideDown() {
    sfx.tone(1500, { to: 280, vol: 0.06, dur: 0.45, attack: 0.02 });
  },
  slideUp() {
    sfx.tone(300, { to: 1500, vol: 0.06, dur: 0.32, attack: 0.02 });
    sfx.tone(900, { type: 'triangle', to: 1300, vol: 0.08, dur: 0.06, at: 0.3 });
  },
  snip() {
    sfx.hiss({ type: 'highpass', freq: 5000, vol: 0.1, dur: 0.05, attack: 0.001 });
    sfx.tone(2400, { type: 'square', vol: 0.02, dur: 0.02 });
  },
  blip(k) {
    sfx.tone(520 + 900 * k, { type: 'triangle', vol: 0.03, dur: 0.04 });
  },
};

/* ------------------------------------------------------------ the moves' parts */

// Two fingers to his forehead (and his ki showing, `aura` 0..1).
function fingersUp(p, hand, aura = 0) {
  if (hand > 0) {
    p.lean = mix(p.lean, 2, hand);
    aimArm(p, 'near', 102, 33, hand);
  }
  tpProps.fingers?.setAttribute('opacity', hand > 0.6 ? '1' : '0');
  tpProps.aura?.setAttribute('opacity', n2(aura));
  return p;
}

// Manga focus lines closing in on him, `o` of the way in, their inner ends
// pushed out by `spread`; a fresh set every 70 ms so they crackle.
function focusLines(c, o, spread) {
  if (o <= 0.01) return;
  const at = c.at;
  if (c.now > tpFx.rollAt) {
    tpFx.rollAt = c.now + 70;
    tpFx.lines = Array.from({ length: 48 }, (_, i) => ({ a: ((i + Math.random() * 0.8) / 48) * 2 * Math.PI, r: 1.15 + Math.random() * 0.9, w: 2 + Math.random() * 6 }));
  }
  const far = Math.hypot(at.W, at.H);
  const cx = at.x;
  const cy = at.foot - 0.55 * at.h;
  let d = '';
  for (const l of tpFx.lines) {
    const r = l.r * at.h * spread;
    const da = l.w / far;
    d += `M${n1(cx + Math.cos(l.a) * r)} ${n1(cy + Math.sin(l.a) * r)}`
      + `L${n1(cx + Math.cos(l.a - da) * far)} ${n1(cy + Math.sin(l.a - da) * far)}`
      + `L${n1(cx + Math.cos(l.a + da) * far)} ${n1(cy + Math.sin(l.a + da) * far)}Z`;
  }
  c.back += `<path class="tp-solid" clip-path="url(#teleport-below-nav)" opacity="${n2(0.55 * o)}" d="${d}"/>`;
  c.vignette = Math.max(c.vignette, o);
}

// Locking on, `k` (0..1) through: two rings rippling off his forehead, and
// a line racing along the floor the way he's going.
function lockOn(c, k) {
  if (k < 0 || k >= 1) return;
  const at = c.at;
  const hy = at.foot - 0.9 * at.h;
  const circle = (r) => (r > 0 ? `M${n1(at.x - r)} ${n1(hy)}a${n1(r)} ${n1(r)} 0 1 0 ${n1(2 * r)} 0a${n1(r)} ${n1(r)} 0 1 0 ${n1(-2 * r)} 0` : '');
  c.back += `<path class="tp-ink" stroke-width="${n2(0.6 + 1.6 * (1 - k))}" opacity="${n2(0.8 * (1 - k))}" d="${circle(at.h * (0.08 + 1.5 * easeOut(k))) + circle(at.h * 1.1 * easeOut(clamp(k * 1.3 - 0.3, 0, 1)))}"/>`;
  const reach = at.W * 0.62;
  const head = at.x + c.dir * reach * easeOut(clamp(k * 1.4, 0, 1));
  const tail = at.x + c.dir * reach * easeOut(clamp(k * 1.4 - 0.35, 0, 1));
  c.back += `<path class="tp-ink" stroke-width="2" opacity="${n2(1 - k * k)}" d="M${n1(tail)} ${n1(at.foot - 1)}L${n1(head)} ${n1(at.foot - 1)}"/>`;
}

// The screen rushing past the way he went, `k` (0..1) through.
function rushLines(c, k) {
  if (k < 0 || k >= 1) return;
  const at = c.at;
  if (!c.data.rush) c.data.rush = Array.from({ length: 14 }, () => ({ x: Math.random() * at.W * 1.6 - at.W * 0.3, y: 0.12 + Math.random() * 0.8, len: 0.15 + Math.random() * 0.4 }));
  let d = '';
  for (const l of c.data.rush) d += `M${n1(l.x - c.dir * at.W * 1.2 * k)} ${n1(l.y * at.H)}h${n1(-c.dir * l.len * at.W)}`;
  c.back += `<path class="tp-ink" stroke-width="1.6" opacity="${n2(0.5 * (1 - k))}" d="${d}"/>`;
}

// Blinking out (k 0 to 1) or in (1 to 0): drawn in to a line, flickering.
function blinkLook(look, k, t) {
  const flicker = Math.floor(t / 0.03) % 2 ? 0.3 : 1;
  look.opacity = k >= 1 ? 0 : k <= 0 ? 1 : flicker * (1 - 0.4 * k);
  look.sx = mix(1, 0.06, k);
  look.sy = mix(1, 1.15, k);
}

// A cloud of smoke round him, `age` seconds after it went off.
const PUFFS = [[-0.3, 0.06, 0.14], [0.3, 0.05, 0.14], [-0.16, 0.2, 0.17], [0.17, 0.19, 0.17], [0, 0.33, 0.19], [-0.23, 0.45, 0.15], [0.23, 0.46, 0.15], [0, 0.55, 0.2], [-0.08, 0.68, 0.16], [0.1, 0.78, 0.15], [-0.1, 0.9, 0.13], [0.05, 1.0, 0.12]];
function smokeCloud(c, age, size = 1) {
  if (age < 0 || age > 1.5) return '';
  const at = c.at;
  const grow = easeOut(clamp(age / 0.16, 0, 1));
  const fade = 1 - ease(span(age, 0.5, 1.5));
  let out = '';
  for (const [ox, oy, r] of PUFFS) {
    out += `<circle class="tp-smoke" stroke-width="1.5" cx="${n1(at.x + ox * at.h * (1 + 0.4 * age) * size)}" cy="${n1(at.foot - oy * at.h * (0.35 + 0.65 * grow) - 0.15 * at.h * age)}" r="${n1(r * at.h * (0.35 + 0.65 * grow) * (1 + 0.3 * age) * size)}" opacity="${n2(fade)}"/>`;
  }
  return out;
}

// The headband from the ninja run, its tails flying.
function headbandOn(o, now) {
  if (!tpProps.headband) return;
  tpProps.headband.setAttribute('opacity', n2(o));
  const f = now / 45;
  tpProps.tails?.setAttribute('d', `M48 26Q39 ${n1(24 + 3 * Math.sin(f))} 29 ${n1(25 + 5 * Math.sin(f + 0.8))}`
    + `M48 29Q40 ${n1(31 + 3 * Math.sin(f + 1.3))} 31 ${n1(35 + 5 * Math.sin(f + 2))}`);
}

// A column of light over him, `o` strong, `grow` of its width.
function column(c, o, grow) {
  if (o <= 0.01) return '';
  const at = c.at;
  const w = at.h * 0.46 * mix(0.2, 1, grow);
  return `<rect fill="url(#teleport-column)" x="${n1(at.x - w / 2)}" y="${n1(at.top)}" width="${n1(w)}" height="${n1(at.foot - at.top)}" opacity="${n2(o)}"/>`
    + `<ellipse class="tp-amber" cx="${n1(at.x)}" cy="${n1(at.foot)}" rx="${n1(w * 0.55)}" ry="${n1(at.h * 0.02)}" opacity="${n2(0.7 * o)}"/>`;
}

// Sparkles rising through the column.
function sparkles(c, t, o) {
  if (o <= 0.01) return '';
  const at = c.at;
  let out = '';
  for (let i = 0; i < 20; i += 1) {
    const ph = (t * 0.8 + i / 20) % 1;
    const tw = 0.5 + 0.5 * Math.sin(t * 17 + i * 1.7);
    out += `<circle class="tp-amber" cx="${n1(at.x + at.h * 0.17 * Math.sin(i * 2.3))}" cy="${n1(at.foot - at.h * (0.04 + 1.2 * ph))}" r="${n1(at.h * (i % 4 ? 0.007 : 0.012))}" opacity="${n2(o * tw)}"/>`;
  }
  return out;
}

// A lightning bolt onto him, `age` seconds in, flickering.
function bolt(c, age) {
  if (age < 0 || age > 0.26 || (age > 0.08 && Math.floor(age / 0.04) % 2)) return '';
  const at = c.at;
  const h = at.h;
  const pts = [[0.3, at.top], [-0.12, 0.62], [0.1, 0.56], [-0.1, 0.36], [0.08, 0.3], [0, 0]];
  const d = pts.map(([dx, y], i) => `${i ? 'L' : 'M'}${n1(at.x + dx * h)} ${n1(i ? at.foot - y * (at.foot - at.top) : y)}`).join('');
  return `<path class="tp-amber-line" stroke-width="${n1(h * 0.05)}" opacity="0.35" d="${d}"/>`
    + `<path class="tp-amber-line" stroke-width="${n1(h * 0.018)}" d="${d}"/>`
    + `<path class="tp-core" stroke-width="${n1(Math.max(1, h * 0.006))}" d="${d}"/>`;
}

// A pencil with its point (or its eraser) at (x, y), leaning `angle`, `len` long.
function pencil(x, y, angle, end, len, o = 1) {
  const w = len * 0.11;
  const sw = Math.max(1.3, len * 0.012);
  const shape = end === 'tip'
    ? `<path class="tp-paper" d="M0 0L${n1(-w / 2)} ${n1(-len * 0.13)}H${n1(w / 2)}Z"/><path class="tp-solid" d="M0 0L${n1(-w * 0.18)} ${n1(-len * 0.045)}H${n1(w * 0.18)}Z"/>`
      + `<rect class="tp-paper" x="${n1(-w / 2)}" y="${n1(-len * 0.82)}" width="${n1(w)}" height="${n1(len * 0.69)}"/>`
      + `<rect class="tp-paper" x="${n1(-w * 0.53)}" y="${n1(-len * 0.9)}" width="${n1(w * 1.06)}" height="${n1(len * 0.08)}"/>`
      + `<rect class="tp-amber" x="${n1(-w / 2)}" y="${n1(-len)}" width="${n1(w)}" height="${n1(len * 0.1)}" rx="${n1(w * 0.2)}"/>`
    : `<rect class="tp-amber" x="${n1(-w / 2)}" y="${n1(-len * 0.1)}" width="${n1(w)}" height="${n1(len * 0.1)}" rx="${n1(w * 0.2)}"/>`
      + `<rect class="tp-paper" x="${n1(-w * 0.53)}" y="${n1(-len * 0.18)}" width="${n1(w * 1.06)}" height="${n1(len * 0.08)}"/>`
      + `<rect class="tp-paper" x="${n1(-w / 2)}" y="${n1(-len * 0.87)}" width="${n1(w)}" height="${n1(len * 0.69)}"/>`
      + `<path class="tp-paper" d="M${n1(-w / 2)} ${n1(-len * 0.87)}L0 ${n1(-len)}L${n1(w / 2)} ${n1(-len * 0.87)}Z"/>`;
  return `<g opacity="${n2(o)}" stroke-width="${n1(sw)}" transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(angle)})">${shape}</g>`;
}

// A door drawn on screen: its box, `draw` of its frame inked, `open` of the
// way open onto black, faded to `o`, hung on the side `hinge` (-1 or 1).
function inkDoor(d, draw, open, o, hinge) {
  if (o <= 0.01 || draw <= 0) return '';
  const sw = n1(Math.max(1.8, (d.b - d.t) * 0.012));
  let out = `<g opacity="${n2(o)}">`;
  if (open > 0) out += `<rect class="tp-solid" x="${n1(d.l)}" y="${n1(d.t)}" width="${n1(d.r - d.l)}" height="${n1(d.b - d.t)}" opacity="${n2(0.88 * open)}"/>`;
  if (draw >= 1) {
    const w = (d.r - d.l) * (1 - 0.84 * open);
    const px = hinge > 0 ? d.r - w : d.l;
    out += `<rect class="tp-paper" stroke-width="${sw}" x="${n1(px)}" y="${n1(d.t)}" width="${n1(w)}" height="${n1(d.b - d.t)}"/>`;
    if (open < 0.5) out += `<circle class="tp-solid" cx="${n1(hinge > 0 ? px + w * 0.14 : px + w * 0.86)}" cy="${n1(mix(d.t, d.b, 0.52))}" r="${n1((d.r - d.l) * 0.04)}"/>`;
  }
  out += `<path class="tp-ink" stroke-width="${sw}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${n2(1 - draw)}" d="M${n1(d.l)} ${n1(d.b)}V${n1(d.t)}H${n1(d.r)}V${n1(d.b)}"/></g>`;
  return out;
}

// Where a hand tracing a door's frame is, `k` of the way round.
function onDoor(d, k) {
  const up = d.b - d.t;
  const across = d.r - d.l;
  const at = k * (2 * up + across);
  if (at < up) return { x: d.l, y: d.b - at };
  if (at < up + across) return { x: d.l + (at - up), y: d.t };
  return { x: d.r, y: d.t + (at - up - across) };
}

// The door in front of him (side 1) or behind him (-1).
function doorBox(at, side) {
  const cx = at.x + side * at.f * 0.28 * at.h;
  return { l: cx - 0.18 * at.h, r: cx + 0.18 * at.h, t: at.foot - 0.8 * at.h, b: at.foot };
}

// One step forward, for walking into and out of a door.
const TP_STEP = [
  { at: 0 },
  { at: 0.3, lean: 5, near: { foot: [98, 236] } },
  { at: 0.6, lean: 4, near: { foot: [92, 242] }, far: { foot: [80, 236] } },
  { at: 1 },
];

// Turning the page: the whole scene swings about its left edge (`side`
// 'left', up off the desk) or its right (coming down), `deg` over; null
// puts it back.
function turnScene(side, deg = 0) {
  if (!side) {
    if (scene.style.transform) {
      scene.style.transform = '';
      scene.style.transformOrigin = '';
      scene.style.backfaceVisibility = '';
      document.documentElement.classList.remove('is-page-turning');
    }
    return;
  }
  document.documentElement.classList.add('is-page-turning');
  scene.style.transformOrigin = side === 'left' ? '0 50%' : '100% 50%';
  scene.style.backfaceVisibility = 'hidden';
  scene.style.transform = `perspective(1800px) rotateY(${deg.toFixed(1)}deg)`;
}

// Where the selection box round him is.
function marquee(at) {
  return { l: at.x - 0.22 * at.h, r: at.x + 0.22 * at.h, t: at.foot - 1.06 * at.h, b: at.foot + 0.02 * at.h };
}

function marqueeSVG(m, dx, o, now) {
  if (o <= 0.01) return '';
  return `<rect class="tp-ink tp-ants" stroke-width="1.5" x="${n1(m.l + dx)}" y="${n1(m.t)}" width="${n1(m.r - m.l)}" height="${n1(m.b - m.t)}" stroke-dashoffset="${n1(-now / 40)}" opacity="${n2(o)}"/>`;
}

function cursorSVG(x, y, h) {
  const s = Math.max(1.1, h / 150);
  return `<path class="tp-cursor" stroke-width="${n1(1.2 / s)}" transform="translate(${n1(x)} ${n1(y)}) scale(${n2(s)})" d="M0 0L0 14L3.6 10.6L6.2 16.4L8.4 15.4L5.8 9.8L10.6 9.8Z"/>`;
}

// Him as points along his limbs and round his head, on screen, top first.
function sampleFigure() {
  const s = scene.getBoundingClientRect();
  const out = [];
  const add = (pt) => out.push({ x: pt.x - s.left, y: pt.y - s.top });
  for (const el of figure.querySelectorAll('.leg__thigh > path, .leg__shin > path, .arm__upper > path, .arm__fore > path, .torso > path')) {
    const m = el.getScreenCTM();
    if (!m) continue;
    const len = el.getTotalLength();
    const steps = Math.max(2, Math.round((len * view.unit) / 7));
    for (let i = 0; i <= steps; i += 1) add(el.getPointAtLength((len * i) / steps).matrixTransform(m));
  }
  const head = figure.querySelector('.torso > circle');
  const m = head?.getScreenCTM();
  if (m) {
    const cx = head.cx.baseVal.value;
    const cy = head.cy.baseVal.value;
    const r = head.r.baseVal.value;
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * 2 * Math.PI;
      add(new DOMPoint(cx + r * Math.cos(a), cy + r * Math.sin(a)).matrixTransform(m));
    }
  }
  return out.sort((a, b) => a.y - b.y);
}

/* ------------------------------------------------------------- the ten moves */

const TELEPORT_MOVES = {
  // Two fingers to his forehead: focus lines close in, short strokes rise
  // round him and he locks on; he squeezes to a line and zips away in a
  // burst of dashes, and drops in at the stop with a ring of air and dust.
  transmission: {
    name: 'Instant Transmission', focus: 0.75, cut: 0.3, gap: 0.14, settle: 0.95,
    gather(t, p, c) {
      if (first(c, 'hum')) tpSound.hum();
      focusLines(c, ease(span(t, 0.12, 0.52)), 1);
      if (t >= 0.38 && first(c, 'lock')) { tpSound.lock(); c.data.lockAt = c.now; }
      if (c.data.lockAt) lockOn(c, (c.now - c.data.lockAt) / 500);
      return fingersUp(p, ease(span(t, 0, 0.3)), ease(span(t, 0.1, 0.45)));
    },
    go(t, p, c) {
      const at = c.at;
      if (first(c, 'out')) {
        tpSound.zipUp();
        worldMark('teleport-line', state.x);
        burst(16, at.x, at.foot - 0.5 * at.h, at.h);
      }
      const k = span(t, 0, 0.12);
      blinkLook(c.look, k, t);
      const spread = ease(span(t, 0, 0.24));
      focusLines(c, 1 - spread, 1 + 1.8 * spread);
      if (c.data.lockAt) lockOn(c, (c.now - c.data.lockAt) / 500);
      if (c.landed) {
        if (first(c, 'rush')) c.data.rushAt = c.now;
        rushLines(c, (c.now - c.data.rushAt) / 160);
      }
      return fingersUp(p, 1, 1 - k);
    },
    arrive(t, p, c) {
      const at = c.at;
      if (first(c, 'in')) {
        tpSound.zipDown();
        worldMark('teleport-line teleport-line--in', state.x);
        worldMark('teleport-ring', state.x);
        spawnDust(state.x - 12 * at.unit, -1, at.unit, { count: 6, power: 1.4 });
        spawnDust(state.x + 12 * at.unit, 1, at.unit, { count: 6, power: 1.4 });
        burst(12, at.x, at.foot - 0.5 * at.h, at.h);
      }
      if (c.data.rushAt) rushLines(c, (c.now - c.data.rushAt) / 160);
      blinkLook(c.look, 1 - span(t, 0, 0.14), t);
      return fingersUp(p, 1 - ease(span(t, 0.5, 0.9)), t < 0.2 ? 1 : 1 - ease(span(t, 0.2, 0.65)));
    },
  },

  // A pellet flicked at his feet: a cloud of smoke, and the world changes
  // round it. It clears on him crouched at the stop, headband tails flying.
  smoke: {
    name: 'Smoke bomb', focus: 0.55, cut: 0.34, gap: 0.08, settle: 1.3,
    gather(t, p, c) {
      const at = c.at;
      aimArm(p, 'near', 82, 140, hump(t, 0, 0.34, 0.16, 0.1));
      aimArm(p, 'near', 110, 176, hump(t, 0.24, 0.58, 0.12, 0.12));
      if (t >= 0.34) {
        if (first(c, 'pellet')) { tpSound.flick(); c.data.from = handOnScreen(); c.data.at = t; }
        const k = span(t, c.data.at, c.data.at + 0.14);
        if (k < 1) c.front += `<circle class="tp-solid" cx="${n1(mix(c.data.from.x, at.x + at.f * 0.2 * at.h, k))}" cy="${n1(mix(c.data.from.y, at.foot - 0.02 * at.h, k * k))}" r="${n1(at.h * 0.022)}"/>`;
      }
      return p;
    },
    go(t, p, c) {
      if (first(c, 'pop')) { tpSound.pop(); c.data.puff = c.now; }
      c.look.opacity = t < 0.07 ? 1 : 0;
      c.front += smokeCloud(c, (c.now - c.data.puff) / 1000);
      return p;
    },
    arrive(t, p, c) {
      if (first(c, 'pop2')) { tpSound.pop(); c.data.puff2 = c.now; }
      c.front += smokeCloud(c, (c.now - c.data.puff) / 1000) + smokeCloud(c, (c.now - c.data.puff2) / 1000, 1.1);
      headbandOn(1 - ease(span(t, 1.0, 1.25)), c.now);
      const w = 1 - ease(span(t, 0.6, 1.0));
      return w > 0 ? mixPose(p, crouchPose(p, 44), w) : p;
    },
  },

  // A column of light drops over him and he fades out through it in
  // stripes, sparkles rising; the same column fades him in at the stop.
  beam: {
    name: 'Beam me up', focus: 0.3, cut: 1.0, gap: 0.05, settle: 1.15,
    gather() {},
    go(t, p, c) {
      if (first(c, 'out')) tpSound.beam(false);
      const o = ease(span(t, 0, 0.2)) * (1 - ease(span(t, 0.8, 1.0)));
      c.back += column(c, o, ease(span(t, 0, 0.2)));
      c.front += sparkles(c, t, o);
      c.look.opacity = 1 - ease(span(t, 0.2, 0.85));
      c.look.scan = t > 0.12 ? Math.max(2, Math.round(c.at.h * 0.012)) : 0;
      return p;
    },
    arrive(t, p, c) {
      if (first(c, 'in')) tpSound.beam(true);
      const o = ease(span(t, 0, 0.2)) * (1 - ease(span(t, 0.85, 1.1)));
      c.back += column(c, o, ease(span(t, 0, 0.2)));
      c.front += sparkles(c, t, o);
      c.look.opacity = ease(span(t, 0.2, 0.8));
      c.look.scan = t < 0.85 ? Math.max(2, Math.round(c.at.h * 0.012)) : 0;
      return p;
    },
  },

  // He looks up; a bolt cracks down onto him and the screen flashes,
  // leaving a scorch mark and a curl of smoke. A second bolt at the stop,
  // and he's there, down on one knee, then stands.
  lightning: {
    name: 'Lightning strike', focus: 0.45, cut: 0.4, gap: 0.1, settle: 1.05,
    gather(t, p, c) {
      p.lean -= 9 * ease(span(t, 0.05, 0.3));
      c.vignette = 0.6 * ease(span(t, 0.05, 0.4));
      return p;
    },
    go(t, p, c) {
      const at = c.at;
      if (first(c, 'strike')) {
        tpSound.thunder();
        screenFlash();
        worldMark('teleport-scorch', state.x);
        c.data.strike = c.now;
      }
      c.look.opacity = t < 0.06 ? 1 : 0;
      c.vignette = 0.6 * (1 - span(t, 0, 0.3));
      c.front += bolt(c, (c.now - c.data.strike) / 1000);
      if (!c.landed) {
        for (let i = 0; i < 3; i += 1) {
          const a = t - 0.04 - i * 0.08;
          if (a < 0) continue;
          const x = at.x + (i - 1) * at.h * 0.05;
          const y = at.foot - at.h * (0.03 + 0.5 * a);
          c.back += `<path class="tp-ink" stroke-width="1.5" opacity="${n2(0.5 * (1 - span(a, 0, 0.4)))}" d="M${n1(x)} ${n1(y)}q${n1(-at.h * 0.02)} ${n1(-at.h * 0.03)} 0 ${n1(-at.h * 0.06)}q${n1(at.h * 0.02)} ${n1(-at.h * 0.03)} 0 ${n1(-at.h * 0.06)}"/>`;
        }
      }
      return p;
    },
    arrive(t, p, c) {
      const at = c.at;
      if (first(c, 'strike2')) {
        tpSound.thunder();
        screenFlash();
        c.data.strike2 = c.now;
        burst(10, at.x, at.foot - 0.05 * at.h, at.h, { kind: 'spark', speed: 1 });
        spawnDust(state.x - 10 * at.unit, -1, at.unit, { count: 5, power: 1.3 });
        spawnDust(state.x + 10 * at.unit, 1, at.unit, { count: 5, power: 1.3 });
      }
      c.front += bolt(c, (c.now - c.data.strike2) / 1000);
      const w = 1 - ease(span(t, 0.55, 0.95));
      if (w <= 0) return p;
      const q = mixPose(p, crouchPose(p, 46), w);
      aimArm(q, 'near', 112, 234, w);
      return q;
    },
  },

  // A pencil comes down eraser first and rubs him out from the head down;
  // at the stop it flips and sketches him back in from the feet up.
  erase: {
    name: 'Erase and redraw', focus: 0.45, cut: 1.0, gap: 0.1, settle: 1.2,
    gather(t, p, c) {
      const at = c.at;
      const y = mix(at.top - at.h * 0.2, at.foot - 0.97 * at.h, easeOut(span(t, 0, 0.42)));
      c.front += pencil(at.x, y, 22 * at.f, 'eraser', 0.85 * at.h);
      return p;
    },
    go(t, p, c) {
      const at = c.at;
      if (first(c, 'rub')) tpSound.rub(0.8);
      const k = span(t, 0.05, 0.85);
      const y = mix(at.foot - 0.97 * at.h, at.foot, k);
      c.look.clipTop = y - (at.foot - at.h);
      if (k >= 1) c.look.opacity = 0;
      const rubbing = t > 0.05 && t < 0.85;
      const ex = at.x + (rubbing ? 0.12 * at.h * Math.sin(t * 40) : 0);
      const lift = span(t, 0.85, 1.0);
      if (lift < 1) c.front += pencil(ex, y - lift * 1.2 * at.h, 22 * at.f, 'eraser', 0.85 * at.h, 1 - lift);
      const tick = Math.floor(t / 0.06);
      if (rubbing && first(c, `crumb${tick}`)) crumb(ex, y, at.h, at.foot, Math.min(0.55, 0.95 - t));
      return p;
    },
    arrive(t, p, c) {
      const at = c.at;
      if (first(c, 'draw')) tpSound.scratch(0.8);
      const k = span(t, 0.12, 0.9);
      const y = mix(at.foot, at.foot - 0.97 * at.h, k);
      c.look.clipTop = k >= 1 ? 0 : t < 0.12 ? at.h : y - (at.foot - at.h);
      const drawing = t > 0.12 && t < 0.9;
      const px = at.x + (drawing ? 0.1 * at.h * Math.sin(t * 34) : 0);
      const py = t < 0.12 ? mix(at.top - at.h * 0.2, at.foot, easeOut(span(t, 0, 0.12))) : t < 0.9 ? y : y - span(t, 0.9, 1.15) * 1.2 * at.h;
      const o = 1 - span(t, 0.9, 1.15);
      if (o > 0) c.front += pencil(px, py, 22 * at.f, 'tip', 0.85 * at.h, o);
      return p;
    },
  },

  // His hand sketches a door in the air in front of him. It swings open onto
  // black and he steps in; at the stop a door draws itself behind him, opens,
  // and out he walks.
  door: {
    name: 'Ink door', focus: 0.72, cut: 1.05, gap: 0.1, settle: 1.3,
    gather(t, p, c) {
      const d = doorBox(c.at, 1);
      const k = ease(span(t, 0.05, 0.6));
      if (first(c, 'pen')) tpSound.scratch(0.55);
      c.back += inkDoor(d, k, 0, 1, c.at.f);
      const w = hump(t, 0, 0.72, 0.08, 0.1);
      if (w > 0) {
        const pt = onDoor(d, k);
        const [rx, ry] = toRig(c.at, pt.x, pt.y);
        aimArm(p, 'near', rx, ry, w);
      }
      return p;
    },
    go(t, p, c) {
      const at = c.at;
      if (c.landed) return p;
      if (t > 0.02 && first(c, 'creak')) noises.creak();
      if (t >= 0.66 && first(c, 'shut')) noises.clunk();
      const open = t < 0.62 ? ease(span(t, 0, 0.2)) : 1 - ease(span(t, 0.62, 0.78));
      c.back += inkDoor(doorBox(at, 1), 1, open, 1 - ease(span(t, 0.8, 1.0)), at.f);
      const s = span(t, 0.2, 0.6);
      c.look.dx = at.f * 0.28 * at.h * ease(s);
      c.look.opacity = 1 - ease(span(t, 0.35, 0.6));
      return s > 0 && s < 1 ? postureAt(TP_STEP, s, p) : p;
    },
    arrive(t, p, c) {
      const at = c.at;
      if (first(c, 'pen2')) tpSound.scratch(0.25);
      if (t > 0.27 && first(c, 'creak2')) noises.creak();
      if (t >= 0.92 && first(c, 'shut2')) noises.clunk();
      const open = t < 0.9 ? ease(span(t, 0.25, 0.4)) : 1 - ease(span(t, 0.9, 1.02));
      c.back += inkDoor(doorBox(at, -1), ease(span(t, 0, 0.25)), open, 1 - ease(span(t, 1.02, 1.22)), -at.f);
      const s = span(t, 0.4, 0.85);
      c.look.dx = -at.f * 0.28 * at.h * (1 - ease(s));
      c.look.opacity = ease(span(t, 0.4, 0.55));
      return s > 0 && s < 1 ? postureAt(TP_STEP, s, p) : p;
    },
  },

  // A black disc from his pocket, slapped on the floor: a hole. He hops in,
  // the hole slides off along the floor, slides in at the stop, and he pops
  // up out of it; then it peels itself up and back into his pocket.
  hole: {
    name: 'Portable hole', focus: 0.62, cut: 0.95, gap: 0.08, settle: 1.3,
    gather(t, p, c) {
      const at = c.at;
      aimArm(p, 'near', 82, 140, hump(t, 0, 0.32, 0.16, 0.1));
      aimArm(p, 'near', 110, 168, hump(t, 0.2, 0.62, 0.14, 0.12));
      const hx = at.x + at.f * 0.3 * at.h;
      if (t > 0.12 && t < 0.34) {
        const hand = handOnScreen();
        c.front += `<ellipse class="tp-solid" cx="${n1(hand.x)}" cy="${n1(hand.y)}" rx="${n1(at.h * 0.05)}" ry="${n1(at.h * 0.05)}"/>`;
      }
      if (t >= 0.34) {
        if (first(c, 'throw')) { c.data.from = handOnScreen(); tpSound.flick(); }
        const k = span(t, 0.34, 0.48);
        c.back += `<ellipse class="tp-solid" cx="${n1(mix(c.data.from.x, hx, k))}" cy="${n1(mix(c.data.from.y, at.foot, k * k))}" rx="${n1(at.h * mix(0.05, 0.13, k))}" ry="${n1(at.h * mix(0.05, 0.025, k))}"/>`;
      }
      if (t >= 0.48 && first(c, 'slap')) tpSound.slap();
      return p;
    },
    go(t, p, c) {
      const at = c.at;
      const hx = at.x + at.f * 0.3 * at.h;
      if (!c.landed) {
        const slide = easeIn(span(t, 0.5, 0.85));
        const x = mix(hx, at.x + c.dir * at.W * 0.75, slide);
        c.back += `<ellipse class="tp-solid" cx="${n1(x)}" cy="${n1(at.foot)}" rx="${n1(at.h * 0.13)}" ry="${n1(at.h * 0.025)}"/>`;
        if (slide > 0) for (let i = 0; i < 3; i += 1) c.back += `<path class="tp-ink" stroke-width="1.6" opacity="0.5" d="M${n1(x - c.dir * at.h * (0.2 + i * 0.07))} ${n1(at.foot - at.h * (0.02 + i * 0.012))}h${n1(-c.dir * at.h * (0.08 + i * 0.03))}"/>`;
      }
      if (t >= 0.25 && first(c, 'whistle')) tpSound.slideDown();
      if (t < 0.25) {
        const k = span(t, 0, 0.25);
        c.look.dx = at.f * 0.3 * at.h * ease(k);
        c.look.dy = -0.1 * at.h * Math.sin(Math.PI * k);
      } else {
        const drop = span(t, 0.25, 0.45);
        c.look.dx = at.f * 0.3 * at.h;
        c.look.dy = 1.1 * at.h * drop * drop;
        c.look.clipBottom = Math.max(0, c.look.dy);
        if (drop >= 1) c.look.opacity = 0;
      }
      const up = hump(t, 0.2, 0.5, 0.08, 0.05);
      aimArm(p, 'near', 78, 4, up);
      aimArm(p, 'far', 64, 4, up);
      return p;
    },
    arrive(t, p, c) {
      const at = c.at;
      const x = t < 0.3 ? mix(at.x - c.dir * at.W * 0.75, at.x, easeOut(span(t, 0, 0.3))) : at.x;
      if (t < 0.85) {
        c.back += `<ellipse class="tp-solid" cx="${n1(x)}" cy="${n1(at.foot)}" rx="${n1(at.h * 0.13)}" ry="${n1(at.h * 0.025)}"/>`;
        if (t < 0.3) for (let i = 0; i < 3; i += 1) c.back += `<path class="tp-ink" stroke-width="1.6" opacity="0.5" d="M${n1(x - c.dir * at.h * (0.2 + i * 0.07))} ${n1(at.foot - at.h * (0.02 + i * 0.012))}h${n1(-c.dir * at.h * (0.08 + i * 0.03))}"/>`;
      } else {
        const k = ease(span(t, 0.85, 1.15));
        if (k < 1) c.front += `<ellipse class="tp-solid" cx="${n1(mix(at.x, at.x + at.f * 0.06 * at.h, k))}" cy="${n1(mix(at.foot, at.foot - 0.42 * at.h, k))}" rx="${n1(at.h * mix(0.13, 0.015, k))}" ry="${n1(at.h * mix(0.025, 0.015, k))}"/>`;
      }
      if (t >= 0.37 && first(c, 'pop')) tpSound.slideUp();
      let dy;
      if (t < 0.35) dy = 1.1 * at.h;
      else if (t < 0.55) dy = mix(1.1 * at.h, -0.14 * at.h, easeOut(span(t, 0.35, 0.55)));
      else dy = mix(-0.14 * at.h, 0, ease(span(t, 0.55, 0.7)));
      c.look.dy = dy;
      c.look.clipBottom = Math.max(0, dy);
      c.look.opacity = t < 0.35 ? 0 : 1;
      const up = hump(t, 0.35, 0.85, 0.05, 0.25);
      aimArm(p, 'near', 78, 4, up);
      aimArm(p, 'far', 64, 4, up);
      aimArm(p, 'near', 82, 140, hump(t, 0.9, 1.3, 0.12, 0.15));
      return p;
    },
  },

  // The whole scene lifts off like a page and turns over; the next page
  // comes down with him already on it, and he gives himself a shake.
  page: {
    name: 'Page turn', focus: 0.35, cut: 0.42, gap: 0.02, settle: 0.95, freeze: true,
    gather(t, p) {
      p.lean -= 6 * ease(span(t, 0.05, 0.3));
      return p;
    },
    go(t, p, c) {
      if (first(c, 'turn')) sfx.rustle(0.4);
      const k = span(t, 0, 0.4);
      turnScene('left', -92 * easeIn(k));
      c.front += `<rect class="tp-solid" x="0" y="0" width="${n1(c.at.W)}" height="${n1(c.at.H)}" opacity="${n2(0.3 * k)}"/>`;
      p.lean -= 6;
      return p;
    },
    arrive(t, p, c) {
      if (first(c, 'turn2')) sfx.rustle(0.3);
      const k = span(t, 0, 0.42);
      if (k < 1) {
        turnScene('right', 92 * (1 - easeOut(k)));
        c.front += `<rect class="tp-solid" x="0" y="0" width="${n1(c.at.W)}" height="${n1(c.at.H)}" opacity="${n2(0.3 * (1 - k))}"/>`;
      } else {
        turnScene(null);
      }
      p.lean += 5 * hump(t, 0.45, 0.9, 0.05, 0.2) * Math.sin((t - 0.45) * 36);
      return p;
    },
    end() { turnScene(null); },
  },

  // A selection box with marching ants snaps round him. Ctrl+X and he's cut
  // out, leaving a checkerboard; the cursor drags his ghost off the screen,
  // and back on at the stop. Ctrl+V and he's solid again.
  paste: {
    name: 'Cut and paste', focus: 0.55, cut: 0.9, gap: 0.08, settle: 1.15,
    gather(t, p, c) {
      const at = c.at;
      const m = marquee(at);
      const k = easeOut(span(t, 0, 0.3));
      c.front += cursorSVG(mix(at.W + 30, m.r, k), mix(at.top + 30, m.t, k), at.h);
      if (t >= 0.3 && first(c, 'click')) sfx.tick(true);
      const g = ease(span(t, 0.28, 0.46));
      if (g > 0) {
        c.front += `<rect class="tp-ink tp-ants" stroke-width="1.5" x="${n1(m.r - (m.r - m.l) * g)}" y="${n1(m.t)}" width="${n1((m.r - m.l) * g)}" height="${n1((m.b - m.t) * g)}" stroke-dashoffset="${n1(-c.now / 40)}"/>`;
      }
      return p;
    },
    go(t, p, c) {
      const at = c.at;
      const m = marquee(at);
      if (first(c, 'cut')) tpSound.snip();
      const dx = c.dir * easeIn(span(t, 0.18, 0.8)) * at.W * 0.8;
      c.look.opacity = t < 0.05 ? 1 : t < 0.18 ? 0 : 0.35;
      c.look.dx = dx;
      if (!c.landed) {
        c.back += `<rect fill="url(#teleport-checker)" x="${n1(m.l)}" y="${n1(m.t)}" width="${n1(m.r - m.l)}" height="${n1(m.b - m.t)}" opacity="${n2(1 - ease(span(t, 0.12, 0.7)))}"/>`;
        c.front += marqueeSVG(m, dx, 1, c.now) + cursorSVG(m.r + dx, m.t, at.h);
        c.front += tag(m.l + (m.r - m.l) / 2, m.t - at.h * 0.08, 'Ctrl+X', hump(t, 0, 0.7, 0.05, 0.2), at.h);
      }
      return p;
    },
    arrive(t, p, c) {
      const at = c.at;
      const m = marquee(at);
      const dx = -c.dir * (1 - easeOut(span(t, 0, 0.45))) * at.W * 0.8;
      c.look.dx = dx;
      c.look.opacity = t < 0.5 ? 0.35 : 1;
      if (t >= 0.5 && first(c, 'paste')) { sfx.tick(true); sfx.pop(); }
      c.front += marqueeSVG(m, dx, 1 - ease(span(t, 0.7, 0.9)), c.now);
      const out = ease(span(t, 0.72, 1.05));
      c.front += cursorSVG(mix(m.r + dx, at.W + 30, out), mix(m.t, at.top + 60, out), at.h);
      c.front += tag(m.l + (m.r - m.l) / 2, m.t - at.h * 0.08, 'Ctrl+V', hump(t, 0.5, 1.15, 0.05, 0.2), at.h);
      p.lean += 4 * hump(t, 0.5, 0.95, 0.04, 0.2) * Math.sin((t - 0.5) * 34);
      return p;
    },
  },

  // A status tag says he's deploying. He breaks into blocks from the head
  // down that stream off the screen, stream back in at the stop and build
  // him up again as the count reaches 100%, and he's live.
  deploy: {
    name: 'Deploy', focus: 0.4, cut: 0.9, gap: 0.08, settle: 1.4,
    gather(t, p, c) {
      const at = c.at;
      c.front += tag(at.x, at.foot - 1.15 * at.h, 'deploying naeem 0%', ease(span(t, 0, 0.3)), at.h);
      return p;
    },
    go(t, p, c) {
      const at = c.at;
      if (first(c, 'sample')) {
        const pts = sampleFigure();
        c.data.bits = pts.map((pt, i) => ({ dx: pt.x - at.x, dy: pt.y - at.foot, d: 0.02 + (0.45 * i) / Math.max(1, pts.length - 1), amber: i % 3 === 0 }));
        c.data.topY = pts.length ? pts[0].y - at.foot : -at.h;
      }
      const bits = c.data.bits;
      const size = at.h * 0.022;
      const broke = span(t, 0.02, 0.47);
      c.look.clipTop = mix(c.data.topY + at.h - 2, at.h + 2, broke);
      if (broke >= 1) c.look.opacity = 0;
      let gone = 0;
      if (!c.landed) {
        for (const b of bits) {
          const k = span(t, b.d, b.d + 0.38);
          if (t >= b.d) gone += 1;
          if (k <= 0 || k >= 1) continue;
          const e = easeIn(k);
          const x0 = at.x + b.dx;
          const y0 = at.foot + b.dy;
          const x = mix(x0, x0 + c.dir * at.W * 0.85, e);
          const y = y0 - at.h * 0.35 * Math.sin(Math.PI * Math.min(1, e * 1.4));
          c.front += `<rect class="${b.amber ? 'tp-amber' : 'tp-solid'}" x="${n1(x - size / 2)}" y="${n1(y - size / 2)}" width="${n1(size)}" height="${n1(size)}"/>`;
        }
      } else {
        gone = bits.length;
      }
      const pct = Math.round((50 * gone) / Math.max(1, bits.length));
      c.front += tag(at.x, at.foot - 1.15 * at.h, `deploying naeem ${pct}%`, 1, at.h);
      if (first(c, `blip${Math.floor(t / 0.07)}`) && !c.landed) tpSound.blip(pct / 100);
      return p;
    },
    arrive(t, p, c) {
      const at = c.at;
      const bits = c.data.bits;
      const size = at.h * 0.022;
      let landed = 0;
      for (const b of bits) {
        const k = span(t, b.d, b.d + 0.38);
        if (k >= 1) { landed += 1; continue; }
        if (k <= 0) continue;
        const e = easeOut(k);
        const x0 = at.x + b.dx;
        const y0 = at.foot + b.dy;
        const x = mix(x0 - c.dir * at.W * 0.85, x0, e);
        const y = y0 - at.h * 0.35 * Math.sin(Math.PI * Math.max(0, (e - 0.3) / 0.7));
        c.front += `<rect class="${b.amber ? 'tp-amber' : 'tp-solid'}" x="${n1(x - size / 2)}" y="${n1(y - size / 2)}" width="${n1(size)}" height="${n1(size)}"/>`;
      }
      const built = span(t, 0.4, 0.85);
      c.look.opacity = t < 0.4 ? 0 : 1;
      c.look.clipBottom = built >= 1 ? 0 : -mix(c.data.topY - 2, 2, built);
      const pct = 50 + Math.round((50 * landed) / Math.max(1, bits.length));
      const live = t >= 0.9;
      if (live && first(c, 'live')) sfx.chime();
      if (!live && first(c, `blip${Math.floor(t / 0.07)}`)) tpSound.blip(pct / 100);
      c.front += tag(at.x, at.foot - 1.15 * at.h, live ? '✓ live' : `deploying naeem ${pct}%`, 1 - ease(span(t, 1.15, 1.4)), at.h);
      return p;
    },
  },
};

/* ------------------------------------------------------------------ the tip */

// The first time on a visit that he runs somewhere far, he says he could
// teleport, and the place he's going to on the navbar pulses twice.
function updateTip(dt, unit) {
  const tip = teleport.tip;
  if (tip.button && (performance.now() > tip.until || teleport.phase)) endTip();
  if (tip.said || teleport.phase || livingReduced.matches) return;
  if (memory.data.teleports > 0 || memory.data.teleportTips >= TIP_VISITS) {
    tip.said = true;
    return;
  }
  const button = buttons.find((item) => item.dataset.poi === state.destinationId);
  const far = Math.abs(state.target - state.x) / (UNITS_TALL * unit);
  tip.running = button && runningFree(unit) && far > TIP_FAR ? tip.running + dt : 0;
  if (tip.running < TIP_AFTER || !canSpeak()) return;
  tip.said = true;
  memory.data.teleportTips = (memory.data.teleportTips || 0) + 1;
  memory.save();
  const verb = window.matchMedia('(pointer: coarse)').matches ? 'Double tap' : 'Double click';
  remark(`<span>Too far? ${verb} ${button.textContent.trim()}</span><span>up top and I&rsquo;ll teleport there.</span>`, 3800);
  button.classList.add('is-teleport-tip');
  tip.button = button;
  tip.until = performance.now() + 4200;
}

function endTip() {
  const tip = teleport.tip;
  tip.button?.classList.remove('is-teleport-tip');
  tip.button = null;
}
