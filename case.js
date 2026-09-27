/* ======================================================================
   The case study. "Detailed view" on the Projects sheet zooms into the
   paper until it is a whole white page about the project: what it is, its
   screens in browser windows, its front end, and the way to the live site.

   He comes too. Between the blocks of the page are lanes, each floored with
   an inked rule, and he stands on the one nearest where they are reading
   and says something about what is below it. As they scroll on he runs off
   the end of his floor and drops to the next; scrolling back, he climbs the
   side of the page to the one above.

   Loaded after script.js, so projectData, projectDetail, projectTabs,
   selectProject, GAITS, pose(), mixPose(), applySide(), sfx, scene and
   reducedMotion are all there. Only window.caseStudy (for tests) is global.
   ====================================================================== */

(() => {
  /* ------------------------------------------------------ what each says */

  // Each project's page, by its slug in projectData: his hello; the brief
  // under the title (the problem, what he did, how it turned out); its screens
  // (a file in cases/, where on the site it is, a heading, a line about it,
  // what he says standing over it, and words for anyone who cannot see it);
  // what he says over the front end; and his goodbye. His lines are drafts,
  // like the rest of his.
  const CASES = {
    chiisai: {
      hello: 'Chiisai Games! Scroll on, I’ll show you round.',
      brief: {
        problem: 'Getting a group of friends into one game usually means a download, an account each, and waiting while everyone catches up.',
        approach: 'Everything runs in the browser. Signing in asks only for a player name, the games sit on a little CRT desktop in a 3D room, and Colyseus keeps everyone in a room in step, move by move.',
        outcome: 'Six live party games, free to play with no download, from chess in the fog of war to a drawing game of deduction.',
      },
      screens: [
        {
          file: 'chiisai-1', path: '/', title: 'A desk to start from',
          text: 'It opens on a 3D desk with a CRT monitor. Move the mouse to look round the room, and click the screen to switch it on.',
          say: 'A CRT on a desk! I feel right at home.',
          alt: 'Chiisai Games home: a pixel art desk in 3D with a cream CRT monitor reading Chiisai Games, click to launch.',
        },
        {
          file: 'chiisai-2', path: '/', title: 'A desktop of games',
          text: 'The monitor boots into a little desktop of its own. Each game is an .exe to open, and signing in asks only for a player name.',
          say: 'Every game’s an .exe. Grab a friend and pick one.',
          alt: 'The Chiisai desktop: game icons down the left, and a window asking for a player name.',
        },
      ],
      frontEnd: 'Nuxt and Vue up front, Three.js for the room, Colyseus keeping everyone in step.',
      end: 'It’s live, and free. Bring a friend.',
      bye: 'That’s the tour. Go on, have a game!',
    },
    forge: {
      hello: 'TheWebsiteForge! Scroll on, I’ll show you round.',
      brief: {
        problem: 'A small business after a website usually deals with one person for the design, someone else for the hosting and somewhere else again for the domain.',
        approach: 'I designed one studio for all three, and built the tool behind it: a site builder that puts pages together from sections described by schemas, to preview and export.',
        outcome: 'The studio is live, with finished builds ready to buy off the shelf.',
      },
      screens: [
        {
          file: 'forge-1', path: '/', title: 'Websites we build, sell, & stand behind',
          text: 'The home page sets out the studio’s promise over a field of slowly tumbling 3D rocks.',
          say: 'Those rocks turn, you know. Go and look.',
          alt: 'TheWebsiteForge home: the headline Websites we build, sell, & stand behind, over dark faceted 3D rocks.',
        },
        {
          file: 'forge-2', path: '/#services', title: 'One roof',
          text: 'Website creation, hosting and domains are a service each, and the stack they are built with scrolls past as a ribbon.',
          say: 'Build it, host it, name it. One roof.',
          alt: 'Three services, website creation, hosting and domain purchasing, above a ribbon of the tech stack.',
        },
        {
          file: 'forge-3', path: '/#work', title: 'The work',
          text: 'Past projects sit on a carousel of cards, each leading with its headline result.',
          say: 'Swipe through the work.',
          alt: 'Selected work: a carousel of dark project cards.',
        },
      ],
      frontEnd: 'There’s a whole site builder behind it: schemas in, pages out.',
      end: 'It’s live: have a look round the studio.',
      bye: 'That’s the tour. Fancy a website?',
    },
    workforce: {
      hello: 'PetPlus Workforce! Staff only past this door, sorry.',
      brief: {
        problem: 'Staff at each Pet Plus store needed their shift roster, clocking in and the day’s routine to hand on the shop floor, without another login to remember.',
        approach: 'One app that installs on a phone like any other, signed into with the Google account staff already use at work, with each store’s roster and routine in one place.',
        outcome: 'Live for Pet Plus staff: rosters, clocking in and routines for every store, in one installable app.',
      },
      screens: [
        {
          file: 'workforce-1', path: '/', title: 'Welcome to the team',
          text: 'Staff sign in with their Google account. Inside, they find their store’s shift roster, clocking in and the day’s routine.',
          say: 'The rosters live behind this door.',
          note: 'Screens from inside are on their way.',
          alt: 'PetPlus Workforce: Welcome to the team, over an illustrated Pet Plus store, with Continue with Google.',
        },
      ],
      frontEnd: 'React, installable like an app, with Google at the door.',
      end: 'It’s live for Pet Plus staff.',
      bye: 'That’s all I’m allowed to show you.',
    },
    steady: {
      hello: 'Steady! Scroll on, I’ll show you round.',
      brief: {
        problem: 'Work, personal and shared calendars live in different apps, so clashes slip through and nobody can see where the week actually went.',
        approach: 'I brought every calendar into one grid, flagged the clashes, and gave the hours their own analytics: work against life, free time by weekday, streaks and the daily rhythm. Ten colour themes let people make it their own.',
        outcome: 'Live, with a demo calendar to explore.',
      },
      screens: [
        {
          file: 'steady-1', path: '/', title: 'The dashboard',
          text: 'The week at a glance: events, hours booked, meetings and focus time, with every synced calendar down the side.',
          say: 'Five calendars, one dashboard. Very steady.',
          alt: 'Steady dashboard: four stat cards, a weekly activity chart and a category donut, with synced calendars in the sidebar.',
        },
        {
          file: 'steady-2', path: '/calendar', title: 'The calendar',
          text: 'A month view that brings the work, Google, Outlook, personal and Apple calendars into one grid.',
          say: 'Look at that September. Busy!',
          alt: 'Steady calendar: September 2026 in a month grid, events coloured by calendar.',
        },
        {
          file: 'steady-3', path: '/analytics', title: 'Analytics',
          text: 'Where the hours go: work against life, free time by weekday, streaks and the daily rhythm.',
          say: '31 per cent life balance. We could all do better.',
          alt: 'Steady analytics: work against life, weekly free time, time allocation, streaks and daily rhythm charts.',
        },
      ],
      frontEnd: 'React, with Recharts drawing all those charts.',
      end: 'It’s live, with a demo calendar to explore.',
      bye: 'That’s the tour. Stay on beat!',
    },
    casemap: {
      hello: 'CaseMap Next Gen! All mock data, before you ask.',
      brief: {
        problem: 'Every legal team works a case its own way, but a fixed dashboard shows everyone the same panels in the same places, whether they need them or not.',
        approach: 'I made the whole dashboard theirs to arrange: panels to drag, resize and hide, charts to switch, tiles and navigation to dock on any side, and layouts saved as templates for the next case. Every one of those moves works from the keyboard as well as the mouse.',
        outcome: 'A working next generation of CaseMap, built in Angular for LexisNexis, that runs in the browser and as a desktop app. The live demo uses a mock case.',
      },
      screens: [
        {
          file: 'casemap-1', path: '/dashboard', title: 'A dashboard you arrange',
          text: 'Every panel on the case dashboard can be dragged, resized from any edge or corner, hidden, or switched between bar and donut charts, and the metric tiles dock along the top or down the side. Every move works from the keyboard too.',
          say: 'Grab a panel by its dots and drag it anywhere.',
          alt: 'CaseMap Next Gen dashboard: metric tiles for facts, documents and issues above case strength, fact activity and upcoming deadlines panels.',
        },
        {
          file: 'casemap-2', path: '/facts', title: 'Case facts',
          text: 'The facts of the case in a table to sort and filter, coloured by whether each one helps or hurts.',
          say: '44 facts, and I’m not in any of them.',
          alt: 'CaseMap case facts: a table of dated facts to filter, with how each is evaluated and who it involves.',
        },
      ],
      frontEnd: 'Angular with signals, and no zone.js. Snappy.',
      end: 'It’s live, with a mock case to explore.',
      bye: 'That’s the tour. Case closed!',
    },
    sin: {
      hello: 'SIN Esports! Scroll on, I’ll show you round.',
      brief: {
        problem: 'SIN Esports needed one home for its teams, match nights, clothing drops and creators, with the same energy as its streams.',
        approach: 'A dark, neon site in WebGL, with motion that follows the scroll: each division with its record and roster, the next match filling the screen, drops counting down the units left, and a wall of the creators’ Twitch channels.',
        outcome: 'Live at sin-esports.com as the organisation’s home.',
      },
      screens: [
        {
          file: 'sin-1', path: '/', title: 'SIN starts here',
          text: 'The site opens on the SIN seal in red neon, and one click lets you in.',
          say: 'Click to enter. I always do.',
          alt: 'The SIN Esports intro: the SIN seal in red neon on black, with Click to enter below.',
        },
        {
          file: 'sin-2', path: '/#match', title: 'Match night',
          text: 'The next fixture fills the screen: SIN CMFY against Gascom Academy.',
          say: 'Shh, the match is on. They’re concentrating.',
          alt: 'SIN CMFY versus Gascom Academy in huge brushed letters.',
        },
        {
          file: 'sin-3', path: '/#team', title: 'The divisions',
          text: 'Valorant, Rocket League and Apex each have a division, with its season record, its roster and open tryouts.',
          say: 'Rocket League tryouts are open. I’d be hopeless.',
          alt: 'SIN Esports divisions: Valorant, with 24 wins and 8 losses this season, beside Rocket League, roster forming.',
        },
        {
          file: 'sin-4', path: '/#drops', title: 'The drop',
          text: 'Limited clothing drops count down the units left in each run.',
          say: 'Hardly any left. Stay hydrated!',
          alt: 'SIN drop: the Stay Hydrated hoodie in washed pink, with the units left in the run, its sizes and its price.',
        },
        {
          file: 'sin-5', path: '/#creators', title: 'The wall',
          text: 'The creators’ Twitch channels share one wall: switch channels, or catch whoever is live.',
          say: 'People are the signal. Deep.',
          alt: 'SIN Esports The Wall: People are the signal, beside a Twitch channel player.',
        },
      ],
      frontEnd: 'Three.js and GSAP doing the heavy lifting.',
      end: 'It’s live. The next match night is on the site.',
      bye: 'That’s the tour. GG!',
    },
  };

  /* ------------------------------------------------------ how he moves */

  const FALL_G = 2600; // px/s², falling to the floor below
  const FALL_MAX = 1500; // px/s
  const CLIMB_SPEED = 640; // px/s, up the side of the page to the floor above
  const LAND_TIME = 0.28; // seconds crouched after he lands
  const SAY_AFTER = 0.3; // seconds on a floor before he speaks
  const LANE_LINE = 0.8; // his floor is the last one above this far down the screen
  const IDLE_CYCLE = 3; // seconds

  // Poses with no gait: falling (arms up, legs hanging), landed (a crouch
  // that the idle stands him up out of), and each half of a climb.
  const FALL_POSE = {
    near: { thigh: -18, knee: 26, ankle: 0, shoulder: -158, elbow: -18 },
    far: { thigh: 6, knee: 34, ankle: 0, shoulder: -138, elbow: -26 },
    bob: 0, lean: 0,
  };
  const CROUCH_POSE = {
    near: { thigh: -55, knee: 75, ankle: -20, shoulder: -30, elbow: -40 },
    far: { thigh: -40, knee: 70, ankle: -25, shoulder: -8, elbow: -40 },
    bob: 24, lean: 6,
  };
  function climbPose(phase) {
    const s = Math.sin((phase / 100) * Math.PI * 2);
    return {
      near: { thigh: -34 - 22 * s, knee: 62 + 16 * s, ankle: -10, shoulder: -168 + 26 * s, elbow: -18 - 14 * s },
      far: { thigh: -34 + 22 * s, knee: 62 - 16 * s, ankle: -10, shoulder: -168 - 26 * s, elbow: -18 + 14 * s },
      bob: -4, lean: -6,
    };
  }

  /* ------------------------------------------------------ the page */

  const root = document.querySelector('.case');
  if (!root || typeof projectData === 'undefined') return;
  const scroller = root.querySelector('.case__scroll');
  const page = root.querySelector('.case__page');
  const select = root.querySelector('.case__select');
  const steps = [...root.querySelectorAll('.case__step')];
  const visit = root.querySelector('.case__visit');
  const back = root.querySelector('.case__back');
  const navbar = document.querySelector('.navbar');
  const html = document.documentElement;

  // Him, drawn as in the world but without his props: the same joints,
  // turned about the same pivots (styles.css), from the same gaits.
  const fig = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  fig.setAttribute('class', 'case__fig');
  fig.setAttribute('viewBox', '0 0 140 242');
  fig.setAttribute('aria-hidden', 'true');
  const leg = (which) => `<g class="leg leg--${which}"><g class="leg__thigh"><path d="M70 144V194" /><g class="leg__shin"><path d="M70 194V242" /><g class="leg__foot"><path d="M70 242h18" /></g></g></g></g>`;
  const arm = (which) => `<g class="arm arm--${which}"><g class="arm__upper"><path d="M70 74V112" /><g class="arm__fore"><path d="M70 112V142" /><circle class="hand" cx="70" cy="142" r="2" /></g></g></g>`;
  fig.innerHTML = `<g class="rig">${leg('far')}<g class="lean">${arm('far')}<g class="torso"><circle cx="70" cy="32" r="23" /><path d="M70 55V144" /></g>${arm('near')}</g>${leg('near')}</g>`;
  const joints = (which) => ({
    thigh: fig.querySelector(`.leg--${which} .leg__thigh`),
    shin: fig.querySelector(`.leg--${which} .leg__shin`),
    foot: fig.querySelector(`.leg--${which} .leg__foot`),
    upper: fig.querySelector(`.arm--${which} .arm__upper`),
    fore: fig.querySelector(`.arm--${which} .arm__fore`),
  });
  const body = { root: fig.querySelector('.rig'), lean: fig.querySelector('.lean'), near: joints('near'), far: joints('far') };

  const bubble = document.createElement('p');
  bubble.className = 'case__say';
  bubble.setAttribute('aria-hidden', 'true');

  const two = (n) => String(n).padStart(2, '0');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  let index = 0; // the project on the page
  let lanes = []; // the lane elements, top to bottom
  let laneLines = []; // what he says on each

  // Lays out the page for projectData[i]. Everything goes in as text.
  function build(i) {
    index = i;
    const item = projectData[i];
    const c = CASES[item.slug] || { screens: [] };
    const host = new URL(item.url).host;
    // The switcher in the bar: every project, this one chosen.
    if (select.options.length !== projectData.length) {
      select.replaceChildren(...projectData.map((p, n) => {
        const option = el('option', '', `${two(n + 1)}  ${p.title}`);
        option.value = String(n);
        return option;
      }));
    }
    select.value = String(i);
    visit.href = item.url;
    visit.setAttribute('aria-label', `Visit ${item.title}, live (opens in a new tab)`);
    lanes = [];
    laneLines = [];

    const hero = el('header', 'case__hero');
    const h1 = el('h1', '', item.title);
    h1.id = 'case-title';
    h1.tabIndex = -1;
    hero.append(el('p', 'case__kicker', item.role), h1, el('p', 'case__lede', item.description));
    // The brief: why it was made, what he did about it, where it landed.
    if (c.brief) {
      const brief = el('dl', 'case__brief');
      [['The problem', c.brief.problem], ['What I did', c.brief.approach], ['The outcome', c.brief.outcome]].forEach(([term, text]) => {
        const row = el('div');
        row.append(el('dt', '', term), el('dd', '', text));
        brief.append(row);
      });
      hero.append(brief);
    }
    const parts = [hero];

    const lane = (lines) => {
      const node = el('div', 'case__lane');
      node.dataset.mark = two(lanes.length + 1);
      node.setAttribute('aria-hidden', 'true');
      lanes.push(node);
      laneLines.push(lines.filter(Boolean));
      parts.push(node);
    };

    c.screens.forEach((screen, n) => {
      lane(n === 0 ? [c.hello, screen.say] : [screen.say]);
      const section = el('section', 'case__section');
      const win = el('figure', 'case__window');
      const chrome = el('div', 'case__chrome');
      chrome.setAttribute('aria-hidden', 'true');
      chrome.append(el('i'), el('i'), el('i'), el('span', '', `${host}${screen.path === '/' ? '' : screen.path}`));
      const img = el('img');
      img.src = `cases/${screen.file}.webp`;
      img.alt = screen.alt;
      img.width = 1440;
      img.height = 900;
      img.decoding = 'async';
      if (n > 0) img.loading = 'lazy';
      img.addEventListener('load', measure);
      win.append(chrome, img);
      section.append(el('h2', '', screen.title), el('p', '', screen.text), win);
      if (screen.note) section.append(el('p', 'case__note', screen.note));
      parts.push(section);
    });
    if (!c.screens.length) lane([c.hello]);

    lane([c.frontEnd]);
    const front = el('section', 'case__section');
    const chips = el('ul', 'case__chips');
    chips.append(...item.frontEnd.map((name) => el('li', '', name)));
    const also = el('p', 'case__also');
    also.append(el('b', '', 'Built with'), document.createTextNode(item.tools));
    front.append(el('h2', '', 'Front end'), chips, also);
    parts.push(front);

    lane([c.bye]);
    const end = el('section', 'case__section');
    const actions = el('div', 'case__end');
    const live = el('a', '', 'Visit the live site ↗');
    live.href = item.url;
    live.target = '_blank';
    live.rel = 'noopener';
    const nextIndex = (i + 1) % projectData.length;
    const next = el('button', '', `Next: ${projectData[nextIndex].title} →`);
    next.type = 'button';
    next.addEventListener('click', () => turnTo(nextIndex));
    actions.append(live, next);
    end.append(el('h2', '', 'Have a go'), el('p', '', c.end || 'It’s live.'), actions);
    parts.push(end);

    page.replaceChildren(...parts, fig, bubble);
  }

  /* ------------------------------------------------------ where things are */

  const geom = { width: 0, floors: [], top: 0, figH: 92, figW: 53, outside: false, outX: 0, landX: 0, stepX: 0 };

  // The floors, in px down the page, and where along them he steps off
  // (the end of the rule), falls or climbs (just past it, in the margin
  // when there is one), and lands (back over the rule).
  function measure() {
    geom.width = page.clientWidth;
    geom.top = page.offsetTop;
    geom.floors = lanes.map((node) => node.offsetTop + node.offsetHeight);
    geom.figH = fig.getBoundingClientRect().height || geom.figH;
    geom.figW = (geom.figH * 140) / 242;
    const margin = (scroller.clientWidth - geom.width) / 2;
    geom.outside = margin > geom.figW * 1.3;
    geom.outX = geom.outside ? geom.width + geom.figW * 0.62 : geom.width - geom.figW * 0.5;
    geom.stepX = geom.outside ? geom.width - geom.figW * 0.1 : geom.outX;
    geom.landX = geom.width - geom.figW * 0.6;
    if (him.mode === 'stand' || him.mode === 'walk' || him.mode === 'land') him.y = geom.floors[him.lane] ?? him.y;
  }

  // The floor he should be on: the last to have come up into view.
  function laneWanted() {
    const line = scroller.scrollTop - geom.top + scroller.clientHeight * LANE_LINE;
    let wanted = 0;
    geom.floors.forEach((y, n) => { if (y <= line) wanted = n; });
    return wanted;
  }

  // Somewhere to stand on a floor: towards its right-hand end, above the
  // right of the screen below, clear of what is being read.
  function spot(from = null) {
    const lo = geom.width < 600 ? geom.width * 0.42 : geom.width - 300;
    const hi = geom.width - geom.figW * 0.9;
    for (let i = 0; i < 6; i += 1) {
      const x = lo + Math.random() * (hi - lo);
      if (from === null || Math.abs(x - from) > geom.figH * 0.5) return x;
    }
    return hi;
  }

  /* ------------------------------------------------------ him */

  const him = {
    x: 0, y: 0, vx: 0, vy: 0,
    lane: 0, target: 0,
    mode: 'off', // stand, walk, fall, climb, land
    gait: 'walk', goX: 0, face: 1, phase: 0, idle: 0, t: 0,
    onFloor: 0, spoke: true, wanderAt: 0,
    shown: null,
  };
  const speech = { lines: [], at: 0, until: 0, up: false };

  // Walks (or runs, if it is far and he is in a hurry) towards x; true once there.
  function walkTo(x, dt, hurry) {
    const d = x - him.x;
    if (Math.abs(d) < 1.5) {
      him.x = x;
      return true;
    }
    him.gait = hurry && Math.abs(d) > geom.figH * 0.8 ? 'run' : 'walk';
    const cycle = him.gait === 'run' ? RUN_CYCLE : WALK_CYCLE;
    const travel = (GAITS[him.gait].travel * geom.figH) / 242; // px a cycle
    const step = Math.min(Math.abs(d), (travel / cycle) * dt);
    him.face = Math.sign(d);
    him.x += Math.sign(d) * step;
    him.phase += (step / travel) * 100;
    return false;
  }

  function land() {
    him.y = geom.floors[him.target];
    him.lane = him.target;
    him.mode = 'land';
    him.t = 0;
    him.onFloor = 0;
    him.spoke = false;
    sfx.tap?.(0.9);
  }

  function update(dt, now) {
    if (!geom.floors.length) return;
    him.target = laneWanted();
    const floor = geom.floors[him.target];

    // Motion reduced: he is simply on the floor they are at.
    if (reducedMotion.matches) {
      if (him.lane !== him.target || him.mode === 'off') {
        hush();
        him.lane = him.target;
        him.x = spot();
        him.face = -1;
        him.spoke = false;
        him.onFloor = SAY_AFTER;
      }
      him.mode = 'stand';
      him.y = geom.floors[him.lane];
      if (!him.spoke) sayLane(him.lane, now);
      return;
    }

    switch (him.mode) {
      case 'stand':
      case 'walk': {
        if (him.target !== him.lane) {
          // Off the end of this floor, and down, or up the side to the last.
          hush();
          const going = floor > him.y ? 'fall' : 'climb';
          const from = going === 'fall' ? geom.stepX : (geom.outside ? geom.stepX : geom.outX);
          if (walkTo(from, dt, true)) {
            him.mode = going;
            him.vx = going === 'fall' && geom.outside ? (GAITS.run.travel * geom.figH) / 242 / RUN_CYCLE * 0.6 : 0;
            him.vy = going === 'fall' ? -160 : 0;
            him.t = 0;
          }
          break;
        }
        him.onFloor += dt;
        if (him.mode === 'walk') {
          if (walkTo(him.goX, dt, false)) {
            him.mode = 'stand';
            him.face = Math.random() < 0.65 ? -1 : 1;
            him.wanderAt = now + 3500 + Math.random() * 4000;
          }
        } else if (now > him.wanderAt && !speech.up) {
          him.goX = spot(him.x);
          him.mode = 'walk';
        }
        if (!him.spoke && him.onFloor >= SAY_AFTER) sayLane(him.lane, now);
        break;
      }
      case 'fall': {
        if (floor < him.y - 1 && him.vy > 0) { // they scrolled back up: climb instead
          him.mode = 'climb';
          break;
        }
        him.vy = Math.min(FALL_MAX, him.vy + FALL_G * dt);
        him.y += him.vy * dt;
        if (him.x < geom.outX) him.x = Math.min(geom.outX, him.x + him.vx * dt);
        if (floor - him.y < 120) him.x += (geom.landX - him.x) * Math.min(1, dt * 9);
        him.face = him.x < geom.landX ? 1 : -1;
        if (him.y >= floor && him.vy > 0) land();
        break;
      }
      case 'climb': {
        if (floor > him.y + 1) { // they scrolled on again: let go
          him.mode = 'fall';
          him.vy = 0;
          him.vx = 0;
          break;
        }
        // Quicker the further he has to go, so a long way up takes no longer
        // than about a second.
        him.y = Math.max(floor, him.y - Math.max(CLIMB_SPEED, (him.y - floor) * 2.4) * dt);
        him.phase += dt * 260;
        him.face = geom.outside ? -1 : 1;
        if (him.y - floor < 80) him.x += (geom.landX - him.x) * Math.min(1, dt * 9);
        else if (Math.abs(him.x - geom.outX) > 1) him.x += (geom.outX - him.x) * Math.min(1, dt * 12);
        if (him.y <= floor) land();
        break;
      }
      case 'land': {
        him.t += dt;
        if (him.t >= LAND_TIME) {
          him.mode = 'walk';
          him.goX = spot(him.x);
        }
        break;
      }
      default:
        break;
    }
  }

  // The pose for what he is doing, eased from the last so nothing snaps.
  function render(dt) {
    let wanted;
    if (him.mode === 'walk' || (him.mode === 'stand' && him.target !== him.lane)) wanted = pose(GAITS[him.gait], him.phase);
    else if (him.mode === 'fall') {
      const flail = Math.sin(performance.now() / 90) * 8; // arms going as he drops
      wanted = {
        ...FALL_POSE,
        near: { ...FALL_POSE.near, shoulder: FALL_POSE.near.shoulder + flail },
        far: { ...FALL_POSE.far, shoulder: FALL_POSE.far.shoulder - flail },
      };
    } else if (him.mode === 'climb') wanted = climbPose(him.phase);
    else {
      him.idle += (dt / IDLE_CYCLE) * 100;
      const idle = pose(GAITS.idle, reducedMotion.matches ? 0 : him.idle);
      wanted = him.mode === 'land' ? mixPose(CROUCH_POSE, idle, Math.min(1, him.t / LAND_TIME)) : idle;
    }
    him.shown = him.shown ? mixPose(him.shown, wanted, reducedMotion.matches ? 1 : Math.min(1, dt * 16)) : wanted;
    const p = him.shown;
    body.root.style.transform = `translateY(${p.bob.toFixed(2)}px)`;
    body.lean.style.transform = `rotate(${p.lean.toFixed(2)}deg)`;
    applySide(body.near, p.near);
    applySide(body.far, p.far);
    fig.style.transform = `translate3d(${(him.x - geom.figW / 2).toFixed(1)}px, ${(him.y - geom.figH).toFixed(1)}px, 0) scaleX(${him.face < 0 ? -1 : 1})`;
    placeBubble();
  }

  /* ------------------------------------------------------ what he says */

  function sayLane(n, now) {
    him.spoke = true;
    speech.lines = [...(laneLines[n] || [])];
    speech.until = now;
    speech.up = false;
  }

  function hush() {
    speech.lines = [];
    if (speech.up) bubble.classList.remove('is-up');
    speech.up = false;
  }

  // One line at a time, each up for as long as it takes to read.
  function updateSpeech(now) {
    if (now < speech.until) return;
    if (speech.up) {
      bubble.classList.remove('is-up');
      speech.up = false;
      speech.until = now + 350;
      return;
    }
    const line = speech.lines.shift();
    if (!line) return;
    bubble.textContent = line;
    bubble.classList.add('is-up');
    speech.up = true;
    speech.until = now + Math.min(5200, Math.max(2400, 1400 + line.length * 45));
    sfx.pop?.();
    sfx.babble?.(line, 0.12);
  }

  function placeBubble() {
    if (!speech.up) return;
    const w = bubble.offsetWidth;
    const h = bubble.offsetHeight;
    const left = Math.max(0, Math.min(geom.width - w, him.x - w * 0.72));
    bubble.style.left = `${left.toFixed(1)}px`;
    bubble.style.top = `${(him.y - geom.figH - h - 16).toFixed(1)}px`;
    bubble.style.setProperty('--tail', `${Math.max(18, Math.min(w - 18, him.x - left)).toFixed(1)}px`);
  }

  /* ------------------------------------------------------ the loop */

  let frameId = 0;
  let last = 0;
  let measuredAt = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (now - measuredAt > 500) {
      measure();
      measuredAt = now;
    }
    update(dt, now);
    render(dt);
    updateSpeech(now);
    frameId = requestAnimationFrame(tick);
  }

  // He drops in from above onto the first floor.
  function enter() {
    measure();
    hush();
    him.lane = 0;
    him.target = 0;
    him.x = spot();
    him.face = -1;
    him.shown = null;
    him.spoke = false;
    if (reducedMotion.matches) {
      him.mode = 'off';
    } else {
      him.mode = 'fall';
      him.y = -geom.figH * 1.2;
      him.vy = 0;
      him.vx = 0;
    }
    last = performance.now();
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------ in and out */

  let open = false;
  let busy = false;
  let closeQueued = false;
  const sheet = () => document.querySelector('.projects-sheet');
  const EASE = 'cubic-bezier(0.7, 0, 0.2, 1)';
  const insetOf = (r) => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 4px)`;

  // The sheet grows to fill the screen, turning from paper to white, while
  // the world behind it swells as if the camera were moving in.
  function zoom(direction) {
    const r = sheet()?.getBoundingClientRect();
    if (reducedMotion.matches || !r || !r.width) {
      return root.animate([{ opacity: direction > 0 ? 0 : 1 }, { opacity: direction > 0 ? 1 : 0 }], { duration: 160, fill: 'forwards' }).finished;
    }
    const small = { clipPath: insetOf(r), backgroundColor: '#fbf8f1' };
    const full = { clipPath: 'inset(0px 0px 0px 0px round 0px)', backgroundColor: '#ffffff' };
    const origin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
    const worldFrames = [{ transform: 'scale(1)', transformOrigin: origin }, { transform: 'scale(1.12)', transformOrigin: origin }];
    const time = direction > 0 ? 720 : 560;
    scene.animate(direction > 0 ? worldFrames : worldFrames.reverse(), { duration: time, easing: EASE });
    navbar?.animate([{ opacity: direction > 0 ? 1 : 0 }, { opacity: direction > 0 ? 0 : 1 }], { duration: time * 0.6, easing: 'ease-out' });
    if (direction > 0) {
      scroller.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: time - 200, easing: 'ease-out', fill: 'backwards' });
    } else {
      scroller.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    }
    return root.animate(direction > 0 ? [small, full] : [full, small], { duration: time, delay: direction > 0 ? 0 : 120, easing: EASE, fill: 'forwards' }).finished;
  }

  function setWorldInert(on) {
    scene.inert = on;
    if (navbar) navbar.inert = on;
  }

  async function openCase(i = currentIndex()) {
    if (open || busy || !projectData[i]) return;
    busy = true;
    closeQueued = false;
    open = true;
    build(i);
    root.hidden = false;
    scroller.scrollTop = 0;
    setWorldInert(true);
    history.pushState({ caseStudy: projectData[i].slug }, '', `#work/${projectData[i].slug}`);
    sfx.rustle?.(0.3, 0);
    await zoom(1);
    root.getAnimations().forEach((a) => a.cancel());
    scroller.getAnimations().forEach((a) => a.cancel());
    // Back/Escape can remove the history entry while the opening zoom is
    // still busy. Finish by closing instead of leaving a history-less case
    // over an inert world.
    if (closeQueued || !history.state?.caseStudy) {
      busy = false;
      return closeCase();
    }
    html.classList.add('is-case-open');
    root.querySelector('#case-title')?.focus({ preventScroll: true });
    busy = false;
    enter();
  }

  async function closeCase() {
    if (!open) return;
    if (busy) {
      closeQueued = true;
      return;
    }
    busy = true;
    closeQueued = false;
    cancelAnimationFrame(frameId);
    hush();
    html.classList.remove('is-case-open');
    setWorldInert(false);
    sfx.rustle?.(0.2, 0);
    await zoom(-1);
    root.hidden = true;
    root.getAnimations().forEach((a) => a.cancel());
    scroller.getAnimations().forEach((a) => a.cancel());
    open = false;
    busy = false;
    projectDetail.querySelector('.project-case')?.focus({ preventScroll: true });
  }

  // Closing from the page goes back through history, so the browser's own
  // Back button and this one do the same thing.
  function requestClose() {
    if (history.state?.caseStudy) history.back();
    else closeCase();
  }

  // The next project, without leaving the page: it fades over, and he drops
  // in again. The sheet follows, so it is this one he builds on the bench.
  // (From the bar's switcher, focus stays on the switcher.)
  let turning = false;
  function turnTo(i, { focusTitle = true } = {}) {
    if (!open || busy || turning || i === index) return;
    turning = true;
    cancelAnimationFrame(frameId);
    hush();
    selectProject(i);
    const swap = () => {
      build(i);
      scroller.scrollTop = 0;
      history.replaceState({ caseStudy: projectData[i].slug }, '', `#work/${projectData[i].slug}`);
      if (focusTitle) root.querySelector('#case-title')?.focus({ preventScroll: true });
      turning = false;
      enter();
    };
    if (reducedMotion.matches) return swap();
    scroller.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).finished.then(() => {
      swap();
      scroller.getAnimations().forEach((a) => a.cancel());
      scroller.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' });
    });
  }

  const currentIndex = () => Math.max(0, projectTabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));

  projectDetail.querySelector('.project-case')?.addEventListener('click', () => {
    sfx.tick?.(true);
    openCase(currentIndex());
  });
  back.addEventListener('click', requestClose);
  // The switcher: pick a project, or step to the one either side.
  select.addEventListener('change', () => turnTo(Number(select.value), { focusTitle: false }));
  steps.forEach((button) => button.addEventListener('click', () => {
    sfx.tick?.(true);
    turnTo((index + Number(button.dataset.step) + projectData.length) % projectData.length, { focusTitle: false });
  }));
  window.addEventListener('popstate', () => {
    if (open && !history.state?.caseStudy) closeCase();
  });
  // A reload keeps the address, but the page starts in the world.
  if (location.hash.startsWith('#work/')) history.replaceState(null, '', location.pathname + location.search);

  // While it is open the world's own keys and touch-walking stay out of
  // it: Esc closes, and everything else scrolls or clicks the page.
  window.addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
    }
    event.stopPropagation();
  }, true);
  window.addEventListener('keyup', (event) => { if (open) event.stopPropagation(); }, true);
  window.addEventListener('touchstart', (event) => { if (open) event.stopPropagation(); }, { capture: true, passive: true });
  window.addEventListener('pointerdown', (event) => { if (open) event.stopPropagation(); }, true);
  window.addEventListener('resize', () => { if (open) measure(); });

  window.caseStudy = {
    open: openCase,
    close: requestClose,
    next: () => turnTo((index + 1) % projectData.length),
    get isOpen() { return open && !busy; },
    get him() { return { ...him, shown: undefined, floors: geom.floors.slice(), width: geom.width }; },
    get saying() { return speech.up ? bubble.textContent : null; },
    CASES,
  };
})();
