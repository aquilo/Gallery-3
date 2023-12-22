function detectDevice() {
  console.log("window: " + windowWidth + " / " + windowHeight);
  let widthNewDraw = 640;
  reduce = (widthNewDraw == 640);
  //TEST
  ifact = reduce ? 2 : 1;
  if (debug) {
    print("screen: " + screen.width + " / " + screen.height);
    print("widthNewDraw: " + widthNewDraw);
    print("reduce: " + reduce);
    print("ifact: " + ifact);
  }
  if (screen.widthNew == 375) {
    device = "iPhone6";
  } else if (screen.widthNew == 414) {
    device = "iPhone6s";
  } else {
    device = "iPhone";
  }
  setGraphParams();
}

function setGraphParams() {
  setCards();
  WIDTH0 = ifact * 320;
  if (ifact == 2) {
    HEIGHT0 = ifact * 620;
    HEIGHT0 = ifact * 430;
  } else {
    HEIGHT0 = ifact * 480;
  }
  scaleFactor = min(1.0, windowWidth / 640.0);
  scaleFactor = min(scaleFactor, windowHeight / 1006.0);
  console.log("Window: " + windowWidth + " / " + windowHeight);

  offScreen = createGraphics(WIDTH0, HEIGHT0); // iphone5: 640 * 1136
  console.log("Offscreen-Canvas: " + WIDTH0 + " / " + HEIGHT0);
  console.log("scaleFactor: " + scaleFactor);

  F8 = ifact * 8;
  F9 = ifact * 9;
  F10 = ifact * 10;
  F11 = ifact * 11;
  F12 = ifact * 12;
  F13 = ifact * 13;
  F14 = ifact * 14;
  F16 = ifact * 16;
  F18 = ifact * 18;
  F24 = ifact * 24;

  XSF = reduce ? 7 : 5;
  YSF = XSF;
  DXSF = CARDwidthNew + (reduce ? 7 : 2);
  DYSF = CARDHEIGHT + (reduce ? 7 : 4);

  XRIGHT = WIDTH0 - ifact * (reduce ? 7 : 3);
  XST = XSF;
  //  YST = YSF + 3 * DYSF + (reduce ? 15 : 8); 
  YST = YSF + 3 * DYSF + (reduce ? 30 : 15);
  DXST = DXSF;
  DYST = reduce ? 18 : 10;

  XSA = XSF;
  if (ifact == 1) {
    YSA = 339 + 7;
  } else {
    YSA = YST + 3 * CARDHEIGHT + 25;
  }
  DXSA = 0;
  DYSA = 0;
  XSS = XRIGHT - ifact * 4 - CARDwidthNew;
  YSS = YSA;
  DXSS = 3;
  DYSS = 0;

  WBN = ifact * 40;
  HBN = ifact * 20;
  WBU = WBN;
  HBU = HBN;
  WBE = CARDwidthNew;
  HBE = CARDHEIGHT;
  WBF = ifact * 75;
  HBF = ifact * 20;

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


  XSTAT = ifact * 60;
  YSTAT = ifact * 150;

  XRES = (XBE + XBF + CARDwidthNew) / 2;
  YRES = YSS + CARDHEIGHT / 2;
  XHISTO = XSTAT;
  YHISTO = YSTAT - ifact * 114;

  XHISTO = ifact * 30;
  YHISTO = ifact * 2;
  YSTAT = ifact * 215;
  YPROGRESS = ifact * 311;
  DYPROGRESS = ifact * 20;

  BLUECIRCLERADIUS = ifact * 24;

  TEXTCOLOR = color(120);
  col_resulttext = color(60);
  col_resulttext = color(0);
  WINDRAWSTART = -50;
  //TEST bei 100 Eval
  dx1res = ifact * 10;
  dy1res = ifact * 10;
  x1res = -dx1res;
  y1res = 0;
  x2res0 = ifact * 260;
  y2res0 = ifact * 438;

  x2res0 = 0;
  y2res0 = ifact * 600;

  dx2res = ifact * 1;
  dy2res = ifact * 1;
  x2res = -dx2res;
  y2res = y2res0;
  winfrom = color(180, 180, 255);
  winto = color(16, 16, 255);
  lostfrom = color(255, 180, 180);
  lostto = color(255, 16, 16);

  XMSG = ifact * 20;
  YMSG = ifact * 425;
  //TEST iphone4
  XMSG = ifact * 85;
  YMSG = ifact * 385;
  DXMSG = ifact * (320 - 2 * 20);
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