// Builds the downloadable pack, zips, manifest and media for the page.
// usage: node build.mjs <reel.mp4> <grid2x.jpg>
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, rmSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';
globalThis.window = globalThis;
const { CMDS, fullPrompt } = createRequire(import.meta.url)('./data.js');
const [REEL, GRID2X] = process.argv.slice(2);
const ROOT = new URL('.', import.meta.url).pathname;
const SRC = join(ROOT, 'pack/src'), PK = join(SRC, 'rtem-commands');
rmSync(join(ROOT, 'pack'), { recursive: true, force: true }); mkdirSync(PK, { recursive: true });

// ---------- SKILL.md per command ----------
const steps = c => c.nv ? `1. Створи \`./${c.n}-build\`: скопіюй туди \`~/.claude/skills/commands-base/template/*\` і створи \`footage/clip.js\` з \`window.CLIP={n:<кадри>,fps:30}; window.FACES=[[340,700,400,400]];\` (відео не потрібне).
2. Збери ефект з розділу «Ефект» у \`scene.js\` (без \`Video\` і \`Cut\`).
3. Перевір 3 кадри: \`node ~/.claude/skills/commands-base/tools/render.mjs ./${c.n}-build/check "file://$PWD/${c.n}-build/index.html" --w 1080 --h 1920 --times 0.5,1.5,2.5\` і покажи їх користувачу.
4. Рендер: \`~/.claude/skills/commands-base/scripts/encode.sh ./${c.n}-build ./${c.n}.mp4\`.`
  : `1. Візьми відео користувача (якщо шлях не вказано — спитай).
2. Підготуй кліп: \`~/.claude/skills/commands-base/scripts/prep.sh <відео> ./${c.n}-build\` — кадри, вирізка, рамки обличчя, звук і шаблон.
3. Збери ефект з розділу «Ефект» у \`./${c.n}-build/scene.js\` на рушії \`engine.js\` (\`Video\`, \`Cut\`, \`Cut(…, true)\`, \`FB(t)\`, \`CHIN\`).
4. Шари: \`Video\` → що за тобою → \`Cut\` → що перед тілом → \`Cut(…, true)\` останнім. Обличчя нічим не перекривай: елементи перед тобою — нижче \`CHIN + 60\` або збоку.
5. Перевір 3 кадри: \`node ~/.claude/skills/commands-base/tools/render.mjs ./${c.n}-build/check "file://$PWD/${c.n}-build/index.html" --w 1080 --h 1920 --times 0.5,1.5,2.5\` і покажи їх користувачу.
6. Рендер: \`~/.claude/skills/commands-base/scripts/encode.sh ./${c.n}-build ./${c.n}.mp4\`.`;
for (const c of CMDS) {
  const d = join(PK, c.n); mkdirSync(d);
  writeFileSync(join(d, 'SKILL.md'), `---
name: ${c.n}
description: "${c.d.replace(/"/g, "'")} Використовуй, коли користувач пише /${c.n} або просить цей ефект на своєму відео."
---

# /${c.n}

${c.d}

## Що потрібно
${(c.nv ? c.need : ['Вертикальне відео з тобою (9:16)', ...c.need.filter(x => x !== 'Тільки відео')]).map(x => '- ' + x).join('\n')}

## Найкращий кадр
${c.shot}

## Ефект
${c.p}

Фігурні дужки \`{…}\` — те, що підставляє користувач. Якщо він їх не дав — спитай або запропонуй варіант.

## Як зібрати
${steps(c)}

## Прямий промпт
Якщо скіли не встановлені, цей текст можна вставити в Claude Code напряму:

\`\`\`
${fullPrompt(c)}
\`\`\`

— @rtem_design · зроблено в Claude, по одному рядку
`);
}
// ---------- commands-base + README ----------
cpSync(join(ROOT, 'commands-base'), join(PK, 'commands-base'), { recursive: true, filter: s => !/\/tools\/(segment|faces)$/.test(s) });
writeFileSync(join(PK, 'README.md'), `# /відео-команди для Claude — rtem_design

80 ефектів з мого рілсу. Пишеш одну слеш-команду в Claude Code — і він збирає ефект на твоєму відео.

## Встановлення (один раз)
1. Потрібні: Claude Code, Node 18+, ffmpeg, Google Chrome, macOS 12+ з Xcode Command Line Tools (\`xcode-select --install\`).
2. Скопіюй усі папки з цього архіву, **разом із commands-base**, у \`~/.claude/skills/\`.
3. Відкрий Claude Code у папці з відео і напиши, наприклад: \`/orbit візьми моє відео video.mp4\`.

Знімай вертикально, камера на штативі, навколо голови трохи місця. У кожній команді написано, який кадр їй підходить.
Без скілів? У кожному SKILL.md внизу є прямий промпт — його можна просто вставити в Claude Code.

## Команди
${CMDS.map(c => `- \`/${c.n}\` — ${c.d}`).join('\n')}

---
@rtem_design · https://instagram.com/rtem_design
`);

// ---------- zips + manifest ----------
const zip = (out, items) => execFileSync('zip', ['-qr', '-X', out, ...items], { cwd: SRC });
mkdirSync(join(ROOT, 'pack/one'), { recursive: true });
zip(join(ROOT, 'pack/rtem-commands-80.zip'), ['rtem-commands']);
for (const c of CMDS) zip(join(ROOT, `pack/one/${c.n}.zip`), [`rtem-commands/${c.n}`, 'rtem-commands/commands-base', 'rtem-commands/README.md']);
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [relative(SRC, p)]; });
writeFileSync(join(ROOT, 'pack/manifest.json'), JSON.stringify({ base: walk(join(PK, 'commands-base')).concat('rtem-commands/README.md'), cmd: Object.fromEntries(CMDS.map(c => [c.n, [`rtem-commands/${c.n}/SKILL.md`]])) }));

// ---------- media: reel loops + 80 thumbnails ----------
const M = join(ROOT, 'media'); mkdirSync(join(M, 'reel'), { recursive: true }); mkdirSync(join(M, 'thumb'), { recursive: true });
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
// full-screen part of each reel cycle (frames @30 fps): [from, to]
const REELSEG = { 'ui-world': [50, 79], 'liquid-glass-graph': [142, 171], 'pull-back-reveal': [229, 263], 'match-cut': [321, 356], 'creator-list': [419, 448], 'phone-mockup': [512, 540], 'reel-feed': [598, 633], 'cinematic-type': [690, 725], 'nle-timeline': [790, 817], 'apple-ui-toggles': [881, 910], 'jiggle-delete': [973, 1002] };
if (REEL && existsSync(REEL)) for (const [n, [a, b]] of Object.entries(REELSEG)) {
  const ss = (a / 30).toFixed(3), t = ((b - a) / 30).toFixed(3);
  ff(['-ss', ss, '-i', REEL, '-t', t, '-an', '-vf', 'scale=540:960', '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(M, 'reel', n + '.mp4')]);
  ff(['-ss', ((a + b) / 60).toFixed(3), '-i', REEL, '-frames:v', '1', '-vf', 'scale=540:960', '-q:v', '4', join(M, 'reel', n + '.jpg')]);
  ff(['-ss', ((a + b) / 60).toFixed(3), '-i', REEL, '-frames:v', '1', '-vf', 'crop=1080:1350:0:285,scale=208:260', '-q:v', '4', join(M, 'thumb', n + '.jpg')]);
}
// grid cells of the reel's last frame (rendered at 2x) → thumbnails for the rest
const GRID = ['orbit', 'liquid-glass-graph', 'match-cut', 'glass-type', 'apple-ui-toggles', 'ui-world', 'screen-push', 'logo-orbit', 'glass-explainer', 'cinematic-type', 'split-reel', 'over-the-shoulder', 'pov-carousel', 'shutter-strike', 'headline-wall', 'claude-beside', 'digital-zoom', 'phone-mockup', 'screen-wipe', 'before-after', 'glass-card', 'jiggle-delete', 'reel-feed', 'word-stack', 'typewriter-cut', 'reel-fan', 'growth-chart', 'pixel-title', 'couch-wall', 'checklist', 'all-at-once', 'chart-grow', 'pull-back-reveal', 'green-screen', 'paper-cut', 'doodle-boil', 'vertigo', 'cover-story', 'kinetic-hook', 'gravity-drop', 'giant-captions', 'prompt-bar', 'storyboard', 'icon-strike', 'file-drop', 'nle-timeline', 'grade-slider', 'eyedropper', 'film-look', 'title-card', 'playing-grid', 'video-card', 'comment-cta', 'comment-drop', 'hero-number', 'notif-stack', 'comment-rain', 'price-strike', 'progress-track', 'callout', 'search-bar', 'prompt-card', 'stamp', 'brand-lockup', 'orbit-posters', 'effect-list', 'name-tag', 'creator-list', 'code-reveal', 'hand-cards', 'split-notes', 'app-tutorial', 'caption-pill', 'explainer-panel', 'image-cluster', 'cutout-grid', 'cutout-backdrop', 'split-document', 'mirror-cut', 'commands'];
const used = new Set(), cell = {};
for (const c of CMDS) { const i = GRID.indexOf(c.n); if (i >= 0) { cell[c.n] = i; used.add(i); } }
for (const c of CMDS) if (cell[c.n] == null) { const i = GRID.findIndex((g, j) => !used.has(j) && c.n.startsWith(g + '-')); if (i >= 0) { cell[c.n] = i; used.add(i); } }
const spare = { 'screen-push-digital': 'screen-wipe', 'cursor-click': 'commands', 'song-card': 'mirror-cut' };
for (const [n, g] of Object.entries(spare)) if (cell[n] == null) cell[n] = GRID.indexOf(g);
if (GRID2X && existsSync(GRID2X)) for (const c of CMDS) {
  if (REELSEG[c.n] && existsSync(join(M, 'thumb', c.n + '.jpg'))) continue;
  const i = cell[c.n], r = Math.floor(i / 9), col = i % 9, S = 1.02;
  const x = 540 + (32 + col * 114 - 540) * S, y = 960 + (300 + r * 158 - 960) * S;
  ff(['-i', GRID2X, '-vf', `crop=${Math.round(104 * S * 2)}:${Math.round(130 * S * 2)}:${Math.round(x * 2)}:${Math.round(y * 2)},scale=208:260`, '-q:v', '4', join(M, 'thumb', c.n + '.jpg')]);
}
console.log('built', CMDS.length, 'commands');
