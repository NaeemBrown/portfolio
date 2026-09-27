/* ------------------------------------------------------------ the chalkboard
   Experience is a long chalkboard on a wall, with a rolling library ladder
   hooked over a brass rail along its top. Walking past, it is scenery like
   any other stop. Sent there, he rules the years along the bottom from the
   floor, climbs the ladder and writes each role in by hand, riding the
   ladder along to draw each role's bar out through the years. The camera
   leaves the side-on world as he starts, moves round him from one shoulder
   to the other while he works, and when he climbs down and steps back it
   settles side-on again, pulled back until the whole board is in view.
   Nothing opens over the page: the board is the content.

   Everything here is modelled in centimetres, with him 180 cm tall (the
   rig's 242 units), x along the board, y up and z out from the wall
   towards you. The board is drawn in scene pixels by script.js's frame()
   through drawChalkboard(), in its own SVG between the world and him, the
   same way the Projects bench is. Looked at square through a flat camera,
   it draws exactly as the side-on world does, so the camera can leave the
   world and come back to it without a join.

   His chalk writes in Stickline, the site's typeface, from the same
   centre-line skeletons fonts/build_stickline.py builds the font from.

   The whole show is a function of time: where the chalk has got, where he
   and the ladder are, and where the camera is. The camera's path is worked
   out once as he starts and averaged along a bell curve, so it never jolts.

   Loaded before script.js. At its top level it uses nothing from script.js;
   the board's plan is built the first time it is needed, from CAREER. */

const CHALKBOARD = (() => {
  const U = 242 / 180; // rig units per centimetre

  // ------------------------------------------------------------ the letters

  // Stickline's skeletons: centre lines in a box 100 units tall, y up.
  const O = 12; // how far a bar runs past the stem it meets
  const SMALL = 520 / 700; // small capital height against the capital
  const L = (...p) => ({ k: 'line', p });
  const A = (cx, cy, rx, ry, a0, a1) => ({ k: 'arc', a: [cx, cy, rx, ry, a0, a1] });
  const R = (cx, cy, rx, ry) => ({ k: 'ring', a: [cx, cy, rx, ry] });
  const D = (x, y) => ({ k: 'dot', a: [x, y] });
  const S_SKEL = [A(37, 75, 29, 25, 25, 270), A(37, 25, 31, 25, 90, -155)];
  const GLYPHS = {
    A: [L([0, 0], [38, 100], [76, 0]), L([13 - O, 34], [63 + O, 34])],
    B: [L([0, 0], [0, 100]), L([-O, 100], [30, 100]), A(30, 76, 26, 24, 90, -90), L([30, 52], [0, 52]),
      L([0, 52], [33, 52]), A(33, 26, 28, 26, 90, -90), L([33, 0], [-O, 0])],
    C: [A(51, 50, 51, 51.5, 42, 318)],
    D: [L([0, 0], [0, 100]), L([-O, 100], [28, 100]), A(28, 50, 52, 50, 90, -90), L([28, 0], [-O, 0])],
    E: [L([0, 0], [0, 100]), L([-O, 100], [62, 100]), L([0, 51], [52, 51]), L([-O, 0], [62, 0])],
    F: [L([0, 0], [0, 100]), L([-O, 100], [60, 100]), L([0, 51], [50, 51])],
    G: [A(51, 50, 51, 51.5, 42, 360), L([102, 50], [60, 50])],
    H: [L([0, 0], [0, 100]), L([72, 0], [72, 100]), L([-O, 52], [72 + O, 52])],
    I: [L([0, 0], [0, 100])],
    J: [L([46, 100], [46, 30]), A(23, 30, 23, 30, 0, -180)],
    K: [L([0, 0], [0, 100]), L([62, 100], [0, 38]), L([24, 62], [66, 0])],
    L: [L([0, 100], [0, 0]), L([-O, 0], [58, 0])],
    M: [L([0, 0], [0, 100], [45, 28], [90, 100], [90, 0])],
    N: [L([0, 0], [0, 100], [72, 0], [72, 100])],
    O: [R(51, 50, 51, 51.5)],
    P: [L([0, 0], [0, 100]), L([-O, 100], [30, 100]), A(30, 74, 28, 26, 90, -90), L([30, 48], [0, 48])],
    Q: [R(51, 50, 51, 51.5), L([64, 24], [100, -8])],
    R: [L([0, 0], [0, 100]), L([-O, 100], [30, 100]), A(30, 74, 28, 26, 90, -90), L([30, 48], [0, 48]),
      L([28, 48], [62, 0])],
    S: S_SKEL,
    $: [...S_SKEL, L([37, 112], [37, -12])],
    T: [L([0, 100], [76, 100]), L([38, 100], [38, 0])],
    U: [L([0, 100], [0, 36]), A(36, 36, 36, 36, 180, 360), L([72, 36], [72, 100])],
    V: [L([0, 100], [38, 0], [76, 100])],
    W: [L([0, 100], [24, 0], [52, 72], [80, 0], [104, 100])],
    X: [L([0, 100], [70, 0]), L([0, 0], [70, 100])],
    Y: [L([0, 100], [37, 50], [74, 100]), L([37, 50], [37, 0])],
    Z: [L([0, 100], [68, 100], [0, 0], [70, 0])],
    0: [R(36, 50, 36, 51)],
    1: [L([4, 80], [28, 100], [28, 0])],
    2: [A(34, 68, 32, 32, 160, -35), L([60.2, 49.6], [0, 0], [70, 0])],
    3: [A(34, 75, 26, 25, 155, -90), A(34, 25, 30, 25, 90, -150)],
    4: [L([52, 0], [52, 100], [0, 30], [72, 30])],
    5: [L([64, 100], [12, 100], [14.3, 52.6]), A(38, 32, 31, 32, 140, -145)],
    6: [R(36, 32, 33, 32), L([60, 100], [7, 45])],
    7: [L([0, 100], [70, 100], [22, 0])],
    8: [R(36, 76, 25, 24), R(36, 26, 29, 26)],
    9: [R(36, 68, 33, 32), L([65, 55], [12, 0])],
    '.': [D(0, 0)],
    ',': [L([3, 4], [-4, -16])],
    "'": [L([0, 100], [0, 72])],
    '&': [L([72, 0], [17.6, 65.9]), A(31, 80, 19, 20, 225, -45), L([44.4, 65.9], [11.2, 36]),
      A(32, 24, 24, 24, 150, 360), L([56, 24], [70, 42])],
    '/': [L([0, -6], [46, 106])],
    '+': [L([0, 44], [60, 44]), L([30, 14], [30, 74])],
    '·': [D(0, 46)],
  };

  // One skeleton item as polylines, arcs sampled every few degrees.
  function sample(item) {
    if (item.k === 'line') return [item.p.map((p) => [p[0], p[1]])];
    if (item.k === 'dot') return [[[item.a[0] - 1, item.a[1] + 3], [item.a[0] + 1, item.a[1] + 4]]];
    const [cx, cy, rx, ry, a0 = 110, a1 = 470] = item.a;
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 8));
    return [Array.from({ length: n + 1 }, (_, i) => {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    })];
  }

  // A stroke that starts where the last ended is the same pen movement.
  function merge(lines) {
    const out = [];
    for (const line of lines) {
      const last = out[out.length - 1];
      const end = last && last[last.length - 1];
      if (end && Math.hypot(end[0] - line[0][0], end[1] - line[0][1]) < 1.5) last.push(...line.slice(1));
      else out.push(line.slice());
    }
    return out;
  }

  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  // A line of text from a baseline at x = 0, `cap` centimetres tall.
  // Lowercase letters are small capitals, as in the typeface. Each letter
  // sits a little off true, the way a hand writes on a board.
  function layout(text, cap, seed) {
    const gap = cap * 0.24;
    const strokes = [];
    let x = 0;
    [...text].forEach((ch, i) => {
      if (ch === ' ') {
        x += cap * 0.42;
        return;
      }
      const upper = ch.toUpperCase();
      const skel = GLYPHS[upper];
      if (!skel) {
        x += cap * 0.4;
        return;
      }
      const sy = ((ch !== upper ? SMALL : 1) * cap) / 100;
      const sx = ch !== upper ? sy * 1.08 : sy;
      const lines = merge(skel.flatMap(sample));
      const xs = lines.flat().map((p) => p[0]);
      const min = Math.min(...xs);
      const w = (Math.max(...xs) - min) * sx;
      const h = 100 * sy;
      const rot = (hash(seed * 31 + i) - 0.5) * 0.06;
      const dy = (hash(seed * 17 + i * 3) - 0.5) * 0.05 * cap;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      for (const line of lines) {
        strokes.push(line.map(([px, py]) => {
          const lx = (px - min) * sx - w / 2;
          const ly = py * sy - h / 2;
          return [x + w / 2 + lx * c - ly * s, h / 2 + lx * s + ly * c + dy];
        }));
      }
      x += w + gap;
    });
    return { width: Math.max(0, x - gap), strokes };
  }

  // --------------------------------------------------------------- the plan

  const BOARD = { w: 1000, h: 360, x0: -500, y0: 70 }; // its slate; the bottom left corner
  const RUNG = 30; // the ladder's rungs are this far apart, the first this far up
  const LADDER = { half: 25, baseZ: 45, topZ: 12, topY: 452, parked: 530, home: 530, rungs: 14 }; // parked just past the board's end
  const FLOOR_Z = 30; // his toes at the board, writing from the floor
  const SHOULDER_UP = 121; // his shoulders above his feet
  const STAND_AT = [620, 0, 190]; // where he steps back to, clear of the board

  // How long each of his lines stays up: ms to start with, ms more a word,
  // and never less than SAY_MIN; then SAY_GAP seconds before the next.
  const SAY_BASE = 1600;
  const SAY_WORD = 350;
  const SAY_MIN = 2800;
  const SAY_GAP = 0.4;
  // Seconds for the camera to come back to the world when he is sent to
  // another stop, and LEAVE_HURRY times as fast when he is walked off
  // (script.js).
  const OUT = 1.1;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smoother = (k) => k * k * k * (k * (k * 6 - 15) + 10);
  const ease = (k) => k * k * (3 - 2 * k);
  const easeSine = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);
  const ladderZ = (y) => LADDER.baseZ + ((LADDER.topZ - LADDER.baseZ) * y) / LADDER.topY;

  let plan = null;

  // Where a pen is at time t along a track of [t, u, v, down], and that
  // point on the board in centimetres.
  function penOn(track, t) {
    if (t <= track[0][0]) return { u: track[0][1], v: track[0][2], down: 0 };
    let lo = 0;
    let hi = track.length - 1;
    if (t >= track[hi][0]) return { u: track[hi][1], v: track[hi][2], down: 0 };
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (track[mid][0] <= t) lo = mid;
      else hi = mid;
    }
    const a = track[lo];
    const b = track[hi];
    const k = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 1;
    return { u: lerp(a[1], b[1], k), v: lerp(a[2], b[2], k), down: Math.min(a[3], b[3]) };
  }
  const onBoard = (q) => [BOARD.x0 + q.u, BOARD.y0 + q.v, q.down ? 0.9 : 6];

  // What goes on the board and when, from CAREER: the years along the
  // bottom, a heading, then each role, oldest first, with a bar out through
  // the years it ran and, for a role with a `result`, that under the bar.
  function buildPlan() {
    const today = new Date();
    const NOW = today.getFullYear() + (today.getMonth() + today.getDate() / 31) / 12;
    const yearOf = (ym) => ym[0] + (ym[1] - 1) / 12;
    const first = CAREER[0].from[0];
    const perYear = Math.min(112, 800 / (NOW - first + 0.5));
    const X = (yr) => 70 + (yr - first) * perYear;
    // The rung that puts writing at height y just below his shoulder.
    const rungFor = (y) => clamp(Math.round((BOARD.y0 + y - SHOULDER_UP + 8) / RUNG), 1, 12);

    let seed = 1;
    const stroke = (pts, color = 'white', w = 1.7) => ({ pts, color, w });
    const words = (str, u, v, cap, color, w) => {
      const g = layout(str, cap, seed++);
      return { width: g.width, strokes: g.strokes.map((s) => stroke(s.map(([x, y]) => [u + x, v + y]), color, w)) };
    };
    const centred = (str, u, v, cap, color, w) => words(str, u - layout(str, cap, 0).width / 2, v, cap, color, w).strokes;
    // A ruled line, cut into short pieces with a faint hand wobble.
    const rule = (u0, v0, u1, v1, wob = 0.5) => {
      const n = Math.max(2, Math.ceil(Math.hypot(u1 - u0, v1 - v0) / 6));
      const s = seed++;
      return Array.from({ length: n + 1 }, (_, i) => {
        const k = i / n;
        return [lerp(u0, u1, k), lerp(v0, v1, k) + Math.sin(k * 9.1 + s) * wob + Math.sin(k * 23.7) * wob * 0.4];
      });
    };

    // The years, drawn from the floor a year at a time.
    const axis = [];
    const end = Math.min(960, X(NOW) + 80);
    let from = 50;
    for (let yr = first; yr <= Math.floor(NOW); yr++) {
      const x = X(yr);
      axis.push({ speed: 400, strokes: [stroke(rule(from, 62, x, 62), 'white', 2)] });
      axis.push({ speed: 660, strokes: [stroke([[x, 69], [x, 55]], 'white', 1.8), ...centred(String(yr), x, 26, 16, 'yellow', 1.7)] });
      from = x;
    }
    axis.push({ speed: 400, strokes: [stroke(rule(from, 62, X(NOW), 62), 'white', 2)] });
    axis.push({ speed: 660, strokes: [stroke([[X(NOW), 70], [X(NOW), 54]], 'yellow', 1.8), ...centred('now', X(NOW), 30, 16, 'yellow', 1.6)] });
    axis.push({ speed: 400, strokes: [stroke(rule(X(NOW), 62, end, 62), 'white', 2), stroke([[end - 13, 71], [end, 62], [end - 13, 53]], 'white', 2)] });

    // From the ladder: the heading, which he spells wrong, stares at, rubs
    // out with his sleeve and puts right, underlined on the way back; then
    // the roles.
    const TITLE = { u: 50, v: 300, cap: 40 };
    const stem = words('EXPERI', TITLE.u, TITLE.v, TITLE.cap, 'white', 2.3);
    const tailU = TITLE.u + stem.width + TITLE.cap * 0.24;
    const wrong = words('ANCE', tailU, TITLE.v, TITLE.cap, 'white', 2.3);
    const right = words('ENCE', tailU, TITLE.v, TITLE.cap, 'white', 2.3);
    wrong.strokes.forEach((w) => { w.wrong = true; });
    const wipe = [];
    for (let u = tailU - 6, k = 0; u <= tailU + Math.max(wrong.width, right.width) + 8; u += 13, k++) {
      wipe.push([u, TITLE.v + (k % 2 ? 44 : -4)]);
    }
    const titleRung = rungFor(320);
    const tasks = [
      { speed: 560, rung: titleRung, key: 'title', strokes: [...stem.strokes, ...wrong.strokes] },
      { speed: 300, rung: titleRung, key: 'wipe', pause: 1.1, strokes: [stroke(wipe, 'smudge', 9)] },
      { speed: 560, rung: titleRung, key: 'fix', strokes: right.strokes },
      { speed: 480, rung: titleRung, key: 'underline', strokes: [stroke(rule(tailU + right.width + 10, 285, 46, 288, 1.2), 'white', 2)] },
    ];
    const spacing = CAREER.length > 1 ? Math.min(64, 128 / (CAREER.length - 1)) : 0;
    const bars = [];
    CAREER.forEach((job, i) => {
      const bar = 238 - i * spacing;
      const x0 = X(yearOf(job.from));
      const x1 = job.to ? X(yearOf(job.to)) : X(NOW);
      const rung = rungFor(bar + 8);
      const tail = job.to
        ? stroke([[x1, bar + 8], [x1, bar - 8]], 'white', 2)
        : stroke([[x1 - 12, bar + 8], [x1, bar], [x1 - 12, bar - 8]], 'white', 2);
      bars.push([BOARD.x0 + x1, BOARD.y0 + bar]);
      tasks.push(
        { speed: 640, rung, key: `label${i}`, strokes: words(job.title.join(' ').toUpperCase(), x0, bar + 12, 18, 'white', 1.9).strokes },
        { speed: 380, rung, key: `bar${i}`, strokes: [
          stroke([[x0, bar + 8], [x0, bar - 8]], 'white', 2), stroke(rule(x0, bar, x1, bar, 0.7), 'white', 2.2), tail,
        ] },
      );
      // What came of it, in small yellow letters under the bar, written
      // briskly so it adds only a moment to the show.
      if (job.result) {
        const v = bar - 24;
        tasks.push({ speed: 900, brisk: 0.55, rung: rungFor(v + 8), key: `result${i}`, strokes: words(job.result, x0, v, 11, 'yellow', 1.5).strokes });
      }
    });

    // Runs tasks from time t with the pen at `pen`: the pen's track, and
    // every chalk point stamped with the moment it goes down.
    const track = []; // [t, u, v, down]
    const chalk = []; // { pts, times, color, w }
    const run = (list, t, pen) => {
      track.push([t, pen[0], pen[1], 0]);
      for (const task of list) {
        task.gapStart = t;
        task.strokes.forEach((s, j) => {
          const [u0, v0] = s.pts[0];
          const d = Math.hypot(u0 - pen[0], v0 - pen[1]);
          const hold = j === 0 ? task.pause || 0 : 0;
          const gap = j === 0 ? 0.3 + d / 460 : (0.045 + d / 1400) * (task.brisk || 1);
          track.push([t + hold + gap * 0.18, pen[0], pen[1], 0], [t + hold + gap * 0.82, u0, v0, 0]);
          t += hold + gap;
          if (j === 0) task.start = t;
          const times = [t];
          track.push([t, u0, v0, 1]);
          for (let k = 1; k < s.pts.length; k++) {
            t += Math.hypot(s.pts[k][0] - s.pts[k - 1][0], s.pts[k][1] - s.pts[k - 1][1]) / task.speed;
            times.push(t);
            track.push([t, s.pts[k][0], s.pts[k][1], 1]);
          }
          chalk.push({ ...s, times });
          pen = s.pts[s.pts.length - 1];
        });
        task.end = t;
      }
      return t;
    };

    const penAt = (t) => penOn(track, t);
    const penWorld = (t) => onBoard(penAt(t));

    // The phases of the show. He starts where the years start.
    const phases = {};
    let t = 0;
    const phase = (name, dur) => {
      phases[name] = { t0: t, t1: t + dur };
      t += dur;
    };
    phases.floor = { t0: 0, t1: run(axis, 0, [40, 95]) + 0.3 };
    t = phases.floor.t1;
    phase('toLadder', 1.4);
    phase('climb', 3.6);
    // His chalk hand starts by the parked ladder, and so does the focus.
    tasks[0].lead = [LADDER.parked + 32 - BOARD.x0, titleRung * RUNG + 125 - BOARD.y0];
    phases.ladder = { t0: t, t1: run(tasks, t, tasks[0].lead) + 0.5 };
    t = phases.ladder.t1;
    phase('down', 1.1);
    phase('stepBack', 4.6);
    phase('admire', 3);
    const smear = chalk.find((c) => c.color === 'smudge');
    for (const c of chalk) {
      if (!c.wrong) continue;
      const mid = c.pts.reduce((sum, q) => sum + q[0], 0) / c.pts.length;
      c.goneAt = smear.times[Math.max(0, smear.pts.findIndex((q) => q[0] >= mid))];
    }

    // What he adds by himself later, when he is left alone at it (see his
    // idles): three dots after the arrow, and a small face under it.
    const face = [955, 33];
    const later = {
      dots: [0, 1, 2].map((i) => stroke([[end + 16 + i * 12, 61], [end + 17 + i * 12, 62.5]], 'white', 2.6)),
      doodle: [
        stroke(Array.from({ length: 23 }, (_, i) => [face[0] + 11 * Math.cos(1.9 + i * 0.3), face[1] + 11 * Math.sin(1.9 + i * 0.3)]), 'yellow', 1.5),
        stroke([[face[0] - 4, face[1] + 3], [face[0] - 3.5, face[1] + 4]], 'yellow', 2),
        stroke([[face[0] + 4, face[1] + 3], [face[0] + 4.5, face[1] + 4]], 'yellow', 2),
        stroke(Array.from({ length: 8 }, (_, i) => [face[0] + 6 * Math.cos(3.6 + i * 0.3), face[1] + 6 * Math.sin(3.6 + i * 0.3)]), 'yellow', 1.5),
      ],
    };
    for (const [kind, list] of Object.entries(later)) list.forEach((c) => chalk.push({ ...c, times: null, extra: kind }));
    const extras = {
      dots: chalk.filter((c) => c.extra === 'dots'),
      doodle: chalk.filter((c) => c.extra === 'doodle'),
    };

    // Where the work is: the furthest the chalk has got along each task,
    // lightly smoothed, easing from one task to the next. His body, the
    // ladder and the camera follow this, never the chalk tip itself, which
    // darts back and forth inside every letter.
    const STEP = 0.05;
    const focusTasks = [...axis, ...tasks];
    for (const task of focusTasks) {
      const pts = task.strokes.flatMap((s) => s.pts);
      const vs = pts.map((p) => p[1]);
      const mid = (Math.min(...vs) + Math.max(...vs)) / 2;
      const dir = Math.sign(pts[pts.length - 1][0] - pts[0][0]) || 1;
      const reach = [];
      for (let tt = task.start; tt < task.end + STEP; tt += STEP) {
        const u = penAt(Math.min(tt, task.end)).u;
        const last = reach.length ? reach[reach.length - 1] : u;
        reach.push(dir > 0 ? Math.max(last, u) : Math.min(last, u));
      }
      task.reach = reach.map((_, i) => {
        let sum = 0;
        for (let j = -3; j <= 3; j++) sum += reach[clamp(i + j, 0, reach.length - 1)];
        return sum / 7;
      });
      task.from = [task.reach[0], mid];
      task.to = [task.reach[task.reach.length - 1], mid];
    }
    const focusAt = (tt) => {
      let prev = focusTasks[0].from;
      for (const task of focusTasks) {
        if (tt < task.gapStart) break;
        if (task.lead) prev = task.lead;
        if (tt < task.start) {
          const k = smoother(clamp((tt - task.gapStart) / (task.start - task.gapStart)));
          prev = [lerp(prev[0], task.from[0], k), lerp(prev[1], task.from[1], k)];
          break;
        }
        if (tt < task.end) {
          const x = (tt - task.start) / STEP;
          const i = Math.min(task.reach.length - 2, Math.floor(x));
          prev = [lerp(task.reach[i], task.reach[i + 1], x - i), task.from[1]];
          break;
        }
        prev = task.to;
      }
      return [BOARD.x0 + prev[0], BOARD.y0 + prev[1], 0];
    };

    const floorX = (tt) => focusAt(clamp(tt, phases.floor.t0, phases.floor.t1))[0] - 24;
    const ladderX = (tt) => {
      const Lp = phases.ladder;
      if (tt < Lp.t0) return LADDER.parked;
      const x = clamp(focusAt(clamp(tt, Lp.t0, Lp.t1))[0] - 32, -470, 470);
      // Down again, he sends it rolling back to where it was parked.
      const k = clamp((tt - phases.stepBack.t0) / 1.6);
      return lerp(x, LADDER.home, 1 - (1 - k) ** 3);
    };
    // Which rung his feet are on, as a continuous count.
    const rungAt = (tt) => {
      const c = phases.climb;
      if (tt < c.t0) return 0;
      if (tt < c.t1) return (titleRung * (tt - c.t0)) / (c.t1 - c.t0);
      if (tt < phases.ladder.t1) {
        let prev = titleRung;
        for (const task of tasks) {
          if (tt < task.start) return lerp(prev, task.rung, clamp((tt - task.gapStart) / (task.start - task.gapStart)));
          if (tt <= task.end) return task.rung;
          prev = task.rung;
        }
        return prev;
      }
      const last = tasks[tasks.length - 1].rung;
      const dn = phases.down;
      return tt < dn.t1 ? lerp(last, 0, (tt - dn.t0) / (dn.t1 - dn.t0)) : 0;
    };

    // The shots. It starts on the world as it is, swings in behind him, and
    // swaps from one side of him to the other as he goes, then settles
    // side-on, pulled back until the whole board is in view.
    const task = (key) => tasks.find((k) => k.key === key);
    const last = CAREER.length - 1;
    const middle = Math.min(1, last);
    const shots = [
      { t: 0, blend: 0, type: 'world' },
      { t: 0.15, blend: 3.6, type: 'orbit', az: [28, 40], el: 14, r: 130, fov: 44, roll: 0 },
      { t: axis[Math.min(6, axis.length - 1)].gapStart, blend: 3.4, type: 'orbit', az: [-72, -60], el: 5, r: 165, fov: 44, roll: 0.8 },
      { t: axis[Math.max(0, axis.length - 6)].gapStart, blend: 3.4, type: 'orbit', az: [60, 48], el: 10, r: 150, fov: 44, roll: -0.8 },
      { t: phases.floor.t1 - 0.3, blend: 3, type: 'climb' },
      { t: task('title').gapStart + 0.3, blend: 3, type: 'track', offset: [240, 30, 450], lookOffset: [-110, 95, -30], fov: 38, roll: 0 },
      { t: task('title').start - 0.3, blend: 3, type: 'orbit', az: [-52, -40], el: 20, r: 125, fov: 46, roll: 0.8 },
      { t: task('wipe').gapStart + 0.2, blend: 2.4, type: 'orbit', az: [-6, 4], el: 8, r: 175, fov: 40, roll: 0 },
      { t: task('label0').gapStart, blend: 3, type: 'orbit', az: [30, 18], el: 14, r: 112, fov: 46, roll: -0.8 },
      { t: task('bar0').gapStart, blend: 3, type: 'line' },
      ...(middle > 0 ? [
        { t: task(`label${middle}`).gapStart, blend: 3, type: 'orbit', az: [26, 36], el: 38, r: 125, fov: 46, roll: 0 },
        { t: task(`bar${middle}`).gapStart, blend: 3, type: 'ahead', at: bars[middle] },
      ] : []),
      ...(last > middle ? [
        { t: task(`label${last}`).gapStart, blend: 3, type: 'orbit', az: [-42, -30], el: 12, r: 108, fov: 48, roll: 0.8 },
        { t: task(`bar${last}`).gapStart, blend: 3, type: 'orbit', az: [62, 52], el: 6, r: 135, fov: 46, roll: 0 },
      ] : []),
      { t: phases.down.t0, blend: 6.2, type: 'reveal' },
    ];
    const duration = phases.admire.t1;
    shots.forEach((s, i) => { s.t1 = i < shots.length - 1 ? shots[i + 1].t : duration; });

    // Sounds: each stroke of chalk, the sleeve, the ladder rolling any
    // distance and his claps at the end; and what he says as he goes.
    const cues = [];
    chalk.forEach((c, i) => {
      if (c.times) cues.push({ t: c.times[0], play: () => chalkSound(c.color, c.times[c.times.length - 1] - c.times[0], i) });
    });
    tasks.forEach((k, i) => {
      const was = i ? tasks[i - 1].to[0] : tasks[0].lead[0];
      if (Math.abs(k.from[0] - was) > 250) cues.push({ t: k.gapStart + 0.1, play: () => sfx.whoosh(0.9, 0, false) });
    });
    for (const at of [0.25, 0.55]) cues.push({ t: phases.admire.t0 + at, play: () => clap(phases.admire.t0 + at) });
    // Each line stays up as long as it takes to read, and waits for the one
    // before it to go rather than cutting it short.
    const said = [];
    const say = (t, lines) => said.push({ t, lines });
    say(0.7, ['Right.', 'Let me show you how I got here.']);
    say(phases.toLadder.t0 + 0.2, ['Bear with me.', 'It&rsquo;s a tall board.']);
    say(task('fix').end + 0.2, ['Nobody saw that.']);
    CAREER.forEach((job, i) => { if (job.say) say(task(`label${i}`).gapStart + 0.3, job.say); });
    say(phases.admire.t0 + 1.1, ['There.', 'That&rsquo;s the story so far.']);
    said.sort((a, b) => a.t - b.t);
    let free = 0;
    for (const { t, lines } of said) {
      const at = Math.max(t, free);
      const ms = Math.max(SAY_MIN, SAY_BASE + SAY_WORD * lines.join(' ').split(/\s+/).length);
      cues.push({ t: at, play: () => sayLine(lines, ms) });
      free = at + ms / 1000 + SAY_GAP;
    }
    cues.sort((a, b) => a.t - b.t);

    plan = { chalk, extras, end, phases, shots, duration, done: phases.stepBack.t1, cues, penWorld, focusAt, floorX, ladderX, rungAt };
    plan.mark = floorX(0); // where he stands to start, which is the Experience mark
    return plan;
  }
  const getPlan = () => plan || buildPlan();

  // ------------------------------------------------------------------ him

  // His proportions are the rig's (see figureJoints in script.js), in cm.
  const FIG = {
    thigh: 50 / U, shin: 48 / U, toe: 18 / U, upper: 38 / U, fore: 30 / U,
    shoulders: 70 / U, neck: 89 / U, head: 112 / U, headR: 23 / U, hip: 7 / U, shoulder: 20 / U,
  };
  const HIP = 71; // his hips above his feet, standing
  const RIG_Z = FLOOR_Z + 5; // how far out from the wall the side-on world has him

  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => mul(a, 1 / (len(a) || 1));
  const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  // Yaw 0 faces the board (towards -z); his right is then +x.
  const facing = (yaw) => ({ f: [Math.sin(yaw), 0, -Math.cos(yaw)], r: [Math.cos(yaw), 0, Math.sin(yaw)] });

  function torso(hip, yaw, lean, side) {
    const { f, r } = facing(yaw);
    const up = norm(add(add([0, 1, 0], mul(f, Math.tan(lean))), mul(r, Math.tan(side))));
    const across = add(hip, mul(up, FIG.shoulders));
    return {
      f, r, up, neck: add(hip, mul(up, FIG.neck)),
      shR: add(across, mul(r, FIG.shoulder)), shL: sub(across, mul(r, FIG.shoulder)),
    };
  }
  // A hand hanging at his side, swung forward by `swing`.
  const restHand = (T, side, swing = 0) =>
    add(add(side < 0 ? T.shL : T.shR, mul(T.up, -46)), add(mul(T.f, 3 + swing), mul(T.r, side * 3)));

  // A walking foot: planted for half its cycle, then swung two steps on.
  function stepFoot(s, Ls, o) {
    const w = s / (2 * Ls) + o;
    const n = Math.floor(w);
    const swing = clamp((w - n - 0.5) * 2);
    return { along: 2 * Ls * (n - o + easeSine(swing)) + Ls / 2, lift: Math.sin(Math.PI * swing) * 8 };
  }
  // Side on to the board: the leading foot steps out, the other follows.
  function shuffleFoot(s, St, o) {
    const w = s / St;
    const n = Math.floor(w);
    const m = easeSine(clamp((w - n - o) * 2));
    return { along: St * (n + m), lift: Math.sin(Math.PI * m) * 5 };
  }
  // On the ladder: each foot goes up a rung in its half of the count.
  function rungFoot(c, o) {
    const w = c + o;
    const n = Math.floor(w);
    const m = easeSine(clamp((w - n - 0.5) * 2));
    return { rung: n + m, swing: Math.sin(Math.PI * m) };
  }

  function walkPose(P, t, ph, P0, P1, opts = {}) {
    const k = clamp((t - ph.t0) / (ph.t1 - ph.t0));
    const D = sub(P1, P0);
    const d = norm(D);
    const s = len(D) * easeSine(k);
    const travel = Math.atan2(d[0], -d[2]);
    const yaw = opts.yaw ? opts.yaw(k, travel) : travel;
    const { f, r } = facing(yaw);
    const Ls = opts.stride || 24;
    const cyc = (s / (2 * Ls)) * Math.PI * 2;
    const hip = add(add(P0, mul(d, s)), [0, HIP - 1 - 1.2 * (1 - Math.cos(cyc * 2)), 0]);
    const feet = [0, 0.5].map((o, i) => {
      const st = stepFoot(s, Ls, o);
      return add(add(P0, mul(d, st.along)), add(mul(r, i ? 6 : -6), [0, st.lift, 0]));
    });
    const T = torso(hip, yaw, 0.04, 0);
    const swing = Math.sin(cyc) * 11;
    return {
      hip, yaw, lean: 0.04, side: 0, footL: feet[0], footR: feet[1],
      handL: restHand(T, -1, swing), handR: restHand(T, 1, -swing),
      look: add(add(hip, [0, 60, 0]), mul(f, 200)), hips: 0,
    };
  }

  function floorPose(P, t) {
    const ph = P.phases.floor;
    const pen = P.penWorld(t);
    const x0 = P.floorX(ph.t0);
    const ax = P.floorX(t);
    const lead = shuffleFoot(ax - x0, 30, 0);
    const trail = shuffleFoot(ax - x0, 30, 0.5);
    const crouch = clamp((125 - P.focusAt(t)[1]) * 0.5, 0, 14);
    const hip = [ax, HIP - crouch, FLOOR_Z + 5];
    const side = clamp((pen[0] - ax) / 260, -0.2, 0.2) * 0.5;
    const lean = 0.08 + crouch * 0.012;
    const T = torso(hip, 0.1, lean, side);
    return {
      hip, yaw: 0.1, lean, side,
      footL: [x0 + trail.along - 8, trail.lift, FLOOR_Z], footR: [x0 + lead.along + 8, lead.lift, FLOOR_Z + 3],
      handL: restHand(T, -1, 2), handR: pen, look: pen, hips: 0,
    };
  }

  // On the ladder, climbing (penWeight 0) or writing (penWeight 1).
  const ladderPose = (P, t, penWeight) => onLadder(P.ladderX(t), P.rungAt(t), P.penWorld(t), penWeight);

  // On a ladder at LX with his feet `c` rungs up, holding the rails, his
  // right hand `penWeight` of the way to `pen`.
  function onLadder(LX, c, pen, penWeight) {
    const feet = [0, 0.5].map((o, i) => {
      const st = rungFoot(c, o);
      const y = st.rung * RUNG;
      return [LX + (i ? 7 : -7), y + st.swing * 5, ladderZ(y) + 5 + st.swing * 9];
    });
    const hipY = (feet[0][1] + feet[1][1]) / 2 + 68;
    const hip = [LX, hipY, ladderZ(hipY) + 14];
    pen = pen || [LX + LADDER.half, hipY + 40, 0];
    const rail = (o, sx) => {
      const y = rungFoot(c + 0.3, o).rung * RUNG + 125;
      return [LX + sx * LADDER.half, y, ladderZ(y) + 3];
    };
    return {
      hip, yaw: 0, lean: 0.17 + 0.1 * penWeight, side: clamp((pen[0] - LX) / 200, -0.3, 0.3) * 0.6 * penWeight,
      footL: feet[0], footR: feet[1], handL: rail(0, -1), handR: mix3(rail(0.5, 1), pen, penWeight),
      look: mix3(add(hip, [0, 130, -60]), pen, penWeight), hips: 0,
    };
  }

  const ladderFoot = (x) => [x, 0, LADDER.baseZ + 16];
  // Stepping back he turns to walk clear of the board, then turns to look at it.
  const backOpts = {
    stride: 22,
    yaw: (k, travel) => (k < 0.2 ? lerp(0, travel, ease(k / 0.2)) : lerp(travel, -0.45, ease(clamp((k - 0.72) / 0.28)))),
  };
  const PHASES = [
    { name: 'floor', blend: 0, fn: floorPose },
    { name: 'toLadder', blend: 0.3, fn: (P, t) => walkPose(P, t, P.phases.toLadder,
      [P.floorX(P.phases.floor.t1), 0, FLOOR_Z], ladderFoot(LADDER.parked), { yaw: () => 0, stride: 18 }) },
    { name: 'climb', blend: 0.45, fn: (P, t) => ladderPose(P, t, 0) },
    { name: 'ladder', blend: 0, fn: (P, t) => {
      const Lp = P.phases.ladder;
      return ladderPose(P, t, ease(clamp((t - Lp.t0) / 0.7)) * ease(clamp((Lp.t1 - t) / 0.5)));
    } },
    { name: 'down', blend: 0, fn: (P, t) => ladderPose(P, t, 0) },
    { name: 'stepBack', blend: 0.4, fn: (P, t) => walkPose(P, t, P.phases.stepBack,
      ladderFoot(P.ladderX(P.phases.ladder.t1)), STAND_AT, backOpts) },
    { name: 'admire', blend: 0, fn: (P, t) => restPose(P, t) },
  ];

  // Stood back from the board: two claps to knock the chalk off his hands,
  // then hands on hips, breathing, looking at it.
  function restPose(P, t) {
    const ph = P.phases.stepBack;
    const p = walkPose(P, ph.t1, ph, ladderFoot(P.ladderX(P.phases.ladder.t1)), STAND_AT, backOpts);
    const lt = Math.max(0, t - P.phases.admire.t0);
    const up = ease(clamp(lt / 0.15)) * (1 - ease(clamp((lt - 0.75) / 0.15)));
    if (up > 0) {
      const T = torso(p.hip, p.yaw, p.lean, p.side);
      const apart = 13 * (0.5 + 0.5 * Math.cos((2 * Math.PI * (lt - 0.1)) / 0.3)); // together at 0.25 s and 0.55 s
      const middle = add(add(p.hip, mul(T.up, 44)), mul(T.f, 22));
      p.handR = mix3(p.handR, add(middle, mul(T.r, apart)), up);
      p.handL = mix3(p.handL, sub(middle, mul(T.r, apart)), up);
    }
    const k = ease(clamp((lt - 0.9) / 0.7));
    p.hip = add(p.hip, [0, Math.sin(lt * 2.2) * 0.6 * k, 0]);
    p.hips = k;
    p.look = mix3(p.look, [0, 250, 0], k);
    return p;
  }

  // One pose part way to another. A hand without its own hip weight takes
  // the pose's.
  function blendPose(a, b, k) {
    const out = {};
    for (const key of Object.keys(b)) {
      if (Array.isArray(b[key])) out[key] = mix3(a[key], b[key], k);
      else out[key] = lerp(a[key] ?? (key.startsWith('hips') ? a.hips : b[key]), b[key], k);
    }
    return out;
  }

  function poseAt(P, t) {
    let i = PHASES.findIndex((ph) => t < P.phases[ph.name].t1);
    if (i < 0) i = PHASES.length - 1;
    const cur = PHASES[i];
    const pose = cur.fn(P, t);
    const into = t - P.phases[cur.name].t0;
    if (i > 0 && cur.blend && into < cur.blend) {
      const prev = PHASES[i - 1].fn(P, Math.min(t, P.phases[PHASES[i - 1].name].t1));
      return blendPose(prev, pose, ease(clamp(into / cur.blend)));
    }
    return pose;
  }

  // ------------------------------------------------------------ his idles

  // Left alone at the finished board, now and then he gets up to something,
  // as he does at every other stop, and comes back to stand looking at it.
  // Each idle is a run of segments, each a pose over its own time `lt`;
  // `ladder` moves the ladder, `pen` is his chalk while he writes, and
  // `events` happen once at a time into the idle.
  const HOME_YAW = -0.45; // facing the board from where he stands back
  const wrapAngle = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

  const walkSeg = (from, to, dur, fromYaw, toYaw) => ({
    dur,
    pose: (P, lt) => walkPose(P, lt, { t0: 0, t1: dur }, from, to, {
      stride: 22,
      yaw: (k, travel) => (k < 0.25
        ? fromYaw + wrapAngle(travel - fromYaw) * ease(k / 0.25)
        : travel + wrapAngle(toYaw - travel) * ease(clamp((k - 0.7) / 0.3))),
    }),
  });

  // Writing at the board from the floor, standing at `at`.
  function boardPose(at, pen) {
    const crouch = clamp((125 - pen[1]) * 0.5, 0, 14);
    const hip = [at[0], HIP - crouch, FLOOR_Z + 5];
    const side = clamp((pen[0] - at[0]) / 260, -0.2, 0.2) * 0.5;
    const lean = 0.08 + crouch * 0.012;
    return {
      hip, yaw: 0.1, lean, side, footL: [at[0] - 8, 0, FLOOR_Z], footR: [at[0] + 8, 0, FLOOR_Z + 3],
      handL: restHand(torso(hip, 0.1, lean, side), -1, 2), handR: pen, look: pen, hips: 0,
    };
  }

  // Writes `strokes` from show time t0, stamping each point with when it
  // goes down, standing at `at`.
  function writeSeg(strokes, at, t0) {
    const track = [];
    let pen = [strokes[0].pts[0][0] - 18, strokes[0].pts[0][1] + 16];
    let t = t0;
    track.push([t, pen[0], pen[1], 0]);
    for (const c of strokes) {
      const [u0, v0] = c.pts[0];
      const gap = 0.2 + Math.hypot(u0 - pen[0], v0 - pen[1]) / 900;
      track.push([t + gap * 0.8, u0, v0, 0]);
      t += gap;
      c.times = [t];
      track.push([t, u0, v0, 1]);
      for (let k = 1; k < c.pts.length; k++) {
        t += Math.hypot(c.pts[k][0] - c.pts[k - 1][0], c.pts[k][1] - c.pts[k - 1][1]) / 260;
        c.times.push(t);
        track.push([t, c.pts[k][0], c.pts[k][1], 1]);
      }
      pen = c.pts[c.pts.length - 1];
    }
    track.push([t + 0.2, pen[0] - 10, pen[1] + 12, 0]);
    return { dur: t + 0.4 - t0, pen: (lt) => onBoard(penOn(track, t0 + lt)), pose: (P, lt) => boardPose(at, onBoard(penOn(track, t0 + lt))) };
  }

  // Leaning on the ladder's end, legs crossed, looking out at whoever is there.
  function leanPose(at, lt) {
    const hip = [at[0] - 3, HIP - 2, at[2]];
    const T = torso(hip, Math.PI, 0.02, 0.16);
    const railY = 128;
    return {
      hip, yaw: Math.PI, lean: 0.02, side: 0.16,
      footR: [at[0] - 6, 0, at[2] - 2], footL: [at[0] - 13, 0, at[2] + 9],
      handR: [LADDER.home + LADDER.half + 1, railY, ladderZ(railY) + 3],
      handL: add(add(hip, mul(T.r, -13)), mul(T.up, 5)),
      look: add(hip, [-120, 70 + 6 * Math.sin(lt * 1.3), 260]), hips: 0,
    };
  }

  // On the ladder's bottom rung, riding it along the rail, one hand and one
  // foot out for fun.
  function ridePose(LX, c, fun) {
    const p = onLadder(LX, c, null, 0);
    if (fun > 0) {
      const T = torso(p.hip, 0, p.lean, 0);
      p.handL = mix3(p.handL, add(add(T.shL, mul(T.r, -44)), mul(T.up, 14)), fun);
      p.footL = mix3(p.footL, add(p.footL, [-24, 10, 18]), fun);
    }
    return p;
  }

  // Blowing the chalk dust off his fingers, then shaking his hand out.
  function blowPose(P, t, lt) {
    const p = restPose(P, t);
    const T = torso(p.hip, p.yaw, p.lean, p.side);
    const raise = ease(clamp((lt - 0.2) / 0.4)) * (1 - ease(clamp((lt - 2.1) / 0.5)));
    const head = add(p.hip, mul(T.up, FIG.head));
    const shake = lt > 1.4 && lt < 2.1 ? Math.sin(lt * 42) * 3.5 : 0;
    p.handR = add(add(add(head, mul(T.up, -7)), mul(T.f, 13)), mul(T.r, 4 + shake));
    p.hipsR = 1 - raise;
    p.look = mix3(p.look, p.handR, raise);
    return p;
  }

  function makeIdle(P, name, t0) {
    const home = STAND_AT;
    if (name === 'lean') {
      const at = [LADDER.home + LADDER.half + 20, 0, LADDER.baseZ + 24];
      return { segs: [walkSeg(home, at, 1.5, HOME_YAW, Math.PI), { dur: 2.8, pose: (_, lt) => leanPose(at, lt) },
        walkSeg(at, home, 1.5, Math.PI, HOME_YAW)] };
    }
    if (name === 'ride') {
      const foot = ladderFoot(LADDER.home);
      const RIDE = 2.8;
      const dx = (lt) => -160 * Math.sin((Math.PI * clamp(lt / RIDE)));
      return {
        segs: [
          walkSeg(home, foot, 1.4, HOME_YAW, 0),
          { dur: 0.5, pose: (_, lt) => ridePose(LADDER.home, lt / 0.5, 0) },
          { dur: RIDE, pose: (_, lt) => ridePose(LADDER.home + dx(lt), 1, Math.sin((Math.PI * lt) / RIDE)), ladder: dx },
          { dur: 0.5, pose: (_, lt) => ridePose(LADDER.home, 1 - lt / 0.5, 0) },
          walkSeg(foot, home, 1.4, 0, HOME_YAW),
        ],
        events: [{ at: 1.95, run: () => sfx.whoosh(1.2, 0, true) }],
      };
    }
    if (name === 'blow') {
      return {
        segs: [{ dur: 2.8, pose: (P2, lt) => blowPose(P2, t0 + lt, lt) }],
        events: [{ at: 0.95, run: (pose) => { blowDust(pose); sfx.breath(); } }],
      };
    }
    // Something added to the board: the dots after the arrow, or the face.
    const list = P.extras[name];
    const firstU = list[0].pts[0][0];
    const at = [BOARD.x0 + firstU - 24, 0, FLOOR_Z];
    const write = writeSeg(list, at, t0 + 1.6);
    return { segs: [walkSeg(home, at, 1.6, HOME_YAW, 0.1), write, walkSeg(at, home, 1.6, 0.1, HOME_YAW)] };
  }

  // The idle's pose `ct` seconds in, easing from one segment to the next,
  // and in from and out to how he stands; with the ladder's shift and his
  // chalk, if any.
  function idlePose(P, idle, ct, t) {
    let start = 0;
    let out = null;
    for (let i = 0; i < idle.segs.length; i++) {
      const seg = idle.segs[i];
      if (ct < start + seg.dur || i === idle.segs.length - 1) {
        const lt = clamp(ct - start, 0, seg.dur);
        let pose = seg.pose(P, lt);
        if (i > 0 && lt < 0.35) {
          const prev = idle.segs[i - 1];
          pose = blendPose(prev.pose(P, prev.dur), pose, ease(lt / 0.35));
        }
        out = { pose, ladder: seg.ladder ? seg.ladder(lt) : 0, pen: seg.pen ? seg.pen(lt) : null };
        break;
      }
      start += seg.dur;
    }
    const rest = restPose(P, t);
    const into = ease(clamp(ct / 0.4)) * (1 - ease(clamp((ct - idle.dur) / 0.5)));
    out.pose = blendPose(rest, out.pose, into);
    return out;
  }

  // A steady point on him for the camera: his hips without the bob of each
  // step or rung.
  const anchorAt = (P, t) => {
    const hip = poseAt(P, t).hip;
    return [hip[0], HIP - 1 + RUNG * P.rungAt(t), hip[2]];
  };

  function ik(a, target, l1, l2, pole) {
    let d = sub(target, a);
    let dist = len(d);
    const max = l1 + l2 - 0.3;
    if (dist > max) {
      d = mul(d, max / dist);
      dist = max;
    }
    dist = Math.max(dist, Math.abs(l1 - l2) + 0.5);
    const dn = norm(d);
    let p = sub(pole, mul(dn, dot(pole, dn)));
    p = len(p) < 1e-4 ? [0, 0, 1] : norm(p);
    const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    return [add(a, add(mul(dn, x), mul(p, h))), add(a, mul(dn, dist))];
  }

  // His joints for a pose, laid out as figureJoints lays out the rig's:
  // near is his right side, far his left.
  function solve(pose) {
    const T = torso(pose.hip, pose.yaw, pose.lean, pose.side);
    const { f, r, up } = T;
    const hipR = add(pose.hip, mul(r, FIG.hip));
    const hipL = sub(pose.hip, mul(r, FIG.hip));
    const knee = add(f, mul(up, 0.2));
    const [kneeR, ankleR] = ik(hipR, pose.footR, FIG.thigh, FIG.shin, add(knee, mul(r, 0.15)));
    const [kneeL, ankleL] = ik(hipL, pose.footL, FIG.thigh, FIG.shin, add(knee, mul(r, -0.15)));
    const toeDir = norm([f[0], 0, f[2]]);
    const toe = (a) => add(a, mul(toeDir, FIG.toe));
    const onHip = (sx) => add(add(pose.hip, mul(r, sx * 13)), add(mul(up, 5), mul(f, 1.5)));
    const hipsR = pose.hipsR ?? pose.hips;
    const hipsL = pose.hipsL ?? pose.hips;
    const handRT = hipsR ? mix3(pose.handR, onHip(1), hipsR) : pose.handR;
    const handLT = hipsL ? mix3(pose.handL, onHip(-1), hipsL) : pose.handL;
    const elbow = (sx) => add(add(mul(up, -0.7), mul(r, sx * (0.8 + (sx > 0 ? hipsR : hipsL) * 1.5))), mul(f, -0.35));
    const [elbowR, handR] = ik(T.shR, handRT, FIG.upper, FIG.fore, elbow(1));
    const [elbowL, handL] = ik(T.shL, handLT, FIG.upper, FIG.fore, elbow(-1));
    const headDir = norm(add(up, mul(norm(sub(pose.look, T.neck)), 0.3)));
    return {
      hip: pose.hip, neck: T.neck, head: add(T.neck, mul(headDir, FIG.head - FIG.neck)),
      hips: [hipR, hipL], shoulders: [T.shR, T.shL],
      nearLeg: [hipR, kneeR, ankleR, toe(ankleR)], farLeg: [hipL, kneeL, ankleL, toe(ankleL)],
      nearArm: [T.shR, elbowR, handR], farArm: [T.shL, elbowL, handL],
    };
  }

  // The rig's joints as the side-on world has him (script.js's
  // figureJoints), moved into the board's centimetres. `standX` is where he
  // stands in units from the mark; facing left, he is mirrored about his hip.
  function rigJoints(P, pose, standX, flip) {
    const j = figureJoints(pose, standX, 0);
    const hipX = P.mark + j.hip[0] / U;
    const move = (p) => {
      const x = P.mark + p[0] / U;
      return [flip < 0 ? 2 * hipX - x : x, p[1] / U, RIG_Z + p[2] / U];
    };
    const out = {};
    for (const [key, value] of Object.entries(j)) out[key] = Array.isArray(value[0]) ? value.map(move) : move(value);
    return out;
  }
  function mixJoints(a, b, k) {
    if (k <= 0) return a;
    if (k >= 1) return b;
    const out = {};
    for (const key of Object.keys(b)) {
      out[key] = Array.isArray(b[key][0]) ? b[key].map((p, i) => mix3(a[key][i], p, k)) : mix3(a[key], b[key], k);
    }
    return out;
  }

  // ------------------------------------------------------------- the camera

  // A camera is the point it looks at (px, py, pz), which way it looks at
  // it (az round from square on, el from level, roll), its scale there in
  // px per cm (as a log, ls), and inv, one over its distance. An inv of 0 is
  // the flat view the side-on world has. cx, cy put the point on screen, and
  // lift is how far it has left the world's own view (0 is the world's).
  const RADIAN = Math.PI / 180;
  const KEYS = ['px', 'py', 'pz', 'az', 'el', 'roll', 'ls', 'inv', 'cx', 'cy', 'lift'];

  function lens(c) {
    const ca = Math.cos(c.az);
    const sa = Math.sin(c.az);
    const ce = Math.cos(c.el);
    const se = Math.sin(c.el);
    const ahead = [-sa * ce, -se, -ca * ce];
    const r0 = [ca, 0, -sa];
    const u0 = [-sa * se, ce, -ca * se];
    const right = add(mul(r0, Math.cos(c.roll)), mul(u0, Math.sin(c.roll)));
    const up = sub(mul(u0, Math.cos(c.roll)), mul(r0, Math.sin(c.roll)));
    const pivot = [c.px, c.py, c.pz];
    const S = Math.exp(c.ls);
    return {
      c, S,
      flat: Math.abs(c.az) + Math.abs(c.el) + Math.abs(c.roll) < 1e-6 && c.inv < 1e-9,
      // How far in front of the camera a point is, as a share of the way to
      // the pivot's plane: below 0 it is behind.
      reach: (p) => 1 + dot(sub(p, pivot), ahead) * c.inv,
      project(p) {
        const rel = sub(p, pivot);
        const depth = dot(rel, ahead);
        const s = S / Math.max(0.12, 1 + depth * c.inv);
        return { x: c.cx + s * dot(rel, right), y: c.cy - s * dot(rel, up), s, depth };
      },
    };
  }

  // A shot looking from `pos` at `look`, framed in the screen below the
  // navbar. `fov` spans its shorter side, so a phone held upright sees as
  // much across as a desktop does up and down.
  function aim(pos, look, fov, roll) {
    const d = sub(pos, look);
    const dist = len(d);
    const half = Math.min(sceneWidth, sceneHeight - navHeight) / 2;
    return {
      px: look[0], py: look[1], pz: look[2], az: Math.atan2(d[0], d[2]), el: Math.asin(clamp(d[1] / dist, -1, 1)),
      roll: roll * RADIAN, ls: Math.log(half / (dist * Math.tan((fov / 2) * RADIAN))),
      inv: 1 / dist, cx: sceneWidth / 2, cy: (sceneHeight + navHeight) / 2, lift: 1,
    };
  }

  // The world's own view, looking square at him where he stands at `x`.
  function worldView(P, markX, rise, unit, x) {
    const S = U * unit;
    return {
      px: x, py: 130, pz: RIG_Z, az: 0, el: 0, roll: 0, ls: Math.log(S), inv: 0,
      cx: markX + (x - P.mark) * S, cy: floorY + rise - 130 * S, lift: 0,
    };
  }

  // Side-on again, pulled back until the board and him beside it fit.
  function revealView(rise, unit) {
    const x0 = BOARD.x0 - 14;
    const x1 = STAND_AT[0] + 40;
    const m = Math.max(24, sceneWidth * 0.05);
    const S = Math.min((sceneWidth - 2 * m) / (x1 - x0), (floorY + rise - navHeight - m) / (LAMP.wall[1] + 14), 1.2 * U * unit);
    return { px: (x0 + x1) / 2, py: 0, pz: 0, az: 0, el: 0, roll: 0, ls: Math.log(S), inv: 0, cx: sceneWidth / 2, cy: floorY + rise, lift: 1 };
  }

  function shotView(P, shot, t, hip, ends) {
    if (shot.type === 'world') return ends.world;
    if (shot.type === 'reveal') return ends.reveal;
    const k = clamp((t - shot.t) / (shot.t1 - shot.t));
    const focus = P.focusAt(t);
    if (shot.type === 'orbit') {
      const az = lerp(shot.az[0], shot.az[1], easeSine(k)) * RADIAN;
      const el = shot.el * RADIAN;
      const centre = [hip[0], hip[1] + 64, hip[2]];
      const off = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
      return aim(add(centre, mul(off, shot.r)), mix3(focus, centre, 0.2), shot.fov, shot.roll);
    }
    if (shot.type === 'climb') {
      const x = P.ladderX(t);
      return aim([x - 180, 30 + (hip[1] - HIP) * 0.45, 255], add(hip, [10, 40, -10]), 42, 0);
    }
    if (shot.type === 'track') return aim(add(hip, shot.offset), add(hip, shot.lookOffset), shot.fov, shot.roll);
    if (shot.type === 'ahead') {
      // Parked where the bar will end, looking back as he rides towards it.
      return aim([shot.at[0] + 170, shot.at[1] - 15, 190], mix3(focus, add(hip, [0, 60, 0]), 0.4), 44, 0);
    }
    // Down the line: behind and to his left, looking along the board ahead
    // of the chalk.
    return aim(add(hip, [-175, 58, 165]), add(focus, [90, 0, 0]), 44, 1.2);
  }

  function blendViews(a, b, k) {
    const out = {};
    for (const key of KEYS) out[key] = lerp(a[key], b[key], k);
    let daz = b.az - a.az;
    daz -= 2 * Math.PI * Math.round(daz / (2 * Math.PI));
    out.az = a.az + daz * k;
    return out;
  }

  // Each shot eased in over the camera as it was, including any move still
  // under way, so a new shot always starts from exactly where it is.
  function chain(P, shots, i, t, hip, ends) {
    const shot = shots[i];
    const c = shotView(P, shot, t, hip, ends);
    const k = shot.blend ? clamp((t - shot.t) / shot.blend) : 1;
    if (i === 0 || k >= 1) return c;
    return blendViews(chain(P, shots, i - 1, t, hip, ends), c, smoother(k));
  }

  // The whole path, fifty times a second, averaged along a bell curve about
  // a second wide (three running averages make one). Played back, the
  // camera only reads from this.
  const STEP = 0.02;
  const SMOOTH = 22; // half the running average's width, in steps
  function buildTrack(P, shots, duration, ends) {
    const N = Math.ceil(duration / STEP) + 1;
    const W = KEYS.length;
    const raw = KEYS.map(() => new Float64Array(N));
    let i = 0;
    for (let n = 0; n < N; n++) {
      const t = Math.min(n * STEP, duration);
      while (i < shots.length - 1 && t >= shots[i + 1].t) i++;
      const c = chain(P, shots, i, t, anchorAt(P, t), ends);
      KEYS.forEach((key, j) => { raw[j][n] = c[key]; });
      if (n) raw[3][n] -= 2 * Math.PI * Math.round((raw[3][n] - raw[3][n - 1]) / (2 * Math.PI)); // keep the angle continuous
    }
    const span = 2 * SMOOTH + 1;
    const sums = new Float64Array(N + span + 1);
    const out = new Float64Array(N * W);
    raw.forEach((values, j) => {
      let a = values;
      for (let pass = 0; pass < 3; pass++) {
        for (let k = 0; k < N + span; k++) sums[k + 1] = sums[k] + a[clamp(k - SMOOTH, 0, N - 1)];
        const b = new Float64Array(N);
        for (let k = 0; k < N; k++) b[k] = (sums[k + span] - sums[k]) / span;
        a = b;
      }
      for (let k = 0; k < N; k++) out[k * W + j] = a[k];
    });
    return { out, N };
  }
  function trackAt(track, t) {
    const x = clamp(t / STEP, 0, track.N - 1);
    const i = Math.min(track.N - 2, Math.floor(x));
    const f = x - i;
    const W = KEYS.length;
    const out = {};
    KEYS.forEach((key, j) => { out[key] = lerp(track.out[i * W + j], track.out[(i + 1) * W + j], f); });
    return out;
  }

  // Back at a board already written: just the view of it.
  const REPRISE = [{ t: 0, blend: 0, type: 'world' }, { t: 0.1, blend: 3.2, type: 'reveal' }];
  REPRISE.forEach((s, i) => { s.t1 = REPRISE[i + 1]?.t ?? 3.5; });

  // ------------------------------------------------------------ the drawing

  const svg = document.querySelector('.chalk-cam');
  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, cls, parent) => {
    const el = document.createElementNS(NS, tag);
    if (cls) el.setAttribute('class', cls);
    parent.append(el);
    return el;
  };
  const at = (q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  let els = null;

  // The lamp over the board: a post clamped to the top of its frame, rising
  // behind the rail and clear of the ladder's hooks, with an arm out to its
  // shade, tipped down at the heading. Its light is drawn on .chalk-glow,
  // over the night's wash.
  const glowSvg = document.querySelector('.chalk-glow');
  const LAMP = {
    foot: [-120, BOARD.y0 + BOARD.h + 12, 2], wall: [-120, LADDER.topY + 64, 2], arm: [-120, LADDER.topY + 64, 22],
    neck: [-120, LADDER.topY + 60, 27], pool: [-120, 290, 0.8],
  };
  LAMP.axis = norm(sub(LAMP.pool, LAMP.neck));
  LAMP.mouth = add(LAMP.neck, mul(LAMP.axis, 12));
  const LAMP_ON = 17.3; // the hour it goes on, between the street lamps
  const LAMP_OFF = 7.8; // and off in the morning
  const CHALK_CLASS = { white: 'is-white', yellow: 'is-yellow', smudge: 'is-smudge' };

  // Old erasing in the slate: faint sweeps, the same every visit.
  const SMUDGES = Array.from({ length: 16 }, (_, i) => {
    const cx = BOARD.x0 + 60 + hash(i * 3.1) * (BOARD.w - 120);
    const cy = BOARD.y0 + 40 + hash(i * 7.7) * (BOARD.h - 80);
    const rx = 40 + hash(i * 1.3) * 120;
    const ry = 20 + hash(i * 5.9) * 60;
    const a0 = hash(i * 2.2) * 6;
    return Array.from({ length: 13 }, (_, k) => {
      const a = a0 + k * 0.33;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a), 0.55];
    });
  });

  function buildSvg(P) {
    const floor = make('g', 'chalk-cam__floor', svg);
    els = {
      floor, rules: make('path', 'chalk-cam__rules', floor), seam: make('path', 'chalk-cam__seam', floor),
      slate: make('path', 'chalk-cam__slate', svg), smudge: make('path', 'chalk-cam__smudge', svg),
      chalk: make('g', 'chalk-cam__chalk', svg),
    };
    for (const s of P.chalk) {
      s.el = make('path', CHALK_CLASS[s.color], els.chalk);
      s.flatD = `M${s.pts.map(([u, v]) => `${(BOARD.x0 + u).toFixed(1)} ${(BOARD.y0 + v).toFixed(1)}`).join('L')}`;
      s.shown = null;
    }
    Object.assign(els, {
      frame: make('path', 'chalk-cam__frame', svg), tray: make('path', 'chalk-cam__tray', svg),
      sticks: make('path', 'chalk-cam__sticks', svg), eraser: make('path', 'chalk-cam__eraser', svg),
      rail: make('path', 'chalk-cam__rail', svg), brackets: make('path', 'chalk-cam__brackets', svg),
      stem: make('path', 'chalk-cam__lamp-stem', svg), shade: make('path', 'chalk-cam__lamp-shade', svg),
      ladder: make('path', 'chalk-cam__ladder', svg), wheels: make('path', 'chalk-cam__wheels', svg),
      shadow: make('path', 'chalk-cam__shadow', svg), man: make('g', 'chalk-cam__figure', svg),
      part: {}, order: '', flat: null,
    });
    for (const name of ['far-leg', 'near-leg', 'spine', 'far-upper', 'far-fore', 'near-upper', 'near-fore']) {
      const far = name.startsWith('far') ? 'is-far' : '';
      if (name.endsWith('fore')) {
        const g = make('g', far, els.man);
        make('path', '', g);
        make('circle', 'bench-cam__hand chalk-cam__hand', g);
        els.part[name] = g;
      } else {
        els.part[name] = make('path', far, els.man);
      }
    }
    els.part.head = make('circle', 'chalk-cam__head', els.man);
    els.dust = ['', ' is-mid', ' is-old'].map((age) => make('path', `chalk-cam__dust${age}`, svg));
    if (glowSvg) {
      glowSvg.innerHTML = `
        <defs>
          <filter id="chalk-glow-soft" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <linearGradient id="chalk-glow-cone" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="rgb(255, 214, 150)" stop-opacity="0.26" />
            <stop offset="1" stop-color="rgb(255, 196, 120)" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="chalk-glow-pool" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="rgb(255, 205, 140)" stop-opacity="0.4" />
            <stop offset="1" stop-color="rgb(255, 190, 120)" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="chalk-glow-bulb" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="rgb(255, 240, 200)" stop-opacity="0.95" />
            <stop offset="1" stop-color="rgb(255, 200, 120)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <g class="chalk-glow__lamp is-dark">
          <path fill="url(#chalk-glow-pool)" filter="url(#chalk-glow-soft)" />
          <path fill="url(#chalk-glow-cone)" filter="url(#chalk-glow-soft)" />
          <circle fill="url(#chalk-glow-bulb)" />
        </g>`;
      const g = glowSvg.querySelector('.chalk-glow__lamp');
      els.glow = {
        g, pool: g.children[0], cone: g.children[1], bulb: g.children[2],
        coneGrad: glowSvg.querySelector('#chalk-glow-cone'), poolGrad: glowSvg.querySelector('#chalk-glow-pool'),
        bulbGrad: glowSvg.querySelector('#chalk-glow-bulb'),
      };
    }
  }

  // A line from a to b, cut short where it would pass behind the camera.
  function seg(L, a, b) {
    const NEAR = 0.15;
    const ka = L.reach(a);
    const kb = L.reach(b);
    if (ka < NEAR && kb < NEAR) return '';
    if (ka < NEAR) a = mix3(a, b, (NEAR - ka) / (kb - ka));
    else if (kb < NEAR) b = mix3(a, b, (ka - NEAR) / (ka - kb));
    return `M${at(L.project(a))}L${at(L.project(b))}`;
  }
  const poly = (L, pts, close = false) => `M${pts.map((p) => at(L.project(p))).join('L')}${close ? 'Z' : ''}`;
  const quad = (L, x0, y0, x1, y1, z) => poly(L, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], true);

  function render(P, L, chalkT, ladderX, joints, lift) {
    if (!els) buildSvg(P);
    // Lines keep the site's weight, thickening a little as the camera closes
    // in, and more nearer to it.
    const weight = (w, s) => (w * (1 + 0.3 * lift) * clamp(Math.sqrt(s / L.S), 0.7, 1.6)).toFixed(2);

    els.floor.style.opacity = lift.toFixed(3);
    if (lift > 0.002) {
      els.seam.setAttribute('d', seg(L, [-3000, 0, 0], [3000, 0, 0]));
      let rules = '';
      for (let i = -30; i <= 36; i++) rules += seg(L, [i * 56, 0, 0], [i * 56, 0, i % 4 === 0 ? 620 : 380]);
      els.rules.setAttribute('d', rules);
    }

    const { x0, y0, w, h } = BOARD;
    const x1 = x0 + w;
    const y1 = y0 + h;
    els.slate.setAttribute('d', quad(L, x0, y0, x1, y1, 0.5));
    els.smudge.setAttribute('d', SMUDGES.map((pts) => poly(L, pts)).join(''));
    els.smudge.style.strokeWidth = (26 * L.project([0, 250, 0]).s).toFixed(1);
    els.frame.setAttribute('d', quad(L, x0 - 12, y0 - 12, x1 + 12, y1 + 12, 2) + quad(L, x0, y0, x1, y1, 2));
    els.tray.setAttribute('d', poly(L, [[x0 - 12, y0 - 10, 0], [x1 + 12, y0 - 10, 0], [x1 + 12, y0 - 10, 14], [x0 - 12, y0 - 10, 14]], true) +
      poly(L, [[x0 - 12, y0 - 10, 14], [x1 + 12, y0 - 10, 14], [x1 + 12, y0 - 16, 14], [x0 - 12, y0 - 16, 14]], true));
    els.sticks.setAttribute('d', [330, 346, 362].map((x) => seg(L, [x, y0 - 9, 8], [x + 11, y0 - 9, 8])).join(''));
    els.sticks.style.strokeWidth = (2.2 * L.project([346, y0, 8]).s).toFixed(2);
    els.eraser.setAttribute('d', poly(L, [[-340, y0 - 9, 3], [-316, y0 - 9, 3], [-316, y0 - 9, 12], [-340, y0 - 9, 12]], true) +
      poly(L, [[-340, y0 - 9, 12], [-316, y0 - 9, 12], [-316, y0 - 4, 12], [-340, y0 - 4, 12]], true));
    const railMid = L.project([0, LADDER.topY, LADDER.topZ]);
    els.rail.setAttribute('d', seg(L, [-560, LADDER.topY, LADDER.topZ], [560, LADDER.topY, LADDER.topZ]));
    els.rail.style.strokeWidth = weight(3.4, railMid.s);
    els.brackets.setAttribute('d', [-520, 0, 520].map((x) => seg(L, [x, LADDER.topY, 0], [x, LADDER.topY, LADDER.topZ])).join(''));
    els.brackets.style.strokeWidth = weight(3, railMid.s);

    // The chalk: side-on, each stroke is fixed and the group is moved;
    // otherwise every point goes through the camera, up to where the chalk
    // has got.
    const flat = L.flat;
    if (flat) {
      const { c, S } = L;
      els.chalk.setAttribute('transform', `matrix(${S.toFixed(5)} 0 0 ${(-S).toFixed(5)} ${(c.cx - S * c.px).toFixed(2)} ${(c.cy + S * c.py).toFixed(2)})`);
    } else if (els.flat !== false) {
      els.chalk.removeAttribute('transform');
    }
    for (const s of P.chalk) {
      // Not written yet, never to be, or rubbed out.
      if (!s.times || s.times[0] > chalkT || s.goneAt <= chalkT) {
        if (s.shown !== false) s.el.setAttribute('d', '');
        s.shown = false;
        continue;
      }
      const whole = s.times[s.times.length - 1] <= chalkT;
      if (flat && whole) {
        if (s.shown !== true || els.flat !== true) {
          s.shown = true;
          s.el.setAttribute('d', s.flatD);
          s.el.style.strokeWidth = s.w;
        }
        continue;
      }
      // Up to where the chalk has got.
      const pts = [];
      for (let k = 0; k < s.pts.length; k++) {
        if (s.times[k] <= chalkT) {
          pts.push(s.pts[k]);
          continue;
        }
        const f = (chalkT - s.times[k - 1]) / (s.times[k] - s.times[k - 1]);
        pts.push([lerp(s.pts[k - 1][0], s.pts[k][0], f), lerp(s.pts[k - 1][1], s.pts[k][1], f)]);
        break;
      }
      s.shown = null;
      if (flat) {
        s.el.setAttribute('d', `M${pts.map(([u, v]) => `${(x0 + u).toFixed(1)} ${(y0 + v).toFixed(1)}`).join('L')}`);
        s.el.style.strokeWidth = s.w;
        continue;
      }
      let sum = 0;
      const qs = pts.map(([u, v]) => {
        const q = L.project([x0 + u, y0 + v, 0.6]);
        sum += q.s;
        return at(q);
      });
      s.el.setAttribute('d', `M${qs.join('L')}`);
      s.el.style.strokeWidth = Math.max(0.6, (s.w * sum) / qs.length).toFixed(2);
    }
    els.flat = flat;

    // The ladder, hooked over the rail.
    let lines = '';
    for (const sx of [-1, 1]) {
      const x = ladderX + sx * LADDER.half;
      lines += seg(L, [x, 0, LADDER.baseZ], [x, LADDER.topY + 2, LADDER.topZ]);
      lines += seg(L, [x, LADDER.topY + 2, LADDER.topZ], [x, LADDER.topY + 6, LADDER.topZ - 5]);
    }
    for (let k = 1; k <= LADDER.rungs; k++) {
      const y = k * RUNG;
      lines += seg(L, [ladderX - LADDER.half, y, ladderZ(y)], [ladderX + LADDER.half, y, ladderZ(y)]);
    }
    els.ladder.setAttribute('d', lines);
    els.ladder.style.strokeWidth = weight(3, L.project([ladderX, 200, ladderZ(200)]).s);
    let wheels = '';
    for (const sx of [-1, 1]) {
      const hub = [ladderX + sx * LADDER.half, 5, LADDER.baseZ + 2];
      if (L.reach(hub) > 0.15) {
        wheels += poly(L, Array.from({ length: 12 }, (_, i) => add(hub, [0, 5 * Math.cos(i * 0.5236), 5 * Math.sin(i * 0.5236)])), true);
      }
    }
    els.wheels.setAttribute('d', wheels);
    els.wheels.style.strokeWidth = weight(2.4, L.project([ladderX, 5, LADDER.baseZ]).s);

    // The lamp over the board, and its light.
    const X1 = [1, 0, 0];
    els.stem.setAttribute('d', poly(L, [LAMP.foot, LAMP.wall, LAMP.arm, LAMP.neck]) +
      poly(L, [add(LAMP.foot, [-5, 0, 0.5]), add(LAMP.foot, [5, 0, 0.5]), add(LAMP.foot, [5, 7, 0.5]), add(LAMP.foot, [-5, 7, 0.5])], true));
    els.stem.style.strokeWidth = weight(2.6, L.project(LAMP.arm).s);
    els.shade.setAttribute('d', poly(L, [sub(LAMP.neck, mul(X1, 3)), add(LAMP.neck, mul(X1, 3)), add(LAMP.mouth, mul(X1, 8)), sub(LAMP.mouth, mul(X1, 8))], true));
    els.shade.style.strokeWidth = weight(2, L.project(LAMP.neck).s);
    if (els.glow) {
      const G = els.glow;
      const mouth = L.project(LAMP.mouth);
      const pool = L.project(LAMP.pool);
      const ring = Array.from({ length: 28 }, (_, i) => add(LAMP.pool, [260 * Math.cos(i * 0.2244), 115 * Math.sin(i * 0.2244), 0]));
      G.pool.setAttribute('d', poly(L, ring, true));
      G.cone.setAttribute('d', poly(L, [sub(LAMP.mouth, mul(X1, 8)), add(LAMP.mouth, mul(X1, 8)), add(LAMP.pool, [260, 0, 0]), add(LAMP.pool, [-260, 0, 0])], true));
      G.coneGrad.setAttribute('x1', mouth.x.toFixed(1));
      G.coneGrad.setAttribute('y1', mouth.y.toFixed(1));
      G.coneGrad.setAttribute('x2', pool.x.toFixed(1));
      G.coneGrad.setAttribute('y2', pool.y.toFixed(1));
      G.poolGrad.setAttribute('cx', pool.x.toFixed(1));
      G.poolGrad.setAttribute('cy', pool.y.toFixed(1));
      G.poolGrad.setAttribute('r', (260 * pool.s).toFixed(1));
      G.bulbGrad.setAttribute('cx', mouth.x.toFixed(1));
      G.bulbGrad.setAttribute('cy', mouth.y.toFixed(1));
      G.bulbGrad.setAttribute('r', (18 * mouth.s).toFixed(1));
      G.bulb.setAttribute('cx', mouth.x.toFixed(1));
      G.bulb.setAttribute('cy', mouth.y.toFixed(1));
      G.bulb.setAttribute('r', (18 * mouth.s).toFixed(1));
    }

    // Chalk dust in the air, fading as it falls.
    const bins = ['', '', ''];
    let size = 0;
    for (const d of dust) {
      if (L.reach(d.p) < 0.15) continue;
      const q = L.project(d.p);
      bins[Math.min(2, Math.floor((3 * d.age) / d.life))] += `M${at(q)}h0.01`;
      size = Math.max(size, q.s);
    }
    els.dust.forEach((el, i) => {
      el.setAttribute('d', bins[i]);
      el.style.strokeWidth = clamp(1.3 * size, 1, 5).toFixed(2);
    });

    // Him.
    els.man.toggleAttribute('hidden', !joints);
    els.shadow.toggleAttribute('hidden', !joints);
    if (!joints) return null;
    const feet = mix3(joints.nearLeg[2], joints.farLeg[2], 0.5);
    els.shadow.setAttribute('d', poly(L, Array.from({ length: 16 }, (_, i) => [
      feet[0] + 24 * Math.cos(i * 0.3927), 0.3, feet[2] + 16 * Math.sin(i * 0.3927),
    ]), true));
    els.shadow.style.opacity = (0.08 * lift).toFixed(3);

    const part = els.part;
    const depth = {};
    const draw = (name, el, pts, extra = '') => {
      const qs = pts.map((p) => L.project(p));
      el.setAttribute('d', `M${qs.map(at).join('L')}${extra}`);
      const s = qs.reduce((sum, q) => sum + q.s, 0) / qs.length;
      el.style.strokeWidth = weight(4, s);
      depth[name] = qs.reduce((sum, q) => sum + q.depth, 0) / qs.length;
    };
    draw('far-leg', part['far-leg'], joints.farLeg);
    draw('near-leg', part['near-leg'], joints.nearLeg);
    draw('spine', part.spine, [joints.hip, joints.neck], poly(L, joints.shoulders) + poly(L, joints.hips));
    for (const side of ['far', 'near']) {
      const [shoulder, elbow, hand] = joints[`${side}Arm`];
      draw(`${side}-upper`, part[`${side}-upper`], [shoulder, elbow]);
      const fore = part[`${side}-fore`];
      draw(`${side}-fore`, fore.firstElementChild, [elbow, hand]);
      const palm = L.project(hand);
      const dotEl = fore.lastElementChild;
      dotEl.setAttribute('cx', palm.x.toFixed(1));
      dotEl.setAttribute('cy', palm.y.toFixed(1));
      dotEl.setAttribute('r', ((lerp(2, 3, lift) * palm.s) / U).toFixed(2));
      dotEl.style.opacity = clamp(lift * 3).toFixed(2);
    }
    const head = L.project(joints.head);
    part.head.setAttribute('cx', head.x.toFixed(1));
    part.head.setAttribute('cy', head.y.toFixed(1));
    part.head.setAttribute('r', (FIG.headR * head.s).toFixed(2));
    part.head.style.strokeWidth = weight(4, head.s);
    part.head.style.fillOpacity = ease(clamp(lift / 0.3)).toFixed(3); // solid once he is between us and the board
    depth.head = head.depth;
    const order = Object.keys(depth).sort((a, b) => depth[b] - depth[a]);
    const key = order.join();
    if (key !== els.order) {
      els.order = key;
      for (const name of order) els.man.append(part[name]);
    }
    els.man.style.setProperty('--behind', ease(clamp(lift / 0.6)).toFixed(3));
    return { x: head.x, y: head.y, r: FIG.headR * head.s };
  }

  // ----------------------------------------------------------- the show

  const show = {
    mode: null, // null, 'show' (writing it) or 'reprise' (back at a board already written)
    t: 0, // seconds in
    done: false, // the board is written
    leave: 0, // 0 while there; counts up to 1 as the camera goes back to the world
    from: null, // the camera, his joints and the ladder as he began to leave
    hurry: false, // he was walked off, so the camera comes back quickly
    skip: null, // skipping to the end: how far, and from where
    idle: null, // what he is up to at the finished board
    idleAt: 0, // the show time the next idle starts
    idleLast: '',
    used: new Set(), // the idles he only does once, done
    said: null, // his line in the bubble, as the bubble holds it
    lamp: null, // whether the lamp over the board is on
    dustDue: 0,
    track: null,
    key: '',
    cue: 0,
    rung: 0,
    last: null,
  };

  // ------------------------------------------------ dust, sounds and words

  const dust = []; // { p, v, age, life }, in centimetres
  function puff(at, count, speed, lift = 0) {
    for (let i = 0; i < count; i++) {
      dust.push({
        p: at.slice(), age: 0, life: 0.6 + Math.random() * 0.6,
        v: [(Math.random() - 0.5) * speed, (Math.random() - 0.3) * speed + lift, (Math.random() - 0.2) * speed],
      });
    }
  }
  function moveDust(dt) {
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.age += dt;
      if (d.age >= d.life) {
        dust.splice(i, 1);
        continue;
      }
      d.v = mul(add(d.v, [0, -30 * dt, 0]), 1 - 1.5 * dt);
      d.p = add(d.p, mul(d.v, dt));
    }
  }
  // A clap, knocking the chalk off his hands.
  function clap(t) {
    const j = solve(poseAt(getPlan(), t));
    puff(mix3(j.nearArm[2], j.farArm[2], 0.5), 14, 60, 10);
    sfx.tap(0.8);
    sfx.hiss({ freq: 1200, vol: 0.12, dur: 0.06, attack: 0.002 });
  }
  // A puff blown off his fingers, away from him.
  function blowDust(pose) {
    const { f } = facing(pose.yaw);
    for (let i = 0; i < 18; i++) {
      dust.push({
        p: pose.handR.slice(), age: 0, life: 0.8 + Math.random() * 0.5,
        v: add(mul(f, 50 + Math.random() * 40), [(Math.random() - 0.5) * 30, (Math.random() - 0.2) * 20, 0]),
      });
    }
  }
  // A real chalk stroke follows the animated mark; the sleeve is a cloth rub.
  function chalkSound(color, dur, i) {
    if (color === 'smudge') {
      sfx.rub(Math.min(1.8, dur));
      return;
    }
    sfx.chalk(dur, i);
  }

  // One of his lines, in the bubble, which follows his head.
  function sayLine(lines, ms) {
    const html = lines.map((line) => `<span>${line}</span>`).join('');
    remark(html, ms);
    const held = document.createElement('template');
    held.innerHTML = html;
    show.said = held.innerHTML;
  }
  const saying = () => show.said && !introSpeech.hidden && introSpeechCopy.innerHTML === show.said;
  function hush() {
    if (saying()) hushSpeech();
    show.said = null;
  }
  function placeBubble(head) {
    const half = introSpeech.offsetWidth / 2;
    const tail = 0.17 * half; // as frame() places it: the tail a little right of the middle
    introSpeech.style.left = `${clamp(head.x - tail, half + 8, sceneWidth - half - 8).toFixed(1)}px`;
    const top = clamp(head.y - head.r - 12, navHeight + introSpeech.offsetHeight + 8, sceneHeight - 8);
    introSpeech.style.bottom = `${(sceneHeight - top).toFixed(1)}px`;
  }

  function finish() {
    show.done = true;
    livingVisited(experienceScene); // living: fills its route dot
    status.textContent = `Experience: ${CAREER.map((job) =>
      `${job.title.join(' ')}, ${job.note}, ${job.from[0]} to ${job.to ? job.to[0] : 'now'}${job.result ? `: ${job.result.replace(' · ', ', ')}` : ''}`).join('; ')}`;
  }

  function begin(mode) {
    const P = getPlan();
    Object.assign(show, { mode, t: 0, leave: 0, skip: null, idle: null, idleAt: P.duration + 2, key: '', cue: 0, rung: 0 });
    if (mode === 'show') status.textContent = 'Writing his experience on the board';
  }

  // ------------------------------------------------------------------- skip

  // E, or the button, skips to the finished board: the chalk fills in fast
  // while the camera and he move to where the show ends.
  const skipButton = document.querySelector('.chalk-skip');
  function skip() {
    const P = getPlan();
    if (show.mode !== 'show' || show.skip || show.leave || !show.last || show.t >= P.done - 0.5) return false;
    show.skip = { k: 0, from: show.last, t0: show.t };
    hush();
    finish();
    return true;
  }
  skipButton?.addEventListener('click', () => {
    skip();
    skipButton.blur();
  });
  addEventListener('keydown', (event) => {
    if (event.code !== 'KeyE' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.('input, textarea, [contenteditable="true"]')) return;
    if (skip()) event.preventDefault();
  });

  // ------------------------------------------------------------------ idles

  const IDLES = [['lean', 1], ['ride', 1], ['blow', 1], ['dots', 1, true], ['doodle', 1, true]];
  function startIdle(P, name) {
    const [, , once] = IDLES.find(([n]) => n === name);
    if (once) show.used.add(name);
    show.idleLast = name;
    const idle = makeIdle(P, name, show.t);
    Object.assign(idle, { name, t0: show.t, fired: 0, events: idle.events || [] });
    idle.dur = idle.segs.reduce((sum, seg) => sum + seg.dur, 0);
    show.idle = idle;
  }
  function pickIdle() {
    const pool = IDLES.filter(([name, , once]) => name !== show.idleLast && !(once && show.used.has(name)));
    let r = Math.random() * pool.reduce((sum, [, w]) => sum + w, 0);
    return (pool.find(([, w]) => (r -= w) < 0) || pool[0])[0];
  }

  // ------------------------------------------------------------- each frame

  // Each frame, from script.js's frame(): runs the show and draws the board
  // (and him, while the camera is away from the world). `markX` is the
  // Experience mark on screen and `pose` the rig's pose this frame. Returns
  // how far the camera has left the world, which fades the world out.
  function drawBoard(dt, unit, markX, rise, pose) {
    if (!svg || !BOARD_MODE) return 0;
    const P = getPlan();
    const here = state.destinationId === experienceScene;
    // Nowhere near it and nothing under way: nothing to do.
    const S = U * unit;
    const left = markX + (BOARD.x0 - 20 - P.mark) * S;
    const right = markX + (LADDER.home + 40 - P.mark) * S;
    const onScreen = right > -60 && left < sceneWidth + 60;
    if (!show.mode && !here && !onScreen) {
      if (!svg.hasAttribute('hidden')) svg.setAttribute('hidden', '');
      if (glowSvg && !glowSvg.hasAttribute('hidden')) glowSvg.setAttribute('hidden', '');
      if (skipButton && !skipButton.hidden) skipButton.hidden = true; // only on a change: body:has() rules watch it
      scene.classList.remove('is-by-board');
      return 0;
    }
    const rig = rigJoints(P, pose, (state.x - experienceX) / unit, state.flip);
    const world = worldView(P, markX, rise, unit, rig.hip[0]);

    if (!show.mode && here && state.experienceActive && state.announced && state.speed === 0 &&
        state.turning === 0 && state.facing === 1 && !state.hop && !intro.active) {
      if (reducedMotion.matches) {
        if (!show.done) finish();
      } else {
        begin(show.done ? 'reprise' : 'show');
      }
    }

    // Sent elsewhere: the board is finished at once, and the camera goes
    // back to the world as he comes back into it where he stands, facing
    // the way he is going.
    if (show.mode && !here && !show.leave && show.last) {
      show.leave = 1e-6;
      show.from = show.last;
      hush();
      if (show.mode === 'show') {
        if (show.t >= P.phases.stepBack.t1 || show.skip) state.x = experienceX + (STAND_AT[0] - P.mark) * U * unit;
        if (!show.done) finish();
      }
      show.skip = null;
      show.idle = null;
      state.facing = state.flip = Math.sign(state.target - state.x) || 1;
    }

    if (show.mode && !show.leave && show.skip) {
      show.skip.k += dt / 1.4;
      if (show.skip.k >= 1) {
        show.t = P.done;
        show.cue = P.cues.findIndex((c) => c.t >= show.t);
        if (show.cue < 0) show.cue = P.cues.length;
        show.skip = null;
      }
    } else if (show.mode && !show.leave) {
      const before = show.t;
      show.t += dt;
      if (show.mode === 'show') {
        while (show.cue < P.cues.length && P.cues[show.cue].t <= show.t) {
          if (P.cues[show.cue].t > before) P.cues[show.cue].play();
          show.cue += 1;
        }
        const rung = Math.round(P.rungAt(show.t));
        if (rung !== show.rung) {
          show.rung = rung;
          sfx.step(false);
        }
        if (!show.done && show.t >= P.done) finish();
        // Left alone at the finished board, now and then he gets up to something.
        if (!show.idle && show.t > P.duration && show.t >= show.idleAt) startIdle(P, pickIdle());
        if (show.idle && show.t - show.idle.t0 > show.idle.dur + 0.5) {
          show.idle = null;
          show.idleAt = show.t + 2 + Math.random() * 2;
        }
      }
    } else if (show.leave) {
      // Walked off, even with a tap of a key already let go, it hurries;
      // sent to another stop, it takes its time.
      show.hurry ||= state.destinationId === 'roam' || state.destinationId === null;
      show.leave += (dt * (show.hurry ? LEAVE_HURRY : 1)) / OUT;
      if (show.leave >= 1) Object.assign(show, { mode: null, leave: 0, from: null, last: null, hurry: false });
    }
    moveDust(dt);

    let cam = world;
    let joints = null;
    let pen = null;
    const rest = show.done ? LADDER.home : LADDER.parked;
    let ladderX = rest;
    let chalkT = show.done ? Infinity : -1;
    if (show.mode && !show.leave) {
      const key = [sceneWidth, sceneHeight, navHeight, floorY, rise, unit.toFixed(4), markX.toFixed(1), show.mode].join();
      if (key !== show.key) {
        show.key = key;
        show.track = show.mode === 'show'
          ? buildTrack(P, P.shots, P.duration, { world, reveal: revealView(rise, unit) })
          : buildTrack(P, REPRISE, 3.5, { world, reveal: revealView(rise, unit) });
      }
      if (show.mode === 'reprise') {
        cam = trackAt(show.track, show.t);
        joints = rig;
      } else if (show.skip) {
        const k = smoother(clamp(show.skip.k));
        cam = blendViews(show.skip.from.cam, trackAt(show.track, P.done), k);
        joints = mixJoints(show.skip.from.joints, solve(poseAt(P, P.done)), k);
        ladderX = lerp(show.skip.from.ladder, P.ladderX(P.done), k);
        chalkT = lerp(show.skip.t0, P.done, clamp(show.skip.k));
      } else if (show.idle) {
        const idle = show.idle;
        const ct = show.t - idle.t0;
        const now = idlePose(P, idle, ct, show.t);
        while (idle.fired < idle.events.length && idle.events[idle.fired].at <= ct) idle.events[idle.fired++].run(now.pose);
        cam = trackAt(show.track, show.t);
        joints = solve(now.pose);
        ladderX = LADDER.home + now.ladder;
        pen = now.pen;
        chalkT = show.t;
      } else {
        cam = trackAt(show.track, show.t);
        joints = mixJoints(rig, solve(poseAt(P, show.t)), smoother(clamp(show.t / 0.9)));
        ladderX = P.ladderX(show.t);
        pen = P.penWorld(show.t);
        chalkT = show.t;
      }
    } else if (show.leave) {
      const k = smoother(clamp(show.leave));
      cam = blendViews(show.from.cam, world, k);
      joints = mixJoints(show.from.joints, rig, k);
      ladderX = lerp(show.from.ladder, rest, k);
    }
    if (show.mode && !show.leave) show.last = { cam, joints, ladder: ladderX };

    // Dust off the chalk as it writes.
    if (pen && pen[2] < 1 && !reducedMotion.matches) {
      show.dustDue += dt * 22;
      while (show.dustDue >= 1) {
        show.dustDue -= 1;
        dust.push({
          p: add(pen, [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 1.5]), age: 0, life: 0.6 + Math.random() * 0.6,
          v: [(Math.random() - 0.5) * 8, -4 - Math.random() * 8, 3 + Math.random() * 6],
        });
      }
    }

    const visible = Boolean(show.mode) || onScreen;
    svg.toggleAttribute('hidden', !visible); // SVG elements have no .hidden
    glowSvg?.toggleAttribute('hidden', !visible);
    const hideSkip = !(show.mode === 'show' && !show.skip && !show.leave && show.t > 1.5 && show.t < P.done - 1);
    if (skipButton && skipButton.hidden !== hideSkip) skipButton.hidden = hideSkip;
    // Walking past the slate, he gets a paper edge so he reads against it.
    const him = markX + (state.x - experienceX);
    scene.classList.toggle('is-by-board', !joints && visible && him > left && him < markX + (BOARD.x0 + BOARD.w + 20 - P.mark) * S);
    if (!visible) return 0;

    // The lamp goes on at dusk and off in the morning, with a flicker as it
    // catches, like the street lamps.
    // Its light is as strong as the hour's lights (living.js keeps that on
    // the world's lights layer).
    const lights = worldLights?.style.getPropertyValue('--lights') || '0';
    if (glowSvg && glowSvg.style.opacity !== lights) glowSvg.style.opacity = lights;
    const hour = typeof skyClock === 'undefined' ? 12 : skyClock.hour;
    const lit = hour >= LAMP_ON || hour < LAMP_OFF;
    if (lit !== show.lamp && els?.glow) {
      els.glow.g.classList.toggle('is-dark', !lit);
      if (lit && show.lamp !== null && !reducedMotion.matches) {
        els.glow.g.classList.remove('is-lighting');
        els.glow.g.getBoundingClientRect(); // so the flicker starts again
        els.glow.g.classList.add('is-lighting');
        noises.flick(true);
      }
      show.lamp = lit;
    }

    if (joints) figure.style.visibility = 'hidden';
    const head = render(P, lens(cam), chalkT, ladderX, joints, cam.lift);
    if (head && saying()) placeBubble(head);
    return cam.lift;
  }

  // The board's click area, as [left, right, height] in units from the mark.
  function scenery() {
    const P = getPlan();
    return [[(BOARD.x0 - 14 - P.mark) * U, (LADDER.home + LADDER.half + 8 - P.mark) * U, (LADDER.topY + 10) * U]];
  }

  return {
    draw: drawBoard,
    scenery,
    // For tests (window.alive.chalk): the show's state, and a jump to any
    // moment of it.
    debug: {
      get show() {
        return {
          mode: show.mode, t: show.t, done: show.done, leave: show.leave, skip: Boolean(show.skip),
          idle: show.idle?.name || null, said: show.said, lamp: show.lamp, dust: dust.length,
        };
      },
      skip: () => skip(),
      idle(name) { if (show.mode === 'show' && show.t > getPlan().duration) startIdle(getPlan(), name); },
      get plan() { return getPlan(); },
      seek(t) { show.t = t; },
      camera: (t) => (show.track ? trackAt(show.track, t) : null),
      rebuild() { show.key = ''; },
      // How far his writing hand is from the chalk at time t, while it is down.
      handGap(t) {
        const P = getPlan();
        const pen = P.penWorld(t);
        if (pen[2] >= 1) return null;
        const j = solve(poseAt(P, t));
        return { gap: len(sub(j.nearArm[2], pen)), off: sub(pen, j.nearArm[0]) };
      },
    },
    busy: () => show.mode !== null,
    // From the moment he is sent elsewhere, so he never takes a step first.
    leaving: () => show.leave > 0 || (show.mode !== null && state.destinationId !== experienceScene),
  };
})();

// The hooks script.js and living.js call.
function drawChalkboard(dt, unit, markX, rise, pose) { return CHALKBOARD.draw(dt, unit, markX, rise, pose); }
function chalkBusy() { return CHALKBOARD.busy(); }
function chalkLeaving() { return CHALKBOARD.leaving(); }
function chalkScenery() { return CHALKBOARD.scenery(); }
