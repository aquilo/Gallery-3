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
  ynow = ybasis - ifact * Math.max((int)((statistics.n / 4) / ffhisto), 1);
  line(xx, ynow, xx + 97 * ifact * 2, ynow);
  ynow = ybasis - ifact * Math.max((int)((statistics.n / 2) / ffhisto), 1);
  line(xx, ynow, xx + 97 * ifact * 2, ynow);
  ynow = ybasis - ifact * Math.max((int)((3 * statistics.n / 4) / ffhisto), 1);
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
  let yc = y + dy / 2;
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
  let xr = x + ifact * 120;
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
  fill(0);

  text(getTranslation(LANG, "Random tapping") + ", " + statistics.n + " " + getTranslation(LANG, "games") + ": ", x, y + ifact * 2);
  text(getTranslation(LANG, "best score") + ":", x, y += ifact * 21);
  setStatisticsColor(resPlayer, statistics.minimum);
  if (statistics.minimum == 0 && resPlayer > 0) {
    fill(35, 176, 0);
  }
  textR("" + statistics.minimum, xr, y);
  fill(0);
  if (statistics.minimum == 0) {
    text("! (" + statistics.histo[0] + "x)", xr + ifact, y);
  } else {
    text(" (" + statistics.histo[statistics.minimum] + "x)", xr + ifact, y);
  }
  text(getTranslation(LANG, "median") + ":", x, y += ifact * 16);
  setStatisticsColor(resPlayer, statistics.median);
  textR("" + statistics.median, xr, y);
  fill(0);

  textFont(myFont, F16);
  let yyou = y - ifact * 7;
  textR(getTranslation(LANG, "You"), xm, yyou);
  textR("" + resPlayer, xm, yyou + ifact * 20);
  textFont(myFont, F12);

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
  fill(0);
  text("" + statistics.scores + " " + getTranslation(LANG, "different scores"), x, y += ifact * 16);

  stroke(0);
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
    fill(0);
  } else if (res > indicator) {
    fill(215, 48, 39);
  } else {
    fill(69, 117, 180);

  }
}