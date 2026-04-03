class FeverCurve {
  /**
   * @param {p5} p          - deine p5 Instanz
   * @param {number} x,y,w,h- Position/Größe in deinem Canvas
   * @param {object} opts   - {window:200, padPct:0.1, smooth:0.2, showGrid:true, title:"EWMA"}
   */
  constructor(p, x, y, w, h, opts = {}) {
    this.p = p;
    this.bounds = { x, y, w, h };
    this.window = opts.window ?? 200;
    this.padPct = opts.padPct ?? 0.1;
    this.smooth = opts.smooth ?? 0.2;
    this.showGrid = opts.showGrid ?? true;
    this.title = opts.title ?? "";
    this.strokeWeight = opts.strokeWeight ?? 2;

    this.yMin = null;
    this.yMax = null;

    this.data = [];
    this.baseline = opts.baseline ?? null;

    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
  }

  setData(points, snapScale = false) {
   // console.log("FEVER setData last", points.length ? JSON.stringify(points[points.length - 1]) : "empty");
   this.data = points.slice();
    if (snapScale) {
      this._snapScaleToView();
    }
  }

  appendPoint(pt) {
     console.log("FEVER appendPoint", JSON.stringify(pt));
 this.data.push(pt);
    this._snapScaleToView();
  }

  meanElo() {
    if (this.data.length === 0) return 0;
    const sum = this.data.reduce((acc, pt) => acc + pt.y, 0);
    return sum / this.data.length;
  }

  _viewData() {
    const n = this.data.length;
    return n > this.window ? this.data.slice(n - this.window) : this.data;
  }

  _computeTargets(view = null) {
    const v = view ?? this._viewData();
    if (!v.length) return null;

    let localMin = +Infinity;
    let localMax = -Infinity;

    for (const pt of v) {
      if (pt.y < localMin) localMin = pt.y;
      if (pt.y > localMax) localMax = pt.y;
    }

    if (localMin === localMax) {
      localMin -= 1;
      localMax += 1;
    }

    const range = localMax - localMin;
    const dynamicPad = v.length <= 5 ? Math.max(this.padPct, 0.2) : this.padPct;

    return {
      yMin: localMin - range * dynamicPad,
      yMax: localMax + range * dynamicPad
    };
  }

  _snapScaleToView() {
    const targets = this._computeTargets();
    if (!targets) return;
    this.yMin = targets.yMin;
    this.yMax = targets.yMax;
  }

  draw0() {
    const p = this.p;
    const { x, y, w, h } = this.bounds;
    const pad = 6;

    p.push();
    p.noStroke();
    p.fill(245);
    p.rect(x, y, w, h, 10);

    const view = this._viewData();
    if (!view.length) {
      p.fill(150);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Keine Daten", x + 8, y + 8);
      p.pop();
      return;
    }

    const targets = this._computeTargets(view);
    const tgtMin = targets.yMin;
    const tgtMax = targets.yMax;

    if (this.yMin == null || this.yMax == null || view.length <= 5) {
      this.yMin = tgtMin;
      this.yMax = tgtMax;
    } else {
      const wantsExpand = (tgtMin < this.yMin) || (tgtMax > this.yMax);
      const expandSpeed = 0.7;
      const shrinkSpeed = this.smooth;

      if (wantsExpand) {
        this.yMin = this.p.lerp(this.yMin, tgtMin, expandSpeed);
        this.yMax = this.p.lerp(this.yMax, tgtMax, expandSpeed);
        if (tgtMin < this.yMin) this.yMin = tgtMin;
        if (tgtMax > this.yMax) this.yMax = tgtMax;
      } else {
        this.yMin = this.p.lerp(this.yMin, tgtMin, shrinkSpeed);
        this.yMax = this.p.lerp(this.yMax, tgtMax, shrinkSpeed);
      }
    }

    const yMin = this.yMin;
    const yMax = this.yMax;
    const yRange = Math.max(1e-6, yMax - yMin);

    const tailFrac = 0.015;

    const ix = x + pad;
    const iy = y + pad;
    const iw = w - 2 * pad;
    const ih = h - 2 * pad;

    const xMap = (i) =>
      ix + iw * (i / Math.max(1, view.length - 1)) * (1 - tailFrac);
    const yMap = (val) => iy + ih - ih * ((val - yMin) / yRange);
    const yMap2 = (val) => iy + ih - ih * (val / 100);

    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);

    if (this.showGrid) {
      p.stroke(45, 60, 95);
      p.strokeWeight(1);
      p.noFill();
      p.rect(ix, iy, iw, ih, 6);

      p.stroke(180);
      for (let k = 1; k <= 4; k++) {
        const gy = iy + ih * (k / 5);
        p.line(ix, gy, ix + iw, gy);
      }

      p.noStroke();
      p.fill(180);
    }

    const hasY2 = view.some(pt => pt.y2 != null);
    if (hasY2) {
      p.stroke(255);
      p.strokeWeight(2 * Math.max(1, this.strokeWeight - 0.5));
      p.noFill();
      p.beginShape();
      for (let i = 0; i < view.length; i++) {
        const yy = Number(view[i].y);
        if (!Number.isFinite(yy)) continue;
        p.vertex(xMap(i), yMap(yy));
      }
      p.endShape();

      p.stroke(220, 150, 30);
      p.strokeWeight(Math.max(1, this.strokeWeight - 0.5));
      p.noFill();
      p.beginShape();
      for (let i = 0; i < view.length; i++) {
        if (view[i].y2 != null) p.vertex(xMap(i), yMap2(view[i].y2));
      }
      p.endShape();
    }

    p.stroke(255);
    p.strokeWeight(2 * this.strokeWeight);
    p.noFill();
    p.beginShape();
    for (let i = 0; i < view.length; i++) {
      p.vertex(xMap(i), yMap(view[i].y));
    }
    p.endShape();

    p.stroke(110, 170, 255);
    p.strokeWeight(this.strokeWeight);
    p.noFill();
    p.beginShape();
    for (let i = 0; i < view.length; i++) {
      p.vertex(xMap(i), yMap(view[i].y));
    }
    p.endShape();

    for (let i = 0; i < view.length; i++) {
      const pt = view[i];
      if (!pt.underMin && !pt.missedSolvable) continue;
      p.noStroke();
      if (pt.underMin) p.fill(16, 16, 255);
      if (pt.missedSolvable) p.fill(225, 0, 0);
      p.circle(xMap(i), yMap(pt.y), 4);
    }

    const last = view[view.length - 1];
    const elo = Math.round(last.y);
    p.fill(0);
    p.textSize(14);
    p.textAlign(p.RIGHT, p.TOP);
    if (Math.abs(elo - yMin) < Math.abs(elo - yMax)) {
      p.text("" + elo, x + w - 15, y + 8);
    } else {
      p.text("" + elo, x + w - 15, y + h - 28);
    }

    if (hasY2 && last.y2 != null) {
      const pct = Math.round(last.y2);
      p.fill(200, 130, 20);
      p.textSize(12);
      p.textAlign(p.LEFT, p.TOP);
      if (pct < 50) {
        p.text(pct + "%", x + 10, y + 8);
      } else {
        p.text(pct + "%", x + 10, y + h - 28);
      }
    }

    p.pop();
  }

  draw() {
    const p = this.p;
    const { x, y, w, h } = this.bounds;

    const outerPad = 6;
    const ix = x + outerPad;
    const iy = y + outerPad;
    const iw = w - 2 * outerPad;
    const ih = h - 2 * outerPad;

    p.push();

    // Hintergrund
    p.noStroke();
    p.fill(245);
    p.rect(x, y, w, h, 10);

    const view = this._viewData();
    if (!view.length) {
      p.fill(150);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Keine Daten", x + 8, y + 8);
      p.pop();
      return;
    }

    // Daten defensiv numerisch machen
    const pts = view.map((pt, i) => ({
      i,
      y: Number(pt.y),
      y2: pt.y2 == null ? null : Number(pt.y2),
    }));

    // Nur gültige ELO-Werte für Skala verwenden
    const eloVals = pts
      .map(pt => pt.y)
      .filter(v => Number.isFinite(v));

    if (!eloVals.length) {
      p.fill(150);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Keine gültigen Daten", x + 8, y + 8);
      p.pop();
      return;
    }

    let yMin = Math.min(...eloVals);
    let yMax = Math.max(...eloVals);

    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }

    const padPct = this.padPct ?? 0.05;
    const range = yMax - yMin;
    yMin -= range * padPct;
    yMax += range * padPct;

    const yRange = Math.max(1e-6, yMax - yMin);

    const xMap = (i) => {
      if (pts.length <= 1) return ix + iw / 2;
      return ix + iw * (i / (pts.length - 1));
    };

    const yMapElo = (v) => iy + ih - ih * ((v - yMin) / yRange);
    const yMapPct = (v) => iy + ih - ih * (v / 100);

    // Rahmen + horizontale Hilfslinien
    if (this.showGrid) {
      p.stroke(180);
      p.strokeWeight(1);
      p.noFill();
      p.rect(ix, iy, iw, ih, 6);

      for (let k = 1; k <= 4; k++) {
        const gy = iy + ih * (k / 5);
        p.line(ix, gy, ix + iw, gy);
      }
    }

    // Prozentlinie (rötlich/orange), fixe 0..100-Skala
    const pctPts = pts.filter(pt => Number.isFinite(pt.y2));
    if (pctPts.length) {
      p.noFill();

      p.stroke(255);
      p.strokeWeight(3);
      p.beginShape();
      for (const pt of pctPts) {
        p.vertex(xMap(pt.i), yMapPct(pt.y2));
      }
      p.endShape();

      p.stroke(220, 140, 80);
      p.strokeWeight(1.5);
      p.beginShape();
      for (const pt of pctPts) {
        p.vertex(xMap(pt.i), yMapPct(pt.y2));
      }
      p.endShape();
    }

    // ELO-Linie (blau), eigene Skala
    const eloPts = pts.filter(pt => Number.isFinite(pt.y));
    if (eloPts.length) {
      p.noFill();

      p.stroke(255);
      p.strokeWeight(4);
      p.beginShape();
      for (const pt of eloPts) {
        p.vertex(xMap(pt.i), yMapElo(pt.y));
      }
      p.endShape();

      p.stroke(110, 170, 255);
      p.strokeWeight(2);
      p.beginShape();
      for (const pt of eloPts) {
        p.vertex(xMap(pt.i), yMapElo(pt.y));
      }
      p.endShape();
    }

    // Labels des letzten Punkts
    const lastElo = [...eloPts].reverse().find(pt => Number.isFinite(pt.y));
    if (lastElo) {
      p.noStroke();
      p.fill(0);
      p.textSize(14);
      p.textAlign(p.RIGHT, p.TOP);
      p.text(String(Math.round(lastElo.y)), x + w - 12, y + 8);
    }

    const lastPct = [...pctPts].reverse().find(pt => Number.isFinite(pt.y2));
    if (lastPct) {
      p.noStroke();
      p.fill(220, 140, 80);
      p.textSize(12);
      p.textAlign(p.LEFT, p.TOP);
      p.text(`${Math.round(lastPct.y2)}%`, x + 12, y + 8);
    }

    p.pop();
  }
}