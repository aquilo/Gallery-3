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
  }

   draw3(active, dimmed) {
    this.active = active;
    textFont(myFont, round(F18 * 0.65));  
    if (!active) {
      fill(color(255));
      stroke(color(255));
      rect(x - 2, y - 2, this.dx + 4, this.dy + 8);
      return;
    };
    if (!dimmed) {
      stroke(color(200));
      fill(color(200));
    } else {
      stroke(this.activtextcolor);
      fill(this.activtextcolor);
    }
    textC(this.label, this.x + dx/2, this.y + dy/2);
  }

   draw(active) {
    this.active = active;
    textFont(myFont, F13);  
    if (!active) {
      fill(color(255));
      stroke(color(255));
      rect(this.x - 2, this.y - 2, this.dx + 4, this.dy + 4);
      return;
    };
    stroke(this.activtextcolor);
    fill(this.activtextcolor);
    textC(this.label, this.x + this.dx/2, this.y + this.dy/2);
  }

   includes(xx, yy) {
    return (this.active && xx >= this.x 
      && yy >= this.y 
      && xx < (this.x + this.dx) 
      && yy < (this.y + this.dy));
  }
}
