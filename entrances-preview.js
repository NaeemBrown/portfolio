const weatherOrder = ['clear', 'rain', 'wind', 'snow'];
const tabs = [...document.querySelectorAll('[data-weather]')];
const frame = document.querySelector('#site-frame');
const stage = document.querySelector('.site-preview');
const replay = document.querySelector('.replay');
const openSite = document.querySelector('.open-site');
let selected = 'clear';
let ready = false;

function frameApi() {
  return frame.contentWindow?.alive;
}

function updateControls(playing = true) {
  tabs.forEach((tab) => {
    const active = tab.dataset.weather === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.classList.toggle('is-playing', active && playing);
  });
  openSite.href = `index.html?visit=return&time=day&entrancePreview=${selected}`;
}

function play(weather = selected) {
  if (!weatherOrder.includes(weather)) return;
  selected = weather;
  updateControls(true);
  if (ready) frameApi()?.previewEntrance(selected);
}

async function connect() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (typeof frameApi()?.previewEntrance === 'function') {
      ready = true;
      stage.classList.add('is-ready');
      frameApi().previewEntrance(selected);
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  document.querySelector('.preview-loading').textContent = 'Preview could not start. Reload to try again.';
}

tabs.forEach((tab) => tab.addEventListener('click', () => play(tab.dataset.weather)));
replay.addEventListener('click', () => play(selected));
frame.addEventListener('load', connect);

window.addEventListener('message', (event) => {
  if (event.source !== frame.contentWindow) return;
  if (event.data?.type === 'site-entrance-complete' && event.data.weather === selected) updateControls(false);
});

window.addEventListener('keydown', (event) => {
  if (event.target.closest?.('button, a')) return;
  if (/^[1-4]$/.test(event.key)) play(weatherOrder[Number(event.key) - 1]);
  if (event.key.toLowerCase() === 'r') play(selected);
});

updateControls();

