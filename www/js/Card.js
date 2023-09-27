// Card -------------------------------------------------------------

class Card {
  // var img, imgOk, imgCovered;
  // var suit, rank, id;
  // var jammer, jammed;

  static suitStr = ["Spade", "Hearts", "Club", "Diamond"];
  static rankStr = ["-", "Ace", "2", "3", "4", "5", "6",
    "7", "8", "9", "10", "Jack", "Queen", "King"
  ];
  static rankShortStr = ["-", "A", "2", "3", "4", "5", "6",
    "7", "8", "9", "X", "J", "Q", "K"
  ];

  constructor(suit, rank, id, img, imgOk, imgCovered) {
    this.suit = suit;
    this.rank = rank;
    this.id = id;
    this.img = img;
    this.imgOk = imgOk;
    this.imgCovered = imgCovered;

  }
  toString() {
    return (Card.suitStr[this.suit] + "-" + Card.rankStr[this.rank]);
  }

  toStr() {
    return (Card.suitStr[this.suit].substring(0, 1) + Card.rankShortStr[this.rank]);
  }

  isAce() {
    return this.rank == 1;
  }

  isTwin(a) {
    return (this.rank == a.rank) && (this.suit == a.suit) && (this.id != a.id);
  }

  drawMini(x, y) {
    os.myimage(this.img, x, y);
  }

  drawHidden(x, y) {
    os.myimage(this.imgCovered, x, y);
    os.mystroke(180);
    if (this.jammed && (global_show == 1)) {
      os.myfill3(180, 180, 180);
      os.myrect(x + 34, y + 2, 36, 12);
    }
    if (this.jammer && (global_show == 1)) {
      os.myfill3(0, 200, 0);
      os.mynoStroke();
      os.myrect(x + 38, y + 5, 30, 7);
    }
  }

  drawMovable(x, y) {
    if (global_show === 0) return;
    os.mynoStroke();
    os.myfill4(255, 127, 0, 80);
    os.myrect(x, y, CARDWIDTH, CARDHEIGHT);
  }

  drawAutoMovable(x, y) {
    if (global_show === 0) return;
    if (global_sayAuto != 1) return;
    os.mynoStroke();
    os.myfill4(0, 255, 100, 80);
    os.myrect(x, y, CARDWIDTH, CARDHEIGHT);
  }

  draw(x, y, ok, movable, autoMovable) {
    if (ok) {
      this.jammer = this.jammed = false;
      os.myimage(this.imgOk, x, y);
      return;
    } else {
      this.drawMini(x, y);
      if (autoMovable) {
        if (global_sayAuto != 1) this.drawMovable(x, y);
        this.drawAutoMovable(x, y);
        return;
      }
      if (movable) {
        this.drawMovable(x, y);
      }
    }
    if (this.jammer && (global_show == 1)) {
      os.myfill3(0, 200, 0);
//      os.myfill3(0, 200, 0);
      os.mynoStroke();
      os.myrect(x + 38, y + 5, 30, 7);
    }
  }
}