#!/bin/zsh
# Render the scene and encode the MP4.
# usage: encode.sh [buildDir] [out.mp4]
set -e
BASE=${0:A:h:h}
B=${1:-build}; OUT=${2:-$B/out.mp4}
DUR=$(node -e "const s=require('fs').readFileSync('$B/footage/clip.js','utf8');const c=JSON.parse(s.match(/CLIP=(\{.*?\})/)[1]);console.log((c.n/c.fps).toFixed(3))")
rm -rf "$B/frames"
node "$BASE/tools/render.mjs" "$B/frames" "file://${B:A}/index.html" --w 1080 --h 1920 --fps 30 --from 0 --to "$DUR" --q 94
A=(); [ -f "$B/audio.m4a" ] && A=(-i "$B/audio.m4a" -map 0:v -map 1:a -c:a aac -b:a 256k -shortest)
ffmpeg -v error -y -framerate 30 -i "$B/frames/f_%05d.jpg" $A -c:v libx264 -crf 17 -pix_fmt yuv420p -movflags +faststart "$OUT"
echo "done: $OUT"
