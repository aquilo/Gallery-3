// Ampel "Loesbarkeit bei bekanntem Stock" wie in der App (checkSolvable, s. pimcWorker.js)
// fuer eine Reihe von Lagen und Zeitlimits messen. Aus www/ heraus aufrufen:
//
//   node docs/pimc-ampel.js [--deals 0-100] [--time 45000] [--threads 4]
//                           [--ref docs/results/<bench>.json] [--out datei.json]
//
// Pro Lage ein Lauf mit dem Zeitlimit; da checkSolvable bei einem Sieg sofort abbricht,
// ergibt "Zeit bis gruen" (solveMs) gleich auch die Zahlen fuer kuerzere Limits -
// allerdings nur naeherungsweise, weil die Phasen (Tiefensuche 20 %, dann Strahlsuchen)
// sich mit dem Limit mitverschieben. Mit --ref (pimc-bench.js) zaehlt wie in der App
// zusaetzlich als gruen, wenn Random-Minimum oder PIMC 0 erreicht.
// Threads wie bei der frueheren Messung (4 parallel), damit die Zeiten vergleichbar sind.

const path = require("path");
const fs = require("fs");
const { Worker, isMainThread, parentPort } = require("worker_threads");
const W = require(path.join(__dirname, "../js/pimcWorker.js"));

if (!isMainThread) {
  parentPort.on("message", (t) => {
    const r = W.checkSolvable(t.deal, { timeMs: t.time });
    const mem = process.memoryUsage();
    parentPort.postMessage({ d: t.d, solvable: r.solvable, solveVia: r.solveVia, solveMs: r.solveMs,
      rssMB: Math.round(mem.rss / 1e6) });
  });
  return;
}

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const { makeDeal } = require("./pimc-bench.js");
const [dFrom, dTo] = arg("deals", "0-100").split("-").map(Number);
const opt = { dFrom, dTo, time: +arg("time", 45000), threads: +arg("threads", 4) };
const refFile = arg("ref", null);
const ref = refFile ? JSON.parse(fs.readFileSync(refFile, "utf8")) : null;
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outFile = arg("out", path.join(__dirname, "results", `ampel-${opt.time / 1000}s-${stamp}.json`));

const tasks = [];
for (let d = dFrom; d < dTo; d++) tasks.push({ d, deal: makeDeal(d).deal, time: opt.time });

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
  const viaRef = (d) => { const x = refRow(d); return !!x && (x.rndMin === 0 || (x.pimc || []).includes(0)); };
  const limits = [4000, 8000, 15000, 30000, opt.time].filter((v, i, a) => v <= opt.time && a.indexOf(v) === i);
  const byLimit = limits.map((L) => {
    const green = results.filter((r) => r.solvable === 1 && r.solveMs <= L);
    const red = results.filter((r) => r.solvable === 0 && r.solveMs <= L);
    const extra = results.filter((r) => !(r.solvable === 1 && r.solveMs <= L) && !(r.solvable === 0 && r.solveMs <= L) && viaRef(r.d));
    return { limitS: L / 1000, green: green.length, extraViaRef: extra.length, red: red.length,
      orange: results.length - green.length - red.length - extra.length };
  });
  const greenMs = results.filter((r) => r.solvable === 1).map((r) => r.solveMs).sort((a, b) => a - b);
  const q = (p) => (greenMs.length ? greenMs[Math.min(greenMs.length - 1, Math.floor(p * greenMs.length))] / 1000 : null);
  const late = results.filter((r) => r.solvable === 1 && r.solveMs > 15000).map((r) => ({ d: r.d, s: r.solveMs / 1000, via: r.solveVia }));
  const summary = { deals: results.length, timeS: opt.time / 1000, threads: opt.threads, byLimit,
    greenMedianS: q(0.5), green90S: q(0.9), lateGreens: late,
    maxRssMB: Math.max(...results.map((r) => r.rssMB)), wallSec: (Date.now() - t0) / 1000,
    ref: refFile ? path.basename(refFile) : null };
  console.log(JSON.stringify(summary, null, 1));
  fs.writeFileSync(outFile, JSON.stringify({ opt, summary, rows: results }, null, 1));
  console.log("->", outFile);
}
