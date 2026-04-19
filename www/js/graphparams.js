function detectDevice() {
  console.log("window: " + windowWidth + " / " + windowHeight);
  TWO = 2;
  device = "iPhone";
  setGraphParams();
}

function setGraphParams() {
  setCards();
  WIDTH0 = TWO * 320;
  HEIGHT0 = TWO * 630;
  scaleFactor = min(1.0, windowWidth / 640.0);
  scaleFactor = min(scaleFactor, windowHeight / 1006.0);
  console.log("Window: " + windowWidth + " / " + windowHeight);

  offScreen = createGraphics(WIDTH0, HEIGHT0); // iphone5: 640 * 1136
  console.log("Offscreen-Canvas: " + WIDTH0 + " / " + HEIGHT0);
  console.log("scaleFactor: " + scaleFactor);

  F8 = TWO * 8;
  F9 = TWO * 9;
  F10 = TWO * 10;
  F11 = TWO * 11;
  F12 = TWO * 12;
  F13 = TWO * 13;
  F14 = TWO * 14;
  F16 = TWO * 16;
  F18 = TWO * 18;
  F24 = TWO * 24;

  XSF = 7;
  YSF = XSF;
  DXSF = CARDwidthNew + 7;
  DYSF = CARDHEIGHT + 7;

  XRIGHT = WIDTH0 - TWO * 7;
  XST = XSF;
  YST = YSF + 3 * DYSF + 30;
  DXST = DXSF;
  DYST = 18;

  XSA = XSF;
  YSA = YST + 3 * CARDHEIGHT + 25;
  DXSA = 0;
  DYSA = 0;
  XSS = XRIGHT - TWO * 4 - CARDwidthNew;
  YSS = YSA;
  DXSS = 3;
  DYSS = 0;

  WBN = TWO * 40;
  HBN = TWO * 20;
  WBU = WBN;
  HBU = HBN;
  WBE = CARDwidthNew;
  HBE = CARDHEIGHT;
  WBF = TWO * 75;
  HBF = TWO * 20;

  XBN = CARDwidthNew * 2;
  YBN = YSS + CARDHEIGHT - HBN; //YBN = YSS + CARDHEIGHT / 2 - 2;
  XBU = XBN;
  YBU = YSS;
  XBE = XSS;
  YBE = YSS;
  XBF = XSS - round(2.5 * CARDwidthNew);
  YBF = YSS;

  XRES = XSS - 29;
  YRES = YSA + 24;


  XSTAT = TWO * 60;
  YSTAT = TWO * 150;

  XRES = (XBE + XBF + CARDwidthNew) / 2;
  YRES = YSS + CARDHEIGHT / 2;
  XHISTO = XSTAT;
  YHISTO = YSTAT - TWO * 114;

  XHISTO = TWO * 30;
  YHISTO = TWO * 2;
  YSTAT = TWO * 215;
  YPROGRESS = TWO * 311;
  DYPROGRESS = TWO * 20;

  BLUECIRCLERADIUS = TWO * 24;

  TEXTCOLOR = color(120);
  col_resulttext = color(60);
  col_resulttext = color(0);
  WINDRAWSTART = -50;
  //TEST bei 100 Eval
  dx1res = TWO * 10;
  dy1res = TWO * 10;
  x1res = -dx1res;
  y1res = 0;
  x2res0 = TWO * 260;
  y2res0 = TWO * 438;

  x2res0 = 0;
  y2res0 = TWO * 600;

  dx2res = TWO * 1;
  dy2res = TWO * 1;
  x2res = -dx2res;
  y2res = y2res0;
  winfrom = color(180, 180, 255);
  winto = color(16, 16, 255);
  lostfrom = color(255, 180, 180);
  lostto = color(255, 16, 16);

  XMSG = TWO * 20;
  YMSG = TWO * 425;
  //TEST iphone4
  XMSG = TWO * 85;
  YMSG = TWO * 385;
  DXMSG = TWO * (320 - 2 * 20);
}

// Recolor pixels in img: pixels where isSource(r,g,b) → replace with toColor (p5 color)
// Border pixels (1px) are always restored to black.
function recolorImage(img, isSource, toColor) {
  img.loadPixels();
  const px = img.pixels;
  const w = img.width;
  const h = img.height;
  const toR = red(toColor);
  const toG = green(toColor);
  const toB = blue(toColor);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] <= 10) continue;
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
        px[i] = 0; px[i + 1] = 0; px[i + 2] = 0;
      } else if (isSource(px[i], px[i + 1], px[i + 2])) {
        px[i] = toR; px[i + 1] = toG; px[i + 2] = toB;
      }
    }
  }
  img.updatePixels();
}

// Suit 2 = Spade (black → blue), Suit 3 = Diamond (red → green)
const isBlack = (r, g, b) => r < 100 && g < 100 && b < 241;
const isRed   = (r, g, b) => r > 140 && g < 100 && b < 100;

function setCards() {
  CARDwidthNew = 72;
  CARDHEIGHT = 100;

  cardImages = initialize3DArray(3, 4, 13, "");
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 13; j++) {
      cardImages[0][i][j] = newCards.get(j * 72, i * 100, 73, 101);
      cardImages[1][i][j] = newCards.get(j * 72, (i + 4) * 100, 73, 101);
      cardImages[2][i][j] = newCards.get(j * 72, 800 + i * 21, 73, 23);
    }
  }
  bgImg = newCards.get(2 + 1 * 71, 2 + 4 * 99, 70, 97);
  for (let i = 0; i < 4; i++) {
    suitImages[i] = numbcol.get(171 + 21 * i, 38, 15, 13);
  }

  numberImages = initialize2DArray(2, 15, "");
  for (let i = 0; i < 13; i++) {
    numberImages[0][i + 2] = numbcol.get(5 + 34 * i, 74, 12, 15);
    numberImages[1][i + 2] = numbcol.get(5 + 34 * i, 96, 12, 15);
  }

  if (global_fourcolor) {
/*    
    const colClubs    = color(75, 150, 100);
    const colHearts   = color(255, 60, 30);
    const colSpades   = color(55, 55, 55);
    const colDiamonds = color(100, 120, 245);
 */    
    const colClubs    = color(5, 25, 255);
    const colHearts   = color(255, 0, 0);
    const colSpades   = color(5, 5, 5);
    const colDiamonds = color(190, 0, 120);

    for (let j = 0; j < 13; j++) {
      recolorImage(cardImages[0][0][j], isBlack, colClubs);
      recolorImage(cardImages[1][0][j], isBlack, colClubs);
      recolorImage(cardImages[2][0][j], isBlack, colClubs);
      recolorImage(cardImages[0][1][j], isRed,   colHearts);
      recolorImage(cardImages[1][1][j], isRed,   colHearts);
      recolorImage(cardImages[2][1][j], isRed,   colHearts);
      recolorImage(cardImages[0][2][j], isBlack, colSpades);
      recolorImage(cardImages[1][2][j], isBlack, colSpades);
      recolorImage(cardImages[2][2][j], isBlack, colSpades);
      recolorImage(cardImages[0][3][j], isRed,   colDiamonds);
      recolorImage(cardImages[1][3][j], isRed,   colDiamonds);
      recolorImage(cardImages[2][3][j], isRed,   colDiamonds);
    }
  }

  // Update image references on existing Card objects
  if (typeof cards !== "undefined") {
    for (let c of cards) {
      if (!c) continue;
      c.img        = cardImages[0][c.suit][c.rank - 1];
      c.imgOk      = cardImages[1][c.suit][c.rank - 1];
      c.imgCovered = cardImages[2][c.suit][c.rank - 1];
    }
  }
}