#!/bin/zsh
# Prepare a clip for any /command.
# usage: prep.sh <video> [buildDir]
# → buildDir/footage/f_XXXX.jpg (1080×1920), m_XXXX.png (person matte), clip.js (frame count, fps, face boxes)
# → buildDir/audio.m4a, and the page template (index.html, engine.js, scene.js) if not there yet
set -e
BASE=${0:A:h:h}
IN=$1; OUT=${2:-build}
[ -f "$IN" ] || { echo "no video: $IN"; exit 1; }
mkdir -p "$OUT/footage"
echo "1/5 frames"
ffmpeg -v error -y -i "$IN" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -q:v 3 "$OUT/footage/f_%04d.jpg"
echo "2/5 tools"
[ -x "$BASE/tools/segment" ] || swiftc -O "$BASE/tools/segment.swift" -o "$BASE/tools/segment"
[ -x "$BASE/tools/faces" ] || swiftc -O "$BASE/tools/faces.swift" -o "$BASE/tools/faces"
echo "3/5 cut-out (Apple Vision)"
"$BASE/tools/segment" "$OUT/footage" "$OUT/footage" 540 960
echo "4/5 face boxes"
"$BASE/tools/faces" "$OUT/footage" "$OUT/footage/faces.json"
FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$IN")
node "$BASE/scripts/clip-meta.mjs" "$OUT/footage" "$FPS"
echo "5/5 audio + template"
ffmpeg -v error -y -i "$IN" -vn -c:a aac -b:a 256k "$OUT/audio.m4a" 2>/dev/null || rm -f "$OUT/audio.m4a"
for f in index.html engine.js scene.js; do [ -f "$OUT/$f" ] || cp "$BASE/template/$f" "$OUT/$f"; done
echo "ready: $OUT"
