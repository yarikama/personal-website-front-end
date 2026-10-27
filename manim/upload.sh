#!/usr/bin/env bash
# Puts a learning page's rendered clips (manim/out/<slug>/, from render.sh)
# on R2, where the site plays them from:
# https://assets.yarikama.com/learnings/<slug>/<clip>.mp4 and .jpg.
#
#   manim/upload.sh temporal-difference-learning
#
# Needs `npx wrangler login` once. Uploading a clip again replaces it; the
# CDN may go on serving the old one for up to a day.
set -euo pipefail
cd "$(dirname "$0")"

slug=$1
bucket=${R2_BUCKET:-yarikama-website-backend}

for file in out/"$slug"/*.mp4 out/"$slug"/*.jpg; do
  [ -e "$file" ] || { echo "Nothing rendered in out/$slug: run render.sh first" >&2; exit 1; }
  case $file in *.mp4) type=video/mp4 ;; *) type=image/jpeg ;; esac
  npx --yes wrangler r2 object put "$bucket/learnings/$slug/$(basename "$file")" --file "$file" \
    --content-type "$type" --cache-control "public, max-age=86400" --remote
done
