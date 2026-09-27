# Sounds to source for the daypart idles

**Status: done.** All 46 files below are in `audio/samples/`, credited in `audio/LICENSE.md`, in `SOUND_FILES` (script.js) under the group names below, and played by `idles.js` (see "Feature 10" in LIVING-WORLD.md). The three twinkles are a group each (`twinkle1`, `twinkle2`, `twinkle3`), so each plays its own pitch. This list stays as the record of what each sound is for.

This is the shopping list of sound files for the forty idle acts pitched in the "Daypart Idle Pitches" artifact: ten things he does when left alone at dawn, by day, at dusk and at night. The job here is **only to find, prepare and credit the files**. Nothing plays them yet; that happens when each act is built.

Read `audio/LICENSE.md` and `SOUND_FILES` near the top of `script.js` first. They show how the current library was sourced and named, and this list follows the same rules as [SOUNDS-clickables.md](SOUNDS-clickables.md).

## Rules

1. **CC0 only.** `audio/LICENSE.md` says every file in `audio/` is CC0, so keep that true. Look in the Kenney packs first (kenney.nl: UI Audio, Impact Sounds, RPG Audio and Interface Sounds), then Freesound with the licence filter set to Creative Commons 0, then OpenGameArt filtered to CC0. If a sound only exists under CC BY or anything else, leave it out and list it at the end of your report instead.
2. **Where:** `audio/samples/`.
3. **Names:** exactly the file names below: lowercase, words joined with hyphens, and numbered alternates (`-1`, `-2`) where more than one is asked for. Alternates should be genuinely different takes of the same thing, not the same file twice.
4. **Format:** mono Ogg Vorbis, 44.1 or 48 kHz, around `-q:a 4`. Aim for under 40 KB each. The harmonica phrases and the wolf howl are longer and may go to 80 KB.
5. **Prepare each file:**
   - Trim the silence at the start so the sound begins within about 5 ms. The code lines these up with animation beats (a snap with a lamp coming on, a gasp with a jolt), and a late start sounds out of sync.
   - Trim the tail once it has died away, with a short fade out rather than a hard cut.
   - Peak normalise to about -3 dBFS. The code sets each sound's level when it plays.
   - If `ffmpeg` is available, it can do all of this, e.g. `ffmpeg -i in.wav -af "silenceremove=start_periods=1:start_threshold=-50dB,afade=t=out:st=<end-0.05>:d=0.05,loudnorm" -ac 1 -c:a libvorbis -q:a 4 out.ogg`. Check each result's length with `ffprobe`.
6. **No real voices saying words.** Breaths, gasps, a "shh" and a howl are fine. Anything with speech in it is not: his lines are drawn as speech bubbles with the synthesised babble.
7. **Credit every file** in `audio/LICENSE.md`: under the Kenney section if it came from a Kenney pack not already listed, or as a new line in the Freesound style (`file`: “original title” by author, URL, CC0). Add an OpenGameArt section if you use it.
8. **`SOUND_FILES`:** the acts are built, and every group below is in `SOUND_FILES` (script.js) under its group name. A replacement file only needs the same file name.

## Already in the library (don't source these)

| Existing group | Files | Will be used for |
|---|---|---|
| `cloth` | `cloth-1.ogg`, `cloth-2.ogg` | Sitting down, lying back, hands into pockets |
| `step` | `step-grass-1.ogg` to `step-grass-5.ogg` | Sleepwalking (slow and soft), the step back after the howl |
| `land` | `land-soft-1.ogg`, `land-soft-2.ogg` | Star jumps, quieter |
| `swish` | `swish-1.ogg`, `swish-2.ogg` | Throwing the paper plane, the arm through the mist, flicking the toothbrush |
| `clap` | `clap-1.ogg`, `clap-2.ogg` | Cupping the firefly, played soft |
| `rustle` | `paper-flip-1.ogg`, `paper-flip-2.ogg` | Unwrapping the sandwich |
| `snore` | `snore-1.ogg`, `snore-2.ogg` | Nodding off, very quietly |
| `firePop` | `fire-pop-1.ogg` to `fire-pop-3.ogg` | The fire's pop in the ghost story, the marshmallow crackling |
| `birdChirp`, `birdFlutter` | `bird-chirp-1.ogg`, `bird-chirp-2.ogg`, `bird-flutter.ogg` | Lunch with the bird, goodnight to the bird, the head torch waking it |
| `watchTap` | `watch-tap.ogg` | Clocking off |
| `uiClick` | `ui-click-1.ogg`, `ui-click-2.ogg` | Taps on his phone: do not disturb, the mute button, dark mode |
| `uiSwitch` | `ui-switch.ogg` | The lamps coming on to his snap (`noises.flick` already uses it) |
| `serverAlarm` | `server-alarm.ogg` | The 3 a.m. page, very quiet |
| `wishChime` | `wish-chime.ogg` | Fallback for the twinkles if none are found |

These stay synthesised and need no file: the dawn chorus and the bird's reply phrase fallback (`birdPhrase`), the crickets (`cricketChirp`), the laptop's lid and keys (`sfx.lid`, `sfx.key`), the firefly's sparkle, the paper plane's flight (`sfx.whoosh`), bites (`sfx.bite`) and his spoken lines (`sfx.babble`).

These acts need nothing new: Shading the sunrise, Parting the mist, Star jumps, Finger frame, Lunch with the bird, Screen break, Standup, Catching a firefly, Shadow puppets, Dark mode, Sleepwalking, Moon in his palm.

## To source

**Priority 1** is the first section: sounds shared by several acts, so they're useful whichever acts get built. If Naeem gives you a shortlist from the pitch page, source the sounds for those acts next; otherwise go in the order below. Length is the target once trimmed.

### Shared (priority 1)

| File | Group | What it should sound like | Length | Used by |
|---|---|---|---|---|
| `breath-in.ogg` | `breathIn` | One slow, deep, calm breath in through the nose, as at the start of a yoga pose. Close and clean | 1.2 to 2 s | Sun salutation |
| `breath-out-1.ogg`, `breath-out-2.ogg` | `breathOut` | One long, relaxed breath out through the mouth, a contented sigh rather than a sad one | 1 to 2 s | Sun salutation, Warm hands (breathing into his hands), Clocking off, Watching it go down |
| `blow-1.ogg`, `blow-2.ogg` | `blow` | A short puff through pursed lips, as when blowing on hot coffee or blowing out a candle | 0.3 to 0.6 s | First coffee, Toasting a marshmallow |
| `gasp-1.ogg`, `gasp-2.ogg` | `gasp` | A quick, startled breath in, as someone jolted awake. No voice, no scream | 0.2 to 0.5 s | Nodding off, The 3 a.m. page, Ghost story |
| `phone-vibrate.ogg` | `phoneVibrate` | A phone vibrating in a trouser pocket: two short buzzes, muffled by cloth. No ringtone | 0.6 to 1 s | Clocking off, The 3 a.m. page. It can replace the square wave `noises.buzz` for incidents too |
| `wind-gust-1.ogg`, `wind-gust-2.ogg` (optional) | `windGust` | One gust of wind passing through grass and trees, rising and falling away. No rain, no howling | 2.5 to 3 s | Finger to the wind, Kite in the gust. It could replace the gust's synthesised hiss everywhere |

### Dawn

| File | Group | What it should sound like | Length | Used by |
|---|---|---|---|---|
| `coffee-sip-1.ogg`, `coffee-sip-2.ogg` | `coffeeSip` | A careful sip of a hot drink from a mug: a small slurp. A wordless "ah" after it is fine | 0.5 to 1.2 s | First coffee |
| `hand-rub.ogg` | `handRub` | Two dry hands rubbed together briskly to warm them | 1 to 1.8 s | Warm hands |
| `whistle-1.ogg`, `whistle-2.ogg` | `whistle` | A person whistling a short, bright phrase of two or three notes, as if calling back to a bird. Not a wolf whistle and not a known tune | 0.6 to 1.2 s | Answering the chorus |
| `bird-song-1.ogg`, `bird-song-2.ogg` | `birdSong` | One songbird singing a single short phrase (a robin, wren or blackbird), with no other birds behind it. Longer and more musical than `bird-chirp` | 1 to 2 s | Answering the chorus, Goodnight to the bird |
| `toothbrush.ogg` | `toothbrush` | Brushing teeth with a manual toothbrush, close up, brisk back and forth. Loopable is a bonus | 1.5 to 2.5 s | Brushing his teeth |
| `gargle.ogg` | `gargle` | A short gargle of water | 0.8 to 1.5 s | Brushing his teeth |
| `boot-squelch-1.ogg`, `boot-squelch-2.ogg` | `bootSquelch` | A boot lifted out of wet grass or soft mud: a small wet squelch | 0.2 to 0.5 s | Wet boots |

### Day

| File | Group | What it should sound like | Length | Used by |
|---|---|---|---|---|
| `duck-squeak.ogg` | `duckSqueak` | A rubber duck squeezed once | 0.2 to 0.5 s | Rubber duck |
| `marker-scribble.ogg` | `scribble` | A felt pen or marker scribbling quickly on a small pad of paper | 1 to 2 s | Paper prototype |
| `paper-crumple.ogg` | `paperCrumple` | One sheet of paper crumpled into a ball in both hands | 0.5 to 1 s | Paper prototype |
| `sticky-note.ogg` | `stickyNote` | A sticky note peeled off its pad: a short, soft peel | 0.2 to 0.5 s | Paper prototype |
| `paper-fold-1.ogg`, `paper-fold-2.ogg` | `paperFold` | One crisp fold of a sheet of printer paper, pressed flat with a fingernail | 0.2 to 0.5 s | Paper plane |
| `build-pass.ogg` | `buildPass` | A short, bright interface success sound: two or three rising notes, clean and friendly | 0.4 to 0.9 s | Waiting on the build, and the page resolving itself at 3 a.m. |
| `kite-flap.ogg` | `kiteFlap` | A small fabric kite fluttering and snapping in a gusty wind | 1.5 to 3 s | Kite in the gust |
| `call-join.ogg` (optional) | `callJoin` | A soft two tone chime, like someone joining a video call. Not any real app's own sound | 0.4 to 0.8 s | You're on mute |

### Dusk

| File | Group | What it should sound like | Length | Used by |
|---|---|---|---|---|
| `camera-shutter-1.ogg`, `camera-shutter-2.ogg` | `shutter` | A phone camera's shutter click, the classic mechanical sound | under 0.4 s | Sunset photo |
| `finger-snap-1.ogg`, `finger-snap-2.ogg` | `snap` | One crisp finger snap, dry and close, no room echo | under 0.2 s | Conducting the lamps |
| `ignite.ogg` | `ignite` | A small flame catching: a soft whoomp, like a match flaring. Small, not a fireball | 0.4 to 0.8 s | Toasting a marshmallow |
| `harmonica-1.ogg`, `harmonica-2.ogg` | `harmonica` | A slow, bluesy harmonica phrase, solo with no backing, ending on a held note. Two different phrases | 3 to 6 s | Harmonica |
| `twinkle-1.ogg`, `twinkle-2.ogg`, `twinkle-3.ogg` (optional) | `twinkle` | Single soft notes of a glockenspiel or celesta at three rising pitches, all from the same instrument. Without them the code plays `wish-chime` quietly | 0.6 to 1.2 s | First stars (one note per star he counts), Stargazing (one per star he traces) |

### Night

| File | Group | What it should sound like | Length | Used by |
|---|---|---|---|---|
| `torch-click-1.ogg`, `torch-click-2.ogg` | `torchClick` | The button of a small flashlight or head torch clicked: a firm plastic click | under 0.2 s | Head torch, Ghost story |
| `shush-1.ogg`, `shush-2.ogg` | `shush` | A person going "shh" softly, as if hushing a room. Breath only, no words | 0.6 to 1.2 s | Shushing the crickets |
| `wolf-howl.ogg` | `wolfHowl` | One wolf howling, outdoors, from far away. The code makes it quieter and more distant still | 2 to 4 s | Howl at the moon (the howl that answers him) |
| `howl-human.ogg` (optional) | `howlHuman` | A person doing a playful "awooo" at the moon, clearly a person and not a wolf. Without it the code plays `wolf-howl` higher and shorter | 1 to 2 s | Howl at the moon (his own howl) |

## Totals

30 sounds (26 needed, 4 optional) in 46 files (39 needed, 7 optional).

## When you're done, report back

- Each file saved, with its source URL and length.
- Anything you couldn't find under CC0, with the best non CC0 candidate you saw, so Naeem can decide.
- Anything that's a compromise (a room echo you couldn't remove, only one take where two were asked for, a voice audible in the background).
