# Gallery Solitaire

A browser-based solitaire variant: build a "gallery" of face cards (Jacks, Queens, Kings) across a 3×8 Foundation grid. Play a round in about 2 minutes — but it takes real thought to play well.

**[Play here »](https://gallery.mapresso.com/play/)**

## What makes it different

- **Computer-aided play (CAP)** — the game auto-plays all obvious/forced moves and always highlights which cards are currently playable. You focus purely on strategy, not busywork.
- **Instant skill feedback** — after every round, the game replays your exact same deal against a bot that plays randomly, many times over, and shows your score against that distribution. You immediately see how much your own thinking is worth versus blind clicking.
- **Persistent stats & rating** — results are saved per device (IndexedDB) and used to compute a rolling percentile/rating trend over time.

Originally released as a free iOS app; that version is discontinued, but development continues on the web.

## Tech stack

Plain static web app — no framework, no build-time bundler in dev. The game board is rendered on an HTML canvas via [p5.js](https://p5js.org) (global mode); Bootstrap 5 provides the surrounding UI chrome (nav, modals, forms). Statistics/history persist via IndexedDB, preferences via `localStorage`.

## Running locally

All source lives under `www/`.

```
cd www
# serve with any static file server, e.g. VS Code Live Server
# open index_dev.html
```

`index_dev.html` loads every JS/CSS file unbundled directly — no build step needed for development.

## Build & deploy

```
./gallery_build.sh    # bundles/minifies JS (terser) and CSS (csso) into dist/
./gallery_deploy.sh   # rsyncs dist/ to production (gallery.mapresso.com/play/)
```

Requires `npx terser` and `npx csso-cli`. Run the build before deploying.

## Project structure

```
www/          active source (game code, assets, dev + build files)
obsolete/     old Cordova/Capacitor iOS app shell — not maintained, don't build on it
```

## Links

- [Play](https://gallery.mapresso.com/play/)
- [Rules](https://gallery.mapresso.com/rules.php)
- [FAQ](https://gallery.mapresso.com/faq.php)
- [About](https://gallery.mapresso.com/about.php)

## Author

Adrian Herzog ([@adiherzog](https://vis.social/@adiherzog)) — maintaining this game since 1993.
