// FeverCurve.js — p5-komponente (ohne weitere deps)
class FeverCurve {
  /**
   * @param {p5} p          - deine p5 Instanz
   * @param {number} x,y,w,h- Position/Größe in deinem Canvas
   * @param {object} opts   - {window:200, padPct:0.1, smooth:0.2, showGrid:true, title:"EWMA"}
   */
  constructor(p, x, y, w, h, opts = {}) {
    this.p = p;
    this.bounds = {
      x,
      y,
      w,
      h
    };
    this.window = opts.window ?? 200;
    this.padPct = opts.padPct ?? 0.1; // vertikaler Headroom
    this.smooth = opts.smooth ?? 0.2; // wie schnell y-Grenzen nachziehen
    this.showGrid = opts.showGrid ?? true;
    this.title = opts.title ?? "";
    this.strokeWeight = opts.strokeWeight ?? 2;

    // dynamische Skala (wird weich zu targets gelerpt)
    this.yMin = null;
    this.yMax = null;

    // Datenpunkte: {x, y, underMin?, missedSolvable?}
    this.data = [];
    // oben in constructor:
    this.baseline = opts.baseline ?? null;

    // …nach Mapping-Funktionen:

    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
  }

  setData(points) {
    // points = [{x, y, underMin, missedSolvable}, ...]  (x nur für tooltips falls du willst)
    this.data = points.slice();
  }

  appendPoint(p) {
    this.data.push(p);
  }

  _viewData() {
    const n = this.data.length;
    return n > this.window ? this.data.slice(n - this.window) : this.data;
  }

  draw() {
    const p = this.p;
    const {
      x,
      y,
      w,
      h
    } = this.bounds;
    const pad = 6;

    // Hintergrund & Rahmen
    p.push();
    p.noStroke();
    //p.fill(20, 24, 40);
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

    // 1) lokale min/max + Headroom
    let localMin = +Infinity,
      localMax = -Infinity;
    for (const pt of view) {
      if (pt.y < localMin) localMin = pt.y;
      if (pt.y > localMax) localMax = pt.y;
    }
    if (localMin === localMax) {
      localMin -= 1;
      localMax += 1;
    }

    const range = localMax - localMin;
    const dynamicPad = view.length <= 5 ? Math.max(this.padPct, 0.2) : this.padPct;
    const tgtMin = localMin - range * dynamicPad;
    const tgtMax = localMax + range * dynamicPad;

    if (this.yMin == null || this.yMax == null || view.length <= 5) {
      this.yMin = tgtMin;
      this.yMax = tgtMax;
    } else {
      const wantsExpand = (tgtMin < this.yMin) || (tgtMax > this.yMax);
      const expandSpeed = 0.7,
        shrinkSpeed = this.smooth;
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

    const yMin = this.yMin,
      yMax = this.yMax;
    const yRange = Math.max(1e-6, yMax - yMin);
    // const xMap = (i) => ix + iw * (i / Math.max(1, view.length - 1));

    const tailFrac = 0.015; // = 6% vom Plot-Bereich frei

    const xMap = (i) =>
      ix + iw * (i / Math.max(1, view.length - 1)) * (1 - tailFrac);
    const yMap = (val) => iy + ih - ih * ((val - yMin) / yRange);

    // Achsenbereich
    const ix = x + pad,
      iy = y + pad,
      iw = w - 2 * pad,
      ih = h - 2 * pad;

    if (this.baseline != null) {
      p.stroke(150);
      p.strokeWeight(1);
      const yBase = yMap(this.baseline);
      // p.line(ix, yBase, ix + iw, yBase);
    }
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);

    // Grid
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
      /*       p.textSize(12); p.textAlign(p.LEFT, p.TOP);
            if (this.title) p.text(this.title, ix, y+6);
            p.textAlign(p.LEFT, p.CENTER);
            p.text(nf(yMax,1,0), ix+4, iy+8);
            p.text(nf(yMin,1,0), ix+4, iy+ih-8);
       */
    }

    // Mapping

    if (this.baseline != null) {
      p.stroke(150, 0, 150);
      p.strokeWeight(1);
      const yBase = yMap(this.baseline);
      //console.log(this.baseline, yBase, y, h, (y + h),iy, iy + ih);
      if (yBase < (y + h)) {
        // p.line(ix, yBase, ix + iw, yBase);
      }
    }

    // Linie

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

    // Marker
    for (let i = 0; i < view.length; i++) {
      const pt = view[i];
      if (!pt.underMin && !pt.missedSolvable) continue;
      p.noStroke();
      if (pt.underMin) {
        p.fill(16, 16, 255);
      } // grün
      if (pt.missedSolvable) {
        p.fill(225, 0, 0);
      } // rot
      p.circle(xMap(i), yMap(pt.y), 4);
    }

    p.pop();
    console.log("FeverCurve draw complete");
  }
}