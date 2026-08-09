# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gallery Solitaire — a browser-based solitaire card game (build a face-card "gallery" of Jacks, Queens, Kings across a 3×8 Foundation grid) with a CAP ("computer-aided play") assistant, a persistent per-device statistics/rating system, and light/dark appearance. Ships as a plain static web app (playable directly, e.g. via a live-server) and was historically also wrapped with Cordova for iOS (see `obsolete/`, no longer maintained).

All active source lives under `www/`. `obsolete/` contains the old Cordova/Capacitor app shell and is not part of the current product — don't build on it.

## Commands

All commands run from `www/`.

- **Develop**: serve `www/` with any static file server and open `index_dev.html` (e.g. VS Code Live Server on port 5503/5501, see `.vscode/settings.json`). There is no dev build step — `index_dev.html` loads every JS/CSS file unbundled directly from `js/`, `css/`, `libs/`.
- **Build**: `./gallery_build.sh` — bundles/minifies JS (terser) per `bundle-order_js.txt`, bundles/minifies CSS (csso) per `bundle-order_css.txt`, and generates `dist/index.html` from `index_dev.html` by replacing the `<!-- build:meta -->`, `<!-- build:css ... -->`, `<!-- build:js-head ... -->` and `<!-- build:js ... -->` marker comments. Also copies `data/` and `fonts/` into `dist/` (excluding `obsolete/` subfolders) and copies `js/worker.js` separately (loaded via `new Worker()`, not bundled). Requires `npx terser` and `npx csso-cli`.
- **Deploy**: `./gallery_deploy.sh` — rsyncs `dist/` to the production host (`gallery.mapresso.com/play/`). Run the build first; this script does not build for you. Deploying is a real, externally-visible action — confirm with the user before running it.
- **Tests / lint**: none configured. `js/package.json` is a leftover Cordova manifest (`npm test` is a stub); don't treat it as the project's real package manifest.

There is no bundler/transpiler in dev — code must run as plain browser `<script>` tags, in the exact load order given in `bundle-order_js.txt` / the `<!-- build:js -->` block of `index_dev.html`. When adding a new JS file, add it to **both** places, in the correct dependency position.

## Architecture

### Rendering: p5.js global-mode sketch
The game board, cards, and animations are drawn on an HTML canvas using p5.js in global mode. `js/galleryjs.js` defines the p5 lifecycle functions (`setup()`, `draw()`, `windowResized()`, `touchStarted()`) and owns most cross-cutting global state (board geometry constants, `allPiles`, `cards`, current game flags, etc. — declared as top-of-file `let`s). `js/graphparams.js` (`setGraphParams()`, `detectDevice()`) computes the responsive layout (pile positions, card size, font sizes) from the current window size/device and feeds the globals `galleryjs.js` reads.

### Game model
- `Card` (`Card.js`): a single card (suit/rank/id + three image variants for its visual states).
- `CardPile` (`CardPile.js`): base class for all piles, with the movability/auto-move rule engine (`doOkCheck`, `doMovableCheck`, `doAutoMovableCheck` and the `checkXxx` heuristics that decide when CAP auto-plays a card, e.g. twin-already-ok, row-clean, only-one-movable, twin-jammed, etc.).
- `FoundationPile`, `TableauPile`, `StockPile`, `AcePile` (`SpecialCardPiles.js`): subclasses of `CardPile` for the 24 Foundation piles (3 rows × 8 columns, building by suit in steps of 3: 2-5-8-J / 3-6-9-Q / 4-7-10-K), the 8 Tableau piles, the Stock, and the Ace pile.
- `MoveStack` / `Move` (`MoveStack.js`): records moves for undo (undo only works back to the last Stock deal; Stock deals themselves cannot be undone).
- `Mover` / `MoverCollection` (`Movers.js`): drives the animated transition of a card from one pile to another.
- `Button` (`Button.js`): simple canvas-drawn button widget used for New/Undo/Redo/Evaluate etc.
- `My.js`: grab-bag of small utilities (`Os` class for on-screen/offscreen buffering helpers, array init helpers, random helpers, translation lookup, text drawing helpers).

### Statistics, rating, and persistence
- `js/newstatisticsdb.js` is the active statistics layer: defines the JsStore/IndexedDB schema (`getDbSchema()`, table `STAT`), computes derived indicators (`calcIndicators`), rebuilds the "fever" trend from historical results (`rebuildFeverFromResults`), and handles CSV export/import and preferences export/import (`statsToCsv`, `exportPreferences`/`importPreferences`, drag-drop/file-picker handlers). `js/statisticsdb.js` is an **older, superseded** implementation (WebSQL-era) kept for reference only — it is not in `bundle-order_js.txt` / not loaded by `index_dev.html`; don't extend it.
- `js/rating.js` computes the player rating/percentile indicators (`computeIndicators`, `computeRatings`, EWMA-based rolling percentile) from raw game results.
- `js/FeverCurve.js` renders the rolling "better-or-equal %" trend graph shown under the last-games strip.
- `js/Statistics.js` (`Statistics` class) owns the Statistics tab: the evaluation-run visualization (simulating games and showing a colored square per simulated result — blue/white/red/dark-red/light-gray per the legend in `index_dev.html`), the histogram, and the summary text.
- Persistence is split: **statistics** (game history) go through JsStore/IndexedDB (`newstatisticsdb.js`); **preferences** (settings like animation speed, CAP toggles, 4-color mode, appearance) go through `localStorage` via `js/prefs.js` (`get1Pref`/`set1Pref`/`getAllPrefs`/`setAllPrefs`, all backed by `global_*` variables).

### UI shell
`index_dev.html` (dev) / generated `dist/index.html` (prod) is a single page with four `<section>`s toggled by `showSection()` (`js/start.js`): Play (the p5 canvas), Statistics, Rules, Options. Bootstrap 5 + Bootstrap Icons provide the chrome/nav/modals/forms; the actual game board is exclusively the p5 canvas, not DOM. Appearance (light/dark/system) is applied via `updateNightMode()` in `prefs.js`, driven by a `appearanceMode` radio group in Options plus `window.matchMedia("(prefers-color-scheme: dark)")`.

### Versioning
The visible app version and changelog text live in `js/galleryjs.js` as `let version = "..."` and `let versionText = "..."`. The build script reads these to stamp `dist/index.html`; the Options tab's "Version History" list in `index_dev.html` is maintained by hand and should be updated alongside `version`/`versionText` when cutting a release.

## Conventions in this codebase

- Vanilla ES6 classes and global `let`/`var` state, no modules/imports and no framework beyond p5.js/Bootstrap/jQuery-slim — keep new code consistent with that (no ESM `import`/`export`, no build-time-only syntax).
- Some identifiers and comments are German (this is a Swiss project); don't be surprised by mixed-language comments, and matching that convention in code you touch is fine but not required.
- `data/photos`, `libs/`, `csslib/` are gitignored (large/vendored assets) — don't assume they're absent just because `git status`/`find` doesn't show them as tracked.
