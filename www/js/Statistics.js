// Statistics -------------------------------------------------------------

var titlePrinted = false;

class Statistics {
  less;
  more;

  median = -1;
  equal;
  n;
  modus;
  scores;

  minimum = 97;
  maximum = -1;
  histo = Array();
  gless;
  gequal;
  gmore;
  mean;
  res;
  boxx = Array();
  boxy = Array();

  str_result;
  str_mean;
  str_equal;
  str_resultnew;
  resultf;

  constructor() {
    this.str_result = " ";
    this.histo = new Array(97);
    this.boxx = new Array(1000);
    this.boxy = new Array(1000);
  }

  statisticsgraphinit() {
    dx1res = ifact * 10;
    dy1res = ifact * 10;

    x1res = -dx1res;
    y1res = 0;
    for (let i = 0; i < global_evaluations; i++) {
      x1res += dx1res;
      if (x1res >= 640) {
        x1res = 0;
        y1res += dy1res;
        if (y1res >= ifact * 310) {
          y1res = 0;
        }
      }
      this.boxx[i] = x1res;
      this.boxy[i] = y1res;
    }
    this.randomizeEvaluation();
  }

  randomizeEvaluation() {
    for (let i = global_evaluations - 1; i >= 0; i--) {
      let j = int(random(i));
      let k = this.boxx[j];
      this.boxx[j] = this.boxx[i];
      this.boxx[i] = k;
      k = this.boxy[j];
      this.boxy[j] = this.boxy[i];
      this.boxy[i] = k;
    }
  }

  add(resultat) {
    this.histo[resultat]++;
    this.draw1Result(resultat, resPlayer);
  }

  drawEvaluationLegendOne(i, myres, iy, evnot) {
    if (this.histo[i] > 1) return; //CHECK
    if (i != 1 && i != 95) {
      let ix, c, dx, dy;
      if (this.histo[i] > 0) {
        if (i == myres && this.histo[i] > 1) {
          ix = min(i, 95) * ifact * 10 / 3;
          c = color(55);
          fill(c);
          rect(ix, iy - 4, dx, 4);
        }
        if (evnot && this.histo[i] > 1) {
          return;
        }
        c = this.getResColor(i, myres);
        if (i == myres) {
          c = color(255);
        }
      } else {
        if (evnot) {
          return;
        }
        c = this.histo[i] == 0 && i == myres ? color(55) : color(220);
      }
      noStroke();
      dy = ifact * 9;
      fill(c);
      ix = min(i, 95) * ifact * 10 / 3;
      if (i == 0) {
        dx = ifact * 13 / 3;
      } else {
        dx = ifact * 10 / 3;
      }
      rect(ix, iy, dx, dy);
      stroke(0);
      line(ix, iy, ix, iy + dy - ifact);
      if (i == 0) {
        line(dx, iy, dx, iy + dy - ifact);
      }
      if (evnot) {
        ix = ix + dx;
        line(ix, iy, ix, iy + dy - ifact);
      }
    }
  }

  drawEvaluationLegend(myres, iy) {
    let c;
    let all;
    let jx, dx, dy, drawNext;
    let n = 0;
    dy = ifact * 9;
    for (let i = 0; i < 97; i++) {
      n += this.histo[i];
    }
    all = n < 100;

    all = false;
    for (let i = 0; i < 97; i++) {
      this.drawEvaluationLegendOne(i, myres, iy, false);
    }
  }

  draw1Result(now, myres) {
    x1res = this.boxx[nrbox];
    y1res = this.boxy[nrbox];
    stroke(0);
    this.setResColor(now, myres);
    rect(x1res, y1res, dx1res, dy1res);
    nrbox++;
    this.drawEvaluationLegendOne(now, myres, YRES - ifact * 30, true);
  }

  getResColor(now, myres) {
    if (now == myres) {
      if (now == 0) {
        return color(200);
      } else {
        return color(255);
      }
    } else if (now == 0) {
      return color(175, 0, 0);
    }
    let amt = min(1.0, max(-1.0, ((now - myres) / 40.0)));
    if (amt > 0) {
      return color(lerpColor(winfrom, winto, amt));
    } else {
      return color(lerpColor(lostfrom, lostto, -amt));
    }
  }

  setResColor(now, myres) {
    fill(this.getResColor(now, myres));
  }

  emptyStat() {
    for (let i = 0; i < this.histo.length; i++)
      this.histo[i] = 0;
  }

  setResPlayer(res0) {
    this.res = res0;
  }

  doStatistics() {
    this.n = 0;
    for (let i = 0; i < 97; i++)
      this.n += this.histo[i];
    let xmed = int(Math.round(this.n / (2.0 - 0.0000001)));
    let nn = 0;
    this.less = 0;
    this.more = 0;
    this.minimum = 97;
    this.maximum = this.median = -1;
    let maxres = 0,
      nXi = 0;
    this.scores = 0;
    for (let i = 0; i < 97; i++) {
      if (this.histo[i] > 0 && this.minimum > i)
        this.minimum = i;
      if (this.histo[i] > 0 && this.maximum < i)
        this.maximum = i;
      if (this.histo[i] > 0)
        this.scores++;
      nn += this.histo[i];
      if (this.median < 0 && nn >= xmed) this.median = i;
      if (i < resPlayer)
        this.less += this.histo[i];
      if (i > resPlayer)
        this.more += this.histo[i];
      if (this.histo[i] > maxres) {
        maxres = this.histo[i];
        this.modus = i;
      }
      nXi += i * this.histo[i];
    }
    this.equal = this.histo[resPlayer];
    let floatn = float(this.n);
    this.resultf = (100.0 * (float(this.more) + (float(this.equal)) / 2.0) / floatn);
    let resultf2 = (100.0 * (float(this.more) + float(this.equal)) / floatn);
    this.str_result = My.round2String(this.resultf, 3);
    // this.str_resultnew = My.round2String(resultf2, 3) + " | " + My.round2String(this.resultf, 3);
    this.str_resultnew = My.round2String(resultf2, 3) + " | " + My.round2String(this.resultf, 3);
    let gn = float(this.n) / 100.0;
    this.gmore = float(this.more) / gn;
    this.gequal = float(this.equal) / gn;
    this.gless = float(this.less) / gn;
    this.more = My.prozround(this.more, this.n);
    this.equal = My.prozround(this.equal, this.n);
    this.less = My.prozround(this.less, this.n);
    let floatnXi = float(nXi);
    this.mean = floatnXi / floatn;
    this.str_mean = My.round2String(floatnXi / floatn, 3);
    let floatequal = float(this.equal);
    this.str_equal = My.round2String(100.0 * floatequal / floatn, 3);

    // Spieler-Resultat (dein resPlayer — übergib/lese ihn passend)
    const player = resPlayer; // oder this.player, falls du es dort ablegst

    // 1) Indikatoren aus dem gerade berechneten Statistics-Objekt
    const ind = indicatorsFromStats(this, player);

    // 2) Score-Pipeline
    const C_raw = computeCRaw(ind, ratingCfg);
    const C_gated = gateC(C_raw, ind, player, ratingCfg);
    const C_clipped = clip01(C_gated, ratingCfg);
    const GameRating = toRating(C_clipped, ratingCfg);

    // 3) EWMA & Rolling-N (inkrementell, aus ratingState)
    ratingState.ewma = (1 - ratingCfg.alpha_ewma) * ratingState.ewma + ratingCfg.alpha_ewma * GameRating;
    const alphaPct = ratingCfg.alpha_ewma_pct ?? ratingCfg.alpha_ewma;
    ratingState.ewmaPct = (1 - alphaPct) * ratingState.ewmaPct + alphaPct * (ind.Percentile_p * 100);

    ratingState.buf.push(GameRating);
    if (ratingState.buf.length > ratingState.N) ratingState.buf.shift();
    const RollingN_Rating = ratingState.buf.reduce((a, b) => a + b, 0) / ratingState.buf.length;

    // 4) An dein Statistics-Objekt anhängen (für UI/Logging)
    this.Solvable = ind.Solvable;
    this.SolvedGivenSolvable = ind.SolvedGivenSolvable; // 0/1/null
    this.BetterThanMean = ind.BetterThanMean; // 0/1
    this.Percentile_p = ind.Percentile_p; // 0..1
    this.BestResult = ind.BestResult; // 0/1

    this.C_raw = C_raw;
    this.C_gated = C_gated;
    this.C_clipped = C_clipped;
    this.GameRating = GameRating;
    this.EWMA_Rating = ratingState.ewma;
    this.RollingN = RollingN_Rating;
    this.str_resultnew = My.round2String(resultf2, 3) + " ||| " + round(this.GameRating);

    // Update fever curve synchronously so it's visible immediately
    // (the async doStatTable chain will later rebuild the full dataset)
    fever.appendPoint({
      x: gameStart,
      y: this.EWMA_Rating,
      y2: ratingState.ewmaPct,
      underMin: !!this.BestResult,
      missedSolvable: (this.Solvable && this.SolvedGivenSolvable === 0)
    });

  }


  toString() {
    let str = this.less + " " + this.more + " " + this.str_mean;
    return str;
  }

  saveResultat(alphanow, gameId) {
    let s = "\"" + gameId + "\", " + My.round2String(alphanow, 5) + "," + resPlayer + "," + this.resultf + "," +
      My.round2String(this.gless, 2) + "," + My.round2String(this.gequal, 2) + "," + My.round2String(this.gmore, 2) + "," +
      this.minimum + "," + this.median + "," + this.str_mean + "," + this.maximum + "," +
      this.modus + "," + this.scores + "," + this.n + "," + nAutoMovesStat + "," + nMovesStat;

    var game = {
      datetime: gameId,
      alpha: alphanow,
      player: resPlayer,
      result: this.resultf,
      less: this.gless,
      equal: this.gequal,
      more: this.gmore,
      minimum: this.minimum,
      median: this.median,
      mean: this.mean,
      maximum: this.maximum,
      mode: this.modus,
      scores: this.scores,
      trials: this.n,
      nAuto: nAutoMovesStat,
      nMoves: nMovesStat
    };
    saveGame(game);
  }
}

  function pow01(x, g) {
    return Math.pow(Math.max(0, Math.min(1, x)), g);
  }

  function log10(x) {
    return Math.log(x) / Math.LN10;
  }

  function indicatorsFromStats(stats, player) {
    // stats: hat minimum, mean, gequal, gmore (Prozent), S = lösbar?
    const Solvable = (player === 0) || (stats.minimum === 0);
    const SolvedGivenSolvable = Solvable ? (player === 0 ? 1 : 0) : null;
    const BetterThanMean = player <= stats.mean ? 1 : 0;
    // gequal/gmore sind bereits Prozentwerte (0..100)
    const Percentile_p = (Number(stats.gequal) + Number(stats.gmore)) / 100;
    const BestResult = player <= stats.minimum ? 1 : 0;
    const d = (stats.median ?? stats.mean) - player; // >0 gut, <0 schlecht
    const s = ratingCfg.diff_scale || 8;
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
     (cfg.w_diff || 0) * ind.DiffScore;
 }

  function gateC(x, ind, player, cfg) {
    if (ind.Solvable && player > 0) return Math.min(x, cfg.cap_solvable_not_solved); // lösbar & NICHT gelöst
    if (ind.BestResult === 1) return Math.max(x, cfg.floor_under_min); // unter Minimum
    if (ind.Solvable && player === 0) return Math.max(x, cfg.floor_solved); // lösbar & gelöst
    return x;
  }

  function clip01(x, cfg) {
    return Math.min(cfg.clip_high, Math.max(cfg.clip_low, x));
  }

  function toRating(c, cfg) {
    return cfg.rating_mid + cfg.rating_scale * log10(c / (1 - c));
  }

  
function drawHisto(x0, y0) {
  let fhisto;
  let x = x0;
  let y = y0;
  let xx = x + ifact * 4;

  let dy0 = 194;
  let dy = ifact * dy0;

  let maxres = 0;

  for (let i = 0; i < 97; i++) {
    if (statistics.histo[i] > maxres) {
      maxres = statistics.histo[i];
      statistics.modus = i;
    }
  }

  fill(255);
  stroke(0);
  rect(x, y, ifact * 200, dy);
  fhisto = float(statistics.histo[statistics.modus]) / float(dy0 - 13);
  if (!(statistics.histo[statistics.modus] > dy0 - 13)) {
    fhisto = float(Math.sqrt(fhisto));
  }
  fill(34);
  strokeWeight(2);
  let ybasis = y + dy - ifact * 5;
  let gray = true;
  noStroke();
  for (let i = 0; i < 9; i++) {
    if (gray)
      fill(242);
    else
      fill(255);
    gray = !gray;
    rect(xx + (i * ifact * 2) * 10 - ifact, y + ifact * 4, ifact * 20, dy - ifact * 9);
  }

  stroke(255);
  let ynow;
  let ffhisto = float(statistics.n) / float((dy0 - 10));
  ynow = ybasis - ifact * Math.max(Math.floor((statistics.n / 4) / ffhisto), 1);
  line(xx, ynow, xx + 97 * ifact * 2, ynow);
  ynow = ybasis - ifact * Math.max(Math.floor((statistics.n / 2) / ffhisto), 1);
  line(xx, ynow, xx + 97 * ifact * 2, ynow);
  ynow = ybasis - ifact * Math.max(Math.floor((3 * statistics.n / 4) / ffhisto), 1);
  line(xx, ynow, xx + 97 * ifact * 2, ynow);
  for (let i = 0; i < 97; i++) {
    if (statistics.histo[i] > 0) {
      if (i < resPlayer) {
        if (i % 2 == 0) {
          stroke(215, 48, 39);
        } else {
          stroke(244, 109, 67);
        }
        if (i == 0) {
          if (resPlayer == 0) {
            stroke(255, 255, 150);
          } else {
            stroke(50, 255, 0);
          }
        }
      } else if (i == resPlayer)
        stroke(0);
      else
      if (i % 2 == 0) {
        stroke(69, 117, 180);
      } else {
        stroke(116, 173, 209);
      }
      let c;
      if (i == resPlayer) {
        c = color(120);
      } else {
        c = statistics.getResColor(float(i), resPlayer);
        if (i % 5 == 0) {
          c = darker(c, 0.9);
        }
      }

      stroke(c);
      let xnow = xx + i * ifact * 2;
      let ynow = ybasis -
        ifact * Math.max(int((statistics.histo[i] / fhisto), 1));

      rect(xnow, ybasis, ifact, ynow - ybasis);
    }
  }

  stroke(0);
  noFill();
  line(xx, ybasis + ifact * 2, xx + ifact * 192, ybasis + ifact * 2);
  line(xx, ybasis - ifact, xx, ybasis + ifact * 3);
  let xres = xx + ifact * 2 * resPlayer;
  line(xres, ybasis - ifact, xres, ybasis + ifact * 3);
  line(xx + ifact * 192, ybasis - ifact, xx + ifact * 192, ybasis + ifact * 3);

  noStroke();
  fill(255, 0, 0, 20);
  rect(xx - ifact, y + ifact * 4, resPlayer * ifact * 2, dy - ifact * 8);

  fill(0, 0, 200, 20);

  rect(ifact + xx + resPlayer * ifact * 2, y + ifact * 4, ifact * 2 * (96 - resPlayer), dy - ifact * 8);
  strokeWeight(1);
}

function darker(c, f) {
  let r = red(c) * f;
  let g = green(c) * f;
  let b = blue(c) * f;
  return color(r, g, b);
}

function drawResult(x, y) {
  if (statistics.maximum < 0) return;
  let dx = ifact * 200;
  let dy = ifact * 17;
  let yc = y + dy / 2 - 4;
  stroke(0);

  fill(statistics.getResColor(30.0, 20));


  rect(x, y, dx, dy);
  noStroke();
  fill(127);
  rect(x, y, 2 * (statistics.less + statistics.equal), dy);
  fill(statistics.getResColor(30.0, 40));
  rect(x, y, statistics.less * 2, dy);
  stroke(0);
  fill(0);
  textAlign(LEFT, CENTER);
  text(("" + statistics.less), x + ifact * 5, yc);
  textAlign(RIGHT, CENTER);
  text(("" + statistics.more), x + dx - ifact * 5, yc);
  textAlign(CENTER, CENTER);
  text(statistics.str_resultnew, x + dx / 2, yc);
  textAlign(LEFT, BASELINE);
  noFill();
  rect(x, y, dx, dy);
}

function drawStatistics(x0, y0) {
  textFont(myFont, F12);
  let x = x0;
  let y = y0;
  let xr = x + ifact * 112;
  let xm = x + ifact * 193;
  let dy = ifact * 125;
  fill(255);
  rect(x, y, ifact * 200, dy + 2);
  stroke(0);
  noFill();
  rect(x, y, ifact * 200, dy + 2);
  if (statistics.maximum < 0) return;
  y += ifact * 18;
  x += ifact * 7;

  setFillStroke(0, 0, 0);
  text(getTranslation(LANG, "Random tapping") + ", " + statistics.n + " " + getTranslation(LANG, "games") + ": ", x, y + ifact * 2);
  text(getTranslation(LANG, "best score") + ":", x, y += ifact * 21);
  setStatisticsColor(resPlayer, statistics.minimum);
  if (statistics.minimum == 0 && resPlayer > 0) {
    setFillStroke(35, 176, 0);
  }
  textR("" + statistics.minimum, xr, y);
  setFillStroke(0, 0, 0);
  textFont(myFont, F9);
  if (statistics.minimum == 0) {
    text("! (" + statistics.histo[0] + "x)", xr + ifact, y);
  } else {
    text(" (" + statistics.histo[statistics.minimum] + "x)", xr + ifact, y);
  }
  textFont(myFont, F12);

  text(getTranslation(LANG, "median") + ":", x, y += ifact * 16);
  setStatisticsColor(resPlayer, statistics.median);
  textR("" + statistics.median, xr, y);
  setFillStroke(0, 0, 0);

  textFont(myFont, F16);
  let yyou = y - ifact * 7;
  textR(getTranslation(LANG, "You"), xm, yyou);
  textC("" + resPlayer, xm - 29, yyou + ifact * 11);
  // textR("" + resPlayer, xm, yyou + ifact * 20);
  noFill();
  rect(xm - 64, yyou - 33, 70, 83, 5);

  textFont(myFont, F12);
  setFillStroke(0, 0, 0);

  text(getTranslation(LANG, "mean") + ":", x, y += ifact * 13);
  setStatisticsColor(resPlayer, statistics.mean);
  textR(My.round2String(statistics.mean, 3), xr + ifact * 12, y);
  fill(0);
  text(getTranslation(LANG, "worst") + ":", x, y += ifact * 16);
  setStatisticsColor(resPlayer, statistics.maximum);
  textR("" + statistics.maximum, xr, y);
  fill(0);
  text(getTranslation(LANG, "most frequent") + ":", x, y += ifact * 20);
  setStatisticsColor(resPlayer, statistics.modus);
  textR("" + statistics.modus, xr, y);
  setFillStroke(0, 0, 0);
  text("" + statistics.scores + " " + getTranslation(LANG, "different scores"), x, y += ifact * 16);

  textFont(myFont, F9);
  textR("DF: " + degreesoffreedom, xm - 80, y);

  // text("ELO: " + round(statistics.GameRating, 0), xr + 20, y - ifact * 12);

  setFillStroke(0, 0, 0);

  doStatTableMiniGraph();

  /*
  if (statistics.minimum == 0 || resPlayer == 0) {
    if (resPlayer == 0) {
      fill(0, 0, 200);
    } else {
      fill(215, 40, 40);
    }
    rect(xm - ifact * 30, y - ifact * 14, ifact * 14, ifact * 14);
  } else {
    if (resPlayer <= statistics.minimum) {
      fill(0, 0, 200);
    } else {
      fill(215, 40, 40);
    }
    ellipse(xm - ifact * 26, y - ifact * 7, ifact * 14, ifact * 14);
  }

  fill(statistics.getResColor(statistics.mean, resPlayer));
  rect(xm - ifact * 14, y - ifact * 14, ifact * 14, ifact * 7);

  fill(statistics.getResColor(this.resultf, 50.0));
  rect(xm - ifact * 14, y - ifact * 7, ifact * 14, ifact * 7);
*/
  // if (HEIGHT0 > 96000) {
  //   let evaluationText = getEvaluationText();
  //   print(evaluationText);
  //   My.msg(evaluationText);
  // }
}

/*
function getEvaluationText() {
  // String txt = resPlayer + " pts. / " + statistics.this.str_result + "%:  Your result is";
  let txt = "";
  let proz0f = 100.0 * (statistics.histo[0] / statistics.n);
  let proz0 = My.round2String(proz0f, 2);
  let prtbetter = false;
  if (resPlayer == 0) {
    txt += "Absolutly perfect, you solved it!";
  } else {
    if (statistics.this.resultf == 100) {
      txt = "Perfect game. The random strategy gives no better result. Gratulation!";
    } else if (statistics.this.resultf > 95) {
      txt += "Very good.";
    } else if (statistics.this.resultf > 80) {
      txt += "Good.";
    } else if (statistics.this.resultf > 60) {
      txt += "Rather good, but you could do it better.";
    } else if (statistics.this.resultf > 50) {
      txt += "Just over 50%.";
    } else if (statistics.this.resultf == 50) {
      txt += "Exactly as good as the random strategy.";
    } else if (statistics.this.resultf > 40) {
      txt += "Not so good.";
    } else if (statistics.this.resultf > 30) {
      txt += "Rather bad.";
    } else if (statistics.this.resultf > 10) {
      txt += "Bad.";
    } else if (statistics.this.resultf > 0) {
      txt += "Extremely bad.";
    } else if (statistics.this.resultf == 0) {
      txt += "Very bad. You did not play (?).";
    }
    if (statistics.minimum == resPlayer) {
      txt += " Perhaps there is really no better solution than " + resPlayer + " achievable.";
    }
    if (statistics.minimum < resPlayer && statistics.minimum > 0) {
      let d = (resPlayer - statistics.minimum);
      let ds = "" + d;
      if (d < 5) {
        ds = "only " + ds;
      }
      txt += " The best random solution was " + ds + " point";
      if (d > 1) {
        txt += "s";
      }
      txt += " better,";
      if (statistics.less > 0) {
        txt += " the random \"strategy\" was in " + nfc(statistics.less, 1) + "% better.";
      } else {
        txt += " the random \"strategy\" was in nearly never better.";
      }
    }
    if (statistics.minimum == 0) {
      txt += (statistics.this.resultf >= 50 ? " But t" : " And t") + "he game was solvable, and you did not!";
      if (proz0f < 10) {
        if (proz0f < 1) {
          txt += " Only";
        }
        txt += " " + proz0 + "% of random games solve the game completely.";
      } else {
        txt += " It was perhaps not so difficult, " + proz0 + "% of random games get a 0.";
      }
      prtbetter = true;
      txt += " The random strategy was in " + nfc(statistics.less, 1) + "% of the tries better.";
    } else if (statistics.minimum != resPlayer) {
      txt += " The game seems until now not to be solvable.";
    }
  }
  if (statistics.minimum == 0 && !prtbetter) {
    if (proz0f < 10) {
      if (proz0f < 1) {
        txt += " Only";
      }
      txt += " " + proz0 + "% of random games solve the game completely.";
    } else {
      txt += " It was perhaps not so difficult, " + proz0 + "% of random games get a 0.";
    }
  }
  if (statistics.scores > 40) {
    txt += " It was a game with " + (statistics.scores > 50 ? "very " : "") + "many different ways to play, there were " + statistics.scores + " different scores.";
  } else if (statistics.scores < 25) {
    txt += " It is not a rich game, there were only " + statistics.scores + " different scores achieved.";
  }
  return txt;
}
 */
function setStatisticsColor(res, indicator) {
  if (res == indicator) {
    setFillStroke(0, 0, 0);
  } else if (res > indicator) {
    setFillStroke(215, 48, 39);
  } else {
    setFillStroke(69, 117, 180);
  }
}

function setFillStroke(r, g, b) {
  fill(r, g, b);
  stroke(r, g, b);
}

function doStatTableMiniGraph() {
  var results = statistcsTable;
  var len = results.length;
  var r = results[len - 1];
  global_statistics = r;
  var nn = r.n;
  let aaa = results;
  var k = -1;
  do {
    k = k + 1;
  } while (results[k].n !== nn);
  len = k + 1;

  function compareRectEmpty(x, y, val, goodval) {
    let col = (val < goodval) ? "#FF1010" : "#0F0FFB";
    fill("#FFFFFF");
    stroke(col);
    rect(x, y, 10, 10);
  }

  function compareRect(x, y, val, goodval) {
    let col = (val < goodval) ? "#FF1010" : "#0F0FFB";
    fill(col);
    stroke(col);
    rect(x, y, 10, 10);
  }
  let yy0 = 571;
  let dxx = 14;
  let dyy = 12;
  let xx0 = 490 - (len - 1) * dxx;

  for (var i = 0; i < len; i++) {
    let s = results[i];
    let yy = yy0;
    let xx = xx0 + i * dxx;
    compareRectEmpty(xx, yy, good_mean, results[i].avg_player);
    yy += dyy;
    compareRectEmpty(xx, yy, percent(s.hzeros, s.n, 2), good_zeros);
    yy += dyy;
    compareRect(xx, yy, percent(s.hzeros, s.hsolvable, 2), good_solvsolv);
    yy += dyy;
    compareRect(xx, yy, percent(s.n - s.hcbetter, s.n, 2), good_best);
    yy += dyy;
    compareRect(xx, yy, results[i].avg_more + results[i].avg_equal, good_be);
    yy += dyy;
    // fcompareRect(xx, yy, s.avg_result, good_meanres);
    // yy += dyy;
    compareRect(xx, yy, percent(s.hwins, s.n, 2), good_bettermean);
    yy += dyy;
    compareRect(xx, yy, results[i].elo, good_elo);
  }
}