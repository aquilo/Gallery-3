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

  meanPercent() {
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

  draw() {
    const p = this.p;
    const { x, y, w, h } = this.bounds;

    const outerPad = 6;
    const ix = x + outerPad;
    const iy = y + outerPad;
    const iw = w - 2 * outerPad;
    const ih = h - 2 * outerPad;

    const night = typeof global_nightmode !== "undefined" && global_nightmode;

    p.push();

    // Hintergrund
    p.noStroke();
    p.fill(night ? 35 : 245);
    p.rect(x, y, w, h, 10);

    const view = this._viewData();
    if (!view.length) {
      p.fill(night ? 190 : 150);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Keine Daten", x + 8, y + 8);
      p.pop();
      return;
    }

    // Daten defensiv numerisch machen
    const pts = view.map((pt, i) => ({
      i,
      y: Number(pt.y),
    }));

    // Nur gültige Werte für Skala verwenden
    const vals = pts
      .map(pt => pt.y)
      .filter(v => Number.isFinite(v));

    if (!vals.length) {
      p.fill(night ? 190 : 150);
      p.textAlign(p.LEFT, p.TOP);
      p.text("Keine gültigen Daten", x + 8, y + 8);
      p.pop();
      return;
    }

    let yMin = Math.min(...vals);
    let yMax = Math.max(...vals);

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

    const yMap = (v) => iy + ih - ih * ((v - yMin) / yRange);

    // Rahmen + horizontale Hilfslinien
    if (this.showGrid) {
      p.stroke(night ? 80 : 180);
      p.strokeWeight(1);
      p.noFill();
      p.rect(ix, iy, iw, ih, 6);

      for (let k = 1; k <= 4; k++) {
        const gy = iy + ih * (k / 5);
        p.line(ix, gy, ix + iw, gy);
      }
    }

    // Besser-oder-gleich-Linie (blau), dynamisch auf sichtbaren Bereich skaliert
    const validPts = pts.filter(pt => Number.isFinite(pt.y));
    if (validPts.length) {
      p.noFill();

      p.stroke(255);
      p.strokeWeight(4);
      p.beginShape();
      for (const pt of validPts) {
        p.vertex(xMap(pt.i), yMap(pt.y));
      }
      p.endShape();

      p.stroke(110, 170, 255);
      p.strokeWeight(2);
      p.beginShape();
      for (const pt of validPts) {
        p.vertex(xMap(pt.i), yMap(pt.y));
      }
      p.endShape();
    }

    // Label des letzten Punkts
    const last = [...validPts].reverse().find(pt => Number.isFinite(pt.y));
    if (last) {
      p.noStroke();
      p.fill(night ? 220 : 0);
      p.textSize(14);
      p.textAlign(p.RIGHT, p.TOP);
      p.text(`${Math.round(last.y)}%`, x + w - 12, y + 8);
    }

    p.pop();
  }
}