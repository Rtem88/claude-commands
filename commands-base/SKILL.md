---
name: commands-base
description: Спільний рушій для всіх відео-команд rtem_design (/orbit, /liquid-glass-graph, /nle-timeline…). Готує кліп (кадри 1080×1920, вирізка людини, рамки обличчя, звук), дає шаблон сцени і рендерить MP4. Використовуй, коли будь-яка з цих команд просить зібрати ефект на відео.
---

# commands-base

Рушій, на якому зібраний рілс @rtem_design. Кожна команда описує ефект, а збирається він тут.

## Що потрібно один раз
- macOS 12+ з Xcode Command Line Tools (`xcode-select --install`): вирізка працює на Apple Vision, офлайн і безкоштовно.
- Node 18+, ffmpeg (`brew install ffmpeg`), Google Chrome.

## Конвеєр
1. **Підготовка**: `~/.claude/skills/commands-base/scripts/prep.sh <відео> <buildDir>`
   - кадри `footage/f_XXXX.jpg` (1080×1920), маски `footage/m_XXXX.png` (альфа = людина);
   - `footage/clip.js`: `CLIP = { n, fps }` і `FACES[]` — рамка обличчя на кожен кадр, згладжена;
   - `audio.m4a` і шаблон сторінки: `index.html`, `engine.js`, `scene.js`.
   - Якщо відео зняте на фронтальну камеру й написи на одязі дзеркальні — додай `hflip` у фільтр ffmpeg у prep.sh.
2. **Сцена**: перепиши `scene.js` під ефект. Сторінка детермінована: `window.SCENE.render(t)` малює кадр для секунди `t`, без таймерів і CSS-анімацій.
3. **Перевірка**: `node ~/.claude/skills/commands-base/tools/render.mjs <buildDir>/check "file://<abs buildDir>/index.html" --w 1080 --h 1920 --times 0.5,1.5,2.5` — подивись кадри й покажи користувачу.
4. **Рендер**: `~/.claude/skills/commands-base/scripts/encode.sh <buildDir> <out.mp4>` — усі кадри через headless Chrome + ffmpeg з оригінальним звуком.

## engine.js
- `Video(parent)` — сам кліп; `.set(t)`.
- `Cut(parent)` — ти, вирізаний з фону; `Cut(parent, true)` — тільки голова (до підборіддя).
- `FB(t)` — рамка обличчя `[x, y, w, h]`; `CHIN` — найнижче підборіддя в кліпі.
- `el()`, `setSrc()`, `clamp`, `lerp`, `ss`, `eo`, `eio` — розмітка й easing.

## Правила, які не можна порушувати
- **Обличчя ніколи нічим не перекрите.** Порядок шарів: `Video` → усе, що за тобою → `Cut` (уся людина) → усе, що перед тілом → `Cut(…, true)` (голова) — завжди останнім.
- Елементи перед тобою — нижче `CHIN + 60` або збоку від обличчя. Якщо місця мало — зменш елемент, а не перекривай обличчя.
- Формат 1080×1920, 30 fps. Рухи — з easing, без лінійних стрибків. Ефект синхронізуй з ударами музики, якщо вона є.
- Спершу 3 контрольні кадри, потім повний рендер.
