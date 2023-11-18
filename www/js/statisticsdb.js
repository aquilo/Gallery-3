/*jslint sloppy: true */
/*global getDb, dbGetMaxNr, errorCB, dbGetAll, successCB, queryAllSuccess, window */

fields = "datetime, alpha, player, result, less, equal, " +
    "more, minimum, median, mean, " +
    "maximum, mode, scores, trials, nAuto, nMoves";

function getDb() {
    return window.openDatabase("Database", "1.0", "Cordova STAT", 200000);
}

function getLastGameNr() {
    getDb().transaction(dbGetMaxNr, errorCB);
}

function getAllStats0() {
    getDb().transaction(dbGetAll, errorCB, successCB);
}


function dbGetAll(tx) {
    //    tx.executeSql('SELECT * FROM STAT', [], queryAllSuccess, errorCB);
    //    tx.executeSql('SELECT *  FROM STAT', [], queryAllSuccess, errorCB);
    tx.executeSql('SELECT avg(player) as player, avg(mean) as mean, count(*) as n  FROM STAT', [], queryAllSuccess, errorCB);
    // sum(case when player < mean then 1 else 0 end) als p,
}

function round_number(num, dec) {
    return num.toFixed(dec);
 //   return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

function percent(ip, itot, dec) {
    if (itot > 0) {
        return round_number((100.0 * ip) / itot, dec);
    }
    return '.';
}

// --------------------------------------------------

function getAllStats() {
    var sel = 'SELECT sum(case when player < mean then 1 else 0 end) as hwins, sum(case when player = 0 or minimum = 0 then 1 else 0 end) as hsolvable, sum(case when player < minimum then 1 else 0 end) as hminwins, sum(case when player = mean then 1 else 0 end) as hdrawn, sum(case when player = 0 then 1 else 0 end) as hzeros, sum(case when player > minimum then 1 else 0 end) as hcbetter, avg(player) as player, avg(mean) as mean, count(*) as n, sum(nauto) as nauto, sum(nmoves) as nmoves, avg(less) as less, avg(equal) as equal, avg(more) as more, avg(result) as result, sum(case when player <= minimum then 1 else 0 end) as nobetter ';
 //   var query = sel + 'FROM STAT UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(20)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(50)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(100)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(200)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(500)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(1000)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(2000)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(5000))';
    var query = sel + 'FROM (select * from STAT order by ROWID desc limit(100)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc limit(1000)) UNION ALL ' + sel + 'FROM (select * from STAT order by ROWID desc)  ' ;
   getDb().transaction(function(tx) {
        tx.executeSql(query, [], queryAllSuccess, errorCB);
    }, errorCB);
}

function queryDumpSuccess(tx, results) {
    var r = results.rows.item(0),
        csvData = "",
        len = results.rows.length,
        i,
        obj,
        key;
    for (i = 0; i < len; i += 1) {
        obj = results.rows.item(i);
        if (i === 0) {
            for (key in obj) {
                csvData += key + ",";
            }
            csvData += "$\n";
        }
        for (key in obj) {
            csvData += obj[key] + ",";

        }
        csvData += "$\n";
    }
    global_csv = csvData;
    /*        to:      ['max.mustermann@appplant.de'],
            cc:      ['erika.mustermann@appplant.de'],
            bcc:     ['john.doe@appplant.com', 'jane.doe@appplant.com'],
            subject: 'Greetings',
            body:    'How are you? Nice greetings from Leipzig'
        });

    */
    // var emailComposer = cordova.require('emailcomposer.EmailComposer')

    /* alternatively exists in global scope as EmailComposer if you embed via a script tag */

    /* emailComposer.show({ 
      to: 'to@example.com',
      cc: 'cc@example.com',
      bcc: 'bcc@example.com',
      subject: 'Example email message',
      body: '<h1>Hello, world!</h1>',
      isHtml: true,
      attachments: [
       // attach a HTML file using a UTF-8 encoded string
       {
         mimeType: 'text/html',
         encoding: 'UTF-8',
         data: '<html><body><h1>Hello, World!</h1></body></html>',
         name: 'demo.html'
       },
       // attach a base-64 encoded veresion of of http://cordova.apache.org/favicon.ico
       {
          mimeType: 'text/png',
          encoding: 'Base64',
          data: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB1WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS4xLjIiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOkNvbXByZXNzaW9uPjE8L3RpZmY6Q29tcHJlc3Npb24+CiAgICAgICAgIDx0aWZmOlBob3RvbWV0cmljSW50ZXJwcmV0YXRpb24+MjwvdGlmZjpQaG90b21ldHJpY0ludGVycHJldGF0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4K5JKPKQAAAtpJREFUOBFNU0toE1EUPTOZTJI2qbG0qUnwg1IFtSBI967cCBHcSsGFgktdC125EvwVLKi0FApaCChuRMSFqAitCNrGJE1DadpSYz5OvpPJ5Od5007xwc1998475513743U6/Uk7K1Op6O0Wq2pdrvt597odrugh/A0hcdk+luhUKhgY0Ryf5HsmizLNz0eN9qtNvRGA8xBdTohyxJjQ8TrBEzaIOk/BQNk3+YHL1WAKiyguL1Wr1tK3C6XteeZ01SRFCSy+Nlb07zdG0umcPvOXTyde8lbZbjcbjyYnsG5CxG8fvsBBJKs+8wG2QouMvFOJB9Mz+JnLA6P24UBnxcNo4nk2jpiiVWEQ2G8j87ApSqo643rgUBg1lJgGMaUAK/EkyhVaxg7eQLhoUEoThX9JBk54MVh/wDSm1uYj75Bv9eHRqNxL5PJTFpF1DRN8fX3oVKp4GhwGB6/H50eoO3sIBgYRpdvr/v8cCeS8KgOFHNZZLNZlfVTLQWKoixDkuElyeLXJdT7vGiHw/j+7QdezC9gCw6MX76Ezx+/QJYkVKiShU6y0MuWAjKlzJYJp+JAIZdDJl+AT3ZgM7OJYqGA4Jkx/C5X4XEpvMSDaq0K0zRTAmcRkCnZZutEm4p6A3MPn8Ahel/SoJstbEVf4dNCFIPBQ/ByRqpU0Gw2UyzbhkVAOSkywuGQMT5+HgOsuEtRIJ06jl63B4nqmuzGwZEAnE7FIhCYSCRSsggIXmcnxLtw4+oViNluc4Q7HCbbi4ES34tayRoyHknTdgdpdHQ0S4KcUJBKrdXuP3q8XGZH/uTzyOXyKJXLeD4zF1uJr2ZFnfh26Lq+sU8gSZJaLpfTBmWyQLWlxaWczlpoWskk2GzyefH4r7+JRGKHZ4WS9MTEREUQWJPIpJv7Y7SztCM0EYvV3XX7I28w3qbFaBtUotsEKhN+2hCtjybmwwZzay07pzMSf+cSCcx/K8WXLZEV/swAAAAASUVORK5CYII=',
          name: 'cordova.png'
        }
        // attach a file using a hypothetical file path
        //,{ filePath: './path/to/your-file.jpg' }
      ],
      onSuccess: function (winParam) { 
        console.log('EmailComposer onSuccess - return code ' + winParam.toString());
      },
      onError: function (error) {
        console.log('EmailComposer onError - ' + error.toString());
      }
    });

    */

    //   EmailComposer.prototype.showEmailComposer("GallerySolitaire Data, " + new Date(),
    //     global_csv, "", "", "", true);

    //   EmailComposer.prototype.showEmailComposer("GallerySolitaire Data, " + new Date(),
    //     global_csv, "", "", "", true);
    cordova.plugins.email.open({

        subject: 'GallerySolitaire Data, ' + new Date(),
        body: global_csv,
        isHtml: true


    })
}

function doDumpDb(tx) {
    getDb().transaction(function(tx) {
        tx.executeSql('SELECT * FROM STAT', [], queryDumpSuccess, errorCB);
    }, errorCB);
}

function queryAllSuccess(tx, results) {
    var len = results.rows.length;
    var r = results.rows.item(len - 1);
    var s;
    global_statistics = r;
    var nn = r.n;
    var rrr = '<table class="statsummery" border="0.0px" style="font-size: 12px">';
    //   console.log(JSON.stringify(r));
    aaa = results;
    console.log(results.rows);
    var k = -1;
    do {
        k = k + 1;
    } while (results.rows.item(k).n !== nn);
    len = k + 1;

    rrr += '<tr><th># of games (last &#8230;)</th>';
    for (var i = 0; i < len; i++) {
        rrr += '<td>' + results.rows.item(i).n + '</td>';
    }
    rrr += '<th>good:</th></tr>';

    rrr += '<tr><th>% better or equal</th>';
    for (var i = 0; i < len; i++) {
        rrr += '<td>' + round_number(results.rows.item(i).more + results.rows.item(i).equal, 2) + '</td>';
    }
    rrr += '<th>81.62</th></tr>';

    rrr += '<tr><th>mean score</th>';
    for (var i = 0; i < len; i++) {
        rrr += '<td>' + round_number(results.rows.item(i).mean, 2) + '</td>';
    }
    rrr += '<th>21.7</th></tr>';

    rrr += '<tr><th>% games with score 0</th>';
    for (var i = 0; i < len; i++) {
        s = results.rows.item(i);
        rrr += '<td>' + percent(s.hzeros, s.n, 2) + '</td>';
    }
    rrr += '<th>14.6</th></tr>';

    rrr += '<tr><th>% solved of solvable</th>';
    for (var i = 0; i < len; i++) {
        s = results.rows.item(i);
        rrr += '<td>' + percent(s.hzeros, s.hsolvable, 2) + '</td>';
    }
    rrr += '<th>45.6</th></tr>';

    rrr += '<tr><th>% best result</th>';
    for (var i = 0; i < len; i++) {
        s = results.rows.item(i);
        rrr += '<td>' + percent(s.n - s.hcbetter, s.n, 2) + '</td>';
    }
    rrr += '<th>23.9</th></tr>';

    rrr += '<tr><th>% mean result</th>';
    for (var i = 0; i < len; i++) {
        s = results.rows.item(i);
        rrr += '<td>' + round_number(s.result, 2) + '</td>';
    }
    rrr += '<th>78.2</th></tr>';

    rrr += '<tr><th>% better than c\'s mean</th>';
    for (var i = 0; i < len; i++) {
        s = results.rows.item(i);
        rrr += '<td>' + percent(s.hwins, s.n, 2) + '</td>';
    }
    rrr += '<th>85.6</th></tr>';


    rrr += '</table>';
    statText = [
        '<h2>Your Results</h2>',
        '<div class="rules">For comparison: <i>empirical results</i>.<br><br>',

        '<h3>Basic Indicators</h3>',
        '<strong>Number of games</strong>: <b>' + round_number(r.n, 2) + '</b>',
        '<br/>Mean score: <b>' + round_number(r.player, 2) + '</b>',
        '&nbsp;&nbsp;(<i>21.6</i>; computer: ' + round_number(r.mean, 2) + ')</br></br>',

        '<h3>Winning Situations</h3>',
        '<strong>Games with score 0</strong>: <b>' + percent(r.hzeros, r.n, 2) + '%</b> (<i>14.4%</i>)',
        ', but solvable were at least <strong>' + percent(r.hsolvable, r.n, 2) + '%</strong> (<i>31.7%</i>). <br>This means that you solved at most <b>' + percent(r.hzeros, r.hsolvable, 2) + '%</b> (<i>44.8%</i>) of all solvable games.</br></br>',

        '<h3>Comparisons</h3>',
        'Comparisons to the random tapping "strategy": ',

        '</p><strong>Best Result</strong>: In only <b>' + percent(r.n - r.hcbetter, r.n, 2) + '%</b> (<i>23.6%</i>) ',
        'you achieved the best possible result.</p>',

        '</p><strong>Perfect Games</strong>: You are at least as good as the computer in <b>' + round_number(r.more + r.equal, 2) + '%</b> (<i>81.6%</i>) ',
        'of the games (compared to the computer your result was better result in <strong>' + round_number(r.more, 1) + '%</strong>, equal in <strong>' + round_number(r.equal, 1) + '%</strong>, and worse in <strong>' + round_number(r.less, 1) + '%</strong>.</p>',
        '<hr>',
        '<strong>Mean result</strong>: <b>' + round_number(r.result, 2) + '%</b> (<i>78.1%</i>)<br/>',
        'The result of a single game is the percentage of computer\'s scores worse than your\'s (mean: <strong>' + round_number(r.more, 2) + '</strong>) plus half of the drawn attempts (mean: <strong>' + round_number(r.equal, 2) + ' / 2</strong>). You see this number after a evaluation in the center of ',
        'the horizontal coloured bar.</p>',

        '<p><strong>Games won</strong>: <b>' + percent(r.hwins, r.n, 2) + '%</b> (<i>85.2%</i>)',
        '</br>Your score was better than computer\'s mean out of many attempts.</p>',
        '<p>Games better than computer\'s best: <strong>' + percent(r.hminwins, r.n, 2) + ' %</strong>.',
        '<br/>This depends on the number of attempts. With very many attempts the program ',
        'will sometime play the same game as you did - or even a better one.</p>',


        '<h3>Other indicator</h3>',
        'Auto moves: <b>' + percent(r.nauto, r.nmoves, 1) + ' %</b>. <br>Usual duration of a game: ',
        "<i>2'" + '11"</i> (includes evaluation).',

        '<br/></br>',
        rrr,
        '<br/></br></div>'

    ].join('');

    /*
        var len = results.rows.length;
     for (var i=0; i<len; i++){
     var r = results.rows.item(i);
     console.log("Row = " + i + " Data =  " + r.player + " " + r.result);
     } */
}

// --------------------------------------------------

function errorCB(err) {
    //  alert("Error processing SQL: " + err.code + ": " + err.message);
    console.log("Error processing SQL: " + err.code + ": " + err.message);
}

function successCB(tx, tresults) {
    //   alert("success!");
    // statText = '+++';
}

function saveStat(tx) {
    tx.executeSql('REPLACE INTO STAT (' + fields + ') VALUES (' + allValues + ')');
}

function dbSave(allValues0) {
    allValues = allValues0;
    getDb().transaction(saveStat, errorCB, successCB);
}

function dropStat(tx) {
    tx.executeSql('DROP TABLE IF EXISTS STAT');
}

function dbDrop() {
    getDb().transaction(dropStat, errorCB, successCB);
}

function createStat(tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS STAT (' +
        'datetime TEXT PRIMARY KEY, alpha REAL, player INTEGER, result REAL, less REAL, equal REAL, ' +
        'more REAL, minimum INTEGER, median INTEGER, mean REAL, ' +
        'maximum INTEGER, mode INTEGER, scores INTEGER, trials INTEGER, nAuto INTEGER, nMoves INTEGER)');
    tx.executeSql('CREATE VIEW IF NOT EXISTS STATV as ' +
        'SELECT avg(player) as player, avg(mean) as mean, count(*) as n  FROM STAT');
}

function dbCreate() {
    getDb().transaction(createStat, errorCB, successCB);
}
// ------------------------------------------------------------------

function dbGetMaxNr(tx) {
    //   tx.executeSql('CREATE TABLE IF NOT EXISTS STAT (' + fields + ')');
    tx.executeSql('SELECT MAX(id) AS maxid FROM STAT', [], querySuccess, errorCB);
}

function querySuccess(tx, results) {
    if (results.rows.length === 1) {
        gamenr = results.rows.item(0).maxid;
    }
    if (gamenr === null) {
        gamenr = 0;
    }
}

/* 
 function onDeviceReady() {
 var db = window.openDatabase("Database", "1.0", "Cordova STAT", 200000);
 db.transaction(populateDB, errorCB, successCB)
 }
 */


function setStepsPref() {
    //  console.log('steps: ' + global_steps);
    window.localStorage.setItem('steps', global_steps);
}

function get1Pref(prefName, defaultValue) {
    var pref = window.localStorage.getItem(prefName);
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
    //  console.log(prefName + " " + pref + " " + typeof pref);
    //  console.log("get " + prefName + " " + pref + " " + typeof pref);
    return pref;
}

function set1Pref(prefName, pref) {
    //  console.log("save " + prefName + " " + pref + " " + typeof pref);
    window.localStorage.setItem(prefName, pref);
}

function getAllPrefs() {
    //  console.log("getAllPrefs");
    global_helplevel = get1Pref("helplevel", 0);
    global_steps = get1Pref("steps", 30);
    global_mtime = get1Pref("speed", 250);
 //   global_cardface = get1Pref("cardface", 1);
    global_cardface = 2;
    global_resimg = get1Pref('resimg', '---');
    global_auto = get1Pref("auto", 1);

}

function setAllPrefs() {
    //  console.log("setAllPrefs");
    set1Pref("helplevel", global_helplevel);
    set1Pref("steps", global_steps);
    set1Pref("speed", global_mtime);
    set1Pref("cardfacecolorblind", global_colorblind);
    set1Pref("auto", global_auto);
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
}
   
var global_helplevel = 999;
var stat_n = 0;
var stat_player = -1.0;
var stat_mean = -1.0;
var global_steps = 35;
var global_mtime = 200;
var global_sayAuto = 0;
var global_cardface = 2;
var screenwidthNew = 500;
var global_evaluations = 1000;
var global_resimg = "";
var global_auto = 1;
var global_show = 1; //TODO