const artifactCatalog = {
  about: {
    place: 'About me · the camp',
    title: 'Field journal',
    description: 'A small record of the journey: paper, pencil, compass and one leaf the wind refuses to leave alone.',
    actions: [
      ['page', 'Turn a page'],
      ['write', 'Write a note'],
      ['compass', 'Check the compass'],
      ['leaf', 'Catch the leaf'],
      ['close', 'Close and reopen'],
    ],
  },
  projects: {
    place: 'Projects · the workshop',
    title: 'Clockwork prototype',
    description: 'A working model assembled at the bench, with enough moving parts to reward a second look.',
    actions: [
      ['measure', 'Measure the build'],
      ['tighten', 'Tighten a gear'],
      ['crank', 'Turn the crank'],
      ['spark', 'Tap and spark'],
      ['admire', 'Step back and admire'],
    ],
  },
  experience: {
    place: 'Experience · today’s stop',
    title: 'Career wayfinder',
    description: 'Part route map, part station machine—a physical record of every stop and the track still ahead.',
    actions: [
      ['route', 'Inspect the route'],
      ['slats', 'Flip the board'],
      ['stamp', 'Stamp a ticket'],
      ['signal', 'Pull the signal'],
      ['watch', 'Check the time'],
    ],
  },
  skills: {
    place: 'Skills · operations',
    title: 'Network analyzer',
    description: 'A portable diagnostic cart for the little checks that keep a much larger system healthy.',
    actions: [
      ['tune', 'Tune the dial'],
      ['diagnose', 'Run diagnostics'],
      ['reseat', 'Reseat the cable'],
      ['trace', 'Trace the signal'],
      ['wipe', 'Clean the glass'],
    ],
  },
};

const artifactIds = Object.keys(artifactCatalog);
const frame = document.querySelector('#artifact-frame');
const stage = document.querySelector('.artifact-stage');
const tabs = document.querySelector('.artifact-tabs');
const actions = document.querySelector('.artifact-actions');
const place = document.querySelector('#artifact-place');
const title = document.querySelector('#artifact-title');
const description = document.querySelector('#artifact-description');

let selectedArtifact = 'about';
let selectedMotion = 'page';
let ready = false;
let playTimer = 0;
let startTimer = 0;

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function renderTabs() {
  tabs.replaceChildren(...artifactIds.map((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = id === 'about' ? 'About me' : id;
    button.dataset.artifact = id;
    button.setAttribute('aria-selected', String(id === selectedArtifact));
    button.addEventListener('click', () => selectArtifact(id));
    return button;
  }));
}

function renderInspector() {
  const artifact = artifactCatalog[selectedArtifact];
  place.textContent = artifact.place;
  title.textContent = artifact.title;
  description.textContent = artifact.description;
  actions.replaceChildren(...artifact.actions.map(([motion, label], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.motion = motion;
    button.dataset.number = String(index + 1).padStart(2, '0');
    button.setAttribute('aria-pressed', String(motion === selectedMotion));
    button.addEventListener('click', () => playMotion(motion));
    return button;
  }));
}

function portfolioWindow() {
  return frame.contentWindow;
}

function preparePortfolio(id) {
  const view = portfolioWindow();
  if (!view?.alive?.previewArtifact) return false;
  return view.alive.previewArtifact(id);
}

function playMotion(motion = selectedMotion) {
  window.clearTimeout(startTimer);
  selectedMotion = motion;
  renderInspector();
  if (!ready) return;
  const view = portfolioWindow();
  view.alive.forceArtifact(selectedArtifact, motion);

  window.clearTimeout(playTimer);
  playTimer = window.setTimeout(() => {
    actions.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', 'false'));
  }, 3900);
}

async function selectArtifact(id) {
  if (!artifactCatalog[id]) return;
  selectedArtifact = id;
  selectedMotion = artifactCatalog[id].actions[0][0];
  renderTabs();
  renderInspector();
  if (!ready) return;
  window.clearTimeout(startTimer);
  preparePortfolio(id);
  startTimer = window.setTimeout(() => playMotion(selectedMotion), 260);
}

async function connectPreview() {
  for (let tries = 0; tries < 80; tries += 1) {
    if (preparePortfolio(selectedArtifact)) {
      ready = true;
      stage.classList.add('is-ready');
      await wait(260);
      playMotion(selectedMotion);
      return;
    }
    await wait(100);
  }
  document.querySelector('.artifact-loading').textContent = 'Preview could not start. Reload to try again.';
}

frame.addEventListener('load', connectPreview);

window.addEventListener('keydown', (event) => {
  if (event.target.closest?.('iframe, a, button')) return;
  if (/^[1-5]$/.test(event.key)) {
    const motion = artifactCatalog[selectedArtifact].actions[Number(event.key) - 1]?.[0];
    if (motion) playMotion(motion);
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const current = artifactIds.indexOf(selectedArtifact);
    selectArtifact(artifactIds[(current + direction + artifactIds.length) % artifactIds.length]);
  }
});

renderTabs();
renderInspector();
