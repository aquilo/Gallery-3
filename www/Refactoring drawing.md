Absolutely—your draw flow will get way easier if you stop “if-ing” your way through phases and instead make the game a tiny state machine with clean update/render hooks and layered canvases.

Below is a drop-in refactor that:

1. Centralizes “what to do now” into explicit STATES
2. Splits **update** (logic) from **render** (drawing)
3. Uses **layers** (p5.Graphics) so the board only re-renders when invalidated (replacing `dirty/mustDraw/osp` soup)
4. Routes mouse/keys to the active state, not everywhere

You can keep your existing helpers (`allPiles[i].draw()`, `doAllAceMoves()`, etc.) and just plug them into the new structure.

---

# 1) Minimal state machine + layer setup

```js
// ---------- States
const STATES = {
  LOADING: 'LOADING',
  INTRO: 'INTRO',          // your windrawloop fade-in photo
  PLAYING: 'PLAYING',
  EVALUATING: 'EVALUATING',
  RESULTS: 'RESULTS'       // after evaluation finished
};

let G = {
  state: STATES.LOADING,
  // timing
  dt: 0, lastMillis: 0,
  // game flags moved here
  human: true,
  evaluated: false,
  evaluationFinished: false,
  // render invalidation flags
  invalidateBoard: true,     // re-render board layer?
  invalidateHUD: true,       // re-render HUD/overlay?
  // layers
  L: { bg:null, board:null, hud:null },
  // cached metrics
  w: 0, h: 0, scale: 1,
};

// ---------- Layered renderer
function makeLayers(w, h) {
  G.L.bg    = createGraphics(w, h);
  G.L.board = createGraphics(w, h);
  G.L.hud   = createGraphics(w, h);
}

// Call this whenever window/canvas changes
function layoutAndLayers() {
  canvasInit(); // your function sets WIDTH0/HEIGHT0/scaleFactor etc.
  resizeCanvas(scaleFactor * WIDTH0, scaleFactor * HEIGHT0);
  G.w = width; G.h = height; G.scale = scaleFactor;
  makeLayers(G.w, G.h);
  invalidateAll();
}

function invalidateAll() {
  G.invalidateBoard = true;
  G.invalidateHUD = true;
}
```

---

# 2) One update + one draw per frame

```js
function setup() {
  // ... your preload side-effects can stay
  canvasInit();
  createCanvas(scaleFactor * WIDTH0, scaleFactor * HEIGHT0);
  layoutAndLayers();

  // init your data structures
  statistics = new Statistics();
  moveStack = new MoveStack(104);
  // cards, piles, buttons, fever, images ... keep as-is

  newGame();         // fills piles etc.
  enterIntro();      // start with intro state
}

function draw() {
  // time step
  const now = millis();
  G.dt = (now - G.lastMillis) / 1000 || 0.016;
  G.lastMillis = now;

  // 1) UPDATE (pure logic)
  updateState(G.dt);

  // 2) RENDER (only touched layers)
  renderState();

  // Composite layers once per frame
  clear();
  image(G.L.bg,    0, 0);
  image(G.L.board, 0, 0);
  image(G.L.hud,   0, 0);
}
```

---

# 3) State handlers (no sprawling if/else)

```js
function updateState(dt) {
  switch (G.state) {
    case STATES.LOADING:
      // If you actually load async assets, wait here; else skip
      transitionTo(STATES.INTRO);
      break;

    case STATES.INTRO:
      updateIntro(dt);   // handles windrawloop fade-in
      break;

    case STATES.PLAYING:
      updatePlaying(dt);
      break;

    case STATES.EVALUATING:
      updateEvaluating(dt);
      break;

    case STATES.RESULTS:
      // idle; maybe animate fever curve
      break;
  }
}

function renderState() {
  // background rarely changes; draw once at entry or resize
  // G.L.bg is static unless layout changes

  if (G.invalidateBoard) {
    renderBoardLayer(G.L.board);      // cards, piles, lastGames thumb, etc.
    G.invalidateBoard = false;
  }

  if (G.invalidateHUD) {
    renderHudLayer(G.L.hud);          // buttons, progress, overlays, texts
    G.invalidateHUD = false;
  }
}

function transitionTo(next) {
  // on-exit (optional)
  if (G.state === STATES.EVALUATING) {
    // e.g., stop evaluator worker, finalize
  }

  G.state = next;

  // on-enter
  switch (next) {
    case STATES.INTRO:    enterIntro(); break;
    case STATES.PLAYING:  enterPlaying(); break;
    case STATES.EVALUATING: enterEvaluating(); break;
    case STATES.RESULTS:  enterResults(); break;
  }

  invalidateAll();
}
```

---

# 4) Implement each state, using your existing helpers

### INTRO (your photo fade sequence)

```js
let intro = { step:0, stepsMax:5, currentImg:-1 };

function enterIntro() {
  intro.step = 0;
  intro.currentImg = morerandom(bimg.length, randbuffer);
  randbuffer = addlast(intro.currentImg, randbuffer);
  windrawloop = 0; // keep if you like, but localize
  transitionTo(STATES.PLAYING); // if you prefer super quick intro
  // Or keep a brief fade:
  // invalidateAll();
}

function updateIntro(dt) {
  windrawloop++;
  if (windrawloop >= intro.stepsMax) {
    transitionTo(STATES.PLAYING);
  } else {
    G.invalidateBoard = true;
    G.invalidateHUD = true;
  }
}
```

### PLAYING

```js
function enterPlaying() {
  G.human = true;
  G.evaluated = false;
  evaluationfinished = false;
  // Setup per-hand UI, reset overlays
  invalidateAll();
}

function updatePlaying(dt) {
  // Move animations
  const hadActive = moverCollection.isOneActive();
  const nActive = moverCollection.draw(); // your function draws moving cards
  if (hadActive && nActive === 0) {
    // animation finished -> board changed
    G.invalidateBoard = true;
  }

  // Auto logic that used to be sprinkled in draw():
  doAllAceMoves();
  allOkChecks();
  setCardsOK();
  allMovableChecks();
  allAutoMovableChecks();
  allDangerCheck();
  if (G.human) allJamChecks();

  // Resolve automoves immediately if allowed
  const didAuto = tryAutoMovesOnce();
  if (didAuto) {
    G.invalidateBoard = true;
    return;
  }

  // Check finished?
  const res = getResult();
  const finished = stockPile.empty() && !cardMoving() && noMovables();
  if (finished && G.human) {
    resPlayer = res;
    G.invalidateHUD = true;
  }
}

function tryAutoMovesOnce() {
  for (let i = 0; i < 34; i++) {
    if (allPiles[i].autoMovable) {
      if (!G.human || (global_sayAuto == 0 && global_auto == 1)) {
        allPiles[i].doAutoClick();
        return true;
      }
    }
  }
  return false;
}
```

### EVALUATING (tight loop in steps)

```js
let evalCtx = { total:0, done:0, startedAt:0 };

function enterEvaluating() {
  G.human = false;
  evaluating = true;
  evalCtx.total += global_evaluations;
  evalCtx.startedAt = millis();
  G.invalidateHUD = true;
}

function updateEvaluating(dt) {
  const step = Math.min(NEVALUATIONSTEP, evalCtx.total - evalCtx.done);
  for (let i = 0; i < step; i++) statistics.add(evalGame(alfa));
  evalCtx.done += step;

  // progress bar layer only
  G.invalidateHUD = true;

  if (evalCtx.done >= evalCtx.total) {
    evaluating = false;
    evaluated = true;
    G.evaluated = true;
    evaltime = My.round2String((millis() - evalCtx.startedAt) / 1000.0, 3) + " sec";
    statistics.doStatistics();
    statistics.saveResultat(alfa, gameStart);
    // prepare lastGames image etc.
    G.invalidateBoard = true;
    G.invalidateHUD = true;
    transitionTo(STATES.RESULTS);
  }
}
```

### RESULTS

```js
function enterResults() {
  // Fever curve etc.
  // Keep rendering onto HUD or its own layer
  G.invalidateHUD = true;
}
```

---

# 5) Rendering split: board vs HUD

```js
function renderBoardLayer(g) {
  g.push();
  g.clear();
  g.scale(G.scale);
  g.background(248);

  // table area
  g.fill(255); g.stroke(255);
  g.rect(0, ifact * 320, widthNew, 670);
  g.stroke(224);
  g.line(0, ifact * 320, widthNew, ifact * 320);
  g.stroke(0);

  // piles
  for (let i = 0; i < 34; i++) allPiles[i].drawTo(g); // add a .drawTo(graphics) that uses 'g' instead of global drawing, or temporarily set a global ref

  // lastGames strip
  g.image(lastGames, 0, YLASTGAMES);

  g.pop();
}

function renderHudLayer(g) {
  g.push();
  g.clear();
  g.scale(G.scale);

  // Buttons
  btnUndo.draw(moveStack.nMoves > 0 && getResult() != 0);
  btnNew.draw((!gameFinished && stockPile.nCards > 32) || evaluated);
  btnRedo.draw(evaluated);
  btnEvaluate.draw(gameFinished);

  // Progress / evaluation
  if (G.state === STATES.EVALUATING) {
    drawProgress(evalCtx.done, evalCtx.total); // keep your function; make it draw into g or use global drawing bound to HUD layer
  }

  // Text HUD (result number in center etc.)
  textFont(myFontRegular, F18);
  fill(0); stroke(0);
  textAlign(CENTER, CENTER);
  text(getResult() + "", 320, YRES - 52);

  // Overlays (help arrows, jam shade)
  if (global_helplevel == 9 || global_helplevel == 10) {
    for (let i = 0; i < 34; i++) allPiles[i].drawArrowTo(g);
  }

  // Results screen bits
  if (G.state === STATES.RESULTS) {
    // e.g., fever curve
    fever.drawTo(g);
  }

  g.pop();
}
```

> **Note:** To keep your class code unchanged, you can temporarily set a global “current graphics” and have your existing `draw()` methods use it. Cleanest is to add `drawTo(g)` variants (as shown) and route both.

---

# 6) Input routing (mouse/keys) to the active state

```js
function mouseClicked() {
  const x = mouseX / G.scale;
  const y = mouseY / G.scale;

  switch (G.state) {
    case STATES.INTRO:
      transitionTo(STATES.PLAYING);
      break;

    case STATES.PLAYING:
      if (btnEvaluate.includes(x,y)) { transitionTo(STATES.EVALUATING); return; }
      if (btnNew.includes(x,y))      { newGame(); transitionTo(STATES.PLAYING); return; }
      if (btnRedo.includes(x,y))     { redoGame(); transitionTo(STATES.PLAYING); return; }
      if (btnUndo.includes(x,y))     { doUndoClick(); return; }

      // Route to piles
      for (let i = 0; i < 34; i++) if (allPiles[i].includes(x, y)) allPiles[i].doClick();
      G.invalidateBoard = true;
      G.invalidateHUD = true;
      break;

    case STATES.EVALUATING:
      // ignore clicks during evaluation, or allow cancel
      break;

    case STATES.RESULTS:
      // tap to continue to a fresh game:
      transitionTo(STATES.PLAYING);
      break;
  }
}

function keyPressed() {
  if (key === 'f' || key === 'F') { finishGame(); G.human = true; G.invalidateBoard = true; }
  if (key === 'd' || key === 'D') { G.invalidateBoard = true; }
  if (key === 'z' || key === 'Z') { zeitAuswertungen(); }
  // etc. — keep shortcuts but avoid changing state implicitly
}
```

---

# 7) Small but high-impact cleanups

* **Replace global booleans** with state:

  * `evaluating` → `G.state === STATES.EVALUATING`
  * `evaluationfinished` / `evaluated` → roll into state + `G.evaluated`
  * `humanPlayer` → `G.human`
  * `mustDraw/dirty/osp` → `G.invalidateBoard`/`G.invalidateHUD`

* **Keep the offscreen “board snapshot” optimization**, but confine it to `renderBoardLayer()` and flip `G.invalidateBoard=true` whenever:

  * a card moves/animation ends,
  * piles change,
  * layout changes,
  * new game/redo.

* **Separate board vs. HUD**: things like progress bars, buttons, texts go to HUD; cards and lastGames strip to BOARD.

* **Make transitions explicit**: Only `transitionTo()` changes `G.state`. That makes “what happens now” obvious and kills accidental cross-state side effects.

---

If you like, I can adapt a few of your classes (`Pile.draw()` → `drawTo(g)`, `fever.draw()` → `drawTo(g)`) so you can paste with minimal edits.
