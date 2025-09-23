// Mover -------------------------------------------------------------



class Mover {
  static totalTime = 0;
  static totalMoves = 0;
  // int steps;
  // Card card;
  // CardPile to;
  // active;
  // int x, y;
  // float this.xbegin, this.ybegin;
  // float this.dx, this.dy;
  // float nr;
  // float this.now;
  // int startTime;

  constructor(nr) {

    this.nr = nr;
    this.active = false;

  }

  set(card, xstart, ystart, to, steps) {
    this.startTime = millis();
    this.card = card;
    this.to = to;
    this.steps = steps;
    this.to = to;
    this.to.reserved = true;
    mustDraw = true;
    dirty = true;
    this.now = 0.0;
    this.active = true;
    this.xbegin = float(xstart);
    this.ybegin = float(ystart);
    this.dx = (to.getTopX() - this.xbegin);
    this.dy = (to.getTopY() - this.ybegin);
  }

  stop() {
    let fmtime;
    this.active = false;
    this.to.push(this.card);
    this.to.reserved = false;
    dirty = true;
    mustDraw = true;
    Mover.totalTime += (millis() - this.startTime);
    Mover.totalMoves ++;
    if (debug) {
      fmtime = Mover.totalTime / Mover.totalMoves;
      // mymsg = (global_steps + " / " + global_mtime + " " + My.round2String(fmtime, 1) + " = " + Mover.totalMoves + " / " + Mover.totalTime);
    }
    if (Mover.totalMoves > 12) {
      fmtime = Mover.totalTime / Mover.totalMoves;
      let old_steps = global_steps;
      global_steps *=  global_mtime / fmtime;
      global_steps = int((global_steps + old_steps) / 2.0);
      global_steps = max(global_steps, 2);
      global_steps = min(global_steps, 150);
      // mymsg = ("*** " + global_steps + " / " + global_mtime + " " + My.round2String(fmtime, 1) + " = " + Mover.totalMoves + " / " + Mover.totalTime);
     // print(old_steps + " " + global_steps + " / " + global_mtime + " " + fmtime + " ; " + Mover.totalMoves + " / " + Mover.totalTime);
      Mover.totalMoves = 0;
      Mover.totalTime = 0;
      setStepsPref();
    }
  }

  draw() {
    this.now += 1.0;
    this.x = int(this.easeOutCubic(this.now, this.xbegin, this.dx, this.steps));
    this.y = int(this.easeOutQuad(this.now, this.ybegin, this.dy, this.steps));
    //  print(x + "/" + y + " " + this.now + " " + steps + " " + this.xbegin + "/" + this.ybegin + " " + this.dx+"/"+this.dy)
    // console.log(this.card.toString());
    this.card.draw(this.x, this.y);
    if (this.now >= this.steps) {
      this.stop();
      return;
    }
  }

  easeOutCubic (t, b, c, d) {
    return c * ((t = t / d - 1) * t * t + 1) + b;
  }

  easeOutQuad (t, b, c, d) {
    t /= d;
    return -c * t*(t-2) + b;
  }
}

function fromto(from, to, undo) {
  return from.peek().toStr() + ": " + from.toStr() + " > " + to.toStr() + " " + undo;
}
// MoverCollection -------------------------------------------------------------

class MoverCollection {


  constructor() {
    this.maxMover = 100;
    this.mover = new Array(this.maxMover);
    for (let i = 0; i < this.maxMover; i++) {
      this.mover[i] = new Mover(i);
    }
  }

  isOneActive() {
    //console.log("isOneActive", this.maxMover);
    for (let i = 0; i < this.maxMover; i++) {
      if (this.mover[i].active) {
        loop();
        return true;
      }
    }
    return false;
  }

  startUndo(from, to, steps) {
    //    print(fromto(from, to, "U"));
    to.push(from.pop());
    to.ok = false;
    return;
    /*
    for (int i = 0; i < this.maxMover; i++) {
     if (!this.mover[i].active) {
     if (i > maxnow) {
     maxnow = i;
     print("maxnow: " + maxnow);
     }
     undoing = true;
     this.mover[i].set(from.pop(), from.getTopX(), from.getTopY(), to, steps);
     return;
     }
     }
     */
  }

  start(from, to, auto, steps) {
    //    print(auto + " " + fromto(from, to, ""));
    //    print(steps);
    //console.log(auto + " " + fromto(from, to, ""), steps, this.maxMover);

    dirty = true;
    if (from.id === 0) {
      moveStack.clear();
    }
    if (from.id !== 0 && to.id !== 1) {
      moveStack.push(new Move(from, to, auto));
      from.autoMovable = false;
      nMovesStat++;
      if (auto) nAutoMovesStat++;
      if (from.kind == "Tableau") {
        from.movable = false;
      }
    }
    for (let i = 0; i < this.maxMover; i++) {
      if (!this.mover[i].active) {
        this.mover[i].set(from.pop(), from.getTopX(), from.getTopY(), to, steps);
        return;
      }
    }
  }

   draw() {
    //console.log();
    let nActive = 0;
    for (let i = 0; i < this.maxMover; i++) {
      if (this.mover[i].active) {
        this.mover[i].draw();
        nActive++;
      }
    }
    return nActive;
  }
}
