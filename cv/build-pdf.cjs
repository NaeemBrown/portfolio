// Prints cv/index.html to cv/Naeem-Brown-CV.pdf with headless Edge, so the
// PDF is the page exactly: real, selectable text and the site's fonts.
//   node cv/build-pdf.cjs
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PAGE = path.join(__dirname, 'index.html');
const OUT = path.join(__dirname, 'Naeem-Brown-CV.pdf');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-pdf-'));
  const port = 9800 + Math.floor(Math.random() * 150);
  spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, '--disable-gpu',
    `--user-data-dir=${profile}`, '--no-first-run', '--allow-file-access-from-files', 'about:blank']);
  let tab = null;
  for (let i = 0; i < 80 && !tab; i += 1) {
    await wait(150);
    try { tab = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  }
  if (!tab) throw new Error('Edge did not start');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((r) => {
    id += 1;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Page.navigate', { url: `file:///${PAGE.replace(/\\/g, '/')}` });
  // Wait for the fonts, or the headings print in the fallback face.
  for (let i = 0; i < 50; i += 1) {
    const res = await send('Runtime.evaluate', {
      expression: 'document.readyState === "complete" && document.fonts.status === "loaded" && [...document.fonts].every((f) => f.status !== "loading")',
      returnByValue: true,
    });
    if (res.result?.result?.value) break;
    await wait(100);
  }
  await wait(300);

  const pdf = await send('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  });
  if (!pdf.result?.data) throw new Error(`printToPDF failed: ${JSON.stringify(pdf.error || pdf)}`);
  fs.writeFileSync(OUT, Buffer.from(pdf.result.data, 'base64'));
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);

  ws.close();
  // The msedge.exe started hands over to another; stop every one on this profile.
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${path.basename(profile)}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
    ], { stdio: 'ignore' });
  } catch { /* already gone */ }
  await wait(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
