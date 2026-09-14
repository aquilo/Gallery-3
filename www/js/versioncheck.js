/**
 * Prueft periodisch, ob auf dem Server ein neuerer Build liegt als der,
 * mit dem die aktuell laufende Seite geladen wurde, und zeigt in diesem
 * Fall ein Banner mit einem Reload-Button.
 *
 * Wichtig vor allem fuer Leute, die Gallery Solitaire als Shortcut auf
 * dem Homescreen des Handys haben: dieser Tab kann tagelang offen
 * bleiben, ohne diesen Check wuerden sie unbemerkt eine veraltete
 * Version weiterspielen.
 *
 * Setzt dist/version.json voraus (wird von gallery_build.sh erzeugt).
 * In der Dev-Version (index_dev.html) gibt es keine version.json, der
 * fetch schlaegt dann einfach folgenlos fehl (404).
 */

// In dist/index.html setzt der Build ein window.APP_BUILD vor dem
// gebundelten app.js; das ist die tatsaechlich geladene Version. In
// index_dev.html (Dev, kein Build) existiert das nicht - dort bleibt
// known erstmal null und wird beim ersten erfolgreichen Fetch als
// Notloesung gesetzt.
let versioncheck_known = (typeof window.APP_BUILD !== "undefined") ? window.APP_BUILD : null;
const VERSIONCHECK_URL = "version.json";
const VERSIONCHECK_INTERVAL_MS = 60 * 60 * 1000; // 60 Minuten

function versioncheck_fetch() {
    fetch(VERSIONCHECK_URL + "?t=" + Date.now(), { cache: "no-store" })
        .then(function (res) {
            if (!res.ok) return null;
            return res.json();
        })
        .then(function (data) {
            if (!data || !data.version) return;
            if (versioncheck_known === null) {
                versioncheck_known = data.version; // Dev-Notloesung: kein APP_BUILD vorhanden
            } else if (data.version !== versioncheck_known) {
                versioncheck_showBanner();
            }
        })
        .catch(function () {
            // Netzwerkfehler ignorieren, beim naechsten Poll erneut versuchen
        });
}

function versioncheck_showBanner() {
    const banner = document.getElementById("updateBanner");
    if (banner) banner.style.display = "flex";
}

function initVersionCheck() {
    versioncheck_fetch();
    setInterval(function () {
        if (document.visibilityState === "visible") versioncheck_fetch();
    }, VERSIONCHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") versioncheck_fetch();
    });
}

$(document).ready(function () {
    initVersionCheck();
});
