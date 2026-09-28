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
| `teleports.js` / `teleports.css` | Teleporting: the double tap on the navbar, the ten moves and their rounds, and the hint. Loaded after the living layer, before `script.js`. See "2g. Teleporting" |
| `clickables.js` / `clickables.css` | The ten things that answer a click, his reactions to them, and what's found. Loaded after `teleports.js`, before `script.js`. See "Feature 9" |
| `idles.js` / `idles.css` | The daypart idles: ten acts of his own for each part of the day, the props and scenery they need (a grove, a copse, birches, woods, two path lamps), and what they draw round him. Loaded after `clickables.js`, before `script.js`. See "Feature 10" |
| `artifacts.js` / `artifacts.css` | The four POI artifacts, their 20 idle interactions, object motion, and test handles. Loaded between the living layer and the main script. |
| `script.js` | About 30 small hooks, each marked `living:`. Run `grep -n "living:" script.js`. Listed below |
| `index.html` | Script and style tags, and new markup: the navbar's time picker and its slider, the sun, stars, mist, wash and lights layers, the phone prop, the run props (watch, readout, mug, drip, headband), the daypart idles' props, the ridges and the Milky Way, the log's tally path, and the terminal's scroll wrapper, output and prompt. Each is marked `<!-- living: … -->` |
| `case.js` / `case.css` / `cases/` | The case study: "Detailed view" on the Projects sheet zooms the sheet into a whole page about the project, and he walks its floors. The words are in `CASES` in `case.js`, the screens in `cases/`. See "Feature 6" |
| `chalkboard.js` / `chalkboard.css` | The Experience stop: a long chalkboard he writes his career on, with the camera moving round him. Loaded before `script.js`. See "Feature 7" |
| `cv/` | The printable CV. Change the words in `cv/index.html`, then `node cv/build-pdf.cjs` prints it to `cv/Naeem-Brown-CV.pdf` (one A4 page; check the text reads in order with `pdftotext -enc UTF-8 cv/Naeem-Brown-CV.pdf -`). The About letter links to the PDF |
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
7. **Keep frames cheap.** `frame()` runs at the screen's rate (144 times a second on some), and the page has only about 7 ms for each frame. Anything touched in a frame is restyled, repainted and composited again, so:
   - **Write only on a change.** `setStyle` skips an unchanged inline style. An attribute (`hidden`, `class`, `d`) set to what it already was still costs a restyle, and `hidden` or `class` makes the page check its `body:has()` rules again.
   - **Don't read layout in a frame** (`offsetWidth`, `getBoundingClientRect`) after writing styles: it forces a whole style and layout mid-frame. Keep sizes instead: the speech bubble's are `speechWidth` and `speechHeight` in `script.js`, kept by a `ResizeObserver`.
   - **Stop animations that can't be seen.** Every running CSS animation is restyled every frame, seen or not, and an SVG one is repainted too. Hide what is out of use with `display: none`, not `opacity: 0` (the entrance rain and snow). The stars stop by day (`.sky-stars.is-out`), the mug's steam while it is put away, and `restWhenAway()` in `living.js` pauses the endless ones in the world while their part of it is over half a screen off.
   - **Particles go on a canvas.** Each animated element gets a compositor layer of its own, so a hundred specks of dust cost a hundred layers. The dust is drawn by `drawDust()` on one canvas at the end of the world.
   - **Camera-drawn SVG is redrawn only when the camera turns or zooms.** The bench and the console are moved over (`shiftDrawn`) while the camera only slides. Don't give those groups `will-change`: SVG leaves out what was off screen when it was painted, so a group the compositor moves loses it. The chalkboard's camera never stops during its show, so it is painted on a canvas instead (Feature 7).
   - **Hide what can't be seen, don't just make it clear.** A layer at `opacity: 0` is still rastered whenever its content changes: the Milky Way (`.sky-galaxy.is-out`) and the chalkboard lamp's light are hidden outright by day and during the close ups.
   - **Measure in real Chrome** with the GPU on: `node scratch/perf_frames.js` (see Testing).

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
| `drawTerminal` | `livingTermNote(camera)` after `placeTermScreen`: laid the sticky note on the bezel; does nothing now the note is gone |
| `showSkill` | `livingTermSkill()` clears the visitor's output |
| `runTerminal` | `term.typing` is also true while the visitor types (`livingTyping.until`) |
| `updateTerminal` | `livingTermClosed()` when the terminal shuts |
| global `keydown` | `if (livingTermKey(event)) return;` first: with the terminal up, letters go to its prompt |
| `touchstart` | a touch on `input` or `.term-screen` doesn't start drag-walking |
| `updateRunFlares` | `livingRunFlare()` picks the next flare, `RUN_FLARES[type]` gives its length and plays it, and `hideRunFlareProps` calls `livingHideRunProps()`. See [On the run](#2f-on-the-run-section-on-the-run) |
| end of file | `startLiving()` |
| `SOUND_FILES` | the clickables' 28 sound groups, `stoneC4` to `wishChime` |
| `buildCamp`, `buildShop`, `buildOps` | tags for the clickables: `.s-tent`; the axe redrawn as `.s-axe` (its handle towards the chopper), `.s-block`, `.s-half` and six hidden `.s-spare` logs; each tool a `.s-tool[data-tool]`; the clock's hands as `.s-hand`; a `data-fixture="found-count"` line on the ops board |
| arrival in `frame()` | `else if (state.destinationId === 'clickable') clickArrived();` |
| `touchstart` | `.click-hit` and clickable stars count as controls: no drag walking from a tap on one |

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

One for any hour:

1. Write `myAct()` returning an act, next to the others in "idling about" (`stretchAct`, `phoneAct` and so on).
2. Add `['mine', weight, myAct]` to the list in `pickIdle()`. A weight of 0 means never, which lets you gate it by time of day.
3. Add it to `forceIdle` in `window.alive` so tests can call it.

One for a part of the day: add it to `IDLE_ACTS` in `idles.js` (see "Feature 10"). `pickIdle()` and `forceIdle` find it there.

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
  - It shows tonight's real phase: `moonPhase()` works it out from the visitor's date (a known new moon and the length of a lunar month), and `moonLit(phase)` draws the lit part as an SVG path, lit on the right while it waxes and the left as it wanes, with a faint dark disc for the rest. Its glow is as bright as it is full (`--moon-lit`). Picking a time changes the hour, not the night, so the phase stays today's.
- **The stars** are spread a little wider than the screen, and one of them (`.is-planet`) is a planet: warm and steady, with no twinkle. They wheel slowly through the night about a point far below the floor, level at midnight and `WHEEL` (0.45) degrees an hour either side: `placeSky` sets `--wheel` and `--pivot-y`, and each star turns about that point with container units (`.sky-stars` is a size container). The shooting star from a wish leaves from where the star is on the screen (clickables.js).
- **The Milky Way** (`.sky-galaxy`, built by `buildGalaxy`) is a soft band from low on the left to high on the right, dusted with faint stars along its middle and a dark lane through it. It's over the wash like the stars (screened), as bright as they are (`--stars`), fades out before it reaches the scenery (a mask), and wheels with them.
- **The ridges** (`.sky-ridges`, `RIDGES`): three hill lines behind the world and in front of the sun, the furthest palest and highest. Each is an SVG strip a little longer than the screen whose outline repeats (a few sines that each fit the repeat), with small pines along the nearer two. `moveRidges` (each frame, from `updateSky`) slides each at its fraction of the world's movement on screen (0.12, 0.24, 0.42), its foot on the floor line, and `buildRidges` redraws them when the size changes. They're under the wash, so the time of day tints them as it does the scenery, and the dawn mist lies in front of them. They fade with the world at the bench and the terminal.
  - The moon and stars fade with the world at the bench and terminal, as the sun does, so a time picked there (say with the terminal's `time night`) doesn't hang a moon over the close up. Screenshots: `node scratch/living/shot_moon_closeup.js`.
- **Mist** (`.sky-mist`, `z-index: 2`: in front of the world, behind him) lies along the floor at dawn. It's thickest from 5 to 7.5 and gone by 9.
  - Its band of soft banks repeats every `MIST_TILE` (1200 px). `moveMist()` slides it along at 0.85 of the world's speed, plus a slow drift, and a mask parts it round him (`--gap-x`).
  - It's `hidden` whenever there's none.
- **Lamps switched by the hour (`SWITCHED`):** the two street lamps (with their floor pools), the lantern and the workshop come on one by one from 17:06 and go off in turn by 8:00, and the two path lamps by the grove (`idles.js`, `IDLE_PATH_LAMPS`) at 18:48 and 19:12. The fire and the control room's screens are always on.
  - `updateSwitches()` queues each change and makes them at least `SWITCH_GAP` (280 ms) apart, however fast the sky is going.
  - `switchLight()` puts `.is-dark` on the glows and on the lamp's scenery (`[data-fixture]`, whose little `.s-glow` goes too). Switching on, `.is-lighting` plays a flicker by `visibility`, and `noises.flick` clicks if it's on screen.
  - A broken lamp (incidents) keeps its own look: the flicker is skipped while it's `.is-off` or `.is-flickering`.
- **Layers, bottom to top:** the sun; the ridges; the world; the mist; him; `.sky-wash` (multiplied); `.world-lights` (screened, moving with the world); `.sky-galaxy` (the Milky Way, screened); `.sky-stars` (stars and moon, the top 22%). Panels, the speech bubble and the navbar sit above them all.
- **Lights** are built in `buildLights()`:
  - both street lamps, each with a floor pool
  - the lantern
  - the fire
  - the workshop (`data-light="shop"`)
  - the ops board and racks
  - 9 fireflies at camp (dusk and night only)

  Add one with `glowAt(anchor, x, y, size, kind, { id })`, where the kinds are `lamp`, `pool`, `fire`, `shop`, `screen` and `firefly`. To have it switched by the hour, add it to `SWITCHED`.
- **Late-night line:** between midnight and 5 am, after 4 s left alone, he says "You're up late too?" once a night (`memory.data.lateNightOn`). Until he has, `updateIdle` holds his acts back, so the night's longer ones never push the line out.

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

- **When:** after `idle.next` seconds free (3 to 5 s, `IDLE_FIRST`, then 2 to 4 s after each act ends, `IDLE_GAP`), he does one of:
  - `look`: turns to the cursor and looks up or down at it; without a mouse, glances back
  - `stretch`
  - `phone`
  - `kick`: scuffs a `.world-pebble` along the floor, keeping at most 5
  - `yawn`: 10 pm to 7 am only
- **And ten of each part of the day's own** (`idles.js`, "Feature 10"), which suit where he is and what's about. The five above are weighted lower now (look 2, stretch 1, phone 2, kick 1, yawn 2) so the part of the day's own come up often, and none of the last three he did comes up again (`idleRecently`).
- **Settle:** after `SETTLE_AFTER` (35 s) he sits on the floor with the laptop, typing in bursts and glancing up. This uses the opening's `floorSitPose`, `lapAt`, `onLaptop` and `placeLaptop`. It's pinned, so he stands before walking off. At dusk with the sun on screen he may sit and watch it go down instead, and at night lie back and look at the stars (`idleSettleAct`).
- **The phone** is `.prop-phone` in the near hand in `index.html`, shown with `showPhone(shown, buzzing)`. Incidents share it.

### 2c. Back to the tab (section "back to the tab")

- **Leaving the tab:** `visibilitychange` suspends the audio context while the tab is hidden, and resumes it after.
- **Coming back** after more than 20 s, if he's free: `dozeAct`. He's asleep on the floor with a `zzz…` bubble, jolts awake and says a line that depends on how long they were gone:
  - under 2 min: "Oh! You're back."
  - under 30 min: "Oh hey, welcome back."
  - longer: "I kept the fire going."
- **Reduced motion:** the line only.

### 2d. The bird (section "the bird")

- **`birdPerches()`** lists 26 spots, each computed from the scenery's own numbers: lamp heads, letters E, M, B, R and the last N, fingerposts, the tent peak, the lantern pole, the pine, the workshop roof and sign, the ops wall, and (from `idlePerches` in `idles.js`) the oaks' low branches and crowns, the path lamps and the tall birch. To add a perch, append `at(anchor, x, y)`.
- **For the daypart idles** it also has a `visit` mode (down on the floor beside him for his lunch, held there by the act) and `bedtime` (seen off to roost at dusk, it stays there till morning).
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

### 2g. Teleporting (`teleports.js`, `teleports.css`)

Double tap a place on the navbar (double click, with a mouse) and he teleports there instead of walking, by one of ten moves. They are the ten pitched in the "Teleport Pitches" artifact, all built. Test: `node scratch/living/test_teleport.js`. Pictures of every move at its key beats: `node scratch/living/shot_teleports.js` (`tp_<move>_<n>.png`; pass `move` or `move:phase:t` for just some).

`teleports.js` loads after `living.js` and before `script.js`, and like `living.js` only uses `script.js`'s globals inside functions. `living.js` calls into it from three places: `livingPose` ends with `updateTeleport`, `startLiving` binds `navTapped` to the navbar's buttons, and `isFree()` is false while `teleport.phase` is set.

- **The taps** (`navTapped`): `script.js`'s own click already sends him walking with `goTo`. A second click on the same place within `TELEPORT_TAPS` (350 ms) calls `startTeleport`, unless he's already there or nearer than `TELEPORT_MIN` (1.2 body heights).
- **Which move** (`teleportRound`, `nextMove`, `useMove`): the moves come in shuffled rounds, each once a round, and the round is kept in `memory.data.teleportRound`, so it carries on next visit and a visitor who keeps teleporting sees all ten. A new round never opens with the move that closed the last (`memory.data.teleportLast`). A move is only used up once he has gone by it: one called off comes up again next time. `memory.data.teleportsSeen` records which they've seen.
- **The engine** (`updateTeleport`, in `teleport.phase`):
  - `wait`: until `clearToGo()`, so from a stop he's up from the fire, back from the bench or the console, and off the line first.
  - `focus`: he pulls up hard (pinned through `ambient.pinned`) while the move's `gather` runs. Once he's still and `focus` seconds in, the move is used up and he goes.
  - `gone`: the move's `go` runs. At `cut` seconds `teleportLand` runs from `soon()`, and the world cuts to the stop.
  - `appear`: after `gap`, the move's `arrive` runs for `settle` seconds.
- **A move** (`TELEPORT_MOVES`): `{ name, focus, cut, gap, settle, gather, go, arrive, end, freeze }`. Each of `gather`, `go` and `arrive` gets `(t, pose, c)` and returns his pose. Through `c` it:
  - sets how he's drawn (`c.look`, applied by `applyLook`): `opacity`, `sx` and `sy` (squeezed about his feet, with the CSS `scale` property, which stacks with the `transform` that `script.js` writes), `dx` and `dy` (the `translate` property), `clipTop` and `clipBottom` (a `clip-path`, in px of his box), and `scan` (striped with a mask);
  - draws on two svgs over the scene, in the scene's px: `c.back` under him (z-index 2) and `c.front` over him (right after him, so the sky's wash still falls on it). `c.at` says where he is on screen (`tpAt`: his middle, his feet, his height, facing, the screen's size, the navbar's bottom);
  - knows the way he's going (`c.dir`), whether the world has cut yet (`c.landed`), and does things once with `first(c, key)`.
  The camera keeps him in the same place on screen before and after the cut, so moves that show the trip (the hole, the ghost, the blocks) send it off one edge and bring it in from the other.
- **Shared parts:** dashes and eraser crumbs that carry on by themselves (`burst`, `crumb`, drawn by `paintFx`), marks left in the world (`worldMark`: `.teleport-line`, `.teleport-ring`, `.teleport-scorch`), a whole screen flash (`screenFlash`), dust (`spawnDust`), and the sounds in `tpSound`.

| Move | Gather | Go | Arrive |
|---|---|---|---|
| `transmission` | Two fingers to his forehead (`.prop-fingers`), ink strokes flickering up round him (`.prop-aura`), manga focus lines closing in, the edges darkening; at 0.38 s two rings ripple off his forehead and a line races along the floor the way he's going | Squeezed to a line that zips upward, in a burst of dashes, as the focus lines fly apart; lines rush across the screen at the cut | A line drops in and opens out into him, dashes, a ring of air on the floor, dust, a soft boom; then he lowers his hand |
| `smoke` | His hand to his pocket, and a pellet flicked at his feet | A cloud of smoke, and the world cuts round it | A second puff; it clears on him crouched, the ninja headband's tails flying (`.prop-headband`), and he stands |
| `beam` | He stands still | A column of light drops over him and he fades out through it in stripes, sparkles rising | The same, the other way round |
| `lightning` | He looks up, and the edges darken | A bolt onto him and the whole screen flashes; a scorch mark is left in the world with a curl of smoke | A second bolt, sparks and dust, and he's down on one knee, a hand on the floor; he stands |
| `erase` | A pencil comes down eraser first | It rubs him out from the head down, crumbs falling | It flips and sketches him back from the feet up |
| `door` | His hand traces a door frame in the air in front of him | It swings open onto black and he steps in (`TP_STEP`); it shuts and fades | A door draws itself behind him, opens, and out he walks |
| `hole` | A black disc from his pocket, slapped on the floor | He hops in and drops out of sight; the hole slides off the screen the way he's going | The hole slides in from the other side, he pops up out of it, and it peels itself up into his pocket |
| `page` | He glances up | The whole scene lifts off its left edge like a page (a 3D turn of `.scene`, the desk showing behind, `html.is-page-turning`) | The next page comes down from the right with him on it, and he gives himself a shake. `freeze`: `c.at` is kept from `focus`, since the scene is turned |
| `paste` | A cursor flies in and a selection box with marching ants snaps round him | Ctrl+X: he's cut out, leaving a checkerboard, and the cursor drags his ghost off the screen | The ghost is dragged back in; Ctrl+V and he's solid again |
| `deploy` | A tag says `deploying naeem 0%` | He breaks into blocks from the head down (`sampleFigure`, points along his real limbs) that stream off the screen as the count climbs | They stream back in and build him from the head down to 100%, and the tag turns to `live`, with a chime |

- **Landing:** `teleportLand` puts him `ARRIVED + 1` px short of the mark, facing the way the stop has him, so the arrival code doesn't open the stop while he's still arriving. At the end of `appear` a `soon()` steps him onto the mark, and the stop opens as if he'd walked. If they picked another place meanwhile, he walks there instead.
- **Calling it off:** walking him with the keys (the destination becomes `roam`) during `wait` or `focus` ends it; `endTeleport` puts everything back (his look, the props, the scene's turn).
- **The hint** (`updateTip`): the first time on a visit he runs (`runningFree`) for `TIP_AFTER` (0.8 s) toward a navbar place still `TIP_FAR` (6 body heights) away, he says "Too far? Double tap Skills up top and I'll teleport there." ("Double click" without a coarse pointer), and that place's button pulses twice (`.is-teleport-tip`). It stops once they've teleported (`memory.data.teleports`) or after `TIP_VISITS` (3) visits (`memory.data.teleportTips`).
- **Phones:** the navbar's buttons have `touch-action: manipulation`, so a double tap doesn't zoom.
- **Reduced motion:** `goTo` already puts him there on the first tap, so there's no teleport and no hint.
- **Adding a move:** add an entry to `TELEPORT_MOVES`; it joins the rounds by itself. Add its beats to `BEATS` in `shot_teleports.js` to picture it.

---

## Feature 3: it remembers the visitor

- **Storage:** `localStorage['cv_memory_v1']` holds this object; every access is wrapped in try/catch.

  ```js
  { visits, firstAt, lastAt, smores, visited: { about, projects, experience, skills },
    toured, incidents: [{ id, at, secs, by }], fixed, lateNightOn,
    found, woodpile, wishes, namePlayed, clickNudges }
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
  - **Listed in `help`:** `whoami`, `uptime`, `date`, `time` (see [Picking a time](#picking-a-time)), `ls`, `cat`, `cd`, `skills`, `ping`, `history`, `clear`, `neofetch`, `incidents`, `found` and `wishes` (added by `clickables.js`, with `ls found`), `exit`, `forget`, `help`, `replay intro`.
  - **Hidden:** `sudo` (refused, reported, head shake), `rm -rf /` (the screen's lines fall, it goes dark, he thumps the desk, it reboots "from backup"), `vim`/`:q`, `emacs`, `nano`, `top`, `coffee`/`make coffee`, `echo`, `pwd`, `uname`, `man`, `su`, `hello`/`hi`/`hey`.
- **Adding a command:** add `name: (args, line) => termSay(...)` to `TERM_COMMANDS`. If it should appear in `help` and Tab completion, add it to `TERM_LISTED` and to the `help` text. If it moves him, wrap that in `soon()`.
- **`CONTACT`** (top of the section) holds the email, LinkedIn and GitHub shown by `cat contact.txt` and `ping naeem`; any empty field is skipped. The details are plain text, not links.
- **Reduced motion:** `rm -rf /` prints GNU's real failsafe message instead of the crash.

## Feature 5: POI artifacts

After a destination panel is closed, generic idle behaviour is replaced by
five small interactions with the object at that stop. Input cancels them like
every other ambient act, and reduced motion leaves the artifacts still.

| POI | Artifact | Idles |
|---|---|---|
| About | traveller's field journal | turn page, write, check compass, catch leaf, close/reopen |
| Projects | clockwork prototype | measure, tighten, crank gears, spark/tap, admire |
| Experience | career wayfinder (only with `?experience=line` or `tower`; the chalkboard has none) | trace route, flip slats, stamp ticket, pull signal, check watch |
| Skills | portable network analyzer | tune dial, diagnose, reseat cable, trace waveform, wipe screen |

`artifacts.js` builds all four with `worldSet`, chooses an artifact idle through
`poiArtifactPick`, and exposes `alive.forceArtifact(poi, motion)` for tests.
The objects use the existing scenery palette and disappear with the same
camera/world fade as their destination. `test_artifacts.js` exercises all 20.

### His line at the terminal

- **His line:** about 1.4 s after the terminal is up (`TERM_NUDGE_AFTER`), if they haven't typed a command yet this visit, he says **"I have a feeling i should type "help" in the terminal"** (`TERM_NUDGE`).
  - `updateTermNudge()` (called from `livingView`) keeps the bubble over his 3D head: it reads the head circle `termRig.parts.head` and lifts the bubble above the terminal (`.intro-speech.is-at-terminal`, z-index 6).
  - The bubble goes after about 4.4 s, as soon as they type a command, or when they leave.
- **The sticky note is gone, on purpose.** There used to be a note of commands on the monitor (`.term-note`); Naeem took it out of `index.html` on 24 Sep. Its code in `living.js` (`termNote`, `livingTermNote`, `noteCorners`, `typeFromNote`) does nothing without the markup, and can be deleted along with the `.term-note` styles.

---

## Feature 6: the case study (`case.js`, `case.css`)

- **The sheet** shows each project's front end as chips (`frontEnd` in `projectData`) and has a **Detailed view** button beside View project.
- **Detailed view** zooms in: `.case` (a fixed overlay after `.scene` in `index.html`) is clipped to the sheet's rectangle and grows to the whole screen, paper turning white, while the world behind swells (`zoom()`). Once in, the world and navbar are hidden and `inert`, and the page has its own address (`#work/<slug>`), so the browser's Back closes it as the page's own button and Esc do. It zooms back out onto the sheet.
- **The page** (`build()`) is the project's title, role and description; a section per screen (a heading, a line, the screen in a browser window); the front end as chips with a "Built with" line (`tools`); and Have a go (the live site, and Next, which turns to the next project and moves the sheet with it).
- **Him:** a copy of his body without props, driven by the same gaits and `applySide()`. Above each section is a **lane**, floored with an inked rule. He stands on the lowest floor that has come into the bottom 80% of the screen (`LANE_LINE`), towards its right-hand end, and says that lane's lines (his hello and the first screen's line on the first; each screen's own; the front end's; his goodbye). Scrolling on, he runs off the end of his floor and falls to the next (`FALL_G`), landing in a crouch; scrolling back, he climbs the side of the page, quicker the further it is. With motion reduced he is simply on the right floor.
- **While it is open,** a capture-phase listener keeps the world's keys, touch-walking and pokes out of it.

### Adding or changing a project's page

1. Its entry in `projectData` (`script.js`) needs a `slug` and a `frontEnd` list.
2. Add its page to `CASES` in `case.js` under that slug: `hello`, `brief` (`problem`, `approach`, `outcome`: the three blocks under the title, headed The problem, What I did and The outcome), `screens` (`file`, `path`, `title`, `text`, `say`, `alt`, optional `note`), `frontEnd` (his line), `end`, `bye`.
3. Put its screens in `cases/` as `<slug>-<n>.webp` at 1440 × 900. `node scratch/capture_projects.js [slug]` captures a site's top and two screens down, and `scratch/capture_more.js` clicks or scrolls to particular screens first; both write to `scratch/caps/` to pick from.

---

## Feature 7: the Experience chalkboard (`chalkboard.js`, `chalkboard.css`)

- **What happens:** Experience is a long chalkboard on a wall with a rolling library ladder parked past its right end. Walking past, it is scenery. Sent there, he rules the years along the bottom from the floor, climbs the ladder and writes EXPERIENCE and each role from `CAREER`, riding the ladder along to draw each role's bar through its years. The camera leaves the world as he starts and moves round him, one shoulder then the other. When he climbs down and steps back it settles into a side view again, pulled back until the whole board and him beside it fit. **No panel opens**: the board is the content, and the status line reads the roles out for screen readers.
- **Along the way:**
  - **He talks:** a line as he starts (`say()` in `buildPlan`), one for each role from `say` in `CAREER`, one on the ladder, and one at the end. `sayLine()` puts it in the site's bubble and `placeBubble()` keeps the bubble over his drawn head, as the terminal's line does.
  - **The gag:** he writes EXPERIANCE, stares at it (`pause` on the `wipe` task), rubs the wrong letters out with his sleeve (each stroke has `goneAt`, when the sleeve passes it, and the rub leaves a faint `smudge` stroke) and puts it right.
  - **Chalk you can feel:** a tap, a scratch and now and then a squeak for every stroke (`chalkSound`), dust falling off the chalk tip, and two claps with a puff of dust when he has finished.
- **Skipping:** while he writes, E or the **Skip to the board** button (`.chalk-skip`, bottom middle) fills the chalk in fast while the camera and he move to the end of the show. On a touch screen the button has no key.
- **His idles at the finished board:** left alone, 2 seconds after he finishes and then every 2 to 4 seconds, he gets up to one of five things (`IDLES` and `makeIdle`): leaning on the ladder looking out, riding it along the rail, blowing the dust off his fingers, adding three dots after the arrow, or drawing a small face under it. The last two happen once each and stay on the board.
- **The lamp:** a lamp over the board goes on at dusk (17:18) and off in the morning (07:48), with the street lamps' flicker. Its light is drawn on `.chalk-glow`, over the night's wash, as strong as the hour's lights.
- **Back again** the same visit, the board is already written, so the camera just eases into the view of it. **Walked off or sent elsewhere** at any point, the board is finished at once and the camera comes back to the world before he moves (`chalkLeaving()` holds him, like the bench). With motion reduced the board is simply written when he arrives.
- **How it draws:** its own SVG (`.bench-cam.chalk-cam`) between the world and him, like the bench, but that SVG is never shown: `paintBoard()` paints it onto `.chalk-canvas` in its place each frame. The show's camera never stops, and the browser rastering the whole SVG again every frame held the show to 40 to 80 fps on a 144 Hz screen; the canvas keeps it at about 100 to 140. `render()` still builds the SVG (its elements, in order, with their classes and inline widths and opacities) and `chalkboard.css` still says how each looks (read once per element through a bare copy, `lookOf()`), but the paths themselves go in `pathData` through `setD()`, not into the SVG. Everything drawn before him is kept on a canvas of its own while it doesn't change, so with the camera still only he and the dust are painted. He is painted on a canvas of his own and put on the board through his CSS filter, so the paper edge goes round all of him. The lamp's light (`.chalk-glow`) is SVG still, and is hidden while the lamp is off or it is day. Everything is modelled in centimetres, with him 180 cm tall (the rig's 242 units). A camera with no perspective, looking square on, draws it exactly as the flat world does, so the camera can leave the world and come back without a join. His drawing uses the rig's proportions and line weights, and takes over from the rig's own joints (`figureJoints`) as the show starts.
- **Timing:** the show is a function of time. The chalk strokes are stamped with the moment they are drawn; his body, the ladder and the camera follow a steady focus point (how far the chalk has got along each word or line), never the chalk tip. The camera's path is worked out once as he arrives (about 17 ms) and smoothed, so it never jolts.
- **The old stops are still there:** `?experience=line` brings back the railway line and its timetable panel, and `?experience=tower` the rooftop course. `BOARD_MODE`, `LINE_MODE` and `TOWER_MODE` are at the top of the experience course in `script.js`.
- **Hooks:** `drawChalkboard()` in `frame()` after the terminal, which also fades the world; `chalkLeaving()` in `leavingExperience`; `chalkBusy()` in `updateStops`, `triggerJump` and `isFree()`; `chalkScenery()` for the board's click area in `STOP_SCENERY`.
.
- **Changing what he writes:** the words come from `CAREER` in `script.js`. The layout (`buildPlan`), his moves (`PHASES`) and the shots (`shots` in `buildPlan`) are in `chalkboard.js`.
- **Test handles:** `alive.chalk.show` (mode, time, done, skip, idle, his line, the lamp, the dust), `alive.chalk.seek(t)`, `alive.chalk.skip()`, `alive.chalk.idle(name)`, `alive.chalk.plan`, `alive.chalk.camera(t)`, `alive.chalk.handGap(t)`, `alive.chalk.pathOf(el)` (the path an element of the board is drawn with) and `alive.chalk.mirror(true)` (the paths written into the SVG too, so it can be shown in place of the canvas to compare the two). `shot_chalk_night.js` takes pictures of it at night.

---

## Feature 8: the quick ways to him

For visitors short of time: who he is, how to reach him, and a way past the show.

- **His first line** in the opening is "Hi, I'm Naeem!" (`HELLO.hi` in `script.js`).
- **The headline on the plinth** (`NAME_ROLE`, `.statue__engraving`) is cut in under the N and A, where the camera looks all through the opening, not under the middle of the name.
- **Skip intro** (`.intro-skip`, bottom middle): shown for the whole opening on a first visit (`introSkip` in `script.js`), hidden by `finishIntro`. It calls `skipIntro()` and sets `intro.leave`, so he strolls on to About Me as when the opening ends. Never there with reduced motion or on a return visit, which have no opening.
- **The contact dock** (`.contact-dock`, bottom right, `styles.css` "contact dock"): Email, LinkedIn, GitHub and CV. The CV link opens `cv/index.html`, the whole portfolio as one plain page, in a new tab. Named in full above 1100 px, icons alone (named for screen readers) below. CSS alone puts it away while any `.story-panel` or the case study is open, and at 760 px and below while a skip button (the opening's or the chalkboard's) has the bottom middle.
- **The name caption** (`.name-caption`): at 760 px and below the statue is several screens wide, so his name and role are set under the floor while any of the statue is on screen (an `IntersectionObserver` on `.name-statue` in `script.js`). Pale at night, with `html[data-sky="dark"]`.
- **The About letter** has email, LinkedIn and GitHub links under the CV download (`.about-paper__contact`).
- **A shared link** is previewed from `og:url` and `og:image` in `index.html`, with the canonical link. All three use https://naeembrown.com, the planned domain; change them if it goes live elsewhere.

---

## Feature 9: things to click (`clickables.js`, `clickables.css`)

Ten things in the world answer a click (a tap on a phone). Each answers at once; he joins in only while `isFree()` holds, walking over first when it needs him there, the way he goes to something broken. They are the ten pitched in the "Clickable World Pitches" artifact.

| Thing | A click | Him | Clicked too much |
|---|---|---|---|
| The letters of his name | the letter jumps and rings a note of C major pentatonic, C4 at the first N up to A5 at the last (`CLICK_NOTES`, from the three stone samples repitched) | | all ten left to right: the name glows in a wave (`.is-played`), he claps and says "You played my name!" (`memory.data.namePlayed`) |
| The street lamps | switched off or on (`switchLight`), and held so until the hour next switches it (`holdLamp` and `lampWanted` in `living.js`) | glances up | four flicks within 1.8 s: the bulb pops and the lamp's incident starts; paged, he says "Easy on the switch." and thumps it back on |
| The campfire | the flames jump (`.campfire.is-stoked`) and sparks fly (`.click-ember`) | | three within 1.6 s: it roars (`.is-roaring`); he leans back, shielding his face, and says "Easy, it's a campfire." |
| The axe in the stump | | walks to 334 units right of the camp's mark and splits a log (`clickChopAct`): the axe into his hands (`.prop-axe`), a round set on the stump, the halves onto the pile | the pile grows a log a split onto six spare places (`CLICK_SPARE_AT`, `.s-spare`), kept in `memory.data.woodpile`; full, "That'll do for winter." |
| The tent | it breathes and snores, and z's drift out | says "Hello?", crouches at the door and peeks in: "Nobody's in there." | every third time the bird bursts out of the door (`livingBirdBurst`, at night as well) and he jumps back: "So that's who it was." |
| The fingerposts | the arm wobbles | goes where it points, as the navbar sends him: "Projects? This way." | three on one arm within 2.2 s spin it round the wrong way, upside down; he says "That's not right." and pushes it back (`FIX_PUSH`, lowered for a lower arm) |
| The pegboard's tools | the saw, hammer, spanner or level swings on its peg | walks over and takes it down (`.prop-tool`): twirls the hammer, turns the spanner, settles the level's bubble or saws the air, a line for each, and hangs it back | |
| The clock | its hands spin on to the next part of the day, and the world with them (as T does); otherwise they show the sky's hour (`clickClockHands`) | checks his watch, taps it and shakes it; as it chimes, a line for the new hour | |
| The server racks | the rack's lights run top to bottom (`.s-led.is-rippling`) and its fans whirr | | five within 2.6 s: the rack's incident starts; he says "Did you just DDoS me?" and reseats the cable |
| The stars, at night | the star goes out and a shooting star streaks from it (`.shooting-star`) | points at it, then makes a wish | each wish counted (`memory.data.wishes`) |

- **Where the clicks land:** `clickBuild()` lays a `.click-hit` over each thing (28: a letter each, each lamp, arm, tool and rack), placed like scenery in units from its anchor, so they keep up with resizes. The fingerposts' arms are measured with `getBBox()`. The stars take clicks on their own `<i>`, over a wider patch than they look, while `.sky-stars.is-wishable`. One `click` listener sends each to `CLICK_PRESS[id](part)`.
- **When they take clicks:** once the opening is over and the world is in view (`.scene.has-clicks`: not at the bench, the terminal or the chalkboard). They sit above the stops' own areas (`z-index` 7 over 6), so a tool on the pegboard wins over the Projects stop while the rest of the workshop still opens it. The fire is the exception: while the About stop would take a click (`nearStop === 'about'`) its area is off (`.is-off`), so it never keeps him from the letter.
- **Him:** `clickHeCan()` is `isFree()` with no incident and nothing else of theirs under way. His reactions wait until he's up off the floor (`clickWhenUp`). A walk is an errand (`clickErrand`): `state.destinationId = 'clickable'`, and the arrival in `frame()` calls `clickArrived()`, which starts his act facing the thing. Walked off on the way, it's dropped; any click or key cuts the act short, as for any act. His lines go through `clickSay`, which takes the place of whatever he was saying but never speaks over the opening or a paper.
- **Things that break:** the lamp and the rack go through `clickBreak(id, line)`, the ordinary incident with `incident.say` as his line when paged and `incident.byVisitor`, so the log has `by: 'you'` and the terminal's `incidents` adds "broken by you". A spun arm waits in `clicker.spun` until he's free near it, and `clickBusy('sign')` keeps the incidents from picking that arm meanwhile.
- **Found:** the first click of each thing goes in `memory.data.found`. The ops board says `FOUND n/10`, and the terminal has `found` (or `ls found`) and `wishes`. Once a visit, a minute in, if they've found fewer than two, he says "Most things round here do something if you click them." ("tap" on a phone), for three visits at most (`memory.data.clickNudges`).
- **Sounds:** the 28 groups at the end of `SOUND_FILES`, all CC0, found by Codex from [SOUNDS-clickables.md](SOUNDS-clickables.md) and credited in `audio/LICENSE.md`. Each has a fallback made from `sfx`'s parts. The lamp posts' thump in `noises.thump`, `noises.alarm`, the perched bird's chirp and the rack's fix use the new samples too.
- **Reduced motion:** nothing animates and he doesn't walk: the lamp switches (and never pops), the pile grows at once, the clock's day is there at once, and he still says his lines.
- **Adding one:** tag it in its builder (a class or `data-` attribute on a `p.open` group), give it a `clickHit` in `clickBuild`, a handler in `CLICK_PRESS` and a name in `CLICK_THINGS` (which also sets the found count's total), and test it in `test_clickables.js`. `node scratch/living/probe_clickables.js` shows where the areas land.
---

## Feature 10: the daypart idles (`idles.js`, `idles.css`)

Left alone, he has ten things of his own for each part of the day, on top of the five he does at any hour. They were pitched in the "Daypart Idle Pitches" artifact, with an animated sketch of each.

| Part | Acts (`IDLE_ACTS` names) |
|---|---|
| Dawn | `salute` sun salutation, `coffee` first coffee, `warmhands` breath in the cold, `sunrise` shading his eyes, `chorus` whistling back to the bird, `wind` finger to the wind (and the gust comes), `teeth` brushing his teeth, `boots` wet boots, `mist` parting the mist, `jumps` star jumps |
| Day | `duck` rubber duck, `prototype` paper prototype, `frame` finger frame, `lunch` lunch with the bird, `build` waiting on the build, `mute` on a call, `screenbreak` 20 seconds looking far off, `plane` paper plane, `kite` a kite on a gust, `standup` his standup |
| Dusk | `clockoff` clocking off (then it buzzes), `photo` sunset photo, `conduct` snapping the lamps on, `firefly` a firefly cupped, `marshmallow` at the fire, `sunset` sitting to watch it, `harmonica`, `puppets` shadow puppets on the tent, `goodnight` seeing the bird off to bed, `firststars` counting the stars |
| Night | `stargaze` lying back to trace a constellation shaped like a code tag, `torch` head torch, `darkmode`, `page` the 3 a.m. page, `nodoff` nodding off standing, `crickets` shushing the crickets, `ghost` a ghost story at the fire, `howl` at the moon, `sleepwalk`, `palm` the moon on his palm |

- **When each suits:** its entry in `IDLE_ACTS` gives the hours of the sky's clock (`skyClock.hour`, so picking a time brings its ten), its weight against the others, `once` (`visit`, or `day`, kept in `memory.data.idleDays`), and `can()` for anything else it needs: the sun or the moon on screen (`idleSunSpot`, `idleMoonSpot`, read off the sky's own elements), the bird perched on screen, the fire near (`idleNearFire`), standing between the tent and the fire (`idleByTent`), a switched lamp on screen that's still off (`idleLampsToSnap`), the mist thick enough, weekdays for the standup and the call, 20 minutes on the page for the screen break.
- **How they're picked:** `pickIdle()` (living.js) adds `idleDaypartOptions()`. At the camp's stop, `idleStationPick` gives the camp's four (`firefly`, `marshmallow`, `puppets`, `ghost`) a turn about half the time instead of the field journal's. The settle may be `idleSettleAct` (the sunset, the stars). A gust by day may start `kite` instead of the brace (`idleGustAct`).
- **An act** is `idleAct(kind, seconds, draw, { beats, end, pin })`: `draw(t, p, out)` moves his pose `p` with the same tools as the others (`aimArm`, `leaned`, `clickCrouch`, `floorSitPose`), through `idleReachBody` (a point of his upright torso: head at 70, 32, shoulder at 70, 74) and `idleReachRig` (a point in the rig where it is, his feet at y 242). `beats` are `[seconds, fn]`: sounds and his lines. `end` puts everything away, whether it finished or was cut short.
- **What they draw:** `out.fx` goes in `.idle-fx`, a layer in the figure (notes, tags, the kite, the plane, shadows on the tent), and `out.glow` in `.idle-glow`, a layer on the lights that is screened over the night's wash (the torch beam, the firefly, the stars, a screen's glare, with the soft gradients `idle-soft-*`). Both are in the rig's units where he stands. `idleFlash` whitens the whole scene for a camera or a blazing screen. `idleWorldToRig` and `idleScreenToRig` turn places in the world and on the screen into rig units.
- **Props** (index.html, each marked `living:`): `.prop-idle` in his near hand, one `data-prop` at a time (toothbrush, bottle, duck, pen, sticky note, crumpled ball, sheet, paper plane, sandwich, harmonica, a long marshmallow stick), `.prop-idle-far` (the sticky pad), `.prop-headtorch`, `.prop-foam`, `.prop-chestnote`, and glyphs on the phone's screen (`is-dnd`, `is-muted`, `is-page`, `is-lit`). `idleHold` keeps a prop at a set angle whatever his arm does, as `clickHold` does. The coffee is the run's `.prop-mug`, the dark mode laptop the settle's.
- **The scenery they need** (`idleBuild`, from `startLiving`): a grove on the long walk from the chalkboard to the control room (an oak with a low bare branch the bird likes, a pine, a rock, a bush, pale far pines) with a path lamp either side, a copse between the workshop and the chalkboard, three birches past the servers, and woods beyond his name. The grove and its lamps are placed in units from the Experience stop, so they stay clear of the chalkboard's ladder and of the control room at any size.
- **Hooks in living.js:** `pickIdle`, and the settle and the station in `updateIdle`; `idlePerches` in `birdPerches`; the bird's `visit` and `bedtime`; `idleGustAct` and the `windGust` sample in `startGust`; `chorus.hush` in `updateChorus` (the crickets hushed); `idleBuild` in `startLiving`; `forceIdle` and `idles` in `window.alive`. The mist's gap widens with `--gap-w` (living.css).
- **Sounds:** the groups after `wishChime` in `SOUND_FILES`, found by Codex from [SOUNDS-idles.md](SOUNDS-idles.md) and credited in `audio/LICENSE.md`. Each has a fallback made from `sfx`'s parts. Every gust plays `windGust` now too.
- **Reduced motion:** none of them start, and the kite, the sunset and the stars never take the brace's or the settle's place.
- **Test:** `node scratch/living/test_daypart_idles.js [kind ...]` forces each at an hour and a place that suit it; `python scratch/living/sheet_daypart_idles.py` then puts the pictures on contact sheets. `node scratch/living/shot_idle_env.js` takes pictures of the new scenery by day, dusk and night.

---

## Testing

Everything runs from Node 18+ with the Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, headless, driven over CDP.

`scratch/package.json` marks the tests as CommonJS. Without it they fail to load whenever a `package.json` with `"type": "module"` sits in a folder above the project (as `C:\dev\package.json` does).

| Command | Checks |
|---|---|
| `node scratch/living/run_all.js` | **everything below, in turn, with a pass/fail summary** |
| `node scratch/living/check_globals.js` | no top-level name clashes; every file parses (**run after every edit**) |
| `node scratch/living/baseline.js` | the page loads with no errors |
| `node scratch/living/test_memory.js` | first visit, return visit, greeting, s'mores and tallies, visited dots, tour, no teleport |
| `node scratch/living/test_case.js` | the case study at desktop and phone size: the sheet's front-end chips; Detailed view opening on the project with focus on its title, its address, the world hidden; him landing on the first floor and saying hello; floor by floor down to the last and his goodbye; climbing back up; the world's keys kept out; Next (and the sheet following); Esc and the browser's Back closing it; reduced motion. Screenshots `case_*` |
| `node scratch/living/test_projects.js` | the Projects sheet at desktop and phone size: one tab per project, each filling its title, text, role, tools and link (opening in a new tab), and him building its model. Screenshots `projects_*` |
| `node scratch/living/test_paper_close.js` | the X in the corner of the About letter, the Projects sheet and the Experience timetable, at desktop and phone size: in the corner, staying there as the sheet scrolls, nothing over it, putting the paper away as Continue journey does. Screenshots `paper_close_*` |
| `node scratch/living/test_stops.js` | using a stop he has walked up to (`useStop` in `script.js`): the floor mark's prompt only when he's near and free (not in the opening, not far off, not with a paper open, not while the navbar sends him past); E with D still held and repeating; E after a paper's X; a click on the prompt; a click on the scenery (and its prompt lighting when pointed at); E by the handcar; touch, with no key on the prompt. Screenshots `stops_prompt_*` |
| `node scratch/living/test_controls.js` | his keys after a click in the navbar (sound, time picker, a stop, and the X on a paper sending focus there): D, the arrows and Space still steer him, nothing steps along the route or toggles the sound; reached with Tab, the route keeps its arrows and the sound button its Space (`keyFocus` in `script.js`); walked off the camp, the bench and the terminal, he is on his way in under 0.9 s (`LEAVE_HURRY`). Runs with the GPU on, since headless Edge draws the camp too slowly without it |
| `node scratch/living/test_terminal.js` | his line over his head, typing without a click, every main command (`time` included, and T typed at the prompt not stepping the time), no markup injection, history, Tab, clear, `rm -rf /`, `cd` (no teleport), phone size, Esc then arrows. |
| `node scratch/living/test_daynight.js` | each daypart (screenshots `day_<part>_*`), late-night line, doze and wake, standing up before walking |
| `node scratch/living/test_timepicker.js` | picking a time: the picker hidden in the opening; day to night travelling forward round the clock, the lamps coming on one at a time, the wash, stars, sun down, moon up (under the navbar), pale navbar words, the bird's roost, the fire louder, his yawn; dawn (sun low left, mist, lamps on, his stretch); the lamps going off in turn; dusk readable with the sun low right; back to the clock; keys on the picker; T; the slider (hover, 18:30, quick); crickets at night and birds at dawn; reduced motion; no overlaps at eight widths from 320 to 1440 px with and without the Continue button; the phone (no slider, the moon clear of the route, folding). Screenshots `picker_*` |
| `node scratch/living/test_idle.js` | each idle act, starting by himself, settling after 35 s, standing up on input |
| `node scratch/living/test_run.js` | on the run: the watch (heart rate, then pace), the stumble (pitch, windmill, pebble, line), the morning coffee (first flare, upright, steadier than his head, splash), slapping a lamp and a fingerpost, hurdling the bush, the ninja run, the bug (flicked, said, logged), reduced motion. Pictures: `shot_run.js` |
| `node scratch/living/test_teleport.js` | teleporting: the hint while running far (its words, no dashes, the pulsing place, counted once, "double tap" on a phone), a single tap still walking, Instant Transmission (fingers up, the strokes, the focus lines, gone, back, the ring), landing at Skills with the terminal opening, remembered; from the terminal to About Me (clearing the console first, the letter opening); walking off with the keys calling it off without using the move up; a whole round of ten teleports, each a different move, each leaving him whole at the stop, carried over a reload; a new round never opening with the last move. Pictures: `shot_teleports.js` |
| `node scratch/living/test_artifacts.js` | all four artifacts, all 20 character/object idles, cleanup, and screenshots |
| `node scratch/living/test_incidents.js` | all four fixture types end to end, logging, the ops count, steered off then back, starting by itself, reduced motion |
| `node scratch/living/test_bird.js` | perching, flushing, landing elsewhere, cursor scare, night roost, reduced motion |
| `node scratch/living/test_wind.js` | grass layers, gust effects, leaves, brace, automatic gusts, reduced motion |
| `node scratch/living/test_chalkboard.js` | the Experience chalkboard: the show starting on arrival with no panel, his world figure swapped for the board's drawing, his first line with the bubble over his head, chalk dust, the misspelling written then rubbed out, the skip button, the board written and its route dot filled, all five idles (the dots and the face staying on the board), skipping with E (at night, with the lamp on) and with the button (by day, lamp off), the world faded then back after walking off, the view of the written board on a second visit, reduced motion, phone size. Screenshots `chalk_*`. `probe_chalk_reach.js`, `probe_chalk_camera.js` and `probe_chalk_cost.js` measure his reach, the camera's smoothness and the cost of a frame |
| `node scratch/living/test_clickables.js` | things to click, each with the mouse: all ten letters left to right (the wave, his clap); a lamp switched and staying so, then four flicks popping it and the fix logged as theirs; the fire flaring, then roaring and his line; at the About stop, the fire leaving the click to it; the axe (the walk, the axe in his hands, the pile one higher and remembered); the tent (the snore, his peek, the bird on the third); a fingerpost arm sending him off, then spun and put right; each tool taken down with Projects staying shut; the clock turning the day and his watch; a rack's ripple and the outage; no stars by day, a star at night and the wish; all ten found, the board's count, `found`, `wishes` and `ls found`; reduced motion; a tap on a phone. Screenshots `click_*` |
| `node scratch/living/test_daypart_idles.js [kind ...]` | the forty daypart idles, each forced at an hour and a place that suit it: that it plays, and puts every prop, drawing, turn and hush away after; that each part of the day offers only its own; that he picks one by himself. Pictures `idles_<kind>_<n>`; `sheet_daypart_idles.py` makes contact sheets of them |
| `node scratch/living/test_sky_depth.js` | the ridges (three, behind the world and in front of the sun, their feet on the floor line, each sliding at its own fraction of the world's movement), no Milky Way by day and the Milky Way at night, the moon in tonight's phase and every phase drawing a shape, the planet not twinkling, the stars wheeling from evening to morning, a wish on a star with the streak leaving from it. Pictures `sky_depth_*` |
| `node scratch/living/probe_sky_cost.js` | frames a second at night with the ridges and the Milky Way on and off, standing and with the head torch |
| `node scratch/perf_frames.js` | frame drops as a visitor gets them: real Chrome in a visible window with the GPU on, standing, walking, sprinting, going to and at the bench and the terminal. Frames a second, slow frames and the main thread's work for each. `--trace` adds paint, layers, GPU raster and the top JavaScript; `--night` runs it at night; a word picks scenarios (`node scratch/perf_frames.js sprint`) |
| `node scratch/living/test_fastpath.js` | the quick ways to him: Skip intro in the opening (ending it, the N whole, him on to About Me), the dock (its four links, not over the skip button, away while the letter is up and back after), his name in his first line, the About letter's links, the skill groups, CaseMap first, the shared link's tags, the phone caption (between the floor and the skip button, gone by the campfire), no skip button with reduced motion or on a return visit. Screenshots `fast_*` |
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
  - `runFlare(type)` (`pace`, `coffee`, `stumble`, `hydrate`, `sweat`, now if he's running), `spawnBug()`, `teleport`, `teleportTo(i)` (double taps navbar place `i`), `runMove` (`always` slaps every post), `runStats`, `forceIdle(kind)`, `forceIncident(id)`, `simulateAway(seconds)`, `setDaypart(part)` (same as the picker, without his reaction), `gust(dir)`, `perchBird(i)`, `idles` (the daypart idles' names by part of the day; `forceIdle` plays any of them)
- **Query parameters:** `?time=…`, `?visit=first|return`, `?intro=1`.
- **Headless timing:** headless Edge runs at a low frame rate, and `dt` is capped at 0.05 s, so act time runs slower than wall time. Wait on conditions (`page.until`), not fixed delays.

## Not done, and open questions

- **The pegboard hammer** incident from the plan isn't built. It's optional; add it through `FIXTURES`.
- **His spoken lines are drafts:** `greetingLine`, the fixtures' `lines`, `dozeAct`, `updateLateNight`, `updateTour`, `finishIncident`.
- **The night** is a deep blue now (`NIGHT_SKY` and the keys either side of it in `SKY_KEYS`), kept light enough at the floor for his ink to read. Tune it there.
- **Projects:** the six projects are in `projectData` (`script.js`), each with a tab in `index.html` and the model at the same place in `MODELS`. To add, remove or reorder one, change all three. CaseMap comes first.
- **The case studies' briefs are drafts** worked out from each project's description: the problem each one answers is a reading of it, and wants Naeem's own account (what he found out, what he tried, what changed).
