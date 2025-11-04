# starten aus www (cd www)

# 1) Dist-Ordner
mkdir -p dist

# 2) Alles zusammenziehen & minifizieren (ohne irgendwas zu installieren)
npx terser $(cat bundle-order.txt) -o dist/app.min.js -c -m

# 3) Version anhängen – Variante 1: Zeitstempel
STAMP=$(date +%Y%m%d%H%M%S)
cp dist/app.min.js "dist/app.$STAMP.js"

#   Alternative (statt Zeitstempel): kurzer Hash aus der Datei
# HASH=$(shasum -a 1 dist/app.min.js | cut -c1-8)
# cp dist/app.min.js "dist/app.$HASH.js"


<script src="/play/app.20250911xxxxxx.js"></script>

<script src="/play/app.min.js?v=20250911-1"></script>





# GallerySolitaire_processing
Core of GallerySolitaire game: processing.js

## Develop new Features (ab 2023)

Direkt im Directory www, dort "Go Live" und am Schluss ganzen Ordner als gallery.mapresso.com/play raufladen(?)
PROBLEM: Statistik geht verloren (Cache leeren via Einstellungen>Apps>Safari). Zuerst exportieren!

*.txt,.git,**/platforms/,*.css,*.json,*.map,**/ios/,**node_modules,obsolete,logs,

npm i @capacitor/status.bar

npx cap sync
npx cap open ios