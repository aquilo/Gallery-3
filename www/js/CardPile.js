// CardPile -------------------------------------------------------------

class CardPile {
  // int x, y, id; 
  // int xc, yc;   
  // PImage picture;    
  // Card cards[];
  // int nCards;
  // boolean ok, movable, autoMovable;
  // kind = "";
  // CardPile ziel;
  // boolean reserved;
  // int base = 0;
  // int col = 0;

  static SUIT_ROW = Object.freeze([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1]);


  constructor(x, y, id, nMax) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.xc = x + CARDwidthNew / 2;
    this.yc = y + CARDHEIGHT / 2;
    this.cards = new Array(nMax);
    this.clear();
    this.ok = false;
    this.movable = false;
    this.autoMovable = false;
  }

  doClick() {
    if (this.empty()) return;
    if (this.movable && !this.reserved) {
      doMove(this, this.ziel, false);
    }
  }

  doAutoClick() {
    if (this.empty()) return;
    if (this.movable && !this.ziel.reserved) {
      doMove(this, this.ziel, true);
    }
  }

  toString() {
    if (!this.empty()) {
      if (this.ok) {
        return (this.kind + " stack with " + this.cards.length + " places, occupied: +" + this.nCards +
          ", top: " + this.peek().toString());
      } else {
        return (this.kind + " stack with " + this.cards.length + " places, occupied:  " + this.nCards +
          ", top: " + this.peek().toString());
      }
    } else {
      return (this.kind + " stack with " + this.cards.length + " places, empty");
    }
  }

  toStr() {
    return this.kind.substring(0, 1);
  }

  doChecks() {
    if (this.empty()) {
      this.ok = this.movable = false;
      return;
    }
    this.doOkCheck();
    this.doMovableCheck();
    this.doAutoMovableCheck();
  }

  doOkCheck() {
    this.ok = false;
  }

  doMovableCheck() {
    this.movable = false;
    if (this.empty()) return;
    if (this.ok) return;

    let topCard = this.peek();
    if (topCard.rank == 1) {
      this.ziel = acePile;
      this.movable = true;
      return;
    }
    const foundationRow = foundationPile[CardPile.SUIT_ROW[topCard.rank]];
    for (let i = 0; i < 8; i++) {
      let f = foundationRow[i];
      if (!f.reserved) {
        if (f.empty()) {
          if (topCard.rank < 5) {
            this.ziel = f;
            this.movable = true;
            return;
          }
        } else if (f.ok) {
          let d = f.peek();
          if (topCard.suit == d.suit && (topCard.rank - d.rank) == 3) {
            this.ziel = f;
            this.movable = true;
            return;
          }
        }
      }
    }
  }

  doJamCheck() {
    return false;
  }

  checkTwinBelow(topCard) {
    return false;
  }

  checkTwinSameRow(topCard) {
    return false;
  }

  checkTwinAtBottom(topCard) {
    return false;
  }

  doAutoMovableCheck() {
    this.autoMovable = this.doAllAutoMovableChecks();
    if ((global_auto == 0) && humanPlayer) return;
    if (this.autoMovable && global_sayAuto == 0 && global_auto == 1) this.doAutoClick();
  }

  doAllAutoMovableChecks() {
    if (!this.movable) return false;
    if (this.ziel.reserved) return false;
    let topCard = this.peek();
    if (topCard.isAce()) return true;

    if (this.checkTwinOk(topCard)) return true;
    if (this.check2Possibilities(topCard)) return true;
    if (this.checkRowClean(topCard)) return true;
    if (this.checkJust1()) return true;
    if (this.checkTwinBelow(topCard)) return true;
    if (this.checkTwinSameRow(topCard)) return true;
    if (this.checkTwinUnderBase(topCard)) return true;
    if (this.checkTwinIsJammed(topCard)) return true;
    if (this.checkTwinAtBottom(topCard)) return true;
    return false;
  }

  checkJust1() {
    info("checkJust1");
    let m = -1;
    if (stockPile.empty() && !cardMoving()) {
      let nMovable = 0;
      for (let i = 1; i < 34; i++) {
        if (allPiles[i].movable) {
          nMovable++;
          m = i;
        }
        if (nMovable > 1)
          return false;
      }
      if (nMovable == 1) {
        sayAutoReason(this.id, 4, "just 1 card movable ", allPiles[m].peek().toString());
        return true;
      }
    }
    return false;
  }

  checkRowClean(topCard) {
    info("checkRowClean");
    if (topCard.rank < 5) {
      const foundationRow = foundationPile[CardPile.SUIT_ROW[topCard.rank]];
      for (let i = 0; i < 8; i++) {
        if (!foundationRow[i].empty() &&
          !foundationRow[i].ok) {
          return false;
        }
      }
      sayAutoReason(this.id, 3, "row on foundation clean ", topCard.toString());
      return true;
    }
    return false;
  }

  checkTwinOk(topCard) {
    info("checkTwinOk");
    if (topCard.rank > 4) {
      const foundationRow = foundationPile[CardPile.SUIT_ROW[topCard.rank]];
      for (let i = 0; i < 8; i++)
        if (foundationRow[i].ok &&
          foundationRow[i].containsTwin(topCard)) {
          sayAutoReason(this.id, 1, "twin already OK ", topCard.toString());
          return true;
        }
    }
    return false;
  }

    checkTwinOkInsideStock(topCard) {
      info("checkTwinOkInsideStock");
      if (topCard.rank > 4) {
      const foundationRow = foundationPile[CardPile.SUIT_ROW[topCard.rank]];
        for (let i = 0; i < 8; i++)
          if (foundationRow[i].ok &&
            foundationRow[i].containsTwin(topCard)) {
            return true;
          }
      }
      return false;
    }


  jamCheckTwinOk(topCard) {
    if (topCard.rank > 4) {
      const foundationRow = foundationPile[CardPile.SUIT_ROW[topCard.rank]];
      for (let i = 0; i < 8; i++)
        if (foundationRow[i].ok &&
          foundationRow[i].containsTwin(topCard)) {
          return true;
        }
    }
    return false;
  }

  isAce() {
    if (this.nCards == 0) return false;
    if (this.peek().rank == 1) return true;
    return false;
  }

  check2Possibilities(topCard) {
    info("check2Possibilities");
    if (topCard.rank < 5) {
      return false;
    }
    let possibilities = 0;
    const foundationRow = foundationPile[CardPile.SUIT_ROW[topCard.rank]];
    for (let i = 0; i < 8; i++) {
      if (foundationRow[i].canTake(topCard)) {
        possibilities++;
        if (possibilities == 2) {
          sayAutoReason(this.id, 2, "2 possibilities ", topCard.toString());
          return true;
        }
      }
    }
    return false;
  }

  checkTwinUnderBase(topCard) {
    if (topCard.rank > 4) {
      for (let i = 0; i < 8; i++)
        if (!tableau[i].empty()) {
          for (let j = 0; j < tableau[i].nCards - 1; j++)
            if (topCard.isTwin(tableau[i].elementAt(j))) {
              if (topCard.rank - (tableau[i].elementAt(j + 1)).rank != 3) {
                return false;
              }
              if (topCard.suit != (tableau[i].elementAt(j + 1)).suit) {
                return false;
              }
              sayAutoReason(this.id, 9, "twin card directly under its base", topCard.toString());
              return true;
            }
        }
    }
    return false;
  }

  checkTwinIsJammed(topCard) {
    if (topCard.rank > 4) {
      for (let i = 0; i < 8; i++)
        if (!tableau[i].empty()) {
          for (let j = 0; j < tableau[i].nCards - 1; j++)
            if (topCard.isTwin(tableau[i].elementAt(j))) {
              if (tableau[i].elementAt(j).jammed) {
                sayAutoReason(this.id, 10, "twin card jammed", topCard.toString());
                return true;
              } else {
                return false;
              }
            }
        }
    }
    return false;
  }

  canTake(c) {
    return false;
  }

  containsTwin(topCard) {
    for (let j = 0; j < this.nCards; j++) {
      if (topCard.isTwin(this.elementAt(j))) {
        return true;
      }
    }
    return false;
  }

  draw() {
    if (this.empty()) return;
    this.peek().draw(this.x, this.y, this.ok, this.movable, this.autoMovable);
  }

  arrow(x1, y1, x2, y2) {
    line(x1, y1, x2, y2);
    //  curve(x1, y1, x1+20, y1, x2, y2-40, x2, y2);
    pushMatrix();
    translate(x2, y2);
    let a = atan2(x1 - x2, y2 - y1);
    rotate(a);
    line(0, 0, -3, -9);
    line(0, 0, 3, -9);
    popMatrix();
  }

  drawArrow() {
    if (!this.empty() && this.movable && this.ziel.id > 1) {
      //        stroke(50+random(100),50+random(100), 50+random(100));this.
      stroke(0, 120);
      strokeWeight(3);
      let x1 = this.xc;
      let y1 = this.yc;
      let x2 = this.ziel.xc;
      let y2 = this.ziel.yc;
      let d1 = 4;
      let d2 = 8;
      if (x2 > x1) {
        x1 += d1;
        x2 -= d2;
      } else if (x2 < x1) {
        x1 -= d1;
        x2 += d2;
      }
      if (y2 > y1) {
        y1 += d1;
        y2 -= d2;
      } else if (y2 < y1) {
        y1 -= d1;
        y2 += d2;
      }
      arrow(x1, y1, x2, y2);
      strokeWeight(1);
    }
  }

  includes(xx, yy) {
    //console.log(this.kind, xx, yy, this.x, this.y);
    return (xx >= this.x &&
      yy >= this.y &&
      xx < (this.x + CARDwidthNew) &&
      yy < (this.y + CARDHEIGHT));
  }

  push(c) {
    this.cards[this.nCards] = c;
    this.nCards++;
  }

  empty() {
    return this.nCards == 0;
  }

  peek() {
    //   if (empty()) return null;
    return this.cards[this.nCards - 1];
  }

  elementAt(ix) {
    if (this.empty()) return null;
    return this.cards[ix];
  }

  setElementAt(card, ix) {
    this.cards[ix] = card;
  }

  pop() {
    if (this.empty()) return null;
    else {
      this.nCards--;
      return this.cards[this.nCards];
    }
  }

  clear() {
    this.nCards = 0;
    this.reserved = false;
    this.ziel = null;
    this.ok = false;
    this.movable = false;
    this.autoMovable = false;
  }

  doHover() {
    explain = this.kind;
  }

  nOk() {
    return 0;
  }

  getTopX() {
    return this.x;
  }
  getTopY() {
    return this.y;
  }
}