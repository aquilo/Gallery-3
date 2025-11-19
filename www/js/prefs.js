function setStepsPref() {
    window.localStorage.setItem('steps', global_steps);
}

function get1Pref(prefName, defaultValue) {
    var pref = window.localStorage.getItem(prefName);
    if (prefName == "autostat") {
        if (pref === null) {
            pref = defaultValue;
        }
        pref = pref.split(',');
        pref = int(pref);
        return pref;
    }
    if (pref === 'undefined' || pref === 'null' || pref === null || pref === 'NaN') {
        pref = defaultValue;
        window.localStorage.setItem(prefName, pref);
    } else {
        if (typeof pref !== "boolean") {
            if (pref === 'false') {
                pref = false;
            } else if (pref === 'true') {
                pref = true;
            } else {
                if (defaultValue !== '---') {
                    pref *= 1;
                }
            }
        }
    }
    if (prefName != "resimg")
        console.log("get pref: " + prefName + " " + pref + " " + typeof pref);
    return pref;
}

function set1Pref(prefName, pref) {
    window.localStorage.setItem(prefName, pref);
}

function getAllPrefs() {
    global_helplevel = get1Pref("helplevel", 0);
    global_steps = get1Pref("steps", -1);
    if (global_steps < 0) global_steps = 16;
    global_mtime = get1Pref("speed", 400);
    global_resimg = get1Pref('resimg', '---');
    global_auto = get1Pref("auto", 1);
    global_autostat = get1Pref("autostat", "0,0,0,0,0,0,0,0,0,0,0");
}

function setAllPrefs() {
    set1Pref("helplevel", global_helplevel);
    set1Pref("steps", global_steps);
    set1Pref("speed", global_mtime);
    set1Pref("cardfacecolorblind", global_colorblind);
    set1Pref("auto", global_auto);
    set1Pref("autostat", global_autostat.join());
}

function bufferToBase64(buf) {
    var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
    }).join('');
    return btoa(binstr);
}

function doSaveResultImage(img) {
    var base64 = img.canvas.toDataURL();
    set1Pref("resimg", base64);
    console.log("prefs.js, saved result image pref, length " + base64.length);
}

var global_helplevel = 0;
var stat_n = 0;
var stat_player = -1.0;
var stat_mean = -1.0;
var global_steps = 16;
var global_mtime = 400;
var global_sayAuto = 0;
var screenwidthNew = 500;
var global_evaluations = 1000;
var global_resimg;
var global_auto = 1;
var global_show = 1; //TODO
var global_autostat = new Array(11);