// Benchmark: PIMC-Varianten vs. Random-Baseline auf festen Ausgangslagen.
// Aus www/ heraus aufrufen:
//
//   node docs/pimc-bench.js [--variant current] [--deals 0-100] [--reps 6]
//                           [--random 1000] [--alpha 0.01] [--samples 160]
//                           [--threads 7] [--ref docs/results/<referenz>.json] [--out datei.json]
//
// Ausgangslagen: Lage d = Mischung mit mulberry32(1000+d), so lange
// weitergemischt, bis sie wie in galleryjs.js newGame() startbar ist
// (checkStartable() && checkFoundationHasChance()).
//   - Random:  n Partien mit makeRandomBaselineAgent(alpha) (wie im Statistik-Tab)
//   - PIMC:    reps Partien der gewaehlten Variante (s. VARIANTS), feste RNG-Seeds
//              pro (Lage, rep) -> Eigenstreuung von PIMC
// Hauptmass "besser+gleich %" = Anteil Random-Partien mit Score >= PIMC-Score (wie
// "better-or-equal %" in Statistics.js; hoeher = PIMC besser).
// Nebenindikator: Anteil PIMC-Partien mit Score <= Random-Minimum.
// Lagen, in denen jede Random-Partie gleich endet ("tot"), zaehlen nicht.
// Mit --ref: gepaarter Vergleich Lage fuer Lage gegen einen frueheren Lauf.
// Ergebnis (alle Rohdaten) landet als JSON in docs/results/.

const path = require("path");
const fs = require("fs");
const os = require("os");
const { Worker, isMainThread, parentPort } = require("worker_threads");
const W = require(path.join(__dirname, "../js/pimcWorker.js"));
const { GallerySolitaire, mulberry32, playOneRandomGame, playOnePimcGame,
  determinize, rolloutScore, uselessCompletionPenalty } = W;

// ---------------------------------------------------------------- Ausgangslagen
// Kodierung wie window.currentDealOrder: suit*13 + (rank-1), Index 103 wird
// zuerst ausgeteilt (Foundation-Platz i = Index 103-i, Basis int(i/8)+2).
function checkStartable(d) {
  for (let i = 0; i < 24; i++) {
    const rank = (d[103 - i] % 13) + 1;
    if (rank === 1 || rank === Math.floor(i / 8) + 2) return true;
  }
  return false;
}
function checkFoundationHasChance(d) {
  const dealt = [];
  for (let i = 0; i < 24; i++) {
    const v = d[103 - i];
    dealt.push({ i, rank: (v % 13) + 1, suit: Math.floor(v / 13), base: Math.floor(i / 8) + 2 });
  }
  if (dealt.some((c) => c.rank === 1)) return true; // As -> Luecke
  for (const ok of dealt.filter((c) => c.rank === c.base)) {
    for (const c of dealt) {
      const diff = c.rank - ok.rank;
      if (c.i !== ok.i && c.suit === ok.suit && (diff === 3 || diff === 6 || diff === 9)) return true;
    }
  }
  return false;
}
const inv = { 0: 0, 2: 1, 3: 2, 1: 3 };
function makeDeal(dIdx) {
  const r = mulberry32(1000 + dIdx); const d = [];
  for (let k = 0; k < 2; k++) for (let s = 0; s < 4; s++) for (let rk = 1; rk <= 13; rk++) d.push(inv[s] * 13 + rk - 1);
  let shuffles = 0;
  do {
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    shuffles++;
  } while (!(checkStartable(d) && checkFoundationHasChance(d)));
  return { deal: d.join(","), shuffles };
}

// ---------------------------------------------------------------- PIMC-Varianten
// Jede Variante: (dealOrder, samples, rng) -> { score, nMoves, verified }
function playWith(chooser, deal, samples, rng) {
  const g = GallerySolitaire.fromDealOrder(deal);
  let k = 0;
  while (k++ < 300) {
    const a = chooser(g, rng, samples);
    if (!a) break;
    g.executeMove(a, { undoable: false });
  }
  return { score: g.calculateCurrentScore(), nMoves: k - 1, verified: true };
}

// "crn": wie pimcChooseMove, aber (1) Common Random Numbers - alle Kandidaten
// werden auf denselben Stock-Mischungen/Rollout-Zufallszahlen bewertet, und
// (2) Dedupe - Zuege derselben Karte auf Slots mit identischem Inhalt
// (z.B. zwei leere Slots) werden nur einmal bewertet.
// Heuristischer Rollout (Gewichte per Schnelltest der Policy als eigenstaendiger
// Spieler ermittelt: Random 59 % -> Heuristik 78 % "besser+gleich"):
//   - falsche Foundation-Karte wegspielen (Slot wird frei)         +3
//   - Tableau-Karte, die etwas aufdeckt                            +1
//     ... und die aufgedeckte Karte ist direkt spielbar            +2
//     ... je Karte im Stapel (tiefe Stapel zuerst abtragen)        +0.2
//   - je Nachfolger (gleiche Farbe, Rang +3/+6/+9) spielbereit     +3
// Gleichstand -> Zufall; mit Wahrscheinlichkeit eps ganz zufaelliger Kartenzug.
// Ausgeteilt wird wie im Random-Rollout nur, wenn kein Kartenzug moeglich ist.
function heurMoveScore(g, a, movables) {
  let s = 0;
  if (a.from[0] === "F") {
    s += 3;
  } else {
    const pile = g.t[+a.from.slice(1)];
    const n = pile.length;
    if (n >= 2) {
      const below = pile[n - 2];
      s += 1 + 0.2 * n;
      const row = g._rowForRank(below.r);
      for (let slot = 0; slot < 8; slot++) {
        if (g._canPlaceCorrect(row, g.f[row][slot], below)) { s += 2; break; }
      }
    }
  }
  const c = g._getCardAt(a.from);
  for (let r = Math.abs(c.r) + 3; r <= 13; r += 3) {
    if (!movables.some((m) => m.from !== a.from && Math.abs(m.card.r) === r && m.card.s === c.s)) break;
    s += 3;
  }
  return s;
}
function heurChooseRolloutMove(g, rng, eps) {
  const moves = g.getLegalMoves();
  if (!moves.length) return null;
  const cards = moves.filter((m) => m.type === "move_card");
  if (!cards.length) return moves[0];
  if (eps > 0 && rng() < eps) return cards[Math.floor(rng() * cards.length)];
  const movables = g._iterMovables();
  let best = [], bs = -Infinity;
  for (const a of cards) {
    const s = heurMoveScore(g, a, movables);
    if (s > bs + 1e-9) { bs = s; best = [a]; } else if (Math.abs(s - bs) <= 1e-9) best.push(a);
  }
  return best[Math.floor(rng() * best.length)];
}
function heurRolloutScore(g, rng, maxMoves, eps) {
  let k = 0;
  while (k++ < maxMoves) {
    const a = heurChooseRolloutMove(g, rng, eps);
    if (!a) break;
    g.executeMove(a, { undoable: false });
  }
  return g.calculateCurrentScore();
}

// Rollout mit Fruehausteilen: mit Wahrscheinlichkeit alpha wird ausgeteilt,
// obwohl Kartenzuege moeglich sind (wie makeRandomBaselineAgent), sonst
// zufaelliger Kartenzug wie im Original-Rollout.
function alphaRolloutScore(g, rng, maxMoves, alpha) {
  let k = 0;
  while (k++ < maxMoves) {
    const moves = g.getLegalMoves();
    if (!moves.length) break;
    const cards = moves.filter((m) => m.type === "move_card");
    let a;
    if (!cards.length) a = moves[0];
    else if (g.stock.length && rng() < alpha) a = { type: "deal_stock" };
    else a = cards[Math.floor(rng() * cards.length)];
    g.executeMove(a, { undoable: false });
  }
  return g.calculateCurrentScore();
}
function plainClone(g) {
  const c = new GallerySolitaire(0);
  c.history = [];
  c._restoreState(g._saveState());
  return c;
}
// Bestes von k Rollouts auf derselben Stock-Hypothese ("1000 Versuche, das
// Beste zaehlt" im Kleinen).
function bestOfRollouts(h, rng, k, alpha) {
  let best = Infinity;
  for (let i = 0; i < k; i++) best = Math.min(best, alphaRolloutScore(i < k - 1 ? plainClone(h) : h, rng, 300, alpha));
  return best;
}

// Bewertet alle (deduplizierten) Kandidaten wie crnChooseMove und liefert
// [{ a, m }] (m = Ø Rollout-Score + Penalty, tiefer = besser).
function crnEvaluate(game, rng, numSamples, rollout = (h, r) => rolloutScore(h, r, 300)) {
  let cand = game.getLegalMoves();
  if (cand.length <= 1) return cand.map((a) => ({ a, m: 0 }));
  const seen = new Set();
  cand = cand.filter((a) => {
    if (a.type !== "move_card") return true;
    const p = game._parseLoc(a.to);
    const key = a.from + "|" + JSON.stringify(game.f[p.row][p.slot]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (cand.length === 1) return [{ a: cand[0], m: 0 }];
  const seeds = Array.from({ length: numSamples }, () => (rng() * 2 ** 32) >>> 0);
  return cand.map((a) => {
    let total = 0;
    for (let i = 0; i < numSamples; i++) {
      const r = mulberry32(seeds[i]);
      const h = determinize(game, r);
      h.executeMove(a, { undoable: false });
      total += rollout(h, r);
    }
    return { a, m: total / numSamples + uselessCompletionPenalty(game, a) };
  });
}
function crnChooseMove(game, rng, numSamples, rollout) {
  const ev = crnEvaluate(game, rng, numSamples, rollout);
  let best = null, bestMean = Infinity;
  for (const e of ev) if (e.m < bestMean) { bestMean = e.m; best = e.a; }
  return best;
}

// "n2" (Nested MC Stufe 2, nur bei knappen Entscheidungen): zuerst wie crn.
// Liegen weitere Kandidaten hoechstens delta hinter dem besten, werden die
// besten k davon nachbewertet: auf H gemeinsamen Stock-Hypothesen spielt ein
// inneres crn-PIMC mit S Samples die Partie nach dem Kandidatenzug zu Ende.
const n2Stats = { triggered: 0, changed: 0 };
function n2ChooseMove(game, rng, numSamples, o) {
  const ev = crnEvaluate(game, rng, numSamples);
  if (!ev.length) return null;
  ev.sort((x, y) => x.m - y.m);
  let close = ev.filter((e) => e.m <= ev[0].m + o.delta).slice(0, o.k);
  if (close.length < 2) return ev[0].a;
  if (o.twinOnly) {
    // nur Zwillings-Konkurrenz (gleiche Karte aus verschiedenen Quellen) bzw.
    // Kartenzug vs. fruehes Austeilen nachbewerten
    const key = (a) => { if (a.type !== "move_card") return "DEAL"; const c = game._getCardAt(a.from); return Math.abs(c.r) + "/" + c.s; };
    const keys = close.map((e) => key(e.a));
    const hit = keys.some((k, i) => k === "DEAL" || keys.indexOf(k) !== i);
    if (!hit) return ev[0].a;
  }
  n2Stats.triggered++;
  const hs = Array.from({ length: o.H }, () => [(rng() * 2 ** 32) >>> 0, (rng() * 2 ** 32) >>> 0]);
  let best = null, bestMean = Infinity;
  for (const e of close) {
    let total = 0;
    for (const [hSeed, iSeed] of hs) {
      const h = determinize(game, mulberry32(hSeed));
      h.executeMove(e.a, { undoable: false });
      const ir = mulberry32(iSeed);
      let n = 0;
      while (n++ < 300) { const b = crnChooseMove(h, ir, o.S); if (!b) break; h.executeMove(b, { undoable: false }); }
      total += h.calculateCurrentScore();
    }
    const m = total / o.H + uselessCompletionPenalty(game, e.a);
    if (m < bestMean) { bestMean = m; best = e.a; }
  }
  if (best !== ev[0].a) n2Stats.changed++;
  return best;
}
function playN2(deal, samples, rng, o) {
  n2Stats.triggered = 0; n2Stats.changed = 0;
  const r = playWith((g, rr, n) => n2ChooseMove(g, rr, n, o), deal, samples, rng);
  return { ...r, n2Triggered: n2Stats.triggered, n2Changed: n2Stats.changed };
}

// Urspruengliches pimcChooseMove aus pimcWorker.js (ohne CRN/Dedupe)
function legacyChooseMove(game, rng, numSamples) {
  const candidates = game.getLegalMoves();
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  let best = null, bestMean = Infinity;
  for (const action of candidates) {
    let total = 0;
    for (let i = 0; i < numSamples; i++) {
      const h = determinize(game, rng);
      h.executeMove(action, { undoable: false });
      total += rolloutScore(h, rng, 300);
    }
    const mean = total / numSamples + uselessCompletionPenalty(game, action);
    if (mean < bestMean) { bestMean = mean; best = action; }
  }
  return best;
}

const VARIANTS = {
  // Stand vor 14.10.2026 (Kopie, damit die Referenz reproduzierbar bleibt)
  current: (deal, samples, rng) => playWith(legacyChooseMove, deal, samples, rng),
  // aktueller pimcWorker.js (seit 14.10.2026 = crn) inkl. Replay-Gegenprobe
  worker: (deal, samples, rng) => {
    const r = playOnePimcGame(deal, samples, 300, rng);
    return { score: r.score, nMoves: r.moves.length, verified: r.movesVerified };
  },
  crn: (deal, samples, rng) => playWith(crnChooseMove, deal, samples, rng),
  "crn-a01": (deal, samples, rng) => playWith(
    (g, r, n) => crnChooseMove(g, r, n, (h, rr) => alphaRolloutScore(h, rr, 300, 0.01)), deal, samples, rng),
  // samples/4 Hypothesen x 4 Rollouts -> gleiches Rollout-Budget wie crn
  "crn-best4": (deal, samples, rng) => playWith(
    (g, r, n) => crnChooseMove(g, r, Math.max(1, Math.round(n / 4)), (h, rr) => bestOfRollouts(h, rr, 4, 0.01)), deal, samples, rng),
  "crn-n2": (deal, samples, rng) => playN2(deal, samples, rng, { delta: 2, k: 3, H: 32, S: 16 }),
  "crn-n2t": (deal, samples, rng) => playN2(deal, samples, rng, { delta: 2, k: 3, H: 32, S: 16, twinOnly: true }),
  "crn-heur": (deal, samples, rng) => playWith(
    (g, r, n) => crnChooseMove(g, r, n, (h, rr) => heurRolloutScore(h, rr, 300, 0)), deal, samples, rng),
  "crn-heur20": (deal, samples, rng) => playWith(
    (g, r, n) => crnChooseMove(g, r, n, (h, rr) => heurRolloutScore(h, rr, 300, 0.2)), deal, samples, rng),
};

// ---------------------------------------------------------------- Worker-Seite
function runTask(t) {
  const { deal } = makeDeal(t.d);
  const t0 = Date.now();
  if (t.kind === "random") {
    const scores = [];
    for (let i = 0; i < t.n; i++) scores.push(playOneRandomGame(deal, t.alpha, mulberry32((t.d * 100003 + i * 2654435761) >>> 0)));
    return { ...t, scores, ms: Date.now() - t0 };
  }
  const r = VARIANTS[t.variant](deal, t.samples, mulberry32((t.d * 7919 + t.rep * 104729 + 1) >>> 0));
  return { ...t, ...r, ms: Date.now() - t0 };
}
if (!isMainThread) {
  parentPort.on("message", (t) => parentPort.postMessage(runTask(t)));
  return;
}

// ---------------------------------------------------------------- Haupt-Thread
function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const [dFrom, dTo] = arg("deals", "0-100").split("-").map(Number);
const opt = {
  variant: arg("variant", "current"), dFrom, dTo,
  nRandom: +arg("random", 1000), alpha: +arg("alpha", 0.01),
  reps: +arg("reps", 6), samples: +arg("samples", 160),
  threads: +arg("threads", Math.max(1, os.cpus().length - 1)),
};
if (!VARIANTS[opt.variant]) {
  console.error(`Unbekannte Variante "${opt.variant}". Vorhanden: ${Object.keys(VARIANTS).join(", ")}`);
  process.exit(1);
}
const refFile = arg("ref", null);
const ref = refFile ? JSON.parse(fs.readFileSync(refFile, "utf8")) : null;
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outFile = arg("out", path.join(__dirname, "results", `bench-${opt.variant}-${stamp}.json`));

const tasks = [];
for (let d = dFrom; d < dTo; d++) {
  for (let rep = 0; rep < opt.reps; rep++) tasks.push({ kind: "pimc", variant: opt.variant, d, rep, samples: opt.samples });
  tasks.push({ kind: "random", d, n: opt.nRandom, alpha: opt.alpha });
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const median = (a) => { const s = [...a].sort((x, y) => x - y); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const pctGE = (scores, x) => (100 * scores.filter((s) => s >= x).length) / scores.length;

const results = [];
const t0 = Date.now();
let next = 0, done = 0;
const workers = Array.from({ length: Math.min(opt.threads, tasks.length) }, () => new Worker(__filename));
function feed(w) {
  if (next < tasks.length) w.postMessage(tasks[next++]);
  else w.terminate();
}
workers.forEach((w) => {
  w.on("message", (r) => {
    results.push(r); done++;
    process.stderr.write(`\r${done}/${tasks.length} Tasks, ${((Date.now() - t0) / 1000).toFixed(0)} s   `);
    feed(w);
    if (done === tasks.length) report();
  });
  w.on("error", (e) => { console.error(e); process.exit(1); });
  feed(w);
});

function report() {
  process.stderr.write("\n");
  const rows = [];
  for (let d = dFrom; d < dTo; d++) {
    const { deal, shuffles } = makeDeal(d);
    const rnd = results.find((r) => r.kind === "random" && r.d === d).scores;
    const pimc = results.filter((r) => r.kind === "pimc" && r.d === d).sort((a, b) => a.rep - b.rep);
    const ps = pimc.map((p) => p.score);
    const rndMin = Math.min(...rnd);
    const histo = new Array(97).fill(0);
    rnd.forEach((s) => histo[s]++);
    rows.push({
      d, deal, shuffles,
      dead: rndMin === Math.max(...rnd), // jede Random-Partie gleich -> Lage ohne Aussagekraft
      rndMean: mean(rnd), rndMedian: median(rnd), rndMin, rndWin: (100 * rnd.filter((s) => s === 0).length) / rnd.length,
      pimc: ps, pimcMean: mean(ps), pimcSd: sd(ps),
      pctEach: ps.map((s) => pctGE(rnd, s)),
      pct: mean(ps.map((s) => pctGE(rnd, s))),
      leMin: ps.filter((s) => s <= rndMin).length,
      n2Triggered: pimc[0].n2Triggered !== undefined ? mean(pimc.map((p) => p.n2Triggered)) : undefined,
      n2Changed: pimc[0].n2Changed !== undefined ? mean(pimc.map((p) => p.n2Changed)) : undefined,
      pimcMs: mean(pimc.map((p) => p.ms)), verified: pimc.every((p) => p.verified),
      histo,
    });
  }

  const refRows = ref ? new Map(ref.rows.map((r) => [r.d, r])) : null;
  const f1 = (x, w = 6) => x.toFixed(1).padStart(w);
  console.log(`\nVariante "${opt.variant}"${ref ? `, Referenz "${ref.opt.variant}" (${path.basename(refFile)})` : ""}`);
  console.log(`Deal | Rnd  Ø    Min | PIMC-Scores${" ".repeat(Math.max(0, opt.reps * 3 - 11))} | Ø b+g % | <=Min${ref ? " | Ref b+g %   Diff" : ""}`);
  for (const r of rows) {
    const rr = refRows && refRows.get(r.d);
    const cmp = rr ? (rr.deal === r.deal ? ` |${f1(rr.pct, 7)}${f1(r.pct - rr.pct, 8)}` : " | (andere Lage!)") : (ref ? " | -" : "");
    console.log(`${String(r.d).padStart(4)} |${f1(r.rndMean)}${String(r.rndMin).padStart(5)} | ${r.pimc.map((s) => String(s).padStart(3)).join("").padEnd(Math.max(11, opt.reps * 3))} |${f1(r.pct, 7)}  | ${r.leMin}/${r.pimc.length}${cmp}${r.dead ? "  (tot)" : ""}${r.verified ? "" : "  !replay"}`);
  }

  const live = rows.filter((r) => !r.dead);
  const pcts = live.map((r) => r.pct);
  const allP = live.flatMap((r) => r.pimc);
  const summary = {
    deals: live.length, deadDeals: rows.filter((r) => r.dead).map((r) => r.d), pimcGames: allP.length,
    reshuffledDeals: rows.filter((r) => r.shuffles > 1).map((r) => r.d),
    // Hauptmass: Anteil Random-Partien, die PIMC uebertrifft oder mit ihm gleichzieht
    betterOrEqualPct: mean(pcts), betterOrEqualPctSE: sd(pcts) / Math.sqrt(pcts.length),
    betterOrEqualPctMedian: median(pcts),
    // Nebenindikator: PIMC-Partien mit Score <= bestem Random-Ergebnis
    leRndMinPct: (100 * live.reduce((a, r) => a + r.leMin, 0)) / allP.length,
    leRndMinDeals: (100 * live.filter((r) => r.leMin > 0).length) / live.length,
    rndMean: mean(live.map((r) => r.rndMean)), pimcMean: mean(allP),
    rndWinRate: mean(live.map((r) => r.rndWin)), pimcWinRate: (100 * allP.filter((s) => s === 0).length) / allP.length,
    pimcSelfSd: mean(live.map((r) => r.pimcSd)),
    pimcSecPerGame: mean(rows.map((r) => r.pimcMs)) / 1000,
    n2TriggeredPerGame: rows[0].n2Triggered !== undefined ? mean(rows.map((r) => r.n2Triggered)) : undefined,
    n2ChangedPerGame: rows[0].n2Changed !== undefined ? mean(rows.map((r) => r.n2Changed)) : undefined,
    wallSec: (Date.now() - t0) / 1000,
  };
  const s = summary;
  console.log(`
Zusammenfassung "${opt.variant}": ${s.deals} Lagen (ohne tote Lagen ${s.deadDeals.join(", ") || "-"}), ${s.pimcGames} PIMC-Partien, ${opt.nRandom} Random-Partien/Lage
  (neu gemischt, da nicht startbar: ${s.reshuffledDeals.length} Lagen${s.reshuffledDeals.length ? ": " + s.reshuffledDeals.join(", ") : ""})

  HAUPTMASS  PIMC besser oder gleich wie Random:  Ø ${s.betterOrEqualPct.toFixed(1)} % ± ${s.betterOrEqualPctSE.toFixed(1)} (SE), Median ${s.betterOrEqualPctMedian.toFixed(1)} %
  NEBEN      PIMC <= Random-Minimum:               ${s.leRndMinPct.toFixed(1)} % der PIMC-Partien (in ${s.leRndMinDeals.toFixed(0)} % der Lagen mind. einmal)

  Info: Ø Score Random ${s.rndMean.toFixed(1)} / PIMC ${s.pimcMean.toFixed(1)}; Siegrate Random ${s.rndWinRate.toFixed(1)} % / PIMC ${s.pimcWinRate.toFixed(1)} %
        PIMC-Eigenstreuung sd ${s.pimcSelfSd.toFixed(1)}; ${s.pimcSecPerGame.toFixed(1)} s/PIMC-Partie, total ${s.wallSec.toFixed(0)} s${s.n2TriggeredPerGame !== undefined ? `
        Stufe 2: ${s.n2TriggeredPerGame.toFixed(1)} Auslösungen/Partie, davon ${s.n2ChangedPerGame.toFixed(1)} mit anderem Zug als Stufe 1` : ""}`);

  if (ref) {
    // Gepaart: nur Lagen, die in beiden Laeufen identisch und nicht tot sind
    const pairs = live.map((r) => [r, refRows.get(r.d)]).filter(([r, rr]) => rr && rr.deal === r.deal && !rr.dead);
    if (ref.opt.nRandom !== opt.nRandom || ref.opt.alpha !== opt.alpha) {
      console.log("\n  ACHTUNG: Random-Massstab der Referenz weicht ab (random/alpha) -> Vergleich nicht sauber.");
    }
    const dPct = pairs.map(([r, rr]) => r.pct - rr.pct);
    const dMin = pairs.map(([r, rr]) => 100 * (r.leMin / r.pimc.length - rr.leMin / rr.pimc.length));
    const se = sd(dPct) / Math.sqrt(dPct.length);
    const better = dPct.filter((x) => x > 0.05).length, worse = dPct.filter((x) => x < -0.05).length;
    summary.compare = {
      ref: path.basename(refFile), refVariant: ref.opt.variant, pairedDeals: pairs.length,
      diffPct: mean(dPct), diffPctSE: se, diffLeMin: mean(dMin),
      dealsBetter: better, dealsWorse: worse, dealsEqual: pairs.length - better - worse,
    };
    const c = summary.compare;
    const verdict = Math.abs(c.diffPct) < 2 * se ? "nicht signifikant (|Diff| < 2 SE)" : (c.diffPct > 0 ? "BESSER (> 2 SE)" : "SCHLECHTER (> 2 SE)");
    console.log(`
Vergleich "${opt.variant}" − "${c.refVariant}" (gepaart über ${c.pairedDeals} identische Lagen)
  HAUPTMASS  Diff besser+gleich %:  ${c.diffPct >= 0 ? "+" : ""}${c.diffPct.toFixed(1)} ± ${se.toFixed(1)} (SE)  -> ${verdict}
  NEBEN      Diff <= Random-Min:     ${c.diffLeMin >= 0 ? "+" : ""}${c.diffLeMin.toFixed(1)} Prozentpunkte
  Lagen besser / gleich / schlechter: ${c.dealsBetter} / ${c.dealsEqual} / ${c.dealsWorse}`);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ opt, summary, rows }));
  console.log(`\n-> ${path.relative(process.cwd(), outFile)}`);
}
