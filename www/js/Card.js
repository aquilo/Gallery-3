// Card -------------------------------------------------------------

class Card {
  // var img, imgOk, imgCovered;
  // var suit, rank, id;
  // var jammer, jammed;

  static suitStr = ["Club", "Hearts", "Spade", "Diamond"];
  static rankStr = ["-", "Ace", "2", "3", "4", "5", "6",
    "7", "8", "9", "10", "Jack", "Queen", "King"
  ];
  static rankShortStr = ["-", "A", "2", "3", "4", "5", "6",
    "7", "8", "9", "X", "J", "Q", "K"
  ];

  constructor(suit, rank, id, img, imgOk, imgCovered) {
    this.rank = (rank | 0); // schneller int-cast (entspricht Number(rank)|0)
    this.suit = (suit | 0);
    this.id = id;
    this.img = img;
    this.imgOk = imgOk;
    this.imgCovered = imgCovered;
    this.jamFinal = false;

  }
  toString() {
    return (Card.suitStr[this.suit] + "-" + Card.rankStr[this.rank]);
  }

  toStr() {
    return (Card.suitStr[this.suit].substring(0, 1) + Card.rankShortStr[this.rank]);
  }

  isAce() {
    return this.rank === 1;
  }

  isTwin(a) {
    return (this.rank === a.rank) && (this.suit === a.suit) && (this.id !== a.id);
  }

  drawMini(x, y) {
    os.myimage(this.img, x, y);
  }

  draw(x, y, ok, movable, autoMovable) {
    if (ok) {
      this.jammer = this.jammed = false;
      os.myimage(this.imgOk, x, y);
      return;
    } else {
      this.drawMini(x, y);
      if (autoMovable) {
        if (global_sayAuto !== 1) this.drawMovable(x, y);
        this.drawAutoMovable(x, y);
        return;
      }
      if (movable) {
        this.drawMovable(x, y);
      }
      if (this.jamFinal && (global_show === 1)) {
        this.coverPlot(x, y, 4);
      }
    }
    if (this.jammer && (global_show === 1)) {
      if (this.jamFinal) {
        this.coverPlot(x, y, 3);
      }
      this.coverPlot(x, y, 2);


    }

  }

  coverPlot(x,y, type) {
    if (type === 1) { // jammed
      os.myfill3(0, 220, 0);
      os.mynoStroke();
      os.myrect(x + 56, y + 3, 14, 9);
    } else if (type === 2) { // jammer
      os.myfill3(0, 130, 0);
      os.mynoStroke();
      os.myrect(x + 53, y + 3, 17, 7);
    } else if (type === 3) { // final jammed
      os.myfill3(220, 220, 220);
      os.mynoStroke();
      os.myrect(x + 50, y + 1, 22, 17);
    } else if (type === 4) { // final jammed on top
      os.myfill3(220, 220, 220);
      os.mynoStroke();
      os.myrect(x + 40, y + 1, 32, 14);
    } else { // normal
      os.myimage(this.img, x, y);
    } 
  }

  drawHidden(x, y) {
    os.myimage(this.imgCovered, x, y);
    os.mystroke(180);
    if (this.jamFinal && (global_show === 1)) {
      this.coverPlot(x, y, 3);
    }
    if (this.jammed && (global_show === 1)) {
      this.coverPlot(x, y, 1);
    }
    if (this.jammer && (global_show === 1)) {
      this.coverPlot(x, y, 2);
    }
  }

  drawMovable(x, y) {
    if (global_show === 0) return;
    os.mynoStroke();
    os.myfill4(255, 127, 0, 80);
    os.myrect(x, y, CARDwidthNew, CARDHEIGHT);
  }

  drawAutoMovable(x, y) {
    if (global_show === 0) return;
    if (global_sayAuto !== 1) return;
    os.mynoStroke();
    os.myfill4(0, 255, 100, 80);
    os.myrect(x, y, CARDwidthNew, CARDHEIGHT);
  }

}