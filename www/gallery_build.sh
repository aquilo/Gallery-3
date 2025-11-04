#!/bin/bash

mkdir -p dist

# 2) Alles zusammenziehen & minifizieren (ohne irgendwas zu installieren)
npx terser $(cat bundle-order_js.txt) -o dist/app.min.js -c -m

# 3) Version anhängen – Variante 1: Zeitstempel
STAMP=$(date +%Y%m%d%H%M%S)
cp dist/app.min.js "dist/app.$STAMP.js"

concat=/tmp/gallery.concat.css
> "$concat"
while IFS= read -r f; do
  [ -f "$f" ] && cat "$f" >> "$concat"
done < bundle-order_css.txt

npx csso "$concat" --output dist/gallery.min.css
echo "Timestamp: $STAMP"