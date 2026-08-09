#!/bin/bash
set -euo pipefail

# 0) dist-Verzeichnis sicherstellen
mkdir -p dist

# 1) Alte app.*.js nach dist/old verschieben
mkdir -p dist/old
# Nur Dateien direkt in dist/ verschieben, nicht in Unterordnern
find dist -maxdepth 1 -type f -name 'app.*.js' -exec mv {} dist/old/ \;

# 1b) Rest von dist/ leeren (außer dist/old), damit sich kein alter/versehentlich
#     hineinkopierter Kram (z.B. fremde Ordner) über Builds hinweg ansammelt
find dist -mindepth 1 -maxdepth 1 ! -name 'old' -exec rm -rf {} +

STAMP=$(date +%Y%m%d%H%M%S)

# 2) JS zusammenziehen & minifizieren
KEEP="showSection,handleStatisticsFileSelect,openPreferencesFileDialog,allDraw"
npx terser $(cat bundle-order_js.txt) -o "dist/app.$STAMP.js" \
  --compress --mangle "reserved=[$KEEP]"

# 3) index.html aus index_dev.html generieren
#    - <!-- build:meta --> Block → manifest + theme-color
#    - <!-- build:css ... --> Block → ein <link> auf gallery.min.css
#    - <!-- build:js ... --> Block → ein <script> auf app.$STAMP.js
echo "Generiere dist/index.html aus index_dev.html..."
STAMP="$STAMP" python3 -c "
import re, os

stamp = os.environ['STAMP']

# Version + versionText aus galleryjs.js lesen
with open('js/galleryjs.js', 'r') as f:
    gjs = f.read()
m = re.search(r'let version\s*=\s*\"([^\"]+)\"', gjs)
version = m.group(1) if m else 'Version ?'
m2 = re.search(r'let versionText\s*=\s*\"([^\"]+)\"', gjs)
vtext = m2.group(1) if m2 else ''

# Datum in dd.mm.yyyy
from datetime import date
today = date.today().strftime('%d.%m.%Y')

with open('index_dev.html', 'r') as f:
    html = f.read()

# \$\$\$newversion\$\$\$ durch versionText ersetzen
html = html.replace('\$\$\$newversion\$\$\$', vtext)

# Version + Datum in der Infozeile ersetzen
html = re.sub(
    r'Version [^,]+,',
    version + ', ' + today + ',',
    html, count=1
)

# Replace build:meta block
html = re.sub(
    r'<!-- build:meta -->.*?<!-- endbuild -->',
    '  <link rel=\"manifest\" href=\"manifest.json\">\n  <meta name=\"theme-color\" content=\"#ffffff\">',
    html, flags=re.DOTALL
)

# Replace build:css block
html = re.sub(
    r'<!-- build:css (\S+) -->.*?<!-- endbuild -->',
    r'  <link rel=\"stylesheet\" href=\"\1\">',
    html, flags=re.DOTALL
)

# Replace build:js-head block (in <head>) with the bundled script tag
html = re.sub(
    r'<!-- build:js-head \S+ -->.*?<!-- endbuild -->',
    f'  <script src=\"app.{stamp}.js\"></script>',
    html, flags=re.DOTALL
)

# Remove build:js block (in <body>) — individual script tags no longer needed
html = re.sub(
    r'\n *<!-- build:js \S+ -->.*?<!-- endbuild -->\n',
    '',
    html, flags=re.DOTALL
)

with open('dist/index.html', 'w') as f:
    f.write(html)

# Persist the just-released changelog line into index_dev.html itself, so it
# isn't lost the next time \$\$\$newversion\$\$\$ gets replaced for a new release.
with open('index_dev.html', 'r') as f:
    dev_html = f.read()

marker = '\$\$\$newversion\$\$\$<br>'
if marker in dev_html and vtext and vtext not in dev_html:
    dev_html = dev_html.replace(marker, marker + '\n              ' + vtext + '<br>', 1)
    with open('index_dev.html', 'w') as f:
        f.write(dev_html)
    print('index_dev.html: changelog line for ' + version + ' persisted.')
"

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

# 7) worker.js separat kopieren (wird per new Worker() geladen, nicht gebündelt)
mkdir -p dist/js
cp js/worker.js dist/js/worker.js

echo "Build fertig: dist/app.$STAMP.js + dist/gallery.min.css + dist/index.html"
