
// SpecialCardPiles ----------------------------------------------------------

class FoundationPile extends CardPile {
  constructor (x, y, id, nMax, base) {
    super(x, y, id, nMax);
    this.base = base;
    this.col = (this.id - 1) % 8;
    this.kind = "Foundation";
  }

  draw() {
    if (this.empty()) {
     os.mytextFont(myFont, F14);  
     os.myfill(167);
      textC(this.base + "", this.xc, this.yc);
    } else {
      this.peek().draw(this.x, this.y, this.ok, this.movable, this.autoMovable);
      if (global_helplevel != 8 && global_helplevel != 10) return;
      let c = this.peek();
      if (this.ok) {
        if (c.rank < 11) {   
          os.mytextFont(myFont, F12);  
          os.myrectMode(CENTER); 
          os.mystroke(0);
          os.myfill3(200, 255, 200);
          os.myrect(this.xc, this.yc, 11, 14);
          os.myfill(0);
          textC(c.rankShortStr[c.rank + 3], 1 + this.xc, this.yc);
          os.myrectMode(CORNER);
        }
      }
    }
  }

  toStr() {
    return super.toStr() + this.base + "" + this.col;
  }

  doOkCheck() {
    if (this.ok) return;
    if (this.empty()) this.ok = false;
    else this.ok = this.cards[0].rank == this.base;
  }

  canTake(c) {
    if (this.empty()) {
      return c.rank == this.base;
    }
    let topCard = this.peek();
    return this.ok && c.suit == topCard.suit && (c.rank - topCard.rank) == 3;
  }

  checkTwinAtBottom(topCard) {
    // info("checkTwinAtBottom");
    if (topCard.rank > 10) {
      for (let i = 0; i < 8; i++) {
        if (!tableau[i].empty() 
          && tableau[i].elementAt(0).isTwin(topCard)) { 
          sayAutoReason(this.id, 5, "twin at tableau bottom (f) ", topCard.toString());
          return true;
        }
      }
    }
    return false;
  }

   checkTwinSameRow(topCard) {
    // info("checkTwinSameRow");
    if (topCard.rank < 5) {
      return false;
    }
    let thisRow = this.base % 3;
    for (let i = 0; i < 8; i++)
      if (!foundationPile[thisRow][i].empty()
        && foundationPile[thisRow][i].peek().isTwin(
      topCard)) {
        sayAutoReason(this.id, 6, "twin on same row ", topCard.toString());
        return true;
      }     
    return false;
  }

  nOk() {
    if (this.empty() || !this.ok)
      return 0;
    else
      return this.nCards;
  }
}


// TableauPile -------------------------------------------------------------

class TableauPile extends CardPile {
  constructor(x, y, id, nMax) {
    super(x, y, id, nMax);
    this.kind = "Tableau";
  }

  toStr() {
    return super.toStr() + ((this.id - 1) % 8);
  }

  draw() {
    if (this.empty()) return;
    let yy = this.y;
    for (let i = 0; i < (this.nCards-1); i++) {
      this.elementAt(i).drawHidden(this.x, yy);
      yy += DYST;
    }
    this.peek().draw(this.x, yy, this.ok, this.movable, this.autoMovable);
    this.yc = yy + CARDHEIGHT / 2;
  }

   getTopY () {
    return this.y + this.nCards * DYST;
  }

  includes(xx, yy) {
    return (xx >= this.x
      && yy >= this.y
      && xx < (this.x + CARDWIDTH)
      && yy < (this.y + 3 * CARDHEIGHT));
  }

  doJamCheck() {
    if (this.empty())
      return;
    for (let j = 0; j < this.nCards; j++) { 
      let aCard = this.elementAt(j);
      aCard.jammed = false;
      aCard.jammer = false;
      this.setElementAt(aCard, j);
    }
    if (this.nCards < 2)
      return;
    for (let j = 0; j < this.nCards - 1; j++) {
      let belowCard = this.elementAt(j);
      for (let k = j + 1; k < this.nCards; k++) {
        let aboveCard = this.elementAt(k);
        if (aboveCard.suit == belowCard.suit 
          && (aboveCard.rank > belowCard.rank)
          && (aboveCard.rank - belowCard.rank) % 3 == 0) {
          belowCard.jammed = true;
          this.setElementAt(belowCard, j);
          aboveCard.jammer = true;
          this.setElementAt(aboveCard, k);
        }
      }
    }
  }

   checkTwinBelow(topCard) { 
    // info("checkTwinBelow");
    if (topCard.rank > 4) {
      for (let j = 0; j < this.nCards-1; j++) {
        if (topCard.isTwin(this.elementAt(j))) {
          sayAutoReason(this.id, 7, "twin card under it ", topCard.toString());
          return true;
        }
      }

    }
    return false;
  }

   checkTwinAtBottom(topCard) {
    // info("checkTwinAtBottom");  
    if (topCard.rank < 11) return false;  
    for (let i = 0; i < 8; i++) {
      if (!tableau[i].empty() 
        && tableau[i].elementAt(0).isTwin(topCard)) { 
        sayAutoReason(this.id, 8, "twin at tableau bottom (t) ", topCard.toString());
        return true;
      }
    }
    return false;
  }
}

// StockPile -------------------------------------------------------------

class StockPile extends CardPile {
  constructor(x, y, id, nMax) {
    super(x, y, id, nMax);
    this.kind = "Stock";
  }

  doClick() {
    if (cardMoving() || this.empty() || acePile.reserved) return;

    for (let i = 0; i < 8; i++) {
      if (tableau[i].reserved) return;
    }
    for (let i = 0; i < 8; i++) {
      doMove(stockPile, tableau[i], true);
    }
  }

  doAutoMovableCheck() {
    this.autoMovable = false;
  }

  doMovableCheck() {
    this.movable = false;
  }

  draw() {
    if (this.empty()) {
      if (gameFinished) {
        os.mystroke3(255, 255, 0);
        os.myfill3(255, 255, 0);
        if (humanPlayer) {
          text("The End", XSA + 4, this.y + 20);
        } 
      } else {
        os.mystroke(180);
        os.myfill(180);
        os.myrect(0, YPROGRESS + 16 * ifact, width, 4 * ifact);
      }
      return;
    }
    let dd = this.nCards / 8;
    let xx = this.x + dd * DXSS;
    let yy = this.y + dd * DYSS;
    for (let i = 0; i < dd; i++) {
      xx -= DXSS;
      yy -= DYSS;
      os.myfill(255);
      os.myrect(xx, yy, ifact * 36, ifact * 51);
    if (noMovables() && !cardMoving()) {
      os.myfill3(29, 128, 242);
    } else {
      os.myfill4(255, 127, 0, 80);
    }
    os.myrect(xx + ifact * 3, yy + ifact * 3, ifact * 30, ifact * 45);
    os.myfill(0);
  }
   //  textC(nCards + "", xc, yc);
    let mrows = this.nCards / 8;
    let xl = xx + ifact * 6;
    let yo = yy + ifact * 10;
    let dxs = 8 * ifact;
    let dys = 10 * ifact;
    let nrows = 9;
    os.mystroke(0);
    for (let i = 0; i < 3; i++) {
      xl = xx + ifact * 6;
      for (let j = 0; j < 3; j++) {
        if (mrows >= nrows) {
          os.myfill(128);
//          os.myfill4(0, 0, 0, 90);
        } else {
          os.myfill(255);
          //os.myfill4(255, 127, 0, 80);
        }
        os.myrect(xl, yo, dxs, dys);
        xl += dxs;
        mrows++;
      }
      yo += dys;
    }
  }

}

// this.e -------------------------------------------------------------

class AcePile extends CardPile {
  constructor(x, y, id, nMax) {
    super(x, y, id, nMax);
    this.kind = "Aces";
    //   dy += 40;
    this.ok = true;
  }

  getTopX () {
    return this.x + this.nCards * DXSA;
  }

  getTopY () {
    return this.y + (this.nCards - 1) * DYSA;
  }

  draw() {
    return;
  }

  doAutoMovableCheck() {
    this.autoMovable = false;
  }

  doMovableCheck() {
    this.movable = false;
  }

  nOk() {
    return this.nCards;
  }
}
