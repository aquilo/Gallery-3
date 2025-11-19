# Build und Deploy von Gallery

Alles in www/

## Entwicklung
Entwickeln mit http://localhost:5503/www/index_dev.html. Falls Änderungen nicht nur im JavaScript-Teil gemacht werden: HTML auch in index.html an index_dev.html angleichen.

## Build
`./gallery_build.sh`

Damit werden JavaScript und css komprimiert und in index.html das    `<script src="app.XXXXX.js"></script>`
auf den aktuellen Zeitstempel angepasst.

## Deploy
`./gallery_deploy.sh`

## iPhone
Im alten Shortcut die Statistik und die Preferences exportieren.
In Safari: https://gallery.mapresso.com/play/?d=irgendeincode
Damit wird in Safari die aktuelle Version geladen. 
### Shortcut 
Neue Version auf dem Homescreen als Shortcut abspeichern und die alten Statistiken und Preferences wieder importieren.
####
legal.html vervollständigen und integrieren!