#!/bin/bash
# Deploy der Website (site/) in den Root von gallery.mapresso.com.
# Das Spiel unter /play/ deployt www/gallery_deploy.sh – dieses Skript fasst es nicht an.
#
#   ./site_deploy.sh -n   Trockenlauf: zeigt, was übertragen würde
#   ./site_deploy.sh      hochladen
#
# Bewusst OHNE --delete: Auf dem Server liegen neben site/ weitere Ordner
# (play/, play0/, _old/, jg/, applet.php), die hier nicht verwaltet werden.
set -euo pipefail
cd "$(dirname "$0")/site"

REMOTE="mapresso@sl16.web.hostpoint.ch"
REMOTE_PATH="/home/mapresso/www/gallery.mapresso.com"

DRY=()
[[ "${1:-}" == "-n" ]] && DRY=(--dry-run) && echo "Trockenlauf – es wird nichts übertragen."

rsync -rtvz "${DRY[@]}" \
  --exclude '.DS_Store' \
  --exclude '*.bak*' \
  --exclude '/play/' --exclude '/play0/' --exclude '/_old/' --exclude '/jg/' \
  ./ "${REMOTE}:${REMOTE_PATH}/"

[[ ${#DRY[@]} -gt 0 ]] && exit 0

# Rechte nur für die Dateien aus site/ setzen (macOS-openrsync setzt sie nicht
# zuverlässig, siehe www/gallery_deploy.sh). play/ usw. bleiben unberührt.
echo "Setze Dateirechte ..."
ssh "$REMOTE" "cd '$REMOTE_PATH' && chmod 644 *.php .htaccess sitemap.xml *.txt \
  && find _assets -type d -exec chmod 755 {} + && find _assets -type f -exec chmod 644 {} +"
echo "Fertig 🎉  Danach ggf.: indexnow.sh --all gallery.mapresso.com"
