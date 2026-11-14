# /відео-команди для Claude — rtem_design

80 відеоефектів з рілсу [@rtem_design](https://instagram.com/rtem_design) · [rtemdesign.com](https://rtemdesign.com). Пишеш одну слеш-команду в Claude Code — і він збирає ефект на твоєму відео.

**Сторінка:** відкрий GitHub Pages цього репозиторію — там каталог, превʼю, промпти і завантаження.

- `pack/rtem-commands-80.zip` — увесь набір (80 скілів + `commands-base` + README)
- `pack/one/<команда>.zip` — одна команда з рушієм
- `commands-base/` — рушій: вирізка з фону (Apple Vision), рамки обличчя, щоб ефекти його не перекривали, рендер кадрів у Chrome, збірка MP4
- `data.js` — опис усіх 80 команд; `node build.mjs <reel.mp4> <grid.jpg>` перезбирає набір і медіа

Встановлення: розпакуй архів і скопіюй усі папки в `~/.claude/skills/`, потім у Claude Code: `/orbit візьми моє відео video.mp4`.
