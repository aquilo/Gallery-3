// Button -------------------------------------------------------------

class Button {
  // int x, y, dx, dy, id;
  // String label;
  // boolean active;
  // color this., activtextcolor;
  // color fillcolor;

  constructor(label, x, y, dx, dy, id) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.label = label;
    this.id = id;
    this.textcolor = color(0);
    this.active = true;
    this.activtextcolor = color(0, 122, 255);
    this.fillcolor = color(255, 155, 0);
    this.dimmedcolor = color(190);
    this.dimmedtextcolor = color(120);
  }

   draw3(active, dimmed) {
    this.active = active;
    textFont(myFont, round(F18 * 0.65));
    if (!active) {
      const eraseColor = global_nightmode ? color(BG_NIGHT) : color(255);
      fill(eraseColor);
      stroke(eraseColor);
      rect(this.x - 2, this.y - 2, this.dx + 4, this.dy + 8);
      return;
    };
    if (!dimmed) {
      stroke(color(200));
      fill(color(200));
    } else {
      stroke(this.activtextcolor);
      fill(this.activtextcolor);
    }
    textC(this.label, this.x + this.dx/2, this.y + this.dy/2);
  }

   // visible: whether the button is shown at all (vs. erased/hidden)
   // dimmed: shown but not currently clickable (e.g. cards still animating,
   //         or waiting for "tap to continue")
   draw(visible, dimmed) {
    this.active = visible && !dimmed;
    textFont(myFont, F13); // war F10 - Knopfschrift mit dem Knopf mitvergroessert
    if (!visible) {
      const eraseColor = global_nightmode ? color(BG_NIGHT) : color(255);
      fill(eraseColor);
      stroke(eraseColor);
      rect(this.x - 2, this.y - 2, this.dx + 4, this.dy + 4);
      return;
    };
    noStroke();
    fill(dimmed ? this.dimmedcolor : this.activtextcolor);
    rect(this.x, this.y, this.dx, this.dy, this.dy / 2);
    fill(dimmed ? this.dimmedtextcolor : 255);
    // SF Pro's font-metric ascent/descent aren't symmetric around the cap
    // height, so p5's CENTER/CENTER text alignment (which centers on those
    // metrics) sits visibly low for all-caps/no-descender labels like ours.
    // Measure the label's actual glyph bounding box and center on that instead.
    textAlign(CENTER, BASELINE);
    const cx = this.x + this.dx / 2;
    const cy = this.y + this.dy / 2;
    const metrics = drawingContext.measureText(this.label);
    const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    text(this.label, cx, cy + metrics.actualBoundingBoxAscent - glyphHeight / 2);
    textAlign(LEFT, BASELINE);
  }

   includes(xx, yy) {
    return (this.active && xx >= this.x 
      && yy >= this.y 
      && xx < (this.x + this.dx) 
      && yy < (this.y + this.dy));
  }
}
