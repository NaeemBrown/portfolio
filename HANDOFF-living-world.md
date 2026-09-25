# Making the world feel alive: implementation handoff

## BUILD STATUS (read this first if you are picking this up)

**All four features are built and tested.** For how the finished system works (files, hooks, rules, how to extend it, tests), read **[LIVING-WORLD.md](LIVING-WORLD.md)**. This file is the original plan (below) plus this build log. Run every check with `node scratch/living/run_all.js`.

**Where the code is**
- **`living.js`** (new) holds all new behaviour. It is loaded **before** `script.js`, so `script.js` can use `memory`, `returning` and so on at load time.
  - `living.js` must never touch `script.js` globals at its own top level; only inside functions called later.
  - Setup that needs the world runs in `startLiving()`, called once at the very end of `script.js`.
- **`living.css`** (new) holds all new styles. It is loaded after `styles.css`.
- **Hooks** into existing files are marked with a `living:` comment. Find them all with `grep -n "living:" script.js index.html styles.css`.
- **Backup** of the untouched originals: `backup/pre-living-world/`.
- **Tests:** `scratch/living/*.js`. Run them with `node scratch/living/<name>.js`; they use headless Edge over CDP and write screenshots to `scratch/living/shots/`.
- **Name collisions:** `living.js` and `script.js` share one global scope. A top-level name declared in both is a SyntaxError that kills the whole site. `node scratch/living/check_globals.js` checks for this; run it after every edit.

**Checklist**
- [x] 0. Groundwork: memory, isFree, input tracking, postureAt, ambient director, debug hooks (`living.js` top half; `postureAt`/`postured` in `script.js` beside `poseWithPosture`)
- [x] 3. Remember the visitor: return greeting, s'mores and tallies, visited dots, full-tour line. Test: `node scratch/living/test_memory.js` (10/10)
- [x] 4. Typed terminal. Test: `node scratch/living/test_terminal.js` (24/24). `CONTACT` in `living.js` has Naeem's email and LinkedIn; GitHub is empty and so left out
  - **As built:** the markup inside `.term-screen` is now wrapped in `.term-scroll`. Once the visitor types, it scrolls like a real terminal, so the prompt stays on the glass on phones too.
  - Commands live in `TERM_COMMANDS` in `living.js`. Hidden extras: `sudo`, `rm -rf /`, `vim`/`:q`, `top`, `coffee`, `echo`, `pwd`, `uname`, `man`, `su`, `hello`.
  - `rm -rf /` with reduced motion prints GNU's real failsafe message instead of the crash.
  - **Added after the plan:** a sticky note of commands on the monitor (on the bezel on wide screens, on the desk on phones); clicking a command types and runs it. About 1.4 s after the terminal is up, until they've typed something, he says "Hmm, developer might want me to enter these commands." in a bubble over his 3D head. Test: in `test_terminal.js` (now 30/30). See "The sticky note" in LIVING-WORLD.md.
- [x] 2a. Time of day (wash, lights layer, fireflies, stars, late-night line). Test: `node scratch/living/test_daynight.js`. Screenshots are `day_<part>_{name,camp}.png`
  - **As built:** the daypart is also set on `<html>`, so what outside `.scene` goes by it can. (The navbar now goes by `<html data-sky>` instead: see below.) The stars layer is `z-index: 4` (above the wash) and only covers the top 22% of the sky.
  - The sky is tuned in `SKY_KEYS` at the top of the time-of-day section in `living.js` (it was per-daypart CSS in `living.css` at first): wash strength and colours, lights, stars and mist, by the hour.
  - **Added after the plan:** a time picker at the top left of the navbar (dawn, day, dusk, night, and a slider for any hour; T steps through; the terminal has `time`). The sky now runs on a continuous hour (`SKY_KEYS` in living.js replaces the per-daypart CSS) and travels round the clock to a picked hour. Along the way a sun rises and sets behind the floor line, the moon crosses the night, and mist lies on the floor at dawn. The lamps, lantern and workshop switch on one by one at dusk and off in turn in the morning, and birds, crickets and a louder fire at night can be heard. The navbar's words go pale only once the sky is really dark, so dusk is readable. Test: `node scratch/living/test_timepicker.js` (60/60). See "Time of day", "Picking a time" and "The sounds of the day" in LIVING-WORLD.md.
- [x] 2c. Tab return (doze and wake, audio suspend). Test: in `test_daynight.js` (17/17 overall)
  - **Fixed along the way:** `remark()` (say, then hush) can't call `hushSpeech` straight after `speak`, because it cancels the pending bubble. See the comment on `remark`.
- [x] 2b. Idle behaviours (look, stretch, phone, kick, yawn, settle). Test: `node scratch/living/test_idle.js` (14/14). Screenshots of each act: `node scratch/living/shot_acts.js`
  - **As built:** without a mouse, `look` becomes a glance back over the shoulder.
  - **Fixed along the way:** `postured()` in `script.js` now picks the shoulder angle nearest the starting one, so arms aimed with `hand:` targets never swing round behind the back.
- [x] 1. Incidents. Test: `node scratch/living/test_incidents.js` (38/38). Screenshots: `incident_<id>_{broken,fixing}.png`
  - Built: `lamp-right`, `lamp-left`, `lantern`, `sign` (the Projects arm on the camp-to-bench post) and `rack`. **Not built:** the pegboard hammer. It's optional; the same `FIXTURES` pattern extends to it.
  - **As built:** fixtures are tagged in `script.js` (`buildStart`, `buildCamp`, `buildOps`, `signpost`, which now takes a `name`) and defined in `FIXTURES` in `living.js`. The ops board shows `FIXED n` from memory. Incidents start 20 s after load at the earliest, then 60–120 s apart.
  - **Fixed along the way (important):** anything that sends him somewhere from inside a frame must go through `soon()`. `frame()` measures the distance to the target before `livingPose` runs, so a target set mid-frame counts as already reached and he teleports onto it. `livingFrameStart()`, called beside `leaveStart()` at the top of `frame()`, runs the queue. The greeting's walk to camp and the terminal's `cd` use it too.
- [x] 2d. Bird. Test: `node scratch/living/test_bird.js` (9/9). Close-up screenshots: `node scratch/living/shot_bird.js`
  - **As built:** 17 perches in `birdPerches()`. Its size is `0.16 × --fig-h`, bigger than true scale so it reads. It starts on the left street lamp, so it flies off as he walks on in the opening.
- [x] 2e. Wind (grass layer, gusts, leaves). Test: `node scratch/living/test_wind.js` (10/10)
  - **As built:** the grass is moved onto its own `.set--grass` layers after the scenery is built (`separateGrass`), so `script.js`'s builders are untouched. There's no sway between gusts, only during them.
- [x] 2f. On the run (added after the plan; pitched in the "Run Flare Pitches" artifact, seven of ten built). Test: `node scratch/living/test_run.js` (31/31). Pictures: `node scratch/living/shot_run.js`
  - **In the flare rotation with hydrate and sweat:** a watch check (heart rate, then his real pace), a mug of coffee carried level on a morning visit's first flare, and a rare stumble (arms windmilling, a pebble left behind, "Who put that there?"). Three `living:` hooks in `updateRunFlares` and `hideRunFlareProps`.
  - **By what's around him** (`updateRunMoves`, from `livingPose`): a slap on a lamp or fingerpost he runs past (one in three; it rocks, a lit lamp flickers, a perched bird flies off), a hurdle over either bush by the name when sprinting at it, the ninja run after 3 s holding Space (arms back, headband, quicker speed lines), and a rare bug that chases him, gets flicked onto its back and is logged as a fix.
  - **Not built** from the pitch: taking a call, air drums, the lanyard.
  - See "2f. On the run" in LIVING-WORLD.md.
- [x] Final regression pass
  - The site's 13 older `scratch/*.js` tests all pass (`node scratch/living/regress.js`; logs in `scratch/living/shots/regress/`). The runner uses throwaway copies, because the originals launch Edge on the default profile and write PNGs into the project root.
  - End to end: `node scratch/living/test_smoke.js` (10/10). The full opening plays through to the About letter; a phone-sized visit and reduced-motion first and return visits load with no page errors.

**Still open** (details at the end of LIVING-WORLD.md):
- GitHub for the terminal's `CONTACT` (optional).
- The optional pegboard-hammer incident.
- Approval of the spoken lines.
- A design look at the night wash.
- The sticky note's markup (`.term-note`) has gone from `index.html`, in an edit made outside this work; `test_terminal.js` stops at its first check until it's back or the test changes.

Four features for the portfolio's side-scrolling world, in priority order:

1. **The figure fixes things.** Small parts of the world break and the figure walks over to fix them. This extends the broken-N opening into a recurring motif that matches the owner's job as a Systems & Infrastructure Engineer.
2. **The world runs without you.** The scene follows the visitor's local time of day. The figure does things when left idle and reacts when the visitor returns to the tab. A bird perches around the world and gusts of wind pass through.
3. **It remembers the visitor.** Return visits get a short greeting instead of the full opening. S'mores, visited stops and fixed incidents carry over between visits.
4. **The Skills terminal accepts typed commands.** Visitors can type `help`, `whoami`, `uptime`, `cd projects`, `sudo …`, `rm -rf /` and more.

Line numbers below were correct on 24 Sep 2026 and will drift as you edit. Function names are the stable reference.

---

## Before you start: how this codebase works

- **The whole project is three files:** `index.html`, `styles.css` and `script.js` (about 7.3k lines), plus `gaits.js`. There is no build step, framework or modules. Scripts load as classic `defer` scripts, so every top-level `const` or `function` is a global. The test scripts in `scratch/` rely on this.
- **A single rAF loop, `frame(now)` (script.js:5863), drives everything.** It computes the figure's pose, moves the camera and draws the world. `dt` is clamped to 0.05 s. New per-frame behaviour hooks into `frame()` at the points named below.
- **There are three coordinate systems:**
  - **World px** run along the floor. `state.x`, `campX`, `benchX`, `experienceX` and `skillsX` all use them, and the stops' positions come from the nav buttons' `data-position`.
  - **Rig units** are the figure's SVG viewBox, 140×242 with y pointing down. The hip is at (70, 144) and the feet at y = 242. `unit` is px per rig unit and is recomputed every frame (`frame()` line 1).
  - **Scenery units** are what `worldSet()` draws in. Their scale is the same as rig units, but y points **up** from the floor (`scenePen` flips it), and x is measured from the set's anchor in world px.
- **Poses** have the shape `{ near: {thigh, knee, ankle, shoulder, elbow}, far: {…}, bob, lean, spin }`. The helpers are `pose()`, `mixPose()`, `clonePose()` and `poseWithPosture()`. For IK, use `reach(bob, ax, ay)` for legs and `armReach(lean, hx, hy)` for arms; `handAt(lean, shoulder, elbow)` goes the other way.
  - A **negative** shoulder angle swings the arm **forward** (the way the figure faces), and a positive lean tips the head forward. Prefer aiming hands at rig-unit targets with `armReach` over hand-tuning angles.
- **Timed actions already exist in two styles; copy them rather than inventing a third:**
  - `pointerPostures` with `pointerReactionPose()` (script.js:814, 895) uses keyframes of pose offsets with smoothstep between them.
  - `runFlareState` with `updateRunFlares()` (script.js:1810) is a state machine with a cooldown that layers an arm action over the gait.
- **Speech** goes through `speak(html)` and `hushSpeech(ms)`, and `speechUp()` says whether a bubble is showing. The bubble follows the figure automatically. `speak` also plays the babble voice.
- **Sound** comes from the `SoundEngine` class (`sfx`). Build new sounds from its two primitives, `tone()` and `hiss()`, as the existing ones are. Every call is a silent no-op when sound is off, so you never need to check.
- **Reduced motion is respected everywhere** through `reducedMotion.matches`. Every feature below states its reduced-motion behaviour.
- **Scenery is built after fonts load** (`document.fonts.ready.then(buildSurroundings)`, script.js:4628). Any code that queries scenery DOM, such as lamps, signs or LEDs, must wait for that.
- **Style:** match the existing comments. Above each function or constant there's a sentence or two of plain English describing what happens in the world, and constants are `UPPER_CASE` with a trailing comment giving units. Do not hand-edit `GAITS` (it's generated). Do not re-break the N; the opening owns that moment.
- **Testing is done with headless Edge driven over CDP** from Node, as in `scratch/verify_live_flares.js`. Those scripts call globals through `Runtime.evaluate` and save screenshots.

---

## 0. Shared groundwork (do this first)

All four features depend on these pieces.

### 0.1 `memory`: a persistent store

Add this near the top of `script.js`, just after `reducedMotion` (script.js:13), because the opening code at script.js:5847 runs at load and will need it.

```js
// What we remember about this visitor between visits, kept in their own
// browser and nowhere else.
const MEMORY_KEY = 'cv_memory_v1';
const memory = (() => {
  const blank = { visits: 0, firstAt: 0, lastAt: 0, smores: 0, visited: {}, incidents: [], fixed: 0, toured: false, lateNightOn: '' };
  let data = { ...blank };
  try { data = { ...blank, ...JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}') }; } catch {}
  let timer = 0;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { try { localStorage.setItem(MEMORY_KEY, JSON.stringify(data)); } catch {} }, 250);
  };
  const forget = () => { data = { ...blank }; try { localStorage.removeItem(MEMORY_KEY); } catch {} };
  return { get data() { return data; }, save, forget };
})();
```

- Wrap every storage access in try/catch. Private windows and blocked storage throw.
- Leave the existing `cv_sound_enabled` key alone.
- Record the visit at load, reading `returning` before incrementing:

```js
const params = new URLSearchParams(location.search);
const returning = params.get('visit') === 'return' || (params.get('visit') !== 'first' && memory.data.visits > 0);
const lastVisitAt = memory.data.lastAt;
memory.data.visits += 1;
memory.data.firstAt ||= Date.now();
memory.data.lastAt = Date.now();
memory.save();
```

### 0.2 `isFree()`: nobody is steering the figure and nothing else has it

Idle behaviours, incidents and the tab-return reaction may only start while this is true.

```js
function isFree() {
  return !intro.active && !intro.release && !openPanelId &&
    !state.wantSeat && !state.wantBench && !state.wantForge && !state.experienceActive &&
    state.speed === 0 && state.turning === 0 && !state.hop && !state.jump &&
    state.seat === 0 && state.inspect === 0 && state.typeIn === 0 &&
    state.projectView === 0 && state.termView === 0 &&
    handcar.stage === 'off' && state.courseTime === 0 && !pointerPlay.reaction &&
    !inputKeys.left && !inputKeys.right && !inputKeys.sprint;
}
```

It references `intro`, `handcar` and `inputKeys`, which are declared later in the file. That's fine as long as it's only *called* from `frame()`: the first frame runs after the whole script has executed.

### 0.3 `lastInputAt`: when the visitor last did something

Add one capture listener for `keydown`, `pointerdown` and `touchstart` (all `passive`) that sets `lastInputAt = performance.now()` and calls `cancelAmbient()` (0.5). Don't count `pointermove`: moving the mouse isn't steering.

### 0.4 `postureAt()`: shared keyframe playback

Extract the interpolation inside `pointerReactionPose()` (script.js:905–917) into `postureAt(keyframes, progress, base)` and use it from `pointerReactionPose()` too.

Extend the keyframe format so a keyframe can aim a hand instead of giving angles: `near: { hand: [hx, hy] }`. When a keyframe has `hand`, solve the arm with `armReach(lean, hx, hy)` before mixing. Most of the actions below are easier to write as hand targets.

### 0.5 The ambient director

This is one small object that decides what the figure does while the visitor isn't steering. Priority, highest first:

**visitor input > stop scenes (camp, bench, terminal, line) > opening > tab-return > incident > idle behaviour**

- `ambient.act` holds the current action: `{ kind, t, duration, keyframes, onImpact, … }`.
- `cancelAmbient()` blends the action out over 0.3 s, then clears it. For the blend, keep the last pose and `mixPose()` it towards the base, as `intro.release` does (script.js:5555–5561).
- **Hook it into `frame()`** right before `const pointerResponse = …` (script.js:6193):

  ```js
  final = ambientPose(final, dt, now, unit);
  ```

  Placing it there lets a poke from the cursor override it. `startPointerReaction()` should also call `cancelAmbient()`.
- **Hold the figure still while an action pins it,** such as sitting on the floor. Extend the rule at script.js:5931 to:

  ```js
  if (state.seat > 0 || ambient.pinned > 0) wanted = 0;
  ```
- **Gate speech** with `canSpeak()`, which checks `!intro.active && !openPanelId`. Every ambient line hushes itself after about 2 s.

### 0.6 Debug hooks for testing

- Query parameters, in the same style as `TOWER_MODE` (script.js:3058): `?time=dawn|day|dusk|night`, `?visit=first|return`, `?intro=1`.
- A global `window.alive = { forceIncident(id), forceIdle(kind), simulateAway(seconds), setDaypart(p), memory }` so CDP tests can drive each feature directly.

---

## 1. The figure fixes things

**What the visitor sees:** while the figure is standing about, something nearby breaks: a street lamp fizzes and dies, a signpost arm swings loose, or a server LED goes red. The figure's phone buzzes and they say "Hm. On it." They walk over and fix it (a thump, a push, a cable reseated), there's a chime, and they say "Fixed." The terminal keeps a log (feature 4).

### Fixtures

Ship the first three, then add the others using the same structure.

| id | Where (builder) | How it breaks | How the figure fixes it |
|---|---|---|---|
| `lamp` | Right-hand street lamp by the name. `buildStart()`, `x = 110` units from `nameEnd` | The glow flickers for about 2.5 s with a fizz, then goes dark | Stands beside the post and thumps it at chest height with the heel of the hand. The first thump makes it flicker; the second brings it back on |
| `sign` | Top arm of the fingerpost between camp and bench. `signpost((campX + benchX) / 2, …)` | The arm creaks and swings down to about −35° | Pushes it back up with the near hand, holds it, then taps it twice |
| `rack` | Middle rack at ops. `buildOps()`, rack `x0 = 392`, LED row `u = 5` (about 173 units up, within reach) | The LED turns red and blinks fast, the status-board readout switches to `DEGRADED`, and the graph dips | Reaches into the rack, pulls the cable out about 10 units and pushes it back. The LED turns green and the readout returns to `UPTIME 99.98%` |
| `lantern` *(later)* | Camp lantern, `buildCamp()`, `l = -170` | Gutters out | Taps the glass and the lantern relights |
| `hammer` *(later)* | Hammer on the pegboard, `buildShop()` | Drops off its peg with a clatter | Picks it up and re-hangs it |

**Making fixtures addressable.** `scenePen` has `open(attrs)` and `close()`. Wrap each fixture's shapes in `p.open('class="s-fixture" data-fixture="lamp"')` … `p.close()` inside its builder:

- For the sign, wrap each arm in its own group so it can rotate. Rotate with an SVG transform attribute, `rotate(angle root -y)`; remember that the pen flips y.
- For the rack, tag the one LED you'll use. LEDs live in the separate `set--lights` layer, so tag it in the `lights` array.
- For the readout, wrap the `s-readout` text so its content can be swapped.

Look fixtures up after `buildSurroundings` has run: keep the promise, `const surroundingsReady = document.fonts.ready.then(buildSurroundings)`.

**Fixture definitions** live in a table:

```js
const FIXTURES = {
  lamp: {
    label: 'the street lamp',
    at: (unit) => nameEnd + 110 * unit,  // world px of the fixture
    stand: -38,                          // units from it the figure stands; the sign gives the side
    break(el) { … }, restore(el) { … },  // CSS classes and sounds
    keyframes: FIX_THUMP, impacts: [0.38, 0.62],
  },
  …
};
```

### Sequence (`incident.phase`)

1. **Scheduling.** Start an incident only when all of these hold:
   - `isFree()` has held for 8–14 s (randomised).
   - The last incident ended at least 60–120 s ago.
   - The opening ended at least 20 s ago.
   - Reduced motion is off.
   - A fixture is **on screen**. A fixture at world px `X` is on screen at `X − renderX + sceneWidth/2 + frameShift`. Expose `renderX` and `frameShift` from `frame()` in a small global `view` object so this code can read them. Don't call it `camera`: `drawBench()` and `drawTerminal()` already have locals by that name.

   If no fixture is visible, skip this cycle.
2. **`break` (about 2.5 s):** call `fixture.break()`, which adds `.is-faulty` and plays its sound.
3. **`notice` (about 1 s):** play `sfx.buzz()` and show the phone prop in the figure's hand (shared with idle "check phone", see 2b). The figure turns towards the fixture and says one of "Hm.", "Not again…" or "On it.".
4. **`travel`:** send the figure the way the code already moves it without the nav:

   ```js
   state.target = fixture.at(unit) + fixture.stand * unit * side;
   state.destinationId = 'incident';
   state.label = fixture.label;
   state.announced = false;
   status.textContent = `Heading to fix ${fixture.label}`;
   ```

   Two changes in `frame()`:
   - **Arrival** (script.js:6280–6294): add `else if (state.destinationId === 'incident') startFix();` before the final `else openPanel(...)`. Without it, `openPanel('incident')` would be called (harmlessly, but wrongly).
   - **Facing** (script.js:5920): add `: state.destinationId === 'incident' ? incident.face` to the `faceTo` chain so the figure turns to the fixture on arrival.

   A far fixture makes the figure break into a run by itself (`RUN_ABOVE`); that's fine, since they're hurrying.
5. **`fix`:** play the fixture's keyframes through `ambient.act`. At each `impacts` progress point, play the sound and advance the fixture's state; the last impact calls `restore()`.
6. **`done`:**
   - Play `sfx.chime()` and say "Fixed." or "There we go.", hushed after 1.6 s.
   - Log `{ id, at: Date.now(), secs }` to `memory.data.incidents` (keep the last 20), increment `memory.data.fixed`, and save.
   - Set `state.destinationId = null`, `state.announced = true` and a status text.

**Interruptions:** any visitor input during `notice`, `travel` or `fix` aborts to `waiting`, and the fixture **stays broken**. When `isFree()` has held for 3 s and the fixture is within about one screen, resume from `notice`. `goTo()` and `beginManualTravel()` already overwrite the destination, so the abort only needs to reset `incident.phase`.

### New keyframes

Use hand targets from 0.4, in rig units, x forward and y down. The shoulder is at about (70, 74) when upright.

- `FIX_THUMP`: draw the near hand back to `[58, 96]` with lean −4, then drive it to `[104, 100]` with lean +6 (impact). Recoil, repeat, then return to identity.
- `FIX_PUSH`: near hand up to `[92, 60]` and hold, then two small taps at `[96, 56]`.
- `FIX_RESEAT`: near hand to `[100, 69]`, where 242 − 173 = 69, i.e. the LED height. Pull back to `[90, 69]`, then push to `[102, 69]` (impact).

### New sounds (as `SoundEngine` methods built from `tone` and `hiss`)

- `buzz()`: two square-wave pulses at 150 Hz, 0.12 s each and 0.18 s apart, vol 0.05.
- `fizz()`: five or six short bandpass hisses at about 4 kHz with q 6, scattered over 0.6 s.
- `creak()`: sawtooth tone 180 → 140 Hz, 0.5 s, vol 0.04.
- `clunk()`: `tap(1.3)` followed by a 2.4 kHz square click, like `lid()`.
- For thumps, reuse `tap(0.6)` or `thunk()`.

### CSS

```css
.s-fixture.is-faulty .s-glow { animation: lamp-flicker 0.9s steps(1) infinite; }
.s-fixture.is-out .s-glow { opacity: 0; }
.s-led.is-fault { --led: #e0564a; }   /* and set --d: 0.35s inline from JS */
```

### Reduced motion

Incidents are off entirely: they are motion by nature.

### Done when

- Each of the three fixtures breaks only while on screen and the figure is idle.
- The figure walks over, fixes it and the fixture is restored.
- Pressing A or D mid-way leaves the fixture broken; it resumes later.
- The log entry is written and the fixed count survives a reload.
- Nothing fires during the opening or with a panel open.

---

## 2. The world runs without you

### 2a. The visitor's local time of day

- **Dayparts** come from `new Date().getHours()`:

  | Hours | Daypart |
  |---|---|
  | 21–5 | night |
  | 5–8 | dawn |
  | 8–17 | day |
  | 17–21 | dusk |

  Set the result on `scene.dataset.daypart` and re-check once a minute with `setInterval`. `?time=` overrides it.
- **Don't build a dark theme.** The scenery has dozens of hard-coded fills. Add two layers to `index.html` instead, directly **after** the `.figure` SVG so they share its `z-index: 3` and stack above it, below the speech bubble and panels (`z-index: 4`) and below the navbar (20):
  - **`.sky-wash`:**
    - `position: absolute; inset: 0; pointer-events: none; mix-blend-mode: multiply`.
    - A cool vertical gradient (`#2b3550` → `#56607a` → `#8a8577`) with `opacity: var(--wash)` and `transition: opacity 4s`.
    - Wash strength per daypart: day 0, dusk ≈ 0.28 with a warmer gradient, night ≈ 0.45, dawn ≈ 0.15 with a peach gradient.
    - Panels, the speech bubble and the navbar stay untinted.
  - **`.world-lights`:**
    - Same size as `.world`, and it gets **the same transform string** as `.world` every frame. Write it next to `world.style.transform` (script.js:6274) and cache the string, as `placeRunner` does.
    - Holds radial glows (`mix-blend-mode: screen`) at each light: both street lamps, the camp lantern, the campfire (large and warm), and the ops status board and racks (small and green).
    - Position the glows with the same `calc(anchor px + var(--fig-h) * units/242)` formula that `worldSet()` uses so they survive resizes.
    - Glow opacity is `var(--lights)`: dusk 0.6, night 1, otherwise 0. They also need `opacity: var(--project-world-opacity)` so they fade out with the world at the bench and terminal.
- **Fireflies** appear at camp at night: 6–8 spans near the campfire in the world layer, drifting and blinking with CSS keyframes styled like `.campfire__ember`. Hide them under reduced motion.
- **Stars (optional):** about 30 dots on a layer behind `.world`, shifted by `-renderX * 0.03` for parallax. Night only.
- **One late-night line:** between midnight and 4 am, the first time the figure is idle, say "You're up late too?". Store the date in `memory.data.lateNightOn` so it's said once per night.
- **Check contrast:** at night, ink lines on the washed paper must stay clearly readable. Lower `--wash` if they don't.

### 2b. Idle behaviours

The ambient director (0.5) keeps `idle.quiet`, which grows by `dt` while `isFree()` holds and no incident is active, and resets otherwise.

- At `quiet ≥ next` it starts a behaviour. Picks are weighted, never repeat the previous one, and are filtered by conditions. After each one, `next = quiet + duration + 6–12 s`.
- At `quiet ≥ 35 s` the figure **settles**: sits on the floor with the laptop until the visitor does something.

| Kind | Length | What happens | How |
|---|---|---|---|
| `look` | 2.5–4 s | Turns to face the cursor and leans a little up or down towards it | Fine pointer only, cursor visible. Add `: ambient.face ? ambient.face` to the `faceTo` chain (script.js:5920) so the existing turn code does the pivot. Lean ±4 by the cursor's height relative to the head |
| `stretch` | 2.8 s | Both arms overhead, rises a little, drops back | Hand targets near `[76, 0]` and far `[64, 0]`, lean −6, bob −3 |
| `phone` | 4–6 s | Takes a phone out, looks down, thumbs it, pockets it | New `<g class="prop-phone">` in the near hand beside `#hand-water-bottle` in `index.html`. Hand to `[94, 104]`, lean +8, small thumb jitter. **Shared with incidents** |
| `kick` | 1.6 s | Scuffs a pebble along the floor | Near ankle forward with `reach(bob, 110, 236)`. Spawn a `.world-pebble` and roll it with rAF as `launchFlyingSmore()` does. `sfx.tap(1.6)` twice |
| `yawn` | 2.5 s | Hand to mouth, leans back. Night and dawn only | Hand to `[92, 40]`, lean −8, long low-pass hiss |
| `settle` | until input | Sits cross-legged with the laptop open and taps away | `floorSitPose(base, 14)`, then `placeLaptop({ at: 'lap', lap: lapAt(p), bump: 0, lid: k }, 1)`, hands on the keys through `onLaptop()` and `armReach()`, `sfx.key()` in bursts. Set `ambient.pinned` so the figure stands up before walking. While settled, set `scene.dataset.gait = 'coding'` (script.js:6296) so the hands style as in the opening. Call `placeLaptop(null)` when done |

- `placeLaptop()` and `floorSitPose()` are only driven by the opening while `intro.active`, so reusing them afterwards doesn't conflict.
- **Cancel** idle behaviours on any input (0.3) and on a cursor poke.
- **Reduced motion:** no idle behaviours.

### 2c. Coming back to the tab

- Handle `document.addEventListener('visibilitychange', …)`:
  - **On hidden:** record `awayAt`, and call `sfx.ctx?.suspend()`. This also fixes the fire's crackle carrying on in a background tab.
  - **On visible:** resume audio if sound is enabled, then look at how long the visitor was away.
- If they were away more than 20 s and there's no opening or open panel, play the `doze` action:
  1. It starts already asleep: floor-sit pose, head slumped with lean +28, bubble `zzz…`.
  2. After 1.2 s the figure jolts awake (quick spin ±3 and bob −6) and says a line that depends on the gap:
     - under 2 min: "Oh! You're back."
     - under 30 min: "Oh hey, welcome back."
     - longer: "I kept the fire going."
  3. The line hushes after 2.4 s and the figure stands up.
- rAF pauses while the tab is hidden and `dt` is clamped, so nothing jumps on return.
- **Reduced motion:** the line only, with no pose.

### 2d. A bird

- **The bird** is a single `<svg class="bird">` appended to `.world`, positioned in world px like `.world-smore`. Its size is about `0.08 × --fig-h`.
  - It has two groups: `perched` (a body, a tail, and a head group with an eye and an amber beak) and `flying` (two wing paths that flap with CSS keyframes under `.is-flying`).
  - Ink stroke and paper fill; the amber beak is its only colour.
- **Perches** are functions returning `{ x, y }` in world px from `unit`:
  - fingerpost tops (anchor, y 222 units)
  - street-lamp heads (`nameEnd + (x + 30) * unit`, y 318)
  - letter tops of the name (`nameStart(unit) + (letter.x + letter.width / 2) * unit`, y `PLINTH + 8 + LETTER_TALL`)
  - the tent peak (`campX − 300 * unit`, y 150)
  - the workshop roof and the ops cable tray (y 440)
- **Perched state:** every 1.5–4 s the bird does one of a head flip, a peck or a hop of ±6 px. Now and then, only when on screen, it plays `sfx.chirp()`: two tones 3.2 → 4.2 kHz, 0.05 s each.
- **It flushes when any of these happen:**
  - the figure comes within 1.4 body heights at more than walking speed, or jumps nearby
  - the figure comes within 0.6 body heights at any speed
  - the ink cursor comes within 50 px on screen
  - an incident thump happens nearby
- **Flight:**
  - The bird picks a perch 0.4–1.4 screen widths from the camera, on the side away from the figure.
  - It flies a quadratic Bézier with the control point 80–160 px above, at about 350 px/s, facing the way it's going, and flares its wings for 150 ms on landing.
  - If no perch fits, it flies up off screen, waits 8–20 s, then flies in to a perch near the camera.
- **Night:** the bird roosts (hidden). As an option, a moth circles the lit street lamp instead.
- **Performance:** write its transform only while it's flying, and cache the string.
- **Reduced motion:** the bird sits on the first fingerpost and never moves.

### 2e. Wind

- **Put the grass on its own layer first.** `tufts()` currently draws into each set's big SVG, so animating it would repaint the whole set. Follow the existing `set--lights` precedent (script.js:4576): collect each set's tufts into a small `set--grass` `worldSet` of its own.
- **Gusts:** every 15–30 s, add `.is-gusting` to `.world` for 2.5 s. Driven by it:
  - **Grass:** `.s-grass` gets `transform-box: fill-box; transform-origin: 50% 100%` and a `gust` keyframe that skews it up to −7°. Blades bend in proportion to their height because the skew is about the floor line.
  - **Trees:** each `.s-tree` pine sways ±0.8° about its base, with the delay varied per set.
  - **Smoke:** `.campfire__smoke` drifts sideways through a `--wind-drift` variable in `smoke-rise`.
  - **Sound:** a low-pass hiss (500 → 900 Hz, vol 0.15, 2.5 s, 0.8 s attack).
  - **Leaves:** 3–5 tiny leaf spans blow across in the world layer near the figure, like `spawnDust()` but travelling about 400 px horizontally and tumbling.
- If a gust comes while the figure is idle, they can lean into it (−6) for its length. This is optional.
- A constant gentle sway between gusts is optional. Measure it in the Performance panel first; keep it only if frames stay smooth.
- **Reduced motion:** no gusts and no sway.

---

## 3. It remembers the visitor

This uses `memory` from 0.1.

### Return visits skip the opening

- **Condition:** `returning && !reducedMotion.matches && params.get('intro') !== '1'`.
- **Set the start up as the reduced-motion branch already does** (script.js:5847–5854), plus one extra step:

  ```js
  setN(1);
  STATUE.n.classList.remove('statue__glitch');
  STATUE.n.classList.add('is-fixed');   // stops finishIntro() calling fixN() later
  settleTools();                          // sound button and controls straight to their places
  leaveBag(-(STATUE.width + 230) + BAG.rest - 70, false); // the bag is where it was left last time
  ```

  Also change the `intro` initialiser (script.js:5153) to `active: !reducedMotion.matches && !returning`.
- **Greeting beat:** after 0.6 s, play a `wave` action (near hand up to about `[96, 10]`, swinging ±8 in x) and `speak(greetingLine())`.
  - `greetingLine()` depends on the gap since `lastVisitAt` and on the daypart:
    - under 12 h: "Twice in one day?"
    - over 30 days: "Oh hey, it's been a while!"
    - dawn: "Morning! Welcome back."
    - otherwise: "Welcome back!"
  - After 2.4 s, set off the same way `leaveStart()` does: `goTo(buttons[0], { keepSpeech: true }); state.strollUntil = nameEnd; hushSpeech(1700);`.
- Any input during the greeting simply takes over, since `goTo()` and `beginManualTravel()` already handle this.
- **To see the full opening again,** use `?intro=1` or the terminal's `replay intro` (feature 4).

### S'mores and tally marks

- **Split `launchFlyingSmore()`** (script.js:1210) into `makeSmore()` (the element) and a landing placement for index `i`. The landing currently computes `landX = campX + (135 + jitter) * unit`, where `jitter = (i % 5) * 8 − 16`.
- **Count and restore:** each launch increments `memory.data.smores` and saves. On load, once `unit` is known, place up to 12 already-landed s'mores with no flight.
- **Tally marks on the log:** add `<path class="camp-seat__tally">` to the `.camp-seat` SVG in `index.html` (viewBox 0 0 100 44, log body x 14–86). Draw groups of four strokes plus a diagonal across x 22–70, y 9–17, capped at 20 marks. Update it after each s'more.

### Visited stops

- **`openPanel(id)`** (script.js:19) is the one place every stop's scene opens, including the experience line (script.js:4020). In it, set `memory.data.visited[id] = true`, save, and add `is-visited` to that nav button.
- **CSS:** `.poi-nav button.is-visited::after { background: var(--ink); }`. Check it against the existing `::after` stop dot (styles.css:364) and the `aria-current` state (styles.css:383) so "visited" and "here" still look different.
- **On load,** apply `is-visited` from memory.
- **First full tour:** the first time all four stops have been visited, say once: "That's the whole tour. Thanks for walking round with me!" Then set `memory.data.toured`.

### Carries over from feature 1

The ops readout can show the fixed count, e.g. a second line `FIXED 7` under the uptime.

### Privacy

Everything stays in `localStorage` in the visitor's browser; nothing is sent anywhere. The `forget` command (feature 4) clears it.

### Done when

- A second load skips straight to the greeting with the N fixed, the bag by the name and the tools docked.
- `?visit=first` and `?intro=1` show the full opening.
- S'mores, tallies and visited dots survive a reload.
- Storage throwing (e.g. in a private window) breaks nothing.

---

## 4. The terminal accepts typed commands

The CRT at Skills (script.js:6527 onward) already runs a queue: `termWait`, `termType` and `termRun`, processed by `runTerminal(dt)`. Visitor commands use the same queue.

### Markup (`index.html`, inside `.term-screen`)

- Change the hint line to: `click a group, or type help · ← → to leave`.
- After `.term-out`, add:

  ```html
  <div class="term-print" role="log" aria-live="polite"></div>
  <p class="term-line term-line--input">
    <span class="term-prompt"><span class="term-user">guest@infra:</span>~$</span>
    <input class="term-input" type="text" aria-label="Type a terminal command"
           autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" maxlength="60">
  </p>
  ```

- Style `.term-input` so it can't be told apart from the terminal text: `font: inherit; color: inherit; background: none; border: 0; outline: none; caret-color: var(--phosphor); width: 60%`.
- Show the input line in `bootTerminal()` with a `termRun` after the hint appears.

### Screen space

`.term-screen` is a fixed size with `overflow: hidden`. There is one slot, the show line plus its output, and a visitor command replaces whatever is there:

- **Output** goes in `.term-print`. While visitor output is showing, remove `is-shown` from `.term-out`; clicking a skill tab reverses that.
- **Long output** (`help`, `neofetch`, `history`) adds `.is-freeform` to `.term-screen`, which hides `.term-list` and the `skills --list` line to make room. Picking a skill or running `skills` removes it.

### Key routing

The visitor can type without clicking first. At the **top** of the global `keydown` handler (script.js:7227), before the `interactive` early return, add:

```js
if (openPanelId === skillsScene && term.booted && event.key.length === 1 && event.key !== ' ' &&
    !event.ctrlKey && !event.metaKey && !event.altKey &&
    !event.target.closest?.('input, textarea, [contenteditable]')) {
  termInput.focus(); // the key lands in the input
  return;
}
```

- While the terminal is open, letters (including A, D and W) type instead of walking or jumping. The arrow keys, the "Continue journey" button and `exit` still leave. The hint line says so.
- Space is left alone so it still activates a focused skill tab.
- **Check in Chrome, Firefox and Safari** that the first key lands in the input.
- **Inside the input:**
  - Enter runs the command.
  - ArrowUp and ArrowDown step through history.
  - Tab completes command names (optional).
  - Escape blurs the input.
- The global handler already ignores events from inputs, so typing never moves the figure.

### The figure types along

`typePose()` taps the hands while `term.typing` is true (script.js:6781), but `runTerminal()` overwrites it every frame (script.js:6996).

- On each `input` event, set `term.visitorTypingUntil = performance.now() + 180` and call `sfx.key()`.
- Change the last line of `runTerminal()` to:

  ```js
  term.typing = term.ops[0]?.kind === 'type' || performance.now() < term.visitorTypingUntil;
  ```

### Running a command

`runCommand(line)`:

1. Trim the line, collapse spaces and lower-case the command word.
2. Push it to the session history.
3. Set the show line's `.term-typed` to the line at once (the visitor typed it, so there's no typing animation).
4. Queue the output lines with `termRun` and a `termWait(0.04)` between each, tagging those ops `cmd: true`. A new command drops unfinished `cmd` ops, as `showSkill()` does with `op.show`.
5. **Build all output with `textContent`, never `innerHTML`.**

### Commands

| Command | Output or action |
|---|---|
| `help` | Lists the commands (freeform) |
| `whoami` | `guest (Europe/London)`, taken from `Intl.DateTimeFormat().resolvedOptions().timeZone`, and `you've walked 212 m with me`. Add an odometer in `frame()` at script.js:6074, `state.odometer += Math.abs(step) / unit`, and convert with 242 units ≈ 1.8 m |
| `uptime` | `up 4 min 12 s` (time on the page), `visit 3, first on 2 Sep 2026` (from memory) and `load average: 0.41 …`, which is the real mean frame time divided by 16.7 ms |
| `date` | The visitor's local date and time |
| `ls` | `about.txt  projects/  experience.log  skills/  contact.txt` |
| `cat about.txt` | The About panel's intro and first paragraph, read from the DOM so it follows real copy when that lands |
| `cat experience.log` | One line per role from `CAREER` (script.js:3062), latest first |
| `cat contact.txt` | Contact details. **Naeem to supply** (see open questions) |
| `cd about` / `projects` / `experience` / `skills`, `cd ~`, `cd ..` | Leaves the terminal and walks there: `continueJourney(false)` then `goTo(button)`. `cd ..` only leaves |
| `skills`, `skills --list`, `skills show <slug>` | Clears freeform mode and calls `selectSkill()` |
| `ping naeem` | Three `64 bytes from naeem: icmp_seq=1 ttl=64 time=0.4 ms` lines, 0.4 s apart, then `naeem is up. say hi →` and the contact details |
| `sudo …` | `[sudo] password for guest:`, then after 0.8 s a line of asterisks, then `guest is not in the sudoers file. This incident will be reported.` The figure shakes their head (set `term.react = { kind: 'shake', t }` and add a ±3 lean wobble in `typePose()`). Logs a `sudo` entry to `memory.data.incidents` |
| `rm -rf /` or `rm -rf *` | The gag, described below |
| `incidents`, `journalctl` | The last five entries from `memory.data.incidents`, e.g. `12:04  lamp   fixed in 6.2 s` |
| `neofetch` | A five-line ASCII stick figure beside `OS: NB-OS 2.6`, `Host: Naeem Brown`, `Role: Systems & Infrastructure Engineer`, `Uptime`, `Shell: bash`, `Skills: 5 groups` and `Theme: <daypart>` (freeform) |
| `history` | This session's commands |
| `clear` | Empties the slot |
| `exit`, `logout` | `continueJourney(true)` |
| `forget` | Asks the visitor to confirm with `forget --yes`, then runs `memory.forget()` and prints `forgotten. the intro will play next time.` |
| `replay intro` | Sets `memory.data.visits = 0`, saves and reloads |
| `vim` | `you're stuck now. type :q`, and `:q` then prints `phew.` |
| Anything else | `<cmd>: command not found. try 'help'` |

### The `rm -rf /` gag

The world isn't visible while the camera is round at the terminal (`--project-world-opacity` is about 0), so the whole gag happens on the screen:

1. Print `removing /world/campfire… /world/bench… /world/name…` quickly.
2. Add `.is-crashing` to `.term-screen`. Every line gets a staggered CSS fall (`translateY(140%) rotate(±8deg)`, falling out of the bottom), with `sfx.whoosh(0.6, 0, false)`.
3. The screen goes black for about 0.8 s.
4. The figure thumps the monitor: a quick near-hand lift and drop in `typePose()`, `sfx.thunk()`, and a 0.25 s shake.
   - `.term-screen`'s `transform` is written every frame by `placeTermScreen()`, so apply the shake with the individual **`translate`** CSS property on `.term-panel` and `.term-cam`. It combines with `transform` instead of fighting it.
5. Call `bootTerminal()`, with an extra boot line: `restored from backup · nice try`.

**Reduced motion:** skip the fall and shake, and print only `rm: permission denied. nice try.`

### Accessibility

- The input has a label, and `.term-print` is a polite live log.
- Focus stays in the input after Enter.
- Nothing steals focus from the panel's `h1` when it opens: the input is only focused when the visitor starts typing.

### Done when

- With the terminal open, typing `help` with no click shows the list.
- Each command in the table works.
- `cd projects` walks the figure to the bench and opens it.
- The figure's hands tap while the visitor types.
- `rm -rf /` plays and recovers.
- The arrow keys still leave.
- It works at 375 px wide with the on-screen keyboard.
- No command can inject HTML.

---

## Build order and sizing

| Step | Work | Size | Why this order |
|---|---|---|---|
| 1 | Groundwork: `memory`, `isFree`, input tracking, `postureAt`, ambient director, debug hooks (section 0) | S–M | Everything else needs it |
| 2 | Feature 3: return visit, s'mores, visited dots | M | Quick, visible win; exercises `memory` |
| 3 | Feature 4: typed terminal | M | Self-contained, and high on personality |
| 4 | Feature 2a (time of day) and 2c (tab return) | M | Independent of the figure's AI |
| 5 | Feature 2b: idle behaviours, including the phone prop | M–L | Builds the action library that feature 1 reuses |
| 6 | Feature 1: incidents | L | Needs the ambient director, the phone prop and travel |
| 7 | Feature 2d (bird) and 2e (wind, grass layer refactor) | M | Polish; measure performance after |

After step 6, check that the incidents log shows up in the terminal's `incidents` command and the ops readout.

## Testing

- **Automated:** follow `scratch/verify_live_flares.js` (headless Edge, CDP on port 922x, `Runtime.evaluate` and `Page.captureScreenshot`). Add one script per feature that:
  - loads with the debug parameters (`?time=night`, `?visit=return`)
  - drives the feature through `window.alive.*`, or sets `localStorage` and then calls `Page.reload`
  - types into the terminal with `Input.insertText` and `Input.dispatchKeyEvent`
  - saves screenshots at the key moments
- **Manual pass for every feature:**
  - reduced motion (DevTools > Rendering > emulate `prefers-reduced-motion`)
  - a 375 px wide touch screen
  - sound on and off
  - a hard refresh with storage blocked
  - the Performance panel with 2d and 2e active (no long frames while panning)

## Open questions for Naeem

1. **Contact details** for `cat contact.txt` and `ping naeem`: email, LinkedIn and GitHub.
2. **The spoken lines.** Every line above is a draft in a light, friendly voice; approve or rewrite them.
3. **Return visits.** Should they always skip the opening, or only within some number of days? The recommendation is always, with `replay intro` available.
4. **Night wash strength** needs a design look at 2a before it ships.
5. **Incidents with a panel open.** The recommendation is no: they only happen while the visitor is exploring.
