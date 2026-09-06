// aiReplay.js -------------------------------------------------------------
// Assistiertes Nachspielen der vom PIMC-Agenten gespielten Partie: Klick
// auf die "AI"-Box auf der Resultatseite (siehe Statistics.js/drawScoreBox)
// startet ein Schritt-fuer-Schritt-Replay der Zugliste, die pimcWorker.js
// waehrend der Hintergrund-Auswertung aufgezeichnet und selbst verifiziert
// hat (siehe playOnePimcGame()/replayMoves() dort).
//
// Rein additiv und read-only gegenueber dem echten Spiel: das Replay laeuft
// auf einer eigenen, lokalen GallerySolitaire-Instanz (aus pimcWorker.js).
// Die echten Piles (tableau[], foundationPile[][], stockPile) werden nur
// für ihre x/y-Position (und bei Foundation: .base/.xc/.yc fuer die
// Leer-Beschriftung) ausgelesen, nie veraendert - das eigentliche
// Spielobjekt/Board des Menschen bleibt unangetastet.
//
// Nutzer-Feedback Runde 1 (behoben):
// - Klick auf einen Zug bewirkte nichts: die App rendert nur neu, wenn
//   das globale `dirty`-Flag gesetzt ist (siehe draw() in galleryjs.js,
//   `if (!dirty) return;`). Ein blosses redraw() reichte nicht - jetzt
//   wird `dirty`/`mustDraw` bei jedem Replay-Klick explizit gesetzt.
// - Tableau-Karten sahen "falsch eingefaerbt" aus: Ursache war zum einen
//   der noch nicht greifende Redraw (das alte, echte Spielbrett schien
//   durch den nur halbtransparenten Hintergrund durch), zum anderen
//   wurde `ok=true` an Card.draw() uebergeben - im echten Spiel ist eine
//   Tableau-Karte nie "ok" (TableauPile.ok ist immer false), sondern wird
//   ueber drawMini() gezeichnet. Jetzt: Hintergrund deckt vollstaendig ab,
//   und Tableau-Karten werden wie im echten Spiel mit ok=false gezeichnet.
// - "movable" Karten (gelb/orange) fehlten: werden jetzt ueber
//   g.getLegalMoves() ermittelt und wie im echten Spiel eingefaerbt.

// Unser interner Suit-Index (pimcWorker.js: GallerySolitaire.SUITS =
// ["C","D","H","S"], 0..3) -> Live-App Suit-Index (Card.js: suitStr =
// ["Club","Hearts","Spade","Diamond"], 0..3). Umkehrung von
// GallerySolitaire.LIVE_SUIT_MAP ({0:0, 1:2, 2:3, 3:1}).
const AI_REPLAY_SUIT_TO_LIVE = { 0: 0, 1: 3, 2: 1, 3: 2 };

let aiReplay = {
  active: false,
  game: null,
  moves: [],
  pendingIndex: 0, // Index des naechsten, noch nicht ausgefuehrten Zugs
  dealOrder: null,
};

// Klickbereich der "AI"-Box (von Statistics.js/drawScoreBox gesetzt) bzw.
// des Schliessen-Kreuzes im Replay-Overlay (von drawAiReplayOverlay gesetzt).
let aiBoxRect = null;
let aiReplayCloseRect = null;

function pointInBoxRect(x, y, r) {
  return !!r && x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;
}

// Sucht die zu suit/rank passende, real geladene Card-Instanz (fuer die
// Kartenbilder) - welche der zwei gleichen Karten (Doppeldeck) egal, sie
// sehen identisch aus.
function aiReplayFindCard(liveSuit, rank) {
  for (let i = 0; i < cards.length; i++) {
    let c = cards[i];
    if (c && c.suit === liveSuit && c.rank === rank) return c;
  }
  return null;
}

// Diese Card-Instanzen stammen aus dem echten Deck und koennen noch
// jam-Flags vom soeben beendeten Spiel des Menschen tragen - fuer die
// read-only Replay-Ansicht irrelevant, daher vor jedem Zeichnen zuruecksetzen.
function aiReplayResetCardFlags(cardObj) {
  cardObj.jamFinal = false;
  cardObj.jammer = false;
  cardObj.jammed = false;
}

// Unsere interne Foundation-Reihe (0,1,2, ueber _baseForRow() mit
// Basis-Rang 2,3,4 verknuepft) ist NICHT dasselbe wie der Array-Index
// von foundationPile[] in der Live-App (dort: foundationPile[2] = Basis
// 2 = oberste Bildschirmreihe, foundationPile[0] = Basis 3 = mittlere
// Reihe, foundationPile[1] = Basis 4 = unterste Reihe - Reihenfolge kam
// historisch von moveStock2Foundation(2);(0);(1); beim Austeilen).
// Bisher fiel das nicht auf, weil nur der Gesamt-Score verglichen wurde
// (dafuer reicht interne Konsistenz) - fuers Zeichnen auf dem echten
// Board brauchen wir aber die tatsaechliche Bildschirm-Zuordnung, daher
// hier ueber die uebereinstimmenden .base-Werte ermittelt statt den
// Index direkt zu uebernehmen.
function aiReplayBuildRowMap(g) {
  const map = {};
  for (let row = 0; row < 3; row++) {
    const base = g._baseForRow(row);
    for (let liveRow = 0; liveRow < 3; liveRow++) {
      if (foundationPile[liveRow][0].base === base) {
        map[row] = liveRow;
        break;
      }
    }
  }
  return map;
}

function startAiReplay() {
  if (typeof bgEvalResult === "undefined" || !bgEvalResult ||
      bgEvalResult.dealOrder !== window.currentDealOrder ||
      !Array.isArray(bgEvalResult.pimcMoves) || !bgEvalResult.pimcMoves.length) {
    My.print("AI-Replay: noch nicht bereit (Hintergrund-Auswertung nicht bereit/nicht fertig).");
    return;
  }
  if (typeof GallerySolitaire === "undefined") {
    My.print("AI-Replay: pimcWorker.js ist nicht als <script> eingebunden.");
    return;
  }
  if (bgEvalResult.pimcMovesVerified === false) {
    My.print("AI-Replay: Zugliste konnte nicht selbst verifiziert werden - kein Replay gestartet.");
    return;
  }
  try {
    aiReplay.game = GallerySolitaire.fromDealOrder(bgEvalResult.dealOrder);
  } catch (e) {
    My.print("AI-Replay: Spiel konnte nicht aufgebaut werden (" + e.message + ")");
    return;
  }
  aiReplay.moves = bgEvalResult.pimcMoves;
  aiReplay.pendingIndex = 0;
  aiReplay.dealOrder = bgEvalResult.dealOrder;
  aiReplay.active = true;
  dirty = true;
  mustDraw = true;
}

function stopAiReplay() {
  aiReplay.active = false;
  aiReplay.game = null;
  dirty = true;
  mustDraw = true;
}

// Von handleTap() aufgerufen, solange aiReplay.active ist. Setzt selbst
// nochmals dirty/mustDraw (s. Kommentar oben) - egal was der Aufrufer tut,
// damit ein Klick waehrend des Replays garantiert sichtbar etwas bewirkt.
function aiReplayHandleClick(x, y) {
  dirty = true;
  mustDraw = true;
  if (pointInBoxRect(x, y, aiReplayCloseRect)) {
    stopAiReplay();
    return;
  }
  if (aiReplay.pendingIndex >= aiReplay.moves.length) {
    stopAiReplay();
    return;
  }
  const move = aiReplay.moves[aiReplay.pendingIndex];
  try {
    aiReplay.game.executeMove(move, { undoable: false });
  } catch (e) {
    My.print("AI-Replay: Zug " + (aiReplay.pendingIndex + 1) + " konnte nicht angewendet werden (" + e.message + ")");
    stopAiReplay();
    return;
  }
  aiReplay.pendingIndex++;
}

function aiReplayPilePosition(posStr, rowMap, g) {
  const kind = posStr[0];
  if (kind === "T") {
    const ti = parseInt(posStr.slice(1), 10);
    // Die oberste (spielbare) Karte sitzt visuell tiefer, wenn schon
    // andere Karten gestapelt darunter liegen (s. gestaffelte Tableau-
    // Zeichnung) - sonst landet die Hervorhebung auf der Basis-Position
    // der Pile statt auf der tatsaechlich gezeigten obersten Karte.
    const depth = g && g.t[ti] ? g.t[ti].length : 1;
    const py = tableau[ti].y + Math.max(0, depth - 1) * DYST;
    return { x: tableau[ti].x, y: py };
  }
  if (kind === "F") {
    const row = parseInt(posStr[1], 10);
    const slot = parseInt(posStr[2], 10);
    const liveRow = rowMap ? rowMap[row] : row;
    return { x: foundationPile[liveRow][slot].x, y: foundationPile[liveRow][slot].y };
  }
  return null;
}

function aiReplayDescribeMove(move) {
  if (move.type === "deal_stock") return "Stock aufdecken";
  if (move.type === "move_card" && move.card) {
    const liveSuit = AI_REPLAY_SUIT_TO_LIVE[move.card.s];
    const cardObj = aiReplayFindCard(liveSuit, move.card.r);
    const label = cardObj ? cardObj.toStr() : (move.card.r + "/" + move.card.s);
    return label + ": " + move.from + " → " + move.to;
  }
  return "";
}

function drawAiReplayOverlay() {
  if (!aiReplay.active || !aiReplay.game) return;
  const g = aiReplay.game;

  // Welche Positionen sind gerade ueberhaupt zieh-/spielbar? (wie im
  // echten Spiel orange hervorgehoben, s. Card.js/drawMovable)
  const legalFrom = new Set();
  for (const m of g.getLegalMoves()) {
    if (m.type === "move_card") legalFrom.add(m.from);
  }

  // Vollstaendig deckender Hintergrund (nicht nur halbtransparent!) -
  // sonst scheint das alte, echte Spielbrett des Menschen durch.
  noStroke();
  fill(global_nightmode ? BG_NIGHT : 250);
  rect(0, 0, WIDTH0, HEIGHT0);

  let lowestY = 0; // fuer die Positionierung der Kopfzeile unterhalb aller Karten
  const rowMap = aiReplayBuildRowMap(g); // unsere Foundation-Reihe -> foundationPile[]-Index

  // Tableau: wie im echten Spiel gestaffelt gezeichnet (verdeckte Karten
  // darunter leicht versetzt, oberste Karte offen), damit man den ganzen
  // Stapel sieht statt nur einer "+N"-Zahl. Ueber ok=false gezeichnet, wie
  // im echten Spiel (TableauPile.ok ist immer false).
  for (let i = 0; i < 8; i++) {
    const pile = g.t[i];
    const px = tableau[i].x;
    let py = tableau[i].y;
    for (let k = 0; k < pile.length - 1; k++) {
      const under = pile[k];
      const underObj = aiReplayFindCard(AI_REPLAY_SUIT_TO_LIVE[under.s], under.r);
      if (underObj) {
        aiReplayResetCardFlags(underObj);
        underObj.drawHidden(px, py);
      }
      py += DYST;
    }
    if (pile.length) {
      const c = pile[pile.length - 1];
      const cardObj = aiReplayFindCard(AI_REPLAY_SUIT_TO_LIVE[c.s], c.r);
      if (cardObj) {
        aiReplayResetCardFlags(cardObj);
        cardObj.draw(px, py, false, legalFrom.has("T" + i), false);
      }
    }
    lowestY = Math.max(lowestY, py + CARDHEIGHT);
  }

  // Foundation: 3 Reihen x 8 Slots, je maximal eine Karte. Unsere Reihen-
  // Nummerierung (0,1,2) auf die tatsaechliche Bildschirmreihe umrechnen
  // (s. aiReplayBuildRowMap). Leere Slots zeigen wie im echten Spiel
  // (FoundationPile.draw()) die Basis-Rangzahl in grau.
  for (let row = 0; row < 3; row++) {
    const liveRow = rowMap[row];
    for (let slot = 0; slot < 8; slot++) {
      const pile = foundationPile[liveRow][slot];
      lowestY = Math.max(lowestY, pile.y + CARDHEIGHT);
      const c = g.f[row][slot];
      if (!c) {
        textFont(myFont, F14);
        fill(145);
        noStroke();
        textAlign(CENTER, CENTER);
        text(pile.base + "", pile.xc, pile.yc);
        continue;
      }
      const cardObj = aiReplayFindCard(AI_REPLAY_SUIT_TO_LIVE[c.s], Math.abs(c.r));
      if (cardObj) {
        aiReplayResetCardFlags(cardObj);
        const ok = c.r > 0; // korrekt einsortiert?
        cardObj.draw(pile.x, pile.y, ok, !ok && legalFrom.has("F" + row + slot), false);
      }
    }
  }

  // Stock-Rest als Zahl an der Stock-Position.
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(myFont, F14);
  text(g.stock.length, stockPile.xc, stockPile.yc);
  lowestY = Math.max(lowestY, stockPile.y + CARDHEIGHT);

  // Hervorhebung der Karte, die im naechsten Schritt gespielt wird -
  // Sonderfarbe (Magenta) im Kartenhintergrund, bewusst anders als die
  // "movable"-Farbe (orange) oben, damit der tatsaechlich gewaehlte Zug
  // unter den (evtl. mehreren) moeglichen Zuegen eindeutig erkennbar ist.
  if (aiReplay.pendingIndex < aiReplay.moves.length) {
    const move = aiReplay.moves[aiReplay.pendingIndex];
    let pos = null;
    if (move.type === "move_card" && move.card) {
      pos = aiReplayPilePosition(move.from, rowMap, g);
    } else if (move.type === "deal_stock") {
      pos = { x: stockPile.x, y: stockPile.y };
    }
    if (pos) {
      os.mynoStroke();
      os.myfill4(178, 24, 138, 100); // war 150 - "etwas weniger deckend"
      os.myrect(pos.x, pos.y, CARDwidthNew, CARDHEIGHT);
    }
  }

  // Kopfzeile: Fortschritt, aktueller Zug, Schliessen-Kreuz - unterhalb
  // aller gezeichneten Karten platziert, damit nichts verdeckt wird.
  let headerTop = lowestY + TWO * 12;
  let headerHeight = TWO * 34;
  fill(global_nightmode ? BG_NIGHT : 255);
  stroke(0);
  rect(TWO * 10, headerTop, WIDTH0 - TWO * 20, headerHeight, 6);
  noStroke();
  fill(0);
  textAlign(LEFT, CENTER);
  textFont(myFont, F12);
  let label = "AI-Replay - Zug " + Math.min(aiReplay.pendingIndex + 1, aiReplay.moves.length) +
    " / " + aiReplay.moves.length;
  if (aiReplay.pendingIndex < aiReplay.moves.length) {
    label += ": " + aiReplayDescribeMove(aiReplay.moves[aiReplay.pendingIndex]);
  } else {
    // Diagnose, warum das Replay hier endet - wichtig fuer die
    // Nachvollziehbarkeit, wenn am Schluss noch viele Karten offen sind:
    // entweder eine echte Sackgasse (keine Zuege mehr moeglich) oder das
    // interne Zug-Limit (300, s. playOnePimcGame() in pimcWorker.js) wurde
    // erreicht, obwohl vielleicht noch Zuege moeglich gewesen waeren.
    const stuck = g.getLegalMoves().length === 0;
    const hitCap = aiReplay.moves.length >= 300;
    let why = stuck
      ? "keine Zuege mehr moeglich (Sackgasse)"
      : (hitCap ? "Zug-Limit (300) erreicht - evtl. waeren noch Zuege moeglich gewesen" : "");
    label += " - fertig (Score " + g.calculateCurrentScore() + (why ? ", " + why : "") + "). Klick zum Schliessen.";
  }
  text(label, TWO * 18, headerTop + headerHeight / 2);

  aiReplayCloseRect = { left: WIDTH0 - TWO * 34, top: headerTop, width: TWO * 24, height: headerHeight };
  textAlign(CENTER, CENTER);
  textFont(myFont, F16);
  fill(150, 0, 0);
  text("×", aiReplayCloseRect.left + TWO * 12, headerTop + headerHeight / 2);

  textAlign(LEFT, BASELINE);
  fill(0);
}
