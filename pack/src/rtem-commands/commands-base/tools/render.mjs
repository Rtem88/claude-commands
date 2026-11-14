// Render a deterministic page (window.renderAt(seconds) → Promise) to JPEG/PNG frames through headless Chrome (CDP, no deps).
// usage: node render.mjs <outDir> <url> --w 1920 --h 1080 --scale 1 --fps 30 --from 0 --to 10 [--png] [--prefix f_] [--shot "<js>"]
//   --shot: single screenshot after evaluating <js> (no renderAt needed), saved as <outDir>/<prefix>shot.jpg
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const argv = process.argv.slice(2), outDir = argv[0], url = argv[1], opt = {};
for (let i = 2; i < argv.length; i++) { const k = argv[i].replace(/^--/, ''); if (['png', 'transparent'].includes(k)) opt[k] = true; else opt[k] = argv[++i]; }
const W = +(opt.w || 1920), H = +(opt.h || 1080), SC = +(opt.scale || 1), FPS = +(opt.fps || 30), FROM = +(opt.from || 0), TO = +(opt.to || 1), PFX = opt.prefix || 'f_', Q = +(opt.q || 92);
mkdirSync(outDir, { recursive: true });
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
const port = 9500 + Math.floor(Math.random() * 400), PROFILE = join(outDir, `.chrome-${process.pid}`);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--force-color-profile=srgb', `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
const bye = code => { try { chrome.kill(); } catch (e) {} setTimeout(() => { try { rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {} process.exit(code); }, 300); };
let beat = Date.now(); setInterval(() => { if (Date.now() - beat > 120000) { console.error('ERROR renderer stalled'); bye(5); } }, 5000).unref();
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target; for (let i = 0; i < 80 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} }
if (!target) { console.error('Chrome did not start'); bye(3); }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const [res, rej] = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') console.error('page:', d.params.args.map(a => a.value || a.description).join(' ')); if (d.method === 'Runtime.exceptionThrown') console.error('page exception:', d.params.exceptionDetails?.exception?.description); };
const send = (method, params = {}) => new Promise((res, rej) => { pending.set(++id, [res, rej]); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shoot = async name => { beat = Date.now(); const fmt = opt.png ? 'png' : 'jpeg'; const { data } = await send('Page.captureScreenshot', opt.png ? { format: 'png' } : { format: 'jpeg', quality: Q }); writeFileSync(join(outDir, name + (opt.png ? '.png' : '.jpg')), Buffer.from(data, 'base64')); };
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SC, mobile: false });
  if (opt.transparent) await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await send('Page.navigate', { url });
  if (opt.shot !== undefined) {
    for (let i = 0; i < 80; i++) { await sleep(200); if (await evaluate('document.readyState === "complete"').catch(() => false)) break; }
    await evaluate('document.fonts.ready.then(() => 1)'); await sleep(400);
    const r = await evaluate(`(async () => { ${opt.shot} })()`); if (r !== undefined) console.log('shot result', JSON.stringify(r));
    await sleep(+(opt.wait || 150)); await shoot(PFX + 'shot'); console.log('saved'); ws.close(); bye(0);
  } else {
    for (let i = 0; ; i++) { await sleep(200); if (await evaluate('window.READY === true').catch(() => false)) break; const err = await evaluate('window.READY_ERROR || ""').catch(() => ''); if (err) throw new Error(err); if (i > 400) throw new Error('scene never became ready'); }
    if (opt.times) { for (const tt of opt.times.split(',').map(Number)) { await evaluate(`renderAt(${tt})`); await shoot(PFX + tt.toFixed(2)); } console.log('done times'); ws.close(); bye(0); await sleep(1e6); }
    const f0 = Math.round(FROM * FPS), f1 = Math.round(TO * FPS), t0 = Date.now();
    for (let f = f0; f < f1; f++) { await evaluate(`renderAt(${f / FPS})`); await shoot(PFX + String(f).padStart(5, '0')); if (f % 30 === 0) console.log(`frame ${f}/${f1} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    console.log(`done ${f1 - f0} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`); ws.close(); bye(0);
  }
} catch (e) { console.error('ERROR ' + (e && e.message || e)); bye(4); }
