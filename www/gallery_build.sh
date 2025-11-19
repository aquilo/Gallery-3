#!/bin/bash
set -euo pipefail

# 0) dist-Verzeichnis sicherstellen
mkdir -p dist

# 1) Alte app.*.js nach dist/old verschieben
mkdir -p dist/old
# Nur Dateien direkt in dist/ verschieben, nicht in Unterordnern
find dist -maxdepth 1 -type f -name 'app.*.js' -exec mv {} dist/old/ \;

STAMP=$(date +%Y%m%d%H%M%S)

# 2) JS zusammenziehen & minifizieren
npx terser $(cat bundle-order_js.txt) -o "dist/app.$STAMP.js" -c -m

# 3) index.html nach dist kopieren und Script-Tag anpassen
if [ -f index.html ]; then
  echo "Kopiere index.html nach dist/ und setze app.$STAMP.js ein..."
  cp index.html dist/index.html
  # macOS-sed: -i ''
  sed -i '' "s/app\.XXXXX\.js/app.$STAMP.js/" dist/index.html
else
  echo "Hinweis: index.html nicht gefunden, überspringe Kopie/Anpassung."
fi

cp manifest.json dist/manifest.json
# 4) CSS zusammenführen & minifizieren
concat=/tmp/gallery.concat.css
> "$concat"
while IFS= read -r f; do
  [ -f "$f" ] && cat "$f" >> "$concat"
done < bundle-order_css.txt

npx csso-cli "$concat" --output dist/gallery.min.css
echo "Timestamp: $STAMP"

# 5) data/ nach dist/data kopieren, alle "obsolete"-Ordner auslassen
if [ -d data ]; then
  echo "Kopiere data/ nach dist/data (ohne obsolete/)..."
  mkdir -p dist/data
  rsync -av \
    --exclude 'obsolete/' \
    data/ dist/data/
else
  echo "Hinweis: Verzeichnis data/ existiert nicht, überspringe Kopie."
fi

# 6) fonts/ nach dist/fonts kopieren, alle "obsolete"-Ordner auslassen
if [ -d fonts ]; then
  echo "Kopiere fonts/ nach dist/fonts (ohne obsolete/)..."
  mkdir -p dist/fonts/
  rsync -av \
    --exclude 'obsolete/' \
    fonts/ dist/fonts/
else
  echo "Hinweis: Verzeichnis fonts/ existiert nicht, überspringe Kopie."
fi