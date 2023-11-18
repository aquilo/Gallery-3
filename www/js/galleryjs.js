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
let jsstoreCon;

let version = "Version 3.0"; // a
let device = "";
let mymsg;
let XSF, YSF, XST, YST, XSA, YSA, XSS, YSS;
let DXSF, DYSF, DXST, DYST, DXSA, DYSA, DXSS, DYSS;
let FACT;
let CARDwidthNew, CARDHEIGHT;

let XRIGHT;
let WIDTH0 = window.innerwidthNew - 5;
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
let nrbox;
let F9, F10, F11, F12, F14, F16, F18, F24;
let alfa = 0.99;
let debug = true;
let LANG = "en";
let withNewCards = true;
let retina = true;
let evaluationfinished = false;
let redoing = false;
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
let resImage;

let offScreen;
let lastGamesScreen;
let imgNow;
let windrawloop;
let canvasPositionX = 0;

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
let reduce = false;

let cards = new Array(104);

let randbuffer = new Array();

let nEvals0 = 0;
let nEvalsEnd0 = 0;

let nrEval = 0;
let evaluating = false;
let evaluated = false;
let evaltime = 0;

let rescanvas = "";

let ifact;

let x1res, y1res, dx1res, dy1res;
let x2res, y2res, dx2res, dy2res, x2res0, y2res0;


let myFont;
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
let caption;
let cnv;

let shortTxt = [
  "", "T ok", "2 poss", "F clean", "just 1", "T botm",
  "T row", "Tbelow", "T botm", "TuBase", "Tjammed"
];

let longTxt = [
  "", "Twin is already ok.", "There are two possibilities for this card.", "The foundation row is completely clean.", "At the end and only one card can be moved.", "Twin is directly at the bottom (F).", "Twin is on the same foundation row.", "Twin is below this card.", "Twin is directly at the bottom (T).", "Twin lies directly under its base.", "Twin lies directly under its own base."
];

function preload() {
  My.print("*** p5js: preload at " + new Date().toISOString());
  dataPath = "data/";
  dataPathImg = "data/img/";
  dataPathPhotos = "data/photos/";
  newCards = loadImage(dataPathImg + "newcards2013.png");
  numbcol = loadImage(dataPathImg + "numbersandcolors.png");
  // translationStrings = loadStrings(dataPath + "translations.txt");
  myFont = loadFont("data/Roboto-Regular.ttf");
  My.print("/preload: " + My.round2String(millis() / 1000.0, 3) + " sec");
}

function windowResized() {
  canvasInit();
  resizeCanvas(scaleFactor * WIDTH0, scaleFactor * HEIGHT0);
  console.log("Canvas: " + round(scaleFactor * WIDTH0) + " / " + round(scaleFactor * HEIGHT0));
  cnv.position(canvasPositionX, 0);
  allDraw();
}

function canvasInit() {
  detectDevice();
  widthNew = WIDTH0;
  canvasPositionX = max(0, (windowWidth - widthNew) / 2);
  actualwidthNew = min(screen.widthNew, 640);
  deviceFactor = actualwidthNew / 320.0;

}

function setup() {
  // pixelDensity(2);
  My.print("setup: " + My.round2String(millis() / 1000.0, 3) + " sec");
  getAllPrefs();
  //TODO openTranslations(translationStrings);


  background(248);
  os = new Os();

  canvasInit();
  cnv = createCanvas(scaleFactor * WIDTH0, scaleFactor * HEIGHT0);
  console.log("Canvas: " + round(scaleFactor * WIDTH0) + " / " + round(scaleFactor * HEIGHT0));

  cnv.position(canvasPositionX, 0);
  background(255, 0, 200);

  //TODO  actualwidthNew = min(screen.widthNew, 480);

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
  allPiles[0] = stockPile = new StockPile(XSS, YSS, 0, 104);
  //  allPiles[1] = acePile = new AcePile(-40, YSA, 1, 8);
  // allPiles[1] = acePile = new AcePile(XSS + 60, YSF + DYSF, 1, 8);
  allPiles[1] = acePile = new AcePile(XSF + 3.5 * DXSF, -50, 1, 8);
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

  let ybtns = YBN + 60;
  btnEvaluate = new Button(getTranslation(LANG, "Evaluate"), XBN + ifact * 132, ybtns, WBF, HBF, 1);

  btnNew = new Button(getTranslation(LANG, "New"), XBN - ifact * 60, ybtns, WBN, HBN, 1);
  btnUndo = new Button(getTranslation(LANG, "Undo"), XBN + ifact * 80, YRES - 20, WBU, HBU, 1);
  btnRedo = new Button(getTranslation(LANG, "Redo"), XBN + ifact * 60, ybtns, WBU, HBU, 1);

  for (let i = 2; i < 34; i++) {
    serie[i - 2] = i;
    serie32[i - 2] = i;
  }

  moverCollection = new MoverCollection();

  let photoName = [
    "img_0611b", "img_0812b", "img_1021b", "img_1029b", "img_1049b", "img_1058b", "img_1080b", "img_1119b",
    "img_1125b", "img_1144b", "img_1536b", "img_1747b", "img_1972b", "img_2070b", "img_2225b", "img_2856b", "img_2867b", "adula", "clariden", "gelb", "mittelholzer", "mittelholzer2", "pratod", "terri", "terribw", "toedi", "uomo", "grafik", "showyourstripes_switzerland2"
  ];

  caption = [
    "Adula (3402m) from Val Malvalglia", "Laghetto (2233m) near Cima di Pinadee", "", "", "Pizzo Cassinello (3103m)", "", "Adula (3402m) from Pizzo Cassinello", "Oratorio di Santa Caterina d'Alessandria (Ponto Aquilesco)",
    "From Campra to the east", "In Val Scaradra", "Motterascio", "Oratorio di Santa Caterina d'Alessandria (Ponto Aquilesco)", "Val Canal", "Adula (3402m) from Lago Retico", "Cima di Gana Bianca (2843m)", "Piz Terri (3149m)", "Piz Terri (3149m) from Corói",
    "Adula (3402m) from south", "Clariden (3267m) and Tödi (3614m) from Pizzo dell'Uomo", "", "Adula (3402m), areal view by Walter Mittelholzer, 1923", "Adula (3402m), areal view by Walter Mittelholzer, 1919", "Prodóir (1460m)", "Piz Terri (3149m)", "Piz Terri (3149m) Corói", "Clariden (3267m) and Tödi (3614m)", "Pizzo dell'Uomo (2663m)", "Data: Swiss Glacier Monitoring", "Warming Stripes for Switzerland 1864-2019", "Adula from Piz Cassimoi (3128m)"
  ];

  bimg = new Array(photoName.length);

  for (let i = 0; i < photoName.length; i++) {
    // My.print((i) + " " + dataPathPhotos + photoName[i] + ".png // " + caption[i]);
    bimg[i] = loadImage(dataPathPhotos + photoName[i] + ".png");
  }

  randbuffer = new Array(int(bimg.length / 2));
  for (let i = 0; i < randbuffer.length; i++) {
    randbuffer[i] = -1;
  }
  if (global_resimg == '---' || global_resimg == 0 || global_resimg == "0") {
    lastGames = loadImage(dataPathPhotos + "emptyLastGames.png");
  } else {
    lastGames = loadImage(global_resimg);
  }
  rescanvas = createGraphics(640, 64);
  rescanvas.image(lastGames, 0, 0);


  statistics.statisticsgraphinit();

  newGame();
  My.print("processing end setup: " + My.round2String(millis() / 1000.0, 3) + " sec");
  smooth();

  jsstoreCon = new JsStore.Connection();
  doStatTable();
  initDb();
  loop();
  My.print("/setup: " + My.round2String(millis() / 1000.0, 3) + " sec");
}

function drawE() {
  btnUndo.draw(false);
  fill(255);
  rect(XRES - 20, YRES - 20, 40, 40)
  statistics.drawEvaluationLegend(resPlayer, YRES - ifact * 30);
  textFont(myFont, F14);
  fill(color(0));
  stroke(color(0));
  jx = max(min(resPlayer, 93), 2);
  jx = 3 + jx * ifact * 10 / 3;
  textC(resPlayer + "", jx, YRES - ifact * 10);
}

function doEvaluation(n, alfa) {
  humanPlayer = false;
  evaluating = true;
  stroke(0);
  for (let i = 0; i < n; i++) {
    btnNew.draw(false);
    btnRedo.draw(false);
    statistics.add(evalGame(alfa));
  }
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
      statistics.doStatistics();
      statistics.saveResultat(alfa, gameStart);
      drawProgress(-1, nEvalsEnd0);
      nEvalsEnd0 = 0;
      nEvals0 = 0;
      evaluating = false;
      evaluated = true;
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
      textFont(myFont, F9);
      textR(caption[imgNow], ifact * 310, ifact * 344);
      noTint();
    }
    if (reduce) {
      image(bimg[imgNow], 0, 0, 640, 640);
    } else {
      image(bimg[imgNow], 0, 0);
    }
    noTint();
    return;
  }
  if (!dirty) noLoop();
  if (!dirty) return;

  allDraw();
  doAllAceMoves();
  allOkChecks();
  allMovableChecks();
  allAutoMovableChecks();
  allJamChecks();

  res = getResult();

  gameFinished = stockPile.empty() && !cardMoving() && noMovables();
  // Game finished
  if (gameFinished && humanPlayer) {
    resPlayer = res;
  }

  dirty = cardMoving();
  if (dirty) loop();

  for (let i = 0; i < 34; i++) {
    if (allPiles[i].autoMovable) {
      if (!humanPlayer || (global_sayAuto == 0 && global_auto == 1)) allPiles[i].doAutoClick();
      dirty = true;
      return;
    }
  }
  allDraw();
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
    fill(statistics.getResColor(statistics.mean, resPlayer));
    rect(0, YPROGRESS - 0.5 * ifact, widthNew, DYPROGRESS + 0.5 * ifact);
    fill(0);
    textFont(myFont, F12);
    textC("Tap to continue.", widthNew / 2, YRES - ifact * 46);
    textFont(myFont, F9);
    text(evaltime, ifact * 3, YRES - ifact * 40);
    noStroke();
    let nowImage;
    resImage = get(0, 0, scaleFactor * widthNew, scaleFactor * widthNew);
    nowImage = get(0, 0, scaleFactor * widthNew, scaleFactor * widthNew);

    ifx = 10;
    ify = ifx;
    nowImage.resize(widthNew / ifx, widthNew / ify);
    let ylastgames = widthNew + 230;
    if (nEvaluationsEnd <= global_evaluations) {
      image(lastGames, widthNew / ifx, ylastgames);
      rescanvas.image(lastGames, widthNew / ifx, 0);
    }

    image(nowImage, 0, ylastgames);
    rescanvas.image(nowImage, 0, 0);

    stroke(255);
    line(widthNew / ifx, ylastgames, widthNew / ifx, ylastgames + widthNew / ify);
    // lastGames = get(0, ylastgames, widthNew, widthNew / ify);
    // lastGames.loadPixels();
    lastGames = rescanvas.get(0, 0, widthNew, widthNew / ifx);
    lastGames.loadPixels();
    doSaveResultImage(lastGames);
    // 
  } else {
    let p = float(part) / float(all);
    if (p < drawNext) return;
    drawNext += 0.01;
    fill(255);
    noStroke();
    rect(0, YPROGRESS, widthNew, DYPROGRESS);
    fill(0, 122, 255);
    fill(122);
    rect(0, YPROGRESS + 16 * ifact, p * widthNew, 4 * ifact);
  }
  stroke(0);
  line(0, YPROGRESS - ifact, widthNew, YPROGRESS - ifact);
  line(0, YPROGRESS + DYPROGRESS, widthNew, YPROGRESS + DYPROGRESS);
}

// DRAWING

function allDraw() {
  if (mustDraw) {
    osp = true;
    offScreen.background(248);
    offScreen.fill(255);
    offScreen.stroke(255);
    offScreen.rect(0, ifact * 331, widthNew, 670);
    offScreen.stroke(224);
    offScreen.line(0, ifact * 331, widthNew, ifact * 331);
    offScreen.stroke(0);

    if (!allPiles[2]) {
      My.print("getrallDrawesult");
      return;
    }

    for (let i = 0; i < 34; i++) {
      allPiles[i].draw();
    }
    let ylastgames = widthNew + 230;
    offScreen.image(lastGames, 0, ylastgames);

    mustDraw = false;
    osp = false;
  }

  if (!evaluated) {
    let ss = 1;
    scale(ss);
    image(offScreen, 0, 0);
    scale(1.0 / ss);
  } else {
    stroke(255);
    fill(255);
    rect(0, ifact * 350, widthNew, ifact * 80);
  }


  if (global_helplevel == 9 || global_helplevel == 10) {
    for (let i = 0; i < 34; i++) {
      allPiles[i].drawArrow();
    }
  }

  if (humanPlayer)
    btnUndo.draw(moveStack.nMoves > 0 && res != 0);

  if (humanPlayer) {
    let nact = moverCollection.draw();
    if (nact == 0) {
      mustDraw = true;
    }
  } else {
    drawHisto(XSTAT, YHISTO - ifact * 2);
    drawStatistics(XSTAT, YSTAT - ifact * 10);
    fill(statistics.getResColor(statistics.mean, resPlayer));
    drawResult(XSTAT, YSTAT - ifact * 21);
  }
  btnNew.draw((!gameFinished && stockPile.nCards > 32) || evaluated);
  btnRedo.draw(evaluated);
  if (res > 94) {
    mymsg = version;
  }
  btnEvaluate.draw(gameFinished);
  if (gameFinished) {
    set1Pref("autostat", global_autostat.join());
  }
  fill(col_resulttext);

  if (gameFinished) {
    if (evaluating) {
      textC("Evaluating", XRES - ifact * 95, YRES - ifact * 12);
    }
    if (!evaluated && res != 0) {
      textFont(myFont, F12);
      textC("The End. Now the evaluation:", XRES - ifact * 95, YRES - ifact * 46);
    }
  }
  if (humanPlayer) {
    textFont(myFont, F18);
    textC(res + "", XRES, YRES);
    textFont(myFont, F12);
  }

  if (explain != "") {
    textC(explain, XRES + 50, YRES);
  }

  if (noMovables() && !cardMoving() && humanPlayer && res != 0) {
    os.mynoStroke();
    os.myfill2(0, 40);
    os.myrect(0, 0, widthNew, ifact * 331);
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
  redoing = false;
  humanPlayer = true;
  nrEval = 0;
  nEvaluationsEnd = 0;
  evaluated = false;
  statistics.emptyStat();
  moveStack.clear();
  let startable = false;
  while (!startable) {
    shuffleDeck();
    startable = checkStartable();
  }
  windrawloop = -1;
  gameStart = My.simpleDateFormat();
  initLayout();
}

function redoGame() {
  redoing = true;
  humanPlayer = true;
  nrEval = 0;
  nEvaluationsEnd = 0;
  evaluated = false;
  statistics.emptyStat();
  moveStack.clear();
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

function mouseClicked() {
  loop();
  let x = mouseX;
  let y = mouseY;
  //TODO y -= deltay;
  if (reduce) {
    x /= scaleFactor;
    y /= scaleFactor;
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
    btnNew.draw(false);
    btnRedo.draw(false);

    statistics.drawEvaluationLegend(resPlayer, YRES - ifact * 30);

    if (resPlayer > 0 || (resPlayer == 0 && evaluated)) {
      fill(0);
      stroke(0);
      rect(0, 0, widthNew, widthNew + 1);
    }
    statistics.setResPlayer(resPlayer);
    drawNext = 0.0;

    dx1res = ifact * 10;
    dy1res = ifact * 10;

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
  if (evaluationfinished) {
    evaluationfinished = false;
    dirty = true;
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

  if (key == 'f' || key == 'f') {
    finishGame();
    humanPlayer = true;
  }
  if (key == 's' || key == 'S') {
    sayAutoReasonStat();
  }
  if (key == 'm' || key == 'M') {
    moveStack.My.print();
  }
  if (key == 'd' || key == 'd') {
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
  global_autostat[type]++;
  if (global_sayAuto != 1) return;
  os.myfill4(255, 255, 0, 200);
  os.myrect(allPiles[id].getTopX(), allPiles[id].yc - 13, CARDwidthNew, 26);
  os.mystroke(0);
  os.myfill(0);
  os.mytextFont(myFont, F10);
  textC(shortTxt[type], allPiles[id].xc, allPiles[id].yc);
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
    cards[j] = cards[i];
    cards[i] = card;
  }
}