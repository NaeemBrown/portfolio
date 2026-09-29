/* ======================================================================
   POI artifacts

   One useful object lives at each portfolio stop. Once its panel has been
   put away and Naeem is stationed there, that object replaces the generic
   idle pool with five small, authored interactions. This file loads after
   living.js and before script.js; its functions run only after script.js has
   built the rig and scenery.
   ====================================================================== */

const poiArtifactRoots = {};

function poiArtifactBuild() {
  if (Object.keys(poiArtifactRoots).length) return;

  // ABOUT: an open field journal between the log and the fire. Its stand is
  // deliberately narrow enough to keep the camp silhouette open.
  poiArtifactRoots.about = worldSet('set--poi-artifact set--artifact-about', campX, 22, 104, 190, (p) => {
    p.line('artifact-stand', [[43, 0], [63, 126], [84, 0]], [[38, 58], [88, 58]]);
    p.open('data-artifact-part="journal"');
    p.poly('artifact-paper', [[32, 126], [61, 132], [61, 163], [29, 157]]);
    p.poly('artifact-paper', [[61, 132], [94, 126], [96, 157], [61, 163]]);
    p.line('artifact-detail', [[61, 132], [61, 163]], [[37, 146], [55, 149]], [[68, 147], [87, 143]]);
    p.close();
    p.open('data-artifact-part="page"');
    p.poly('artifact-paper artifact-page', [[63, 133], [91, 129], [92, 154], [63, 159]]);
    p.line('artifact-detail', [[69, 146], [86, 143]], [[69, 151], [83, 148]]);
    p.close();
    p.open('data-artifact-part="pencil"');
    p.line('artifact-pencil', [[39, 164], [73, 169]]);
    p.close();
    p.circle('artifact-dial', 84, 166, 10);
    p.open('data-artifact-part="needle"');
    p.line('artifact-needle', [[84, 166], [88, 173]]);
    p.close();
    p.open('data-artifact-part="leaf"');
    p.poly('artifact-leaf', [[48, 139], [54, 146], [50, 154], [44, 147]]);
    p.line('artifact-detail', [[48, 140], [49, 153]]);
    p.close();
  });

  // PROJECTS: a small clockwork prototype on the near side of the existing
  // bench. The world layer fades while the project camera is orbiting.
  poiArtifactRoots.projects = worldSet('set--poi-artifact set--artifact-projects', benchX, 42, 142, 206, (p) => {
    p.rect('artifact-machine', 48, 102, 136, 124, 2);
    p.rect('artifact-machine', 63, 124, 125, 151, 3);
    p.open('data-artifact-part="gear-large"');
    p.circle('artifact-gear', 82, 145, 16);
    p.circle('artifact-hole', 82, 145, 5);
    p.line('artifact-gear-line', [[82, 129], [82, 161]], [[66, 145], [98, 145]], [[71, 134], [93, 156]], [[93, 134], [71, 156]]);
    p.close();
    p.open('data-artifact-part="gear-small"');
    p.circle('artifact-gear artifact-gear--small', 111, 139, 11);
    p.circle('artifact-hole', 111, 139, 3.5);
    p.line('artifact-gear-line', [[111, 128], [111, 150]], [[100, 139], [122, 139]]);
    p.close();
    p.open('data-artifact-part="arm"');
    p.line('artifact-machine-line', [[96, 151], [96, 180], [118, 193]]);
    p.circle('artifact-joint', 96, 180, 4);
    p.circle('artifact-joint', 118, 193, 4);
    p.close();
    p.open('data-artifact-part="crank"');
    p.line('artifact-crank', [[127, 141], [137, 141], [137, 151]]);
    p.circle('artifact-joint', 137, 153, 3);
    p.close();
    p.open('data-artifact-part="lamp"');
    p.circle('artifact-glow', 111, 171, 11);
    p.rect('artifact-lamp', 105, 163, 117, 177, 4);
    p.close();
    p.open('data-artifact-part="measure"');
    p.rect('artifact-paper', 50, 155, 57, 194, 1);
    p.line('artifact-detail', [[53, 160], [57, 160]], [[53, 168], [56, 168]], [[53, 176], [57, 176]], [[53, 184], [56, 184]]);
    p.close();
    p.open('data-artifact-part="sparks"');
    p.line('artifact-spark', [[117, 183], [123, 190]], [[122, 180], [130, 181]], [[116, 177], [119, 169]]);
    p.close();
  });

  // EXPERIENCE: the wayfinder stands at today's stop, where the handcar and
  // the character come to rest rather than back at the route's beginning.
  // The chalkboard has no line, so no wayfinder (chalkboard.js).
  const experienceStop = LINE.stops[LINE.stops.length - 1];
  if (!BOARD_MODE) poiArtifactRoots.experience = worldSet('set--poi-artifact set--artifact-experience', experienceX,
    experienceStop + 30, experienceStop + 164, 242, (p) => {
      const x = experienceStop + 96;
      p.line('artifact-stand', [[x - 42, 0], [x - 35, 174]], [[x + 42, 0], [x + 35, 174]]);
      p.rect('artifact-machine', x - 50, 70, x + 50, 180, 4);
      p.open('data-artifact-part="route"');
      p.circle('artifact-dial artifact-dial--route', x - 20, 146, 23);
      p.line('artifact-route-line', [[x - 20, 124], [x - 20, 168]], [[x - 42, 146], [x + 2, 146]]);
      p.open('data-artifact-part="route-needle"');
      p.line('artifact-signal', [[x - 20, 146], [x - 14, 162]]);
      p.close();
      p.close();
      p.open('data-artifact-part="slats"');
      for (let y = 158; y >= 118; y -= 10) {
        p.rect('artifact-paper artifact-slat', x + 12, y, x + 41, y + 7, 2);
        p.circle('artifact-amber-dot', x + 35, y + 3.5, 2);
      }
      p.close();
      p.open('data-artifact-part="ticket"');
      p.rect('artifact-ticket', x - 33, 70, x - 12, 96, 1);
      p.line('artifact-detail', [[x - 29, 85], [x - 16, 85]], [[x - 29, 80], [x - 20, 80]]);
      p.close();
      p.open('data-artifact-part="stamp"');
      p.line('artifact-machine-line', [[x + 3, 78], [x + 3, 102]]);
      p.circle('artifact-red', x + 3, 105, 6);
      p.rect('artifact-dark', x - 7, 72, x + 13, 78, 1);
      p.close();
      p.open('data-artifact-part="signal"');
      p.line('artifact-signal', [[x + 50, 150], [x + 66, 206]]);
      p.circle('artifact-red', x + 68, 211, 8);
      p.close();
      p.open('data-artifact-part="watch"');
      p.circle('artifact-watch', x - 52, 205, 9);
      p.line('artifact-detail', [[x - 52, 205], [x - 52, 211]], [[x - 52, 205], [x - 47, 201]]);
      p.line('artifact-chain', [[x - 52, 214], [x - 46, 224], [x - 50, 234]]);
      p.close();
    });

  // SKILLS: a portable analyzer tucked in front of the main console. It is
  // small enough not to compete with the CRT when the terminal opens.
  poiArtifactRoots.skills = worldSet('set--poi-artifact set--artifact-skills', skillsX, -142, -35, 220, (p) => {
    // The terminal camera is painted above the world. Shift the analyzer to
    // his left so it remains fully visible beside, rather than behind, the
    // monitor in the settled side view.
    p.open('transform="translate(-180 0)"');
    p.line('artifact-stand', [[59, 0], [66, 93]], [[123, 0], [116, 93]], [[57, 15], [125, 15]]);
    p.circle('artifact-wheel', 59, 6, 6);
    p.circle('artifact-wheel', 123, 6, 6);
    p.rect('artifact-machine', 53, 92, 129, 178, 4);
    p.rect('artifact-screen', 61, 115, 108, 164, 3);
    p.open('data-artifact-part="trace"');
    p.line('artifact-trace', [[64, 137], [72, 137], [78, 151], [86, 122], [94, 148], [105, 137]]);
    p.close();
    p.open('data-artifact-part="dial"');
    p.circle('artifact-dial', 119, 148, 7);
    p.line('artifact-needle', [[119, 148], [122, 153]]);
    p.close();
    p.open('data-artifact-part="keys"');
    p.rect('artifact-dark', 64, 101, 101, 110, 2);
    p.line('artifact-key-lines', [[69, 105], [73, 105]], [[78, 105], [82, 105]], [[87, 105], [91, 105]], [[96, 105], [99, 105]]);
    p.close();
    p.open('data-artifact-part="lights"');
    p.circle('artifact-led artifact-led--green', 119, 130, 3);
    p.circle('artifact-led artifact-led--amber', 119, 120, 3);
    p.circle('artifact-led artifact-led--red', 119, 110, 3);
    p.close();
    p.open('data-artifact-part="cable"');
    p.line('artifact-cable', [[82, 92], [82, 68], [111, 58], [116, 92]]);
    p.rect('artifact-plug', 108, 86, 120, 96, 2);
    p.close();
    p.open('data-artifact-part="antenna"');
    p.line('artifact-machine-line', [[102, 178], [108, 207]]);
    p.circle('artifact-joint', 109, 210, 3);
    p.close();
    p.open('data-artifact-part="wipe"');
    p.poly('artifact-wipe', [[77, 128], [93, 132], [89, 146], [73, 142]]);
    p.close();
    p.close();
  });
}

function poiArtifactSetMotion(id, motion = '') {
  const root = poiArtifactRoots[id];
  if (!root) return;
  if (motion) root.dataset.motion = motion;
  else delete root.dataset.motion;
}

function poiArtifactMakeAct(id, motion, duration, frames, options = {}) {
  const { beats = {}, ...rest } = options;
  const act = keyframeAct(`artifact-${id}-${motion}`, duration, frames, { ...rest, beats });
  const drawPose = act.pose;
  const finish = act.end;
  let began = false;
  act.poi = id;
  act.motion = motion;
  act.hands = true;
  act.pose = (base, running, dt, now, unit) => {
    if (!began) {
      began = true;
      poiArtifactSetMotion(id, motion);
    }
    ambient.face = id === 'skills' ? -1 : 1;
    return drawPose(base, running, dt, now, unit);
  };
  act.end = (cancelled) => {
    if (poiArtifactRoots[id]?.dataset.motion === motion) poiArtifactSetMotion(id);
    finish?.(cancelled);
  };
  return act;
}

const poiArtifactDefinitions = {
  about: {
    anchor: () => campX,
    actions: [
      ['page', () => poiArtifactMakeAct('about', 'page', 3.1, [
        { at: 0 }, { at: 0.2, lean: 16, near: { hand: [126, 103] } },
        { at: 0.62, lean: 14, near: { hand: [123, 98] }, far: { hand: [110, 109] } }, { at: 1 },
      ], { beats: { 0.18: () => sfx.rustle(0.45) } })],
      ['write', () => poiArtifactMakeAct('about', 'write', 3.8, [
        { at: 0 }, { at: 0.18, lean: 21, near: { hand: [124, 103] }, far: { hand: [111, 110] } },
        { at: 0.82, lean: 22, near: { hand: [127, 106] }, far: { hand: [111, 110] } }, { at: 1 },
      ], { beats: { 0.28: () => sfx.tap(2.4), 0.52: () => sfx.tap(2.7), 0.7: () => sfx.tap(2.5) } })],
      ['compass', () => poiArtifactMakeAct('about', 'compass', 3.2, [
        { at: 0 }, { at: 0.24, lean: 15, near: { hand: [132, 95] } },
        { at: 0.68, lean: 10, near: { hand: [128, 93] }, far: { hand: [103, 118] } }, { at: 1 },
      ], { beats: { 0.3: () => sfx.tick(true), 0.52: () => sfx.tick() } })],
      ['leaf', () => poiArtifactMakeAct('about', 'leaf', 3.4, [
        { at: 0 }, { at: 0.2, lean: 10, near: { hand: [118, 96] } },
        { at: 0.48, lean: -2, near: { hand: [109, 45] }, far: { hand: [106, 108] } },
        { at: 0.72, lean: 8, near: { hand: [121, 99] } }, { at: 1 },
      ], { beats: { 0.18: () => sfx.rustle(0.7) } })],
      ['close', () => poiArtifactMakeAct('about', 'close', 3.2, [
        { at: 0 }, { at: 0.25, lean: 20, near: { hand: [127, 103] }, far: { hand: [111, 108] } },
        { at: 0.58, lean: 13, near: { hand: [119, 97] }, far: { hand: [106, 103] } },
        { at: 0.78, lean: -3, near: { hand: [95, 121] }, far: { hand: [46, 121] } }, { at: 1 },
      ], { beats: { 0.3: () => sfx.lid(false), 0.62: () => sfx.lid(true) } })],
    ],
  },
  projects: {
    anchor: () => benchX,
    actions: [
      ['measure', () => poiArtifactMakeAct('projects', 'measure', 3.5, [
        { at: 0 }, { at: 0.22, lean: 27, near: { hand: [127, 101] }, far: { hand: [110, 113] } },
        { at: 0.72, lean: 24, near: { hand: [124, 96] }, far: { hand: [113, 110] } }, { at: 1 },
      ], { beats: { 0.28: () => sfx.tap(2.2) } })],
      ['tighten', () => poiArtifactMakeAct('projects', 'tighten', 3.2, [
        { at: 0 }, { at: 0.2, lean: 28, near: { hand: [125, 96] }, far: { hand: [112, 105] } },
        { at: 0.72, lean: 29, near: { hand: [128, 100] }, far: { hand: [112, 105] } }, { at: 1 },
      ], { beats: { 0.3: () => sfx.tick(), 0.48: () => sfx.tick(true), 0.64: () => sfx.tick() } })],
      ['crank', () => poiArtifactMakeAct('projects', 'crank', 3.7, [
        { at: 0 }, { at: 0.18, lean: 22, near: { hand: [132, 97] } },
        { at: 0.82, lean: 19, near: { hand: [129, 105] }, far: { hand: [111, 116] } }, { at: 1 },
      ], { beats: { 0.25: () => sfx.tone(160, { type: 'triangle', to: 310, vol: 0.035, dur: 1.8 }) } })],
      ['spark', () => poiArtifactMakeAct('projects', 'spark', 3.1, [
        { at: 0 }, { at: 0.22, lean: 31, near: { hand: [129, 87] }, far: { hand: [116, 103] } },
        { at: 0.68, lean: 27, near: { hand: [126, 92] }, far: { hand: [113, 105] } }, { at: 1 },
      ], { beats: { 0.34: () => sfx.tink(0), 0.48: () => sfx.tink(1), 0.62: () => sfx.tink(2) } })],
      ['admire', () => poiArtifactMakeAct('projects', 'admire', 3.6, [
        { at: 0 }, { at: 0.25, lean: -5, near: { hand: [96, 122] }, far: { hand: [45, 122] } },
        { at: 0.56, lean: 4, near: { hand: [101, 120] }, far: { hand: [41, 120] } },
        { at: 0.78, lean: -4, near: { hand: [98, 121] }, far: { hand: [44, 121] } }, { at: 1 },
      ], { beats: { 0.48: () => sfx.chime() } })],
    ],
  },
  experience: {
    anchor: () => experienceX + LINE.stops[LINE.stops.length - 1] * view.unit,
    actions: [
      ['route', () => poiArtifactMakeAct('experience', 'route', 3.5, [
        { at: 0 }, { at: 0.2, lean: 17, near: { hand: [126, 88] } },
        { at: 0.72, lean: 14, near: { hand: [126, 94] }, far: { hand: [108, 109] } }, { at: 1 },
      ], { beats: { 0.3: () => sfx.tick(), 0.54: () => sfx.tick(true) } })],
      ['slats', () => poiArtifactMakeAct('experience', 'slats', 3.1, [
        { at: 0 }, { at: 0.2, lean: 15, near: { hand: [130, 99] } },
        { at: 0.7, lean: 12, near: { hand: [127, 93] }, far: { hand: [106, 116] } }, { at: 1 },
      ], { beats: { 0.25: () => sfx.flaps() } })],
      ['stamp', () => poiArtifactMakeAct('experience', 'stamp', 2.8, [
        { at: 0 }, { at: 0.24, lean: 24, near: { hand: [119, 116] } },
        { at: 0.43, lean: 31, near: { hand: [118, 126] } },
        { at: 0.68, lean: 20, near: { hand: [119, 112] } }, { at: 1 },
      ], { beats: { 0.42: () => sfx.tap(0.85) } })],
      ['signal', () => poiArtifactMakeAct('experience', 'signal', 3.4, [
        { at: 0 }, { at: 0.22, lean: 7, near: { hand: [133, 63] } },
        { at: 0.52, lean: 19, near: { hand: [130, 108] }, far: { hand: [103, 119] } },
        { at: 0.75, lean: 4, near: { hand: [132, 69] } }, { at: 1 },
      ], { beats: { 0.3: () => sfx.bell(), 0.6: () => sfx.tap(1.1) } })],
      ['watch', () => poiArtifactMakeAct('experience', 'watch', 3.6, [
        { at: 0 }, { at: 0.2, lean: 9, near: { hand: [97, 91] }, far: { hand: [90, 96] } },
        { at: 0.66, lean: 5, near: { hand: [98, 89] }, far: { hand: [91, 96] } },
        { at: 0.82, lean: -3, near: { hand: [128, 69] } }, { at: 1 },
      ], { beats: { 0.25: () => sfx.tick(), 0.48: () => sfx.tick(), 0.72: () => sfx.tick(true) } })],
    ],
  },
  skills: {
    anchor: () => skillsX,
    actions: [
      ['tune', () => poiArtifactMakeAct('skills', 'tune', 3.2, [
        { at: 0 }, { at: 0.2, lean: 18, near: { hand: [128, 95] } },
        { at: 0.72, lean: 18, near: { hand: [130, 101] }, far: { hand: [108, 113] } }, { at: 1 },
      ], { beats: { 0.28: () => sfx.tick(), 0.5: () => sfx.tick(true) } })],
      ['diagnose', () => poiArtifactMakeAct('skills', 'diagnose', 3.7, [
        { at: 0 }, { at: 0.2, lean: 24, near: { hand: [119, 127] }, far: { hand: [108, 128] } },
        { at: 0.82, lean: 25, near: { hand: [121, 124] }, far: { hand: [109, 126] } }, { at: 1 },
      ], { beats: { 0.3: () => sfx.tick(true), 0.48: () => sfx.tick(), 0.66: () => sfx.tick(true) } })],
      ['reseat', () => poiArtifactMakeAct('skills', 'reseat', 3.5, [
        { at: 0 }, { at: 0.22, lean: 28, near: { hand: [126, 126] }, far: { hand: [112, 115] } },
        { at: 0.46, lean: 17, near: { hand: [124, 111] }, far: { hand: [110, 115] } },
        { at: 0.68, lean: 29, near: { hand: [129, 126] }, far: { hand: [111, 115] } }, { at: 1 },
      ], { beats: { 0.36: () => noises.clunk(), 0.64: () => noises.up() } })],
      ['trace', () => poiArtifactMakeAct('skills', 'trace', 3.6, [
        { at: 0 }, { at: 0.18, lean: 19, near: { hand: [118, 92] } },
        { at: 0.45, lean: 22, near: { hand: [127, 78] } },
        { at: 0.72, lean: 18, near: { hand: [121, 101] } }, { at: 1 },
      ], { beats: { 0.25: () => sfx.tone(520, { type: 'sine', to: 880, vol: 0.03, dur: 1.5 }) } })],
      ['wipe', () => poiArtifactMakeAct('skills', 'wipe', 3.4, [
        { at: 0 }, { at: 0.2, lean: 22, near: { hand: [117, 92] }, far: { hand: [108, 112] } },
        { at: 0.48, lean: 24, near: { hand: [129, 82] }, far: { hand: [108, 112] } },
        { at: 0.72, lean: 21, near: { hand: [119, 101] }, far: { hand: [108, 112] } }, { at: 1 },
      ], { beats: { 0.22: () => sfx.rustle(0.9) } })],
    ],
  },
};

function poiArtifactStation() {
  const id = state.destinationId;
  const def = poiArtifactDefinitions[id];
  if (!def || !state.announced || openPanelId || intro.active || intro.release ||
      state.speed !== 0 || state.hop || state.jump || state.turning > 0 ||
      inputKeys.left || inputKeys.right || inputKeys.sprint) return null;

  if (id === experienceScene) {
    return !state.experienceActive && handcar.stage === 'done' ? id : null;
  }
  if (state.wantSeat || state.wantBench || state.wantForge || state.experienceActive ||
      state.seat > 0 || state.inspect > 0 || state.typeIn > 0 ||
      state.projectView > 0 || state.termView > 0 || state.compose > 0 ||
      handcar.stage !== 'off' || state.courseTime > 0) return null;

  return Math.abs(state.x - def.anchor()) <= Math.max(3, view.unit * 3) ? id : null;
}

function poiArtifactPick(id, previous = '') {
  const actions = poiArtifactDefinitions[id]?.actions || [];
  const options = actions.filter(([name]) => `artifact-${id}-${name}` !== previous);
  const selected = options[Math.floor(Math.random() * options.length)] || actions[0];
  return [`artifact-${id}-${selected[0]}`, 1, selected[1]];
}

function poiArtifactForce(id, motion) {
  const action = poiArtifactDefinitions[id]?.actions.find(([name]) => name === motion);
  if (!action || livingReduced.matches) return false;
  cancelAmbient();
  idle.last = `artifact-${id}-${motion}`;
  startAct(action[1]());
  return true;
}

// A small same-origin API for the standalone artifact viewer. Keeping this
// here means the viewer never needs to reach into the portfolio's lexical
// globals; it asks the world itself to stage the selected POI.
function poiArtifactPreview(id) {
  if (!poiArtifactDefinitions[id]) return false;

  finishIntro(false);
  greeting.active = false;
  cancelAmbient();
  closePanel(false);
  incident.cooldownUntil = Infinity;
  idle.next = Infinity;
  idle.quiet = 0;

  Object.assign(state, {
    destinationId: id,
    announced: true,
    speed: 0,
    moving: false,
    sprinting: false,
    turning: 0,
    wantSeat: false,
    wantBench: false,
    wantForge: false,
    experienceActive: false,
    seat: 0,
    compose: 0,
    inspect: 0,
    inspectHold: 0,
    projectView: 0,
    benchAside: 0,
    typeIn: 0,
    typeHold: 0,
    termView: 0,
    courseTime: 0,
    hop: null,
    jump: null,
  });

  hideCampfireProps();
  hideForgeProps();
  handcar.stage = 'off';
  handcar.x = CAR.home;

  if (id === experienceScene) {
    const stop = LINE.stops[LINE.stops.length - 1];
    handcar.x = stop - CAR.stand;
    handcar.stage = 'done';
    handcar.t = RIDE.letGo;
    state.x = state.target = experienceX + stop * view.unit;
  } else {
    state.x = state.target = { about: campX, projects: benchX, skills: skillsX }[id];
  }

  state.facing = state.flip = id === skillsScene ? -1 : 1;
  buttons.forEach((button) => {
    if (button.dataset.poi === id) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
  });
  markers.forEach((marker) => marker.classList.toggle('is-active', marker.dataset.marker === id));
  return true;
}

window.alive.artifacts = poiArtifactRoots;
window.alive.artifactDefinitions = poiArtifactDefinitions;
window.alive.forceArtifact = poiArtifactForce;
window.alive.previewArtifact = poiArtifactPreview;
