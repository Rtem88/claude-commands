// Writes footage/clip.js: window.CLIP = { n, fps }, window.FACES = [[x, y, w, h], ...] (smoothed, gaps filled)
// usage: node clip-meta.mjs <footageDir> <fps like 30000/1001>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [dir, fpsStr = '30'] = process.argv.slice(2);
const [a, b = 1] = fpsStr.split('/').map(Number), fps = +(a / b).toFixed(3);
const n = readdirSync(dir).filter(f => /^f_\d+\.jpg$/.test(f)).length;
const raw = JSON.parse(readFileSync(join(dir, 'faces.json'), 'utf8'));
const B = Array.from({ length: n }, (_, i) => raw['f_' + String(i + 1).padStart(4, '0')] || null);
// fill gaps with the nearest detected box; no face at all → a centred default
const any = B.find(Boolean) || [340, 700, 400, 400];
for (let i = 0; i < n; i++) if (!B[i]) { let j = 1; while (!B[i - j] && !B[i + j] && j < n) j++; B[i] = B[i - j] || B[i + j] || any; }
const S = B.map((_, i) => { const w = B.slice(Math.max(0, i - 4), i + 5); return [0, 1, 2, 3].map(q => +(w.reduce((s, x) => s + x[q], 0) / w.length).toFixed(1)); });
writeFileSync(join(dir, 'clip.js'), `window.CLIP=${JSON.stringify({ n, fps })};\nwindow.FACES=${JSON.stringify(S)};\n`);
const chin = Math.max(...S.map(f => f[1] + f[3]));
console.log(`clip: ${n} frames @ ${fps} fps · lowest chin y=${Math.round(chin)} (put overlays below ${Math.round(chin + 60)} or behind you)`);
