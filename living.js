/* ======================================================================
   The living world: what makes the scene go on without you, and remember
   you. HANDOFF-living-world.md is the plan and says what is built.

   This file loads before script.js, so what script.js needs as it loads
   (memory, whether this is a return visit) is ready for it. The two share
   one global scope, so nothing at this file's top level may use a name from
   script.js: it does not exist yet. Everything that needs the world waits
   for startLiving(), which script.js calls last, or runs inside functions
   script.js calls each frame:

     livingPose(final, dt, now, unit)  his pose with what he is up to over it
     livingView(view)                  after the camera moves, each frame

   Every place script.js calls in here is marked with a `living:` comment.
   Top-level names here must not clash with script.js's; run
   `node scratch/living/check_globals.js` after editing.
   ====================================================================== */

const livingParams = new URLSearchParams(location.search);
const livingReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------------------------------------------------------------- memory */

// What we remember about this visitor between visits, kept in their own
// browser and nowhere else. `forget` wipes it; writes are batched.
const MEMORY_KEY = 'cv_memory_v1';
const memory = (() => {
  const blank = () => ({
    visits: 0, // including this one
    firstAt: 0,
    lastAt: 0, // when this visit began
    smores: 0, // s'mores he has thrown down by the fire
    visited: {}, // which stops they have opened, by id
    toured: false, // whether he has thanked them for seeing every stop
    incidents: [], // what he has fixed: { id, at, secs }, the latest last
    fixed: 0, // how many things he has fixed, ever
    lateNightOn: '', // the date he last remarked on the hour
    teleports: 0, // times he has teleported for them, ever
    teleportTips: 0, // visits he has told them they can
    teleportRound: [], // the teleports still to come this round, in order (teleports.js)
    teleportLast: '', // the last one he did
    teleportsSeen: {}, // which they've seen, by id
    found: {}, // the things that answer a click they've found, by id (clickables.js)
    woodpile: 0, // logs he has split for them, stacked on the pile
    wishes: 0, // wishes made on shooting stars
    namePlayed: 0, // times they've played his name on the statue's letters
    clickNudges: 0, // visits he has told them things answer a click
    clickGuideSeen: false, // whether the small discoveries explanation was dismissed
    finaleSeen: false, // whether the completed-journey contact card was shown
  });
  let data = blank();
  try {
    const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) || 'null');
    if (saved && typeof saved === 'object') data = { ...data, ...saved };
  } catch { /* storage blocked or unreadable: start afresh */ }
  let timer = 0;
  const write = () => {
    window.clearTimeout(timer);
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(data)); } catch { /* blocked */ }
  };
  return {
    get data() { return data; },
    save() {
      window.clearTimeout(timer);
      timer = window.setTimeout(write, 250);
    },
    flush: write,
    forget() {
      window.clearTimeout(timer);
      data = blank();
      try { localStorage.removeItem(MEMORY_KEY); } catch { /* blocked */ }
    },
  };
})();
window.addEventListener('pagehide', () => memory.flush());

/* -------------------------------------------------------- journey finale */

const livingFinale = document.querySelector('.journey-finale');
const livingFinaleTitle = livingFinale?.querySelector('#journey-finale-title');
let livingFinaleReturnFocus = null;
let livingFinaleHideTimer = 0;

function livingFinaleFocusable() {
  if (!livingFinale) return [];
  return [...livingFinale.querySelectorAll('a[href], button:not([disabled])')]
    .filter((el) => el.tabIndex >= 0 && !el.hidden && el.getClientRects().length);
}

function livingFinaleOpen() {
  if (!livingFinale || !livingFinale.hidden) return false;
  window.clearTimeout(livingFinaleHideTimer);
  // The finale is the message now; do not leave an older speech bubble
  // competing with it above the world.
  if (typeof hushSpeech === 'function') hushSpeech();
  livingFinaleReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  livingFinale.hidden = false;
  requestAnimationFrame(() => {
    livingFinale.classList.add('is-open');
    livingFinaleTitle?.focus({ preventScroll: true });
  });
  document.getElementById('travel-status').textContent = 'Journey complete. Contact options are open.';
  return true;
}

function livingFinaleClose() {
  if (!livingFinale || livingFinale.hidden) return;
  livingFinale.classList.remove('is-open');
  const finish = () => {
    livingFinale.hidden = true;
    livingFinaleReturnFocus?.focus?.({ preventScroll: true });
    livingFinaleReturnFocus = null;
  };
  if (livingReduced.matches) finish();
  else livingFinaleHideTimer = window.setTimeout(finish, 220);
}

livingFinale?.addEventListener('click', (event) => {
  if (event.target.closest('[data-finale-close]')) livingFinaleClose();
});

window.addEventListener('keydown', (event) => {
  if (!livingFinale || livingFinale.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    livingFinaleClose();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = livingFinaleFocusable();
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === livingFinaleTitle)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}, true);

// Whether they have been before, and when they were last here; then this
// visit is counted. ?visit=first or ?visit=return pretends either way, and
// ?intro=1 plays the opening regardless.
const returning = livingParams.get('visit') === 'return'
  || (livingParams.get('visit') !== 'first' && livingParams.get('intro') !== '1' && memory.data.visits > 0);
const lastVisitAt = memory.data.lastAt;
memory.data.visits += 1;
memory.data.firstAt ||= Date.now();
memory.data.lastAt = Date.now();
memory.save();

/* ------------------------------------------------------ whether he is free */

// When the visitor last pressed, clicked or touched anything. Moving the
// mouse does not count: that is not steering him. Anything they do stops
// what he was doing by himself.
let livingInputAt = 0;
['keydown', 'pointerdown', 'touchstart'].forEach((type) => {
  window.addEventListener(type, (event) => {
    if (event.isTrusted === false) return;
    livingInputAt = performance.now();
    cancelAmbient();
    idle.quiet = 0;
    idle.last = null;
  }, { capture: true, passive: true });
});

// Whether he is his own man: nobody steering him, not at a stop's scene,
// not in the opening, not on the line.
function isFree() {
  return !intro.active && !intro.release && !openPanelId &&
    !state.wantSeat && !state.wantBench && !state.wantForge && !state.experienceActive &&
    state.speed === 0 && !state.hop && !state.jump &&
    state.seat === 0 && state.inspect === 0 && state.typeIn === 0 &&
    state.projectView === 0 && state.termView === 0 && state.compose === 0 &&
    handcar.stage === 'off' && state.courseTime === 0 && !chalkBusy() &&
    !inputKeys.left && !inputKeys.right && !inputKeys.sprint && !teleport.phase &&
    (state.destinationId === null || state.announced);
}

// Whether a line of his own would get in the way of anything.
const canSpeak = () => !intro.active && !openPanelId && !speechUp();

// Says `html`, then puts the bubble away after `ms` if nothing else has been
// said since. (hushSpeech straight after speak would cancel the new bubble
// when one is already up: speak waits 200 ms for the old one to go, on the
// same timer hushSpeech clears.)
let remarkTimer = 0;
function remark(html, ms = 2200) {
  speak(html);
  // As the bubble will hold it, entities and all resolved.
  const said = document.createElement('template');
  said.innerHTML = html;
  window.clearTimeout(remarkTimer);
  remarkTimer = window.setTimeout(() => {
    if (introSpeechCopy.innerHTML === said.innerHTML) hushSpeech();
  }, ms + 250);
}

// An hour standing for each part of the day, for when one is picked rather
// than read off the clock; `late` is 1 am, for the late-night line.
const PART_HOURS = { dawn: 6, day: 12, dusk: 19, night: 23, late: 1 };

// The hour (0-24) the visitor has picked to see the world at - with the
// navbar's time picker or its slider, T, the terminal's `time`, or ?time=
// at load - or null to go by their clock.
let pickedHour = Object.hasOwn(PART_HOURS, livingParams.get('time')) ? PART_HOURS[livingParams.get('time')] : null;

// The visitor's hour, or the one they picked, so everything that goes by
// the clock follows the picker too.
function livingHour() {
  return pickedHour ?? new Date().getHours();
}

// The part of the day it is for them: dawn 5-8, day 8-17, dusk 17-21, and
// night from 21 till 5.
function livingDaypartName(hour = livingHour()) {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

// Something he fixed (`secs` it took) or something reported (`secs` null),
// kept for the terminal's `incidents`; `by` 'you' if the visitor broke it
// (clickables.js).
function logIncident(id, secs, by = null) {
  memory.data.incidents = [...memory.data.incidents, { id, at: Date.now(), secs, ...(by ? { by } : {}) }].slice(-20);
  if (secs !== null) memory.data.fixed += 1;
  memory.save();
}

/* -------------------------------------------------------------- acting
   What he does by himself - waving, stretching, fixing a lamp - is an act:
   a pose laid over the one the gait and the stops give him. One act runs
   at a time. Cut short, it eases back out over `outTime`; one that `pin`s
   him (sitting down) holds him where he is until he is back up. An act:
     { kind, duration (or none, to run until cut short), pose(base, act, dt,
       now, unit), end(cancelled), pin, outTime, hands }
   and `ambient.face` turns him while it runs. */

const ambient = {
  act: null,
  out: null, // easing out of an act cut short: { pose, t, time, pin }
  last: null, // his pose from the act, last frame
  pinned: 0, // 1 while an act holds him where he is
  face: 0, // which way an act wants him turned, or 0
};

function startAct(act) {
  if (ambient.act) endAct(true);
  ambient.act = { t: 0, outTime: 0.3, ...act };
  ambient.out = null;
}

function endAct(cancelled) {
  const act = ambient.act;
  if (!act) return;
  ambient.act = null;
  ambient.face = 0;
  act.end?.(cancelled);
  if (cancelled && ambient.last) ambient.out = { pose: ambient.last, t: 0, time: act.outTime, pin: act.pin };
}

function cancelAmbient() {
  if (ambient.act) endAct(true);
}

// His pose with the act over `base`, or easing out of one.
function ambientPose(base, dt, now, unit) {
  let p = base;
  const act = ambient.act;
  if (act) {
    act.t += dt;
    p = act.pose(base, act, dt, now, unit);
    ambient.last = p;
    if (act.duration && act.t >= act.duration) endAct(false);
  }
  if (!ambient.act && ambient.out) {
    const out = ambient.out;
    out.t += dt;
    const w = ease(clamp(out.t / out.time, 0, 1));
    p = mixPose(out.pose, base, w);
    if (w >= 1) ambient.out = null;
  }
  ambient.pinned = ambient.act?.pin || ambient.out?.pin ? 1 : 0;
  return p;
}

// An act that plays `keyframes` (as postureAt takes them) over `duration`
// seconds, calling `beats[at]` once as it passes each.
function keyframeAct(kind, duration, keyframes, { beats = {}, ...rest } = {}) {
  const pending = Object.keys(beats).map(Number).sort((a, b) => a - b);
  return {
    kind,
    duration,
    ...rest,
    pose(base, act) {
      const progress = clamp(act.t / duration, 0, 1);
      while (pending.length && progress >= pending[0]) beats[pending.shift()]();
      return postureAt(keyframes, progress, base);
    },
  };
}

/* ------------------------------------------------------------ welcome back
   Someone back again skips the opening (script.js sets the start as it
   does with motion reduced): he waves from beside his name, says hello,
   and sets off for the fire as he does at the end of the opening. */

function greetingLine() {
  const gap = lastVisitAt ? Date.now() - lastVisitAt : Infinity;
  const hour = livingHour();
  if (gap < 10 * 60e3) return '<span>Back already?</span>';
  if (gap < 12 * 3600e3) return '<span>Twice in one day?</span><span>Welcome back!</span>';
  if (gap !== Infinity && gap > 30 * 86400e3) return '<span>Oh hey, it&rsquo;s been a while!</span><span>Welcome back.</span>';
  if (hour >= 5 && hour < 11) return '<span>Morning!</span><span>Welcome back.</span>';
  if (hour >= 21 || hour < 5) return '<span>Evening!</span><span>Welcome back.</span>';
  return '<span>Welcome back!</span>';
}

// A hand up and waving, as he waves walking on in the opening.
function waveAct(duration = 2.4) {
  return {
    kind: 'wave',
    duration,
    pose(base, act) {
      const k = ease(clamp(act.t / 0.3, 0, 1)) * ease(clamp((duration - act.t) / 0.35, 0, 1));
      const w = Math.sin(act.t * 2.6 * 2 * Math.PI);
      const p = clonePose(base);
      p.near.shoulder = mix(base.near.shoulder, -138 + 6 * w, k);
      p.near.elbow = mix(base.near.elbow, -22 + 34 * w, k);
      return p;
    },
  };
}

const greeting = { active: returning, t: 0, spoke: false };
function updateGreeting(dt) {
  if (!greeting.active) return;
  // They have taken over: leave them to it.
  if (livingInputAt > 0 || state.destinationId !== 'start') {
    greeting.active = false;
    return;
  }
  greeting.t += dt;
  if (!greeting.spoke && greeting.t >= 0.5) {
    greeting.spoke = true;
    speak(greetingLine());
    if (!livingReduced.matches) startAct(waveAct());
  }
  if (greeting.t >= 3) {
    greeting.active = false;
    if (livingReduced.matches) return; // with motion reduced he stays put, as he always has
    soon(() => { // as leaveStart does at the end of the opening
      goTo(buttons[0], { keepSpeech: true });
      state.strollUntil = nameEnd;
      hushSpeech(1700);
    });
  }
}

/* ------------------------------------------------- s'mores and the log
   The s'mores he throws down stay by the fire from one visit to the next,
   and he scratches a tally of them into the log he sits on. */

// Counts one he has just thrown (script.js, launchFlyingSmore).
function livingSmoreThrown() {
  memory.data.smores += 1;
  memory.save();
  carveTallies();
}

// Lays down the last dozen from before, where they landed.
function restoreSmores(unit) {
  const n = memory.data.smores;
  smoreCount = n; // so new ones carry on the pattern where these left off
  for (let i = Math.max(0, n - 12); i < n; i += 1) {
    const el = makeSmore();
    world.append(el);
    el.style.left = `${smoreLanding(i, unit).toFixed(1)}px`;
    el.style.transform = `translate(-50%, -100%) rotate(${(12 + 16 * wobble(i * 3.1)).toFixed(1)}deg)`;
  }
  carveTallies();
}

// Tally marks in the log's bark, in fives, up to twenty.
function carveTallies() {
  const path = document.querySelector('.camp-seat__tally');
  if (!path) return;
  const n = Math.min(memory.data.smores, 20);
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const x = 24 + Math.floor(i / 5) * 13;
    const j = i % 5;
    d += j < 4 ? `M${(x + j * 2.6).toFixed(1)} 16V26` : `M${x - 1.6} 24.5L${x + 9.4} 17.5`;
  }
  path.setAttribute('d', d);
}

/* ---------------------------------------------------------- where they've been
   Each stop they open is remembered and its dot on the route filled in;
   the first time they have seen all four, he thanks them for the tour once
   they are back out in the world. */

const TOUR = ['about', 'projects', 'experience', 'skills'];
const tour = { pending: false };

// A stop's scene has opened (script.js, openPanel).
function livingVisited(id) {
  if (!TOUR.includes(id)) return;
  memory.data.visited[id] = true;
  memory.save();
  markVisited();
  if (TOUR.every((stop) => memory.data.visited[stop])) {
    memory.data.toured = true;
    if (!memory.data.finaleSeen) tour.pending = true;
    memory.save();
  }
}

function markVisited() {
  document.querySelectorAll('.poi-nav [data-poi]').forEach((button) => {
    button.classList.toggle('is-visited', Boolean(memory.data.visited[button.dataset.poi]));
  });
}

function updateTour() {
  if (!tour.pending || !isFree() || !canSpeak()) return;
  tour.pending = false;
  memory.data.finaleSeen = true;
  memory.save();
  livingFinaleOpen();
}

/* ------------------------------------------------------------- each frame */

// Anything that sends him somewhere waits for the top of the next frame
// (script.js calls livingFrameStart there, as it does leaveStart). frame()
// measures how far he has to go before calling livingPose; a new target set
// after that is taken as already reached, and he is put straight on it.
const livingSoon = [];
const soon = (fn) => livingSoon.push(fn);
function livingFrameStart() {
  while (livingSoon.length) livingSoon.shift()();
}

// His pose for this frame with what he is up to laid over it (script.js,
// frame).
function livingPose(base, dt, now, unit) {
  // A load average of sorts: frames' length against a 60 fps one, averaged
  // over about 1, 5 and 15 seconds.
  if (dt > 0) {
    livingStats.load = livingStats.load.map((v, i) => v + (dt * 60 - v) * Math.min(1, dt / [1, 5, 15][i]));
  }
  if (isFree()) {
    idle.quiet += dt;
  } else {
    idle.quiet = 0;
    idle.next = idleWait(IDLE_FIRST);
    idle.last = null;
  }
  updateGreeting(dt);
  updateTour();
  updateAway();
  updateLateNight();
  updateIncidents(dt);
  updateIdle();
  updateBird(dt);
  updateWind(dt);
  updateClickables(dt); // clickables.js
  return updateTeleport(updateRunMoves(ambientPose(base, dt, now, unit), dt, now, unit), dt, unit);
}

// How long he has been left to himself, when he next does something, and
// what he did last (see idling about).
const idle = { quiet: 0, next: 4, last: null };

// Where the camera is this frame, for what needs to know what is on screen
// (script.js, frame, once the world has moved): renderX, the world px in
// the middle of the screen before framing; shift, the framing; rise, the
// scene lifted; transform, the world's own.
const view = { renderX: 0, shift: 0, rise: 0, transform: '', unit: 1 };
function livingView(next) {
  Object.assign(view, next);
  // How far he has walked; a jump of more than a few hundred px in a frame
  // is being put somewhere, not walking.
  if (livingStats.lastX !== null) {
    const moved = Math.abs(state.x - livingStats.lastX);
    if (moved < 300) livingStats.walked += moved / view.unit;
  }
  livingStats.lastX = state.x;
  // The lights move with the world.
  if (worldLights && view.transform !== lightsTransform) {
    worldLights.style.transform = view.transform;
    lightsTransform = view.transform;
  }
  // After frame() has placed the speech bubble, so this can move it.
  updateTermNudge();
  // Once the world is where it is this frame: the sun sets behind its floor.
  updateSky();
  updateChorus(performance.now());
  updateWorldGone();
}

// Whether the world can't be seen at all: with the camera round at the
// bench, the terminal or the board, frame() fades it (and the sky) right
// out. Its endless animations rest meanwhile (restWhenAway), the stars too.
let worldGone = false;
function updateWorldGone() {
  const gone = livingScene.style.getPropertyValue('--project-world-opacity') === '0.0000';
  if (gone === worldGone) return;
  worldGone = gone;
  worldSight.fade?.(gone);
  starsOut();
}
// The stars and the Milky Way are out of sight by day and while the world
// is gone; then the stars stop twinkling, and the Milky Way (a big SVG with
// blurs) isn't drawn at all: it was being rastered again every frame of the
// chalkboard's show, now and then for a third of a second.
function starsOut() {
  const out = worldGone || (skyClock.look?.stars ?? 1) < 0.0005;
  skyStars?.classList.toggle('is-out', out);
  skyGalaxy?.classList.toggle('is-out', out);
}

// World px `x` on screen, and whether it is within `margin` px of it.
const screenX = (x) => x - view.renderX + sceneWidth / 2 + view.shift;
const onScreen = (x, margin = 0) => {
  const sx = screenX(x);
  return sx > margin && sx < sceneWidth - margin;
};

// Every looping animation costs a restyle each frame, and a repaint if it
// is drawn in SVG, whether it is seen or not. So the ones in the world (the
// camp fire, the lamps' LEDs, the glints on things to click) rest while
// their part of it is over half a screen away, or the whole world is faded
// out (updateWorldGone), and carry on from where they were when it's back. Only endless ones: anything that runs once
// still ends when it should.
const worldSight = { fade: null }; // restWhenAway's, once it has started
function restWhenAway() {
  const resting = new Map(); // each thing resting -> its animations paused
  const near = new Set(); // things within half a screen
  let faded = false; // the whole world faded out (updateWorldGone)
  const rest = (el) => {
    if (resting.has(el)) return;
    const paused = el.getAnimations({ subtree: true })
      .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity);
    paused.forEach((a) => a.pause());
    resting.set(el, paused);
  };
  const wake = (el) => {
    resting.get(el)?.forEach((a) => {
      if (a.playState === 'paused') a.play();
    });
    resting.delete(el);
  };
  const sight = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) near.add(target);
      else near.delete(target);
      if (isIntersecting && !faded) wake(target);
      else rest(target);
    }
  }, { rootMargin: '0px 50% 0px 50%' });
  worldSight.fade = (gone) => {
    faded = gone;
    near.forEach(gone ? rest : wake);
  };
  const watch = (el) => {
    if (el instanceof Element && !el.classList.contains('dust-canvas')) sight.observe(el);
  };
  for (const layer of [world, worldLights]) {
    if (!layer) continue;
    [...layer.children].forEach(watch);
    new MutationObserver((changes) => changes.forEach((change) => {
      change.addedNodes.forEach(watch);
      change.removedNodes.forEach((el) => {
        if (el.isConnected) return; // only moved
        sight.unobserve(el);
        resting.delete(el);
        near.delete(el);
      });
    })).observe(layer, { childList: true });
  }
}

// Once the world is built (script.js calls this last).
function startLiving() {
  const unit = parseFloat(getComputedStyle(figure).height) / UNITS_TALL;
  view.unit = unit;
  poiArtifactBuild();
  buttons.forEach((button) => button.addEventListener('click', () => navTapped(button)));
  restoreSmores(unit);
  markVisited();
  buildLights();
  idleBuild(); // idles.js: the trees and lamps its acts need
  buildStars();
  buildBird();
  // The sky as it is now, straight away, and the lights as they should be.
  sweepSky({ instant: true });
  updateSky();
  updateSwitches(performance.now(), true);
  incident.cooldownUntil = performance.now() + 20e3; // not straight away
  startClickables(); // clickables.js: after the scenery, on the same promise
  restWhenAway();
  // After buildSurroundings, which script.js queued on the same promise first.
  document.fonts.ready.then(() => {
    updateFixedCount();
    separateGrass();
    updateSwitches(performance.now(), true); // the lamps' own scenery, now it's there
  });
}

/* ----------------------------------------------------------- idling about
   Left to himself (isFree, and not fixing anything), every so often he
   does something: looks at the cursor, stretches, checks his phone, scuffs
   a pebble, yawns late at night. Left long enough, he sits down on the
   floor with his laptop and gets some work done until someone needs him.
   Anything the visitor does stops it; sitting, he stands up first. */

const SETTLE_AFTER = 35; // seconds left alone before he sits down to work
const IDLE_FIRST = [3, 5]; // seconds left alone before his first act, at least and at most
const IDLE_GAP = [2, 4]; // seconds between one act ending and the next, at least and at most

// A number of seconds between `range`'s two.
const idleWait = ([least, most]) => least + (most - least) * Math.random();
const phoneProp = document.querySelector('.prop-phone');

// Shows the phone in his hand, buzzing or not.
function showPhone(shown, buzzing = false) {
  if (!phoneProp) return;
  phoneProp.setAttribute('opacity', shown ? '1' : '0');
  phoneProp.classList.toggle('is-buzzing', shown && buzzing);
}

// Turns to look at the cursor, and up or down at it. Without a mouse, he
// glances back over his shoulder instead.
function lookAct() {
  const duration = 2.6 + Math.random() * 1.4;
  const from = state.facing;
  const mouse = finePointer.matches && pointerPlay.visible;
  return {
    kind: 'look',
    duration,
    pose(base, act) {
      const t = act.t;
      const k = ease(clamp(t / 0.4, 0, 1)) * ease(clamp((duration - t) / 0.4, 0, 1));
      const p = clonePose(base);
      if (mouse) {
        const at = pointerPlay.x - sceneWidth / 2 - view.shift + view.renderX; // the cursor in world px
        if (Math.abs(at - state.x) > 30 * view.unit) ambient.face = Math.sign(at - state.x);
        const head = floorY - 210 * view.unit;
        p.lean -= 6 * clamp((head - pointerPlay.y) / 220, -1, 1) * k;
      } else {
        ambient.face = t > 0.2 * duration && t < 0.75 * duration ? -from : from;
      }
      return p;
    },
  };
}

// Both arms up over his head, a lean back, and down again.
function stretchAct() {
  return keyframeAct('stretch', 2.8, [
    { at: 0 },
    { at: 0.28, lean: -6, near: { hand: [76, 4] }, far: { hand: [60, 4] } },
    { at: 0.6, lean: -9, near: { hand: [80, 2] }, far: { hand: [58, 2] } },
    { at: 0.82, lean: -1, near: { hand: [98, 120] }, far: { hand: [44, 120] } },
    { at: 1 },
  ], {
    hands: true,
    beats: { 0.1: () => sfx.hiss({ type: 'lowpass', freq: 700, to: 380, vol: 0.12, dur: 1.2, attack: 0.3 }) },
  });
}

// The phone out of his pocket, a look down at it, thumbing it, and away.
function phoneAct(duration = 4 + Math.random() * 2) {
  const frames = [
    { at: 0 },
    { at: 0.14, lean: 9, near: { hand: [97, 100] }, far: { hand: [91, 104] } },
    { at: 0.86, lean: 10, near: { hand: [97, 101] }, far: { hand: [91, 105] } },
    { at: 1 },
  ];
  return {
    kind: 'phone',
    duration,
    hands: true,
    pose(base, act) {
      const s = clamp(act.t / duration, 0, 1);
      showPhone(s > 0.1 && s < 0.9);
      const p = postureAt(frames, s, base);
      // A thumb tapping at it now and then.
      if (s > 0.18 && s < 0.82) {
        const tap = 2.2 * Math.max(0, Math.sin(act.t * 2 * Math.PI * 3.2)) * (Math.sin(act.t * 1.7) > 0 ? 1 : 0);
        Object.assign(p.far, armReach(p.lean, 91, 105 - tap));
      }
      return p;
    },
    end() {
      showPhone(false);
    },
  };
}

// A foot drawn back and a pebble scuffed along the floor.
function kickAct() {
  return keyframeAct('kick', 1.7, [
    { at: 0 },
    { at: 0.3, lean: -3, near: { foot: [54, 238] } },
    { at: 0.42, lean: 5, near: { foot: [118, 230] } },
    { at: 0.62, lean: 1, near: { foot: [96, 242] } },
    { at: 1 },
  ], { beats: { 0.42: kickPebble } });
}

const pebbles = [];
function kickPebble() {
  if (livingReduced.matches) return;
  const unit = view.unit;
  const dir = state.facing;
  const from = state.x + dir * 48 * unit;
  const run = (70 + 60 * Math.random()) * unit;
  const el = document.createElement('span');
  el.className = 'world-pebble';
  world.append(el);
  pebbles.push(el);
  if (pebbles.length > 5) pebbles.shift().remove();
  sfx.tap(1.8);
  sfx.tap(2.3, 0.28);
  sfx.tap(2.5, 0.5);
  const start = performance.now();
  const roll = (time) => {
    const k = clamp((time - start) / 900, 0, 1);
    const x = from + dir * run * easeOut(k);
    const hop = 10 * unit * Math.max(0, Math.sin(Math.PI * clamp(k / 0.3, 0, 1)));
    el.style.left = `${x.toFixed(1)}px`;
    el.style.transform = `translate(-50%, calc(-100% - ${hop.toFixed(1)}px)) rotate(${(dir * 540 * easeOut(k)).toFixed(0)}deg)`;
    if (k < 1) requestAnimationFrame(roll);
  };
  requestAnimationFrame(roll);
}

// A hand to his mouth and a lean back: late, or early.
function yawnAct() {
  return keyframeAct('yawn', 2.6, [
    { at: 0 },
    { at: 0.3, lean: -7, near: { hand: [80, 46] } },
    { at: 0.72, lean: -9, near: { hand: [80, 44] } },
    { at: 1 },
  ], {
    hands: true,
    beats: { 0.25: () => sfx.hiss({ type: 'lowpass', freq: 620, to: 300, vol: 0.14, dur: 1.4, attack: 0.4 }) },
  });
}

// Down on the floor with his laptop, typing in bursts and looking up now
// and then, until he is needed.
function settleAct() {
  let keyAt = 0;
  let opened = false;
  return {
    kind: 'settle',
    pin: true,
    outTime: 0.7,
    hands: true,
    pose(base, act) {
      const t = act.t;
      const bursting = Math.sin(t * 0.9) > -0.3; // typing, or stopping to think
      const lookUp = Math.max(0, Math.sin(t * 0.35 - 1.2)) ** 6; // a glance up now and then
      const sit = floorSitPose(base, 14 - 24 * lookUp);
      const lap = lapAt(sit);
      const keys = [onLaptop(lap, 3, -4), onLaptop(lap, 14, -9)];
      const tap = (speed, offset) => (bursting ? 2.8 * Math.max(0, Math.sin(t * speed * 2 * Math.PI + offset)) : 0);
      Object.assign(sit.near, armReach(sit.lean, keys[1][0], keys[1][1] - tap(8, 0)));
      Object.assign(sit.far, armReach(sit.lean, keys[0][0], keys[0][1] - tap(8, 1.7)));
      // Sitting down, as he sits in the opening.
      const s = clamp(t / 0.8, 0, 1);
      const p = s >= 1 ? sit
        : s < 0.5 ? mixPose(base, crouchPose(base, 40), ease(s / 0.5))
          : mixPose(crouchPose(base, 40), sit, ease((s - 0.5) / 0.5));
      const lid = clamp((t - 0.9) / 0.4, 0, 1);
      placeLaptop(t > 0.7 ? { at: 'lap', lid, bump: 0, lap: lapAt(p), hand: null } : null, (t * 0.12) % 1);
      if (!opened && t > 0.9) {
        opened = true;
        sfx.lid(true);
      }
      if (bursting && lid >= 1 && t > keyAt) {
        keyAt = t + 0.09 + Math.random() * 0.12;
        sfx.key?.();
      }
      return p;
    },
    end() {
      placeLaptop(null);
    },
  };
}

// What he might do next, and how likely, given the hour and whether there
// is a mouse to look at; never the same thing twice running, nor one of
// the last few. The part of the day's own ten (idles.js) join the five he
// does at any hour, whichever of them suit where he is and what's about.
function pickIdle() {
  const late = livingHour() >= 22 || livingHour() < 7;
  const options = [
    ['look', 2, lookAct],
    ['stretch', 1, stretchAct],
    ['phone', 2, phoneAct],
    ['kick', 1, kickAct],
    ['yawn', late ? 2 : 0, yawnAct],
    ...idleDaypartOptions(),
  ].filter(([kind, weight]) => weight > 0 && kind !== idle.last && !idleRecently(kind));
  let roll = Math.random() * options.reduce((sum, [, weight]) => sum + weight, 0);
  for (const option of options) {
    roll -= option[1];
    if (roll <= 0) return option;
  }
  return options[0];
}

// Whether something broken has his attention: one under way, or one left
// waiting that is near enough to go back to.
function incidentBusy() {
  if (incident.phase === 'none') return false;
  if (incident.phase !== 'waiting') return true;
  return Math.abs(current().x() - state.x) < sceneWidth * 1.2;
}

function updateIdle() {
  if (livingReduced.matches || incidentBusy()) return;
  // Up after midnight, he says so (updateLateNight) before he gets up to
  // anything, however long the night's acts are.
  if (livingHour() < 5 && memory.data.lateNightOn !== new Date().toDateString() && canSpeak() && !ambient.act) return;
  // Whatever he's in the middle of, his own act or not (a fix, a wave, a
  // brace against the wind), a breather after it before the next.
  if (ambient.act || ambient.out) {
    idle.next = Math.max(idle.next, idle.quiet + IDLE_GAP[0]);
    return;
  }
  const artifact = poiArtifactStation();
  if (artifact) {
    if (idle.quiet < idle.next) return;
    const [kind, , make] = idleStationPick(artifact) || poiArtifactPick(artifact, idle.last);
    const act = make();
    idle.last = kind;
    idle.next = idle.quiet + act.duration + idleWait(IDLE_GAP);
    startAct(act);
    return;
  }
  if (idle.quiet >= SETTLE_AFTER && idle.last !== 'settle') {
    idle.last = 'settle';
    // At dusk he may sit and watch the sun go down instead, and at night
    // lie back and look at the stars (idles.js).
    startAct(idleSettleAct() || settleAct());
    return;
  }
  if (idle.quiet < idle.next || idle.last === 'settle') return;
  const [kind, , make] = pickIdle();
  const act = make();
  idle.last = kind;
  idleDid(kind);
  idle.next = idle.quiet + act.duration + idleWait(IDLE_GAP);
  startAct(act);
}

/* ------------------------------------------------------------- on the run
   Things he does running, besides the swig of water and the wipe of his
   brow that script.js already has (updateRunFlares). Three join those two
   in the same rotation (RUN_FLARES): a look at his watch, a coffee carried
   level on a morning run, and now and then a stumble. script.js asks
   livingRunFlare which to play next, and plays ours through its pose. The
   rest go by what's around him (updateRunMoves, from livingPose): a slap on
   a lamp post or fingerpost as he passes, a hurdle over a bush he's
   sprinting at, the ninja run once Space has been held a while, and now
   and then, sprinting, a bug to deal with. None of it with motion reduced
   (updateRunFlares stops for that too). */

const NINJA_AFTER = 3; // seconds of holding Space before the ninja run
const BUG_SPEED = 230; // px a second the bug gains on him
const TAP_CHANCE = 1 / 3; // that he slaps a post he runs past

const runProps = {
  watch: document.querySelector('.figure .prop-watch'),
  readout: document.querySelector('.figure .prop-readout'),
  readoutText: document.querySelector('.figure .prop-readout__text'),
  mug: document.querySelector('.figure .prop-mug'),
  drip: document.querySelector('.figure .prop-drip'),
  headband: document.querySelector('.figure .prop-headband'),
  tails: document.querySelector('.figure .prop-headband__tails'),
  shown: false, // any of the flares' props out
};

// 0 before `a`, easing up to 1 over `rise`, and back down to 0 by `b` over
// `fall`.
const between = (t, a, b, rise, fall) => ease(clamp((t - a) / rise, 0, 1)) * ease(clamp((b - t) / fall, 0, 1));

// A point drawn in his upright torso's frame, where it is in the rig's
// once he leans `lean` degrees about his hip (as .lean turns it).
function leaned(lean, x, y) {
  const a = lean * RAD;
  const dx = x - 70;
  const dy = y - 144;
  return [70 + dx * Math.cos(a) - dy * Math.sin(a), 144 + dx * Math.sin(a) + dy * Math.cos(a)];
}

// Moves `side`'s joints toward `to` by `w`.
function blendSide(side, to, w) {
  if (w <= 0) return;
  for (const joint in to) side[joint] = mix(side[joint], to[joint], w);
}

// Puts the hand of `side` on (hx, hy), rig units inside the bob, by `w`:
// the nearest way round, so the arm never swings up behind him to get there.
function aimArm(p, side, hx, hy, w) {
  if (w <= 0) return;
  const arm = armReach(p.lean, hx, hy);
  arm.shoulder -= 360 * Math.round((arm.shoulder - p[side].shoulder) / 360);
  blendSide(p[side], arm, w);
}

function showProp(el, amount) {
  if (!el) return;
  el.setAttribute('opacity', amount.toFixed(2));
  if (amount > 0) runProps.shown = true;
}

// Where rig x (units, forward of his hip at 70) is in the world.
const rigToWorld = (x) => state.x + (x - 70) * view.unit * state.facing;

// Put away (script.js's hideRunFlareProps, with its own).
function livingHideRunProps() {
  if (!runProps.shown) return;
  runProps.shown = false;
  [runProps.watch, runProps.readout, runProps.mug, runProps.drip].forEach((el) => el?.setAttribute('opacity', '0'));
}

// His pace as his watch has it: his speed, taking 242 units as 1.8 m.
function paceText() {
  const metres = (state.speed / view.unit) * (1.8 / UNITS_TALL);
  const secs = clamp(Math.round(1000 / Math.max(metres, 0.3)), 150, 1199);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} /km`;
}

// The watch's readout over his wrist, the right way round whichever way he
// faces (the figure is mirrored to face left, so this is mirrored back).
function placeReadout(p, amount) {
  if (!runProps.readout) return;
  const [hx, hy] = handAt(p.lean, p.near.shoulder, p.near.elbow);
  const flip = state.flip < 0 ? -1 : 1;
  runProps.readout.setAttribute('transform', `translate(${(hx + 22).toFixed(1)} ${(hy - 28).toFixed(1)}) scale(${flip} 1)`);
  showProp(runProps.readout, amount);
}

// A look at his watch: wrist up in front of his face, a tap with the other
// hand, and what it says - his heart rate, then his pace.
function pacePose(t, p, fade, flare) {
  const w = fade * between(t, 0.05, 0.95, 0.16, 0.14);
  p.lean += 5 * w;
  aimArm(p, 'near', ...leaned(p.lean, 97, 62), w);
  aimArm(p, 'far', ...leaned(p.lean, 95, 67), fade * between(t, 0.46, 0.62, 0.06, 0.07));
  showProp(runProps.watch, w);
  const paced = t >= 0.55;
  if (flare.paced !== paced && runProps.readoutText) {
    flare.paced = paced;
    runProps.readoutText.textContent = paced ? paceText() : '♥ 142';
    if (paced) sfx.tone(2600, { type: 'square', vol: 0.02, dur: 0.05 });
  }
  placeReadout(p, fade * between(t, 0.22, 0.9, 0.06, 0.08));
}

// A mug of coffee, carried in front of him with the bounce of his run taken
// out, so it stays level; a drop escapes onto the floor, he takes a sip,
// and it goes away again.
function coffeePose(t, p, fade, flare) {
  const up = fade * between(t, 0.02, 0.97, 0.1, 0.1);
  const sip = between(t, 0.72, 0.9, 0.06, 0.06);
  const shoulder = [70 + 70 * Math.sin(p.lean * RAD), 144 - 70 * Math.cos(p.lean * RAD)];
  const mouth = leaned(p.lean, 93, 50);
  aimArm(p, 'near', mix(shoulder[0] + 30, mouth[0], sip), mix(shoulder[1] + 30 - p.bob, mouth[1], sip), up);
  if (runProps.mug) {
    // Upright whatever the arm is doing, and tipped to his mouth to drink.
    const upright = -(p.lean + p.near.shoulder + p.near.elbow) - 34 * sip;
    runProps.mug.style.transform = `rotate(${upright.toFixed(1)}deg) scale(${(1.25 * (0.45 + 0.55 * clamp(up / 0.6, 0, 1))).toFixed(2)})`;
  }
  showProp(runProps.mug, up);
  if (!flare.drip && t >= 0.42 && up > 0.9 && !livingReduced.matches) flare.drip = { start: performance.now() };
  if (flare.drip && !flare.drip.landed) fallDrip(p, flare.drip);
}

// The drop: off the mug's lip, down to the floor behind him, and a splash
// left there in the world as he runs on.
function fallDrip(p, drip) {
  const k = clamp((performance.now() - drip.start) / 340, 0, 1);
  if (!drip.from) {
    const [hx, hy] = handAt(p.lean, p.near.shoulder, p.near.elbow);
    drip.from = [hx - 5, hy - 15];
  }
  const x = drip.from[0] - 16 * k;
  const y = mix(drip.from[1], 242 - p.bob, k * k);
  runProps.drip?.setAttribute('cx', x.toFixed(1));
  runProps.drip?.setAttribute('cy', y.toFixed(1));
  showProp(runProps.drip, k < 1 ? 1 : 0);
  if (k < 1) return;
  drip.landed = true;
  splashAt(rigToWorld(x));
  sfx.tone(1900, { to: 900, vol: 0.03, dur: 0.06 });
}

function splashAt(x) {
  const el = document.createElement('span');
  el.className = 'world-splash';
  el.style.left = `${x.toFixed(1)}px`;
  el.innerHTML = [[-9, -7], [-4, -11], [4, -10], [9, -6]]
    .map(([dx, dy]) => `<i style="--dx: ${dx}px; --dy: ${dy}px"></i>`).join('');
  world.append(el);
  window.setTimeout(() => el.remove(), 800);
}

// His toe catches: he pitches forward with his arms windmilling once, finds
// his feet, and wants to know who left that there. The pebble stays.
function stumblePose(t, p, fade, flare) {
  if (!flare.tripped) {
    flare.tripped = true;
    tripPebble();
    sfx.tap(1.5);
    sfx.hiss({ type: 'lowpass', freq: 900, vol: 0.14, dur: 0.2, attack: 0.01 });
  }
  const legs = fade * between(t, 0, 0.36, 0.035, 0.16);
  const body = fade * between(t, 0, 0.62, 0.04, 0.22);
  const arms = fade * between(t, 0.02, 0.6, 0.05, 0.2);
  blendSide(p.near, { thigh: 30, knee: 75, ankle: 25 }, legs); // caught behind him
  blendSide(p.far, { thigh: -52, knee: 28, ankle: -10 }, legs); // thrown out to catch him
  p.lean += 42 * body;
  p.bob += 9 * body;
  // One turn of the arms, forward; done while they are fully his (arms at
  // 1), where a whole turn round is the same as none.
  const k = clamp((t - 0.04) / 0.36, 0, 1);
  const spin = k >= 1 ? 0 : -360 * easeOut(k);
  blendSide(p.near, { shoulder: -40 + spin, elbow: -12 }, arms);
  blendSide(p.far, { shoulder: 140 + spin, elbow: -12 }, arms);
  if (!flare.said && t > 0.72 && canSpeak()) {
    flare.said = true;
    remark('<span>Who put that there?</span>', 1500);
  }
}

// The pebble he caught his toe on, left lying where it was.
function tripPebble() {
  const el = document.createElement('span');
  el.className = 'world-pebble';
  el.style.left = `${(state.x + state.facing * 14 * view.unit).toFixed(1)}px`;
  el.style.transform = 'translate(-50%, -100%)';
  world.append(el);
  pebbles.push(el);
  if (pebbles.length > 5) pebbles.shift().remove();
}

// Ours, for script.js's rotation: seconds each lasts, and its pose over
// t = 0..1 (with `fade` his speed's say, and `flare` to keep state on).
const RUN_FLARES = {
  pace: { duration: 3.4, pose: pacePose },
  coffee: { duration: 6.5, pose: coffeePose },
  stumble: { duration: 2.3, pose: stumblePose },
};

// Which of ours script.js plays next, or null for one of its own: the
// coffee first on a morning (by the sky's clock) once a visit, a stumble
// now and then (once a visit, never sprinting), and the watch often.
const runStats = { flares: 0, coffee: false, stumbled: false };
function livingRunFlare() {
  runStats.flares += 1;
  const hour = wrapHour(skyClock.hour);
  if (!runStats.coffee && hour >= 5 && hour < 11) {
    runStats.coffee = true;
    return 'coffee';
  }
  if (!runStats.stumbled && !state.turbo && runStats.flares > 2 && Math.random() < 0.12) {
    runStats.stumbled = true;
    return 'stumble';
  }
  return Math.random() < 0.34 ? 'pace' : null;
}

/* What he does about what he's running past. */

const runMove = {
  tap: null, // the post he's slapping: { post, w, hit }
  passing: {}, // posts and bushes coming up, and whether he'll do anything
  taps: 0,
  hurdles: 0,
  turboFor: 0, // seconds Space has been held, sprinting
  ninja: 0, // how far into the ninja run, 0..1
  bug: null, // the bug after him
  nextBugAt: 0,
  kick: null, // his heel flicking back at it: { t, hit }
  always: false, // for the tests: slap every post
};

// The posts he can slap going past: the street lamps by his name and the
// fingerposts (script.js, buildStart and signpost).
function runPosts() {
  const u = view.unit;
  const sign = (name) => () => document.querySelector(`.set--sign[data-sign="${name}"]`);
  return [
    { id: 'lamp-left', foot: -STATUE.width - 580, x: nameEnd + (-STATUE.width - 580) * u, el: () => document.querySelector('[data-fixture="lamp-left"]'), glows: ['lamp-left', 'pool-left'] },
    { id: 'lamp-right', foot: 110, x: nameEnd + 110 * u, el: () => document.querySelector('[data-fixture="lamp-right"]'), glows: ['lamp-right', 'pool-right'] },
    { id: 'sign-start', x: nameEnd + 190, el: sign('start') },
    { id: 'sign-camp', x: (campX + benchX) / 2, el: sign('camp-bench') },
    { id: 'sign-line', x: (benchX + experienceX) / 2, el: sign('bench-line') },
  ];
}

// The bushes he can hurdle, both out by his name (buildStart).
function runBushes() {
  const u = view.unit;
  return [
    { id: 'bush-left', x: nameEnd + (-STATUE.width - 470) * u },
    { id: 'bush-right', x: nameEnd + 190 * u },
  ];
}

// Whether he's running (not walking) with nothing else to do, his own man.
function runningFree(unit) {
  const walkPx = (GAITS.walk.travel / WALK_CYCLE) * unit;
  return state.moving && state.speed > walkPx * 1.05 && !intro.active && !intro.release && !openPanelId
    && state.courseTime === 0 && handcar.stage === 'off' && !state.jump && state.seat === 0 && state.inspect === 0
    && state.typeIn === 0 && state.turning === 0;
}

// How far ahead of him world px `x` is, in units, the way he faces.
const unitsAhead = (x, unit) => ((x - state.x) * state.facing) / unit;

// Each frame, from livingPose: his pose with what he's doing about what's
// around him laid over it.
function updateRunMoves(p, dt, now, unit) {
  if (livingReduced.matches) return p;
  const running = runningFree(unit);
  const sprinting = running && state.turbo && state.speed > ((GAITS.run.travel / RUN_CYCLE) * unit) * 0.9;
  updateTap(p, running, dt, unit);
  updateHurdle(p, sprinting, unit);
  updateNinja(p, dt, now, sprinting);
  updateBug(p, dt, now, unit, sprinting);
  // While any of this has his arms, none of script.js's flares start.
  if (runMove.tap || runMove.ninja > 0.05 || runMove.kick || state.hop?.hurdle) {
    runFlareState.cooldown = Math.max(runFlareState.cooldown, 0.8);
  }
  return p;
}

// Running up to a lamp or a fingerpost, about one time in three, he
// reaches out and slaps it as he passes: it rocks, the lamp flickers if
// it's on, and anything sitting up top is off.
function updateTap(p, running, dt, unit) {
  // The next post coming up, once any slap under way has landed (the lamp
  // by his name and the fingerpost are only a few strides apart).
  const last = runMove.tap;
  if (running && !state.hop && !runFlareState.active && (!last || last.hit)) {
    for (const post of runPosts()) {
      const ahead = unitsAhead(post.x, unit);
      if (Math.abs(ahead) > 400) delete runMove.passing[post.id];
      if (ahead < 55 || ahead > 150 || post.id in runMove.passing) continue;
      runMove.passing[post.id] = runMove.always || Math.random() < TAP_CHANCE;
      if (!runMove.passing[post.id] || FIXTURES[post.id]?.broken) continue;
      runMove.tap = { post, w: last ? last.w : 0, reach: last ? last.reach : 70 + ahead, hit: false };
      break;
    }
  }
  const tap = runMove.tap;
  if (!tap) return;
  const ahead = unitsAhead(tap.post.x, unit);
  const want = running && !state.hop ? clamp((150 - ahead) / 70, 0, 1) * clamp((ahead + 30) / 50, 0, 1) : 0;
  tap.w += (want - tap.w) * Math.min(1, dt * 16);
  // Where his hand goes: the post, eased, so moving on to the next one it
  // sweeps across rather than jumping.
  tap.reach += (70 + ahead - tap.reach) * Math.min(1, dt * 18);
  if (!tap.hit && running && ahead <= 48) {
    tap.hit = true;
    knockPost(tap.post);
  }
  aimArm(p, 'near', tap.reach, 100, ease(clamp(tap.w, 0, 1)));
  if ((ahead < -30 || !running) && tap.w < 0.02) runMove.tap = null;
}

function knockPost(post) {
  runMove.taps += 1;
  runMove.lastTap = post.id;
  const el = post.el();
  if (el) {
    el.style.setProperty('--tap', String(state.facing));
    if (post.foot !== undefined) {
      // A lamp turns about the foot of its post, in its set's own units.
      el.style.transformBox = 'view-box';
      el.style.transformOrigin = `${post.foot}px 0px`;
    }
    restartClass(el, 'is-tapped');
  }
  // A lit lamp flickers with the knock.
  if (post.glows && lamps.lit[post.id]) {
    post.glows.forEach((id) => {
      const glow = worldLights?.querySelector(`[data-light="${id}"]`);
      if (glow) restartClass(glow, 'is-lighting');
    });
    if (el) restartClass(el, 'is-lighting');
  }
  sfx.tap(0.8);
  sfx.tone(620, { type: 'triangle', to: 560, vol: 0.05, dur: 0.4 });
  if (bird.mode === 'perched' && Math.abs(bird.x - post.x) < 70 * view.unit) flush(state.x);
}

// Starts `cls`'s animation on `el` over again, and takes the class off
// when it's done (its own animation, not one of its children's).
function restartClass(el, cls) {
  el.classList.remove(cls);
  el.getBoundingClientRect();
  el.classList.add(cls);
  const done = (event) => {
    if (event.target !== el) return;
    el.classList.remove(cls);
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
}

// Sprinting at a bush, he clears it like a hurdler: taking off so it passes
// under him halfway, lead leg out straight, trail leg tucked, reaching for
// his toe. (script.js flies the hop: state.hop.)
function updateHurdle(p, sprinting, unit) {
  const hop = state.hop;
  if (hop?.hurdle) {
    const k = clamp(hop.t / hop.duration, 0, 1);
    const w = ease(clamp(k / 0.2, 0, 1)) * ease(clamp((1 - k) / 0.22, 0, 1));
    blendSide(p.near, { thigh: -86, knee: 4, ankle: -8, shoulder: -78, elbow: -18 }, w);
    blendSide(p.far, { thigh: -36, knee: 108, ankle: 10, shoulder: 62, elbow: -44 }, w);
    p.lean = mix(p.lean, 24, w);
    return;
  }
  if (!sprinting || hop || runFlareState.active || runMove.tap) return;
  const reach = (state.speed / unit) * 0.27; // units he covers to halfway through the hop
  for (const bush of runBushes()) {
    const ahead = unitsAhead(bush.x, unit);
    if (Math.abs(ahead) > 700) delete runMove.passing[bush.id];
    if (bush.id in runMove.passing || ahead < 60 || ahead > reach) continue;
    runMove.passing[bush.id] = true;
    state.hop = { t: 0, duration: 0.52, height: 54, hurdle: true };
    runMove.hurdles += 1;
    sfx.jump();
    return;
  }
}

// Held long enough, the sprint becomes the ninja run: arms swept straight
// back, tipped forward (his sprint leans back), a headband's tails
// whipping behind him and the speed lines quicker.
function updateNinja(p, dt, now, sprinting) {
  runMove.turboFor = sprinting ? runMove.turboFor + dt : 0;
  const want = runMove.turboFor > NINJA_AFTER ? 1 : 0;
  runMove.ninja = clamp(runMove.ninja + (want - runMove.ninja) * Math.min(1, dt * 5), 0, 1);
  const w = ease(runMove.ninja);
  if (w > 0.001 && !state.hop?.hurdle) {
    blendSide(p.near, { shoulder: 98, elbow: -6 }, w);
    blendSide(p.far, { shoulder: 92, elbow: -4 }, w);
    p.lean = mix(p.lean, 20, w);
  }
  if (runProps.headband) {
    const shown = w > 0.01 ? w.toFixed(2) : '0';
    if (runProps.headband.getAttribute('opacity') !== shown) runProps.headband.setAttribute('opacity', shown);
    if (w > 0.01) {
      const f = now / 45;
      runProps.tails?.setAttribute('d', `M48 26Q39 ${(24 + 3 * Math.sin(f)).toFixed(1)} 29 ${(25 + 5 * Math.sin(f + 0.8)).toFixed(1)}`
        + `M48 29Q40 ${(31 + 3 * Math.sin(f + 1.3)).toFixed(1)} 31 ${(35 + 5 * Math.sin(f + 2)).toFixed(1)}`);
    }
  }
  speedLines.classList.toggle('is-ninja', w > 0.5);
}

// Now and then, sprinting, a bug comes scuttling after him from behind. He
// flicks it with his heel as it reaches him, it flips onto its back, and
// that's one more thing fixed (the terminal's `incidents` has it).
function updateBug(p, dt, now, unit, sprinting) {
  if (!runMove.bug && sprinting && runMove.turboFor > 1.2 && now > runMove.nextBugAt && Math.random() < dt / 9) {
    spawnBug(now);
  }
  if (runMove.bug) moveBug(runMove.bug, dt, unit);
  const kick = runMove.kick;
  if (!kick) return;
  kick.t += dt;
  const k = kick.t / 0.42;
  const w = ease(clamp(k / 0.3, 0, 1)) * ease(clamp((1 - k) / 0.45, 0, 1));
  blendSide(p.near, { thigh: 38, knee: 96, ankle: 24 }, w);
  p.lean += 8 * w;
  if (!kick.hit && k >= 0.3) {
    kick.hit = true;
    if (runMove.bug?.mode === 'chase') flipBug(runMove.bug, now);
  }
  if (k >= 1) runMove.kick = null;
}

function spawnBug(now) {
  runMove.nextBugAt = now + 25e3 + 25e3 * Math.random();
  const el = document.createElement('span');
  el.className = 'world-bug';
  el.innerHTML = '<svg viewBox="-13 -12 26 14" aria-hidden="true">'
    + '<path class="bug__legs bug__legs--a" d="M-4 -2l-3.5 4M0 -1.5v4.5M4 -2l3 4" />'
    + '<path class="bug__legs bug__legs--b" d="M-4 -2l-1 4.5M0 -1.5l-2.2 4.3M4 -2l1.4 4.5" />'
    + '<path class="bug__feelers" d="M10 -7.5l3.5 -3M10.5 -6l3.5 -1" />'
    + '<ellipse class="bug__body" cx="0" cy="-5" rx="8" ry="4.6" />'
    + '<circle class="bug__body" cx="8.6" cy="-5.6" r="3" /></svg>';
  world.append(el);
  const dir = state.facing;
  runMove.bug = { el, dir, x: state.x - dir * (sceneWidth * 0.55 + 40), mode: 'chase', born: now, t: 0 };
}

function moveBug(bug, dt, unit) {
  const gone = intro.active || openPanelId || state.courseTime > 0 || handcar.stage !== 'off';
  let lift = 0;
  let turn = 0;
  if (gone) bug.mode = 'leave';
  if (bug.mode === 'chase') {
    // After him, a little quicker than he's going, until it's at his heels;
    // if he turns to face it, it thinks better of it.
    if (state.facing !== bug.dir) bug.mode = 'flee';
    bug.x += bug.dir * (state.speed + BUG_SPEED) * dt;
    const behind = ((state.x - bug.x) * bug.dir) / unit;
    if (behind <= 72 && !runMove.kick) runMove.kick = { t: 0, hit: false };
    if (behind < -40) bug.mode = 'flee';
  } else if (bug.mode === 'flipped') {
    // Knocked up and back, over onto its back, legs going.
    bug.t += dt;
    const k = clamp(bug.t / 0.5, 0, 1);
    bug.x = bug.from - bug.dir * 70 * unit * easeOut(k);
    lift = 30 * unit * Math.sin(Math.PI * k);
    turn = 540 * k;
    if (bug.t > 3 && !bug.el.classList.contains('is-gone')) bug.el.classList.add('is-gone');
    if (bug.t > 3.7) bug.mode = 'leave';
  } else if (bug.mode === 'flee') {
    bug.t += dt;
    bug.x -= bug.dir * 280 * dt;
    if (bug.t > 1.4) bug.mode = 'leave';
  }
  if (bug.mode === 'leave') {
    bug.el.remove();
    runMove.bug = null;
    return;
  }
  bug.el.style.left = `${bug.x.toFixed(1)}px`;
  bug.el.style.transform = `translate(-50%, calc(-100% - ${lift.toFixed(1)}px)) scaleX(${bug.mode === 'flee' ? -bug.dir : bug.dir}) rotate(${turn.toFixed(0)}deg)`;
}

function flipBug(bug, now) {
  bug.mode = 'flipped';
  bug.t = 0;
  bug.from = bug.x;
  bug.el.classList.add('is-flipped');
  sfx.tap(2.2);
  sfx.tone(1500, { type: 'triangle', to: 2400, vol: 0.04, dur: 0.12 });
  logIncident('bug', Math.round((now - bug.born) / 100) / 10);
  updateFixedCount();
  runMove.bugsFixed = (runMove.bugsFixed || 0) + 1;
  if (canSpeak()) remark('<span>Bug fixed.</span>', 1500);
}

/* ------------------------------------------------------------ incidents
   He keeps the place running. Now and then, while he is standing about and
   it is on screen, something breaks - a street lamp or the camp lantern
   fizzles out, a signpost arm swings loose, a server goes red in the
   control room. His phone buzzes, he says something, walks over and fixes
   it, and it goes in the log (the terminal's `incidents`). If the visitor
   steers him away first, it stays broken until he is next free nearby.

   Phases: none -> fail (it fizzes for breakTime) -> notice (his phone; he
   says so) -> travel (walking to it; script.js calls livingArrived) ->
   fix (the act; its beats restore it) -> none. Cut short: waiting, and back
   to notice once he is free near it again.

   The fixtures are tagged in the scenery (script.js: buildStart, buildCamp,
   buildOps, signpost; data-fixture, data-sign, s-led--watch) and in the
   lights (data-light). Each says where it is (x, world px), where he stands
   to it (stand units away, on one of `sides`), how it breaks and is fixed,
   and his fix, as keyframes with hand targets and beats. */

// The world px of something `x` units from `anchor`, at this frame's size.
const fromAnchor = (anchor, x) => anchor + x * view.unit;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Sounds for breaking and fixing things, from sfx's two parts.
const noises = {
  buzz(at = 0) {
    [0, 0.2].forEach((gap) => sfx.tone(150, { type: 'square', vol: 0.04, dur: 0.13, at: at + gap }));
  },
  fizz(at = 0) {
    for (let i = 0; i < 6; i += 1) {
      sfx.hiss({ freq: 3500 + Math.random() * 1500, q: 6, vol: 0.05 + Math.random() * 0.05, dur: 0.03 + Math.random() * 0.05, at: at + Math.random() * 0.6, attack: 0.002 });
    }
  },
  down(at = 0) {
    sfx.tone(240, { type: 'sawtooth', to: 50, vol: 0.045, dur: 0.35, at });
  },
  up(at = 0) {
    sfx.tone(90, { type: 'sawtooth', to: 330, vol: 0.035, dur: 0.28, at });
  },
  creak(at = 0) {
    if (sfx.sample?.('creak', { vol: 0.22, rate: 0.92, at, vary: 0.04 })) return;
    sfx.tone(180, { type: 'sawtooth', to: 130, vol: 0.03, dur: 0.6, at, attack: 0.05 });
    sfx.hiss({ freq: 900, q: 4, vol: 0.035, dur: 0.5, at });
  },
  clunk(at = 0) {
    sfx.tap(1.3, at);
    sfx.tone(2400, { type: 'square', vol: 0.02, dur: 0.015, at: at + 0.02 });
  },
  alarm(at = 0) {
    if (sfx.sample?.('serverAlarm', { vol: 0.16, at, vary: 0.01 })) return;
    [0, 0.16, 0.32].forEach((gap) => sfx.tone(880, { type: 'square', vol: 0.03, dur: 0.08, at: at + gap }));
  },
  // A hand against something: a lamp post (`post`) or the lantern.
  thump(at = 0, post = false) {
    if (post && sfx.sample?.('postThump', { vol: 0.34, at, vary: 0.04 })) return;
    sfx.tap(0.5, at);
    sfx.tone(420, { type: 'triangle', to: 380, vol: 0.05, dur: 0.3, at });
  },
  // A lamp switched on (a click, and the hum of it catching) or off.
  flick(on, at = 0) {
    if (sfx.sample?.('uiSwitch', { vol: 0.1, rate: on ? 1.1 : 0.85, at, vary: 0.02 })) {
      if (on) sfx.tone(104, { type: 'sawtooth', to: 118, vol: 0.008, dur: 0.4, at: at + 0.03, attack: 0.06 });
      return;
    }
    sfx.tone(on ? 2300 : 1800, { type: 'square', vol: 0.018, dur: 0.012, at });
    if (on) sfx.tone(104, { type: 'sawtooth', to: 118, vol: 0.012, dur: 0.4, at: at + 0.03, attack: 0.06 });
  },
};

// His fixes: hand targets in rig units, the fixture always ahead of him.
// The { at: 0.12 } hold gives him time to turn to it first.
const FIX_THUMP = [ // the heel of his hand against a lamp post, twice
  { at: 0 },
  { at: 0.12 },
  { at: 0.3, lean: -4, near: { hand: [62, 96] } },
  { at: 0.4, lean: 6, near: { hand: [106, 98] } },
  { at: 0.5, lean: 2, near: { hand: [94, 100] } },
  { at: 0.62, lean: -4, near: { hand: [60, 94] } },
  { at: 0.72, lean: 7, near: { hand: [107, 96] } },
  { at: 0.86, lean: 3, near: { hand: [96, 104] } },
  { at: 1 },
];
const FIX_TAP = [ // two taps on the lantern's glass
  { at: 0 },
  { at: 0.15 },
  { at: 0.35, lean: 2, near: { hand: [100, 72] } },
  { at: 0.45, lean: 4, near: { hand: [107, 70] } },
  { at: 0.55, lean: 2, near: { hand: [100, 72] } },
  { at: 0.65, lean: 4, near: { hand: [107, 70] } },
  { at: 0.85, near: { hand: [98, 82] } },
  { at: 1 },
];
const FIX_PUSH = [ // a signpost arm pushed back up level, and tapped home
  { at: 0 },
  { at: 0.12 },
  { at: 0.3, lean: -2, near: { hand: [110, 70] } },
  { at: 0.5, lean: -6, near: { hand: [115, 54] } },
  { at: 0.62, lean: -6, near: { hand: [115, 54] } },
  { at: 0.7, lean: -4, near: { hand: [111, 48] } },
  { at: 0.76, lean: -5, near: { hand: [115, 54] } },
  { at: 0.84, lean: -4, near: { hand: [111, 48] } },
  { at: 0.9, lean: -5, near: { hand: [115, 54] } },
  { at: 1 },
];
const FIX_RESEAT = [ // a cable in the rack pulled out and pushed home
  { at: 0 },
  { at: 0.12 },
  { at: 0.32, lean: 3, near: { hand: [108, 70] } },
  { at: 0.45, lean: 0, near: { hand: [95, 70] } },
  { at: 0.56, lean: 5, near: { hand: [111, 69] } },
  { at: 0.72, lean: 4, near: { hand: [110, 70] } },
  { at: 1 },
];

// A light that fails: the street lamps and the lantern. `id` is its
// data-fixture in the scenery; `glows` its data-light glows.
function lightFixture({ id, glows, label, x, stand, lines, frames, duration, hits }) {
  const el = () => document.querySelector(`[data-fixture="${id}"]`);
  const lit = () => document.querySelectorAll(glows.map((g) => `[data-light="${g}"]`).join(', '));
  const show = (state) => {
    el()?.classList.toggle('is-faulty', state === 'faulty');
    el()?.classList.toggle('is-out', state === 'out');
    lit().forEach((g) => {
      g.classList.toggle('is-flickering', state === 'faulty');
      g.classList.toggle('is-off', state === 'out');
    });
  };
  const fixture = {
    label, x, stand, sides: [-1, 1], breakTime: 2.4, lines, broken: false,
    fail() {
      this.broken = true;
      show('faulty');
      [0, 0.8, 1.6].forEach((at) => noises.fizz(at));
    },
    out() {
      show('out');
      noises.down();
    },
    restore() {
      this.broken = false;
      show(null);
      noises.up();
    },
    fix: {
      duration,
      frames,
      // Each hit but the last makes it flicker; the last puts it right.
      beats: Object.fromEntries(hits.map((at, i) => [at, () => {
        noises.thump(0, id.startsWith('lamp'));
        if (i < hits.length - 1) show('faulty');
        else fixture.restore();
      }])),
    },
  };
  return fixture;
}

const FIXTURES = {
  'lamp-right': lightFixture({
    id: 'lamp-right', glows: ['lamp-right', 'pool-right'], label: 'the street lamp',
    x: () => fromAnchor(nameEnd, 110), stand: 38,
    lines: ['Hm. That lamp again.', 'Not again…', 'On it.'],
    frames: FIX_THUMP, duration: 2.2, hits: [0.4, 0.72],
  }),
  'lamp-left': lightFixture({
    id: 'lamp-left', glows: ['lamp-left', 'pool-left'], label: 'the street lamp',
    x: () => fromAnchor(nameEnd, -STATUE.width - 580), stand: 38,
    lines: ['Hm. That lamp again.', 'On it.'],
    frames: FIX_THUMP, duration: 2.2, hits: [0.4, 0.72],
  }),
  lantern: lightFixture({
    id: 'lantern', glows: ['lantern'], label: 'the lantern',
    x: () => fromAnchor(campX, -140), stand: 40,
    lines: ['The lantern’s gone out.', 'Hang on.'],
    frames: FIX_TAP, duration: 1.8, hits: [0.45, 0.65],
  }),
  sign: {
    label: 'the signpost',
    x: () => fromAnchor((campX + benchX) / 2, -10), // the arm's root, on the post
    stand: 20,
    sides: [-1],
    breakTime: 1.2,
    lines: ['That sign’s come loose.', 'Hm. Hang on.'],
    broken: false,
    arm: () => document.querySelector('[data-sign="camp-bench"] [data-arm="0"]'),
    fail() {
      this.broken = true;
      const arm = this.arm();
      arm?.classList.add('is-loose');
      if (arm) arm.style.transform = 'rotate(35deg)';
      noises.creak();
    },
    out() {},
    restore() {
      this.broken = false;
      const arm = this.arm();
      arm?.classList.remove('is-loose');
      if (arm) arm.style.transform = '';
    },
    fix: {
      duration: 2.4,
      frames: FIX_PUSH,
      beats: {
        0.34: () => {
          FIXTURES.sign.restore(); // it swings up with his hand
          noises.creak();
        },
        0.76: () => sfx.tap(1.2),
        0.9: () => sfx.tap(1.2),
      },
    },
  },
  rack: {
    label: 'the server rack',
    x: () => fromAnchor(skillsX, 408), // the failing light
    stand: 42,
    sides: [-1],
    breakTime: 1.6,
    lines: ['Hm. Something’s down.', 'That’ll be the rack.', 'On it.'],
    broken: false,
    show(failing) {
      document.querySelector('.s-led--watch')?.classList.toggle('is-fault', failing);
      document.querySelector('.set--ops')?.classList.toggle('is-degraded', failing);
      document.querySelector('[data-light="racks"]')?.classList.toggle('is-alarm', failing);
      const readout = document.querySelector('[data-fixture="readout"] text');
      if (readout) readout.textContent = failing ? 'DEGRADED' : 'UPTIME 99.98%';
    },
    fail() {
      this.broken = true;
      this.show(true);
      noises.alarm();
    },
    out() {
      noises.alarm();
    },
    restore() {
      this.broken = false;
      this.show(false);
      if (!sfx.sample?.('cablePlug', { vol: 0.34, vary: 0.02 })) noises.clunk();
    },
    fix: {
      duration: 2.2,
      frames: FIX_RESEAT,
      beats: {
        0.45: () => { if (!sfx.sample?.('cableUnplug', { vol: 0.3, vary: 0.02 })) sfx.tap(1.6); },
        0.56: () => FIXTURES.rack.restore(),
      },
    },
  },
};

const incident = {
  phase: 'none', // none, fail, noticing, notice, travel, fix, waiting
  id: null,
  t: 0,
  failedAt: 0,
  side: -1, // which side of it he works from
  after: 10, // seconds left alone before one may happen
  cooldownUntil: 0, // performance.now() before which none happen
  checkAt: 0,
  say: null, // what he says when paged, if not one of the fixture's lines
  byVisitor: false, // broken by the visitor clicking it too much (clickables.js)
};
const current = () => FIXTURES[incident.id];

// The ops board's count of what he has fixed.
function updateFixedCount() {
  const text = document.querySelector('[data-fixture="fixed-count"] text');
  if (text) text.textContent = memory.data.fixed ? `FIXED ${memory.data.fixed}` : ' ';
}

function startIncident(id) {
  incident.id = id;
  incident.phase = 'fail';
  incident.t = 0;
  incident.failedAt = performance.now();
  FIXTURES[id].fail();
}

// His phone buzzes; he looks at it, then up towards it, and says so.
function pagedAct(toward, fixture) {
  const duration = 1.9;
  const frames = [
    { at: 0 },
    { at: 0.2, lean: 9, near: { hand: [97, 100] } },
    { at: 0.5, lean: 8, near: { hand: [97, 101] } },
    { at: 0.7, lean: -2 },
    { at: 1 },
  ];
  let buzzed = false;
  let said = false;
  return {
    kind: 'paged',
    duration,
    hands: true,
    pose(base, act) {
      const s = clamp(act.t / duration, 0, 1);
      if (!buzzed) {
        buzzed = true;
        noises.buzz();
      }
      showPhone(s > 0.06 && s < 0.62, s < 0.45);
      if (s > 0.5) ambient.face = toward;
      if (!said && s > 0.55) {
        said = true;
        if (canSpeak()) remark(`<span>${incident.say || pick(fixture.lines)}</span>`, 1700);
      }
      return postureAt(frames, s, base);
    },
    end(cancelled) {
      showPhone(false);
      if (cancelled && incident.phase === 'notice') incident.phase = 'waiting';
    },
  };
}

function noticeIncident() {
  incident.phase = 'notice';
  startAct(pagedAct(Math.sign(current().x() - state.x) || state.facing, current()));
}

// Off he goes to it, as he goes to a stop, from the top of the next frame.
function travelToIncident() {
  const fixture = current();
  const side = fixture.sides.length > 1 ? (Math.sign(state.x - fixture.x()) || -1) : fixture.sides[0];
  incident.side = side;
  incident.phase = 'travel';
  soon(() => {
    state.target = clamp(fixture.x() + side * fixture.stand * view.unit, 0, WORLD_END);
    state.destinationId = 'incident';
    state.label = fixture.label;
    state.announced = false;
    status.textContent = `Heading over to fix ${fixture.label}`;
  });
}

// At it (script.js, frame, on arriving): the fix.
function livingArrived() {
  if (incident.phase !== 'travel') return;
  const fixture = current();
  incident.phase = 'fix';
  startAct(keyframeAct('fix', fixture.fix.duration, fixture.fix.frames, {
    hands: true,
    beats: fixture.fix.beats,
    end(cancelled) {
      if (cancelled && fixture.broken) incident.phase = 'waiting';
      else finishIncident();
    },
  }));
  ambient.face = -incident.side;
}

function finishIncident() {
  const fixture = current();
  if (!fixture) return;
  if (fixture.broken) fixture.restore();
  logIncident(incident.id.replace(/-.*/, ''), (performance.now() - incident.failedAt) / 1000, incident.byVisitor ? 'you' : null);
  incident.say = null;
  incident.byVisitor = false;
  updateFixedCount();
  sfx.chime(0.1);
  if (canSpeak()) remark(`<span>${pick(['Fixed.', 'There we go.', 'Sorted.', 'Back up.'])}</span>`, 1500);
  if (state.destinationId === 'incident') {
    state.destinationId = null;
    state.announced = true;
  }
  status.textContent = `Fixed ${fixture.label}`;
  incident.phase = 'none';
  incident.id = null;
  incident.cooldownUntil = performance.now() + (60 + 60 * Math.random()) * 1000;
  incident.after = 8 + 6 * Math.random();
}

function updateIncidents(dt) {
  if (livingReduced.matches) return;
  const now = performance.now();
  const fixture = current();
  switch (incident.phase) {
    case 'none': {
      if (now < incident.cooldownUntil || now < incident.checkAt || intro.active || !isFree() || idle.quiet < incident.after) return;
      if (ambient.act && ambient.act.kind !== 'settle') return; // let him finish what he is doing
      incident.checkAt = now + 1000;
      const ready = Object.keys(FIXTURES).filter((id) => onScreen(FIXTURES[id].x(), 70) && !clickBusy(id));
      if (ready.length) startIncident(pick(ready));
      return;
    }
    case 'fail':
      incident.t += dt;
      if (incident.t < fixture.breakTime) return;
      fixture.out();
      if (!isFree()) {
        incident.phase = 'waiting';
      } else if (ambient.act || ambient.out) {
        cancelAmbient(); // up off the floor, or out of whatever he was at
        incident.phase = 'noticing';
      } else {
        noticeIncident();
      }
      return;
    case 'noticing':
      if (!ambient.act && !ambient.out) noticeIncident();
      return;
    case 'notice':
      if (!ambient.act) travelToIncident(); // the paged act has run
      return;
    case 'travel':
      if (state.destinationId !== 'incident') incident.phase = 'waiting'; // steered off
      return;
    case 'waiting':
      if (isFree() && idle.quiet >= 3 && !ambient.act && !ambient.out && Math.abs(fixture.x() - state.x) < sceneWidth * 1.2) noticeIncident();
      return;
    default:
  }
}

/* ------------------------------------------------------------------ the bird
   One small bird, in the world like the scenery. It perches on things - the
   fingerposts, the lamps, the tops of the letters of his name, the tent,
   the trees, the roofs - turns about and pecks, and chirps now and then.
   It flies off when he comes past in a hurry, gets too close, jumps near
   it, or the cursor comes at it, to another perch a little way off, or up
   off the screen for a while if there is none. At night it roosts. With
   motion reduced it sits on the first fingerpost and stays there. */

// Where it can sit: world px along, and px above the floor, at this frame's
// size. Each is a spot in the scenery, in the units that drew it.
function birdPerches() {
  const u = view.unit;
  const at = (anchor, x, y) => ({ x: anchor + x * u, y: y * u });
  const letterTop = PLINTH + 8 + LETTER_TALL;
  const letter = (i, x) => at(nameStart(u), STATUE.letters[i].x + x, letterTop);
  return [
    at(nameEnd, -STATUE.width - 550, 318), // the left street lamp's head
    letter(2, 90), letter(4, 28), letter(6, 70), letter(7, 70), letter(10, 190), // E, M, B, R, N
    at(nameEnd, 140, 318), // the right street lamp
    at(nameEnd + 190, 0, 222), // the first fingerpost
    at(campX, -300, 164), // the tent's peak
    at(campX, -170, 200), // the lantern's pole
    at(campX, 450, 420), // the pine past the fire
    at((campX + benchX) / 2, 0, 222),
    at(benchX, 100, 310), // the workshop roof
    at(benchX, 125, 344), // its sign
    at((benchX + experienceX) / 2, 0, 222),
    at(skillsX, 150, 470), // the control room's wall
    at(skillsX, 520, 470),
    ...idlePerches(at), // the trees and lamps idles.js adds
  ];
}

const bird = {
  el: null,
  mode: 'perched', // perched, flying, away, roosting
  perch: 0,
  x: 0, // world px
  y: 0, // px above the floor
  dir: 1,
  nextFidget: 2,
  flight: null, // { from, to, bend, t, time, then }
  awayFor: 0,
  lastFigureX: null,
  shown: '',
  woken: false, // flown out of the tent at night, on its way back to roost
  bedtime: false, // seen off to its roost at dusk (idles.js), till morning
};

function buildBird() {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('class', 'bird');
  el.setAttribute('viewBox', '-12 -14 24 15');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <g class="bird__perched">
      <path class="bird__tail" d="M-4.5 -4.2L-9.5 -6.8L-9 -3.4Z" />
      <path d="M-1.2 -1.2V0M1.2 -1.2V0" />
      <ellipse cx="0" cy="-4.4" rx="5.4" ry="3.5" />
      <g class="bird__head">
        <circle cx="4.2" cy="-8.4" r="2.7" />
        <path class="bird__beak" d="M6.6 -9L9 -8.3L6.6 -7.6Z" />
        <circle class="bird__eye" cx="4.9" cy="-9" r="0.5" />
      </g>
    </g>
    <g class="bird__flying">
      <path class="bird__wings bird__wings--up" d="M-9 -9Q-4 -12 0 -6.5Q4 -12 9 -9" />
      <path class="bird__wings bird__wings--down" d="M-9 -3Q-4 -2 0 -6.5Q4 -2 9 -3" />
      <ellipse cx="0.6" cy="-6.4" rx="3.6" ry="2" />
      <path class="bird__beak" d="M4 -6.8L6 -6.4L4 -6Z" />
    </g>`;
  world.append(el);
  bird.el = el;
  const start = birdPerches()[0];
  Object.assign(bird, { x: start.x, y: start.y, perch: 0 });
}

// Somewhere to fly to: a perch a fair way off, on the far side from him if
// there is one, not right by him, and not out past the edge of the world.
function nextPerch(figureX) {
  const perches = birdPerches();
  const body = UNITS_TALL * view.unit;
  const away = Math.sign(bird.x - figureX) || 1;
  const fair = perches
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.i !== bird.perch && Math.abs(p.x - bird.x) > 0.3 * sceneWidth
      && Math.abs(p.x - bird.x) < 1.6 * sceneWidth && Math.abs(p.x - figureX) > 1.6 * body);
  const ahead = fair.filter((p) => Math.sign(p.x - bird.x) === away);
  const list = ahead.length ? ahead : fair;
  return list.length ? pick(list) : null;
}

function flyTo(target, then = 'perched') {
  const from = { x: bird.x, y: bird.y };
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  bird.flight = {
    from,
    to: target,
    bend: Math.max(from.y, target.y) + (80 + 80 * Math.random()) * (sceneHeight / 800),
    t: 0,
    time: clamp(distance / 350, 0.8, 4),
    then,
  };
  bird.mode = 'flying';
  bird.dir = Math.sign(target.x - from.x) || bird.dir;
  if (onScreen(bird.x)) sfx.hiss({ freq: 1600, to: 900, q: 1, vol: 0.06, dur: 0.3, attack: 0.02 });
}

// Takes off from where it sits.
function flush(figureX) {
  const target = nextPerch(figureX);
  if (target) {
    bird.perch = target.i;
    flyTo(target);
    return;
  }
  // Nowhere near: up and away off the screen for a while.
  const away = Math.sign(bird.x - figureX) || 1;
  flyTo({ x: bird.x + away * sceneWidth * 0.7, y: sceneHeight * 0.9 }, 'away');
}

// Out of wherever it was hiding (the tent, clickables.js), from (x, y): off
// to a perch, or at night up and away, and back to its roost.
function livingBirdBurst(x, y) {
  if (!bird.el || livingReduced.matches) return;
  Object.assign(bird, { x, y, flight: null, woken: livingScene.dataset.daypart === 'night' });
  if (bird.woken) flyTo({ x: x + (Math.sign(x - state.x) || 1) * sceneWidth * 0.7, y: sceneHeight * 0.9 }, 'away');
  else flush(state.x);
  if (!sfx.sample?.('birdFlutter', { vol: 0.2, vary: 0.04 })) sfx.hiss({ freq: 1600, to: 900, q: 1, vol: 0.08, dur: 0.4, attack: 0.02 });
  if (!sfx.sample?.('birdChirp', { vol: 0.12, at: 0.05, vary: 0.05 })) sfx.tone(3300, { to: 4400, vol: 0.03, dur: 0.06, at: 0.05 });
}

function updateBird(dt) {
  if (!bird.el) return;
  const unit = view.unit;
  const body = UNITS_TALL * unit;
  const night = livingScene.dataset.daypart === 'night';
  // Where he really is, walking on in the opening included, and how fast.
  const figureX = state.x + (intro.active ? intro.dxPx : 0);
  const speed = bird.lastFigureX === null || dt <= 0 ? 0 : Math.abs(figureX - bird.lastFigureX) / dt;
  bird.lastFigureX = figureX;

  // Seen off to bed at dusk (idles.js, goodnight to the bird), it stays
  // there till morning.
  if (bird.bedtime && (livingScene.dataset.daypart === 'dawn' || livingScene.dataset.daypart === 'day')) bird.bedtime = false;
  if (night && bird.mode !== 'roosting' && !bird.woken) {
    bird.mode = 'roosting';
    bird.flight = null;
  } else if (!night && bird.mode === 'roosting' && !bird.bedtime) {
    bird.mode = 'away';
    bird.awayFor = 1;
  }

  if (bird.mode === 'perched') {
    const perch = birdPerches()[bird.perch];
    bird.x = perch.x;
    bird.y = perch.y;
    if (!livingReduced.matches) {
      const distance = Math.abs(figureX - bird.x);
      const walkPx = (GAITS.walk.travel / WALK_CYCLE) * unit;
      const cursorNear = finePointer.matches && pointerPlay.visible
        && Math.hypot(pointerPlay.x - screenX(bird.x), pointerPlay.y - (floorY + view.rise - bird.y - 8)) < 50;
      const fixingNear = incident.phase === 'fix' && distance < 2 * body;
      if ((distance < 1.4 * body && speed > walkPx * 1.2) || distance < 0.6 * body
          || (state.hop && distance < 2 * body) || cursorNear || fixingNear) {
        flush(figureX);
      } else {
        // Fidgeting: turning about, pecking, now and then a chirp.
        bird.nextFidget -= dt;
        if (bird.nextFidget <= 0) {
          bird.nextFidget = 1.5 + 2.5 * Math.random();
          const r = Math.random();
          if (r < 0.4) bird.dir = -bird.dir;
          else if (r < 0.8) {
            bird.el.classList.add('is-pecking');
            window.setTimeout(() => bird.el?.classList.remove('is-pecking'), 380);
          } else if (onScreen(bird.x)) {
            if (!sfx.sample?.('birdChirp', { vol: 0.09, rate: 1.05, vary: 0.06 })) {
              [0, 0.09].forEach((at) => sfx.tone(3300, { to: 4300, vol: 0.025, dur: 0.05, at }));
            }
          }
        }
      }
    }
  } else if (bird.mode === 'flying') {
    const f = bird.flight;
    f.t += dt;
    const k = clamp(f.t / f.time, 0, 1);
    const e = easeInOut(k);
    bird.x = mix(f.from.x, f.to.x, e);
    bird.y = bezier(f.from.y, f.bend, f.to.y, e);
    bird.el.classList.toggle('is-landing', f.then === 'perched' && k > 0.85);
    if (k >= 1) {
      bird.flight = null;
      bird.woken = false;
      bird.el.classList.remove('is-landing');
      if (f.then === 'perched') {
        bird.mode = 'perched';
        bird.nextFidget = 0.8;
      } else if (f.then === 'visit' || f.then === 'roosting') {
        // Down beside him for his lunch, or off to bed (idles.js).
        bird.mode = f.then;
      } else {
        bird.mode = 'away';
        bird.awayFor = 8 + 12 * Math.random();
      }
    }
  } else if (bird.mode === 'away') {
    bird.awayFor -= dt;
    if (bird.awayFor <= 0) {
      // Back in from off the top of the screen, to a perch in view.
      const middle = view.renderX - view.shift;
      const inView = birdPerches().map((p, i) => ({ ...p, i }))
        .filter((p) => Math.abs(p.x - middle) < 0.42 * sceneWidth && Math.abs(p.x - figureX) > 1.6 * body);
      if (inView.length) {
        const target = pick(inView);
        bird.perch = target.i;
        bird.x = target.x + (Math.random() < 0.5 ? -1 : 1) * sceneWidth * 0.6;
        bird.y = sceneHeight * 0.9;
        flyTo(target);
      } else {
        bird.awayFor = 3;
      }
    }
  }

  // Drawn: hidden away or roosting; flipped to face its way.
  const hidden = bird.mode === 'away' || bird.mode === 'roosting';
  bird.el.classList.toggle('is-flying', bird.mode === 'flying');
  bird.el.classList.toggle('is-away', hidden);
  const shown = `${bird.x.toFixed(1)}|${bird.y.toFixed(1)}|${bird.dir}`;
  if (shown !== bird.shown) {
    bird.shown = shown;
    bird.el.style.left = `${bird.x.toFixed(1)}px`;
    bird.el.style.transform = `translate(-50%, calc(-100% - ${bird.y.toFixed(1)}px)) scaleX(${bird.dir})`;
  }
}

/* -------------------------------------------------------------------- wind
   Every so often a gust comes through: the grass bends, the trees lean,
   the fire's smoke and embers blow over, a few leaves tumble past, and if
   he is standing about he leans into it. The grass is lifted out of the
   big scenery drawings onto small layers of its own (as the control room's
   lights are), so bending it repaints only the grass. The bending itself
   is all CSS (living.css, keyed off .world.is-gusting and --gust-dir). */

const GUST_TIME = 2.6; // seconds a gust lasts
const wind = { next: 14 + 12 * Math.random(), left: 0 };

// Each set's grass onto a layer of its own, just after it.
function separateGrass() {
  document.querySelectorAll('.world > svg.set:not(.set--grass)').forEach((set) => {
    const grass = [...set.querySelectorAll('.s-grass')]; // a set can have more than one run
    if (!grass.length) return;
    const layer = document.createElementNS(SVG_NS, 'svg');
    layer.setAttribute('class', 'set set--grass');
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('viewBox', set.getAttribute('viewBox'));
    layer.style.cssText = set.style.cssText; // its place and size
    layer.append(...grass);
    set.after(layer);
  });
}

// Leaning into it, whichever way he faces.
function braceAct(dir) {
  const duration = GUST_TIME;
  return {
    kind: 'brace',
    duration,
    pose(base, act) {
      const k = Math.sin(Math.PI * clamp(act.t / duration, 0, 1));
      const p = clonePose(base);
      p.lean -= dir * state.facing * 5 * k;
      return p;
    },
  };
}

// A few leaves tumbling across the screen on the wind.
function blowLeaves(dir) {
  const unit = view.unit;
  const middle = view.renderX - view.shift; // the world px in the middle of the screen
  for (let i = 0; i < 5; i += 1) {
    const el = document.createElement('span');
    el.className = 'world-leaf';
    world.append(el);
    const from = middle - dir * (sceneWidth / 2 + 40 + 200 * Math.random());
    const high = (30 + 150 * Math.random()) * unit;
    const speed = 280 + 160 * Math.random(); // px a second
    const spin = (Math.random() < 0.5 ? -1 : 1) * (280 + 400 * Math.random());
    const life = (sceneWidth + 480) / speed;
    const start = performance.now() + i * 200;
    const blow = (time) => {
      const t = (time - start) / 1000;
      if (t >= life) {
        el.remove();
        return;
      }
      if (t >= 0) {
        const y = Math.max(0, high - 20 * unit * t + 16 * unit * Math.sin(t * 3 + i));
        el.style.left = `${(from + dir * speed * t).toFixed(1)}px`;
        el.style.transform = `translate(-50%, calc(-100% - ${y.toFixed(1)}px)) rotate(${(spin * t).toFixed(0)}deg)`;
      }
      requestAnimationFrame(blow);
    };
    requestAnimationFrame(blow);
  }
}

function startGust(dir = Math.random() < 0.5 ? -1 : 1) {
  world.style.setProperty('--gust-dir', dir);
  world.classList.remove('is-gusting');
  void world.offsetWidth; // so the bending plays again
  world.classList.add('is-gusting');
  wind.left = GUST_TIME;
  if (!sfx.sample?.('windGust', { vol: 0.22, vary: 0.05 })) sfx.hiss({ type: 'lowpass', freq: 500, to: 950, vol: 0.14, dur: GUST_TIME, attack: 0.8 });
  blowLeaves(dir);
  if (isFree() && !ambient.act && !ambient.out && !incidentBusy()) startAct(idleGustAct(dir) || braceAct(dir));
}

function updateWind(dt) {
  if (livingReduced.matches) return;
  if (wind.left > 0) {
    wind.left -= dt;
    if (wind.left <= 0) world.classList.remove('is-gusting');
  }
  wind.next -= dt;
  if (wind.next <= 0) {
    wind.next = 15 + 15 * Math.random();
    startGust();
  }
}

/* ------------------------------------------------------------ time of day
   The scene follows the visitor's clock, hour by hour. A wash is laid over
   the world and him (.sky-wash, multiplied), and over that the lights, on a
   layer that moves with the world (.world-lights, screened): the fire and
   the control room's screens, and the lamps, the lantern and the workshop,
   which someone switches on one by one at dusk and off in turn in the
   morning. A sun crosses the sky from dawn to dusk, rising and setting
   behind the floor line; the moon and the stars come out at night; mist
   lies along the floor at dawn. How the sky goes through the day is
   SKY_KEYS; how each thing looks is in living.css. It sounds of the hour
   too (the sounds of the day, below).

   The visitor can see the world at any other hour: with the picker at the
   top left of the navbar (a part of the day, or any hour on its slider),
   with T, or with the terminal's `time`; ?time=dawn|day|dusk|night|late
   picks one at load. The sky travels there round the clock rather than
   jumping. Panels, the speech bubble and the navbar sit above it all. */

const livingScene = document.querySelector('.scene');
const skyWash = document.querySelector('.sky-wash');
const skyStars = document.querySelector('.sky-stars');
const skyGalaxy = document.querySelector('.sky-galaxy');
const skyRidges = document.querySelector('.sky-ridges');
const skySun = document.querySelector('.sky-sun');
const sunDisc = document.querySelector('.sky-sun__disc');
const skyMist = document.querySelector('.sky-mist');
const mistBand = document.querySelector('.sky-mist__band');
const worldLights = document.querySelector('.world-lights');
const timePicker = document.querySelector('.time-picker');
const timeScrub = document.querySelector('.time-picker__hour');
const timeClock = document.querySelector('.time-picker__clock');
let lightsTransform = '';

// The sky through the day. At each hour `at`: how strong the wash is and
// its colours top to bottom, how bright the lights and the stars, and how
// thick the mist; between them it blends. The hours standing for the parts
// of the day (PART_HOURS: 6, 12, 19, 23) are each at its most: dawn cool
// at the top and gold at the floor, dusk purple over orange, and night a
// deep blue, kept light enough at the floor for his ink to read.
const NIGHT_SKY = { wash: 0.78, lights: 1, stars: 1, mist: 0, top: '#0b1a58', mid: '#1d3584', low: '#4666b4' };
const SKY_KEYS = [
  { at: 0, ...NIGHT_SKY },
  { at: 4.4, ...NIGHT_SKY },
  { at: 5.2, wash: 0.5, lights: 0.8, stars: 0.5, mist: 0.7, top: '#23357a', mid: '#7c7caa', low: '#d2a9a0' },
  { at: 6, wash: 0.26, lights: 0.35, stars: 0, mist: 1, top: '#8fa3cc', mid: '#e2b3ae', low: '#f6d19c' },
  { at: 7.5, wash: 0.1, lights: 0, stars: 0, mist: 0.45, top: '#b6c4dc', mid: '#ecd0c0', low: '#f4e0c0' },
  { at: 9, wash: 0, lights: 0, stars: 0, mist: 0, top: '#b6c4dc', mid: '#ecd0c0', low: '#f4e0c0' },
  { at: 15.5, wash: 0, lights: 0, stars: 0, mist: 0, top: '#9c8cb0', mid: '#d8b09a', low: '#eec48e' },
  { at: 17.5, wash: 0.18, lights: 0.45, stars: 0, mist: 0, top: '#6e5c8c', mid: '#c08a88', low: '#e6a878' },
  { at: 19, wash: 0.34, lights: 0.75, stars: 0.35, mist: 0, top: '#4e4775', mid: '#9c7489', low: '#d69d78' },
  { at: 20.4, wash: 0.6, lights: 0.92, stars: 0.75, mist: 0, top: '#17236a', mid: '#3a4588', low: '#8074a0' },
  { at: 21.6, ...NIGHT_SKY },
  { at: 24, ...NIGHT_SKY },
];

const SUN_UP = 5.3; // hours the sun's middle crosses the floor line, rising
const SUN_DOWN = 20.6; // and setting
const MOON_UP = 18.6; // hours the moon comes up at the left of the sky
const MOON_DOWN = 6.9; // and goes down at the right
const MOON_SIZE = 30; // px, as .moon in living.css
const MIST_TILE = 1200; // px before the mist's pattern repeats (living.css)

// The lights someone switches, in the order they come on at dusk: the
// glows of each (data-light), its scenery (data-fixture, if it has any),
// and the hours it comes on and goes off again in the morning. The fire
// and the control room's screens are always on.
const SWITCHED = [
  { id: 'lamp-left', glows: ['lamp-left', 'pool-left'], on: 17.1, off: 8 },
  { id: 'lamp-right', glows: ['lamp-right', 'pool-right'], on: 17.5, off: 7.6 },
  { id: 'lantern', glows: ['lantern'], on: 17.9, off: 7.2 },
  { id: 'shop', glows: ['shop'], on: 18.3, off: 6.7 },
];
const SWITCH_GAP = 280; // ms at least between one light going and the next

const hexRGB = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const SKY_RGB = SKY_KEYS.map((key) => ({ ...key, top: hexRGB(key.top), mid: hexRGB(key.mid), low: hexRGB(key.low) }));
const wrapHour = (hour) => ((hour % 24) + 24) % 24;
const cssRGB = (c) => `rgb(${c.join(', ')})`;

// The sky at `hour`, blended between the keys either side of it.
function skyAt(hour) {
  const h = wrapHour(hour);
  const i = SKY_RGB.findIndex((key) => key.at > h);
  const a = SKY_RGB[i - 1];
  const b = SKY_RGB[i];
  const k = (h - a.at) / (b.at - a.at);
  const blend = (x, y) => x + (y - x) * k;
  const colour = (x, y) => x.map((v, j) => Math.round(blend(v, y[j])));
  return {
    wash: blend(a.wash, b.wash), lights: blend(a.lights, b.lights), stars: blend(a.stars, b.stars), mist: blend(a.mist, b.mist),
    top: colour(a.top, b.top), mid: colour(a.mid, b.mid), low: colour(a.low, b.low),
  };
}

// Whether the top of the sky, washed, is dark enough that the navbar's
// words want to be pale to be read: the paper there, multiplied by the
// wash, against about where pale and dark words read equally well.
function skyIsDark(look) {
  const linear = (v) => (v <= 0.04 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = look.top.map((c) => linear((244 * (1 - look.wash + (look.wash * c) / 255)) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.3;
}

const setStyle = (el, name, value) => {
  if (el && el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
};

// The hour the sky shows (it travels to the one it should: see sweepSky),
// and what it last drew.
const skyClock = { hour: 12, sweep: null, painted: null, placed: '', look: null, minute: -1 };

// Their clock's hour, minutes and all; and the hour the sky is heading
// for, the one picked or that.
function clockHour() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
const skyTarget = () => pickedHour ?? clockHour();

// Sends the sky round the clock to where it should be. Picked, it goes on
// through the day unless that is the long way round (from day to dawn it
// goes back), taking longer the further it goes; from the slider (`quick`)
// it goes the short way at once. With motion reduced, or `instant`, it is
// simply there.
function sweepSky({ quick = false, instant = false } = {}) {
  const ahead = wrapHour(skyTarget() - skyClock.hour);
  const delta = quick ? ((ahead + 12) % 24) - 12 : ahead > 15 ? ahead - 24 : ahead;
  if (instant || livingReduced.matches || Math.abs(delta) < 0.02) {
    skyClock.sweep = null;
    skyClock.hour = skyTarget();
    return;
  }
  const time = quick ? Math.min(0.45, Math.abs(delta) * 0.06) : clamp(Math.abs(delta) * 0.28, 1.1, 3.2);
  skyClock.sweep = { from: skyClock.hour, delta, start: performance.now(), time: time * 1000, ease: quick ? easeOut : easeInOut };
}

// Each frame (livingView): the sky on its way, drawn; the lights switched;
// the mist moved along with the world; the picker's clock on the minute.
function updateSky() {
  const now = performance.now();
  const sweep = skyClock.sweep;
  if (sweep) {
    const k = clamp((now - sweep.start) / sweep.time, 0, 1);
    skyClock.hour = wrapHour(sweep.from + sweep.delta * sweep.ease(k));
    if (k >= 1) skyClock.sweep = null;
  } else {
    skyClock.hour = skyTarget();
  }
  paintSky();
  placeSky();
  updateSwitches(now);
  moveMist(now);
  moveRidges();
  const minute = Math.floor(Date.now() / 60e3);
  if (minute !== skyClock.minute) {
    skyClock.minute = minute;
    updateTimePicker();
  }
}

// The wash, the lights, the stars and the mist at the hour the sky shows;
// its part of the day on the scene (and on the page, for the navbar); and
// whether the navbar's words should be pale.
function paintSky(force = false) {
  const hour = skyClock.hour;
  if (!force && skyClock.painted !== null && Math.abs(hour - skyClock.painted) < 0.003) return;
  skyClock.painted = hour;
  const look = skyAt(hour);
  skyClock.look = look;
  setStyle(skyWash, '--wash', look.wash.toFixed(3));
  setStyle(skyWash, '--wash-top', cssRGB(look.top));
  setStyle(skyWash, '--wash-mid', cssRGB(look.mid));
  setStyle(skyWash, '--wash-low', cssRGB(look.low));
  setStyle(worldLights, '--lights', look.lights.toFixed(3));
  setStyle(skyStars, '--stars', look.stars.toFixed(3));
  setStyle(skyGalaxy, '--stars', look.stars.toFixed(3));
  starsOut();
  setStyle(skyMist, '--mist', look.mist.toFixed(3));
  if (skyMist) skyMist.hidden = look.mist < 0.005;
  const part = livingDaypartName(hour);
  if (livingScene.dataset.daypart !== part) {
    livingScene.dataset.daypart = part;
    document.documentElement.dataset.daypart = part;
  }
  const tone = skyIsDark(look) ? 'dark' : 'light';
  if (document.documentElement.dataset.sky !== tone) document.documentElement.dataset.sky = tone;
}

// Where the sun and the moon are at the hour the sky shows. The sun goes
// from the left to the right of the screen, highest at midday, in a box
// that ends at the floor line, so it rises and sets behind it; low, it is
// bigger and redder. The moon goes over the night in the band of sky just
// under the navbar, fading in and out at the ends.
function placeSky() {
  const horizon = floorY + view.rise;
  const key = `${skyClock.painted}|${sceneWidth}|${sceneHeight}|${horizon}|${navHeight}|${view.unit}`;
  if (key === skyClock.placed) return;
  skyClock.placed = key;
  const hour = wrapHour(skyClock.painted);
  if (skySun && sunDisc) {
    skySun.style.height = `${Math.max(0, horizon).toFixed(1)}px`;
    const t = (hour - SUN_UP) / (SUN_DOWN - SUN_UP);
    const up = t > -0.1 && t < 1.1;
    skySun.classList.toggle('is-down', !up);
    if (up) {
      const radius = 0.135 * view.unit * UNITS_TALL; // as .sky-sun__disc
      const high = Math.max(navHeight + 2 * radius, sceneHeight * 0.2);
      const low = horizon + radius;
      const height = Math.sin(Math.PI * clamp(t, 0, 1));
      sunDisc.style.translate = `${(sceneWidth * (0.06 + 0.88 * t)).toFixed(1)}px ${(low - (low - high) * height).toFixed(1)}px`;
      setStyle(sunDisc, '--sun-low', ((1 - height) ** 1.2).toFixed(3));
    }
  }
  const moon = skyStars?.querySelector('.moon');
  if (moon) {
    const t = wrapHour(hour - MOON_UP) / wrapHour(MOON_DOWN - MOON_UP);
    const high = navHeight + 12;
    const low = Math.max(high, sceneHeight * 0.22 - MOON_SIZE - 6);
    const y = low - (low - high) * Math.sin(Math.PI * clamp(t, 0, 1));
    moon.style.translate = `${(sceneWidth * (0.05 + 0.88 * clamp(t, 0, 1))).toFixed(1)}px ${y.toFixed(1)}px`;
    moon.style.opacity = t > 1 ? '0' : clamp(Math.min(t, 1 - t) / 0.06, 0, 1).toFixed(3);
  }
  // The stars and the Milky Way wheel slowly through the night, about a
  // point far below the floor: level at midnight, WHEEL degrees an hour.
  const wheelDegrees = WHEEL * (wrapHour(hour + 12) - 12);
  const wheel = `${wheelDegrees.toFixed(2)}deg`;
  const pivot = `${(sceneHeight * 3.5).toFixed(0)}px`;
  for (const el of [skyStars, skyGalaxy]) {
    setStyle(el, '--wheel', wheel);
    setStyle(el, '--pivot-y', pivot);
  }
  // The galaxy is one rotated rectangle, unlike the individually rotating
  // stars. Counter its horizontal drift around the far-below pivot so its
  // clipped edge stays aligned just outside both sides of the viewport.
  const galaxyShift = sceneHeight * (0.21 - 3.5) * Math.sin(wheelDegrees * Math.PI / 180);
  setStyle(skyGalaxy, '--wheel-shift', `${galaxyShift.toFixed(1)}px`);
}

// The mist drifts slowly, and moves a little slower than the world as he
// walks, parting round him.
function moveMist(now) {
  if (!skyMist || skyMist.hidden) return;
  const drift = (((view.renderX * 0.85 + now * 0.012) % MIST_TILE) + MIST_TILE) % MIST_TILE;
  const shift = `translate3d(${(-drift).toFixed(1)}px, 0, 0)`;
  if (mistBand && mistBand.style.transform !== shift) mistBand.style.transform = shift;
  const floor = `0 calc(${(floorY + view.rise).toFixed(1)}px - 75%)`;
  if (skyMist.style.translate !== floor) skyMist.style.translate = floor;
  setStyle(skyMist, '--gap-x', `${screenX(state.x).toFixed(0)}px`);
}

// The lights switched by the hour: which are on, and which are waiting
// their turn to change.
const lamps = { lit: {}, queue: [], nextAt: 0 };
const litAt = (light, hour) => hour >= light.on || hour < light.off;

// Switches `light` on or off, its glows and its scenery; with `flick`, it
// clicks (heard only if it is on screen) and catches with a flicker.
function switchLight(light, on, flick) {
  lamps.lit[light.id] = on;
  const glows = light.glows.map((id) => worldLights?.querySelector(`[data-light="${id}"]`));
  for (const el of [...glows, document.querySelector(`[data-fixture="${light.id}"]`)]) {
    if (!el) continue;
    el.classList.toggle('is-dark', !on);
    el.classList.remove('is-lighting');
    if (flick && on) {
      el.getBoundingClientRect(); // so the flicker starts again
      el.classList.add('is-lighting');
      el.addEventListener('animationend', () => el.classList.remove('is-lighting'), { once: true });
    }
  }
  const box = flick && glows[0]?.getBoundingClientRect();
  if (box && box.right > 0 && box.left < sceneWidth) noises.flick(on);
}

// Lamps the visitor has switched by clicking them (clickables.js), kept as
// they left them until the hour next switches them itself: by id, how they
// left it, and whether the hour had it lit then.
const lampHolds = {};
function holdLamp(id, on) {
  const light = SWITCHED.find((item) => item.id === id);
  if (!light || on === null) delete lampHolds[id];
  else lampHolds[id] = { on, natural: litAt(light, skyClock.hour) };
}

// Whether `light` should be lit now: as the hour has it, or as they left it.
function lampWanted(light) {
  const natural = litAt(light, skyClock.hour);
  const hold = lampHolds[light.id];
  if (hold && hold.natural !== natural) delete lampHolds[light.id];
  return lampHolds[light.id]?.on ?? natural;
}

// Each frame, the lights that should have changed at the hour the sky
// shows, one at a time; all at once, quietly, when `instant`.
function updateSwitches(now, instant = false) {
  for (const light of SWITCHED) {
    const want = lampWanted(light);
    if (instant) switchLight(light, want, false);
    else if (lamps.lit[light.id] !== want && !lamps.queue.includes(light)) lamps.queue.push(light);
  }
  if (instant) lamps.queue.length = 0;
  if (!lamps.queue.length || now < lamps.nextAt) return;
  const light = lamps.queue.shift();
  const want = lampWanted(light);
  if (lamps.lit[light.id] === want) return;
  switchLight(light, want, true);
  lamps.nextAt = now + SWITCH_GAP;
}

/* The picker, top left of the navbar: a part of the day, pressed, shows
   the world at it; its slider, under it on hover or focus, any hour. */

const DAYPARTS = ['dawn', 'day', 'dusk', 'night'];

// The part of the day it really is for the visitor, whatever they picked;
// and the part the world is heading for.
const clockDaypart = () => livingDaypartName(new Date().getHours());
const shownPart = () => livingDaypartName(skyTarget());

// An hour (0-24) as a clock shows it: 06:30.
function clockText(hour) {
  const minutes = Math.round(wrapHour(hour) * 60) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// The part of the day the world is heading for, pressed; a dot on the part
// it really is; the slider on the hour, and its clock saying "now" while
// the world goes by theirs.
function updateTimePicker() {
  if (!timePicker) return;
  const target = skyTarget();
  const part = livingDaypartName(target);
  const now = clockDaypart();
  for (const button of timePicker.querySelectorAll('[data-time]')) {
    const time = button.dataset.time;
    button.setAttribute('aria-pressed', String(time === part));
    button.classList.toggle('is-now', time === now);
    button.title = `${button.getAttribute('aria-label')}${time === now ? ' (your time now)' : ''} · T steps through`;
  }
  const live = pickedHour === null;
  if (timeScrub) {
    const value = Math.round(target * 4) / 4;
    if (Number(timeScrub.value) !== value) timeScrub.value = String(value);
    timeScrub.setAttribute('aria-valuetext', `${clockText(target)}, ${part}${live ? ', your time now' : ''}`);
  }
  if (timeClock) timeClock.textContent = live ? 'now' : clockText(target);
  timePicker.classList.toggle('is-live', live);
}

// Shows the world at `hour` (0-24), or by their clock again for null; see
// sweepSky for `quick` and `instant`.
function pickHour(hour, options = {}) {
  pickedHour = hour;
  sweepSky(options);
  if (options.instant) updateSwitches(performance.now(), true);
  updateTimePicker();
}

// Shows the world at `part` of the day. Picking the part it really is goes
// back to their clock, so it carries on changing with the hour.
function pickTime(part, options) {
  pickHour(part === clockDaypart() ? null : PART_HOURS[part], options);
}

// Sent into the night, he yawns; into the morning, he stretches. Only while
// he is standing about with nothing else on (the click has already stopped
// anything he was doing by himself, and he may still be getting up).
function greetTime(part) {
  const make = { night: yawnAct, dawn: stretchAct }[part];
  if (!make || livingReduced.matches || !isFree() || ambient.act || ambient.out || incidentBusy()) return;
  idle.last = part === 'night' ? 'yawn' : 'stretch';
  startAct(make());
}

// On to the next part of the day (T, or the folded picker).
function stepTime() {
  const before = shownPart();
  pickTime(DAYPARTS[(DAYPARTS.indexOf(before) + 1) % DAYPARTS.length]);
  if (shownPart() !== before) greetTime(shownPart());
}

// A part of the day, pressed. On a phone at a stop the picker folds down
// to just the part showing (living.css), and that steps the time on.
timePicker?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-time]');
  if (!button) return;
  if ([...timePicker.querySelectorAll('[data-time]')].some((b) => !b.getClientRects().length)) {
    stepTime();
    return;
  }
  const before = shownPart();
  pickTime(button.dataset.time);
  if (shownPart() !== before) greetTime(shownPart());
});

// The slider: the world follows it, and once let go, if it is another part
// of the day than when they took hold of it, he reacts to that.
let scrubFrom = null;
timeScrub?.addEventListener('input', () => {
  scrubFrom ??= shownPart();
  pickHour(Number(timeScrub.value), { quick: true });
});
timeScrub?.addEventListener('change', () => {
  if (scrubFrom && shownPart() !== scrubFrom) greetTime(shownPart());
  scrubFrom = null;
});

// T steps through the parts of the day, once the picker is up, but not at
// the terminal, where letters are for its prompt.
window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyT' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if (termInput && openPanelId === skillsScene && term.booted) return;
  if (!timePicker || document.querySelector('.sound-toggle.is-waiting')) return;
  stepTime();
});

// A glow at (x, y) units from `anchor` world px, `size` units across,
// placed the way worldSet() places scenery so it keeps up with resizes.
// `id` names it (data-light) for whatever turns it off and on.
function glowAt(anchor, x, y, size, kind, { style = '', id = '' } = {}) {
  return `<span class="glow glow--${kind}"${id ? ` data-light="${id}"` : ''} style="left: calc(${anchor}px + var(--fig-h) * ${(x / 242).toFixed(4)}); `
    + `top: calc(var(--fig-h) * ${(-y / 242).toFixed(4)}); --size: ${(size / 242).toFixed(4)};${style}"></span>`;
}

// The lights, where buildStart, buildCamp, buildShop and buildOps put the
// things that give them off; and fireflies round the camp.
function buildLights() {
  if (!worldLights) return;
  const out = [];
  for (const x of [-STATUE.width - 580, 110]) {
    const side = x > 0 ? 'right' : 'left';
    out.push(glowAt(nameEnd, x + 30, 300, 230, 'lamp', { id: `lamp-${side}` }));
    out.push(glowAt(nameEnd, x + 30, 0, 330, 'pool', { id: `pool-${side}` }));
  }
  out.push(glowAt(campX, -140, 172, 190, 'lamp', { id: 'lantern' }));
  out.push(glowAt(campX, 174, 60, 900, 'fire'));
  out.push(glowAt(benchX, 125, 300, 460, 'shop', { id: 'shop' }));
  out.push(glowAt(skillsX, -47, 286, 210, 'screen'));
  out.push(glowAt(skillsX, 426, 170, 380, 'screen', { id: 'racks' }));
  for (let i = 0; i < 9; i += 1) {
    const x = -520 + i * 125 + 60 * wobble(i * 2.1);
    const y = 50 + 170 * (wobble(i * 4.7) + 0.5);
    out.push(glowAt(campX, x, y, 9, 'firefly', {
      style: ` --d: ${(3.2 + 2.4 * (wobble(i * 1.3) + 0.5)).toFixed(2)}s; --delay: -${(i * 0.83).toFixed(2)}s;`
        + ` --dx: ${Math.round(40 * wobble(i * 9.1))}px; --dy: ${Math.round(-18 - 26 * (wobble(i * 3.3) + 0.5))}px;`,
    }));
  }
  worldLights.innerHTML = out.join('');
}

// How far through its month the moon is tonight, by the visitor's date:
// 0 new, 0.5 full (from a known new moon, and the length of a lunar
// month). A time picked on the picker changes the hour, not the night.
function moonPhase(at = Date.now()) {
  const days = (at - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return (((days / 29.530588853) % 1) + 1) % 1;
}

// The lit part of a moon `r` across the middle of a 30 unit box, `phase`
// through its month: lit on the right while it waxes, the left as it wanes.
function moonLit(phase, r = 14.5) {
  const k = Math.cos(2 * Math.PI * phase);
  const rx = Math.max(0.01, r * Math.abs(k)).toFixed(2);
  const [top, bottom] = [`15 ${(15 - r).toFixed(2)}`, `15 ${(15 + r).toFixed(2)}`];
  return phase < 0.5
    ? `M${top}A${r} ${r} 0 0 1 ${bottom}A${rx} ${r} 0 0 ${k > 0 ? 0 : 1} ${top}Z`
    : `M${top}A${r} ${r} 0 0 0 ${bottom}A${rx} ${r} 0 0 ${k > 0 ? 1 : 0} ${top}Z`;
}

const WHEEL = 0.45; // degrees an hour the stars turn through the night

// Stars at fixed places in the top of the sky (spread wider than the
// screen, so turning never leaves a gap), one of them a planet that
// doesn't twinkle, and a moon in tonight's phase.
function buildStars() {
  const sky = skyStars;
  if (!sky) return;
  const phase = moonPhase();
  const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  sky.style.setProperty('--moon-lit', lit.toFixed(3));
  const out = [`<span class="moon" data-phase="${phase.toFixed(3)}"><svg viewBox="0 0 30 30">`
    + `<circle class="moon__dark" cx="15" cy="15" r="14.5" /><path class="moon__lit" d="${moonLit(phase)}" /></svg></span>`];
  for (let i = 0; i < 58; i += 1) {
    const x = -15 + (wobble(i * 3.7) + 0.5) * 130;
    const y = (wobble(i * 5.3) + 0.5) * 100;
    const size = 1 + 1.6 * (wobble(i * 8.9) + 0.5);
    out.push(`<i style="--x: ${x.toFixed(2)}; --y: ${y.toFixed(2)}; --s: ${size.toFixed(2)}px; --d: ${(2 + 3 * (wobble(i * 2.9) + 0.5)).toFixed(2)}s; --delay: -${(i * 0.37).toFixed(2)}s"></i>`);
  }
  out.push('<i class="is-planet" style="--x: 63; --y: 38; --s: 3.4px"></i>');
  sky.innerHTML = out.join('');
  buildGalaxy();
}

// The Milky Way: a soft band from low on the left to high on the right,
// dusted with faint stars thickest along its middle, with a dark lane
// through it.
function buildGalaxy() {
  if (!skyGalaxy) return;
  const along = (x) => 360 - 300 * ((x + 100) / 1800);
  const dots = [];
  for (let i = 0; i < 320; i += 1) {
    const x = -100 + 1800 * (wobble(i * 1.73) + 0.5);
    const across = (wobble(i * 3.11) + wobble(i * 5.37) + wobble(i * 7.91)) * 80;
    if (Math.abs(across - 10 * Math.sin(x / 90)) < 7) continue; // the dust lane
    const r = 0.5 + 0.9 * (wobble(i * 9.3) + 0.5);
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${(along(x) + across).toFixed(1)}" r="${r.toFixed(2)}" opacity="${(0.45 + 0.5 * (wobble(i * 2.2) + 0.5)).toFixed(2)}" />`);
  }
  const band = (width) => `M-100 ${along(-100) - width}L1700 ${along(1700) - width}L1700 ${along(1700) + width}L-100 ${along(-100) + width}Z`;
  skyGalaxy.innerHTML = `<svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMid slice">`
    + '<defs><filter id="galaxy-soft" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="26" /></filter></defs>'
    + `<path class="sky-galaxy__glow" d="${band(70)}" filter="url(#galaxy-soft)" /><path class="sky-galaxy__core" d="${band(26)}" filter="url(#galaxy-soft)" />`
    + `<g class="sky-galaxy__dust">${dots.join('')}</g></svg>`;
}

/* The ridges: three hill lines behind the world, the furthest palest and
   slowest, so the world has depth. Each is a strip of SVG a little longer
   than the screen whose outline repeats every `tile` px, moved at `k` of
   the camera's speed, the way the mist is. Drawn under the wash, so the
   time of day tints them as it does the scenery. */
const RIDGES = [
  // of the camera's speed, how long before it repeats (units), its paper,
  // how high it sits and swells (units above the floor), a seed, and how
  // many small trees stand on it
  { k: 0.12, tile: 3200, fill: '#ece9e2', base: 300, swell: 110, seed: 1, trees: 0 },
  { k: 0.24, tile: 2600, fill: '#e3e0d8', base: 190, swell: 80, seed: 2, trees: 5 },
  { k: 0.42, tile: 2000, fill: '#dad6cd', base: 105, swell: 55, seed: 3, trees: 9 },
];
const ridges = { built: '', els: [], shown: [] };

// Where a ridge's top is, `x` px along a repeat `tile` px long, in px above
// the floor: a few sines that each fit the repeat, so it joins up.
function ridgeHeight(ridge, x, tile, unit) {
  const a = (2 * Math.PI * x) / tile;
  const s = ridge.seed;
  return unit * (ridge.base + ridge.swell * (0.55 * Math.sin(2 * a + s) + 0.3 * Math.sin(5 * a + 3 * s) + 0.15 * Math.sin(11 * a + 7 * s)));
}

function buildRidges() {
  const unit = view.unit;
  const key = `${unit.toFixed(4)}|${sceneWidth}`;
  if (!skyRidges || !sceneWidth || key === ridges.built) return;
  ridges.built = key;
  ridges.els = RIDGES.map((ridge) => {
    // At least as long as the screen, so one repeat always covers it.
    const tile = Math.max(ridge.tile * unit, sceneWidth + 120);
    const width = tile + sceneWidth + 40;
    const top = (ridge.base + ridge.swell + 40) * unit;
    let d = `M0 ${top.toFixed(1)}`;
    for (let x = 0; x <= width; x += 12) d += `L${x} ${(top - ridgeHeight(ridge, x, tile, unit)).toFixed(1)}`;
    d += `L${width} ${top.toFixed(1)}Z`;
    // Small pines along the nearer ridges' tops, repeating with them.
    let trees = '';
    for (let i = 0; i < ridge.trees; i += 1) {
      const x0 = (wobble(ridge.seed * 17 + i * 3.1) + 0.5) * tile;
      const h = (16 + 10 * (wobble(i * 7.3 + ridge.seed) + 0.5)) * unit * (ridge.k * 2.2);
      for (const x of [x0, x0 + tile]) {
        if (x > width) continue;
        const y = top - ridgeHeight(ridge, x, tile, unit) + 2;
        trees += `M${(x - h * 0.28).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y - h).toFixed(1)}L${(x + h * 0.28).toFixed(1)} ${y.toFixed(1)}Z`;
      }
    }
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'sky-ridge');
    svg.setAttribute('viewBox', `0 0 ${width.toFixed(0)} ${top.toFixed(0)}`);
    svg.setAttribute('width', width.toFixed(0));
    svg.setAttribute('height', top.toFixed(0));
    svg.innerHTML = `<path class="sky-ridge__hill" style="fill: ${ridge.fill}" d="${d}" />${trees ? `<path class="sky-ridge__trees" style="fill: ${ridge.fill}" d="${trees}" />` : ''}`;
    return { ridge, svg, tile, top };
  });
  skyRidges.replaceChildren(...ridges.els.map((r) => r.svg));
  ridges.shown = [];
}

// Each frame, after the world has moved: each ridge slid along at its
// fraction of the camera's speed, its foot on the floor line.
function moveRidges() {
  buildRidges();
  const floor = floorY + view.rise;
  ridges.els.forEach(({ ridge, svg, tile, top }, i) => {
    const along = view.renderX * ridge.k - view.shift * ridge.k;
    const x = -((((along % tile) + tile) % tile) + 20);
    const shown = `translate3d(${x.toFixed(1)}px, ${(floor - top + 1).toFixed(1)}px, 0)`;
    if (ridges.shown[i] === shown) return;
    ridges.shown[i] = shown;
    svg.style.transform = shown;
  });
}

// Up after midnight, the first time he is standing about, he says so; once
// a night.
function updateLateNight() {
  const hour = livingHour();
  if (hour >= 5 || idle.quiet < 4 || ambient.act || !canSpeak()) return;
  const tonight = new Date().toDateString();
  if (memory.data.lateNightOn === tonight) return;
  memory.data.lateNightOn = tonight;
  memory.save();
  remark('<span>You&rsquo;re up late too?</span>', 2600);
}

/* ------------------------------------------------- the sounds of the day
   With sound on, the world sounds of the hour the sky shows: birds off in
   the trees by day, a chorus of them at dawn; crickets at night; and the
   fire louder in the dark (script.js asks fireLoudness). */

const chorus = { birdsAt: 0, cricketsAt: 0, hush: 1 }; // hush: how loud the crickets are let be

// How many birds are singing at `hour`, 0 to 1: all of them at dawn, a few
// through the day, none at night.
function birdsong(hour) {
  if (hour < 4.8 || hour > 19.8) return 0;
  if (hour < 5.6) return (hour - 4.8) / 0.8;
  if (hour < 8.5) return 1;
  if (hour < 10) return 1 - (0.65 * (hour - 8.5)) / 1.5;
  if (hour < 18.5) return 0.35;
  return (0.35 * (19.8 - hour)) / 1.3;
}

// How loud the crickets are at `hour`, 0 to 1: from late dusk till dawn.
function crickets(hour) {
  if (hour >= 21 || hour < 4.5) return 1;
  if (hour >= 19.6) return (hour - 19.6) / 1.4;
  if (hour < 5.4) return (5.4 - hour) / 0.9;
  return 0;
}

// A bird somewhere off in the trees: a few quick notes, going up or down.
function birdPhrase() {
  const base = 2500 + Math.random() * 1600;
  const notes = 2 + Math.floor(Math.random() * 4);
  const rising = Math.random() < 0.5;
  let at = 0;
  for (let i = 0; i < notes; i += 1) {
    const freq = base * (rising ? 1 + 0.07 * i : 1.25 - 0.07 * i) * (0.96 + Math.random() * 0.08);
    sfx.tone(freq, { to: freq * (Math.random() < 0.5 ? 1.2 : 0.85), vol: 0.008 + Math.random() * 0.008, dur: 0.05 + Math.random() * 0.06, at, attack: 0.008 });
    at += 0.08 + Math.random() * 0.06;
  }
}

// A cricket: three quick pulses.
function cricketChirp(pitch, vol) {
  for (let i = 0; i < 3; i += 1) sfx.tone(pitch, { vol, dur: 0.028, at: i * 0.052, attack: 0.004 });
}

// Each frame (livingView): crossfade natural birds and crickets with the sky.
function updateChorus() {
  const hour = wrapHour(skyClock.hour);
  const birds = birdsong(hour);
  const night = crickets(hour);
  sfx.ambient?.('birdsAmbience', 0.3 * birds);
  sfx.ambient?.('nightAmbience', 0.2 * night * chorus.hush);
}

// How much louder the fire is at the hour the sky shows: half as loud
// again in the dark.
function fireLoudness() {
  return 1 + 0.5 * (skyClock.look?.lights ?? 0);
}

/* ------------------------------------------------------ back to the tab
   Leave the tab a while and come back, and he has nodded off sitting on the
   floor; he jolts awake and says hello. The sound stops while the tab is
   hidden (the fire's crackle would go on otherwise). */

const away = { at: 0, pending: 0, suspended: false };

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    away.at = performance.now();
    if (sfx.ctx && sfx.ctx.state === 'running') {
      sfx.ctx.suspend().catch(() => {});
      away.suspended = true;
    }
    return;
  }
  if (away.suspended) {
    away.suspended = false;
    sfx.ctx?.resume().catch(() => {});
  }
  if (away.at) away.pending = performance.now() - away.at;
});

// Asleep sitting on the floor, slumped forward; a jolt awake, a word, and
// up again. `awayMs` picks the word.
function dozeAct(awayMs) {
  const line = awayMs < 120e3 ? '<span>Oh! You&rsquo;re back.</span>'
    : awayMs < 1800e3 ? '<span>Oh hey,</span><span>welcome back.</span>'
      : '<span>Oh! Hello again.</span><span>I kept the fire going.</span>';
  const duration = 4.8;
  let said = 0;
  return {
    kind: 'doze',
    duration,
    pin: true,
    outTime: 0.6,
    pose(base, act) {
      const t = act.t;
      if (said === 0 && t > 0.1) {
        said = 1;
        speak('<span>zzz&hellip;</span>');
      }
      if (said === 1 && t >= 1.6) {
        said = 2;
        sfx.tap(0.7);
        sfx.tone(520, { to: 820, vol: 0.05, dur: 0.12 });
      }
      if (said === 2 && t >= 2) {
        said = 3;
        remark(line, 2100);
      }
      const lean = t < 1.6 ? 30 + 2 * Math.sin(t * 2.2)
        : t < 1.9 ? mix(30, -12, ease((t - 1.6) / 0.3))
          : mix(-12, 8, ease(clamp((t - 1.9) / 0.6, 0, 1)));
      let p = floorSitPose(base, lean);
      // Hands in his lap asleep; flung out as he jolts.
      const lap = lapAt(p);
      const jolt = Math.sin(Math.PI * clamp((t - 1.6) / 0.5, 0, 1));
      Object.assign(p.near, armReach(p.lean, lap.x + 14 + 10 * jolt, lap.y - 4 - 30 * jolt));
      Object.assign(p.far, armReach(p.lean, lap.x + 4 - 12 * jolt, lap.y - 2 - 26 * jolt));
      p.spin = 3 * jolt * Math.sin((t - 1.6) * 34);
      // Up again at the end, as he gets up in the opening.
      if (t > duration - 1.1) {
        const s = clamp((t - (duration - 1.1)) / 1.1, 0, 1);
        p = s < 0.5 ? mixPose(p, crouchPose(base, 40), ease(s / 0.5)) : mixPose(crouchPose(base, 40), base, ease((s - 0.5) / 0.5));
      }
      return p;
    },
  };
}

function updateAway() {
  if (!away.pending) return;
  const gone = away.pending;
  away.pending = 0;
  if (gone < 20e3 || !isFree() || ambient.act || intro.active) return;
  if (livingReduced.matches) {
    if (canSpeak()) remark('<span>Oh, welcome back.</span>', 2200);
    return;
  }
  startAct(dozeAct(gone));
}

/* ------------------------------------------------------ the typed terminal
   The Skills console takes commands typed at its prompt as well as clicks;
   `help` lists them. What comes back goes through the terminal's own queue
   (script.js: termRun, termWait), a line at a time. Whatever the visitor
   types goes on screen as text, never as markup. Once they start typing,
   the glass scrolls like a real terminal, oldest lines off the top. */

// Contact details for `cat contact.txt` and `ping naeem`, shown as typed
// here; empty ones are left out.
const CONTACT = {
  email: 'naeembrown544@gmail.com',
  linkedin: 'linkedin.com/in/naeembrown544',
  github: 'github.com/NaeemBrown',
};

const termInput = document.querySelector('.term-input');
const termInputLine = document.querySelector('.term-line--input');
const termPrintEl = document.querySelector('.term-print');
const termScrollEl = document.querySelector('.term-scroll');
const livingTyping = { until: 0 }; // his hands pat the keys till then (script.js, runTerminal)
const termState = {
  shell: false, // they have typed, so the glass keeps its last line in view
  history: [],
  historyAt: 0,
  forgetAsked: false,
  restored: false, // back from `rm -rf /`, to say so once the screen is up
};

// Keeps the latest line in view once they are typing.
function termScrollDown() {
  if (termState.shell && termScrollEl) termScrollEl.scrollTop = termScrollEl.scrollHeight;
}
if (termScrollEl) {
  new MutationObserver(termScrollDown).observe(termScrollEl, {
    subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'],
  });
}

// A line on the screen, now. `kind` styles it: out, dim, err, or cmd for the
// visitor's own command after their prompt.
function termLine(text, kind = 'out') {
  const p = document.createElement('p');
  p.className = `term-line term-line--${kind}`;
  if (kind === 'cmd') {
    const prompt = document.createElement('span');
    prompt.className = 'term-prompt';
    const user = document.createElement('span');
    user.className = 'term-user';
    user.textContent = 'guest@infra:';
    prompt.append(user, '~$');
    p.append(prompt, ` ${text}`);
  } else {
    p.textContent = text;
  }
  termPrintEl.append(p);
  while (termPrintEl.childElementCount > 60) termPrintEl.firstElementChild.remove();
  termScrollDown();
}

// Queues ops for a command, marked so the next command can finish them off.
function termCmd(push, arg) {
  push(arg);
  term.ops[term.ops.length - 1].cmd = true;
}
const termLater = (fn) => termCmd(termRun, fn);
const termPause = (s) => termCmd(termWait, s);

// Queues lines to print `gap` seconds apart; each is text, or [text, kind].
function termSay(lines, { gap = 0.035, kind = 'out' } = {}) {
  for (const line of [].concat(lines)) {
    const [text, k] = Array.isArray(line) ? line : [line, kind];
    termLater(() => termLine(text, k));
    termPause(gap);
  }
}

// Whatever an earlier command still had queued, done at once.
function termFlush() {
  const rest = [];
  for (const op of term.ops) {
    if (!op.cmd) rest.push(op);
    else if (op.kind === 'run') op.fn();
  }
  term.ops = rest;
}

// "4 min 12 s", "1 h 3 min", "12 s".
function termDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}
const termClock = (at) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// How far he has walked this visit, in rig units (livingView), and a running
// average of how hard the page is working, for `uptime`'s load average.
const livingStats = { walked: 0, lastX: null, load: [1, 1, 1] };
const metresWalked = () => Math.round((livingStats.walked * 1.8) / UNITS_TALL);

// The files `ls` and `cat` know, and the places `cd` goes.
const TERM_FILES = ['about.txt', 'projects/', 'experience.log', 'skills/', 'contact.txt', 'resume.txt'];
const TERM_PLACES = { about: 'about', 'about.txt': 'about', projects: 'projects', experience: 'experience', 'experience.log': 'experience', work: 'experience', skills: 'skills' };

function contactLines() {
  return [
    CONTACT.email && `email:    ${CONTACT.email}`,
    CONTACT.linkedin && `linkedin: ${CONTACT.linkedin}`,
    CONTACT.github && `github:   ${CONTACT.github}`,
  ].filter(Boolean);
}

// He shakes his head at the screen.
function headShakeAct() {
  const duration = 1.3;
  return {
    kind: 'shake',
    duration,
    pose(base, act) {
      const p = clonePose(base);
      const k = Math.sin(Math.PI * clamp(act.t / duration, 0, 1));
      p.lean += 3.5 * k * Math.sin(act.t * 2 * Math.PI * 2.4);
      return p;
    },
  };
}

// He lifts a fist off the keys and brings it down on the desk.
function thumpDeskAct(onImpact) {
  return keyframeAct('thump', 1, [
    { at: 0 },
    { at: 0.4, lean: -4, near: { hand: [100, 66] } },
    { at: 0.52, lean: 18, near: { hand: [120, 128] } },
    { at: 0.7, lean: 16, near: { hand: [118, 126] } },
    { at: 1 },
  ], { beats: { 0.52: onImpact } });
}

// `rm -rf /`: the screen's lines fall off the bottom of the glass, it goes
// dark, he thumps the desk, and it boots again from backup.
function crashTerminal() {
  ['/world/campfire', '/world/workshop', '/world/line', '/world/name', '/home/naeem'].forEach((place) => {
    termLater(() => termLine(`removed '${place}'`, 'dim'));
    termPause(0.13);
  });
  termLater(() => {
    [...termScrollEl.children].forEach((el, i) => {
      el.style.setProperty('--i', i);
      el.style.setProperty('--r', `${(wobble(i * 7.3) * 16).toFixed(1)}deg`);
    });
    termScreen.classList.add('is-crashing');
    sfx.whoosh(0.9, 0, false);
  });
  termPause(1.3);
  termLater(() => termScreen.classList.add('is-dead'));
  termPause(0.6);
  termLater(() => startAct(thumpDeskAct(() => {
    sfx.thunk();
    document.querySelectorAll('.term-panel, .term-cam, .term-figure').forEach((el) => {
      el.classList.remove('is-thumped');
      void el.offsetWidth;
      el.classList.add('is-thumped');
    });
  })));
  termPause(1.1);
  termLater(() => {
    termScreen.classList.remove('is-crashing', 'is-dead');
    [...termScrollEl.children].forEach((el) => el.style.removeProperty('--i'));
    termState.restored = true;
    bootTerminal();
  });
}

const TERM_COMMANDS = {
  help: (args) => {
    const target = (args[0] || '').toLowerCase();
    const manuals = {
      whoami: 'whoami: shows current guest session, timezone, visit tally, and walking distance',
      uptime: 'uptime: displays session duration and system load average',
      date: 'date: prints the current system date and time',
      time: 'time [dusk|night|dawn|hh:mm|now]: alters the world time of day and lighting',
      ls: 'ls [dir]: lists files in current directory or folders (projects, skills)',
      cat: 'cat <file>: displays file content (about.txt, contact.txt, experience.log, resume.txt)',
      cd: 'cd <place|..>: walks the stickman to about, projects, experience, or skills (or walks away)',
      tree: 'tree: visual directory hierarchy of the portfolio',
      skills: 'skills [show <1-5|slug>]: lists or selects skill categories on the monitor',
      projects: 'projects: lists the featured projects',
      experience: 'experience: displays career milestones and work history',
      resume: 'resume: summarizes professional background, roles, and technical domains',
      contact: 'contact: outputs contact email and LinkedIn profiles',
      ping: 'ping <host>: sends ICMP echo packets (try "ping naeem")',
      neofetch: 'neofetch: draws ASCII stickman art with system and portfolio specs',
      incidents: 'incidents: logs security alerts and sudo violations (alias: journalctl)',
      found: 'found: lists the things out in the world you have clicked, and how many are left (also ls found)',
      wishes: 'wishes: counts the wishes made on shooting stars',
      top: 'top: simulated live process monitor (alias: htop, ps)',
      uname: 'uname: prints operating system and kernel version',
      pwd: 'pwd: prints current working directory',
      df: 'df: displays file system disk space usage',
      free: 'free: displays physical memory and swap utilization',
      hostname: 'hostname: prints system network node hostname',
      id: 'id: prints guest user and group identity numbers',
      weather: 'weather: checks atmospheric sky conditions and temperature along the line',
      matrix: 'matrix: triggers a green digital stream easter egg',
      sudo: 'sudo <command>: attempts superuser privilege escalation (caution: reported!)',
      rm: 'rm -rf /: self-destruct sequence with desk slam and backup restore',
      coffee: 'coffee: brews a warm mug of fresh coffee beside the keyboard',
      vim: 'vim: text editor simulation (:q to escape)',
      history: 'history: numbered log of commands typed in this session',
      clear: 'clear: clears output buffer on the CRT screen',
      reboot: 'reboot: restarts and reboots the terminal console (alias: restart, reset)',
      exit: 'exit: logs out of the terminal so you can freely walk the world',
      forget: 'forget [--yes]: resets saved visits, tallies, and roasted marshmallows',
      replay: 'replay [intro]: rewinds to the very beginning and re-carves the intro',
    };
    if (target && manuals[target]) {
      return termSay([manuals[target], ['type "help" to see all commands', 'dim']]);
    }
    return termSay([
      'all available commands:',
      '  navigation:   cd  ls  cat  tree  projects  experience',
      '  profile:      whoami  neofetch  resume  contact  ping',
      '  system:       uptime  date  time  top  uname  pwd  history',
      '  diagnostics:  df  free  hostname  id  incidents',
      '  the world:    found  wishes',
      '  terminal:     clear  reboot  exit  forget  replay',
      '  easter eggs:  sudo  rm  coffee  weather  matrix  vim  nano',
      ['e.g. cat about.txt · ping naeem · time dusk · sudo · coffee', 'dim'],
      ['type "help <cmd>" for info · esc then ← → to walk away', 'dim'],
    ]);
  },

  whoami: () => {
    let zone = 'somewhere';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || zone; } catch { /* old browser */ }
    const visit = memory.data.visits;
    termSay([
      `guest (${zone})`,
      `${visit > 1 ? `visit ${visit}` : 'first visit'} · you've walked ${metresWalked()} m with me`,
    ]);
  },

  uptime: () => {
    const [a, b, c] = livingStats.load.map((v) => v.toFixed(2));
    const first = new Date(memory.data.firstAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    termSay([
      `up ${termDuration(performance.now())}, 1 user, load average: ${a}, ${b}, ${c}`,
      [`visit ${memory.data.visits} · first came by ${first}`, 'dim'],
    ]);
  },

  date: () => termSay(new Date().toString().replace(/\s*\(.*\)$/, '')),

  // The hour the world shows, or another one: a part of the day, a time,
  // or `now` for the visitor's own clock again.
  time: (args) => {
    const arg = (args[0] || '').toLowerCase();
    const usage = ['try time dusk, time 06:30, or time now', 'dim'];
    if (!arg) {
      const target = skyTarget();
      return termSay([`the world: ${clockText(target)} (${livingDaypartName(target)})${pickedHour === null ? ', your time' : ''}`, usage]);
    }
    const named = { ...PART_HOURS, sunrise: 6, morning: 7.5, noon: 12, midday: 12, afternoon: 15, sunset: 19, evening: 19.5, midnight: 0 };
    delete named.late;
    const [, hh, mm] = arg.match(/^(\d{1,2})(?::(\d{2}))?$/) || [];
    let hour;
    if (arg === 'now' || arg === 'reset') hour = null;
    else if (Object.hasOwn(named, arg)) hour = named[arg];
    else if (hh !== undefined && Number(hh) < 24 && Number(mm || 0) < 60) hour = Number(hh) + Number(mm || 0) / 60;
    else return termSay([`time: can't read '${args[0]}'`, usage], { kind: 'err' });
    termLater(() => pickHour(hour));
    termSay(hour === null
      ? `back to your clock: ${clockText(clockHour())}`
      : [`the world is at ${clockText(hour)} now (${livingDaypartName(hour)})`, ['step outside to see it', 'dim']]);
  },

  ls: (args) => {
    const where = (args.find((a) => !a.startsWith('-')) || '').replace(/\/$/, '').replace(/^~\//, '');
    if (!where || where === '~' || where === '.') return termSay(['about.txt  projects/  experience.log', 'skills/  contact.txt  resume.txt']);
    if (where === 'projects') return termSay(projectData.map((p, i) => `${String(i + 1).padStart(2, '0')}  ${p.title}`));
    if (where === 'skills') return termSay(skillData.map((s) => s.slug));
    if (TERM_FILES.includes(where)) return termSay(where);
    return termSay(`ls: cannot access '${where}': No such file or directory`, { kind: 'err' });
  },

  cat: (args) => {
    const file = (args[0] || '').replace(/^~\//, '');
    if (!file) return termSay('cat: missing file operand', { kind: 'err' });
    if (file === 'about.txt') {
      const intro = document.querySelector('.about-paper__intro')?.textContent.trim();
      const first = document.querySelector('.about-paper__content section p')?.textContent.trim();
      return termSay([intro, first, ['(cd about for the rest)', 'dim']].filter(Boolean));
    }
    if (file === 'experience.log') {
      return termSay([...CAREER].reverse().map((c) => `${c.dates.padEnd(20)} ${c.title.join(' ')}`));
    }
    if (file === 'contact.txt') {
      const lines = contactLines();
      return termSay(lines.length ? lines : ['coming soon. for now, have a look round!']);
    }
    if (file === 'resume.txt' || file === 'resume') {
      return termSay([
        'Naeem Brown, UX Designer & Web Developer',
        'Experience:',
        '  • Systems Engineer · Pet Plus (2025 - Present)',
        '  • Infrastructure Engineer · Pet Plus (2022 - 2025)',
        '  • Web & UI/UX Developer · Freelance (2020 - Present)',
        'Contact: naeembrown544@gmail.com',
        ['the full CV (PDF) is linked at the foot of the About letter', 'dim'],
      ]);
    }
    if (['projects', 'projects/', 'skills', 'skills/'].includes(file)) return termSay(`cat: ${file.replace(/\/$/, '')}: Is a directory`, { kind: 'err' });
    return termSay(`cat: ${file}: No such file or directory`, { kind: 'err' });
  },

  cd: (args) => {
    const raw = (args[0] || '~').toLowerCase();
    if (['~', '..', '/', '-', '~/'].includes(raw)) {
      termSay('logout');
      termPause(0.3);
      termLater(() => continueJourney(true));
      return;
    }
    const place = TERM_PLACES[raw.replace(/^~\//, '').replace(/\/$/, '')];
    if (!place) return termSay(`cd: no such file or directory: ${args[0]}`, { kind: 'err' });
    if (place === skillsScene) return termSay("you're already here.");
    const button = buttons.find((b) => b.dataset.poi === place);
    termSay(`walking over to ${button.textContent.trim().toLowerCase()}…`);
    termPause(0.5);
    termLater(() => {
      termInput.blur();
      soon(() => goTo(button)); // the terminal runs mid-frame
    });
  },

  skills: (args) => {
    const [sub, which] = args;
    if (sub === 'show' && which) {
      const n = Number(which);
      const index = Number.isInteger(n) && n >= 1 && n <= skillData.length ? n - 1
        : skillData.findIndex((s) => s.slug === which || s.title.toLowerCase().startsWith(which.toLowerCase()));
      if (index < 0) return termSay(`skills: no group called '${which}'. try skills --list`, { kind: 'err' });
      termLater(() => {
        if (term.shown === index) showSkill(index);
        else selectSkill(index);
      });
      return;
    }
    termLater(() => showSkill(term.selected));
  },

  ping: (args) => {
    const host = args[0] || 'naeem';
    if (!/^[\w.-]{1,40}$/.test(host)) return termSay(`ping: ${host}: Name or service not known`, { kind: 'err' });
    termSay(`PING ${host}: 56 data bytes`);
    for (let i = 1; i <= 3; i += 1) {
      termPause(0.45);
      termSay(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${(0.2 + Math.random() * 0.6).toFixed(2)} ms`);
    }
    termSay([[`--- ${host} ping statistics ---`, 'dim'], ['3 packets transmitted, 3 received, 0% packet loss', 'dim']]);
    if (host === 'naeem') {
      const lines = contactLines();
      termSay(lines.length ? ['naeem is up. say hi:', ...lines] : ['naeem is up and listening.']);
    }
  },

  sudo: () => {
    termSay('[sudo] password for guest:');
    termPause(0.9);
    termSay('********', { kind: 'dim' });
    termPause(0.4);
    termSay(['guest is not in the sudoers file.', 'This incident will be reported.'], { kind: 'err' });
    termLater(() => {
      startAct(headShakeAct());
      logIncident('sudo', null);
    });
  },

  rm: (args) => {
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const targets = args.filter((a) => !a.startsWith('-'));
    if (!targets.length) return termSay('rm: missing operand', { kind: 'err' });
    const everything = /r/i.test(flags) && targets.some((t) => ['/', '/*', '*', '~', '~/', '.', './'].includes(t));
    if (!everything) return termSay(`rm: cannot remove '${targets[0]}': Permission denied`, { kind: 'err' });
    if (livingReduced.matches) {
      return termSay([
        "rm: it is dangerous to operate recursively on '/'",
        'rm: use --no-preserve-root to override this failsafe',
      ], { kind: 'err' });
    }
    crashTerminal();
  },

  incidents: () => {
    const list = memory.data.incidents.slice(-6);
    if (!list.length) return termSay('no incidents on record. all systems nominal.');
    termSay(list.map((i) => `${termClock(i.at)}  ${i.id.padEnd(8)} ${i.secs == null ? 'reported' : `fixed in ${i.secs.toFixed(1)} s`}${i.by === 'you' ? ' · broken by you' : ''}`));
    termSay(`${memory.data.fixed} fixed so far`, { kind: 'dim' });
  },

  neofetch: () => {
    const art = ['   O   ', '  /|\\  ', '  / \\  ', '       ', '       ', '       ', '       '];
    const facts = [
      'guest@infra',
      `OS: NB-OS 2.6 · Host: Naeem Brown`,
      'Role: UX Designer & Web Developer',
      `Uptime: ${termDuration(performance.now())}`,
      'Shell: bash · Skills: 5 groups',
      `Theme: ${livingDaypartName()}`,
      `Walked: ${metresWalked()} m`,
    ];
    termSay(facts.map((f, i) => `${art[i]} ${f}`));
  },

  history: () => termSay(termState.history.map((line, i) => `${String(i + 1).padStart(4)}  ${line}`)),

  clear: () => termLater(() => {
    termScreen.classList.add('is-cleared');
    termPrintEl.replaceChildren();
    if (termScrollEl) termScrollEl.scrollTop = 0;
  }),

  exit: () => {
    termSay('logout');
    termPause(0.3);
    termLater(() => continueJourney(true));
  },

  forget: (args) => {
    if (!args.includes('--yes')) {
      termState.forgetAsked = true;
      return termSay([
        "this forgets the s'mores, the stops you've seen and the incident log.",
        ["type 'forget --yes' to go ahead", 'dim'],
      ]);
    }
    termLater(() => {
      memory.forget();
      markVisited();
      carveTallies();
    });
    termSay('forgotten. the intro will play next time you come by.');
  },

  replay: (args) => {
    if (args[0] && args[0] !== 'intro') return termSay(`replay: nothing called '${args[0]}'. try replay intro`, { kind: 'err' });
    termSay('rewinding to the very start…');
    termPause(0.8);
    termLater(() => {
      memory.flush();
      location.href = `${location.pathname}?intro=1`;
    });
  },

  echo: (args) => termSay(args.join(' ')),
  pwd: () => termSay('/home/guest'),
  uname: () => termSay('NB-OS 2.6 infra x86_64 portfolio'),
  man: (args) => termSay(`No manual entry for ${args[0] || 'that'}. try 'help'`),
  top: () => termSay([
    ['  PID  %CPU  COMMAND', 'dim'],
    '    1  12.0  campfire',
    '    2   3.1  naeem --on-call',
    '    3   0.4  you',
  ]),
  vim: () => termSay(["you're in vim now. good luck.", ['(:q to escape)', 'dim']]),
  ':q': () => termSay('phew.'),
  emacs: () => termSay('this is a vim house. (:q to leave vim, if you get stuck)'),
  nano: () => termSay('fair choice. nothing to edit here though.'),
  su: () => termSay('su: Authentication failure', { kind: 'err' }),
  hello: () => termSay("hey! try 'help'."),
  coffee: () => {
    termSay('brewing…');
    termPause(1.2);
    termSay('done. the mug by the keyboard is full again.');
  },

  projects: (args) => {
    if (args[0] === 'go' || args[0] === 'cd') return TERM_COMMANDS.cd(['projects']);
    termSay([
      'projects on display:',
      ...projectData.map((p, i) => `  [${i + 1}] ${p.title}`),
      ['type "cd projects" to walk over to the workshop', 'dim'],
    ]);
  },

  experience: (args) => {
    if (args[0] === 'go' || args[0] === 'cd') return TERM_COMMANDS.cd(['experience']);
    termSay([
      BOARD_MODE ? 'career so far:' : 'career timetable:',
      ...[...CAREER].reverse().map((c) => `  ${c.dates.padEnd(16)} ${c.title.join(' ')}`),
      ['type "cd experience" to walk over to the ' + (BOARD_MODE ? 'chalkboard' : 'line'), 'dim'],
    ]);
  },

  contact: () => {
    const lines = contactLines();
    termSay(lines.length ? ['contact information:', ...lines.map((l) => `  ${l}`)] : ['coming soon. for now, have a look round!']);
  },

  resume: () => termSay([
    'Naeem Brown, UX Designer & Web Developer',
    'Career Highlights:',
    '  • Systems Engineer · Pet Plus (2025 - Present)',
    '  • Infrastructure Engineer · Pet Plus (2022 - 2025)',
    'Core Domains:',
    '  • Web & UI/UX Developer · Freelance (2020 - Present)',
    '  • Custom Interfaces · Web Dev · Systems & POS Integration',
    ['type "cat experience.log" or "contact" for more details', 'dim'],
    ['the full CV (PDF) is linked at the foot of the About letter', 'dim'],
  ]),

  reboot: () => {
    termSay('rebooting system…');
    termPause(0.6);
    termLater(() => bootTerminal());
  },

  tree: () => termSay([
    '.',
    '├── about.txt',
    '├── contact.txt',
    '├── experience.log',
    '├── resume.txt',
    '├── projects/',
    ...projectData.map((p, i) => `${i === projectData.length - 1 ? '│   └── ' : '│   ├── '}${p.title}`),
    '└── skills/',
    ...skillData.map((s, i) => `${i === skillData.length - 1 ? '    └── ' : '    ├── '}${s.slug}`),
  ]),

  weather: () => {
    const target = skyTarget();
    const part = livingDaypartName(target);
    const isNight = part === 'night' || part === 'late night';
    termSay([
      `conditions along the line:`,
      `  sky:        clear skies (${part})`,
      `  conditions: ${part === 'dawn' ? 'morning mist along the valley' : isNight ? 'crisp starry night, calm breeze' : 'bright daylight, good visibility'}`,
      `  temp:       ${isNight ? '14°C / 57°F' : '22°C / 72°F'}`,
      ['try "time dusk" or "time sunrise" to alter the sky', 'dim'],
    ]);
  },

  matrix: () => termSay([
    'wake up, guest...',
    '01101110 01100001 01100101 01100101 01101101',
    '01010011 01011001 01010011 01010100 01000101 01001101 01010011',
    '00100000 01001111 01001011 00100001',
    ['the matrix has you. (type "clear" to return)', 'dim'],
  ]),

  df: () => termSay([
    'Filesystem      Size  Used Avail Use% Mounted on',
    '/dev/nvme0n1p1  512G  128G  384G  25% /',
    'tmpfs            16G  1.2G   15G   8% /run',
    '/dev/portfolio   64M   12M   52M  19% /home/guest',
  ]),

  free: () => termSay([
    '               total        used        free      shared  buff/cache   available',
    'Mem:        32768MiB     4120MiB    24120MiB      256MiB     4528MiB    28392MiB',
    'Swap:        8192MiB           0     8192MiB',
  ]),

  hostname: () => termSay('infra.naeem.dev'),

  id: () => termSay('uid=1001(guest) gid=1001(guest) groups=1001(guest),1002(visitors)'),

  groups: () => termSay('guest visitors'),

  curl: (args) => {
    const url = (args[0] || '').toLowerCase();
    if (!url) return termSay('curl: try "curl contact" or "curl naeem"', { kind: 'err' });
    if (url.includes('contact') || url.includes('naeem') || url.includes('email')) {
      const lines = contactLines();
      return termSay(lines.length ? ['HTTP/1.1 200 OK', ...lines] : ['HTTP/1.1 200 OK', 'coming soon!']);
    }
    termSay(`HTTP/1.1 200 OK - connected to ${url}`);
  },

  touch: (args) => termSay(`touch: cannot touch '${args[0] || 'file'}': Read-only file system`, { kind: 'err' }),
  mkdir: (args) => termSay(`mkdir: cannot create directory '${args[0] || 'dir'}': Read-only file system`, { kind: 'err' }),
  find: () => termSay(['.', './about.txt', './contact.txt', './experience.log', './resume.txt', './projects', './skills']),
  grep: (args) => termSay(`grep: searching for '${args[0] || '*'}'... pattern found in system memory`),
};
// Other names for the same thing.
Object.assign(TERM_COMMANDS, {
  hi: TERM_COMMANDS.hello,
  hey: TERM_COMMANDS.hello,
  logout: TERM_COMMANDS.exit,
  quit: TERM_COMMANDS.exit,
  journalctl: TERM_COMMANDS.incidents,
  htop: TERM_COMMANDS.top,
  ps: TERM_COMMANDS.top,
  vi: TERM_COMMANDS.vim,
  ':q!': TERM_COMMANDS[':q'],
  ':wq': TERM_COMMANDS[':q'],
  ':x': TERM_COMMANDS[':q'],
  intro: () => TERM_COMMANDS.replay(['intro']),
  make: (args) => (args[0] === 'coffee' ? TERM_COMMANDS.coffee() : termSay(`make: *** No rule to make target '${args[0] || ''}'.  Stop.`, { kind: 'err' })),
  restart: () => TERM_COMMANDS.reboot(),
  reset: () => TERM_COMMANDS.reboot(),
  cv: () => TERM_COMMANDS.resume(),
  email: () => TERM_COMMANDS.contact(),
  project: (args) => TERM_COMMANDS.projects(args),
  work: (args) => TERM_COMMANDS.experience(args),
  career: (args) => TERM_COMMANDS.experience(args),
  cmatrix: () => TERM_COMMANDS.matrix(),
  sky: (args) => TERM_COMMANDS.time(args),
  theme: (args) => TERM_COMMANDS.time(args),
  wget: (args) => TERM_COMMANDS.curl(args),
  about: () => TERM_COMMANDS.cat(['about.txt']),
});
// What Tab completes and `help` is about; the rest are for finding.
const TERM_LISTED = [
  'help', 'whoami', 'uptime', 'date', 'time', 'ls', 'cat', 'cd', 'tree',
  'skills', 'projects', 'experience', 'resume', 'contact', 'ping', 'history',
  'clear', 'reboot', 'neofetch', 'incidents', 'top', 'uname', 'pwd',
  'df', 'free', 'hostname', 'id', 'weather', 'matrix', 'sudo', 'rm', 'coffee',
  'vim', 'nano', 'emacs', 'exit', 'forget', 'replay', 'echo', 'curl'
];

// Runs a line the visitor typed.
function runCommand(raw) {
  const line = raw.trim().replace(/\s+/g, ' ').slice(0, 60);
  termFlush();
  termState.shell = true;
  termScreen.classList.remove('is-cleared');
  termLine(line, 'cmd');
  if (!line) return;
  if (termState.history.at(-1) !== line) termState.history.push(line);
  termState.historyAt = termState.history.length;
  const [word, ...args] = line.split(' ');
  const command = TERM_COMMANDS[word.toLowerCase()];
  if (word.toLowerCase() !== 'forget') termState.forgetAsked = false;
  if (command) command(args, line);
  else termSay(`${word}: command not found. try 'help'`, { kind: 'err' });
}

// Tab: finishes the command, or the file or place after it.
function completeCommand(value) {
  const parts = value.split(' ');
  const last = parts.at(-1).toLowerCase();
  if (!last) return null;
  const pool = parts.length === 1 ? TERM_LISTED
    : ['cat', 'ls'].includes(parts[0]) ? TERM_FILES
      : parts[0] === 'cd' ? ['about', 'projects/', 'experience', 'skills', '..']
        : parts[0] === 'skills' && parts.length === 3 ? skillData.map((s) => s.slug)
          : [];
  const found = pool.filter((name) => name.startsWith(last));
  if (found.length !== 1) return null;
  parts[parts.length - 1] = found[0];
  return parts.join(' ') + (parts.length === 1 ? ' ' : '');
}

if (termInput) {
  termInput.addEventListener('input', () => {
    livingTyping.until = performance.now() + 220;
    sfx.key?.();
    hushTermNudge(); // they've got the idea
  });
  termInput.addEventListener('focus', () => {
    termState.shell = true;
    termScrollDown();
  });
  termInput.addEventListener('keydown', (event) => {
    noteTyping.run += 1; // they're typing: the note stops typing for them
    if (event.key === 'Enter') {
      event.preventDefault();
      const line = termInput.value;
      termInput.value = '';
      sfx.key?.();
      runCommand(line);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const { history } = termState;
      if (!history.length) return;
      termState.historyAt = clamp(termState.historyAt + (event.key === 'ArrowUp' ? -1 : 1), 0, history.length);
      termInput.value = history[termState.historyAt] ?? '';
    } else if (event.key === 'Tab') {
      const done = completeCommand(termInput.value);
      if (done) {
        event.preventDefault();
        termInput.value = done;
      }
    } else if (event.key === 'Escape') {
      termInput.blur();
    }
  });
}
// A click on the glass, away from the groups, is to type.
termScrollEl?.addEventListener('click', (event) => {
  if (!event.target.closest('button, a') && term.booted) termInput.focus({ preventScroll: true });
});

// A key pressed anywhere while the terminal is up: a printable one goes to
// its prompt, and lands there. Returns true if it was taken (script.js,
// the keydown handler).
function livingTermKey(event) {
  if (!termInput || openPanelId !== skillsScene || !term.booted) return false;
  if (event.target === termInput) return true;
  if (event.key.length !== 1 || event.key === ' ' || event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return false;
  termInput.focus({ preventScroll: true });
  return true;
}

// The terminal is booting (script.js, bootTerminal): no prompt till it's up.
function livingTermReset() {
  termInputLine?.classList.remove('is-shown');
  termNote?.classList.remove('is-shown');
  termPrintEl?.replaceChildren();
  termScreen.classList.remove('is-cleared', 'is-crashing', 'is-dead');
  termState.shell = false;
  if (termScrollEl) termScrollEl.scrollTop = 0;
}

// Booted (script.js, bootTerminal): the prompt, the sticky note, and, if
// they haven't typed anything yet this visit, a word from him about it.
function livingTermReady() {
  termInputLine?.classList.add('is-shown');
  termNote?.classList.add('is-shown');
  if (!termState.history.length) termNudge.at = performance.now() + TERM_NUDGE_AFTER;
}

// A group of skills is being shown (script.js, showSkill): it becomes the
// latest thing on the screen, so what the visitor ran is cleared.
function livingTermSkill() {
  termPrintEl?.replaceChildren();
  termScreen.classList.remove('is-cleared');
  termState.shell = false;
  if (termScrollEl) termScrollEl.scrollTop = 0;
  if (termState.restored) {
    termState.restored = false;
    termLine('restored from backup. nice try.', 'dim');
  }
}

// The terminal has shut (script.js, updateTerminal).
function livingTermClosed() {
  if (document.activeElement === termInput) termInput.blur();
  if (termInput) termInput.value = '';
  termNudge.at = 0;
  hushTermNudge();
  livingTermReset();
}

/* The sticky note and his word about it. On a wide screen the note
   (index.html, .term-note) is stuck on the monitor's bezel at its top left,
   hanging off the edge over the little note drawn there, and laid on
   through the terminal's camera as the screen is laid on the glass, so it
   moves with the monitor. On a phone the monitor fills the width, so it
   sits on the desk below instead (living.css, .is-on-desk). Clicking a
   command on it types it in at the prompt and runs it. A moment after the
   terminal is up, if they haven't typed anything yet this visit, he says
   so in a bubble over his head, where it is from behind (livingView). */

const termNote = document.querySelector('.term-note');

// Its corners on the bezel's face (x 62, left edge at z MZ - 124; see
// TERM_MODEL in script.js), a little askew: top left, top right, bottom
// right, bottom left, as seen from behind him, as GLASS_CORNERS are. It
// stops at the glass's left edge (z MZ - 104), over the little note drawn
// there, and hangs about 30 units off the bezel, which the camera leaves
// room for at any width (the glass takes 64% of it, from 12%).
const noteCorners = () => [
  [61.2, 305, MZ - 153], [61.2, 307, MZ - 104], [61.2, 249, MZ - 102], [61.2, 247, MZ - 151],
];
const noteSize = { key: '', w: 0, h: 0 };

// Lays the note on (script.js, drawTerminal, each frame the console is
// drawn): sized once for where the camera ends up, so its words are drawn
// near their own size, then mapped onto its corners wherever the camera is.
function livingTermNote(camera) {
  if (!termNote || termPanel.hidden) return;
  if (narrowScreen.matches) {
    if (noteSize.key !== 'desk') {
      noteSize.key = 'desk';
      termNote.removeAttribute('style');
      termNote.classList.add('is-on-desk');
    }
    return;
  }
  const key = `${sceneWidth}x${sceneHeight}`;
  if (noteSize.key !== key) {
    termNote.classList.remove('is-on-desk');
    const shot = termShot();
    const final = orbitCamera({
      yaw: TERM_YAW, pitch: TERM_PITCH, invDistance: 1 / TERM_DISTANCE, scale: shot.scale, x: shot.x, y: shot.y, pivot: TERM_PIVOT,
    });
    const [a, b, c, d] = noteCorners().map((p) => final.project(p));
    const w = Math.round((Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - d.x, c.y - d.y)) / 2);
    const h = Math.round((Math.hypot(d.x - a.x, d.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y)) / 2);
    Object.assign(noteSize, { key, w, h });
    termNote.style.width = `${w}px`;
    termNote.style.height = `${h}px`;
    termNote.style.fontSize = `${(h / 13.6).toFixed(2)}px`; // its nine lines and a margin
  }
  const [p0, p1, p2, p3] = noteCorners().map((p) => camera.project(p));
  termNote.style.transform = quadMatrix(noteSize.w, noteSize.h, p0, p1, p2, p3);
}
const TERM_NUDGE = '<span>I have a feeling i should</span><span>type "help" in the terminal</span>';
const TERM_NUDGE_AFTER = 1400; // ms after the terminal is up
const termNudge = { at: 0, up: false, said: null };

// Types `command` in at the prompt, a letter at a time, and runs it. Any
// key the visitor presses meanwhile stops it (noteTyping.run changes), so
// it never types over them.
const noteTyping = { run: 0 };
function typeFromNote(command) {
  if (!term.booted || !termInput) return;
  hushTermNudge();
  termInput.focus({ preventScroll: true });
  termInput.value = '';
  const run = ++noteTyping.run;
  let i = 0;
  const next = () => {
    if (!term.booted || run !== noteTyping.run) return;
    if (i < command.length) {
      termInput.value += command[i];
      i += 1;
      livingTyping.until = performance.now() + 220;
      sfx.key?.();
      window.setTimeout(next, livingReduced.matches ? 0 : 45);
      return;
    }
    termInput.value = '';
    runCommand(command);
  };
  next();
}
termNote?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cmd]');
  if (button) typeFromNote(button.dataset.cmd);
});

// Says it, once the terminal has been up a moment; keeps the bubble over
// his head while it is up.
function updateTermNudge() {
  const open = openPanelId === skillsScene && term.booted;
  if (termNudge.at && open && performance.now() >= termNudge.at) {
    termNudge.at = 0;
    if (!termState.history.length) {
      remark(TERM_NUDGE, 4400);
      const said = document.createElement('template');
      said.innerHTML = TERM_NUDGE;
      termNudge.said = said.innerHTML;
      termNudge.up = true;
      introSpeech.classList.add('is-at-terminal');
    }
  }
  if (!termNudge.up) return;
  if (!open || introSpeech.hidden || introSpeechCopy.innerHTML !== termNudge.said) {
    termNudge.up = false;
    introSpeech.classList.remove('is-at-terminal');
    return;
  }
  // His head, as the terminal's camera draws it (script.js, drawFigure).
  const head = termRig.parts.head;
  const x = Number(head.getAttribute('cx'));
  const y = Number(head.getAttribute('cy'));
  const r = Number(head.getAttribute('r'));
  if (!r) return;
  const half = speechWidth / 2; // script.js keeps it, so as not to force a layout here
  const tail = 0.17 * half; // as frame() places it: the tail a little right of the middle
  introSpeech.style.left = `${clamp(x - tail, half + 8, sceneWidth - half - 8).toFixed(1)}px`;
  introSpeech.style.bottom = `${(sceneHeight - (y - r) + 12).toFixed(1)}px`;
}

function hushTermNudge() {
  if (termNudge.up && introSpeechCopy.innerHTML === termNudge.said) hushSpeech();
}

/* --------------------------------------------------------- for testing
   Handles for the tests in scratch/living/ to drive things directly. */

window.alive = {
  memory,
  returning,
  finale: { show: livingFinaleOpen, hide: livingFinaleClose },
  ambient,
  get chalk() { return CHALKBOARD.debug; }, // the Experience chalkboard's show (chalkboard.js, loaded after this)
  isFree: () => isFree(),
  forget: () => memory.forget(),
  idle,
  incident,
  bird,
  // A gust now, blowing `dir` (1 to the right, -1 to the left).
  gust(dir = 1) {
    startGust(dir);
  },
  // Puts the bird on perch `i` (see birdPerches), sitting.
  perchBird(i) {
    const p = birdPerches()[i];
    Object.assign(bird, { mode: 'perched', perch: i, x: p.x, y: p.y, flight: null });
  },
  // Breaks fixture `id` now (lamp-right, lamp-left, lantern, sign, rack),
  // wherever it is; he deals with it as usual.
  forceIncident(id) {
    if (!FIXTURES[id] || livingReduced.matches) return false;
    if (current()?.broken) current().restore();
    cancelAmbient();
    startIncident(id);
    return true;
  },
  // Starts one of his idle acts now: look, stretch, phone, kick, yawn,
  // settle, or any of the daypart idles by name (idles.js, IDLE_ACTS),
  // whatever the hour and wherever he is.
  forceIdle(kind) {
    const make = { look: lookAct, stretch: stretchAct, phone: phoneAct, kick: kickAct, yawn: yawnAct, settle: settleAct }[kind]
      || IDLE_ACTS[kind]?.make;
    if (!make) return false;
    cancelAmbient();
    idle.last = kind;
    startAct(make());
    return true;
  },
  // The daypart idles (idles.js): their names by part of the day.
  get idles() { return idleCatalogue(); },
  // Pretends the tab was hidden for `seconds` and has just come back.
  simulateAway(seconds) {
    away.pending = seconds * 1000;
  },
  sky: skyClock,
  lamps,
  get teleport() { return teleport; }, // teleports.js, loaded after this
  // Double taps place `i` on the navbar (0 About Me to 3 Skills), going by
  // `move` (a key of TELEPORT_MOVES in teleports.js) if given.
  teleportTo(i, move = null) {
    teleport.force = move;
    buttons[i].click();
    buttons[i].click();
  },
  teleportMoves: () => Object.keys(TELEPORT_MOVES),
  runMove,
  runStats,
  // Plays one of the run flares next (pace, coffee, stumble, or script.js's
  // hydrate or sweat), now if he's running.
  runFlare(type) {
    runFlareState.cooldown = 0;
    runFlareState.active = { type, elapsed: 0, duration: RUN_FLARES[type]?.duration ?? (type === 'hydrate' ? 3.6 : 3.2) };
  },
  // A bug after him now, from behind.
  spawnBug() {
    if (!runMove.bug && !livingReduced.matches) spawnBug(performance.now());
  },
  // Shows the world at `part` of the day, as the navbar's picker does, but
  // there at once, and without him reacting.
  setDaypart(part) {
    pickTime(part, { instant: true });
  },
};
