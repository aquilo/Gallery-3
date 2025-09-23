// rating.js — pure JavaScript

// Hilfsfunktionen
function pow(x, g) {
  return Math.pow(Math.max(0, Math.min(1, x)), g);
}

function computeIndicators(r, cfg) {
  const Solvable = (r.player === 0) || (r.minimum === 0);
  const SolvedGivenSolvable = Solvable ? (r.player === 0 ? 1 : 0) : null;
  const BetterThanMean = r.player <= r.mean ? 1 : 0;
  const Percentile_p = (r.equal + r.more) / 100;
  const BestResult = r.player <= r.minimum ? 1 : 0;

const d = (r.median ?? r.mean) - r.player; // >0 gut, <0 schlecht
const s = cfg.diff_scale || 8;
const DiffScore = 1 / (1 + Math.exp(-d / s)); // (0,1), 0.5 bei d=0

  return {
    Solvable,
    SolvedGivenSolvable,
    BetterThanMean,
    Percentile_p,
    BestResult,
    DiffScore
  };
}


function computeCRaw(ind, cfg) {
  const t = ind.SolvedGivenSolvable != null ? ind.SolvedGivenSolvable : 0;
  const pGamma = Math.pow(Math.max(0, Math.min(1, ind.Percentile_p)), cfg.gamma);
  return cfg.w_mean * ind.BetterThanMean +
    cfg.w_solved * t +
    cfg.w_percentile * pGamma +
    cfg.w_best * ind.BestResult +
    (cfg.w_diff || 0) * ind.DiffScore; // NEU
}


function gateC(x, ind, r, cfg) {
  if (ind.Solvable && r.player > 0) return Math.min(x, cfg.cap_solvable_not_solved);
  if (ind.BestResult === 1) return Math.max(x, cfg.floor_under_min);
  if (ind.Solvable && r.player === 0) return Math.max(x, cfg.floor_solved);
  return x;
}

function clip(x, cfg) {
  return Math.min(cfg.clip_high, Math.max(cfg.clip_low, x));
}

function toRating(cClipped, cfg) {
  return cfg.rating_mid + cfg.rating_scale * Math.log10(cClipped / (1 - cClipped));
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

  const tmp = data.map(r => {
    const ind = computeIndicators(r, cfg);
    const C_raw = computeCRaw(ind, cfg);
    const C_gated = gateC(C_raw, ind, r, cfg);
    const C_clipped = clip(C_gated, cfg);
    const GameRating = toRating(C_clipped, cfg);
    return {
      r,
      ind,
      C_raw,
      C_gated,
      C_clipped,
      GameRating
    };
  });

  const out = [];
  let ewma = cfg.start_ewma;
  const gameRatings = [];
  for (let i = 0; i < tmp.length; i++) {
    const t = tmp[i];
    ewma = (1 - cfg.alpha_ewma) * ewma + cfg.alpha_ewma * t.GameRating;
    gameRatings.push(t.GameRating);
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
      C_raw: t.C_raw,
      C_gated: t.C_gated,
      C_clipped: t.C_clipped,
      GameRating: t.GameRating,
      EWMA_Rating: ewma,
      RollingN_Rating: 0 // später gefüllt
    });
  }

  const roll = rollingN(gameRatings, cfg.window_N);
  for (let i = 0; i < out.length; i++) out[i].RollingN_Rating = roll[i];

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
