// Freiheitsgrad-Lauf: viele Lagen je 1x mit PIMC (wie in der App) durchspielen,
// dazu die Random-Baseline, und den Freiheitsgrad (Sum log2 erreichbarer
// Stellungen pro Phase) neben Score und Rechenzeit festhalten.
// Aus www/ heraus aufrufen:
//
//   node docs/pimc-freedom.js [--deals 0-1000] [--random 1000] [--alpha 0.01]
//                             [--samples 160] [--threads 7] [--out datei.json]
//
// Ausgangslagen wie docs/pimc-bench.js (Lage d = mulberry32(1000+d), startbar).
// Ergebnis (alle Rohdaten) landet als JSON in docs/results/, dazu eine
// Zusammenfassung (Korrelationen, Quintile nach Freiheitsgrad) auf der Konsole.

const path = require("path");
const fs = require("fs");
const { Worker, isMainThread, parentPort } = require("worker_threads");
const W = require(path.join(__dirname, "../js/pimcWorker.js"));
const { mulberry32, runEvaluation, playOnePimcGame } = W;

// ---------------------------------------------------------------- Ausgangslagen
// identisch zu docs/pimc-bench.js
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
  if (dealt.some((c) => c.rank === 1)) return true;
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
  do {
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  } while (!(checkStartable(d) && checkFoundationHasChance(d)));
  return d.join(",");
}

// ---------------------------------------------------------------- Worker
function runTask({ d, nRandom, alpha, samples }) {
  const deal = makeDeal(d);
  const rnd = runEvaluation(deal, nRandom, alpha, () => {});
  const t = Date.now();
  const p = playOnePimcGame(deal, samples, 300, mulberry32((0x5eed + d) >>> 0));
  const ms = Date.now() - t;
  const ns = p.phaseStates;
  return {
    d, deal,
    rndScores: rnd.scores, rndMean: rnd.mean, rndMin: rnd.minimum,
    pimc: p.score, verified: p.movesVerified, pimcMs: ms,
    phaseStates: ns,
    capped: ns.some((n) => n < 0),
    bits: ns.reduce((s, n) => s + Math.log2(n < 0 ? 20000 : n), 0),
  };
}
if (!isMainThread) {
  parentPort.on("message", (t) => parentPort.postMessage(runTask(t)));
  return;
}

// ---------------------------------------------------------------- Main
const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i >= 0 ? process.argv[i + 1] : def; };
const [d0, d1] = arg("deals", "0-1000").split("-").map(Number);
const opt = { deals: [d0, d1], nRandom: +arg("random", 1000), alpha: +arg("alpha", 0.01), samples: +arg("samples", 160), threads: +arg("threads", 7) };
const outFile = arg("out", path.join(__dirname, "results", "freedom-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".json"));

const tasks = [];
for (let d = d0; d < d1; d++) tasks.push({ d, nRandom: opt.nRandom, alpha: opt.alpha, samples: opt.samples });
const rows = [];
const t0 = Date.now();
let next = 0;
const workers = Array.from({ length: Math.min(opt.threads, tasks.length) }, () => new Worker(__filename));

function save() { fs.writeFileSync(outFile, JSON.stringify({ opt, rows: rows.slice().sort((a, b) => a.d - b.d) })); }

function feed(w) {
  if (next >= tasks.length) { w.terminate(); return; }
  w.postMessage(tasks[next++]);
}
for (const w of workers) {
  w.on("message", (r) => {
    rows.push(r);
    if (rows.length % 10 === 0 || rows.length === tasks.length) {
      const el = (Date.now() - t0) / 1000;
      const eta = (el / rows.length) * (tasks.length - rows.length);
      console.log(`${rows.length}/${tasks.length}  ${el.toFixed(0)} s, Rest ~${(eta / 60).toFixed(0)} min`);
      save();
    }
    if (rows.length === tasks.length) summarize();
    feed(w);
  });
  feed(w);
}

function summarize() {
  save();
  const pctGE = (scores, x) => (100 * scores.filter((s) => s >= x).length) / scores.length;
  for (const r of rows) {
    r.pct = pctGE(r.rndScores, r.pimc);
    r.dead = r.rndMin === Math.max(...r.rndScores);
    r.rndSd = Math.sqrt(r.rndScores.reduce((s, x) => s + (x - r.rndMean) ** 2, 0) / r.rndScores.length);
  }
  const live = rows.filter((r) => !r.dead);
  const corr = (xs, ys) => {
    const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    return sxy / Math.sqrt(sxx * syy);
  };
  const B = live.map((r) => r.bits);
  const f = (x, w = 7, k = 1) => x.toFixed(k).padStart(w);
  console.log(`
${rows.length} Lagen, davon ${rows.length - live.length} tot (alle Random-Partien gleich), ${rows.filter((r) => r.capped).length} mit >20k-Phase, ${rows.filter((r) => !r.verified).length} Replay-Fehler
Korrelation Freiheit [bit] mit (lebende Lagen):
  PIMC-Score        ${f(corr(B, live.map((r) => r.pimc)), 6, 2)}
  Random-Mittel     ${f(corr(B, live.map((r) => r.rndMean)), 6, 2)}
  Random-Streuung   ${f(corr(B, live.map((r) => r.rndSd)), 6, 2)}
  Vorsprung PIMC (Random-Mittel - PIMC) ${f(corr(B, live.map((r) => r.rndMean - r.pimc)), 6, 2)}
  besser+gleich %   ${f(corr(B, live.map((r) => r.pct)), 6, 2)}
  Rechenzeit        ${f(corr(B, live.map((r) => r.pimcMs)), 6, 2)}

Quintile nach Freiheit:
   bit von-bis  |  n  | PIMC | Rnd-Mittel | Rnd-sd | Vorsprung | b+g % | s/Partie`);
  const sorted = live.slice().sort((a, b) => a.bits - b.bits);
  for (let q = 0; q < 5; q++) {
    const g = sorted.slice(Math.floor((q * sorted.length) / 5), Math.floor(((q + 1) * sorted.length) / 5));
    const m = (fn) => g.reduce((s, r) => s + fn(r), 0) / g.length;
    console.log(`${f(g[0].bits, 6)}-${f(g[g.length - 1].bits, 6).trim().padEnd(6)} |${String(g.length).padStart(4)} |${f(m((r) => r.pimc), 5)} |${f(m((r) => r.rndMean), 10)}  |${f(m((r) => r.rndSd), 7)} |${f(m((r) => r.rndMean - r.pimc), 9)}  |${f(m((r) => r.pct), 6)} |${f(m((r) => r.pimcMs / 1000), 8)}`);
  }
  console.log(`\nWandzeit ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${outFile}`);
}
