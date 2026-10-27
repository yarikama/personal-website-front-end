#!/usr/bin/env bash
# Renders a learning page's ManimGL clips into manim/out/<slug>/ as
# <clip>.mp4, each with a .jpg of its last frame for a poster. Clips are dark
# in both of the site's themes. Look at them, then put them on R2, where the
# site plays them from, with upload.sh.
#
#   manim/render.sh temporal-difference-learning            # every clip
#   manim/render.sh temporal-difference-learning TdUpdate   # one of them
#
# Needs uv, ffmpeg and a TeX distribution with ebgaramond (MacTeX has it).
set -euo pipefail
cd "$(dirname "$0")"

slug=$1
shift
file="scenes/${slug//-/_}.py"
scenes=("$@")
if [ ${#scenes[@]} -eq 0 ]; then
  # Every clip in the file: each class that extends Clip
  while IFS= read -r scene; do scenes+=("$scene"); done < <(sed -nE 's/^class ([A-Za-z0-9]+)\(Clip\):.*/\1/p' "$file")
fi

out="out/$slug"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$out"

for scene in "${scenes[@]}"; do
  # TdUpdate -> td-update
  name=$(sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' <<<"$scene" | tr '[:upper:]' '[:lower:]')
  PYTHONPATH=. uvx --quiet --python 3.12 --from manimgl==1.7.2 --with 'setuptools<81' \
    manimgl "$file" "$scene" -w -m --video_dir "$work" --file_name "$name" >"$work/log" 2>&1 ||
    { cat "$work/log"; exit 1; }
  # Smaller, and playable as soon as the first bytes arrive
  ffmpeg -loglevel error -y -i "$work/$name.mp4" -an -c:v libx264 -preset slow -crf 26 \
    -pix_fmt yuv420p -movflags +faststart "$out/$name.mp4"
  ffmpeg -loglevel error -y -sseof -0.05 -i "$out/$name.mp4" -frames:v 1 -q:v 3 "$out/$name.jpg"
  echo "$out/$name.mp4 ($(du -h "$out/$name.mp4" | cut -f1))"
done
