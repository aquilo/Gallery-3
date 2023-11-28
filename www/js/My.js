// My -------------------------------------------------------------

var hm = new Array();

class My {

  /*   static String runden(float num, n) {
      print(num + " " + n);
      print(nfc(num, n));
      return nfc(num, n);
    }
  */

  /*  static String runden(float num, int n) {
      if (num == 0) {
        return "0";
      }
      float x = pow(10, n);
      return nfc(round( num * x ) / x, n);
    }
  */


  static round2String(num, n) {
    let x = pow(10, n);
    return nf(round(num * x) / x, 0, 2);
  }

  static prozround(x, n) {
    return int(round(100.0 * (float(x)) / float(n)));
  }

  static interpol(anow, afrom, ato, bfrom, bto) {
    return bfrom + (float(anow - afrom) / float(ato - afrom)) * (bto - bfrom);
  }

  static simpleDateFormat() {
    //   new SimpleDateFormat("dd.MM.yyyy_HH:mm:ss");
    return this.fill2(day()) + "." + this.fill2(month()) + "." + year() +
      "_" + this.fill2(hour()) + ":" + this.fill2(minute()) + ":" + this.fill2(second());
  }

  static fill2(inum) {
    let s = "" + inum;
    if (s.length == 1) return "0" + s;
    else return s;
  }

  static msg(txt) {
    if (!debug) return;
    stroke(255);
    fill(255);
    rect(XMSG, YMSG, ifact * 200, ifact * 670);
    stroke(0);
    fill(0);
    textFont(myFont, F12);
    text(txt, XMSG, YMSG, DXMSG, ifact * 200);
  }

  static print(txt) {
    console.log(txt);
  }

}

function initialize2DArray(rows, cols, initialValue) {
  const twoDArray = new Array(rows);

  for (let i = 0; i < rows; i++) {
    twoDArray[i] = new Array(cols).fill(initialValue);
  }

  return twoDArray;
}

function initialize3DArray(xSize, ySize, zSize, initialValue) {
  const threeDArray = new Array(xSize);

  for (let i = 0; i < xSize; i++) {
    threeDArray[i] = new Array(ySize);

    for (let j = 0; j < ySize; j++) {
      threeDArray[i][j] = new Array(zSize).fill(initialValue);
    }
  }

  return threeDArray;
}

function openTranslations(translationStrings) {
  //-  LANG = navigator.language.substring(0, 2);
  //  String lines[] = loadStrings(dataPath + "translations.txt");
  dataPath = "resources/data/";
  let lines = translationStrings;
  let lang = split(lines[0], "\t");
  let langs = lang.length;
  var key = function (obj) {
    // Some unique object-dependent key
    return obj.totallyUniqueEmployeeIdKey; // Just an example
  };
  for (let i = 1; i < lines.length; i++) {
    for (let j = 1; j < langs; j++) {
      let words = split(lines[i], "\t");
      if (j < words.length)
        // hm.put(lang[j] + "_" + words[0], words[j]);
        hm[key(lang[j] + "_" + words[0])] = words[j];
    }
  }
}

function getTranslation(lang, t) {
  if (lang == "en") return t.replace("$", "\n");
  let a = hm.get(lang + "_" + t);
  if (a == null) return t.replace("$", "\n");
  return a.toString().replace("$", "\n");
}

function morerandom(m, a) {
  let res = -9;
  if (m <= a.length || a.length < 1) {
    res = int(random(m));
    return res;
  }
  let found = false;
  while (!found) {
    res = int(random(m));
    found = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] == res) {
        found = false;
        break;
      }
    }
  }
  return res;
}

function zeitAuswertungen() {
  // for comparison of some routines
  let start, dtime;
  let n = 10000000;
  let xxx = 7;
  let topCard = cards[55];
  let zz;
  print(topCard);
  start = millis();
  for (let ii = 0; ii < n; ii++) {
    zz = topCard.rank - 3;
    for (let i = 0; i < 8; i++) {
      let f = foundationPile[xxx % 3][i];
      if (!f.empty()) {
        let d = f.peek();
        if (zz == d.rank && topCard.suit == d.suit) {}
      }
    }
  }
  dtime = (millis() - start);
  print(n + " evaluations in " + dtime + " millis");
  start = millis();
  for (let ii = 0; ii < n; ii++) {
    for (let i = 0; i < 8; i++) {
      let f = foundationPile[xxx % 3][i];
      if (!f.empty()) {
        let d = f.peek();
        if ((topCard.rank - d.rank) == 3 && topCard.suit == d.suit) {}
      }
    }
  }
  dtime = (millis() - start);
  print(n + " e2valuations in " + dtime + " millis");
}

function addlast(val, a) {
  for (let i = 1; i < a.length; i++) {
    a[i - 1] = a[i];
  }
  a[a.length - 1] = val;
  return a;
}

function textR(s, x, y) {
  os.mytextAlign(RIGHT);
  os.mytext(s, x, y);
  os.mytextAlign(LEFT);
}

function textC(s, x, y) {
  os.mytextAlign2(CENTER, CENTER);
  os.mytext(s, x, y);
  //  print(s + " " +  x + " " + y);
  os.mytextAlign2(LEFT, BASELINE);
}

class Os {
  myimage(p, x, y) {
    if (osp)
      offScreen.image(p, x, y);
    else
      image(p, x, y);
  }

  mynoStroke() {
    if (osp)
      offScreen.noStroke();
    else
      noStroke();
  }

  mynoFill() {
    if (osp)
      offScreen.noFill();
    else
      noFill();
  }

  mytextAlign(a) {
    if (osp)
      offScreen.textAlign(a);
    else
      textAlign(a);
  }

  myrectMode(a) {
    if (osp)
      offScreen.rectMode(a);
    else
      rectMode(a);
  }

  myellipseMode(a) {
    if (osp)
      offScreen.ellipseMode(a);
    else
      ellipseMode(a);
  }

  mytextAlign2(a, b) {
    if (osp)
      offScreen.textAlign(a, b);
    else
      textAlign(a, b);
  }

  mytextFont(pf, s) {
    if (osp)
      offScreen.textFont(pf, s);
    else
      textFont(pf, s);
  }

  myfill(g) {
    if (osp)
      offScreen.fill(g);
    else
      fill(g);
  }
    
  myline(g) {
    if (osp)
      offScreen.line(g);
    else
      line(g);
  }
  
  mystroke(g) {
    if (osp)
      offScreen.stroke(g);
    else
      stroke(g);
  }
  mystroke(g) {
    if (osp)
      offScreen.stroke(g);
    else
      stroke(g);
  }

  myfill2(g, a) {
    if (osp)
      offScreen.fill(g, a);
    else
      fill(g, a);
  }

  myfill3(r, g, b) {
    if (osp)
      offScreen.fill(r, g, b);
    else
      fill(r, g, b);
  }

  mystroke3(r, g, b) {
    if (osp)
      offScreen.stroke(r, g, b);
    else
      stroke(r, g, b);
  }

  mytext(s, x, y) {
    if (osp)
      offScreen.text(s, x, y);
    else
      text(s, x, y);
  }

  myfill4(r, g, b, a) {
    if (osp)
      offScreen.fill(r, g, b, a);
    else
      fill(r, g, b, a);
  }

  myrect6(x, y, w, h, r1, r2) {
    if (osp)
      offScreen.rect(float(x), float(y), float(w), float(h), float(r1), float(r2), float(r1), float(r2));
    else
      rect(x, y, w, h, r1, r2, r1, r2);
  }

  myrect(x, y, w, h) {
    if (osp)
      offScreen.rect(x, y, w, h);
    else
      rect(x, y, w, h);
  }

  myellipse(x, y, w, h) {
    if (osp)
      offScreen.ellipse(x, y, w, h);
    else
      ellipse(x, y, w, h);
  }
}

function getRandomFloatBetween(a, b) {
  // Ensure that 'a' is the minimum value and 'b' is the maximum value
  if (a > b) {
    [a, b] = [b, a];
  }

  // Calculate the random float between 'a' and 'b'
  return Math.random() * (b - a) + a;
}

function getRandomIntBetween(a, b) {
  // Ensure that 'a' is the minimum value and 'b' is the maximum value
  if (a > b) {
    [a, b] = [b, a];
  }

  // Calculate the random integer between 'a' and 'b'
  const min = Math.ceil(a);
  const max = Math.floor(b);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function round_number(num, dec) {
  num = float(num);
  if (typeof num != 'number') return num;
  return num.toFixed(dec);
 // return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

function percent(ip, itot, dec) {
  if (itot > 0) {
    return round_number((100.0 * ip) / itot, dec);
  }
  return '.';
}