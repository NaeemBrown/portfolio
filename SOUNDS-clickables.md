# Sounds to source for the clickable world

**Status: done.** Every file below is in `audio/samples/`, credited in `audio/LICENSE.md`, and played by `clickables.js` (see "Feature 9" in LIVING-WORLD.md). This list stays as the record of what each sound is for.

This is the shopping list of sound files for the ten clickable things pitched in the "Clickable World Pitches" artifact: things in the world that react when the visitor clicks them. The job here is **only to find, prepare and credit the files**. Nothing plays them yet; that happens when each clickable is built.

Read `audio/LICENSE.md` and `SOUND_FILES` near the top of `script.js` first. They show how the current library was sourced and named, and this list follows the same rules.

## Rules

1. **CC0 only.** `audio/LICENSE.md` says every file in `audio/` is CC0, so keep that true. Look in the Kenney packs first (kenney.nl: UI Audio, Impact Sounds and RPG Audio are already in use, and Interface Sounds may help), then Freesound with the licence filter set to Creative Commons 0, then OpenGameArt filtered to CC0. If a sound only exists under CC BY or anything else, leave it out and list it at the end of your report instead.
2. **Where:** `audio/samples/`.
3. **Names:** exactly the file names below: lowercase, words joined with hyphens, and numbered alternates (`-1`, `-2`) where more than one is asked for, as `step-grass-1.ogg` to `step-grass-5.ogg` are. Alternates should be genuinely different takes of the same thing, not the same file twice.
4. **Format:** mono Ogg Vorbis, 44.1 or 48 kHz, around `-q:a 4`. The existing samples are 5 to 19 KB; aim for under 40 KB each.
5. **Prepare each file:**
   - Trim the silence at the start so the sound begins within about 5 ms. The code schedules these to line up with animation beats, and a late start sounds out of sync.
   - Trim the tail once it has died away, with a short fade out rather than a hard cut.
   - Peak normalise to about -3 dBFS. The code sets each sound's level when it plays.
   - If `ffmpeg` is available, it can do all of this, e.g. `ffmpeg -i in.wav -af "silenceremove=start_periods=1:start_threshold=-50dB,afade=t=out:st=<end-0.05>:d=0.05,loudnorm" -ac 1 -c:a libvorbis -q:a 4 out.ogg`. Check each result's length with `ffprobe`.
6. **Credit every file** in `audio/LICENSE.md`: under the Kenney section if it came from a Kenney pack not already listed, or as a new line in the Freesound style (`file`: “original title” by author, URL, CC0). Add an OpenGameArt section if you use it.
7. **`SOUND_FILES`:** the clickables are built now, and every group below is already in `SOUND_FILES` (script.js) under its group name. A replacement file only needs the same file name.

## Already in the library (don't source these)

| Existing group | Files | Will be used for |
|---|---|---|
| `uiSwitch` | `ui-switch.ogg` | The lamp switch (`noises.flick` already uses it) |
| `creak` | `creak-1.ogg`, `creak-2.ogg` | A fingerpost arm wobbling |
| `wood` | `tap-wood-1.ogg`, `tap-wood-2.ogg` | The arm tapped home, the hammer caught after its twirl |
| `thunk` | `thunk-wood.ogg` | The spun arm clunking to a stop, a log round set on the stump |
| `cloth` | `cloth-1.ogg`, `cloth-2.ogg` | Him shaking his wrist, crouching to peek in the tent |
| `uiClick` | `ui-click-1.ogg`, `ui-click-2.ogg` | The spirit level's bubble settling |
| `fireAmbience` | `ambience-fire.mp3` | The fire's bed under the new flare sounds |

These stay synthesised and need no file: the hum of a lamp catching, the rack's light ripple, the electric fizz.

## To source

**Priority 1** marks the clickables that will be built first (the lamp, the rack and the clock), so find those first. Length is the target once trimmed. "Group" is the `SOUND_FILES` key it will get later.

### The name, as an instrument

Each letter of the statue plays a note of a C major pentatonic scale, from C4 up to A5.

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `stone-note-c4.ogg`, `stone-note-g4.ogg`, `stone-note-e5.ogg` | `stoneC4`, `stoneG4`, `stoneE5` (one group each, so each is tuned from its own note) | One struck bar of a lithophone (a stone xylophone), marimba or wooden xylophone, at the pitch in the file name. All three from the same instrument. The code repitches the nearest one for each letter, so a clean single pitch matters more than the instrument. If only one pitch can be found, get C4 | 1 to 1.5 s |
| `clap-1.ogg`, `clap-2.ogg` | `clap` | One hand clap by one person, dry and close, no room echo. He claps when the whole name is played | under 0.2 s |

### The lamp switch (priority 1)

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `bulb-pop.ogg` | `bulbPop` | A small light bulb blowing: a sharp glassy pop with a brief electric fizz. Small, not an explosion | 0.3 to 0.6 s |
| `post-thump-1.ogg`, `post-thump-2.ogg` | `postThump` | The heel of a hand thumping a hollow metal lamp post: a dull clang with a short ring. The existing lamp incident fix can use these too | 0.3 to 0.6 s |

### Stoke the fire

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `fire-flare.ogg` | `fireFlare` | A campfire flaring up when poked or fed: a soft whoosh of flame with crackles in it | 1 to 1.5 s |
| `fire-pop-1.ogg`, `fire-pop-2.ogg`, `fire-pop-3.ogg` | `firePop` | Single sharp pops of burning wood, for the sparks. These can be cut from a longer CC0 fire recording | 0.05 to 0.3 s |
| `fire-roar.ogg` (optional) | `fireRoar` | The fire roaring up after three quick clicks, then settling. Without it the code plays `fire-flare` louder and slower | about 2 s |

### Split a log

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `axe-pull.ogg` | `axePull` | An axe wrenched out of a wooden stump: steel squeaking in wood, then the release | 0.3 to 0.6 s |
| `swish-1.ogg`, `swish-2.ogg` | `swish` | One swing through the air of an axe or a hammer. Also used for the hammer twirl | 0.2 to 0.4 s |
| `axe-chop-1.ogg`, `axe-chop-2.ogg` | `axeChop` | An axe splitting a log in one stroke: a heavy chop and the crack of the wood parting | 0.4 to 0.8 s |
| `wood-stack-1.ogg`, `wood-stack-2.ogg` | `woodStack` | Split firewood landing on a woodpile: two or three wooden knocks and a small clatter | 0.3 to 0.7 s |

### Who's in the tent?

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `snore-1.ogg`, `snore-2.ogg` | `snore` | One snore, breathing in and out, from someone fast asleep. Funny, but not gross. The code muffles it to sound inside the tent, so a clean, dry recording is best | 1 to 1.6 s |
| `tent-flap.ogg` | `tentFlap` | A canvas or nylon tent door pulled aside | 0.4 to 0.8 s |
| `bird-flutter.ogg` | `birdFlutter` | A small bird bursting into flight: quick wingbeats | 0.4 to 0.9 s |
| `bird-chirp-1.ogg`, `bird-chirp-2.ogg` | `birdChirp` | A single short alarm chirp from a small songbird such as a robin or wren, with no other birds behind it. The world's perching bird, whose chirp is synthesised now, can use these too | 0.1 to 0.4 s |

### Fingerposts that point the way

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `sign-spin.ogg` | `signSpin` | A loose wooden sign arm spinning round on a rusty pivot: a squeaky creak that rises and falls as it turns | 1 to 1.5 s |

### Tools off the pegboard

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `pegboard-lift-1.ogg`, `pegboard-lift-2.ogg` | `pegboardLift` | A hand tool lifted off, or hung back on, a metal pegboard hook: a light metallic rattle | 0.2 to 0.4 s |
| `ratchet.ogg` | `ratchet` | A socket wrench ratcheting: four to six clicks | 0.4 to 0.7 s |
| `saw-stroke-1.ogg`, `saw-stroke-2.ogg`, `saw-stroke-3.ogg` | `sawStroke` | One push or one pull of a handsaw through wood, three separate strokes that can alternate | 0.25 to 0.45 s |

### The clock runs the sky (priority 1)

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `clock-tick-1.ogg`, `clock-tick-2.ogg` | `clockTick` | A single tick of a mechanical wall clock, crisp. Two, so the rapid ticking while the hands spin alternates | under 0.1 s |
| `clock-chime.ogg` | `clockChime` | One soft chime from a wall or mantel clock as it arrives at the new hour. Gentle, not a church bell | 1.5 to 2.5 s |
| `watch-tap.ogg` | `watchTap` | A fingertip tapping twice on a wristwatch face: two tiny glassy taps | under 0.4 s |

### Don't poke the servers (priority 1)

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `server-spinup.ogg` | `serverSpinup` | Server or computer fans spinning up to speed: a rising whirr, with no beeps or voices | 0.8 to 1.5 s |
| `cable-unplug.ogg` | `cableUnplug` | An Ethernet (RJ45) plug pulled out of its socket: a small plastic release click | under 0.3 s |
| `cable-plug.ogg` | `cablePlug` | The same plug pushed home: a firm latch click | under 0.3 s |
| `server-alarm.ogg` (optional) | `serverAlarm` | Equipment alarm: three short electronic beeps. Firm but not harsh. The synthesised `noises.alarm` in `living.js` stays if nothing good turns up | about 1 s |

### Wish on a star

| File | Group | What it should sound like | Length |
|---|---|---|---|
| `shooting-star.ogg` | `shootingStar` | A soft magical whoosh that falls in pitch, with a light sparkle. Fairy tale, not science fiction | 0.8 to 1.3 s |
| `wish-chime.ogg` | `wishChime` | A few gentle notes of a wind chime or a glockenspiel sparkle, as he makes his wish | 1.5 to 2.5 s |

## Totals

28 sounds (26 needed, 2 optional) in 43 files (41 needed, 2 optional).

## When you're done, report back

- Each file saved, with its source URL and length.
- Anything you couldn't find under CC0, with the best non CC0 candidate you saw, so Naeem can decide.
- Anything that's a compromise (the wrong pitch, a room echo you couldn't remove, only one take where two were asked for).
