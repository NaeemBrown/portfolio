/* ======================================================================
   The daypart idles

   Left alone, he has ten things of his own for each part of the day, on
   top of the five he does at any hour (living.js, idling about): at dawn a
   sun salutation, his first coffee, star jumps before a run; by day a
   rubber duck, a paper prototype, a kite on a gust; at dusk a marshmallow
   at the fire, the lamps snapped on, the sun watched down; at night the
   stars, a head torch, the 3 a.m. page. They were pitched in the "Daypart
   Idle Pitches" artifact, and their sounds are in SOUNDS-idles.md.

   Each act says when it suits (IDLE_ACTS: its hours, and whatever else it
   needs, like the bird on screen, the fire close by or the moon up), and
   pickIdle (living.js) draws from those that do. At the camp's stop some
   of them take turns with the field journal's; at dusk and at night he may
   watch the sunset or lie back under the stars instead of settling down
   with his laptop; and by day he may fly a kite on a gust instead of
   bracing against it.

   It also builds what some of them need: a grove with a low oak branch the
   bird likes and two path lamps between the chalkboard and the control
   room, a copse between the workshop and the chalkboard, birches past the
   servers, and woods beyond his name.

   Loads after clickables.js (whose helpers it uses) and before script.js;
   its functions run once script.js has built the rig and the scenery.
   ====================================================================== */

/* ----------------------------------------------------------- the scenery */

const IDLE_COPSE = 6860; // px: a young oak between the workshop and the chalkboard
// The grove and its lamps, in units from the Experience stop, so they keep
// clear of the chalkboard and its ladder (to about 1400 units) and of the
// control room at any size.
const IDLE_GROVE = { oak: 1790, pine: 1610, bush: 1990, rock: 1690 };
const IDLE_PATH_LAMPS = [
  { id: 'lamp-grove', at: 1470, on: 18.8, off: 6.4 },
  { id: 'lamp-meadow', at: 2070, on: 19.2, off: 6.1 },
];
const IDLE_OAK_H = 400; // units, the grove's oak

// An oak: a broad crown on a forked trunk, and a bare low branch reaching
// out to the right, the bird's favourite perch (idlePerches).
function idleOak(p, x, h) {
  const k = h / 380;
  const at = ([a, b]) => [x + a * k, b * k];
  p.poly('s-bark', [[-17, 0], [-12, 128], [-46, 196], [-34, 204], [-6, 160], [0, 226], [8, 160], [40, 206], [50, 196], [13, 128], [17, 0]].map(at));
  p.line('s-branch', [[10, 104], [70, 124], [150, 132]].map(at), [[104, 128], [118, 150]].map(at), [[-10, 92], [-66, 112]].map(at));
  p.bumps('s-tree', scallopPoints(x, 262 * k, 172 * k, 112 * k, 12, x * 0.013));
  p.line('s-thin', [[-60, 250], [-30, 236]].map(at), [[40, 290], [80, 272]].map(at), [[-10, 318], [14, 300]].map(at));
}

// A birch: a pale trunk with dark marks, and a light crown.
function idleBirch(p, x, h, seed) {
  p.rect('s-birch', x - 7, 0, x + 7, h, 3);
  const marks = [];
  for (let y = 24; y < h - 20; y += 34 + 12 * (wobble(seed + y) + 0.5)) {
    const side = wobble(seed + y * 1.7) > 0 ? 1 : -1;
    marks.push([[x + side * 7, y], [x + side * 1, y + 4]]);
  }
  p.line('s-birch-mark', ...marks);
  p.bumps('s-tree', scallopPoints(x, h + 18, 48, 62, 9, seed));
}

function idleRock(p, x, w, h) {
  p.poly('s-rock', [[x - w / 2, 0], [x - w * 0.42, h * 0.62], [x - w * 0.1, h], [x + w * 0.3, h * 0.84], [x + w / 2, 0]]);
}

// A street lamp like the two at his name, its shade to the right.
function idleLamp(p, x, id) {
  p.open(`class="s-fixture" data-fixture="${id}"`);
  p.rect('s-paper', x - 9, 0, x + 9, 16, 2);
  p.line('s-edge', [[x, 16], [x, 300]], [[x, 300], [x + 8, 314], [x + 30, 318]]);
  p.poly('s-paper s-shade', [[x + 18, 318], [x + 42, 318], [x + 36, 300], [x + 24, 300]]);
  p.circle('s-glow s-glow--soft', x + 30, 296, 22);
  p.close();
}

// Once, from startLiving (living.js), after the lights and before they are
// switched as the hour has them.
function idleBuild() {
  if (idleBuild.done) return;
  idleBuild.done = true;
  const w = STATUE.width;
  // The woods beyond the far end of his name.
  worldSet('set--idle-woods', nameEnd, -w - 1760, -w - 760, 480, (p) => {
    pine(p, 's-far', -w - 1690, 190);
    pine(p, 's-far', -w - 1610, 150);
    pine(p, 's-tree', -w - 1470, 420);
    pine(p, 's-tree', -w - 1300, 330);
    bush(p, 's-tree', -w - 1170, 120, 48, 21);
    idleOak(p, -w - 1010, 360);
    bush(p, 's-tree', -w - 850, 90, 40, 23);
    tufts(p, -w - 1740, -w - 780, 37, 80);
  });
  // A copse between the workshop and the chalkboard.
  worldSet('set--idle-copse', IDLE_COPSE, -150, 190, 330, (p) => {
    pine(p, 's-far', -110, 130);
    idleOak(p, 0, 270);
    bush(p, 's-tree', 140, 90, 40, 27);
    tufts(p, -140, 180, 43, 60);
  });
  // The grove, on the long walk from the chalkboard to the control room.
  worldSet('set--idle-grove', experienceX, 1500, 2060, 470, (p) => {
    pine(p, 's-far', 1528, 170);
    pine(p, 's-far', 1566, 128);
    pine(p, 's-tree', IDLE_GROVE.pine, 280);
    idleOak(p, IDLE_GROVE.oak, IDLE_OAK_H);
    idleRock(p, IDLE_GROVE.rock, 64, 30);
    bush(p, 's-tree', IDLE_GROVE.bush, 120, 52, 13);
    tufts(p, 1510, 2050, 41, 70);
  });
  for (const lamp of IDLE_PATH_LAMPS) {
    worldSet('set--idle-lamp', experienceX, lamp.at - 40, lamp.at + 60, 340, (p) => idleLamp(p, lamp.at, lamp.id));
  }
  // Birches past the servers, where the world ends.
  worldSet('set--idle-birches', WORLD_END, -330, -30, 440, (p) => {
    bush(p, 's-tree', -290, 90, 38, 31);
    idleBirch(p, -220, 300, 3);
    idleBirch(p, -130, 370, 7);
    idleBirch(p, -60, 250, 11);
    tufts(p, -320, -40, 47, 60);
  });
  // The lamps' light, switched by the hour with the others (SWITCHED).
  worldLights?.insertAdjacentHTML('beforeend', IDLE_PATH_LAMPS.flatMap((lamp) => [
    glowAt(experienceX, lamp.at + 30, 300, 230, 'lamp', { id: lamp.id }),
    glowAt(experienceX, lamp.at + 30, 0, 330, 'pool', { id: `pool-${lamp.id}` }),
  ]).join(''));
  for (const lamp of IDLE_PATH_LAMPS) SWITCHED.push({ id: lamp.id, glows: [lamp.id, `pool-${lamp.id}`], on: lamp.on, off: lamp.off });
  idleLayers();
}

// The bird's perches among them, for birdPerches (living.js), `at` as it
// has it: (anchor px, units along, units up).
function idlePerches(at) {
  const w = STATUE.width;
  const oak = (anchor, x, h) => {
    const k = h / 380;
    return [at(anchor, x + 132 * k, 131 * k), at(anchor, x, (262 + 112) * k)];
  };
  return [
    ...oak(experienceX, IDLE_GROVE.oak, IDLE_OAK_H), // the grove's low branch, and its crown
    ...oak(IDLE_COPSE, 0, 270),
    ...oak(nameEnd, -w - 1010, 360),
    ...IDLE_PATH_LAMPS.map((lamp) => at(experienceX, lamp.at + 30, 318)),
    at(WORLD_END, -130, 370 + 80), // the tall birch
  ];
}

// Tree tops, for somewhere to look out at or for the bird to go to bed in:
// world px along, and px up.
function idleTreeTops() {
  const u = view.unit;
  const w = STATUE.width;
  const top = (anchor, x, y) => ({ x: anchor + x * u, y: y * u });
  return [
    top(campX, -575, 470), top(campX, 450, 420),
    top(experienceX, IDLE_GROVE.oak, 374 * IDLE_OAK_H / 380), top(experienceX, IDLE_GROVE.pine, 280),
    top(IDLE_COPSE, 0, 266), top(WORLD_END, -130, 450), top(WORLD_END, -220, 380),
    top(nameEnd, -w - 1470, 420), top(nameEnd, -w - 1010, 354),
  ];
}

/* ------------------------------------------------------------- drawing
   What an act draws besides him: `fx`, in a layer in the figure (over him
   and the scenery, under the night's wash), and `glow`, in a layer on the
   lights (screened over the wash, for anything that shines: a torch's
   beam, a firefly, the stars). Both are in the rig's units, where he
   stands, his feet on the floor at y 242, mirrored as he is. And a flash
   over the whole scene, for a camera and a blazing screen. */

const IDLE_NS = 'http://www.w3.org/2000/svg';
const idleDraw = { fx: null, glow: null, glowInk: null, flash: null, fxShown: '', glowShown: '', flashShown: '' };

// Soft round lights, bright in the middle and gone at the edge.
const IDLE_SOFT = [['amber', '#fff6c0', 'rgba(255,214,110,0.75)'], ['white', '#ffffff', 'rgba(255,255,255,0.7)'],
  ['blue', '#c8d8ff', 'rgba(127,162,255,0.6)'], ['warm', '#fff4dc', 'rgba(255,226,170,0.7)']];

function idleLayers() {
  if (idleDraw.fx) return;
  idleDraw.fx = document.createElementNS(IDLE_NS, 'g');
  idleDraw.fx.setAttribute('class', 'idle-fx');
  figure.append(idleDraw.fx);
  idleDraw.glow = document.createElementNS(IDLE_NS, 'svg');
  idleDraw.glow.setAttribute('class', 'idle-glow');
  idleDraw.glow.setAttribute('viewBox', '0 0 140 242');
  idleDraw.glow.setAttribute('aria-hidden', 'true');
  idleDraw.glow.innerHTML = `<defs>${IDLE_SOFT.map(([name, core, mid]) => `<radialGradient id="idle-soft-${name}">`
    + `<stop offset="0" stop-color="${core}"/><stop offset="0.35" stop-color="${mid}"/><stop offset="1" stop-color="${core}" stop-opacity="0"/></radialGradient>`).join('')}</defs><g></g>`;
  idleDraw.glowInk = idleDraw.glow.lastChild;
  worldLights?.append(idleDraw.glow);
  idleDraw.flash = document.createElement('div');
  idleDraw.flash.className = 'idle-flash';
  livingScene.append(idleDraw.flash);
}

function idlePaint(fx, glow) {
  idleLayers();
  if (fx !== idleDraw.fxShown) {
    idleDraw.fx.innerHTML = fx;
    idleDraw.fxShown = fx;
  }
  if (glow !== idleDraw.glowShown) {
    idleDraw.glowInk.innerHTML = glow;
    idleDraw.glowShown = glow;
  }
  if (glow) {
    idleDraw.glow.style.left = `${view.renderX.toFixed(1)}px`;
    idleDraw.glow.style.setProperty('--flip', String(idleFacing()));
  }
}

function idleFlash(amount) {
  idleLayers();
  const value = amount > 0.01 ? amount.toFixed(2) : '';
  if (value === idleDraw.flashShown) return;
  idleDraw.flashShown = value;
  idleDraw.flash.style.opacity = value || '0';
}

const idleF = (n) => n.toFixed(1);

// A label in a pill, the right way round whichever way he faces.
function idleTag(x, y, text, o = 1) {
  if (o <= 0.02) return '';
  const w = text.length * 9.4 + 24;
  return `<g class="idle-tag" opacity="${o.toFixed(2)}" transform="translate(${idleF(x)} ${idleF(y)}) scale(${idleFacing()} 1)">`
    + `<rect x="${idleF(-w / 2)}" y="-14" width="${idleF(w)}" height="28" rx="14"/><text x="0" y="5.5" text-anchor="middle">${text}</text></g>`;
}

function idleNote(x, y, o, flag) {
  if (o <= 0.02) return '';
  return `<g opacity="${o.toFixed(2)}"><ellipse class="idle-note" cx="${idleF(x)}" cy="${idleF(y)}" rx="5" ry="3.6" transform="rotate(-20 ${idleF(x)} ${idleF(y)})"/>`
    + `<path class="idle-note-line" d="M${idleF(x + 4.4)} ${idleF(y)}v-19${flag ? 'l8 3.6' : 'h9v14'}"/></g>`;
}

// Notes drifting off from (x0, y0) at (vx, vy) units a second, one every
// `every` seconds between `from` and `to`.
function idleNotes(t, from, to, x0, y0, vx, vy, every = 0.4) {
  let out = '';
  for (let start = from; start < to; start += every) {
    const age = t - start;
    if (age < 0 || age > 1.3) continue;
    const o = ease(clamp(age / 0.15, 0, 1)) * (1 - ease(clamp((age - 0.8) / 0.5, 0, 1)));
    out += idleNote(x0 + vx * age + 4 * Math.sin(age * 8 + start), y0 + vy * age, o, Math.round(start * 10) % 2);
  }
  return out;
}

const idleGlowDot = (x, y, o = 1, r = 5) => `<circle class="idle-halo" cx="${idleF(x)}" cy="${idleF(y)}" r="${idleF(r * 4)}" opacity="${(0.8 * o).toFixed(2)}"/>`
  + `<circle class="idle-spark" cx="${idleF(x)}" cy="${idleF(y)}" r="${idleF(r)}" opacity="${(0.5 + 0.5 * o).toFixed(2)}"/>`;

// Shakes on a phone in a pocket at (x, y).
const idleBuzz = (x, y, o) => (o > 0.05
  ? `<path class="idle-buzz" opacity="${o.toFixed(2)}" d="M${idleF(x + 8)} ${idleF(y - 9)}q5 9 0 18M${idleF(x + 14)} ${idleF(y - 13)}q7 13 0 26M${idleF(x - 8)} ${idleF(y - 9)}q-5 9 0 18"/>` : '');

/* ------------------------------------------------------------- helpers */

const idleFacing = () => (state.flip < 0 ? -1 : 1);
const idleHour = () => wrapHour(skyClock.hour);

// His hand on (x, y) of his upright torso (as his head and chest are drawn:
// head at 70, 32, shoulder at 70, 74), by `w`.
const idleReachBody = (p, side, x, y, w) => aimArm(p, side, ...leaned(p.lean, x, y), w);
// His hand on (x, y) where it is in the rig now, his feet at y 242, by `w`.
const idleReachRig = (p, side, x, y, w) => aimArm(p, side, x, y - p.bob, w);

// Where his hand is, and a point of his upright torso, in the rig.
function idleHandRig(p, side) {
  const [x, y] = handAt(p.lean, p[side].shoulder, p[side].elbow);
  return [x, y + p.bob];
}
function idleBody(p, x, y) {
  const [a, b] = leaned(p.lean, x, y);
  return [a, b + p.bob];
}

// World px along and up, and a point on the screen, in the rig where he is.
function idleWorldToRig(x, up) {
  return [70 + ((x - view.renderX) / view.unit) * idleFacing(), 242 - up / view.unit];
}
const idleWorldX = (x) => view.renderX + (x - 70) * view.unit * idleFacing();
const idleScreenToRig = (sx, sy) => idleWorldToRig(sx - sceneWidth / 2 - view.shift + view.renderX, floorY + view.rise - sy);

// The middle of an element on the scene, and where that is in the world.
function idleSpot(el) {
  const r = el.getBoundingClientRect();
  const s = livingScene.getBoundingClientRect();
  const x = r.left - s.left + r.width / 2;
  return { x, y: r.top - s.top + r.height / 2, worldX: x - sceneWidth / 2 - view.shift + view.renderX };
}
// The sun or the moon, if it's up and on screen.
function idleSunSpot() {
  if (!sunDisc || !skySun || skySun.classList.contains('is-down')) return null;
  const spot = idleSpot(sunDisc);
  return spot.x > 30 && spot.x < sceneWidth - 30 && spot.y < floorY + view.rise ? spot : null;
}
function idleMoonSpot() {
  const moon = skyStars?.querySelector('.moon');
  if (!moon || Number(moon.style.opacity || 0) < 0.5 || (skyClock.look?.stars ?? 0) < 0.4) return null;
  const spot = idleSpot(moon);
  return spot.x > 30 && spot.x < sceneWidth - 30 ? spot : null;
}

const idleFireX = () => campX + 174 * view.unit;
const idleNearFire = (bodies = 1.6) => Math.abs(state.x - idleFireX()) < bodies * UNITS_TALL * view.unit;
const idleAtCamp = (px = 800) => Math.abs(state.x - campX) < px;
// Standing between the tent and the fire, where the firelight throws his
// shadow onto the tent.
const idleByTent = () => state.x > campX - 190 * view.unit && state.x < campX + 60 * view.unit;
const idleBirdSeen = () => bird.mode === 'perched' && onScreen(bird.x, 60)
  && Math.abs(bird.x - state.x) > 0.8 * UNITS_TALL * view.unit && Math.abs(bird.x - state.x) < 0.85 * sceneWidth;

// Says `html` as one of his own lines.
function idleSay(html, ms = 1800) {
  if (!intro.active && !openPanelId) remark(`<span>${html}</span>`, ms);
}
// A sample from the library, or `fallback` made from the synth's parts.
const idleSound = (group, options, fallback) => clickSound(group, options, fallback);

const idleSounds = {
  breathIn: () => idleSound('breathIn', { vol: 0.2, vary: 0.02 }, () => sfx.hiss({ type: 'lowpass', freq: 500, to: 950, vol: 0.12, dur: 1.2, attack: 0.5 })),
  breathOut: (vol = 0.18) => idleSound('breathOut', { vol, vary: 0.03 }, () => sfx.hiss({ type: 'lowpass', freq: 950, to: 420, vol: 0.12, dur: 1.1, attack: 0.15 })),
  blow: () => idleSound('blow', { vol: 0.24, vary: 0.05 }, () => sfx.hiss({ freq: 900, q: 0.8, vol: 0.2, dur: 0.35, attack: 0.03 })),
  gasp: (vol = 0.24) => idleSound('gasp', { vol, vary: 0.04 }, () => sfx.hiss({ freq: 1400, to: 2100, q: 1, vol: 0.16, dur: 0.22, attack: 0.01 })),
  vibrate: () => idleSound('phoneVibrate', { vol: 0.3, vary: 0.02 }, () => noises.buzz()),
  click: (vol = 0.16) => idleSound('uiClick', { vol, vary: 0.05 }, () => sfx.tick(true)),
  swish: (vol = 0.2) => idleSound('swish', { vol, vary: 0.06 }, () => sfx.hiss({ freq: 2600, to: 500, q: 1.4, vol: 0.14, dur: 0.22, attack: 0.08 })),
  cloth: () => idleSound('cloth', { vol: 0.14, vary: 0.06 }, null),
  chirp: () => idleSound('birdChirp', { vol: 0.14, vary: 0.06 }, () => [0, 0.09].forEach((at) => sfx.tone(3300, { to: 4300, vol: 0.03, dur: 0.05, at }))),
  song: () => idleSound('birdSong', { vol: 0.2, vary: 0.04 }, () => {
    birdPhrase();
    [0, 0.12, 0.24, 0.4].forEach((at, i) => sfx.tone(3000 + 300 * i, { to: 3600 + 200 * i, vol: 0.03, dur: 0.08, at }));
  }),
  twinkle: (n) => idleSound(`twinkle${n}`, { vol: 0.2, vary: 0 }, () => {
    if (!sfx.sample?.('wishChime', { vol: 0.08, rate: 1 + 0.12 * n, vary: 0 })) sfx.tone(1568 * (1 + 0.12 * n), { vol: 0.04, dur: 0.6 });
  }),
};

/* ------------------------------------------------------------ his props */

const idleProp = {
  near: document.querySelector('.figure .prop-idle'),
  far: document.querySelector('.figure .prop-idle-far'),
  torch: document.querySelector('.figure .prop-headtorch'),
  foam: document.querySelector('.figure .prop-foam'),
  chestNote: document.querySelector('.figure .prop-chestnote'),
  mallow: document.querySelector('.figure .prop-idle__mallow'),
};

// Shows prop `name` in his hand on `side`, standing at `angle` degrees
// from how it is drawn whatever his arm is doing (clickHold, for either
// hand), or puts it away.
function idleHold(p, name, angle, shown, side = 'near') {
  const el = side === 'near' ? idleProp.near : idleProp.far;
  if (!el) return;
  el.setAttribute('opacity', shown ? '1' : '0');
  if (!shown) return;
  if (el.dataset.showing !== name) {
    el.dataset.showing = name;
    el.querySelectorAll('[data-prop]').forEach((g) => { g.style.display = g.dataset.prop === name ? '' : 'none'; });
  }
  el.style.transform = `rotate(${(angle - (p.lean + p[side].shoulder + p[side].elbow)).toFixed(1)}deg)`;
}

// His phone in his hand, kept at `angle` (upright is 0, on its side 90).
function idlePhone(p, shown, angle = 0, buzzing = false) {
  showPhone(shown, buzzing);
  if (phoneProp && shown) phoneProp.style.transform = `rotate(${(angle - (p.lean + p.near.shoulder + p.near.elbow)).toFixed(1)}deg)`;
}
const idlePhoneShows = (...classes) => {
  phoneProp?.classList.remove('is-dnd', 'is-muted', 'is-lit', 'is-page');
  if (classes.length) phoneProp?.classList.add(...classes);
};

function idlePropsAway() {
  for (const el of [idleProp.near, idleProp.far, idleProp.torch, idleProp.foam, idleProp.chestNote]) el?.setAttribute('opacity', '0');
  showPhone(false);
  idlePhoneShows();
  if (phoneProp) phoneProp.style.transform = '';
  runProps.watch?.setAttribute('opacity', '0');
  if (runProps.mug) {
    runProps.mug.setAttribute('opacity', '0');
    runProps.mug.style.transform = '';
  }
  campfireProps.breath?.setAttribute('opacity', '0');
  if (idleProp.mallow) {
    idleProp.mallow.style.fill = '';
    idleProp.mallow.setAttribute('opacity', '1');
  }
}

/* ------------------------------------------------------------- an act */

// An act `duration` seconds long (or until he's needed, with none), drawn
// by `draw(t, p, out, act, base, dt)` over a copy of his pose, `t` its
// seconds: it moves `p` (or returns a pose of its own) and adds what it
// shows to out.fx and out.glow. `beats` are [seconds, fn] called once as
// each passes.
function idleAct(kind, duration, draw, { beats = [], end = null, ...rest } = {}) {
  const cues = [...beats].sort((a, b) => a[0] - b[0]);
  let next = 0;
  const out = { fx: '', glow: '' };
  return {
    kind,
    duration,
    hands: true,
    ...rest,
    pose(base, act, dt) {
      while (next < cues.length && act.t >= cues[next][0]) cues[next++][1](act);
      const p = clonePose(base);
      out.fx = '';
      out.glow = '';
      const own = draw(act.t, p, out, act, base, dt);
      idlePaint(out.fx, out.glow);
      return own || p;
    },
    end(cancelled) {
      ambient.face = 0;
      idlePaint('', '');
      idleFlash(0);
      idlePropsAway();
      end?.(cancelled);
    },
  };
}

// Sitting down on the floor, `k` of the way from standing (0) to `sit`
// (1): through a crouch, as the settle does.
function idleSitBlend(base, sit, k) {
  if (k <= 0) return clonePose(base);
  if (k >= 1) return clonePose(sit);
  const crouch = crouchPose(base, 40);
  return k < 0.5 ? mixPose(base, crouch, ease(k / 0.5)) : mixPose(crouch, sit, ease((k - 0.5) / 0.5));
}

// Where his knee is, in the rig.
function idleKnee(p, side) {
  const a = p[side].thigh * RAD;
  return [70 - 50 * Math.sin(a), 144 + p.bob + 50 * Math.cos(a)];
}

/* ================================================================ dawn */

// Arms up, a fold to his toes, and back up to his hands at his chest.
function idleSaluteAct() {
  return idleAct('salute', 7.6, (t, p) => {
    const up = clickTrack([[0.5, 0], [1.5, 1], [2.0, 1], [2.7, 0], [4.5, 0], [5.3, 1], [5.7, 1], [6.2, 0]], t);
    const fold = clickTrack([[1.8, 0], [3.0, 1], [4.2, 1], [5.3, 0]], t);
    const pray = clickTrack([[5.8, 0], [6.3, 1], [7.0, 1], [7.5, 0]], t);
    p.lean += -8 * up + 116 * fold;
    idleReachBody(p, 'near', 110, -4, up);
    idleReachBody(p, 'far', 36, -2, up);
    idleReachRig(p, 'near', 104, 234, fold);
    idleReachRig(p, 'far', 94, 236, fold);
    idleReachBody(p, 'near', 100, 90, pray);
    idleReachBody(p, 'far', 97, 93, pray);
  }, { beats: [[0.5, idleSounds.breathIn], [2.2, () => idleSounds.breathOut()], [4.6, idleSounds.breathIn], [6.3, () => idleSounds.breathOut()]] });
}

// A mug of coffee: blown on, sipped, held in both hands.
function idleCoffeeAct() {
  const mug = runProps.mug;
  return idleAct('coffee', 6.4, (t, p) => {
    const hold = between(t, 0.3, 6.1, 0.5, 0.45);
    const sip = between(t, 2.7, 4.0, 0.35, 0.35);
    const blow = between(t, 1.2, 2.4, 0.25, 0.3);
    const wrap = between(t, 4.2, 5.9, 0.35, 0.4);
    p.lean += 6 * blow - 2 * sip + 4 * wrap;
    idleReachBody(p, 'near', 104, 96, hold * (1 - sip));
    idleReachBody(p, 'near', 96, 50, sip);
    const [hx, hy] = idleHandRig(p, 'near');
    idleReachRig(p, 'far', hx + 9, hy + 1, wrap);
    if (mug) {
      const upright = -(p.lean + p.near.shoulder + p.near.elbow) - 34 * sip;
      mug.style.transform = `rotate(${upright.toFixed(1)}deg) scale(1.25)`;
      mug.setAttribute('opacity', clamp(hold * 2, 0, 1).toFixed(2));
    }
    campfireProps.breath?.setAttribute('opacity', blow > 0.4 ? '1' : '0');
  }, {
    beats: [
      [1.3, idleSounds.blow], [1.8, idleSounds.blow],
      [3.0, () => idleSound('coffeeSip', { vol: 0.28, vary: 0.04 }, () => sfx.hiss({ freq: 2200, to: 1500, q: 2, vol: 0.08, dur: 0.35, attack: 0.05 }))],
      [4.3, () => idleSounds.breathOut(0.14)],
      [4.5, () => idleSay('Now I&rsquo;m awake.', 1600)],
    ],
  });
}

// Blowing into his hands, rubbing them, and hunched with them tucked in;
// his breath shows.
function idleWarmHandsAct() {
  return idleAct('warmhands', 5.6, (t, p, out) => {
    const cup = between(t, 0.4, 2.1, 0.3, 0.3);
    const rub = between(t, 2.1, 3.9, 0.25, 0.3);
    const hunch = between(t, 3.8, 5.3, 0.3, 0.4);
    const r = 5 * Math.sin(t * 2 * Math.PI * 4.5) * rub;
    clickCrouch(p, 8, hunch);
    p.lean += 6 * cup + 7 * hunch + 1.2 * Math.sin(t * 2 * Math.PI * 9) * hunch;
    idleReachBody(p, 'near', 98, 50, cup);
    idleReachBody(p, 'far', 94, 55, cup);
    idleReachBody(p, 'near', 102 + r, 98, rub);
    idleReachBody(p, 'far', 99 - r, 101, rub);
    idleReachBody(p, 'near', 82, 98, hunch);
    idleReachBody(p, 'far', 88, 95, hunch);
    const period = t < 2.1 ? 0.9 : 1.6;
    const age = t % period;
    if (age < 1.2) {
      const [mx, my] = idleBody(p, 98, 44);
      out.fx += `<circle class="idle-puff" cx="${idleF(mx + 8 + 24 * age)}" cy="${idleF(my - 14 * age)}" r="${idleF(4 + 9 * age)}" opacity="${(0.8 * (1 - age / 1.2)).toFixed(2)}"/>`;
    }
  }, {
    beats: [
      [0.55, () => idleSounds.breathOut(0.12)], [1.4, () => idleSounds.breathOut(0.12)],
      [2.15, () => idleSound('handRub', { vol: 0.26, vary: 0.03 }, () => sfx.rub(1.6))],
      [3.95, () => idleSay('Brr.', 1300)],
    ],
  });
}

// He turns to the rising sun and shades his eyes to watch it.
function idleSunriseAct() {
  const sun = idleSunSpot();
  const face = sun ? Math.sign(sun.worldX - state.x) || -1 : -1;
  return idleAct('sunrise', 6, (t, p) => {
    ambient.face = t > 0.6 && t < 5.2 ? face : 0;
    const shade = between(t, 1.0, 4.8, 0.4, 0.4);
    p.lean -= 6 * shade;
    idleReachBody(p, 'near', 100, 12, shade);
    idleReachBody(p, 'far', 86, 138, 0.9 * shade);
  }, { beats: [[1.6, () => idleSounds.breathOut(0.1)]] });
}

// The bird sings; he whistles back, hands on his hips; it answers.
function idleChorusAct() {
  bird.dir = Math.sign(state.x - bird.x) || bird.dir;
  return idleAct('chorus', 7, (t, p, out) => {
    ambient.face = Math.sign(bird.x - state.x) || 0;
    const look = between(t, 0.9, 6.6, 0.4, 0.4);
    const hips = between(t, 1.6, 6.4, 0.4, 0.4);
    const bounce = between(t, 5.6, 6.5, 0.1, 0.2);
    clickCrouch(p, 10 * Math.abs(Math.sin((t - 5.6) * Math.PI * 4)), bounce);
    p.lean -= 6 * look;
    idleReachBody(p, 'near', 90, 138, hips);
    idleReachBody(p, 'far', 86, 140, hips);
    const [bx, by] = idleWorldToRig(bird.x, bird.y);
    const [mx, my] = idleBody(p, 100, 42);
    out.fx += idleNotes(t, 0.55, 1.5, bx, by - 30, -14, -40, 0.45) + idleNotes(t, 4.05, 5.6, bx, by - 30, -16, -40, 0.33)
      + idleNotes(t, 2.05, 3.3, mx + 10, my - 8, (bx - mx) * 0.4, -36, 0.4);
    bird.el?.classList.toggle('is-listening', t > 3.3 && t < 4.3);
  }, {
    beats: [[0.5, idleSounds.song], [2.0, () => idleSound('whistle', { vol: 0.24, vary: 0.02 }, () => {
      sfx.tone(1700, { to: 2300, vol: 0.05, dur: 0.18 });
      sfx.tone(2300, { to: 1900, vol: 0.05, dur: 0.2, at: 0.24 });
    })], [4.0, idleSounds.song]],
    end: () => bird.el?.classList.remove('is-listening'),
  });
}

// A lick of his finger, held up to the wind; he nods, and the gust comes.
function idleWindAct() {
  const dir = -state.facing; // blowing at his face
  wind.next = Math.max(wind.next, 30);
  return idleAct('wind', 6.8, (t, p, out) => {
    const lick = between(t, 0.35, 1.1, 0.2, 0.2);
    const raise = between(t, 1.2, 3.7, 0.3, 0.35);
    const gust = between(t, 3.9, 6.0, 0.3, 0.5);
    const point = between(t, 4.6, 6.2, 0.2, 0.3);
    idleReachBody(p, 'near', 96, 48, lick);
    idleReachBody(p, 'near', 90, -12, raise);
    idleReachBody(p, 'far', 150, 70, point);
    const nod = between(t, 3.1, 3.8, 0.08, 0.1) * Math.sin((t - 3.1) * Math.PI * 5.6) * 4;
    p.lean += -4 * raise + nod + 9 * gust;
    if (raise > 0.3) {
      const [hx, hy] = idleHandRig(p, 'near');
      out.fx += `<path class="idle-line" d="M${idleF(hx)} ${idleF(hy)}l1.5 -10"/>` + idleTag(hx + 14, hy - 30, '12 km/h', between(t, 1.9, 3.7, 0.2, 0.3));
    }
  }, {
    beats: [
      [3.9, () => {
        startGust(dir);
        wind.next = 15 + 15 * Math.random();
      }],
      [4.8, () => idleSay('Called it.', 1500)],
    ],
  });
}

// Brushing, a gargle from his bottle, and a flick of the brush.
function idleTeethAct() {
  return idleAct('teeth', 6.2, (t, p, out) => {
    const brush = between(t, 0.4, 3.3, 0.35, 0.3);
    const rinse = between(t, 3.4, 4.7, 0.3, 0.3);
    const flick = between(t, 4.9, 5.7, 0.12, 0.25);
    const sx = 3 * Math.sin(t * 2 * Math.PI * 6) * brush;
    p.lean += 4 * brush - 10 * rinse + 4 * flick;
    idleReachBody(p, 'near', 130 + sx, 48, brush);
    idleReachBody(p, 'near', 104, 44, rinse);
    idleReachBody(p, 'near', 136, 100 + 10 * Math.sin((t - 4.9) * 16), flick);
    if (rinse > 0.4) idleHold(p, 'bottle', -128, true);
    else idleHold(p, 'toothbrush', brush >= flick ? -90 : -40 + 30 * Math.sin(t * 16), brush > 0.05 || flick > 0.05);
    idleProp.foam?.setAttribute('opacity', (t > 0.9 && t < 3.6 ? Math.min(1, (t - 0.9) * 1.2) : 0).toFixed(2));
    const age = t - 5.05;
    if (age > 0 && age < 0.7) {
      const [ox, oy] = idleHandRig(p, 'near');
      for (let i = 0; i < 4; i += 1) {
        out.fx += `<circle class="idle-drop" cx="${idleF(ox + (30 + 16 * i) * age)}" cy="${idleF(oy - (16 + 8 * i) * age + 130 * age * age)}" r="2.2" opacity="${(1 - age / 0.7).toFixed(2)}"/>`;
      }
    }
  }, {
    beats: [
      [0.5, () => idleSound('toothbrush', { vol: 0.26, vary: 0.03 }, () => {
        for (let i = 0; i < 10; i += 1) sfx.hiss({ freq: 3500, q: 2, vol: 0.05, dur: 0.07, at: i * 0.16, attack: 0.02 });
      })],
      [2.1, () => idleSound('toothbrush', { vol: 0.22, rate: 1.05, vary: 0.03 }, null)],
      [3.6, () => idleSound('gargle', { vol: 0.28, vary: 0.02 }, () => {
        for (let i = 0; i < 8; i += 1) sfx.tone(170 + 20 * (i % 2), { vol: 0.03, dur: 0.07, at: i * 0.08 });
      })],
      [5.0, () => idleSounds.swish(0.16)],
    ],
  });
}

// Soaked boots: one shaken, then the other, and a sole wiped on the grass.
function idleBootsAct() {
  return idleAct('boots', 5.2, (t, p, out, act, base) => {
    const look = between(t, 0.3, 4.9, 0.3, 0.4);
    const near = between(t, 0.9, 2.3, 0.2, 0.25);
    const far = between(t, 2.5, 3.9, 0.2, 0.25);
    const wipe = between(t, 4.0, 4.9, 0.15, 0.2);
    p.lean += 14 * look;
    const [nx] = ankleAt(base.near, base.bob);
    const [fx] = ankleAt(base.far, base.bob);
    const shake = (ph) => [6 * Math.sin(t * 2 * Math.PI * 7 + ph), 4 * Math.sin(t * 2 * Math.PI * 7 + ph + 1)];
    const [ax, ay] = shake(0);
    const [bx, by] = shake(1);
    blendSide(p.near, reach(p.bob, nx + 16 + ax, 222 + ay), near);
    blendSide(p.far, reach(p.bob, fx + 14 + bx, 224 + by), far);
    blendSide(p.near, reach(p.bob, nx + clickTrack([[4.0, 18], [4.9, -16]], t), 238), wipe);
    const balance = 0.8 * Math.max(near, far);
    idleReachBody(p, 'near', 132, 108, balance);
    idleReachBody(p, 'far', 16, 110, balance);
    for (const [side, from, to] of [['near', 1.0, 2.2], ['far', 2.6, 3.8]]) {
      if (t < from || t > to) continue;
      const [kx, ky] = ankleAt(p[side], p.bob);
      for (let k = 0; k < 3; k += 1) {
        const age = (t - from + k * 0.17) % 0.5;
        out.fx += `<circle class="idle-drop" cx="${idleF(kx + 10 + (k - 1) * 30 * age)}" cy="${idleF(ky - 6 - 30 * age + 140 * age * age)}" r="2" opacity="${(1 - age / 0.5).toFixed(2)}"/>`;
      }
    }
  }, {
    beats: [
      [1.0, () => idleSound('bootSquelch', { vol: 0.26, vary: 0.05 }, () => sfx.hiss({ type: 'lowpass', freq: 700, vol: 0.14, dur: 0.18, attack: 0.02 }))],
      [2.6, () => idleSound('bootSquelch', { vol: 0.24, vary: 0.05 }, null)],
      [4.1, () => idleSound('bootSquelch', { vol: 0.18, rate: 0.9, vary: 0.05 }, null)],
      [4.3, () => idleSay('Soaked.', 1300)],
    ],
  });
}

// Crouched, an arm swept through the mist; then both arms out, and the
// gap round him widens.
function idleMistAct() {
  return idleAct('mist', 6.4, (t, p, out) => {
    const sweep = clickTrack([[0.5, 0], [0.9, 1], [2.2, 1], [2.5, 0]], t);
    const sx = clickTrack([[0.8, 20], [2.2, 176]], t);
    const crouch = between(t, 0.5, 2.4, 0.35, 0.35);
    const part = between(t, 2.6, 4.7, 0.4, 0.5);
    const wide = clickTrack([[2.6, 0], [3.6, 1]], t);
    clickCrouch(p, 34, crouch);
    p.lean += 16 * crouch;
    idleReachRig(p, 'near', sx, 222, sweep);
    idleReachBody(p, 'near', mix(112, 140, wide), 108, part);
    idleReachBody(p, 'far', mix(48, 4, wide), 108, part);
    const gap = 1 + 2.4 * clickTrack([[2.7, 0], [3.8, 1], [4.4, 1], [6.2, 0]], t) + 0.5 * crouch;
    skyMist?.style.setProperty('--gap-w', gap.toFixed(2));
    for (const [x, k] of [[40, 0], [100, 1], [160, 2]]) {
      const pass = 0.9 + ((x - 20) / 156) * 1.3;
      const o = between(t, pass, pass + 1.8, 0.15, 0.9);
      if (o < 0.02) continue;
      const y = 226 - 4 * k;
      out.fx += `<path class="idle-curl" opacity="${o.toFixed(2)}" d="M${x - 16} ${y + 6}c9 -13 25 -7 18 2c-4 6 -11 1 -7 -3"/>`;
    }
  }, {
    beats: [[0.9, () => idleSounds.swish(0.14)], [2.7, () => sfx.hiss({ type: 'lowpass', freq: 600, to: 1200, vol: 0.08, dur: 1.2, attack: 0.4 })]],
    end: () => skyMist?.style.removeProperty('--gap-w'),
  });
}

// Four star jumps, and his hands shaken out.
function idleJumpsAct() {
  let landings = 0;
  return idleAct('jumps', 5.2, (t, p, out, act, base) => {
    const on = t >= 0.4 && t < 3.6;
    const u = ((t - 0.4) / 0.8) % 1;
    const open = on ? 0.5 - 0.5 * Math.cos(2 * Math.PI * u) : 0;
    const air = on ? Math.abs(Math.sin(2 * Math.PI * u)) : 0;
    p.bob -= 22 * air;
    const [nx] = ankleAt(base.near, base.bob);
    const [fx] = ankleAt(base.far, base.bob);
    Object.assign(p.near, reach(p.bob, nx + 30 * open, 242 - 20 * air));
    Object.assign(p.far, reach(p.bob, fx - 30 * open, 242 - 20 * air));
    idleReachBody(p, 'near', 122, -8, open);
    idleReachBody(p, 'far', 18, -8, open);
    const shake = between(t, 3.8, 4.8, 0.15, 0.2);
    idleReachBody(p, 'near', 90, 150 + 6 * Math.sin(t * 40), shake);
    idleReachBody(p, 'far', 58, 150 + 6 * Math.sin(t * 40 + 1.5), shake);
    const landed = on ? Math.floor((t - 0.4) / 0.4) : landings;
    if (landed > landings) {
      landings = landed;
      idleSound('land', { vol: 0.1, rate: 1.15, vary: 0.05 }, () => sfx.tap(0.7));
    }
  }, { beats: [[3.9, () => idleSounds.breathOut(0.12)]] });
}

/* ================================================================= day */

// Explaining a bug to a rubber duck, until he sees it.
function idleDuckAct() {
  return idleAct('duck', 7.2, (t, p) => {
    const out = between(t, 0.4, 6.7, 0.4, 0.4);
    const explain = between(t, 1.2, 3.5, 0.3, 0.3);
    const oh = between(t, 3.8, 5.0, 0.08, 0.3);
    const bob = between(t, 5.3, 6.2, 0.1, 0.2);
    idleReachBody(p, 'near', 124, 46 + 3 * bob * Math.sin(t * 14), out);
    idleReachBody(p, 'far', 116 + 8 * Math.sin(t * 5.1), 86 + 10 * Math.sin(t * 3.3), explain);
    idleReachBody(p, 'far', 98, 12, oh);
    p.lean += 3 * out - 7 * oh;
    idleHold(p, 'duck', 0, out > 0.2);
  }, {
    beats: [
      [0.5, idleSounds.cloth],
      [1.2, () => idleSay('So it runs twice because&hellip;', 2200)],
      [3.9, () => idleSay('Oh.', 1000)],
      [5.2, () => idleSay('Thanks, duck.', 1400)],
      [5.35, () => idleSound('duckSqueak', { vol: 0.24, vary: 0.04 }, () => sfx.tone(1400, { type: 'square', to: 900, vol: 0.03, dur: 0.18 }))],
    ],
  });
}

// Paper balls he has thrown over his shoulder, left lying about: at most
// three in the world.
const idlePaperBalls = [];
function idleLeaveBall(x) {
  const el = document.createElement('span');
  el.className = 'world-paperball';
  el.style.left = `${x.toFixed(1)}px`;
  world.append(el);
  idlePaperBalls.push(el);
  if (idlePaperBalls.length > 3) idlePaperBalls.shift().remove();
}

// A wireframe sketched on a sticky note, looked at, crumpled and tossed;
// a second one gets a nod and goes on his shirt.
function idlePrototypeAct() {
  let from = null;
  let landed = false;
  const BALL_AT = -80; // rig x it lands behind him, and rolls to
  return idleAct('prototype', 7.6, (t, p, out) => {
    const d1 = between(t, 0.4, 2.3, 0.3, 0.2);
    const h1 = between(t, 2.4, 3.6, 0.25, 0.2);
    const cr = between(t, 3.6, 4.3, 0.12, 0.12);
    const toss = between(t, 4.25, 4.8, 0.1, 0.25);
    const d2 = between(t, 4.9, 5.8, 0.25, 0.2);
    const h2 = between(t, 5.8, 6.6, 0.2, 0.2);
    const stick = between(t, 6.6, 7.4, 0.2, 0.25);
    const draw = d1 + d2;
    idleReachBody(p, 'far', 102, 104, draw);
    idleReachBody(p, 'near', 106 + 5 * Math.sin(t * 13), 92 + 3 * Math.cos(t * 9), draw);
    idleReachBody(p, 'near', 146, 50, h1 + h2);
    idleReachBody(p, 'near', 104, 96, cr);
    idleReachBody(p, 'far', 100, 100, cr);
    idleReachBody(p, 'near', 40, 22, toss);
    idleReachBody(p, 'near', 92, 96, stick);
    p.lean += 12 * draw - 4 * (h1 + h2) + 6 * cr + 3 * between(t, 6.0, 6.5, 0.1, 0.1) * Math.sin(t * 20);
    idleHold(p, 'pad', 0, draw > 0.2, 'far');
    const pen = draw > 0.2;
    const note = h1 > 0.3 || h2 > 0.3 || (t > 6.5 && t < 6.95);
    const ball = t >= 3.65 && t < 4.5;
    idleHold(p, pen ? 'pen' : note ? 'note' : 'ball', pen ? 180 : 0, pen || note || ball);
    idleProp.chestNote?.setAttribute('opacity', t > 6.95 ? '1' : '0');
    if (t >= 4.5) {
      if (!from) from = idleHandRig(p, 'near');
      const u = clamp((t - 4.5) / 0.6, 0, 1);
      const roll = ease(clamp((t - 5.1) / 0.6, 0, 1));
      const x = u < 1 ? mix(from[0], BALL_AT, u) : mix(BALL_AT, BALL_AT - 18, roll);
      const y = u < 1 ? mix(from[1], 236, u) - 70 * Math.sin(Math.PI * u) : 236;
      out.fx += `<circle class="idle-ball" cx="${idleF(x)}" cy="${idleF(y)}" r="6.5"/>`;
      if (u >= 1 && !landed) {
        landed = true;
        sfx.tap(1.6);
      }
    }
  }, {
    beats: [
      [0.5, () => idleSound('scribble', { vol: 0.24, vary: 0.04 }, () => sfx.rustle(0.9))],
      [3.7, () => idleSound('paperCrumple', { vol: 0.28, vary: 0.04 }, () => sfx.rustle(0.6))],
      [4.3, () => idleSounds.swish(0.16)],
      [5.0, () => idleSound('scribble', { vol: 0.2, rate: 1.1, vary: 0.04 }, () => sfx.rustle(0.5))],
      [6.8, () => idleSound('stickyNote', { vol: 0.26, vary: 0.04 }, () => sfx.rustle(0.15))],
    ],
    end: () => {
      if (landed) idleLeaveBall(idleWorldX(BALL_AT - 18));
    },
  });
}

// His hands making a frame: landscape, portrait, landscape.
function idleFrameAct() {
  return idleAct('frame', 6.4, (t, p, out) => {
    const frame = between(t, 0.5, 5.6, 0.4, 0.4);
    const back = between(t, 1.3, 5.6, 0.5, 0.5);
    const port = between(t, 3.0, 4.2, 0.3, 0.3);
    p.lean -= 6 * back;
    idleReachBody(p, 'near', mix(136, 122, port), mix(30, 14, port), frame);
    idleReachBody(p, 'far', mix(90, 104, port), mix(62, 70, port), frame);
    if (frame > 0.3) {
      const [ax, ay] = idleHandRig(p, 'near');
      const [bx, by] = idleHandRig(p, 'far');
      const o = clamp((frame - 0.3) / 0.4, 0, 1).toFixed(2);
      out.fx += `<g opacity="${o}"><rect class="idle-frame-fill" x="${idleF(Math.min(ax, bx))}" y="${idleF(Math.min(ay, by))}" width="${idleF(Math.abs(ax - bx))}" height="${idleF(Math.abs(ay - by))}"/>`
        + `<path class="idle-frame" d="M${idleF(ax - 16)} ${idleF(ay)}H${idleF(ax)}V${idleF(ay + 16)}M${idleF(bx + 16)} ${idleF(by)}H${idleF(bx)}V${idleF(by - 16)}"/></g>`
        + idleTag((ax + bx) / 2, Math.min(ay, by) - 22, port > 0.5 ? '9:16' : '16:9', clamp((frame - 0.5) / 0.3, 0, 1) * (t < 4.5 ? 1 : 0));
    }
  }, { beats: [[3.05, () => idleSounds.click(0.12)], [4.2, () => idleSounds.click(0.12)], [4.6, () => idleSay('Landscape. Definitely.', 1700)]] });
}

// Where the bird comes down beside him for his lunch, and off again.
function idleBirdVisit() {
  if (bird.mode === 'roosting' || livingReduced.matches) return;
  const target = { x: state.x + idleFacing() * 92 * view.unit, y: 0 };
  if (bird.mode === 'away') {
    Object.assign(bird, { x: target.x + idleFacing() * sceneWidth * 0.6, y: sceneHeight * 0.9 });
  }
  flyTo(target, 'visit');
}
function idleBirdAway() {
  if (bird.mode === 'visit' || bird.flight?.then === 'visit') flush(state.x);
}

// Sitting with a sandwich; the bird comes down for the crumbs.
function idleLunchAct() {
  let pecking = 0;
  return idleAct('lunch', 8.6, (t, p, out, act, base) => {
    const sitK = clickTrack([[0.2, 0], [1.1, 1], [7.4, 1], [8.4, 0]], t);
    const q = idleSitBlend(base, floorSitPose(base, 6), sitK);
    const hold = between(t, 0.9, 6.3, 0.3, 0.3);
    const bite = between(t, 1.2, 1.8, 0.18, 0.18) + between(t, 2.0, 2.6, 0.18, 0.18);
    const toss = between(t, 4.1, 4.7, 0.12, 0.2);
    const wave = between(t, 6.4, 7.1, 0.15, 0.2);
    idleReachBody(q, 'near', 100, 94, hold * (1 - bite) * (1 - toss));
    idleReachBody(q, 'near', 96, 50, bite);
    idleReachBody(q, 'near', 140, 104, toss);
    const lap = lapAt(q);
    aimArm(q, 'far', lap.x + 12, lap.y - 10, sitK * (1 - wave));
    idleReachBody(q, 'far', 104 + 8 * Math.sin(t * 16), -2, wave);
    idleHold(q, 'sandwich', 0, hold > 0.3 && t < 6.2);
    // Crumbs off each bite, and the piece he tosses the bird.
    for (const [at, dx] of [[1.55, 0], [1.6, 8], [2.35, -5]]) {
      const age = t - at;
      if (age < 0 || t > 7.3) continue;
      const [mx, my] = idleBody(q, 98, 56);
      out.fx += `<circle class="idle-crumb" cx="${idleF(mx + dx + 4)}" cy="${idleF(Math.min(240, my + 260 * age * age))}" r="2"/>`;
    }
    if (bird.mode === 'visit') {
      const [bx] = idleWorldToRig(bird.x, 0);
      if (t > 4.45 && t < 5.2) {
        const u = clamp((t - 4.45) / 0.45, 0, 1);
        const from = [150, 120];
        out.fx += `<circle class="idle-crumb" cx="${idleF(mix(from[0], bx - 10, u))}" cy="${idleF(mix(from[1], 240, u) - 40 * Math.sin(Math.PI * u))}" r="3"/>`;
      }
      const peck = Math.floor(t * 1.4);
      if (peck !== pecking) {
        pecking = peck;
        bird.el?.classList.add('is-pecking');
        window.setTimeout(() => bird.el?.classList.remove('is-pecking'), 380);
      }
      bird.dir = Math.sign(state.x - bird.x) || bird.dir;
    }
    return q;
  }, {
    pin: true,
    outTime: 0.6,
    beats: [
      [0.4, idleSounds.cloth], [1.0, () => sfx.rustle(0.3)],
      [1.35, () => sfx.bite?.()], [2.15, () => sfx.bite?.()],
      [2.6, idleBirdVisit],
      [3.6, idleSounds.chirp],
      [6.4, idleBirdAway],
      [7.5, idleSounds.cloth],
    ],
    end: idleBirdAway,
  });
}

// A progress bar on his phone that crawls to 99%, then passes.
function idleBuildAct() {
  return idleAct('build', 7.6, (t, p, out) => {
    const phone = between(t, 0.4, 7.0, 0.35, 0.4);
    const tap = between(t, 2.6, 4.5, 0.2, 0.2);
    const roll = between(t, 3.6, 4.5, 0.2, 0.3);
    const pump = between(t, 5.2, 6.0, 0.1, 0.25);
    idleReachBody(p, 'near', 104, 92, phone * (1 - pump));
    idleReachBody(p, 'near', 104, -8, pump);
    p.lean += 8 * phone * (1 - pump) - 14 * roll;
    blendSide(p.near, { ankle: p.near.ankle - 16 * Math.max(0, Math.sin(t * 2 * Math.PI * 3)) }, tap);
    idlePhone(p, phone > 0.1);
    idlePhoneShows('is-lit');
    const prog = clickTrack([[0.8, 0], [1.8, 0.78], [3.0, 0.99], [5.0, 0.99], [5.1, 1]], t);
    const [hx, hy] = idleBody(p, 70, -20);
    out.fx += idleTag(hx + 10, hy, prog >= 1 ? 'build passed' : `build ${Math.floor(prog * 100)}%`, between(t, 0.7, 6.8, 0.2, 0.3));
  }, { beats: [[0.5, () => idleSounds.click()], [3.7, () => idleSounds.breathOut(0.12)], [5.1, () => idleSound('buildPass', { vol: 0.24, vary: 0 }, () => sfx.chime())]] });
}

// On a video call, the phone at arm's length. They're on mute.
function idleMuteAct() {
  return idleAct('mute', 7, (t, p) => {
    const out = between(t, 0.4, 6.4, 0.4, 0.4);
    const wave = between(t, 0.8, 2.0, 0.15, 0.2);
    const point = between(t, 3.7, 5.3, 0.2, 0.25);
    const nod = between(t, 5.6, 6.4, 0.1, 0.1);
    idleReachBody(p, 'near', 138, 34, out);
    idleReachBody(p, 'far', 108 + 6 * Math.sin(t * 15), -4, wave);
    const [hx, hy] = idleHandRig(p, 'near');
    idleReachRig(p, 'far', hx - 8, hy - 4, point);
    p.lean += 2 * out + 3 * nod * Math.sin((t - 5.6) * 25);
    idlePhone(p, out > 0.1);
    if (t > 2.8 && t < 6.2) idlePhoneShows('is-muted');
    else idlePhoneShows('is-lit');
  }, {
    beats: [
      [0.5, () => idleSound('callJoin', { vol: 0.2, vary: 0 }, () => {
        sfx.tone(660, { vol: 0.04, dur: 0.14 });
        sfx.tone(880, { vol: 0.04, dur: 0.2, at: 0.14 });
      })],
      [1.0, () => idleSay('Can you hear me?', 1600)],
      [3.9, () => idleSay('You&rsquo;re on mute.', 1700)],
    ],
  });
}

// The farthest tree top on screen, for him to rest his eyes on.
function idleFarTree() {
  const body = UNITS_TALL * view.unit;
  const trees = idleTreeTops().filter((tree) => onScreen(tree.x, 40) && Math.abs(tree.x - state.x) > 1.2 * body);
  trees.sort((a, b) => Math.abs(b.x - state.x) - Math.abs(a.x - state.x));
  return trees[0] || null;
}

// His eyes rubbed, then 20 seconds (quickly) looking at something far off.
function idleScreenBreakAct() {
  const tree = idleFarTree();
  const face = tree ? Math.sign(tree.x - state.x) : 0;
  return idleAct('screenbreak', 7, (t, p, out) => {
    const rub = between(t, 0.3, 1.4, 0.25, 0.25);
    const look = between(t, 1.6, 5.8, 0.4, 0.4);
    const roll = between(t, 6.0, 6.9, 0.15, 0.2);
    ambient.face = t > 1.4 && t < 6.2 ? face : 0;
    idleReachBody(p, 'near', 96, 26 + 2 * Math.sin(t * 20), rub);
    idleReachBody(p, 'far', 94, 30 + 2 * Math.sin(t * 20 + 1), rub);
    p.lean += 8 * rub - 3 * look + 4 * roll * Math.sin((t - 6) * 14);
    const secs = clamp(Math.ceil(20 * (1 - (t - 1.9) / 3.6)), 0, 20);
    const [hx, hy] = idleBody(p, 70, -22);
    out.fx += idleTag(hx, hy, `${secs} s`, between(t, 1.8, 5.7, 0.3, 0.3));
    if (tree && look > 0.05) {
      const [ex, ey] = idleBody(p, 92, 26);
      const [tx, ty] = idleWorldToRig(tree.x, tree.y * 0.7);
      out.fx += `<path class="idle-dots" opacity="${look.toFixed(2)}" d="M${idleF(ex + 6)} ${idleF(ey)}L${idleF(tx)} ${idleF(ty)}"/>`
        + idleTag(mix(ex, tx, 0.45), mix(ey, ty, 0.45) - 16, '20 ft', look);
    }
  }, { beats: [[5.9, () => idleSounds.breathOut(0.12)]] });
}

// Where a paper plane is, `t` seconds in: from his hand, a loop, and down
// to the floor ahead of him (rig units).
function idlePlaneAt(t, from) {
  const u = clamp((t - 2.78) / 2.3, 0, 1);
  if (u < 0.3) {
    const k = u / 0.3;
    return [mix(from[0], 270, k), mix(from[1], 40, k)];
  }
  if (u < 0.66) {
    const a = ((u - 0.3) / 0.36) * 2 * Math.PI;
    return [270 + 46 * Math.sin(a), -6 + 46 * Math.cos(a)];
  }
  const k = (u - 0.66) / 0.34;
  return [mix(270, 440, k), mix(40, 238, k * k)];
}
// The paper plane where it landed, left lying there: one at a time.
let idlePlaneLeft = null;
function idleLeavePlane(x) {
  idlePlaneLeft?.remove();
  const el = document.createElement('span');
  el.className = 'world-plane';
  el.style.left = `${x.toFixed(1)}px`;
  el.style.setProperty('--turn', idleFacing() > 0 ? '1' : '-1');
  world.append(el);
  idlePlaneLeft = el;
}

// A paper plane folded, thrown, looped, landed. "Close enough."
function idlePlaneAct() {
  let from = null;
  let landed = false;
  return idleAct('plane', 6.8, (t, p, out) => {
    const fold = between(t, 0.3, 2.05, 0.3, 0.15);
    const windup = between(t, 2.0, 2.55, 0.15, 0.08);
    const thr = between(t, 2.5, 3.0, 0.08, 0.35);
    const shrug = between(t, 5.3, 6.3, 0.2, 0.3);
    const wobbleX = 3 * Math.sin(t * 9) * fold;
    idleReachBody(p, 'near', 106 + wobbleX, 92, fold);
    idleReachBody(p, 'far', 100 - wobbleX, 96, fold);
    idleReachBody(p, 'near', 40, 30, windup);
    idleReachBody(p, 'near', 150, 40, thr);
    idleReachBody(p, 'near', 118, 124, shrug);
    idleReachBody(p, 'far', 34, 124, shrug);
    p.lean += -6 * windup + 10 * thr + 3 * shrug;
    idleHold(p, t < 1.3 ? 'sheet' : 'plane', t < 1.3 ? 0 : -6, t > 0.3 && t < 2.78);
    if (t >= 2.78) {
      if (!from) from = idleHandRig(p, 'near');
      const [x, y] = idlePlaneAt(t, from);
      const [x2, y2] = idlePlaneAt(t + 0.02, from);
      if (t >= 5.08) landed = true;
      const a = landed ? 0 : deg(Math.atan2(y2 - y, x2 - x));
      out.fx += `<path class="idle-plane" transform="translate(${idleF(x)} ${idleF(y)}) rotate(${a.toFixed(0)})" d="M16 0L-14 -8L-7 0L-14 7Z"/>`;
    }
  }, {
    beats: [
      [0.5, () => idleSound('paperFold', { vol: 0.24, vary: 0.05 }, () => sfx.rustle(0.2))],
      [1.0, () => idleSound('paperFold', { vol: 0.22, vary: 0.05 }, () => sfx.rustle(0.2))],
      [1.5, () => idleSound('paperFold', { vol: 0.2, vary: 0.05 }, () => sfx.rustle(0.2))],
      [2.62, () => idleSounds.swish(0.2)],
      [3.3, () => sfx.hiss({ freq: 1200, to: 2400, q: 1.2, vol: 0.05, dur: 0.8, attack: 0.3 })],
      [5.1, () => sfx.tap(2.2)],
      [5.35, () => idleSay('Close enough.', 1500)],
    ],
    end: () => {
      if (landed) idleLeavePlane(idleWorldX(440));
    },
  });
}

// A kite, up on a gust (idleGustAct), tugged higher, and down again as
// it dies away. He faces downwind, the kite ahead of him.
function idleKiteAct(dir) {
  wind.left = Math.max(wind.left, 5.2);
  let held = null;
  return idleAct('kite', 7.4, (t, p, out) => {
    ambient.face = dir;
    const fly = between(t, 0.3, 6.6, 0.4, 0.6);
    const tug = between(t, 2.2, 2.7, 0.1, 0.15) + between(t, 3.2, 3.7, 0.1, 0.15);
    const carry = between(t, -1, 0.9, 0.01, 0.4) + between(t, 6.3, 9, 0.5, 0.01);
    idleReachBody(p, 'near', 120 - 8 * tug, 52 + 16 * tug, fly);
    idleReachBody(p, 'far', 112, 76, carry);
    p.lean -= 7 * fly;
    held = idleHandRig(p, 'far');
    const lift = between(t, 2.3, 4.4, 0.4, 0.6);
    const hover = [330 + 18 * Math.sin(t * 1.7), -110 + 14 * Math.sin(t * 2.3) - 40 * lift];
    const hand = [held[0] + 8, held[1] - 18];
    let k;
    if (t < 0.4) k = hand;
    else if (t < 1.7) k = [mix(hand[0], hover[0], ease((t - 0.4) / 1.3)), mix(hand[1], hover[1], ease((t - 0.4) / 1.3))];
    else if (t < 4.4) k = hover;
    else {
      const d = ease(clamp((t - 4.4) / 2.0, 0, 1));
      k = [mix(hover[0], hand[0], d) + 22 * Math.sin(t * 6) * (1 - d), mix(hover[1], hand[1], d)];
    }
    const [sx, sy] = idleHandRig(p, 'near');
    if (fly > 0.1 && t > 0.4 && t < 6.4) out.fx += `<path class="idle-string" d="M${idleF(sx)} ${idleF(sy)}Q${idleF((sx + k[0]) / 2)} ${idleF(Math.max(sy, k[1]) + 30)} ${idleF(k[0])} ${idleF(k[1] + 16)}"/>`;
    let tail = `M${idleF(k[0])} ${idleF(k[1] + 18)}`;
    for (let i = 1; i <= 5; i += 1) tail += `L${idleF(k[0] - 11 * i)} ${idleF(k[1] + 18 + 9 * i + 4 * Math.sin(t * 7 + i))}`;
    out.fx += `<path class="idle-string" d="${tail}"/>`;
    for (let i = 1; i <= 4; i += 1) out.fx += `<path class="idle-bow" d="M${idleF(k[0] - 11 * i - 4)} ${idleF(k[1] + 18 + 9 * i + 4 * Math.sin(t * 7 + i) - 3)}l8 6m0 -6l-8 6"/>`;
    const rot = 16 + 8 * Math.sin(t * 3.1);
    out.fx += `<g transform="translate(${idleF(k[0])} ${idleF(k[1])}) rotate(${rot.toFixed(0)})"><path class="idle-kite" d="M0 -20L14 -2L0 18L-14 -2Z"/><path class="idle-string" d="M0 -20V18M-14 -2H14"/></g>`;
  }, {
    beats: [
      [0.4, () => idleSound('kiteFlap', { vol: 0.24, vary: 0.04 }, () => sfx.flaps())],
      [2.25, idleSounds.cloth],
      [3.0, () => idleSound('kiteFlap', { vol: 0.18, rate: 1.1, vary: 0.04 }, null)],
      [4.6, () => idleSound('kiteFlap', { vol: 0.14, rate: 0.9, vary: 0.04 }, null)],
    ],
  });
}

// What he says at his standup: what he fixed in the last day or so, going
// by the incident log.
function idleStandupLines() {
  const since = Date.now() - 36 * 3600e3;
  const fixed = (memory.data.incidents || []).filter((item) => item.secs !== null && item.at > since);
  const lamps = fixed.filter((item) => /lamp|lantern/.test(item.id)).length;
  const yesterday = lamps ? `Yesterday: fixed ${lamps} lamp${lamps > 1 ? 's' : ''}.`
    : fixed.length ? `Yesterday: fixed ${fixed.length} thing${fixed.length > 1 ? 's' : ''}.`
      : 'Yesterday: kept the fire going.';
  return [yesterday, 'Today: this portfolio.', 'Blockers: none.'];
}

// His standup, to himself, on his fingers.
function idleStandupAct() {
  const lines = idleStandupLines();
  return idleAct('standup', 8, (t, p, out) => {
    const count = between(t, 0.5, 6.5, 0.35, 0.35);
    const clasp = between(t, 6.6, 7.8, 0.3, 0.3);
    idleReachBody(p, 'near', 110, 62, count);
    idleReachBody(p, 'near', 100, 100, clasp);
    idleReachBody(p, 'far', 96, 103, clasp);
    for (const a of [0.6, 2.7, 4.8, 6.7]) p.lean += 5 * between(t, a, a + 0.4, 0.1, 0.2);
    if (count > 0.5) {
      const [hx, hy] = idleHandRig(p, 'near');
      const n = t < 2.6 ? 1 : t < 4.7 ? 2 : 3;
      let d = '';
      for (let i = 0; i < n; i += 1) d += `M${idleF(hx - 3 + i * 3.5)} ${idleF(hy - 1)}l${idleF(-1.5 + i * 1.6)} -9`;
      out.fx += `<path class="idle-line idle-line--thin" d="${d}"/>`;
    }
  }, { beats: [[0.7, () => idleSay(lines[0], 1900)], [2.8, () => idleSay(lines[1], 1900)], [4.9, () => idleSay(lines[2], 1600)]] });
}

/* ================================================================ dusk */

// His watch, then do not disturb on his phone, and at once it buzzes.
function idleClockOffAct() {
  const watch = runProps.watch;
  return idleAct('clockoff', 7.2, (t, p, out) => {
    const wr = between(t, 0.3, 1.5, 0.25, 0.25);
    const phone = between(t, 1.6, 3.5, 0.3, 0.2);
    const tap = between(t, 2.1, 2.6, 0.1, 0.12);
    const pocket = between(t, 3.4, 5.5, 0.15, 0.25);
    const exhale = between(t, 3.8, 4.6, 0.2, 0.2);
    const slump = between(t, 4.7, 7.0, 0.1, 0.35);
    const again = between(t, 5.3, 7.0, 0.3, 0.3);
    idleReachBody(p, 'near', 98, 62, wr);
    idleReachBody(p, 'near', 104, 94, phone + again);
    const [hx, hy] = idleHandRig(p, 'near');
    idleReachRig(p, 'far', hx + 4, hy - 10, tap);
    idleReachBody(p, 'near', 84, 146, pocket * (1 - again));
    p.lean += 4 * wr + 8 * phone - 5 * exhale + 9 * slump;
    watch?.setAttribute('opacity', wr > 0.1 ? '1' : '0');
    idlePhone(p, phone > 0.1 || again > 0.1);
    if (t > 2.4 && t < 5.2) idlePhoneShows('is-dnd');
    else idlePhoneShows('is-lit');
    const [tx, ty] = idleBody(p, 104, -4);
    out.fx += idleTag(tx, ty, clockText(idleHour()), between(t, 0.5, 1.5, 0.15, 0.2))
      + idleTag(tx, ty, 'do not disturb', between(t, 2.4, 3.5, 0.15, 0.2));
    const [px, py] = idleBody(p, 82, 142);
    out.fx += idleBuzz(px, py, between(t, 4.6, 5.3, 0.05, 0.1));
  }, {
    beats: [
      [0.6, () => idleSound('watchTap', { vol: 0.22, vary: 0.02 }, () => sfx.tone(3000, { type: 'triangle', vol: 0.04, dur: 0.03 }))],
      [2.35, () => idleSounds.click()],
      [4.0, () => idleSounds.breathOut(0.16)],
      [4.65, idleSounds.vibrate],
      [5.6, () => idleSay('On call. Right.', 1500)],
    ],
  });
}

// Two shots of the sunset on his phone: the first crooked, the second not.
function idleThumb(x, y, tilt, o) {
  if (o < 0.05) return '';
  return `<g opacity="${o.toFixed(2)}" transform="translate(${idleF(x)} ${idleF(y)}) scale(${idleFacing()} 1)"><rect class="idle-photo-frame" x="-19" y="-13" width="38" height="26" rx="3"/>`
    + '<rect x="-16" y="-10" width="32" height="20" fill="#7a5a80"/><circle cx="4" cy="2" r="5.5" fill="#ff9d60"/>'
    + `<path d="M-16 ${idleF(2 + tilt)}L16 ${idleF(2 - tilt)}V10H-16Z" fill="#3b2c3c"/></g>`;
}
function idlePhotoAct() {
  const sun = idleSunSpot();
  const face = sun ? Math.sign(sun.worldX - state.x) || 1 : 1;
  return idleAct('photo', 7.2, (t, p, out) => {
    ambient.face = t < 6.9 ? face : 0;
    const shot1 = between(t, 0.5, 2.6, 0.35, 0.3);
    const crouch = between(t, 0.7, 2.5, 0.35, 0.3);
    const look1 = between(t, 2.7, 3.7, 0.25, 0.25);
    const look2 = between(t, 5.6, 6.9, 0.25, 0.3);
    const shot2 = between(t, 3.8, 5.5, 0.3, 0.3);
    clickCrouch(p, 30, crouch);
    idleReachBody(p, 'near', 134, 34, shot1);
    idleReachBody(p, 'far', 126, 44, shot1);
    idleReachBody(p, 'near', 136, 14, shot2);
    idleReachBody(p, 'far', 128, 24, shot2);
    idleReachBody(p, 'near', 104, 88, look1 + look2);
    p.lean += 6 * crouch + 8 * (look1 + look2) + 2.5 * between(t, 3.1, 3.7, 0.1, 0.1) * Math.sin(t * 28);
    const shooting = shot1 + shot2 > 0.3;
    idlePhone(p, shot1 + shot2 + look1 + look2 > 0.1, shooting ? 90 : 0);
    idlePhoneShows('is-lit');
    const [hx, hy] = idleHandRig(p, 'near');
    out.fx += idleThumb(hx + 4, hy - 34, 5, look1) + idleThumb(hx + 4, hy - 34, 0, look2);
    idleFlash(0.5 * Math.max(between(t, 1.9, 2.15, 0.02, 0.2), between(t, 4.8, 5.05, 0.02, 0.2)));
  }, {
    beats: [
      [1.9, () => idleSound('shutter', { vol: 0.24, vary: 0.03 }, () => sfx.hiss({ type: 'highpass', freq: 3000, vol: 0.08, dur: 0.05, attack: 0.002 }))],
      [4.8, () => idleSound('shutter', { vol: 0.24, vary: 0.03 }, () => sfx.hiss({ type: 'highpass', freq: 3000, vol: 0.08, dur: 0.05, attack: 0.002 }))],
      [6.0, () => idleSay('Got it.', 1200)],
    ],
  });
}

// Where the switched lights he can point at are: world px along, px up.
function idleLightSpots() {
  const u = view.unit;
  const w = STATUE.width;
  return [
    { id: 'lamp-left', x: nameEnd + (-w - 550) * u, y: 310 * u },
    { id: 'lamp-right', x: nameEnd + 140 * u, y: 310 * u },
    { id: 'lantern', x: campX - 140 * u, y: 172 * u },
    ...IDLE_PATH_LAMPS.map((lamp) => ({ id: lamp.id, x: experienceX + (lamp.at + 30) * u, y: 310 * u })),
  ];
}
// The lights on screen that are off, nearest first: at most two.
function idleLampsToSnap() {
  return idleLightSpots()
    .filter((spot) => onScreen(spot.x, 40) && lamps.lit[spot.id] === false && Math.abs(spot.x - state.x) > 40 * view.unit)
    .sort((a, b) => Math.abs(a.x - state.x) - Math.abs(b.x - state.x))
    .slice(0, 2);
}

// A snap of his fingers at a lamp, and it comes on; then the next; a bow.
function idleConductAct() {
  const targets = idleLampsToSnap();
  const two = targets.length > 1;
  const snapAt = [2.1, 3.9];
  const [first] = targets;
  const faceTo = (spot) => (spot ? Math.sign(spot.x - state.x) || 1 : 0);
  const bowAt = two ? 5.0 : 3.2;
  const snap = (i) => {
    const spot = targets[i];
    if (!spot) return;
    idleSound('snap', { vol: 0.3, vary: 0.04 }, () => sfx.hiss({ freq: 2500, q: 2, vol: 0.3, dur: 0.04, attack: 0.001 }));
    window.setTimeout(() => holdLamp(spot.id, true), 160);
  };
  return idleAct('conduct', two ? 7.2 : 5.4, (t, p, out) => {
    const next = two ? clickTrack([[2.9, 0], [3.4, 1]], t) : 0;
    ambient.face = faceTo(next < 0.5 ? first : targets[1]);
    const raise = between(t, 0.4, bowAt - 0.1, 0.35, 0.3);
    const jolt = between(t, 2.1, 2.3, 0.04, 0.12) + (two ? between(t, 3.9, 4.1, 0.04, 0.12) : 0);
    const bow = between(t, bowAt, bowAt + 1.4, 0.3, 0.35);
    if (first) {
      const at = next < 0.5 ? first : targets[1];
      const [ax, ay] = idleWorldToRig(at.x, at.y);
      idleReachRig(p, 'near', ax, ay + 40 * jolt, raise * (1 - 2 * Math.min(next, 1 - next)));
      p.lean -= 4 * raise;
    }
    idleReachBody(p, 'near', 96, 116, bow);
    idleReachBody(p, 'far', 50, 136, bow);
    p.lean += 38 * bow;
    for (const at of two ? snapAt : [snapAt[0]]) {
      const o = between(t, at, at + 0.4, 0.03, 0.3);
      if (o < 0.05) continue;
      const [hx, hy] = idleHandRig(p, 'near');
      const r = 8 + 14 * clamp((t - at) / 0.4, 0, 1);
      let d = '';
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * 2 * Math.PI;
        d += `M${idleF(hx + r * Math.cos(a))} ${idleF(hy + r * Math.sin(a))}l${idleF(5 * Math.cos(a))} ${idleF(5 * Math.sin(a))}`;
      }
      out.fx += `<path class="idle-snap" opacity="${o.toFixed(2)}" d="${d}"/>`;
    }
  }, { beats: [[snapAt[0], () => snap(0)], [snapAt[1], () => two && snap(1)]] });
}

// Where the firefly is, `t` seconds in, round the point he claps it at.
function idleFireflyAt(t, at) {
  if (t < 2.0) {
    const k = ease(t / 2);
    return [mix(330, at[0], k) + 20 * Math.sin(t * 3) * (1 - k), mix(40, at[1], k) + 14 * Math.sin(t * 4.3) * (1 - k)];
  }
  const k = clamp((t - 4.5) / 2.2, 0, 1);
  return [mix(at[0] + 10, 320, k) + 12 * Math.sin(t * 4), mix(at[1] - 30, -170, k)];
}

// A firefly cupped in his hands, peeked at, and let go.
function idleFireflyAct() {
  const AT = [150, 96];
  return idleAct('firefly', 7.2, (t, p, out) => {
    const caught = between(t, 1.9, 4.6, 0.18, 0.3);
    const peek = between(t, 2.6, 4.2, 0.3, 0.3);
    const open = between(t, 4.4, 5.2, 0.12, 0.3);
    idleReachRig(p, 'near', AT[0] + 3, AT[1] - 4, caught * (1 - peek));
    idleReachRig(p, 'far', AT[0] - 3, AT[1] + 4, caught * (1 - peek));
    idleReachBody(p, 'near', 112, 38, peek);
    idleReachBody(p, 'far', 108, 46, peek);
    idleReachBody(p, 'near', 126, 8, open);
    idleReachBody(p, 'far', 122, 72, open);
    p.lean += 10 * peek;
    if (t < 2.0 || t > 4.5) {
      const [x, y] = idleFireflyAt(t, AT);
      out.glow += idleGlowDot(x, y, 0.6 + 0.4 * Math.sin(t * 6), 3.6);
    } else {
      const [ax, ay] = idleHandRig(p, 'near');
      const [bx, by] = idleHandRig(p, 'far');
      const pulse = 0.7 + 0.3 * Math.sin(t * 5);
      out.glow += `<circle class="idle-halo" cx="${idleF((ax + bx) / 2)}" cy="${idleF((ay + by) / 2)}" r="${idleF(30 * pulse)}" opacity="0.9"/>`;
    }
  }, {
    beats: [
      [2.0, () => idleSound('clap', { vol: 0.1, rate: 0.85, vary: 0.05 }, () => sfx.hiss({ freq: 900, q: 1, vol: 0.1, dur: 0.06, attack: 0.002 }))],
      [4.5, () => sfx.sparkle(0)],
    ],
  });
}

// A marshmallow on a long stick, toasted, set alight, blown out, eaten.
function idleMarshmallowAct() {
  const face = Math.sign(idleFireX() - state.x) || 1;
  return idleAct('marshmallow', 8.6, (t, p, out) => {
    ambient.face = face;
    const down = clickTrack([[0.3, 0], [1.1, 1], [7.4, 1], [8.3, 0]], t);
    clickCrouch(p, 44, down);
    const hold = between(t, 0.9, 7.4, 0.3, 0.3);
    const pull = between(t, 3.5, 6.7, 0.25, 0.35);
    const eat = between(t, 6.7, 7.35, 0.15, 0.15);
    const blow = between(t, 3.8, 4.6, 0.12, 0.2);
    p.lean += 14 * down + 6 * blow;
    idleReachBody(p, 'near', 128, 112, hold * (1 - pull) * (1 - eat));
    idleReachBody(p, 'near', 112, 80, pull * (1 - eat));
    idleReachBody(p, 'near', 98, 50, eat);
    const [kx, ky] = idleKnee(p, 'far');
    idleReachRig(p, 'far', kx + 8, ky - 4, down);
    // The stick at the flames, then up in front of his face.
    const [fx, fy] = idleWorldToRig(idleFireX(), 22 * view.unit);
    const [hx, hy] = idleHandRig(p, 'near');
    const atFire = deg(Math.atan2(fy - hy, fx - hx)) - 90;
    const angle = mix(atFire, -178, pull);
    const shown = hold > 0.2 && eat < 0.5;
    idleHold(p, 'longstick', angle, shown);
    const toast = clickTrack([[1.2, 0], [3.4, 1]], t);
    if (idleProp.mallow) {
      idleProp.mallow.style.fill = t > 4.5 ? '#3a2a22' : `rgb(${Math.round(mix(255, 212, toast))} ${Math.round(mix(252, 146, toast))} ${Math.round(mix(246, 86, toast))})`;
    }
    const tipA = (angle + 90) * RAD;
    const tip = [hx + 128 * Math.cos(tipA), hy + 128 * Math.sin(tipA)];
    if (shown && t > 3.4 && t < 4.5) {
      const h = 16 + 3 * Math.sin(t * 20);
      out.glow += idleGlowDot(tip[0], tip[1] - 8, 1, 6)
        + `<path class="idle-flame" d="M${idleF(tip[0] - 6)} ${idleF(tip[1] - 4)}Q${idleF(tip[0] - 6)} ${idleF(tip[1] - 4 - h * 0.6)} ${idleF(tip[0])} ${idleF(tip[1] - 4 - h)}Q${idleF(tip[0] + 6)} ${idleF(tip[1] - 4 - h * 0.6)} ${idleF(tip[0] + 6)} ${idleF(tip[1] - 4)}Z"/>`;
    }
    const smoke = between(t, 4.5, 5.8, 0.1, 0.6);
    if (shown && smoke > 0.05) out.fx += `<path class="idle-smoke" opacity="${(0.7 * smoke).toFixed(2)}" d="M${idleF(tip[0])} ${idleF(tip[1] - 10)}q5 -7 0 -14t0 -14"/>`;
    campfireProps.breath?.setAttribute('opacity', blow > 0.3 ? '1' : '0');
  }, {
    beats: [
      [0.6, idleSounds.cloth],
      [3.4, () => idleSound('ignite', { vol: 0.26, vary: 0.04 }, () => sfx.hiss({ type: 'lowpass', freq: 800, vol: 0.2, dur: 0.5, attack: 0.05 }))],
      [3.85, idleSounds.blow], [4.2, idleSounds.blow],
      [5.7, () => idleSay('Crispy.', 1300)],
      [7.0, () => sfx.bite?.()],
    ],
  });
}

// Sitting on the floor to watch the sun go down: knees hugged, then back
// on his hands. As the settle at dusk, he stays till he's needed.
function idleSunsetAct(endless = false) {
  const sun = idleSunSpot();
  const face = sun ? Math.sign(sun.worldX - state.x) || 1 : 1;
  return idleAct('sunset', endless ? undefined : 8.4, (t, p, out, act, base) => {
    ambient.face = face;
    let sitK;
    let hug;
    let back;
    if (endless) {
      sitK = clickTrack([[0.3, 0], [1.3, 1]], t);
      const c = Math.max(0, t - 1.3);
      back = c < 4 ? 0 : 0.5 - 0.5 * Math.cos((2 * Math.PI * (c - 4)) / 14);
      hug = 1 - back;
    } else {
      sitK = clickTrack([[0.3, 0], [1.3, 1], [7.1, 1], [8.1, 0]], t);
      hug = between(t, 1.2, 4.7, 0.4, 0.45);
      back = between(t, 4.6, 6.9, 0.45, 0.35);
    }
    const q = idleSitBlend(base, floorSitPose(base, 8 + 10 * hug - 14 * back), sitK);
    const [kx, ky] = idleKnee(q, 'near');
    idleReachRig(q, 'near', kx + 10, ky + 16, hug * sitK);
    idleReachRig(q, 'far', kx + 6, ky + 20, hug * sitK);
    idleReachRig(q, 'near', 34, 240, back * sitK);
    idleReachRig(q, 'far', 28, 240, back * sitK);
    return q;
  }, { pin: true, outTime: 0.7, beats: [[1.2, idleSounds.cloth], [2.4, () => idleSounds.breathOut(0.14)]] });
}

// A slow, bluesy phrase on a harmonica.
function idleHarmonicaTune() {
  [[392, 0], [466, 0.35], [523, 0.7], [554, 1.05], [587, 1.3], [523, 1.8], [466, 2.2], [392, 2.6]].forEach(([freq, at], i) => {
    sfx.tone(freq, { type: 'square', vol: 0.018, dur: i === 7 ? 0.9 : 0.32, at, attack: 0.03 });
    sfx.tone(freq * 2, { vol: 0.008, dur: 0.25, at });
  });
}
function idleHarmonicaAct() {
  return idleAct('harmonica', 7.4, (t, p, out) => {
    const play = between(t, 0.4, 6.4, 0.35, 0.35);
    const long = between(t, 3.4, 4.8, 0.3, 0.3);
    const flourish = between(t, 6.4, 7.2, 0.15, 0.2);
    idleReachBody(p, 'near', 104, 46, play);
    idleReachBody(p, 'far', 100, 53, play);
    idleReachBody(p, 'near', 132, 118, flourish);
    p.lean += play * 3 * Math.sin(t * 2 * Math.PI * 0.55) - 7 * long;
    clickCrouch(p, 6 * Math.abs(Math.sin(t * Math.PI * 1.1)), play);
    idleHold(p, 'harmonica', 0, play > 0.2);
    const [mx, my] = idleBody(p, 104, 34);
    out.fx += idleNotes(t, 0.8, 3.2, mx + 6, my, 40, -34, 0.5) + idleNotes(t, 3.4, 4.4, mx + 6, my - 4, 18, -44, 0.9) + idleNotes(t, 4.8, 6.1, mx + 6, my, 40, -34, 0.45);
  }, { beats: [[0.7, () => idleSound('harmonica', { vol: 0.26, vary: 0.01 }, idleHarmonicaTune)]] });
}

// Shadow puppets on the tent wall, by the firelight: a bird that flies
// off it, then a dog.
function idlePuppetsAct() {
  const face = Math.sign(campX - 300 * view.unit - state.x) || -1;
  return idleAct('puppets', 7.4, (t, p, out) => {
    ambient.face = face;
    const up = between(t, 0.5, 6.9, 0.4, 0.4);
    const birdK = between(t, 1.0, 4.4, 0.2, 0.2);
    const dog = between(t, 5.0, 6.8, 0.2, 0.2);
    const flap = 5 * Math.sin(t * 14) * birdK;
    const jaw = 5 * Math.abs(Math.sin(t * 6)) * dog;
    idleReachBody(p, 'near', 126, 36 - flap - jaw, up);
    idleReachBody(p, 'far', 122, 46 + flap, up);
    // The tent's face towards the fire, in the rig, and the shadows on it.
    const c = (x, y) => idleWorldToRig(campX + x * view.unit, y * view.unit);
    const [ax, ay] = c(-396, 0);
    const [px, py] = c(-300, 150);
    const [bx, by] = c(-208, 0);
    const clip = `<clipPath id="idle-tent-clip"><path d="M${idleF(ax)} ${idleF(ay)}L${idleF(px)} ${idleF(py)}L${idleF(bx)} ${idleF(by)}Z"/></clipPath>`;
    // Thrown big by the firelight, on the canvas above the door (which
    // is dark, and would hide them).
    let shade = '';
    const lift = clickTrack([[3.6, 0], [4.4, 1]], t);
    const k = 2; // how much bigger the shadow is than his hands
    if (birdK > 0.02) {
      const [x, y] = c(-300 - 30 * lift, 108 + 50 * lift);
      const f = Math.sin(t * 14);
      shade += `<g opacity="${birdK.toFixed(2)}" transform="translate(${idleF(x)} ${idleF(y)}) scale(${k})"><ellipse class="idle-shadow" cx="0" cy="0" rx="12" ry="5"/><circle class="idle-shadow" cx="-12" cy="-3" r="5"/>`
        + `<path class="idle-shadow" d="M6 0L16 ${idleF(-20 * f)}L-2 0ZM0 0L-8 ${idleF(-18 * f)}L-8 0Z"/></g>`;
    }
    if (dog > 0.02) {
      const [x, y] = c(-296, 110);
      const j = 7 * Math.abs(Math.sin(t * 6));
      shade += `<g opacity="${dog.toFixed(2)}" transform="translate(${idleF(x)} ${idleF(y)}) scale(${k})"><ellipse class="idle-shadow" cx="0" cy="0" rx="14" ry="10"/>`
        + `<path class="idle-shadow" d="M-8 -6l-20 2l0 6l20 0zM-8 2l-18 ${idleF(2 + j)}l0 5l18 -2zM6 -8l4 -14l-10 8z"/></g>`;
    }
    out.fx += `${clip}<g clip-path="url(#idle-tent-clip)">${shade}</g>`;
  }, { beats: [[4.2, () => idleSound('birdFlutter', { vol: 0.1, vary: 0.04 }, null)]] });
}

// A tree top near enough for the bird to go to bed in.
function idleRoostSpot() {
  const trees = idleTreeTops().filter((tree) => Math.abs(tree.x - bird.x) < 1.4 * sceneWidth);
  trees.sort((a, b) => Math.abs(a.x - bird.x) - Math.abs(b.x - bird.x));
  return trees[0] || { x: bird.x + sceneWidth * 0.7, y: sceneHeight * 0.9 };
}

// A wave to the bird, off to its roost for the night.
function idleGoodnightAct() {
  let sent = false;
  return idleAct('goodnight', 7, (t, p) => {
    ambient.face = Math.sign(bird.x - state.x) || 0;
    const look = between(t, 0.4, 5.8, 0.4, 0.4);
    const wave = between(t, 2.3, 3.7, 0.2, 0.3);
    const pockets = between(t, 5.4, 7.0, 0.4, 0.3);
    p.lean -= 6 * look;
    idleReachBody(p, 'near', 108 + 10 * Math.sin(t * 16), -12, wave);
    idleReachBody(p, 'near', 86, 146, pockets * (1 - wave));
    idleReachBody(p, 'far', 82, 146, pockets);
    if (!sent && t > 3.8) {
      sent = true;
      bird.bedtime = true;
      if (bird.mode === 'perched') flyTo(idleRoostSpot(), 'roosting');
    }
  }, { beats: [[1.2, idleSounds.chirp], [2.6, () => idleSay('Night.', 1300)], [3.1, idleSounds.chirp]] });
}

// Stars coming out, counted as they do, until there are too many.
function idleFirstStarsAct() {
  const STARS = [[40, -250], [170, -296], [300, -246]];
  const MANY = Array.from({ length: 16 }, (_, i) => [-260 + ((i * 97) % 640), -200 - ((i * 53) % 150)]);
  return idleAct('firststars', 7, (t, p, out) => {
    const w = [between(t, 0.9, 2.1, 0.25, 0.2), between(t, 2.3, 3.5, 0.2, 0.2), between(t, 3.7, 4.9, 0.2, 0.25)];
    STARS.forEach(([x, y], i) => idleReachRig(p, 'near', x, y, w[i]));
    p.lean -= 8 * between(t, 0.8, 5.0, 0.3, 0.4);
    const laugh = between(t, 5.2, 6.8, 0.2, 0.3);
    idleReachBody(p, 'near', 92, 108, laugh);
    clickCrouch(p, 6 * Math.abs(Math.sin(t * 16)), laugh);
    STARS.forEach(([x, y], i) => {
      const o = ease(clamp((t - (0.8 + 1.4 * i)) / 0.3, 0, 1));
      if (o > 0.02) out.glow += idleGlowDot(x, y, o, 2.6);
      out.fx += idleTag(x + 24, y + 4, String(i + 1), between(t, 1.0 + 1.4 * i, 2.1 + 1.4 * i, 0.15, 0.2));
    });
    const many = ease(clamp((t - 5.0) / 0.4, 0, 1));
    if (many > 0.02) MANY.forEach(([x, y], i) => { out.glow += idleGlowDot(x, y, many * (0.6 + 0.4 * Math.sin(t * 3 + i)), 1.6 + (i % 3) * 0.5); });
  }, { beats: [[0.85, () => idleSounds.twinkle(1)], [2.25, () => idleSounds.twinkle(2)], [3.65, () => idleSounds.twinkle(3)], [5.4, () => idleSay('Okay, too many.', 1500)]] });
}

/* =============================================================== night */

// A point in the rig where it is inside his turned body: for a hand to
// reach when he's lying down (spin turns the rig about his hip, bob
// drops it).
function idleUnspin(p, x, y) {
  const a = -(p.spin || 0) * RAD;
  const dx = x - 70;
  const dy = y - p.bob - 144;
  return [70 + dx * Math.cos(a) - dy * Math.sin(a), 144 + dx * Math.sin(a) + dy * Math.cos(a)];
}

// A constellation in the shape of </>, where he looks up at it: its stars
// and the strokes joining them.
const IDLE_CONSTELLATION = [[180, -300], [150, -266], [180, -232], [206, -228], [238, -306], [266, -300], [296, -266], [266, -232]];
const IDLE_STROKES = [[0, 1], [1, 2], [3, 4], [5, 6], [6, 7]];

// Where his finger is on the constellation, `u` 0..1 of the way along it,
// and the dotted line drawn so far.
function idleTrace(u) {
  const n = u * IDLE_STROKES.length;
  const i = Math.min(IDLE_STROKES.length - 1, Math.floor(n));
  const k = clamp(n - i, 0, 1);
  const [a, b] = IDLE_STROKES[i];
  const at = [mix(IDLE_CONSTELLATION[a][0], IDLE_CONSTELLATION[b][0], k), mix(IDLE_CONSTELLATION[a][1], IDLE_CONSTELLATION[b][1], k)];
  let d = '';
  IDLE_STROKES.forEach(([s, e], j) => {
    if (j > n) return;
    const kk = Math.min(1, n - j);
    d += `M${IDLE_CONSTELLATION[s][0]} ${IDLE_CONSTELLATION[s][1]}L${idleF(mix(IDLE_CONSTELLATION[s][0], IDLE_CONSTELLATION[e][0], kk))} ${idleF(mix(IDLE_CONSTELLATION[s][1], IDLE_CONSTELLATION[e][1], kk))}`;
  });
  return { at, d };
}

// Lying on his back, hands behind his head; he traces a constellation.
// As the settle at night, he stays, and traces it again now and then.
function idleStargazeAct(endless = false) {
  let said = false;
  let twinkled = 0;
  return idleAct('stargaze', endless ? undefined : 9.4, (t, p, out, act, base) => {
    const sitK = endless ? clickTrack([[0.2, 0], [1.0, 1]], t) : clickTrack([[0.2, 0], [1.0, 1], [8.6, 1], [9.3, 0]], t);
    const lieK = endless ? clickTrack([[1.0, 0], [1.9, 1]], t) : clickTrack([[1.0, 0], [1.9, 1], [7.7, 1], [8.6, 0]], t);
    const sit = floorSitPose(base, -6);
    const lying = clonePose(base);
    Object.assign(lying, { spin: -90, bob: 72, lean: 0 });
    Object.assign(lying.near, { thigh: -52, knee: 104, ankle: -30 });
    Object.assign(lying.far, { thigh: 12, knee: 4, ankle: -80 });
    const q = mixPose(idleSitBlend(base, sit, sitK), lying, lieK);
    const c = endless ? Math.max(0, t - 2.0) % 12 : t - 2.0;
    const point = lieK > 0.99 ? between(c, 1.0, 4.6, 0.4, 0.5) : 0;
    const u = clamp((c - 1.3) / 2.8, 0, 1);
    const trace = idleTrace(u);
    const [hx, hy] = idleUnspin(q, 52, 18);
    aimArm(q, 'far', hx, hy, lieK);
    aimArm(q, 'near', hx + 4, hy - 2, lieK * (1 - point));
    if (point > 0) aimArm(q, 'near', ...idleUnspin(q, ...trace.at), point);
    // The stars, and his line between them as he traces it.
    const shown = lieK * (endless ? 1 : between(t, 1.5, 9.0, 0.6, 0.6));
    if (shown > 0.02) {
      out.glow += IDLE_CONSTELLATION.map(([x, y]) => idleGlowDot(x, y, shown, 2.4)).join('');
      if (c > 1.3 && point > 0.05) out.glow += `<path class="idle-dots idle-dots--light" opacity="${point.toFixed(2)}" d="${trace.d}"/>`;
    }
    const traced = c > 1.3 ? Math.floor(u * IDLE_STROKES.length) : -1;
    if (point > 0.5 && traced > twinkled) {
      twinkled = traced;
      idleSounds.twinkle(1 + (traced % 3));
    }
    if (c < 1) twinkled = 0;
    if (!said && c > 4.3 && lieK > 0.99) {
      said = true;
      idleSay('That one&rsquo;s mine.', 1600);
    }
    return q;
  }, { pin: true, outTime: 0.9, beats: [[0.4, idleSounds.cloth], [1.2, idleSounds.cloth]] });
}

// A perch on screen ahead of him, for the head torch to find the bird
// asleep on.
function idleSleepingPerch() {
  const body = UNITS_TALL * view.unit;
  return birdPerches()
    .filter((perch) => onScreen(perch.x, 40) && (perch.x - state.x) * state.facing > 1.2 * body)
    .sort((a, b) => Math.abs(a.x - state.x) - Math.abs(b.x - state.x))[0] || null;
}

// The head torch: the camp swept, the bird woken, the moths.
function idleTorchAct() {
  const perch = idleSleepingPerch();
  return idleAct('torch', 7.4, (t, p, out) => {
    const tap = between(t, 0.3, 0.9, 0.15, 0.15) + between(t, 5.9, 6.5, 0.15, 0.15);
    idleReachBody(p, 'near', 96, 8, tap);
    const [eyeX, eyeY] = idleBody(p, 96, 16);
    let at = -18;
    if (perch) {
      const [bx, by] = idleWorldToRig(perch.x, perch.y + 5 * view.unit);
      at = deg(Math.atan2(by - eyeY, bx - eyeX));
    }
    const g = clickTrack([[0.9, 24], [1.9, 30], [2.7, -36], [3.3, at], [4.6, at], [5.2, 8]], t);
    p.lean += 0.22 * g;
    const swat = between(t, 5.0, 5.5, 0.1, 0.15);
    idleReachBody(p, 'far', 130 + 6 * Math.sin(t * 30), 30, swat);
    idleProp.torch?.setAttribute('opacity', t > 0.2 && t < 7.2 ? '1' : '0');
    if (t > 0.8 && t < 6.2) {
      const [ox, oy] = idleBody(p, 100, 14);
      const ray = (d, l) => `${idleF(ox + l * Math.cos((g + d) * RAD))} ${idleF(oy + l * Math.sin((g + d) * RAD))}`;
      out.glow += `<path class="idle-beam" d="M${idleF(ox)} ${idleF(oy)}L${ray(-11, 900)}L${ray(11, 900)}Z"/><path class="idle-beam" d="M${idleF(ox)} ${idleF(oy)}L${ray(-4, 900)}L${ray(4, 900)}Z"/>`;
    }
    if (perch) {
      const [bx, by] = idleWorldToRig(perch.x, perch.y);
      const awake = t > 3.3 && t < 4.4;
      out.fx += `<g class="idle-roosting" transform="translate(${idleF(bx)} ${idleF(by)}) scale(${idleFacing() * 1.6} 1.6)">`
        + '<path d="M-4.5 -4.2L-9.5 -6.8L-9 -3.4Z"/><ellipse cx="0" cy="-4.4" rx="5.4" ry="3.5"/><circle cx="4.2" cy="-8.4" r="2.7"/>'
        + `${awake ? '<circle class="idle-roosting__eye" cx="4.9" cy="-9" r="0.8"/>' : '<path class="idle-roosting__shut" d="M3.9 -8.9h2"/>'}</g>`;
      if (awake) out.fx += idleTag(bx, by - 30, '?', between(t, 3.4, 4.4, 0.1, 0.2));
    }
    if (t > 4.6 && t < 5.9) {
      const [hx, hy] = idleBody(p, 118, 16);
      for (let i = 0; i < 3; i += 1) out.glow += `<circle class="idle-spark" cx="${idleF(hx + 16 * i + 6 * Math.sin(t * 20 + i))}" cy="${idleF(hy + 10 * Math.sin(t * 17 + i * 2))}" r="2.2"/>`;
    }
  }, {
    beats: [
      [0.8, () => idleSound('torchClick', { vol: 0.24, vary: 0.03 }, () => sfx.tick(true))],
      [3.6, () => idleSay('Sorry.', 1100)],
      [6.2, () => idleSound('torchClick', { vol: 0.22, vary: 0.03 }, () => sfx.tick(true))],
    ],
  });
}

// A laptop opened at night: blinding, until dark mode.
function idleDarkModeAct() {
  let keyAt = 0;
  return idleAct('darkmode', 7.4, (t, p, out) => {
    const hold = between(t, 0.3, 6.9, 0.35, 0.35);
    const lid = clickTrack([[0.5, 0], [1.0, 1], [6.3, 1], [6.8, 0]], t);
    const glare = between(t, 1.0, 2.7, 0.08, 0.3);
    const shield = between(t, 1.05, 2.6, 0.1, 0.3);
    const type = between(t, 3.0, 6.1, 0.25, 0.25);
    idleReachBody(p, 'near', 108, 104, hold);
    const [hx, hy] = idleHandRig(p, 'near');
    idleReachRig(p, 'far', hx + 16, hy - 26, between(t, 0.45, 1.0, 0.15, 0.15));
    idleReachBody(p, 'far', 98, 22, shield);
    idleReachRig(p, 'far', hx + 8, hy - 8 - 3 * Math.max(0, Math.sin(t * 40)), type);
    p.lean += -12 * glare + 8 * type;
    placeLaptop(hold > 0.2 ? { at: 'hand', hand: handAt(p.lean, p.near.shoulder, p.near.elbow), lid, bump: 0, lap: null } : null, type > 0.5 ? clamp((t - 3) / 2.5, 0, 1) : 0);
    laptop.classList.toggle('is-glare', t < 2.7);
    laptop.classList.toggle('is-dark-mode', t >= 2.7);
    if (lid > 0.5) {
      const [sx, sy] = [hx + 14, hy - 20];
      if (glare > 0.02) out.glow += `<circle class="idle-glare" cx="${idleF(sx)}" cy="${idleF(sy)}" r="${idleF(60 + 40 * glare)}" opacity="${(0.8 * glare).toFixed(2)}"/>`;
      else if (t > 2.7) out.glow += `<circle class="idle-screen" cx="${idleF(sx - 8)}" cy="${idleF(sy - 10)}" r="42" opacity="${(0.6 * lid).toFixed(2)}"/>`;
    }
    idleFlash(0.22 * glare);
    const [tx, ty] = idleBody(p, 104, -6);
    out.fx += idleTag(tx, ty, 'dark mode', between(t, 2.6, 3.7, 0.1, 0.2));
    if (type > 0.5 && t > keyAt) {
      keyAt = t + 0.09 + Math.random() * 0.12;
      sfx.key?.();
    }
  }, {
    beats: [[0.6, () => sfx.lid(true)], [1.1, () => idleSounds.gasp(0.14)], [2.7, () => idleSounds.click()], [6.4, () => sfx.lid(false)]],
    end: () => {
      placeLaptop(null);
      laptop.classList.remove('is-glare', 'is-dark-mode');
    },
  });
}

// Half asleep on his feet when the phone goes: a page, which resolves
// itself.
function idlePageAct() {
  return idleAct('page', 7.2, (t, p, out) => {
    const droop = Math.max(between(t, -1, 1.4, 0.1, 0.1), between(t, 6.2, 9, 0.7, 0.1));
    const jolt = between(t, 1.4, 1.9, 0.05, 0.3);
    const phone = between(t, 2.0, 5.9, 0.3, 0.3);
    clickCrouch(p, 10, droop);
    p.lean += 14 * droop + 8 * phone;
    p.bob -= 12 * jolt;
    idleReachBody(p, 'near', 132, 80, jolt);
    idleReachBody(p, 'far', 18, 80, jolt);
    idleReachBody(p, 'near', 104, 90, phone);
    idlePhone(p, phone > 0.1);
    if (t > 2.3 && t < 3.9) idlePhoneShows('is-page');
    else idlePhoneShows('is-lit');
    const [px, py] = idleBody(p, 82, 142);
    out.fx += idleBuzz(px, py, between(t, 1.1, 1.8, 0.05, 0.1));
    if (phone > 0.1) {
      const [fx, fy] = idleBody(p, 86, 36);
      out.glow += `<circle class="idle-screen" cx="${idleF(fx)}" cy="${idleF(fy)}" r="30" opacity="${(0.5 * phone).toFixed(2)}"/>`;
    }
    const [tx, ty] = idleBody(p, 104, -8);
    out.fx += idleTag(tx, ty, 'PAGE: disk 91%', between(t, 2.3, 3.9, 0.15, 0.05)) + idleTag(tx, ty, 'resolved', between(t, 3.9, 5.0, 0.05, 0.2));
  }, {
    beats: [
      [0.1, () => canSpeak() && speak('<span>zzz&hellip;</span>')],
      [1.2, () => {
        hushSpeech();
        idleSounds.vibrate();
      }],
      [1.45, () => idleSounds.gasp()],
      [3.9, () => idleSound('buildPass', { vol: 0.14, rate: 0.9, vary: 0 }, () => sfx.chime())],
      [4.3, () => idleSay('Resolved itself. Great.', 1700)],
      [6.5, () => canSpeak() && speak('<span>zzz&hellip;</span>')],
    ],
    end: () => {
      if (introSpeechCopy?.textContent?.startsWith('zzz')) hushSpeech();
    },
  });
}

// Nodding off standing up, and jerking awake.
function idleNodOffAct() {
  const home = state.facing;
  return idleAct('nodoff', 6.6, (t, p) => {
    const nod = clickTrack([[0.3, 0], [2.9, 1], [3.02, 0.05], [3.3, 0]], t);
    const flare = between(t, 3.0, 3.6, 0.04, 0.3);
    const alert = between(t, 3.6, 6.4, 0.3, 0.4);
    clickCrouch(p, 16, nod);
    p.lean += 24 * nod - 4 * alert + 1.5 * nod * Math.sin(t * 2.2);
    idleReachBody(p, 'near', 140, 60, flare);
    idleReachBody(p, 'far', 8, 60, flare);
    idleReachBody(p, 'near', 90, 138, alert);
    idleReachBody(p, 'far', 86, 140, alert);
    ambient.face = t > 4.0 && t < 4.6 ? -home : 0;
  }, {
    beats: [
      [0.9, () => canSpeak() && speak('<span>zzz&hellip;</span>')],
      [3.0, () => {
        hushSpeech();
        idleSounds.gasp();
      }],
      [4.9, () => idleSay('I&rsquo;m up.', 1300)],
    ],
    end: () => {
      if (introSpeechCopy?.textContent?.startsWith('zzz')) hushSpeech();
    },
  });
}

// Shushing the crickets; they stop, then one starts up again.
function idleCricketsAct() {
  const home = state.facing;
  const GRASS = [-170, -70, 180, 300];
  return idleAct('crickets', 7.2, (t, p, out) => {
    ambient.face = t > 0.4 && t < 1.0 ? -home : 0;
    const shh = between(t, 1.4, 3.3, 0.25, 0.3);
    const pleased = between(t, 3.4, 5.2, 0.3, 0.2);
    const slump = between(t, 5.5, 7.0, 0.15, 0.4);
    idleReachBody(p, 'near', 98, 46, shh);
    idleReachBody(p, 'near', 90, 138, pleased);
    idleReachBody(p, 'far', 86, 140, pleased);
    p.lean += 12 * shh + 9 * slump;
    chorus.hush = t < 2.2 ? 1 : t < 5.4 ? 0 : 0.3 + 0.7 * clamp((t - 6) / 1.2, 0, 1);
    if (shh > 0.5) {
      const [hx, hy] = idleHandRig(p, 'near');
      out.fx += `<path class="idle-line" d="M${idleF(hx)} ${idleF(hy)}v-9"/>`;
    }
    GRASS.forEach((x, i) => {
      const on = (t < 2.3 || (i === 1 && t > 5.35 && t < 5.9)) && Math.sin(t * 9 + i * 2.3) > 0.1;
      if (on) out.fx += `<path class="idle-chirp" d="M${x + 6} 226q4 6 0 12M${x + 12} 222q6 10 0 20M${x - 6} 226q-4 6 0 12M${x - 12} 222q-6 10 0 20"/>`;
    });
  }, {
    beats: [
      [1.6, () => {
        idleSound('shush', { vol: 0.26, vary: 0.03 }, () => sfx.hiss({ type: 'highpass', freq: 2500, vol: 0.12, dur: 0.8, attack: 0.1 }));
        idleSay('Shh.', 1100);
      }],
      [5.4, () => cricketChirp(4400, 0.05)],
      [5.9, () => idleSay('Fine.', 1100)],
    ],
    end: () => { chorus.hush = 1; },
  });
}

// A ghost story at the fire, torch under his chin, until the fire pops.
function idleGhostAct() {
  const face = Math.sign(idleFireX() - state.x) || 1;
  return idleAct('ghost', 7.8, (t, p, out) => {
    ambient.face = face;
    const torch = between(t, 0.4, 4.6, 0.3, 0.1);
    const wiggle = between(t, 0.8, 4.4, 0.3, 0.3);
    const jump = between(t, 4.6, 5.0, 0.05, 0.35);
    const laugh = between(t, 5.1, 6.9, 0.2, 0.3);
    clickCrouch(p, 5 * Math.abs(Math.sin(t * 16)), laugh);
    p.bob -= 18 * jump;
    idleReachBody(p, 'near', 96, 72, torch);
    idleReachBody(p, 'far', 126 + 4 * Math.sin(t * 9), 70 + 4 * Math.cos(t * 7), wiggle);
    idleReachBody(p, 'near', 112, -10, jump);
    idleReachBody(p, 'far', 48, -6, jump);
    idleReachBody(p, 'near', 94, 98, laugh);
    p.lean += 8 * torch - 10 * jump;
    idlePhone(p, torch > 0.1, 180);
    idlePhoneShows('is-lit');
    if (torch > 0.05) {
      const [hx, hy] = idleHandRig(p, 'near');
      const [cx, cy] = idleBody(p, 80, 30);
      out.glow += `<path class="idle-beam" opacity="${torch.toFixed(2)}" d="M${idleF(hx)} ${idleF(hy - 6)}L${idleF(cx - 30)} ${idleF(cy - 10)}L${idleF(cx + 30)} ${idleF(cy - 20)}Z"/>`
        + `<circle class="idle-screen idle-screen--warm" cx="${idleF(cx + 6)}" cy="${idleF(cy)}" r="28" opacity="${(0.7 * torch).toFixed(2)}"/>`;
    }
  }, {
    beats: [
      [0.5, () => idleSound('torchClick', { vol: 0.2, vary: 0.03 }, () => sfx.tick(true))],
      [0.9, () => idleSay('And the server&hellip;', 1600)],
      [2.7, () => idleSay('was never seen again.', 1700)],
      [4.6, () => {
        clickEmbers(8);
        clickFlash(document.querySelector('.campfire'), 'is-stoked', 700);
        idleSound('firePop', { vol: 0.34, vary: 0.05 }, () => sfx.tap(2.4));
        idleSounds.gasp();
      }],
      [5.3, () => idleSay('Got myself.', 1500)],
    ],
  });
}

// A howl at the moon, and one back from far off.
function idleHowlAct() {
  const moon = idleMoonSpot();
  const face = moon ? Math.sign(moon.worldX - state.x) || 1 : 1;
  return idleAct('howl', 7.4, (t, p, out) => {
    const up = between(t, 0.4, 3.4, 0.35, 0.3);
    const cup = between(t, 1.1, 3.2, 0.2, 0.25);
    const freeze = between(t, 4.2, 6.8, 0.12, 0.4);
    ambient.face = t < 4.5 ? face : t < 6.3 ? -face : 0;
    p.lean -= 12 * up + 4 * freeze;
    idleReachBody(p, 'near', 98, 44, cup);
    idleReachBody(p, 'far', 96, 50, cup);
    idleReachBody(p, 'near', 106, 88, freeze);
    idleReachBody(p, 'far', 102, 92, freeze);
    const o = between(t, 4.0, 5.3, 0.3, 0.5);
    if (o > 0.02) {
      const [ax, ay] = idleWorldToRig(state.x - face * 0.46 * sceneWidth, 150 * view.unit);
      out.fx += `<g opacity="${(0.55 * o).toFixed(2)}" transform="translate(${idleF(ax)} ${idleF(ay)}) scale(${idleFacing()} 1)"><text class="idle-far-text" text-anchor="middle">awoo</text></g>`;
    }
  }, {
    beats: [
      [1.3, () => {
        idleSound('howlHuman', { vol: 0.26, vary: 0.02 }, () => {
          if (!sfx.sample?.('wolfHowl', { vol: 0.2, rate: 1.25, vary: 0 })) sfx.tone(320, { to: 480, vol: 0.05, dur: 1.2, attack: 0.2 });
        });
        idleSay('Awooo!', 1600);
      }],
      [4.0, () => idleSound('wolfHowl', { vol: 0.12, pan: -face * 0.7, vary: 0 }, () => sfx.tone(420, { to: 600, vol: 0.02, dur: 1.4, attack: 0.3 }))],
      [4.6, () => idleSounds.gasp(0.12)],
    ],
  });
}

// Sleepwalking: arms out, a few shuffling steps, and back to where he was.
function idleSleepwalkAct() {
  const x0 = state.x;
  const dir = state.facing;
  const far = 130; // units
  let lastStep = 0;
  return idleAct('sleepwalk', 9.2, (t, p) => {
    const outK = clickTrack([[0.9, 0], [4.0, 1]], t);
    const backK = clickTrack([[4.5, 0], [7.8, 1]], t);
    const k = t < 4.3 ? outK : 1 - backK;
    state.x = state.target = x0 + dir * far * view.unit * k;
    ambient.face = t >= 4.25 && t < 7.95 ? -dir : dir;
    const moving = between(t, 0.9, 4.0, 0.2, 0.2) + between(t, 4.5, 7.8, 0.2, 0.2);
    const walked = (t < 4.3 ? outK : 1 + backK) * far;
    const gait = pose(GAITS.walk, (walked / GAITS.walk.travel) * 100 * 1.4);
    for (const side of ['near', 'far']) {
      blendSide(p[side], { thigh: 0.55 * gait[side].thigh, knee: 0.55 * gait[side].knee, ankle: 0.55 * gait[side].ankle }, moving);
    }
    p.bob += 0.5 * gait.bob * moving;
    const arms = between(t, 0.4, 8.2, 0.4, 0.4);
    p.lean = mix(p.lean, 0, arms);
    idleReachBody(p, 'near', 140, 76, arms);
    idleReachBody(p, 'far', 138, 80, arms);
    const step = Math.floor(walked / 34);
    if (moving > 0.5 && step !== lastStep) {
      lastStep = step;
      sfx.step?.();
    }
  }, {
    beats: [
      [0.6, () => canSpeak() && speak('<span>zzz&hellip;</span>')],
      [8.3, () => {
        hushSpeech();
        idleSay('Hm?', 1000);
      }],
    ],
    end: () => {
      state.target = state.x;
      if (introSpeechCopy?.textContent?.startsWith('zzz')) hushSpeech();
    },
  });
}

// His palm lined up under the moon, one eye shut; a try at tossing it.
function idlePalmAct() {
  const moon = idleMoonSpot();
  const face = moon ? Math.sign(moon.worldX - state.x) || 1 : 1;
  return idleAct('palm', 7.2, (t, p, out) => {
    ambient.face = face;
    const m = idleMoonSpot();
    const [mx, my] = m ? idleScreenToRig(m.x, m.y) : [260, -320];
    const raise = between(t, 1.2, 5.0, 0.45, 0.3);
    const weigh = between(t, 3.0, 4.2, 0.2, 0.2);
    const toss = between(t, 4.9, 5.4, 0.08, 0.3);
    const stare = between(t, 5.5, 6.9, 0.2, 0.3);
    idleReachRig(p, 'near', mx, my + 30 - 8 * weigh * Math.sin((t - 3) * 9), raise);
    idleReachBody(p, 'near', 132, -34, toss);
    idleReachBody(p, 'near', 108, 84, stare);
    p.lean += -6 * raise + 10 * stare;
    if (raise > 0.5) {
      const [hx, hy] = idleHandRig(p, 'near');
      const [ex, ey] = idleBody(p, 92, 24);
      const o = clamp((raise - 0.5) * 2, 0, 1);
      out.fx += `<path class="idle-line idle-line--thin" d="M${idleF(hx - 5)} ${idleF(hy - 1)}l12 -2"/>`;
      out.glow += `<path class="idle-dots idle-dots--light" opacity="${(0.6 * o).toFixed(2)}" d="M${idleF(ex)} ${idleF(ey)}L${idleF(mx)} ${idleF(my + 14)}"/>`
        + idleGlowDot(hx + 1, hy - 10, o, 5.5);
    }
  }, { beats: [[4.95, () => idleSounds.swish(0.12)], [5.8, () => idleSay('Worth a try.', 1400)]] });
}

/* ------------------------------------------------------ choosing them */

// Each act: its part of the day, the hours of the sky's clock it suits
// (a range can run past midnight), how likely it is against the others,
// whether it's once a visit or once a day, and whatever else it needs.
const IDLE_ACTS = {
  // dawn
  salute: { part: 'dawn', hours: [5.5, 7.6], weight: 2, make: idleSaluteAct },
  coffee: { part: 'dawn', hours: [5.5, 8], weight: 3, once: 'visit', can: () => !runStats.coffee, make: idleCoffeeAct },
  warmhands: { part: 'dawn', hours: [5, 7], weight: 2, make: idleWarmHandsAct },
  sunrise: { part: 'dawn', hours: [5.3, 7.4], weight: 3, can: () => !!idleSunSpot(), make: idleSunriseAct },
  chorus: { part: 'dawn', hours: [5.3, 8], weight: 3, can: idleBirdSeen, make: idleChorusAct },
  wind: { part: 'dawn', hours: [6, 8], weight: 2, can: () => wind.left <= 0 && wind.next > 6, make: idleWindAct },
  teeth: { part: 'dawn', hours: [6, 8], weight: 2, once: 'visit', make: idleTeethAct },
  boots: { part: 'dawn', hours: [5.5, 7.6], weight: 2, make: idleBootsAct },
  mist: { part: 'dawn', hours: [5, 7.2], weight: 3, can: () => (skyClock.look?.mist ?? 0) > 0.4, make: idleMistAct },
  jumps: { part: 'dawn', hours: [6.4, 8], weight: 2, make: idleJumpsAct },
  // day
  duck: { part: 'day', hours: [9, 17], weight: 1, make: idleDuckAct },
  prototype: { part: 'day', hours: [9, 17], weight: 2, make: idlePrototypeAct },
  frame: { part: 'day', hours: [9, 17], weight: 2, make: idleFrameAct },
  lunch: { part: 'day', hours: [12, 14], weight: 4, once: 'day', can: () => bird.mode !== 'roosting' && !bird.woken, make: idleLunchAct },
  build: { part: 'day', hours: [9, 17], weight: 2, make: idleBuildAct },
  mute: { part: 'day', hours: [9, 11], weight: 3, can: () => new Date().getDay() % 6 !== 0, make: idleMuteAct },
  screenbreak: { part: 'day', hours: [8, 17], weight: 4, can: () => performance.now() - idleState.breakAt > 20 * 60e3, make: idleScreenBreakAct },
  plane: { part: 'day', hours: [9, 17], weight: 2, can: () => wind.left <= 0, make: idlePlaneAct },
  kite: {
    part: 'day',
    hours: [9, 17],
    gust: true, // started by a gust (idleGustAct); forced, it brings its own
    make: () => {
      world.style.setProperty('--gust-dir', state.facing);
      world.classList.add('is-gusting');
      blowLeaves(state.facing);
      return idleKiteAct(state.facing);
    },
  },
  standup: { part: 'day', hours: [9.25, 10], weight: 5, once: 'day', can: () => new Date().getDay() % 6 !== 0, make: idleStandupAct },
  // dusk
  clockoff: { part: 'dusk', hours: [17, 18.2], weight: 4, once: 'day', make: idleClockOffAct },
  photo: { part: 'dusk', hours: [18.4, 20.3], weight: 3, can: () => !!idleSunSpot(), make: idlePhotoAct },
  conduct: { part: 'dusk', hours: [17, 20.8], weight: 5, can: () => idleLampsToSnap().length > 0, make: idleConductAct },
  firefly: { part: 'dusk', hours: [19.3, 21.5], weight: 3, camp: true, can: () => idleAtCamp(), make: idleFireflyAct },
  marshmallow: { part: 'dusk', hours: [18, 21], weight: 4, camp: true, can: () => idleNearFire(), make: idleMarshmallowAct },
  sunset: { part: 'dusk', hours: [18.4, 20.4], weight: 2, can: () => !!idleSunSpot(), make: () => idleSunsetAct() },
  harmonica: { part: 'dusk', hours: [19, 21.3], weight: 2, make: idleHarmonicaAct },
  puppets: { part: 'dusk', hours: [19, 21.5], weight: 3, camp: true, can: idleByTent, make: idlePuppetsAct },
  goodnight: { part: 'dusk', hours: [20, 21.2], weight: 5, can: idleBirdSeen, make: idleGoodnightAct },
  firststars: { part: 'dusk', hours: [19, 20.6], weight: 3, make: idleFirstStarsAct },
  // night
  stargaze: { part: 'night', hours: [22, 4], weight: 2, make: () => idleStargazeAct() },
  torch: { part: 'night', hours: [21, 5], weight: 3, make: idleTorchAct },
  darkmode: { part: 'night', hours: [21, 3], weight: 2, make: idleDarkModeAct },
  page: { part: 'night', hours: [2, 4.6], weight: 2, can: () => incident.phase === 'none', make: idlePageAct },
  nodoff: { part: 'night', hours: [0, 5], weight: 3, make: idleNodOffAct },
  crickets: { part: 'night', hours: [21, 4.5], weight: 2, make: idleCricketsAct },
  ghost: { part: 'night', hours: [21, 1], weight: 4, camp: true, can: () => idleNearFire(), make: idleGhostAct },
  howl: { part: 'night', hours: [22, 4], weight: 3, can: () => !!idleMoonSpot(), make: idleHowlAct },
  sleepwalk: { part: 'night', hours: [1, 4], weight: 1, can: () => memory.data.lateNightOn === new Date().toDateString(), make: idleSleepwalkAct },
  palm: { part: 'night', hours: [22, 4], weight: 2, can: () => !!idleMoonSpot(), make: idlePalmAct },
};

const idleState = { done: new Set(), recent: [], breakAt: 0 };

const idleInHours = (h, [from, to]) => (from <= to ? h >= from && h < to : h >= from || h < to);

// Whether `kind` has had its turn, once a visit or once a day.
function idleSpent(kind, once) {
  if (once === 'visit') return idleState.done.has(kind);
  if (once === 'day') return memory.data.idleDays?.[kind] === new Date().toDateString();
  return false;
}

// Keeps track of what he's done: for the once-only acts, the screen
// break's twenty minutes, and so as not to do the same few over and over.
function idleDid(kind) {
  idleState.done.add(kind);
  idleState.recent = [...idleState.recent.filter((k) => k !== kind), kind].slice(-3);
  if (IDLE_ACTS[kind]?.once === 'day') {
    memory.data.idleDays = { ...(memory.data.idleDays || {}), [kind]: new Date().toDateString() };
    memory.save();
  }
  if (kind === 'screenbreak') idleState.breakAt = performance.now();
}
const idleRecently = (kind) => idleState.recent.includes(kind);

// The part of the day's own acts that suit now, as pickIdle (living.js)
// takes them: [kind, weight, make].
function idleDaypartOptions() {
  if (livingReduced.matches) return [];
  const h = idleHour();
  return Object.entries(IDLE_ACTS)
    .filter(([kind, a]) => !a.gust && idleInHours(h, a.hours) && !idleSpent(kind, a.once) && (!a.can || a.can()))
    .map(([kind, a]) => [kind, a.weight ?? 2, a.make]);
}

// At the camp's stop, now and then one of the camp's acts instead of the
// field journal's (updateIdle, living.js).
function idleStationPick(station) {
  if (station !== 'about' || livingReduced.matches || Math.random() > 0.45) return null;
  const h = idleHour();
  const options = Object.entries(IDLE_ACTS)
    .filter(([kind, a]) => a.camp && kind !== idle.last && !idleRecently(kind) && idleInHours(h, a.hours) && (!a.can || a.can()));
  if (!options.length) return null;
  const [kind, a] = options[Math.floor(Math.random() * options.length)];
  idleDid(kind);
  return [kind, 1, a.make];
}

// Left long enough at dusk, the sunset instead of his laptop; at night,
// the stars now and then (updateIdle, living.js).
function idleSettleAct() {
  if (livingReduced.matches) return null;
  const h = idleHour();
  if (h >= 18.4 && h < 20.4 && idleSunSpot() && Math.random() < 0.7) return idleSunsetAct(true);
  if ((h >= 21.5 || h < 4.5) && Math.random() < 0.5) return idleStargazeAct(true);
  return null;
}

// A gust by day: now and then, a kite on it instead of bracing against it
// (startGust, living.js).
function idleGustAct(dir) {
  const h = idleHour();
  if (livingReduced.matches || h < 9 || h >= 17 || poiArtifactStation() || idleRecently('kite') || Math.random() > 0.3) return null;
  idleDid('kite');
  return idleKiteAct(dir);
}

// Their names, by part of the day (alive.idles).
function idleCatalogue() {
  const out = { dawn: [], day: [], dusk: [], night: [] };
  for (const [kind, a] of Object.entries(IDLE_ACTS)) out[a.part].push(kind);
  return out;
}
