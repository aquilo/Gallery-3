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
}