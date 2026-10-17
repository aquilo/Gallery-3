// Analyse einer Lage: wo biegt PIMC falsch ab? Aus www/ heraus:
//
//   node docs/pimc-analyse.js wins <lage> [anzahl]        gewinnende Random-Partien suchen + Zugfolge zeigen
//   node docs/pimc-analyse.js takeover <lage> <winIdx> <k1,k2,...> [seeds]
//        PIMC (crn) uebernimmt die gewinnende Partie nach k Zuegen -> Scores
//   node docs/pimc-analyse.js eval <lage> <winIdx> <k> [samples]
//        PIMC-Bewertung aller Kandidaten im Zustand nach k Zuegen
//
// Lage/Varianten wie in pimc-bench.js (Code von dort uebernommen).
const path = require("path");
const fs = require("fs");
const W = require(path.join(__dirname, "../js/pimcWorker.js"));
const { GallerySolitaire, mulberry32, determinize, rolloutScore, uselessCompletionPenalty } = W;
const src = fs.readFileSync(path.join(__dirname, "pimc-bench.js"), "utf8");
eval(src.slice(src.indexOf("// ---------------------------------------------------------------- Ausgangslagen"),
  src.indexOf("// ---------------------------------------------------------------- Worker-Seite")));

const RANK = { 1: "A", 11: "J", 12: "Q", 13: "K" };
const SUIT = ["♣", "♦", "♥", "♠"];
const cardStr = (c) => (c ? SUIT[c.s] + (RANK[Math.abs(c.r)] || Math.abs(c.r)) : "--");
function moveStr(g, a) {
  if (a.type === "deal_stock") {
    const early = g.getLegalMoves().some((m) => m.type === "move_card");
    return `DEAL${early ? " (früh!)" : ""} [Stock ${g.stock.length}]`;
  }
  return `${cardStr(g._getCardAt(a.from))} ${a.from}->${a.to}`;
}
function clone(g) { const c = new GallerySolitaire(0); c.history = []; c._restoreState(g._saveState()); return c; }

// Random-Partie wie makeRandomBaselineAgent(alpha), mit Zugaufzeichnung
function randomGameRecorded(deal, alpha, rng) {
  const g = GallerySolitaire.fromDealOrder(deal);
  const moves = [];
  let guard = 0;
  while (guard++ < 5000) {
    const m = g.getLegalMoves(); if (!m.length) break;
    const deals = m.filter((x) => x.type === "deal_stock"), cards = m.filter((x) => x.type === "move_card");
    let a;
    if (alpha > 0 && rng() < alpha) a = deals[0] || cards[Math.floor(rng() * cards.length)] || m[0];
    else a = cards.length ? cards[Math.floor(rng() * cards.length)] : (deals[0] || m[0]);
    moves.push(a);
    g.executeMove(a, { undoable: false });
  }
  return { score: g.calculateCurrentScore(), moves };
}
function findWins(deal, want, alpha = 0.01) {
  const wins = [];
  for (let i = 0; i < 200000 && wins.length < want; i++) {
    const r = randomGameRecorded(deal, alpha, mulberry32(i * 2654435761 + 17));
    if (r.score === 0) wins.push({ seed: i, moves: r.moves });
  }
  return wins;
}
function stateAfter(deal, moves, k) {
  const g = GallerySolitaire.fromDealOrder(deal);
  for (let i = 0; i < k; i++) g.executeMove(moves[i], { undoable: false });
  return g;
}
function printBoard(g) {
  console.log("  Foundation (klein = falsch):");
  for (let row = 0; row < 3; row++) console.log("   " + g.f[row].map((c) => (c ? (c.r < 0 ? cardStr(c).toLowerCase() + "*" : cardStr(c)) : "··").padEnd(5)).join(""));
  const h = Math.max(...g.t.map((p) => p.length));
  console.log("  Tableau (unten -> oben):");
  for (let ti = 0; ti < 8; ti++) console.log(`   T${ti}: ${g.t[ti].map(cardStr).join(" ")}`);
  console.log(`  Stock: ${g.stock.length} Karten, Score ${g.calculateCurrentScore()}`);
}

const [cmd, lageS, a2, a3, a4] = process.argv.slice(2);
const lage = +lageS;
const { deal } = makeDeal(lage);
const cacheFile = path.join(__dirname, "results", `wins-lage${lage}.json`);
function getWins(n) {
  if (fs.existsSync(cacheFile)) { const c = JSON.parse(fs.readFileSync(cacheFile, "utf8")); if (c.length >= n) return c; }
  const w = findWins(deal, n);
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(w));
  return w;
}

if (cmd === "wins") {
  const wins = getWins(+a2 || 5);
  wins.forEach((w, i) => {
    const g = GallerySolitaire.fromDealOrder(deal);
    const early = [];
    const lines = w.moves.map((m, k) => { const s = moveStr(g, m); if (s.includes("früh")) early.push(k); g.executeMove(m, { undoable: false }); return `${String(k).padStart(3)}: ${s}  -> ${g.calculateCurrentScore()}`; });
    console.log(`\n=== Gewinn #${i} (Seed ${w.seed}), ${w.moves.length} Züge, frühe Deals bei Zug ${early.join(", ") || "-"}`);
    if (i === 0) console.log(lines.join("\n"));
  });
} else if (cmd === "takeover") {
  const w = getWins(+a2 + 1)[+a2];
  const ks = a3.split(",").map(Number);
  const seeds = +a4 || 3;
  for (const k of ks) {
    const scores = [];
    for (let s = 0; s < seeds; s++) {
      const g = stateAfter(deal, w.moves, k);
      const rng = mulberry32(k * 1009 + s * 7 + 1);
      let n = 0;
      while (n++ < 300) { const a = crnChooseMove(g, rng, 160); if (!a) break; g.executeMove(a, { undoable: false }); }
      scores.push(g.calculateCurrentScore());
    }
    console.log(`k=${String(k).padStart(3)}  (Score dort ${stateAfter(deal, w.moves, k).calculateCurrentScore()})  PIMC übernimmt -> ${scores.join(" ")}`);
  }
} else if (cmd === "eval") {
  const w = getWins(+a2 + 1)[+a2];
  const k = +a3, N = +a4 || 640;
  const g = stateAfter(deal, w.moves, k);
  printBoard(g);
  console.log(`  Random-Gewinnzug hier: ${moveStr(g, w.moves[k])}`);
  // Bewertung wie crnChooseMove, aber alle Kandidaten ausgeben (ohne Dedupe)
  const cand = g.getLegalMoves();
  const rng = mulberry32(4242);
  const seeds = Array.from({ length: N }, () => (rng() * 2 ** 32) >>> 0);
  const res = cand.map((a) => {
    const v = [];
    for (let i = 0; i < N; i++) { const r = mulberry32(seeds[i]); const h = determinize(g, r); h.executeMove(a, { undoable: false }); v.push(rolloutScore(h, r, 300)); }
    const m = v.reduce((x, y) => x + y, 0) / N;
    return { a, m, pen: uselessCompletionPenalty(g, a), min: Math.min(...v), win: v.filter((x) => x === 0).length / N };
  }).sort((x, y) => (x.m + x.pen) - (y.m + y.pen));
  console.log(`  PIMC-Bewertung (${N} Samples, Ø Rollout-Score, tiefer = besser):`);
  for (const r of res) console.log(`   ${moveStr(g, r.a).padEnd(30)} Ø ${(r.m + r.pen).toFixed(2).padStart(6)}  min ${String(r.min).padStart(3)}  Sieg-Anteil ${(100 * r.win).toFixed(1)} %`);
}
else if (cmd === "truth") {
  //   node docs/pimc-analyse.js truth <lage> <winIdx> <k> <zugFilter> [n] [samples]
  // "Wahrer" Wert eines Kandidaten: n zufaellige Stock-Reihenfolgen (gleich fuer
  // alle Kandidaten), Zug ausfuehren, dann PIMC (crn) bis zum Ende spielen.
  const w = getWins(+a2 + 1)[+a2];
  const k = +a3, filt = a4, n = +process.argv[7] || 24, S = +process.argv[8] || 160;
  const g0 = stateAfter(deal, w.moves, k);
  const a = g0.getLegalMoves().find((m) => moveStr(g0, m).startsWith(filt));
  if (!a) { console.log("Kein Zug passt zu", filt); process.exit(1); }
  const scores = [];
  for (let i = 0; i < n; i++) {
    const g = determinize(g0, mulberry32(50000 + i)); // gleiche Hypothese fuer alle Kandidaten
    g.executeMove(a, { undoable: false });
    const rng = mulberry32(90000 + i);
    let m = 0;
    while (m++ < 300) { const b = crnChooseMove(g, rng, S); if (!b) break; g.executeMove(b, { undoable: false }); }
    scores.push(g.calculateCurrentScore());
  }
  const mean = scores.reduce((x, y) => x + y, 0) / n;
  console.log(`${moveStr(g0, a).padEnd(26)} PIMC zu Ende: Ø ${mean.toFixed(2)}  Siege ${scores.filter((x) => x === 0).length}/${n}  [${scores.join(" ")}]`);
}
