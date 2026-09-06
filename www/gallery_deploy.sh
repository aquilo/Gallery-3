#!/bin/bash
set -euo pipefail

# 1) Erst build ausführen
# ./gallery_build.sh

# 2) Deploy-Ziel definieren (BITTE anpassen)
REMOTE_USER="mapresso"
REMOTE_HOST="sl16.web.hostpoint.ch"
REMOTE_PATH="/home/mapresso/www/gallery.mapresso.com/play/"

# 3) dist/ hochladen
echo "Deploy nach ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH} ..."
# 3) dist/ hochladen, mit sauberen Rechten
rsync -rtvz \
  --delete \
  --exclude '.DS_Store' \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  dist/ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"

# 4) index.html (und evtl. weitere Root-Dateien)
rsync -rtvz \
  --exclude '.DS_Store' \
  --chmod=Du=rw,Dgo=r \
  dist/index.html "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"
# 5) Dateirechte auf dem Server explizit korrigieren
#    (macOS liefert seit einigen Versionen "openrsync" statt echtem rsync
#    aus - das versteht die feinere Du=/Fu=-Klassensyntax von --chmod oben
#    nicht zuverlaessig, wodurch Dateien z.T. mit 600 statt 644 ankommen,
#    z.B. dist/js/pimcWorker.js -> 403 beim Laden im Browser. Daher hier
#    nochmal robust per SSH nachziehen, unabhaengig von der rsync-Variante.)
echo "Korrigiere Dateirechte auf dem Server..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "find '${REMOTE_PATH}' -type d -exec chmod 755 {} \; && find '${REMOTE_PATH}' -type f -exec chmod 644 {} \;"

echo "Fertig 🎉"
