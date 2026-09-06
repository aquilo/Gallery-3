// import java.util.Date;
// galleryjs -------------------------------------------------------------

// @pjs font="resources/data/helveticaneueultralight.ttf"; 

// Todo: OkChecks gleich beim Zug abhaken
// evaluation quasi parallel?
// auswertung bis die anzahl unterschiedlicher resultate lange nicht mehr ändert
// hover: erklärung zu einer karte
// zusätzlicher automove: twin  jammed
// links aussen j auf 5 nicht als jam!
// rechts aussen: tableau von klick auf stack mitbetroffen
// schnell und häufiges new: unklare situation

// Constants, defaults

// --------------------------------------------------------------
// top left of Foundation, Tableau, Aces, Stock
let isApp = false;
let jsstoreCon;

let version = "Version 3.2";
let versionText = "06.09.2026, 3.2: First version with a AI evaluation (PIMC) in the background";
let device = "";
let mymsg;
let XSF, YSF, XST, YST, XSA, YSA, XSS, YSS;
let DXSF, DYSF, DXST, DYST, DXSA, DYSA, DXSS, DYSS;
let FACT;
let CARDwidthNew, CARDHEIGHT;

let XRIGHT;
let YBASE = 640;
let WIDTH0 = window.innerWidth - 5;
let HEIGHT0 = window.innerHeight - 5;
let scaleFactor = 1;
let XSTAT, YSTAT, XHISTO, YHISTO, XGRAPH, XRES, YRES;
let XBN, YBN, XBU, YBU, XBE, YBE, XBF, YBF;
let WBN, HBN, WBU, HBU, WBE, HBE, WBF, HBF;
let XMSG, YMSG, DXMSG;
let XBUTTONS, DYBUTTON;
let YPROGRESS, DYPROGRESS;
let BUTTONSMALLHEIGHT;
let WINDRAWSTART;
let NEVALUATIONS = 1000;
let nEvaluationsEnd = 0;
let NEVALUATIONSTEP = 10;
let BLUECIRCLERADIUS;
let YLASTGAMES = 800;
let nrbox;
let F8, F9, F10, F11, F12, F13, F14, F16, F18, F24;
let alfa = 0.99;
let debug = true;
let LANG = "en";
let withNewCards = true;
let retina = true;
let evaluationfinished = false;
let statsRevealed = false;
let redoing = false;
// true from New/Redo until their deal animation settles, so a rapid second
// click on New/Redo can't fire mid-deal (see doMove()); NOT tied to every
// in-game move, that caused visible button flicker during normal play.
let dealBusy = false;
// Set by sayAutoReason() when it shows a reason; forces one more frame (see
// its use in the `dirty = cardMoving() || ...` line in draw()) so the
// drawAutoMovable() highlight - only picked up by the next mustDraw rebuild -
// reliably catches up with the label, instead of possibly waiting for some
// unrelated later redraw (e.g. the next card move).
let needsHighlightRedraw = false;
// --------------------------------------------------------------

let ndraw = 0;
let dirty = true;
let undoing = false;

let winfrom, winto, lostfrom, lostto;

let allCards, newCards, bgImg, numbcol;
let cardImages = new Array();
let suitImages = new Array();
let numberImages = new Array();
let bimg = new Array();
let lastGames;

let offScreen;
let lastGamesScreen;
let imgNow;
let windrawloop;
let canvasPositionX = 0;
let canvasPositionY = 0;

let allPiles = new Array(34);
let foundationPile = new Array();
let tableau = new Array();
let stockPile;
let acePile;

let moverCollection;
let statistics;
let oneMoving = false;

let res;
let resPlayer;
let nMovesStat = 0;
let nAutoMovesStat = 0;
let nAutoMoves = 0;
let gameFinished = false;
let mustDraw = true;
let osp = true; // offscreen painting
let btnEvaluate, btnNew, btnRedo, btnUndo; //, btnAuto;
let humanPlayer = true;
let nrMovable = new Array(32);
let moveStack;
let explain = "";
let TEXTCOLOR, col_resulttext;
let gameStart;
let timerstart;

let cards = new Array(104);

let randbuffer = new Array();

let nEvals0 = 0;
let nEvalsEnd0 = 0;

let nrEval = 0;
let evaluating = false;
let evaluated = false;
let evaltime = 0;

// --- Prototyp: Hintergrund-Auswertung waehrend der Mensch spielt ------
// (js/pimcWorker.js, Web Worker) - siehe startBackgroundEvaluation() und
// die Anpassung in doEvaluation() weiter unten. Rein additiv: faellt bei
// jedem Problem (Worker nicht verfuegbar, noch nicht fertig, dealOrder
// stimmt nicht ueberein) automatisch auf den bisherigen, synchronen Weg
// (evalGame()) zurueck - kein Verhalten geht verloren.
let bgEvalWorker = null;
let bgEvalResult = null;   // { type:'done', dealOrder, scores, mean, median, minimum, maximum, elapsedMs }
let bgEvalIndex = 0;

function startBackgroundEvaluation(dealOrder, alphanow) {
  bgEvalResult = null;
  bgEvalIndex = 0;
  if (bgEvalWorker) {
    try { bgEvalWorker.terminate(); } catch (e) { /* ignore */ }
    bgEvalWorker = null;
  }
  if (typeof Worker === "undefined") return; // z.B. sehr alter Browser
  try {
    bgEvalWorker = new Worker("js/pimcWorker.js");
    bgEvalWorker.onmessage = function (e) {
      if (e.data && e.data.type === "done" && e.data.dealOrder === dealOrder) {
        bgEvalResult = e.data;
        console.log("[bgEval] Hintergrund-Auswertung fertig: mean=" + e.data.mean +
          " median=" + e.data.median + " minimum=" + e.data.minimum +
          " (" + e.data.elapsedMs + " ms, " + e.data.scores.length + " Versuche)" +
          (e.data.pimcScore !== undefined
            ? " | PIMC(k=" + e.data.pimcNumSamples + ") score=" + e.data.pimcScore +
              " (" + e.data.pimcElapsedMs + " ms, " + (e.data.pimcMoves ? e.data.pimcMoves.length : "?") +
              " Zuege, verifiziert=" + e.data.pimcMovesVerified + ")"
            : ""));
      }
    };
    bgEvalWorker.onerror = function (err) {
      My.print("Hintergrund-Auswertung fehlgeschlagen: " + (err && err.message));
      bgEvalWorker = null;
    };
    // alfa hier = Live-Konvention "Wahrscheinlichkeit, einen Zug zu versuchen"
    // (Default 0.99). pimcWorker.js erwartet die komplementaere Grosse
    // "Wahrscheinlichkeit fuer erzwungenes verfruehtes Stockdealen" - daher 1-alfa.
    bgEvalWorker.postMessage({
      dealOrder: dealOrder,
      n: global_evaluations,
      alpha: 1 - alphanow,
      // Prototyp "KI-Version": zusaetzlich einen PIMC-Durchlauf (k=160,
      // Greedy-Rollout - gleiche Parameter wie im Trainings-Repo
      // js/eval/analyze_real_games.js) im selben Hintergrund-Worker.
      pimc: { numSamples: 160, maxRolloutMoves: 300 },
    });
  } catch (e) {
    My.print("Hintergrund-Auswertung nicht verfuegbar: " + e.message);
    bgEvalWorker = null;
  }
}

let rescanvas = "";

let TWO;

let x1res, y1res, dx1res, dy1res;
let x2res, y2res, dx2res, dy2res, x2res0, y2res0;


let myFont;
let myFontRegular;
let successImages = "";
let serie = new Array(32);
let serie32 = new Array(32);
let os;
let drawNext = 0.0;
let dataPath = "";
let dataPathImg = "";
let dataPathPhotos = "";
let actualwidthNew;
let deviceFactor;
let translationStrings;
let dbLoaded = false;
let caption = new Array();
let cnv;
let degreesoffreedom = 0;
let resprev = 999;

let shortTxt = [
  "", "T ok", "2 poss", "F clean", "just 1", "T botm",
  "T row", "Tbelow", "T botm", "TuBase", "Tjammed","Tfinjam",""
];

let longTxt = [
  "", "Twin is already ok.", "There are two possibilities for this card.", "The foundation row is completely clean.", "At the end and only one card can be moved.", "Twin is at the bottom of the tableau (this card on foundation).", "Twin is on the same foundation row.", "Twin is under this card.", "Twin is at the bottom of the tableau (this card on tableau).", "Twin is directly under its own base.", "Twin is directly under its own base.", "Twin is finally jammed.", ""
];
let fever;

const BG_DAY = 248;
const BG_NIGHT = 25;
let canvasWasResized = false;

function preload() {
  // My.print("*** p5js: preload at " + new Date().toISOString());
  dataPath = "data/";
  dataPathImg = "data/img/";
  dataPathPhotos = "data/photos/";
  newCards = loadImage(dataPathImg + "newcards2025.png");
  numbcol = loadImage(dataPathImg + "numbersandcolors.png");
  // translationStrings = loadStrings(dataPath + "translations.txt");
  myFont = loadFont("data/sf-pro-text-light.ttf");
  myFontRegular = loadFont("data/sf-pro-text-regular.ttf");
  successImages = loadTable(dataPathPhotos + "photos.tsv", "tsv", "header");
  //  myFont = loadFont("data/Roboto-Light.ttf");
  // myFontRegular = loadFont("data/Roboto-Regular.ttf");
  // My.print("/preload: " + My.round2String(millis() / 1000.0, 3) + " sec");
}

function windowResized() {
  canvasInit();
  resizeCanvas(scaleFactor * WIDTH0, scaleFactor * HEIGHT0);
  console.log("Canvas: " + round(scaleFactor * WIDTH0) + " / " + round(scaleFactor * HEIGHT0));
  cnv.position(canvasPositionX, canvasPositionY);
  canvasWasResized = true;
  allDraw();
}

function canvasInit() {
  detectDevice();
  widthNew = WIDTH0;
  canvasPositionX = max(0, (windowWidth - widthNew) / 2);
  if (isApp) {
    canvasPositionY = 60;
  }
  actualwidthNew = min(screen.width, 640);
  deviceFactor = actualwidthNew / 320.0;
}

function setup() {
  // pixelDensity(2);
  My.print(version);
  My.print("setup: " + My.round2String(millis() / 1000.0, 3) + " sec");
  getAllPrefs();
  //TODO openTranslations(translationStrings);


  background(global_nightmode ? BG_NIGHT : BG_DAY);
  os = new Os();

  canvasInit();
  cnv = createCanvas(scaleFactor * WIDTH0, scaleFactor * HEIGHT0);
  console.log("Canvas: " + round(scaleFactor * WIDTH0) + " / " + round(scaleFactor * HEIGHT0));

  cnv.position(canvasPositionX, canvasPositionY);
  // background(255, 0, 200);
  background(global_nightmode ? BG_NIGHT : 255);

  // -------
  statistics = new Statistics();
  moveStack = new MoveStack(104);

  textFont(myFont, F12);

  let n = 0;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 13; j++) {
      cards[n] = new Card(i, j + 1, n, cardImages[0][i][j], cardImages[1][i][j], cardImages[2][i][j]);
      n++;
      cards[n] = new Card(i, j + 1, n, cardImages[0][i][j], cardImages[1][i][j], cardImages[2][i][j]);
      n++;
    }
  }

  foundationPile = initialize2DArray(3, 8, "");
  allPiles[0] = stockPile = new StockPile(XSS, YSS - 30, 0, 104);
  allPiles[1] = acePile = new AcePile(XSF + 3.5 * DXSF, -500, 1, 8);
  let j = 2;
  for (let i = 0; i < 8; i++)
    allPiles[j++] = foundationPile[2][i] =
    new FoundationPile(XSF + DXSF * i, YSF, j - 1, 4, 2);
  for (let i = 0; i < 8; i++)
    allPiles[j++] = foundationPile[0][i] =
    new FoundationPile(XSF + DXSF * i, YSF + DYSF, j - 1, 4, 3);
  for (let i = 0; i < 8; i++)
    allPiles[j++] = foundationPile[1][i] =
    new FoundationPile(XSF + DXSF * i, YSF + 2 * DYSF, j - 1, 4, 4);
  for (let i = 0; i < 8; i++)
    allPiles[j++] = tableau[i] =
    new TableauPile(XST + DXSF * i, YST, j - 1, 10);

  let menustart = 10;
  let ybtns = YRES + 22;
  btnNew = new Button(getTranslation(LANG, "New"), menustart, ybtns, WBN, HBN, 1);
  btnRedo = new Button(getTranslation(LANG, "Redo"), menustart + TWO * 70, ybtns, WBU, HBU, 1);
  btnUndo = new Button(getTranslation(LANG, "Undo"), menustart + TWO * 70, ybtns, WBU, HBU, 1);
  btnEvaluate = new Button(getTranslation(LANG, "Evaluate"), 265, YRES - 9, WBF, HBF, 1);

  for (let i = 2; i < 34; i++) {
    serie[i - 2] = i;
    serie32[i - 2] = i;
  }

  moverCollection = new MoverCollection();

  bimg = new Array(successImages.getRowCount());

  for (let i = 0; i < successImages.getRowCount(); i++) {
    let sarr = successImages.getRow(i).arr;
    bimg[i] = loadImage(dataPathPhotos + sarr[0] + ".png");
    caption[i] = sarr[1];
  }

  randbuffer = new Array(int(bimg.length / 2));
  for (let i = 0; i < randbuffer.length; i++) {
    randbuffer[i] = -1;
  }
  if (global_resimg == '---' || global_resimg == 0 || global_resimg == "0") {
    lastGames = loadImage(dataPathImg + "emptyLastGames.png");
  } else {
    lastGames = loadImage(global_resimg);
  }
  rescanvas = createGraphics(640, 32);
  rescanvas.image(lastGames, 0, 0);

  statistics.statisticsgraphinit();

  newGame();
  My.print("processing end setup: " + My.round2String(millis() / 1000.0, 3) + " sec");
  smooth();

  jsstoreCon = new JsStore.Connection();
  doStatTable();
  initDb();
  loop();
  // My.print("/setup: " + My.round2String(millis() / 1000.0, 3) + " sec");

 // fever = new FeverCurve(this, menustart + TWO * 91, YRES - TWO * 30 + TWO * 9, TWO * 223, TWO * 64, {
  fever = new FeverCurve(this, 0, YLASTGAMES + 42, widthNew, 150, {
    window: 200, // letzte N Punkte
    padPct: 0.05, // Headroom
    smooth: 0.4, // Skalen-Easing 04
    title: "Besser oder gleich (EWMA %)",
  });
}

function drawE() {
  btnUndo.draw(false);
  fill(255);
  rect(XRES - 20, YRES - 20, 40, 40)
  statistics.drawEvaluationLegend(resPlayer, YRES - TWO * 30);
  textFont(myFont, F14);
  fill(color(0));
  stroke(color(0));
  let jx = max(min(resPlayer, 93), 2);
  jx = 3 + jx * TWO * 10 / 3;
  textC(resPlayer + "", jx, YRES - TWO * 10);
}

function doEvaluation(n, alfa) {
  humanPlayer = false;
  evaluating = true;
  stroke(0);
  const bgReady = bgEvalResult &&
    bgEvalResult.dealOrder === window.currentDealOrder &&
    Array.isArray(bgEvalResult.scores);
  for (let i = 0; i < n; i++) {
    //btnNew.draw(false);
    //btnRedo.draw(false);
    let resultat;
    if (bgReady && bgEvalIndex < bgEvalResult.scores.length) {
      // Bereits im Hintergrund berechnet (s. startBackgroundEvaluation) -
      // gleiche Animation/Timing wie bisher, nur ohne die Rechenzeit.
      resultat = bgEvalResult.scores[bgEvalIndex++];
    } else {
      resultat = evalGame(alfa);
    }
    statistics.add(resultat);
  }
    setTimeout(() => redraw(), 0);

}

function finalizeEvaluation() {
  statistics.doStatistics();

  evaluating = false;
  evaluated = true;
  evaluationfinished = true;
  statsRevealed = false;

  statistics.saveResultat(alfa, gameStart);

  mustDraw = true;
  dirty = true;
  redraw();
  loop();
}

function draw() {
  scale(scaleFactor);
  if (evaluating) {
    doEvaluation(NEVALUATIONSTEP, alfa);
    nrEval += NEVALUATIONSTEP;
    nEvals0 += NEVALUATIONSTEP;
    drawProgress(nEvals0, nEvalsEnd0);
    if (nrEval >= nEvaluationsEnd) {
      evaltime = My.round2String((millis() - timerstart) / 1000.0, 3) + " sec";
      My.print(evaltime);
      // statistics.doStatistics();
      //statistics.saveResultat(alfa, gameStart);
      // Ensure fever curve is drawn with final statistics
      finalizeEvaluation();
      drawProgress(-1, nEvalsEnd0);
      nEvalsEnd0 = 0;
      nEvals0 = 0;
      //evaluating = false;
      //evaluated = true;
    }
    evaluationfinished = true;
    return;
  }

  if (getResult() == 0 && humanPlayer) {
    let nloops = 5;
    if (windrawloop > nloops) {
      return;
    }
    if (windrawloop < 0) {
      windrawloop = 1;
      imgNow = morerandom(bimg.length, randbuffer);
      randbuffer = addlast(imgNow, randbuffer);
      res = getResult();
      gameFinished = stockPile.empty() && !cardMoving() && noMovables();
      if (gameFinished && humanPlayer) {
        resPlayer = res;
      }
      allDraw();
    }
    windrawloop++;
    tint(255, round(map(windrawloop, 0, nloops, 50, 255)));
    if (windrawloop == nloops) {
      fill(50, 0, 0);
      stroke(50, 0, 0);
      textFont(myFont, F8);
      textR(caption[imgNow], TWO * 316, TWO * 329);
      noTint();
    }

    image(bimg[imgNow], 0, 0, 640, 640);
    noTint();
    return;
  }
  drawGrid();

  if (!dirty) noLoop();
  if (!dirty) return;

  allDraw();
  doAllAceMoves();
  allOkChecks();
  setCardsOK();
  allMovableChecks();
  allAutoMovableChecks();
  allDangerCheck();
  if (humanPlayer) allJamChecks();

  res = getResult();

  gameFinished = stockPile.empty() && !cardMoving() && noMovables();
  // Game finished
  if (gameFinished && humanPlayer) {
    resPlayer = res;
  }

  dirty = cardMoving() || needsHighlightRedraw;
  needsHighlightRedraw = false;
  if (dirty) loop();
  drawGrid();

  for (let i = 0; i < 34; i++) {
    if (allPiles[i].autoMovable) {
      if (!humanPlayer || (global_sayAuto == 0 && global_auto == 1)) {
        allPiles[i].doAutoClick();
        dirty = true;
      }
      return;
    }
  }
  // Reached only when this frame found no pending auto-move and nothing is
  // animating: the post-deal cascade (deal + auto-moves like aces-out) has
  // truly settled, so New/Redo/Undo/Evaluate can safely re-enable.
  if (dealBusy && !cardMoving()) dealBusy = false;
  allDraw();
  drawGrid();

  if (!dirty) {

    let nnn = 0;
    for (let i = 0; i < 34; i++) {
      if (allPiles[i].movable) {
        nnn++;
      }
    }
    // as Degrees of Freedom we don't add the stockpile
    // if (stockPile.nCards > 0) {
    //   nnn++;
    // }
    if (res <= resprev)
      degreesoffreedom += nnn;
    resprev = res;
  }
}

function drawGrid() {
  return;
  // stroke(120);
  // for (let i = 0; i < 80; i++) {
  //   line(0, 20 * i, 640, 20 * i);

  //   for (let j = 0; j < 64; j++) {
  //     line(20 * j, 0, 20 * j, 1000);
  //   }
  // }
}

function evalGame(alphanow) {
  initLayout();
  doAllAceMoves();
  allOkChecks();
  while (!stockPile.empty()) {
    while (tryToMove(alphanow)) {}
    moveStock2Tableau();
    doAllAceMoves();
    allOkChecks();
  }
  while (tryToMove(2.0)) {}
  return getResult();
}

function finishGame() {
  humanPlayer = false;
  doAllAceMoves();
  allOkChecks();
  while (!stockPile.empty()) {
    while (tryToMove(2.0)) {}
    moveStock2Tableau();
    doAllAceMoves();
    allOkChecks();
  }
  while (tryToMove(2.0)) {}
  humanPlayer = true;
  resPlayer = getResult();
  gameFinished = true;
  allDraw();

  redraw();
  loop();
}

function tryToMove(alfa) {
  if (random(1) > alfa) return false;
  for (let i = 31; i >= 0; i--) {
    let j = int(random(i));
    let k = serie32[j];
    serie32[j] = serie32[i];
    serie32[i] = k;
    allPiles[k].doMovableCheck();
    if (allPiles[k].movable) {
      // My.print(k, allPiles[k].kind, allPiles[k].ziel.kind);
      doEvalMove2(allPiles[k], allPiles[k].ziel);
      return true;
    }
  }
  return false;
}

function doEvalMove(k) {
  let to = allPiles[k].ziel;
  to.push(allPiles[k].pop());
  to.ok = true;
}

function doEvalMove2(from, to) {
  to.push(from.pop());
  to.ok = true;
}

function doMove(from, to, auto) {
  if (humanPlayer) {
    moverCollection.start(from, to, auto, global_steps);
  } else {
    to.push(from.pop());
  }
}

function shuffle32() {
  for (let i = 31; i >= 0; i--) {
    let j = int(random(i));
    let k = serie[j];
    serie[j] = serie[i];
    serie[i] = k;
  }
}

function getResult() {
  if (!allPiles[2]) {
    My.print("getresult");
    return 999;
  }
  res = 96;
  for (let i = 2; i < 26; i++) {
    res -= allPiles[i].nOk();
  }
  return res;
}

function allOkChecks() {
  for (let i = 2; i < 34; i++) {
    if (!allPiles[i].ok)
      allPiles[i].doOkCheck();
  }
}

function setCardsOK() {
  // console.log("setCardsOK");
  for (let i = 2; i < 26; i++) {
    if (allPiles[i].ok) {
      for (let j = 0; j < allPiles[i].nCards; j++) {
        if (!allPiles[i].cards[j].ok) {
          allPiles[i].cards[j].ok = true;
          // console.log(i + " " + j + " " + allPiles[i].cards[j] + " now ok");
        }
      }
    }
  }
}

function fillBelowJam(i) {
  // console.log("fillBelowJam " + i);
  let newFilled = false;
  let someJam = false;
  for (let j = allPiles[i].nCards - 1; j >= 0; j--) {
    if (allPiles[i].cards[j].jamFinal || someJam) {
      someJam = true;
      if (!allPiles[i].cards[j].jamFinal) {
        //console.log(i + " " + j + " " + allPiles[i].cards[j] + " also dead (fillBelowJam)");
        allPiles[i].checkCoverer(allPiles[i].cards[j]);
        newFilled = true;
        if (!someJam) {
          // console.log(i + " " + j + " " + allPiles[i].cards[j] + " also dead");
        }
      }
    }
  }
  return newFilled;
}

function canCovered(tc, sc) {
  if (tc.suit != sc.suit) {
    return false;
  }
  if (tc.rank < sc.rank) {
    return ((sc.rank - tc.rank) % 3) == 0;
  }
  return false;
}

function dangerCheck(i) {
  // console.log("dangerCheck " + i);
  // console.log(allPiles[i]);
  if (allPiles[i].nCards < 1) {
    return [0, 0, 0.1];
  }

  let danger = 0;
  let bigDanger = 0;
  let stockSize = stockPile.nCards;

  for (let j = allPiles[i].nCards - 1; j >= 0; j--) {
    let tableauCard = allPiles[i].cards[j];
    if (tableauCard.rank <= 10) {
      for (let k = 0; k < stockSize; k++) {
        let stockCard = stockPile.cards[k];
        if (canCovered(tableauCard, stockCard)) {
          danger++;
          if (stockPile.checkTwinOkInsideStock(stockCard)) {
            bigDanger++;
          }
        }
      }
    }
  }
  // console.log((i - 25)  + ": " + danger + " / " + stockSize);
  return [danger, bigDanger, stockSize];
}

function fillAllBelowJam() {
  //console.log("fillAllBelowJam");
  let newFilled = false;
  for (let i = 26; i < 34; i++) {
    newFilled = newFilled || fillBelowJam(i);
  }
  //console.log("fillAllBelowJam " + newFilled);
}

function allDangerCheck() {
  // console.log("allDangerCheck");
  if (stockPile.nCards == 0) {
    return 0;
  }
  let dangerP = 1.0;
  let bigDangerP = 1.0;
  for (let i = 26; i < 34; i++) {
    let dc = dangerCheck(i);
    // console.log(i + ": " + dc);
    dangerP *= (1.0 - float(dc[0]) / float(dc[2]));
    bigDangerP *= (1.0 - float(dc[1]) / float(dc[2]));
  }
  dangerP = 1.0 - dangerP;
  bigDangerP = 1.0 - bigDangerP;
  // console.log("allDangerCheck " + Math.round(100 * dangerP));
  stockPile.danger = dangerP;
  stockPile.bigDanger = bigDangerP;
}

function doAllAceMoves() {
  for (let i = 2; i < 34; i++) {
    if (allPiles[i].isAce()) {
      doMove(allPiles[i], acePile, true);
    };
  }
}

function allMovableChecks() {
  for (let i = 2; i < 34; i++) {
    allPiles[i].doMovableCheck();
  }
}

function allAutoMovableChecks() {
  for (let i = 2; i < 34; i++) {
    allPiles[i].doAutoMovableCheck();
  }
}

function somethingMovable() {
  for (let i = 2; i < 34; i++) {
    if (allPiles[i].movable) {
      return true;
    }
  }
  return false;
}

function allJamChecks() {
  for (let i = 26; i < 34; i++) {
    allPiles[i].doJamCheck();
  }
}

function drawProgress(part, all) {
  if (part < 10) drawE();
  if (part < 0) {
    noStroke();
    fill(statistics.getResColor((statistics.mean), resPlayer));
    rect(0, YPROGRESS - 0.5 * TWO, widthNew, DYPROGRESS + 0.5 * TWO);
    fill(0);
    textFont(myFont, F12);
    textC("Tap to continue.", widthNew / 2, YRES - TWO * 48);
    textFont(myFont, F9);
    //text(evaltime, TWO * 3, YRES - TWO * 40);
    noStroke();
    let nowImage;
    // resImage = get(0, 0, scaleFactor * widthNew, scaleFactor * widthNew);
    nowImage = get(0, 0, scaleFactor * widthNew, scaleFactor * widthNew);

    let ifx = 20;
    let ify = ifx;
    nowImage.resize(widthNew / ifx, widthNew / ify);
    if (nEvaluationsEnd <= global_evaluations) {
      image(lastGames, -widthNew / ifx, YLASTGAMES);
      rescanvas.image(lastGames, -widthNew / ifx, 0);
    }

    image(nowImage, widthNew - widthNew / ifx, YLASTGAMES);
    rescanvas.image(nowImage, widthNew - widthNew / ifx, 0);

    stroke(255);
    line(widthNew / ifx, YLASTGAMES, widthNew / ifx, YLASTGAMES + widthNew / ify);
    // lastGames = get(0, ylastgames, widthNew, widthNew / ify);
    // lastGames.loadPixels();
    lastGames = rescanvas.get(0, 0, widthNew, widthNew / ify);
    lastGames.loadPixels();
    doSaveResultImage(lastGames);
  } else {
    let p = float(part) / float(all);
    if (p < drawNext) return;
    drawNext += 0.01;
    fill(255);
    noStroke();
    rect(0, YPROGRESS, widthNew, DYPROGRESS);
    fill(0, 122, 255);
    fill(122);
    rect(0, YPROGRESS + 16 * TWO, p * widthNew, 4 * TWO);
  }
  stroke(0);
  line(0, YPROGRESS - TWO, widthNew, YPROGRESS - TWO);
  line(0, YPROGRESS + DYPROGRESS, widthNew, YPROGRESS + DYPROGRESS);
}

// DRAWING

function allDraw() {
  if (mustDraw) {
    osp = true;
    offScreen.background(global_nightmode ? BG_NIGHT : BG_DAY);
    offScreen.fill(global_nightmode ? BG_NIGHT : 255);
    offScreen.stroke(global_nightmode ? BG_NIGHT : 255);
    offScreen.rect(0, TWO * 320, widthNew, 670);
    offScreen.stroke(global_nightmode ? 60 : 224);
    offScreen.line(0, TWO * 320, widthNew, TWO * 320);
    offScreen.stroke(0);

    if (!allPiles[2]) {
      My.print("getrallDrawesult");
      return;
    }

    for (let i = 0; i < 34; i++) {
      allPiles[i].draw();
    }
    offScreen.image(lastGames, 0, YLASTGAMES);

    mustDraw = false;
    osp = false;
  }

  if (!evaluated) {
    let ss = 1;
    scale(ss);
    image(offScreen, 0, 0);
    scale(1.0 / ss);
  } else if (canvasWasResized) {
    background(global_nightmode ? BG_NIGHT : BG_DAY);
    statistics.drawEvaluationLegend(resPlayer, YRES - TWO * 30, true);
    canvasWasResized = false;
  } else {
    stroke(global_nightmode ? BG_NIGHT : 255);
    fill(global_nightmode ? BG_NIGHT : 255);
    rect(0, TWO * 350, widthNew, TWO * 80);
  }


  if (global_helplevel == 9 || global_helplevel == 10) {
    for (let i = 0; i < 34; i++) {
      allPiles[i].drawArrow();
    }
  }

  let btnsBusy = dealBusy || evaluationfinished;
  btnRedo.draw(evaluated, btnsBusy);
  if (humanPlayer)
    btnUndo.draw(moveStack.nMoves > 0 && res != 0, btnsBusy);

    btnEvaluate.draw(gameFinished, btnsBusy);

    if (humanPlayer) {
    let nact = moverCollection.draw();
    if (nact == 0) {
      mustDraw = true;
    }
  } else if (statsRevealed) {
    drawHisto(XSTAT, YHISTO - TWO * 2);
    drawStatistics(XSTAT, YSTAT - TWO * 10);
    fill(statistics.getResColor(statistics.mean, resPlayer));
    drawResult(XSTAT, YSTAT - TWO * 21);
    image(lastGames, 0, YLASTGAMES);
    if (typeof drawAiReplayOverlay === "function") drawAiReplayOverlay();
  }
  


  btnNew.draw((!gameFinished && stockPile.nCards > 32) || evaluated, btnsBusy);
  if (res > 94) {
    mymsg = version;
  }

  if (gameFinished) {
    set1Pref("autostat", global_autostat.join());
  }
  fill(global_nightmode ? color(220) : col_resulttext);

  if (gameFinished) {
    if (evaluating) {
      textC("Evaluating", XRES - TWO * 95, YRES - TWO * 12);
    }
    if (!evaluated && res != 0) {
      textFont(myFont, F9);
      fill(global_nightmode ? color(220) : 0);
      stroke(global_nightmode ? color(220) : 0);
      text("The End. Now the evaluation:", 10, YRES + 12);
    }
  }
  if (humanPlayer) {
    textFont(myFontRegular, F18);
    textC(res + "", 320, YRES - 52);
    textFont(myFont, F12);
    // console.log("/***/", degreesoffreedom);
    // textFont(myFont, F8);
    // textR("[" + degreesoffreedom + "]", 630, YBN + 60);

  }

  if (explain != "") {
    textC(explain, XRES + 50, YRES);
  }

  if (noMovables() && !cardMoving() && humanPlayer && res != 0) {
    os.mynoStroke();
    os.myfill2(0, 40);
    os.myrect(0, 0, widthNew, TWO * 320);
    os.mystroke(12);
    os.myline(0, TWO * 320, widthNew, TWO * 320);
  }
  // image(lastGames, 0, YLASTGAMES);
  // console.log("image");
  if (evaluated && statsRevealed && fever && feverReady) {
    fever.draw();
  }
}

function numberOfMovables() {
  let nAuto = 0;
  for (let i = 0; i < 34; i++) {
    if (allPiles[i].movable) {
      nAuto++;
    }
  }
  return nAuto;
}

function newGame() {
  dealBusy = true;
  dealSettleFrames = 0;
  redoing = false;
  humanPlayer = true;
  nrEval = 0;
  nEvaluationsEnd = 0;
  evaluated = false;
  statsRevealed = false;
  statistics.emptyStat();
  moveStack.clear();
  degreesoffreedom = 0;
  resprev = 999;
  let startable = false;
  while (!startable) {
    shuffleDeck();
    startable = checkStartable();
  }
  // Vorlage reproduzierbar machen: die tatsaechlich gezogene Kartenreihenfolge
  // (nicht bloss ein Zufalls-Seed) wird festgehalten, damit dieselbe Vorlage
  // spaeter offline (z.B. von einem Trainings-/KI-Setup) exakt nachgespielt
  // werden kann. Kodierung pro Karte: suit*13 + (rank-1), Bereich 0-51.
  window.currentDealOrder = cards.map(c => c.suit * 13 + (c.rank - 1)).join(',');
  // Prototyp: 1000-Versuche-Random-Baseline schon jetzt im Hintergrund
  // starten (Web Worker), damit sie fertig ist, wenn der Mensch mit
  // Spielen fertig ist und auf "Evaluate" klickt - s. doEvaluation().
  startBackgroundEvaluation(window.currentDealOrder, alfa);
  windrawloop = -1;
  gameStart = My.simpleDateFormat();
  initLayout();
}

function redoGame() {
  dealBusy = true;
  dealSettleFrames = 0;
  redoing = true;
  humanPlayer = true;
  nrEval = 0;
  nEvaluationsEnd = 0;
  evaluated = false;
  statsRevealed = false;
  statistics.emptyStat();
  moveStack.clear();
  degreesoffreedom = 0;
  resprev = 999;
  windrawloop = -1;
  gameStart = My.simpleDateFormat();
  initLayout();
}

function checkStartable() {
  for (let i = 0; i < 24; i++) {
    let card = cards[103 - i];
    if (card.isAce()) return true;
    let base = int(i / 8) + 2;
    if (card.rank == base) return true;
  }
  return false;
}

function initLayout() {
  for (let i = 0; i < 34; i++)
    allPiles[i].clear();
  for (let i = 0; i < 104; i++) {
    cards[i].jammer = false;
    cards[i].jammed = false;
    cards[i].jamFinal = false;
    stockPile.push(cards[i]);
  }
  moveStock2Foundation(2);
  moveStock2Foundation(0);
  moveStock2Foundation(1);
  moveStock2Tableau();
}

function moveStock2Tableau() {
  for (let i = 0; i < 8; i++) {
    doMove(stockPile, tableau[i], true);
  }
}

function moveStock2Foundation(row) {
  for (let i = 0; i < 8; i++) {
    doMove(stockPile, foundationPile[row][i], true);
  }
}

function doUndo() {
  dirty = true;
  let m = moveStack.pop();
  if (m == null) return;
  moverCollection.startUndo(m.to, m.from, 12);
  loop();
  if (m.auto) {
    doUndo();
    return;
  }
  calculateFinalJam();
}

function calculateFinalJam() {
  for (let i = 0; i < 104; i++) {
    cards[i].jamFinal = false;
    cards[i].jamChecked = false;
  }
  for (let i = 0; i < 8; i++) {
    tableau[i].doJamCheck();
  }
}

function doUndoClick() {
  if (cardMoving() || acePile.reserved) return;
  doUndo();
}

function noMovables() {
  for (let i = 2; i < 34; i++) {
    if (allPiles[i].movable)
      return false;
  }
  return true;
}

let touchHandled = false;

function touchStarted() {
  // Only handle touches on the p5 canvas; let other elements (nav links etc.) handle touch normally
  if (touches.length > 0 && document.elementFromPoint(touches[0].x, touches[0].y) === document.getElementById('defaultCanvas0')) {
    touchHandled = true;
    handleTap();
    setTimeout(() => { touchHandled = false; }, 500);
    return false; // preventDefault — stops click synthesis, needed for canvas
  }
  // For touches outside the canvas, do nothing and let the browser handle them
}

function mouseClicked() {
  if (touchHandled) return;
  handleTap();
}

function handleTap() {
  loop();
  let x = mouseX;
  let y = mouseY;

  x /= scaleFactor;
  y /= scaleFactor;

  // AI-Replay (Prototyp): siehe js/aiReplay.js. Solange aktiv, gehen alle
  // Klicks dorthin (Zug anwenden / Overlay schliessen) - sonst kann ein
  // Klick auf die "AI"-Box (drawScoreBox in Statistics.js) das Replay starten.
  if (typeof aiReplay !== "undefined" && aiReplay.active) {
    aiReplayHandleClick(x, y);
    redraw();
    return;
  }
  if (statsRevealed && typeof aiBoxRect !== "undefined" && pointInBoxRect(x, y, aiBoxRect)) {
    startAiReplay();
    dirty = true;
    mustDraw = true;
    redraw();
    return;
  }

  if (evaluationfinished) {
    evaluationfinished = false;
    dirty = true;
    statsRevealed = true;
    mustDraw = true;
    redraw();
    return;
  }

  for (let i = 0; i < 34; i++) {
    if (allPiles[i].includes(x, y)) {
      allPiles[i].doClick();
    }
  }

  if (btnEvaluate.includes(x, y)) {
    loop();
    btnEvaluate.draw(false);
    moveStack.clear();
    evaluating = true;
    nrbox = 0;
    bgEvalIndex = 0; // Prototyp Hintergrund-Auswertung: von vorne durch die vorberechnete Liste
    btnNew.draw(false);
    btnRedo.draw(false);
    btnUndo.draw(false);
    fill(global_nightmode ? BG_NIGHT : 255);
    rect(5, YRES - 16, 250, 30);

    fill(global_nightmode ? BG_NIGHT : 255);
    rect(300, YRES - 70, 40, 40);

    statistics.drawEvaluationLegend(resPlayer, YRES - TWO * 30);

    if (resPlayer > 0 || (resPlayer == 0 && evaluated)) {
      fill(global_nightmode ? BG_NIGHT : BG_DAY);
      stroke(global_nightmode ? BG_NIGHT : BG_DAY);
      rect(0, 0, widthNew, widthNew + 1);
    }
    statistics.setResPlayer(resPlayer);
    drawNext = 0.0;

    dx1res = TWO * 10;
    dy1res = TWO * 10;

    nEvaluationsEnd += global_evaluations;
    nEvalsEnd0 += global_evaluations;
    if (y1res < 20 || global_evaluations == 1000) {
      x1res = -dx1res;
      y1res = 0;
      x2res = x2res0 - dx2res;
      y2res0 = 2 * 341;
      y2res0 = 2 * 500;
    }
    timerstart = millis();
    return;
  }

  if (btnNew.includes(x, y) && !evaluating) newGame();
  if (btnRedo.includes(x, y) && !evaluating) redoGame();
  if (btnUndo.includes(x, y)) doUndoClick();
  redraw();
}

function keyPressed() {
  if (key == 'p' || key == 'P') {
    for (let i = 0; i < 34; i++) {
      My.print(allPiles[i].toString());
    }
  }
  if (key == 'f' || key == 'F') {
    finishGame();
    humanPlayer = true;
  }
  if (key == 's' || key == 'S') {
    sayAutoReasonStat();
  }
  if (key == 'm' || key == 'M') {
    moveStack.print();
  }
  if (key == 'd' || key == 'D') {
    mustDraw = true;
  }
  if (key == 'z' || key == 'Z') {
    zeitAuswertungen();
  }
}

function sayAutoReasonStat() {
  for (let i = 0; i < global_autostat.length; i++) {
    My.print(global_autostat[i] + " ");
  }
  My.print();
}

function sayAutoReason(id, type, what, card) {
  if (global_sayAuto !== 1) global_autostat[type]++;
  if (global_sayAuto !== 1) return;
  // The pile's autoMovable flag (and the drawAutoMovable() card highlight
  // tied to it) is only picked up by the NEXT full offscreen rebuild, while
  // this label is painted immediately. sayAutoReason() runs from inside
  // draw() (via allAutoMovableChecks()), BEFORE draw() recomputes
  // `dirty = cardMoving()` a few lines down — so setting dirty/mustDraw
  // directly here gets clobbered by that reassignment before it can have
  // any effect. needsHighlightRedraw survives that line (it's OR'd in) and
  // forces the one extra frame the rebuild actually needs.
  needsHighlightRedraw = true;
  mustDraw = true;
  os.myfill4(255, 255, 0, 200);
  os.myrect(allPiles[id].getTopX(), allPiles[id].yc - 13, CARDwidthNew, 26);
  os.mystroke(0);
  os.myfill(0);
  os.mytextFont(myFont, F8);
  // textC()'s CENTER/CENTER alignment centers on SF Pro's font-metric
  // ascent/descent, which sits visibly low for labels like these (same issue
  // fixed for Button.js). Measure the actual glyph bounding box instead, and
  // read from whichever canvas (offscreen buffer or main) is currently
  // active, matching what os.mytext() would draw to.
  const label = shortTxt[type];
  const cx = allPiles[id].xc;
  const cy = allPiles[id].yc;
  const ctx = osp ? offScreen.drawingContext : drawingContext;
  os.mytextAlign2(CENTER, BASELINE);
  const metrics = ctx.measureText(label);
  const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  os.mytext(label, cx, cy + metrics.actualBoundingBoxAscent - glyphHeight / 2);
  os.mytextAlign2(LEFT, BASELINE);
}

function info(what) {}

function cardMoving() {
  if (evaluating) return false;
  return moverCollection.isOneActive();
}

function countOKs() {
  let n_ok = 0;
  for (let i = 2; i < 26; i++) {
    n_ok += allPiles[i].nOk();
  }
  return n_ok;
}

function shuffleDeck() {
  for (let i = 103; i >= 0; i--) {
    let j = int(random(i));
    let card = cards[j];
    card.ok = false;
    card.jamFinal = false;
    card.jamChecked = false;
    cards[j] = cards[i];
    cards[i] = card;
  }
}

// Expose functions called from HTML onclick attributes so terser won't remove them
window.showSection = showSection;
window.handleStatisticsFileSelect = handleStatisticsFileSelect;
window.openPreferencesFileDialog = openPreferencesFileDialog;
window.allDraw = allDraw;