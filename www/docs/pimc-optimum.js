// Optimum und Loesbarkeit einer Lage bei bekanntem Stock (Hellseher-Spieler).
// Aus www/ heraus aufrufen:
//
//   node docs/pimc-optimum.js [--deals 0-100] [--beam 200] [--k 8] [--nodes 3e6]
//                             [--threads 7] [--ref docs/results/<bench>.json] [--out datei.json]
//
// Kennt man den Stock, ist das Spiel deterministisch; zu entscheiden ist nur, in welcher
// erreichbaren Stellung jeder Phase ausgeteilt wird (wie phasePlan in pimcWorker.js,
// AutoMoves laufen immer mit). Pro Lage zwei Verfahren:
//   1. Strahlsuche (solvBeam): pro Phase die besten B Austeil-Stellungen behalten,
//      bewertet mit dem besten von K Zufalls-Rollouts auf dem echten Stock.
//      Liefert eine gespielte Partie -> obere Schranke des Optimums (Replay geprueft).
//   2. Loesbarkeits-Suche (solvWin): Tiefensuche ueber alle Austeil-Stellungen
//      mit Memo, abgeschnitten, sobald solvWinCheck eine sicher haengende Karte findet.
//      Ergebnis: "loesbar" (Sieg gefunden), "unloesbar" (bewiesen) oder "offen" (Knotengrenze).
// Mit --ref (Benchmark-Lauf aus pimc-bench.js) werden PIMC- und Random-Werte daneben gestellt.
// Ergebnis (alle Rohdaten) landet als JSON in docs/results/.

const path = require("path");
const fs = require("fs");
const os = require("os");
const { Worker, isMainThread, parentPort } = require("worker_threads");
const W = require(path.join(__dirname, "../js/pimcWorker.js"));
// Verfahren (Strahlsuche, Tiefensuche, Siegpruefung) liegen in js/pimcWorker.js
// ("Loesbarkeit bei bekanntem Stock") - dieselben Funktionen nutzt die App fuer die Ampel.
const { GallerySolitaire, replayMoves, solvWin, solvBeam, PHASE_ABORT } = W;

// ---------------------------------------------------------------- Worker
function runTask(t) {
  const t0 = Date.now();
  const bm = solvBeam(GallerySolitaire.fromDealOrder(t.deal), t.beam, t.k, Infinity);
  const verified = replayMoves(t.deal, bm.path) === bm.score;
  const tBeam = Date.now() - t0;
  let win = bm.score === 0 ? "loesbar" : null, nodes = 0;
  if (!win) {
    const ctx = { nodes: 0, maxNodes: t.nodes, deadline: Infinity, memo: new Map() };
    const g = GallerySolitaire.fromDealOrder(t.deal);
    try { win = solvWin(g, ctx) ? "loesbar" : "unloesbar"; } catch (e) {
      if (e !== PHASE_ABORT) throw e;
      win = "offen";
    }
    nodes = ctx.nodes;
  }
  return { d: t.d, beam: bm.score, beamVerified: verified, beamMoves: bm.path.length, win, nodes,
    msBeam: tBeam, msSolve: Date.now() - t0 - tBeam };
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
const { makeDeal } = require("./pimc-bench.js");
const [dFrom, dTo] = arg("deals", "0-100").split("-").map(Number);
const opt = {
  dFrom, dTo, beam: +arg("beam", 200), k: +arg("k", 8), nodes: +arg("nodes", 3e6),
  threads: +arg("threads", Math.max(1, os.cpus().length - 1)),
};
const refFile = arg("ref", null);
const ref = refFile ? JSON.parse(fs.readFileSync(refFile, "utf8")) : null;
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outFile = arg("out", path.join(__dirname, "results", `optimum-${stamp}.json`));

const tasks = [];
for (let d = dFrom; d < dTo; d++) tasks.push(Object.assign({ d, deal: makeDeal(d).deal }, opt));

const results = [];
const t0 = Date.now();
let next = 0;
const workers = Array.from({ length: Math.min(opt.threads, tasks.length) }, () => new Worker(__filename));
function feed(w) {
  if (next < tasks.length) w.postMessage(tasks[next++]);
  else w.terminate();
}
workers.forEach((w) => {
  w.on("message", (r) => {
    results.push(r);
    process.stderr.write(`\r${results.length}/${tasks.length} Lagen, ${((Date.now() - t0) / 1000).toFixed(0)} s   `);
    feed(w);
    if (results.length === tasks.length) report();
  });
  w.on("error", (e) => { console.error(e); process.exit(1); });
  feed(w);
});

function report() {
  process.stderr.write("\n");
  results.sort((a, b) => a.d - b.d);
  const refRow = (d) => (ref ? ref.rows.find((x) => x.d === d) : null);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log("Lage  Beam  Sieg        Knoten   Beam s  Suche s" + (ref ? "   PIMC Ø  PIMC min  Rnd min" : ""));
  for (const r of results) {
    const x = refRow(r.d);
    console.log(`${String(r.d).padStart(4)}  ${String(r.beam).padStart(4)}${r.beamVerified ? " " : "!"} ${r.win.padEnd(9)}  ${String(r.nodes).padStart(8)}  ${(r.msBeam / 1000).toFixed(1).padStart(7)}  ${(r.msSolve / 1000).toFixed(1).padStart(7)}` +
      (x ? `   ${x.pimcMean.toFixed(1).padStart(6)}  ${String(Math.min(...x.pimc)).padStart(8)}  ${String(x.rndMin).padStart(7)}` : ""));
  }
  const n = (w) => results.filter((r) => r.win === w).length;
  const summary = {
    deals: results.length, loesbar: n("loesbar"), unloesbar: n("unloesbar"), offen: n("offen"),
    beamWins: results.filter((r) => r.beam === 0).length,
    beamMean: mean(results.map((r) => r.beam)),
    replayErrors: results.filter((r) => !r.beamVerified).map((r) => r.d),
    wallSec: (Date.now() - t0) / 1000,
  };
  if (ref) {
    const rows = results.map((r) => ({ r, x: refRow(r.d) })).filter((o) => o.x && !o.x.dead);
    const won = rows.filter((o) => o.r.win === "loesbar");
    summary.ref = path.basename(refFile);
    summary.pimcMean = mean(rows.map((o) => o.x.pimcMean));
    summary.pimcWinRate = 100 * mean(rows.map((o) => o.x.pimc.filter((s) => s === 0).length / o.x.pimc.length));
    summary.pimcWinRateSolvable = 100 * mean(won.map((o) => o.x.pimc.filter((s) => s === 0).length / o.x.pimc.length));
    summary.solvableNeverWonByPimc = won.filter((o) => !o.x.pimc.includes(0)).map((o) => o.r.d);
    // beste bekannte Partie je Lage: Strahlsuche, PIMC, Random (alle tatsaechlich gespielt)
    summary.bestKnownMean = mean(rows.map((o) => (o.r.win === "loesbar" ? 0 : Math.min(o.r.beam, ...o.x.pimc, o.x.rndMin))));
  }
  console.log(JSON.stringify(summary, null, 1));
  fs.writeFileSync(outFile, JSON.stringify({ opt, summary, rows: results }, null, 1));
  console.log("->", outFile);
}
