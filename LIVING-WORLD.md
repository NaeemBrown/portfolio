# The living world: how it's built

**This is the reference for maintaining and extending the "living world" features:** what exists, where it lives, how it works, how to add to it, and how to test it. The original plan and the build log are in [HANDOFF-living-world.md](HANDOFF-living-world.md).

The five features:

1. **Incidents.** Things in the world break (a street lamp, the lantern, a signpost arm, a server), and he gets paged, walks over and fixes them.
2. **The world runs without you:**
   - the scene follows the visitor's clock hour by hour: a sun that rises and sets, lamps switched on at dusk, mist at dawn, the moon and stars at night, and birds and crickets to hear. A picker in the navbar (with a slider, T, or the terminal's `time`) shows it at any other hour
   - he gets up to things when left alone
   - he dozes off if they leave the tab and wakes when they return
   - a bird perches around the world
   - gusts of wind pass through
3. **It remembers the visitor.** Return visits skip the opening, and s'mores, visited stops and fixes carry over.
4. **The Skills terminal accepts typed commands.**
5. **POI artifacts.** Each destination has a physical object with five
   character-driven idle interactions after its content is put away.

Line numbers go stale; function and section names don't.

---

## Files

| File | What's in it |
|---|---|
| `living.js` (new) | All the new behaviour. **Loaded before `script.js`.** Sections, in order: memory · whether he is free · acting · welcome back · s'mores and the log · where they've been · each frame · idling about · on the run · incidents · the bird · wind · time of day · the sounds of the day · back to the tab · the typed terminal · for testing |
| `living.css` (new) | All the new styles. Loaded after `styles.css`, in sections matching `living.js` |
| `artifacts.js` / `artifacts.css` | The four POI artifacts, their 20 idle interactions, object motion, and test handles. Loaded between the living layer and the main script. |
| `script.js` | About 30 small hooks, each marked `living:`. Run `grep -n "living:" script.js`. Listed below |
| `index.html` | Script and style tags, and new markup: the navbar's time picker and its slider, the sun, stars, mist, wash and lights layers, the phone prop, the run props (watch, readout, mug, drip, headband), the log's tally path, and the terminal's scroll wrapper, output and prompt. Each is marked `<!-- living: … -->` |
| `backup/pre-living-world/` | The four original files, untouched |
| `scratch/living/` | Tests, the test harness, the regression runner and screenshots. See [Testing](#testing) |

**To remove it all:** copy the four files in `backup/pre-living-world/` back over the originals, and delete `living.js` and `living.css`.

---

## Rules that will bite you

1. **One global scope.** `gaits.js`, `living.js` and `script.js` are classic scripts sharing one global scope. A top-level name declared in two of them is a **SyntaxError that stops the later file from running, so the whole site breaks**. Run `node scratch/living/check_globals.js` after every edit; it also checks each file parses.
2. **`living.js` runs first.** At its top level it cannot use anything from `script.js`, because none of it exists yet. Put that code inside functions:
   - functions called each frame (`livingPose`, `livingView`, `livingFrameStart`)
   - event handlers
   - `startLiving()`, which `script.js` calls as its very last line
3. **Never send him somewhere mid-frame.** `frame()` measures how far he is from `state.target` near its top, and `livingPose` runs well after that. A target set mid-frame counts as already reached, and the arrival code **teleports him onto it**. Anything that sets `state.target`, calls `goTo()`, or starts a trip must go through `soon(fn)`. That runs `fn` at the top of the next frame (`livingFrameStart()`, beside the original `leaveStart()`, which exists for the same reason).
4. **Speaking then hushing: use `remark(html, ms)`.** Don't call `speak()` and then `hushSpeech()` straight away. When a bubble is already up, `speak` waits 200 ms on the same timer that `hushSpeech` clears, so the new line never shows.
5. **Scenery DOM only exists after fonts load** (`document.fonts.ready.then(buildSurroundings)` in `script.js`). Code in `living.js` that needs it (lamps, signs, LEDs, grass) queues on the same promise inside `startLiving()`, which runs after.
6. **Keep hand targets small.** Aim hands with `{ hand: [x, y] }` in keyframes (rig units, x forward, y down; the shoulder is at about (70, 74) standing). `postured()` picks the shoulder angle nearest the starting one, so arms don't swing round behind him. Targets further than about 68 units from the shoulder are clamped: the arm goes straight.

---

## How a frame runs

In `script.js`'s `frame()`, in order:

1. **`livingFrameStart()`**, beside `leaveStart()`, runs anything queued with `soon()`.
2. **Movement (unchanged):**
   - The `faceTo` chain now ends `… : ambient.face ? ambient.face : state.facing`, so an act can turn him.
   - `if (state.seat > 0 || ambient.pinned) wanted = 0`, so sitting on the floor holds him until he's up.
3. **`final = livingPose(final, dt, now, unit)`**, just before the cursor-poke reaction. Each frame it:
   - updates the load average
   - counts `idle.quiet`, the seconds `isFree()` has held
   - runs the greeting, tour line, tab return, late-night line, incidents, idle behaviours, bird and wind
   - returns `ambientPose()`: his pose with the current act laid over it
4. **`livingView({ renderX, shift, rise, transform, unit })`**, right after the world is moved. It records the camera (`view`) and the distance walked, moves the lights layer with the world, and runs the sky (`updateSky()`: its hour, the sun, moon, mist and lamps) and the sounds of the day (`updateChorus()`).
5. **Arrival:** `else if (state.destinationId === 'incident') livingArrived();`
6. **Gait:** `ambient.act?.hands ? 'coding'` shows his hand dots during acts.

### All the hooks in `script.js`

| Where | Hook |
|---|---|
| `openPanel` | `livingVisited(id)` records the stop and fills its route dot |
| beside `poseWithPosture` | **`postureAt(keyframes, progress, base)`** and **`postured()`**: shared keyframe playback. `pointerReactionPose` now uses it too |
| `startPointerReaction` | `cancelAmbient()`: a poke stops his act |
| s'mores | `makeSmore()` and `smoreLanding(i, unit)` split out of `launchFlyingSmore`, which calls `livingSmoreThrown()` |
| `buildCamp` | lantern wrapped as `data-fixture="lantern"`, with `s-sparks` |
| `buildOps` | readout wrapped as `data-fixture="readout"`; new `data-fixture="fixed-count"` text; one LED classed `s-led--watch` (`light()` takes a class) |
| `buildStart` | each street lamp wrapped as `data-fixture="lamp-left"` / `"lamp-right"`, with `s-shade` and `s-sparks` |
| `signpost(anchor, arms, name)` | each arm a `.s-arm` group turning about the post; the svg gets `data-sign=name` (`start`, `camp-bench`, `bench-line`) |
| `intro` initialiser | `active: !reducedMotion.matches && !returning` |
| reduced-motion start block | `if (reducedMotion.matches \|\| returning)`: a return visit starts with the N whole, the bag down and the tools docked |
| `frame()` | the six hooks in [How a frame runs](#how-a-frame-runs), and the fire's sound times `fireLoudness()`: louder in the dark |
| `bootTerminal` | `livingTermReset()` at its start, `livingTermReady()` once booted |
| `drawTerminal` | `livingTermNote(camera)` after `placeTermScreen`: lays the sticky note on the bezel through the same camera |
| `showSkill` | `livingTermSkill()` clears the visitor's output |
| `runTerminal` | `term.typing` is also true while the visitor types (`livingTyping.until`) |
| `updateTerminal` | `livingTermClosed()` when the terminal shuts |
| global `keydown` | `if (livingTermKey(event)) return;` first: with the terminal up, letters go to its prompt |
| `touchstart` | a touch on `input` or `.term-screen` doesn't start drag-walking |
| `updateRunFlares` | `livingRunFlare()` picks the next flare, `RUN_FLARES[type]` gives its length and plays it, and `hideRunFlareProps` calls `livingHideRunProps()`. See [On the run](#2f-on-the-run-section-on-the-run) |
| end of file | `startLiving()` |

---

## Acts: what he does by himself

Everything he does on his own is an **act**: a pose laid over the one the gait and stops give him. The code is in the "acting" section of `living.js`.

```js
{ kind, duration,             // seconds; omit it for "until cut short" (settle)
  pose(base, act, dt, now, unit) { return pose; },   // act.t is seconds in
  end(cancelled) {},          // tidy props away; `cancelled` if cut short
  pin: true,                  // holds him in place (sitting); he stands before walking
  outTime: 0.3,               // seconds to ease back out if cut short
  hands: true }               // show his hand dots (data-gait="coding")
```

- **Controls:**
  - `startAct(act)` starts an act, replacing any running one.
  - `cancelAmbient()` eases the current act out.
  - `ambient.face = ±1` turns him while an act runs; it resets when the act ends.
- **`keyframeAct(kind, duration, keyframes, { beats, ...rest })`** plays keyframes through `postureAt`, calling `beats[progress]()` once as it passes each point.
  - Keyframes look like `{ at: 0.4, lean: 6, bob: 2, spin: 0, near: { hand: [106, 98] }, far: { shoulder: -20, elbow: -30 } }`.
  - Use `{ foot: [x, y] }` for a leg.
  - Start with `{ at: 0 }` and end with `{ at: 1 }` so the act comes back to his own pose.
- **What cancels an act:**
  - any `keydown`, `pointerdown` or `touchstart` (a capture listener at the top of `living.js`, which also resets `idle.quiet`)
  - a cursor poke
- **`isFree()`** says whether he's his own man: no opening, no open panel, no stop scene, not moving, not on the line, nobody steering. Idle acts, incidents and the tab-return reaction only **start** while it holds.

### Adding an idle act

1. Write `myAct()` returning an act, next to the others in "idling about" (`stretchAct`, `phoneAct` and so on).
2. Add `['mine', weight, myAct]` to the list in `pickIdle()`. A weight of 0 means never, which lets you gate it by time of day.
3. Add it to `forceIdle` in `window.alive` so tests can call it.

---

## Feature 1: incidents

Section "incidents" in `living.js`; styles under "incidents" in `living.css`.

- **Phases:**
  - `none` → `fail` (it fizzes for `breakTime` s) → `notice` (phone buzzes, he says a line) → `travel` (walks there; `livingArrived()` on arrival) → `fix` (the fix act, whose beats put it right) → `none`.
  - `noticing` waits for him to get up off the floor first.
  - Cut short, it goes to `waiting`. It stays broken, and he goes back once he's been free for 3 s within about 1.2 screen widths of it.
- **When:**
  - never with reduced motion
  - not in the first 20 s after load
  - only while he's been free for 8–14 s
  - only for a fixture on screen (checked once a second)
  - then 60–120 s between incidents (`incident.cooldownUntil`, `incident.after`)
  - he can be interrupted while settled with the laptop, but not mid-way through another act

| id | Where | Breaks | Fix |
|---|---|---|---|
| `lamp-right` / `lamp-left` | street lamps by the name (`buildStart`) | sparks, flicker, then out (the scenery glow and its `.world-lights` glows) | `FIX_THUMP`: two thumps on the post; the first flickers it, the second puts it right |
| `lantern` | camp lantern (`buildCamp`) | same as the lamps | `FIX_TAP`: two taps on the glass |
| `sign` | top arm (Projects) of the camp-to-bench post | swings down to 35° with a creak | `FIX_PUSH`: pushed back up, tapped home |
| `rack` | middle rack's watched LED (`buildOps`) | LED red, board amber and `DEGRADED`, red glow, alarm beeps | `FIX_RESEAT`: cable pulled and pushed home |

- **Each fixture** has:
  - `x()`: world px of the spot he works on
  - `stand`: units away he stands
  - `sides`: `[-1]` for left only, `[-1, 1]` for either
  - `breakTime`, `lines` (what he says when paged), `broken`
  - `fail()`, `out()`, `restore()`
  - `fix: { duration, frames, beats }`
- **The log:** each fix goes to `memory.data.incidents` as `{ id, at, secs }` via `logIncident()`. `sudo` in the terminal logs `{ id: 'sudo', secs: null }`. The ops board's `FIXED n` comes from `memory.data.fixed`.
- **Sounds** are in `noises`: `buzz`, `fizz`, `down`, `up`, `creak`, `clunk`, `alarm`, `thump`. All are built from `sfx.tone` and `sfx.hiss`.

### Adding a fixture

1. **Tag it in its builder in `script.js`:** wrap its shapes with `p.open('class="s-fixture" data-fixture="my-id"')` … `p.close()`. Add a `data-light` glow in `buildLights()` if it gives off light.
2. **Add an entry to `FIXTURES`.** Use `lightFixture({...})` for anything that goes out and comes back. The keyframe hand targets assume the fixture is ahead of him, and `stand` sets how far.
3. **Add CSS** for its broken look under "incidents" in `living.css`.
4. **Test it:** add a case to `scratch/living/test_incidents.js`.

---

## Feature 2: the world runs without you

### 2a. Time of day (section "time of day")

The sky runs on a continuous hour, not four fixed looks. Everything below reads the hour the sky shows, `skyClock.hour`, which travels towards the hour it should be.

- **The hour:**
  - `pickedHour` is the hour (0–24) the visitor picked, or `null` to follow their clock. `skyTarget()` is where the sky is heading: `pickedHour`, or `clockHour()` (their clock, minutes and all).
  - `livingHour()` is `pickedHour`, or the clock's whole hour. It drives the logic: the yawn's hours, the greeting and the late-night line. Picking night (23:00) never sets off "You're up late too?".
  - `?time=dawn|day|dusk|night|late` picks one at load (`PART_HOURS`: 6, 12, 19, 23, and 1 for `late`).
  - Nothing is saved; a reload goes back to the clock.
- **`livingDaypartName(hour)`:** dawn 5–8, day 8–17, dusk 17–21, night otherwise. The part of the sky's hour is set on `.scene[data-daypart]` and `<html data-daypart>`. The bird's roost and the fireflies go by it.
- **Travelling (`sweepSky`):**
  - A pick sets `skyClock.sweep`, and `updateSky()` (called each frame from `livingView`) moves the hour along it, eased, so the sun sets and the lamps come on as it passes.
  - A pick goes forward round the clock unless that's over 15 hours, so day to dawn goes back. It takes 0.28 s an hour, between 1.1 and 3.2 s.
  - The slider's picks (`quick`) go the short way in at most 0.45 s.
  - With reduced motion, or `{ instant: true }`, the sky is simply there. `alive.setDaypart()` and page load are instant.
- **The look (`SKY_KEYS`, top of the section in `living.js`):** keys at set hours, each giving the wash's strength and its three colours (top, middle, floor), the lights' and stars' strength, and the mist. `skyAt(hour)` blends the keys either side. The keys at 6, 12, 19 and 23 are dawn, day, dusk and night at their fullest. Dawn is a cool blue sky over a gold floor, so it can't be mistaken for dusk's purple over orange. **Tune the sky here.**
- **Painting (`paintSky`):** sets `--wash` and `--wash-top/mid/low` on `.sky-wash`, `--lights` on `.world-lights`, `--stars` on `.sky-stars`, and `--mist` on `.sky-mist`, each on its own layer rather than the scene. That keeps a change from restyling the whole world. It only repaints when the hour has moved.
- **The navbar:** `skyIsDark()` works out how dark the top of the washed sky is and sets `<html data-sky="dark|light">`. The destinations go pale only on `dark`, from about 20:00 to dawn, so they stay readable at dusk.
- **The sun** (`.sky-sun`, behind the world at `z-index: 0`):
  - A box as tall as the sky down to the floor line (`floorY + view.rise`), with `overflow: hidden`, so the disc rises and sets behind the floor.
  - `placeSky()` moves the disc (`translate`) from 6% to 94% across the screen between `SUN_UP` (5.3) and `SUN_DOWN` (20.6), highest at midday but never above the navbar.
  - It sets `--sun-low` (1 at the floor, 0 overhead); the CSS makes the sun bigger and redder low down.
  - It fades with the world at the bench and terminal.
- **The moon** (`.moon` in `.sky-stars`) crosses the night from `MOON_UP` (18.6) to `MOON_DOWN` (6.9). It fades in and out at the ends and stays under the navbar, including on phones.
- **Mist** (`.sky-mist`, `z-index: 2`: in front of the world, behind him) lies along the floor at dawn. It's thickest from 5 to 7.5 and gone by 9.
  - Its band of soft banks repeats every `MIST_TILE` (1200 px). `moveMist()` slides it along at 0.85 of the world's speed, plus a slow drift, and a mask parts it round him (`--gap-x`).
  - It's `hidden` whenever there's none.
- **Lamps switched by the hour (`SWITCHED`):** the two street lamps (with their floor pools), the lantern and the workshop come on one by one from 17:06 and go off in turn by 8:00. The fire and the control room's screens are always on.
  - `updateSwitches()` queues each change and makes them at least `SWITCH_GAP` (280 ms) apart, however fast the sky is going.
  - `switchLight()` puts `.is-dark` on the glows and on the lamp's scenery (`[data-fixture]`, whose little `.s-glow` goes too). Switching on, `.is-lighting` plays a flicker by `visibility`, and `noises.flick` clicks if it's on screen.
  - A broken lamp (incidents) keeps its own look: the flicker is skipped while it's `.is-off` or `.is-flickering`.
- **Layers, bottom to top:** the sun; the world; the mist; him; `.sky-wash` (multiplied); `.world-lights` (screened, moving with the world); `.sky-stars` (stars and moon, the top 22%). Panels, the speech bubble and the navbar sit above them all.
- **Lights** are built in `buildLights()`:
  - both street lamps, each with a floor pool
  - the lantern
  - the fire
  - the workshop (`data-light="shop"`)
  - the ops board and racks
  - 9 fireflies at camp (dusk and night only)

  Add one with `glowAt(anchor, x, y, size, kind, { id })`, where the kinds are `lamp`, `pool`, `fire`, `shop`, `screen` and `firefly`. To have it switched by the hour, add it to `SWITCHED`.
- **Late-night line:** between midnight and 5 am, after 4 s left alone, he says "You're up late too?" once a night (`memory.data.lateNightOn`).

#### Picking a time

- **The picker** (`.time-picker`, the navbar's top left):
  - Four buttons, dawn, day, dusk and night, with `aria-pressed`. The part the sky is heading for is pressed and named, and the others show only their icon. A dot (`.is-now`) marks the part it really is for the visitor.
  - `pickTime(part)` shows `part`. Picking the part it really is sets `pickedHour` back to `null`. `pickHour(hour, { quick, instant })` is the general form. `updateTimePicker()` keeps the buttons, the slider and its clock in step, and runs again when the clock's minute turns.
  - It's hidden until the sound button lands in the opening (`.navbar:has(.sound-toggle.is-waiting)`), then fades in.
- **The slider** (`.time-picker__scrub`): any hour, in 15-minute steps. It sits in a pill of its own under the picker and shows on hover or focus, lingering a moment. On touch screens it's always shown.
  - Its track is the sky through the day. Its clock says `now` while the world follows theirs, and otherwise the hour picked. `aria-valuetext` reads like "18:30, dusk".
  - There's no slider at 760 px and below, where the route sits right under the picker.
- **T** steps on to the next part of the day (`stepTime()`). It's ignored while the picker is hidden, in text fields, and at the terminal, where letters go to the prompt.
- **The terminal's `time`:** `time` says where the world's clock is. `time dusk`, `time 06:30`, `time noon` (also `sunrise`, `morning`, `afternoon`, `sunset`, `evening`, `midnight`) set it, and `time now` goes back to the visitor's clock.
- **His reaction:** picking by the buttons, T or the slider (once let go), `greetTime()` has him yawn going into night or stretch going into dawn, but only if he's free and doing nothing else. Not with reduced motion.
- **Widths:** the pressed part is named only above 1000 px. At 760 px and below the picker shares the top row with the sound button. At a stop (when "Continue journey" shows) it folds down to the pressed button alone, and clicking that steps the time on; the click handler spots the fold because the other buttons are hidden. The navbar has a 16 px `column-gap` so the destinations never touch it.
- Its controls are real `<button>`s and an `<input>`, so the global `keydown` and touch-drag handlers leave them alone.

#### The sounds of the day (section "the sounds of the day")

With sound on, `updateChorus()` (each frame, from `livingView`) plays the hour the sky shows:

- **Birds** (`birdsong(hour)`, 0 to 1): a full chorus from 5:36 to 8:30, fewer by 10, a few through the day, none after 19:48. `birdPhrase()` is 2 to 5 quick notes, going up or down, quieter than the bird's own chirp.
- **Crickets** (`crickets(hour)`): from 19:36, full from 21:00 to 4:30, gone by 5:24. `cricketChirp()` is three quick pulses at 4.4 or 4.85 kHz, every 0.45–1.15 s.
- **The fire** is up to half as loud again in the dark: `fireLoudness()`, which multiplies the level in `script.js`'s `sfx.fire(…)` call (a `living:` hook).

### 2b. Idle behaviours (section "idling about")

- **When:** after `idle.next` seconds free (8–14 s, then 6–12 s after each act), he does one of:
  - `look`: turns to the cursor and looks up or down at it; without a mouse, glances back
  - `stretch`
  - `phone`
  - `kick`: scuffs a `.world-pebble` along the floor, keeping at most 5
  - `yawn`: 10 pm to 7 am only
- **Settle:** after `SETTLE_AFTER` (35 s) he sits on the floor with the laptop, typing in bursts and glancing up. This uses the opening's `floorSitPose`, `lapAt`, `onLaptop` and `placeLaptop`. It's pinned, so he stands before walking off.
- **The phone** is `.prop-phone` in the near hand in `index.html`, shown with `showPhone(shown, buzzing)`. Incidents share it.

### 2c. Back to the tab (section "back to the tab")

- **Leaving the tab:** `visibilitychange` suspends the audio context while the tab is hidden, and resumes it after.
- **Coming back** after more than 20 s, if he's free: `dozeAct`. He's asleep on the floor with a `zzz…` bubble, jolts awake and says a line that depends on how long they were gone:
  - under 2 min: "Oh! You're back."
  - under 30 min: "Oh hey, welcome back."
  - longer: "I kept the fire going."
- **Reduced motion:** the line only.

### 2d. The bird (section "the bird")

- **`birdPerches()`** lists 17 spots, each computed from the scenery's own numbers: lamp heads, letters E, M, B, R and the last N, fingerposts, the tent peak, the lantern pole, the pine, the workshop roof and sign, and the ops wall. To add a perch, append `at(anchor, x, y)`.
- **Modes:** `perched` (fidgets: turns, pecks, sometimes chirps on screen), `flying`, `away` (off-screen 8–20 s, then flies back in to a perch in view) and `roosting` (all night, hidden).
- **It flushes when:**
  - he's within 1.4 body heights moving faster than a walk
  - he's within 0.6 body heights at any speed
  - he jumps within 2
  - the cursor comes within 50 px
  - he's fixing something within 2
- **Reduced motion:** it stays perched.

### 2e. Wind (section "wind")

- **Timing:** a gust every 15–30 s lasts `GUST_TIME` (2.6 s). The class `.world.is-gusting` and `--gust-dir` (±1) drive it all in CSS:
  - grass shears from the floor
  - trees lean
  - the fire's smoke and embers blow over
  - `blowLeaves()` sends 5 leaves across
  - `braceAct` has him lean into it if he's free
- **Grass layers:** `separateGrass()` moves each set's `.s-grass` paths onto `.set--grass` layers after the scenery is built, so bending them doesn't repaint the big scenery SVGs. The builders are untouched.

### 2f. On the run (section "on the run")

Seven things he does while running, on top of `script.js`'s own two run flares (a swig from his bottle, a wipe of his brow). None with reduced motion. Pictures: `node scratch/living/shot_run.js` (`close_*`).

**In the flare rotation.** `script.js`'s `updateRunFlares` starts a flare after about half a second of running, then waits 2.5–6 s. Three `living:` hooks there make ours part of it:

- `livingRunFlare()` picks the next flare, or returns null for one of the originals. A coffee comes first on a morning visit (5 to 11 by the sky's clock), once. A stumble comes about one flare in eight after the first two, once a visit, never sprinting. Otherwise it's a watch check a third of the time.
- `RUN_FLARES[type].pose(t, final, fade, flare)` plays it. `t` runs 0..1, `fade` is the original's speed fade, and `flare` keeps its state.
- `livingHideRunProps()` is called from `hideRunFlareProps`.

| Flare | Length | What he does |
|---|---|---|
| `pace` | 3.4 s | Wrist up in front of his face; the other hand taps it. The readout over the wrist (`.prop-readout`, mirrored back when he faces left) says `♥ 142`, then his real pace from his speed (`paceText`, 242 units ≈ 1.8 m) |
| `coffee` | 6.5 s | A mug (`.prop-mug`) held in front of his chest with the bob taken out, and turned upright whatever the arm does, so it stays level. A drop falls (`.prop-drip`) and leaves a splash in the world (`.world-splash`). He takes a sip and puts it away |
| `stumble` | 2.3 s | His near toe catches and he pitches forward. His arms windmill one full turn, done while they're fully his so the turn doesn't show as a jump. A pebble is left lying where he tripped (`.world-pebble`), and he says "Who put that there?" |

**By what's around him.** `updateRunMoves()`, called from the end of `livingPose`, lays these over his pose. While one has his arms (a slap, the ninja run, a kick or a hurdle), it holds `runFlareState.cooldown` up so no flare starts.

- **Lamp-post tap** (`updateTap`, `knockPost`):
  - **Posts** (`runPosts`): both street lamps and the three fingerposts. Running, one of them 55–150 units ahead has a one-in-three chance (`TAP_CHANCE`) of being slapped. The next can be picked up as soon as a slap lands, since the right lamp and the first fingerpost are only a few strides apart.
  - **The slap:** his near hand eases out to the post and lands at 48 units ahead. The post rocks on its foot (`.is-tapped`, `post-rock`, `--tap` = which way he ran). A lamp turns about the foot of its post, set as `transform-origin` in its set's view-box units. A fingerpost's set is lifted by `translateY(-100%)`, so it turns about `50% 0`.
  - **Knock-on effects:** a lamp that's on flickers, and a perched bird within 70 units flies off.
- **Hurdle the bush** (`updateHurdle`): sprinting at one of the two bushes by the name (`runBushes`), he takes off when it's as far ahead as he'll cover in 0.27 s, so it passes under him halfway. `state.hop` gets `{ duration: 0.52, height: 54, hurdle: true }`, and `script.js` flies it and lands him. The hurdler's split is laid over the hop: lead leg straight out, trail leg tucked, reaching for his toe.
- **Ninja run** (`updateNinja`): after holding Space for `NINJA_AFTER` (3 s) at a sprint, his arms sweep straight back and he tips forward (his normal sprint leans back). A headband (`.prop-headband`) appears with its tails flapping, and the speed lines quicken (`.speed-lines.is-ninja`). It eases out when he stops.
- **The bug chase** (`updateBug`, `spawnBug`, `moveBug`, `flipBug`):
  - **When:** sprinting for over 1.2 s, about once every 9 s at most, and at least 25–50 s apart.
  - **The chase:** a beetle (`.world-bug`) comes from behind at his speed plus `BUG_SPEED` (230 px/s). At 72 units behind him he flicks his heel back.
  - **The flip:** it lands on its back, legs waving, then fades. He says "Bug fixed.", and it's logged as a fix (`logIncident('bug', secs)`), so `incidents` in the terminal and the ops board's count include it.
  - **If he turns to face it,** it runs off.

**Props** (in the figure, `index.html`): `.prop-watch` and `.prop-mug` in the near forearm, `.prop-headband` in the torso, and `.prop-readout` and `.prop-drip` in the rig's root. Their styles are under "on the run" in `living.css`. The figure draws with a 4px stroke and no fill, so each prop sets its own.

---

## Feature 3: it remembers the visitor

- **Storage:** `localStorage['cv_memory_v1']` holds this object; every access is wrapped in try/catch.

  ```js
  { visits, firstAt, lastAt, smores, visited: { about, projects, experience, skills },
    toured, incidents: [{ id, at, secs }], fixed, lateNightOn }
  ```

  - `memory.save()` batches writes (250 ms), `memory.flush()` writes now (also on `pagehide`), and `memory.forget()` wipes it.
  - The existing `cv_sound_enabled` key is separate and unchanged.
- **Return visits:** `returning` is true if they've been before, and set before this visit is counted.
  - `?visit=first` or `?intro=1` forces the opening; `?visit=return` forces the greeting.
  - A return visit skips the opening. The world is set up as with reduced motion, and `updateGreeting()` has him wave and say `greetingLine()`:
    - "Back already?" under 10 min
    - "Twice in one day?" under 12 h
    - "Oh hey, it's been a while!" over 30 days
    - otherwise "Morning!", "Evening!" or "Welcome back!" by the hour
  - Then he walks to the fire, through `soon()`.
- **S'mores:** every s'more he throws is counted. `restoreSmores()` lays the last dozen back down on load, and `carveTallies()` scratches up to 20 tally marks into the log (`.camp-seat__tally`).
- **Visited stops:** `livingVisited(id)` (from `openPanel`) fills that stop's route dot (`.is-visited`: a dot in the ring). The first time all four are seen, `updateTour()` has him say thanks once he's back out in the world.

---

## Feature 4: the typed terminal (section "the typed terminal")

- **Markup:** everything on the CRT glass is inside `.term-scroll`. After the skill output come `.term-print` (the visitor's commands and output; a polite live log) and the prompt `.term-line--input` with `input#term-input`.
- **Keys:**
  - With the terminal up, any printable key except Space focuses the prompt and lands in it (`livingTermKey`), so A, D and W type rather than walk.
  - Esc blurs the prompt; the arrow keys then walk away as before.
  - A click on the glass (not on a group) focuses the prompt.
  - In the prompt: Enter runs, ↑ and ↓ step through history, Tab completes.
- **Scrolling:** once they type (`termState.shell`), a MutationObserver keeps the last line in view, and old lines scroll off the top. Clicking a skill group clears the visitor's output and scrolls back to the top.
- **Output:** `termSay(lines, { gap, kind })` queues lines through the terminal's own queue, marked `cmd` so a new command finishes the old one at once (`termFlush`). The kinds are `out`, `dim`, `err` and `cmd`. **Everything the visitor types is inserted as text only.**
- **Commands** are in `TERM_COMMANDS`, with aliases added just after it.
  - **Listed in `help`:** `whoami`, `uptime`, `date`, `time` (see [Picking a time](#picking-a-time)), `ls`, `cat`, `cd`, `skills`, `ping`, `history`, `clear`, `neofetch`, `incidents`, `exit`, `forget`, `help`, `replay intro`.
  - **Hidden:** `sudo` (refused, reported, head shake), `rm -rf /` (the screen's lines fall, it goes dark, he thumps the desk, it reboots "from backup"), `vim`/`:q`, `emacs`, `nano`, `top`, `coffee`/`make coffee`, `echo`, `pwd`, `uname`, `man`, `su`, `hello`/`hi`/`hey`.
- **Adding a command:** add `name: (args, line) => termSay(...)` to `TERM_COMMANDS`. If it should appear in `help` and Tab completion, add it to `TERM_LISTED` and to the `help` text. If it moves him, wrap that in `soon()`.
- **`CONTACT`** (top of the section) holds the email and LinkedIn shown by `cat contact.txt` and `ping naeem`. GitHub is empty, so it's left out; any empty field is skipped. The details are plain text, not links.
- **Reduced motion:** `rm -rf /` prints GNU's real failsafe message instead of the crash.

## Feature 5: POI artifacts

After a destination panel is closed, generic idle behaviour is replaced by
five small interactions with the object at that stop. Input cancels them like
every other ambient act, and reduced motion leaves the artifacts still.

| POI | Artifact | Idles |
|---|---|---|
| About | traveller's field journal | turn page, write, check compass, catch leaf, close/reopen |
| Projects | clockwork prototype | measure, tighten, crank gears, spark/tap, admire |
| Experience | career wayfinder | trace route, flip slats, stamp ticket, pull signal, check watch |
| Skills | portable network analyzer | tune dial, diagnose, reseat cable, trace waveform, wipe screen |

`artifacts.js` builds all four with `worldSet`, chooses an artifact idle through
`poiArtifactPick`, and exposes `alive.forceArtifact(poi, motion)` for tests.
The objects use the existing scenery palette and disappear with the same
camera/world fade as their destination. `test_artifacts.js` exercises all 20.

### The sticky note, and his line about it

- **The note** (`.term-note` in `index.html`, inside `.term-panel` next to `.term-screen`) lists commands to try: help, whoami, ls, cat about.txt, cd projects, ping naeem, neofetch, "…and sudo ;)".
  - **Wide screens:** `livingTermNote(camera)` lays it on the monitor's bezel at the top left through the terminal's camera, as `placeTermScreen` lays the screen on the glass. It hangs off the bezel's edge and covers the little yellow note drawn there.
    - The corners are in `noteCorners()` (bezel face x 62; z from `MZ - 153` to the glass edge at `MZ - 104`; y 247 to 307, a little askew).
    - It's sized once per scene size for where the camera ends up, with font size = height / 13.6. So to change what's on it, keep it to about nine lines, or change the corners.
  - **Phones** (`narrowScreen`): the monitor fills the width, so it sits on the desk at the bottom left (`.is-on-desk`) with four commands.
- **Clicking a command** on it types it in at the prompt a letter at a time and runs it (`typeFromNote`). A real key pressed meanwhile stops the auto-typing, so it never types over the visitor.
- **His line:** about 1.4 s after the terminal is up (`TERM_NUDGE_AFTER`), if they haven't typed a command yet this visit, he says **"Hmm, developer might want me to enter these commands."** (`TERM_NUDGE`).
  - `updateTermNudge()` (called from `livingView`) keeps the bubble over his 3D head: it reads the head circle `termRig.parts.head` and lifts the bubble above the terminal (`.intro-speech.is-at-terminal`, z-index 6).
  - The bubble goes after about 4.4 s, as soon as they type or click a command, or when they leave.

---

## Testing

Everything runs from Node 18+ with the Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, headless, driven over CDP.

| Command | Checks |
|---|---|
| `node scratch/living/run_all.js` | **everything below, in turn, with a pass/fail summary** |
| `node scratch/living/check_globals.js` | no top-level name clashes; every file parses (**run after every edit**) |
| `node scratch/living/baseline.js` | the page loads with no errors |
| `node scratch/living/test_memory.js` | first visit, return visit, greeting, s'mores and tallies, visited dots, tour, no teleport |
| `node scratch/living/test_terminal.js` | the sticky note and his line over his head, clicking a note command, typing over the note's typing, typing without a click, every main command (`time` included, and T typed at the prompt not stepping the time), no markup injection, history, Tab, clear, `rm -rf /`, `cd` (no teleport), phone size, Esc then arrows. Pictures: `node scratch/living/shot_note.js` |
| `node scratch/living/test_daynight.js` | each daypart (screenshots `day_<part>_*`), late-night line, doze and wake, standing up before walking |
| `node scratch/living/test_timepicker.js` | picking a time: the picker hidden in the opening; day to night travelling forward round the clock, the lamps coming on one at a time, the wash, stars, sun down, moon up (under the navbar), pale navbar words, the bird's roost, the fire louder, his yawn; dawn (sun low left, mist, lamps on, his stretch); the lamps going off in turn; dusk readable with the sun low right; back to the clock; keys on the picker; T; the slider (hover, 18:30, quick); crickets at night and birds at dawn; reduced motion; no overlaps at eight widths from 320 to 1440 px with and without the Continue button; the phone (no slider, the moon clear of the route, folding). Screenshots `picker_*` |
| `node scratch/living/test_idle.js` | each idle act, starting by himself, settling after 35 s, standing up on input |
| `node scratch/living/test_run.js` | on the run: the watch (heart rate, then pace), the stumble (pitch, windmill, pebble, line), the morning coffee (first flare, upright, steadier than his head, splash), slapping a lamp and a fingerpost, hurdling the bush, the ninja run, the bug (flicked, said, logged), reduced motion. Pictures: `shot_run.js` |
| `node scratch/living/test_artifacts.js` | all four artifacts, all 20 character/object idles, cleanup, and screenshots |
| `node scratch/living/test_incidents.js` | all four fixture types end to end, logging, the ops count, steered off then back, starting by itself, reduced motion |
| `node scratch/living/test_bird.js` | perching, flushing, landing elsewhere, cursor scare, night roost, reduced motion |
| `node scratch/living/test_wind.js` | grass layers, gust effects, leaves, brace, automatic gusts, reduced motion |
| `node scratch/living/test_smoke.js` | a first visit's whole opening through to the About letter; phone size; reduced-motion first and return visits; no page errors |
| `node scratch/living/regress.js [name]` | runs the site's older `scratch/*.js` tests on throwaway copies (own Edge profile, screenshots into `scratch/living/shots/regress/`, logs beside them) |

Screenshots land in `scratch/living/shots/`. There are also `shot_acts.js`, `shot_bird.js`, `shot_greeting.js`, `shot_terminal.js` and `shot_introsit.js` for pictures only.

- **Harness** (`scratch/living/harness.js`):

  ```js
  open({ query, width, height, reducedMotion, touch })
  // returns a page with: eval, until, wait, shot, key, keyDown, keyUp,
  //   type, move, click, reload, close, errors
  ```

  Each run uses a throwaway Edge profile, and `close()` kills every process using it. Always `await page.close()`.
- **Debug handles** are on `window.alive`:
  - `memory`, `returning`, `ambient`, `idle`, `incident`, `bird`, `sky` (`skyClock`: the hour, any sweep), `lamps` (which are lit)
  - `isFree()`, `forget()`
  - `runFlare(type)` (`pace`, `coffee`, `stumble`, `hydrate`, `sweat`, now if he's running), `spawnBug()`, `runMove` (`always` slaps every post), `runStats`, `forceIdle(kind)`, `forceIncident(id)`, `simulateAway(seconds)`, `setDaypart(part)` (same as the picker, without his reaction), `gust(dir)`, `perchBird(i)`
- **Query parameters:** `?time=…`, `?visit=first|return`, `?intro=1`.
- **Headless timing:** headless Edge runs at a low frame rate, and `dt` is capped at 0.05 s, so act time runs slower than wall time. Wait on conditions (`page.until`), not fixed delays.

## Not done, and open questions

- **GitHub** for the terminal's `CONTACT` (optional; email and LinkedIn are in).
- **The pegboard hammer** incident from the plan isn't built. It's optional; add it through `FIXTURES`.
- **His spoken lines are drafts:** `greetingLine`, the fixtures' `lines`, `dozeAct`, `updateLateNight`, `updateTour`, `finishIncident`.
- **The night wash strength** wants a design look (the night keys in `SKY_KEYS`, `living.js`).
- **The sticky note's markup is missing.** `.term-note` is no longer in `index.html` (it went in an edit made outside this work, at 20:28 on 24 Sep). The code copes without it, but `test_terminal.js` stops at its first check until the note is put back or the test is changed.
- **Unchanged by this work:** the About, Projects and experience copy is still placeholder text.
