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
