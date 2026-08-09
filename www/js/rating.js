// rating.js — pure JavaScript

// Logit-Glättung: EWMA auf log(p/(1-p)) statt direkt auf dem Prozentwert,
// damit Auf- und Abwärtsbewegungen nahe 0%/100% symmetrischer ausfallen
// (auf der reinen Prozentskala schrumpft der Spielraum nach oben künstlich,
// je näher man an 100% ist).
const LOGIT_EPS = 0.005; // vermeidet ±Infinity bei genau 0% / 100%

function clipUnit(p) {
  return Math.min(1 - LOGIT_EPS, Math.max(LOGIT_EPS, p));
}

function logit(p) {
  const c = clipUnit(p);
  return Math.log(c / (1 - c));
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function computeIndicators(r) {
  const Solvable = (r.player === 0) || (r.minimum === 0);
  const SolvedGivenSolvable = Solvable ? (r.player === 0 ? 1 : 0) : null;
  const BetterThanMean = r.player <= r.mean ? 1 : 0;
  const Percentile_p = (r.equal + r.more) / 100;
  const BestResult = r.player <= r.minimum ? 1 : 0;

  return {
    Solvable,
    SolvedGivenSolvable,
    BetterThanMean,
    Percentile_p,
    BestResult
  };
}

function rollingN(values, N) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - (N - 1));
    const slice = values.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    out.push(avg);
  }
  return out;
}

// Hauptfunktion
function computeRatings(rows, cfg) {
  const data = rows.slice().sort((a, b) =>
    a.datetime < b.datetime ? -1 : a.datetime > b.datetime ? 1 : 0
  );

  const tmp = data.map(r => ({
    r,
    ind: computeIndicators(r)
  }));

  const out = [];
  let ewmaLogit = logit((cfg.start_ewma_pct ?? 50) / 100);
  const percentiles = [];
  for (let i = 0; i < tmp.length; i++) {
    const t = tmp[i];
    const pct = t.ind.Percentile_p * 100;
    ewmaLogit = (1 - cfg.alpha_ewma_pct) * ewmaLogit + cfg.alpha_ewma_pct * logit(t.ind.Percentile_p);
    const ewmaPct = sigmoid(ewmaLogit) * 100;
    percentiles.push(pct);
    out.push({
      datetime: t.r.datetime,
      player: t.r.player,
      equal: t.r.equal,
      more: t.r.more,
      minimum: t.r.minimum,
      mean: t.r.mean,
      Solvable: t.ind.Solvable,
      SolvedGivenSolvable: t.ind.SolvedGivenSolvable,
      BetterThanMean: t.ind.BetterThanMean,
      Percentile_p: t.ind.Percentile_p,
      BestResult: t.ind.BestResult,
      EWMA_Percentile: ewmaPct,
      RollingN_Percentile: 0 // später gefüllt
    });
  }

  const roll = rollingN(percentiles, cfg.window_N);
  for (let i = 0; i < out.length; i++) out[i].RollingN_Percentile = roll[i];

  return out;
}

// Export für Browser (window.computeRatings) oder Node (module.exports)
if (typeof window !== 'undefined') {
  window.computeRatings = computeRatings;
}
if (typeof module !== 'undefined') {
  module.exports = {
    computeRatings
  };
}
