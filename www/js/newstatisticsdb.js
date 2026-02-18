// window.onload = async function () {
// 	let st = await doStatTable();
//     console.log(st);
// 	//calcValues();
// };

let statText;
let statistcsTable;

let good_be = 81.7;
let good_mean = 21.6;
let good_zeros = 15.2;
let good_solvsolv = 46.7;
let good_best = 25.4;
let good_meanres = 78.7;
let good_bettermean = 85.7;
let good_solvable = 31.7;
let game_time = "1'55\"";
let good_elo = 1885.5;

// Rating-Config (Option B: Gating)
const ratingCfg = {
    w_solved: 0.10,
    w_mean: 0.05,
    w_percentile: 0.75,
    w_best: 0.05,
    gamma: 1.6,
    w_diff: 0.05,
    diff_scale: 8,
    cap_solvable_not_solved: 0.60,
    floor_under_min: 0.90,
    floor_solved: 0.65,
    clip_low: 0.02,
    clip_high: 0.98,
    rating_scale: 800,
    rating_mid: 1500,
    alpha_ewma: 0.10,
    alpha_ewma_pct: 0.1,
    start_ewma: 1500,
    window_N: 20
};

const ratingState = {
    ewma: ratingCfg.start_ewma,
    ewmaPct: 50, // EWMA for percentile (0-100)
    buf: [], // letzte N GameRatings
    N: ratingCfg.window_N
};

// let jsstoreCon = new JsStore.Connection();


window.onload = async function () {
    // initDb();
}

async function initDb() {
    var isDbCreated = await jsstoreCon.initDb(getDbSchema());
    if (isDbCreated) {
        print('db created');
    } else {
        print('db opened');
    }
}

function getDbSchema() {
    var table = {
        name: 'STAT',
        columns: {
            datetime: {
                primaryKey: true,
                dataType: 'string'
            },
            alpha: {
                notNull: true,
                dataType: 'number'
            },
            player: {
                notNull: true,
                dataType: 'number'
            },
            result: {
                notNull: true,
                dataType: 'number'
            },
            less: {
                notNull: true,
                dataType: 'number'
            },
            equal: {
                notNull: true,
                dataType: 'number'
            },
            more: {
                notNull: true,
                dataType: 'number'
            },
            minimum: {
                notNull: true,
                dataType: 'number'
            },
            median: {
                notNull: true,
                dataType: 'number'
            },
            mean: {
                notNull: true,
                dataType: 'number'
            },
            maximum: {
                notNull: true,
                dataType: 'number'
            },
            mode: {
                notNull: true,
                dataType: 'number'
            },
            scores: {
                notNull: true,
                dataType: 'number',
            },
            trials: {
                notNull: true,
                dataType: 'number'
            },
            nAuto: {
                notNull: true,
                dataType: 'number',
            },
            nMoves: {
                notNull: true,
                dataType: 'number',
            }
        }
    }

    var db = {
        name: 'Gallery-DB',
        tables: [table]
    }
    return db;
}

function calcIndicators(stats) {
    let res = {
        n: 0,
        hwins: 0,
        hsolvable: 0,
        hminwins: 0,
        hzeros: 0,
        hcbetter: 0,
        avg_player: 0,
        avg_mean: 0,
        sum_nauto: 0,
        sum_nmoves: 0,
        avg_less: 0,
        avg_equal: 0,
        avg_more: 0,
        avg_result: 0,
        nobetter: 0,
        elo: 0
    }
//    console.log(stats);
    stats.forEach(s => {
        res.n++;
        if (s.player < s.mean) res.hwins++;
        if (s.player == 0 || s.minimum == 0) res.hsolvable++;
        if (s.player < s.minimum) res.hminwins++;
        if (s.player == 0) res.hzeros++;
        if (s.player > s.minimum) res.hcbetter++;
        res.avg_player += s.player;
        res.avg_mean += s.mean;
        res.sum_nauto += s.nAuto;
        res.sum_nmoves += s.nMoves;
        res.avg_less += s.less;
        res.avg_equal += s.equal;
        res.avg_more += s.more;
        res.avg_result += s.result;
        if (s.player <= s.minimum) res.nobetter++;
    });
    res.avg_player /= res.n;
    res.avg_mean /= res.n;
    res.avg_less /= res.n;
    res.avg_equal /= res.n;
    res.avg_more /= res.n;
    res.avg_result /= res.n;

    // 4) Config (Beispiel: dein Balanced-Preset)
    /* const cfg = {
        w_solved: 0.20,
        w_mean: 0.25,
        w_percentile: 0.45,
        w_best: 0.10,
        gamma: 1.6,
        cap_solvable_not_solved: 0.55,
        floor_under_min: 0.90,
        floor_solved: 0.80,
        clip_low: 0.02,
        clip_high: 0.98,
        rating_scale: 800,
        rating_mid: 1500,
        alpha_ewma: 0.10,
        start_ewma: 1500, // oder letzter gespeicherter EWMA-Wert
        window_N: 20,
    };
 */
    const cfg = ratingCfg;
    // 5) Rechnen
    // angenommen: const stat = [...]  // deine Objekte aus dem Spiel
    const rows = adaptStat(stats);
    const results = computeRatings(rows, cfg);

    // 6) Ergebnis zurück in deine Objekte mergen (wenn gewünscht)
    results.forEach((r, i) => {
        stats[i].C_raw = r.C_raw;
        stats[i].C_gated = r.C_gated;
        stats[i].C_clipped = r.C_clipped;
        stats[i].GameRating = r.GameRating;
        stats[i].EWMA_Rating = r.EWMA_Rating;
        stats[i].RollingNRating = r.RollingN_Rating;
    });

      // 3) State setzen (für schnelle Live-Updates)
      ratingState.cfg = cfg;
      ratingState.rows = rows;
      ratingState.results = results;
      ratingState.lastEWMA = results.length ? results[results.length - 1].EWMA_Rating : cfg.start_ewma;
      ratingState.ewmaPct = results.length ? results[results.length - 1].EWMA_Percentile : 50;
      ratingState.rollingN = cfg.window_N;
      ratingState.rollingBuf = results.slice(-cfg.window_N).map(r => r.GameRating);
/* 
    console.log("stats with ratings");
    console.log(stats);  
     */
    res.elo = rebuildFeverFromResults(ratingState.results, true); // EWMA
    return res;
}

function rebuildFeverFromResults(results, useEWMA = true) {
    const pts = results.map(r => ({
        x: r.datetime,
        y: useEWMA ? r.EWMA_Rating : r.GameRating,
        y2: r.EWMA_Percentile ?? ((r.Percentile_p ?? 0) * 100),
        underMin: !!r.BestResult,
        missedSolvable: (r.Solvable && r.SolvedGivenSolvable === 0)
    }));
    fever.setData(pts);
    console.log("ELO-Mean (" + pts.length + "): " + round_number(fever.meanElo(), 2));
    return fever.meanElo();
} 

function buildSeriesFromResults(results) {
    const main = results.map(r => ({
        x: r.datetime,
        y: r.EWMA_Rating, // Hauptkurve = EWMA
        underMin: !!r.BestResult,
        missedSolvable: (r.Solvable && r.SolvedGivenSolvable === 0)
    }));
    const alt = results.map(r => ({
        x: r.datetime,
        y: r.GameRating
    })); // Zweitkurve
    return {
        main,
        alt
    };
}

function getConfigFromUIOrDefaults() {
    return {
        w_solved: 0.20,
        w_mean: 0.25,
        w_percentile: 0.45,
        w_best: 0.10,
        gamma: 1.6,
        cap_solvable_not_solved: 0.55,
        floor_under_min: 0.90,
        floor_solved: 0.80,
        clip_low: 0.02,
        clip_high: 0.98,
        rating_scale: 800,
        rating_mid: 1500,
        alpha_ewma: 0.10,
        start_ewma: 1500,
        window_N: 20
    };
}
// 1) Helfer: "26.08.2025_23:18:03" -> "2025-08-26T23:18:03"
function deDateToISO(s) {
    // "DD.MM.YYYY_HH:mm:ss"
    const [d, t] = s.split('_');
    const [dd, mm, yyyy] = d.split('.').map(Number);
    return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}T${t}`;
}

// 3) Deine Rohdaten (stat) -> rows für computeRatings
function adaptStat(stat) {
    return stat.map(row => ({
        datetime: deDateToISO(row.datetime),
        player: Number(row.player),
        equal: Number(row.equal),
        more: Number(row.more),
        minimum: Number(row.minimum),
        mean: Number(row.mean),
        median: Number(row.median),
    }));
}



async function getIndicators(limit) {
    stats = await jsstoreCon.select({
        from: 'STAT',
        order: {
            // by: datetime.substr(6, 4) + datetime.substr(3, 2) + datetime.substr(0, 2) + datetime.substr(11, 8),
            by: 'datetime',
            type: 'desc'
        },
        // limit: limit
    });
    stats.forEach(s => {
    //    s.sorter = s.datetime.substr(6, 4) + s.datetime.substr(3, 2) + s.datetime.substr(0, 2) + s.datetime.substr(11, 8);
        s.sorter = deDateToISO(s.datetime); 
    });

    const n = limit; // Replace with the desired number of elements

    // Sort the array by the 'sorter' field in descending order
    stats.sort((a, b) => b.sorter.localeCompare(a.sorter));

    // Get the first 'n' elements after sorting
    const firstNElements = stats.slice(0, n);

    // console.log("The first", n, "elements sorted by 'sorter' field:", firstNElements);
/*
    if (stats.length < 101) console.log(stats);
    if (stats.length < 101) console.log(firstNElements);

    console.log("****************************");
    console.log(firstNElements);
  */
    return firstNElements;
}

async function doStatTable() {
    let stattable = new Array();
    try {
        let res, stats;
        stats = await getIndicators(999999);
        res_all = calcIndicators(stats);
        

        let nn = 100;
        if (res_all.n > nn) {
            stats = await getIndicators(nn);
            res = calcIndicators(stats);
            stattable.push(res);
        }

        nn = 1000;
        if (res_all.n > nn) {
            stats = await getIndicators(nn);
            res = calcIndicators(stats);
            stattable.push(res);
        }

        stattable.push(res_all);
        updateStats(stattable);
        statistcsTable = stattable;
        return stattable;
    } catch (ex) {
        console.log("ERROR: ", ex.message)
    }
}

async function saveGame(game) {
    try {
        var noOfDataInserted = await jsstoreCon.insert({
            into: 'STAT',
            upsert: true,
            values: [game]
        });
        doStatTable();

    } catch (ex) {
        console.log("ERROR: ", ex.message);
    }

}

async function calcValues() {
    console.log("calcValues");

    try {
        console.log("calcValue1");
        var indicators = await jsstoreCon.select({
            from: 'STAT',
            aggregate: {
                avg: ['player', 'mean'],
                count: "n"
            }
        });
        var n = await jsstoreCon.count({
            from: "STAT",
        });

        console.log("indicators");
        console.log(indicators[0]);
        console.log(n);

        //console.log(indi2);
    } catch (ex) {
        console.log("ERROR: ", ex.message);
    }
}

async function updateGame() {
    var xxx;
    try {
        var noOfDataUpdated = await jsstoreCon.update({
            in: 'Game',
            set: {
                name: game.name,
                gender: game.gender,
                country: game.country,
                city: game.city
            },
            where: {
                id: game.id
            }
        });
        console.log(`data updated ${noOfDataUpdated}`);
        $('form').attr('data-game-id', null);
        doStatTable();
    } catch (ex) {
        console.log("ERROR: ", ex.message);
    }
}

async function deleteGame(id) {
    try {
        var noOfGameRemoved = await jsstoreCon.remove({
            from: 'Game',
            where: {
                id: id
            }
        });
        console.log(`${noOfGameRemoved} games removed`);
        doStatTable();
    } catch (ex) {
        console.log("ERROR: ", ex.message);
    }
}

function updateStats(results) {
    var len = results.length;
    var r = results[len - 1];
    var s;
    global_statistics = r;
    var nn = r.n;
    var rrr = '<h1>Your Results</h1><h2>Summary Table</h2><div class="rules">For comparison: <i>empirical results</i>.<br><br><table class="table table-sm statsummary" border="0.0px" style="font-size: 12px">';
    aaa = results;
    var k = -1;
    do {
        k = k + 1;
    } while (results[k].n !== nn);
    len = k + 1;

    function compareres(val, goodval, cls1, cls2) {
        cls = (val > goodval) ? cls1 : cls2;
        return '<td class="' + cls + '">' + round_number(val, 2) + '</td>';
    }

    rrr += '<tr><td>Last &#8230; games:</td>';
    for (var i = 0; i < len; i++) {
        rrr += '<td>' + results[i].n + '</td>';
    }
    rrr += '<td class="valcompare">good</td></tr>';

    rrr += '<tr><td style="text-align: left">Mean score</td>';
    for (var i = 0; i < len; i++) {
        rrr += compareres(results[i].avg_player, good_mean, 'valworse', 'valbetter');
    }
    rrr += '<td class="valcompare">' + good_mean + '</td></tr>';

    rrr += '<tr><td style="text-align: left">Games with score 0</td>';
    for (var i = 0; i < len; i++) {
        s = results[i];
        rrr += compareres(percent(s.hzeros, s.n, 2), good_zeros, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_zeros + '</td><td>%<td></tr>';

    rrr += '<tr><th>Solved of solvable</th>';
    for (var i = 0; i < len; i++) {
        s = results[i];
        rrr += compareres(percent(s.hzeros, s.hsolvable, 2), good_solvsolv, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_solvsolv + '</td><td>%<td></tr>';

    rrr += '<tr><th>Best result</th>';
    for (var i = 0; i < len; i++) {
        s = results[i];
        rrr += compareres(percent(s.n - s.hcbetter, s.n, 2), good_best, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_best + '</td><td>%<td></tr>';

     
    rrr += '<tr><th>Better or equal</th>';
    for (var i = 0; i < len; i++) {
        rrr += compareres(results[i].avg_more + results[i].avg_equal, good_be, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_be + '</td><td>%<td></tr>';

/*    rrr += '<tr><th>Mean result</th>';
    for (var i = 0; i < len; i++) {
        s = results[i];
        rrr += compareres(s.avg_result, good_meanres, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_meanres + '</td><td>%<td></tr>';
 */
    rrr += '<tr><th>Better than c\'s mean</th>';
    for (var i = 0; i < len; i++) {
        s = results[i];
        rrr += compareres(percent(s.hwins, s.n, 2), good_bettermean, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_bettermean + '</td><td>%<td></tr>';

   rrr += '<tr><th>"ELO"</th>';
    for (var i = 0; i < len; i++) {
        s = results[i];
        rrr += compareres(results[i].elo, good_elo, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_elo + '</td><td><td></tr>';




    rrr += '</table>';

    statText = [

        rrr, '<br>',

        '<h2>The Indicators</h2>',
        '<strong>Number of games</strong>: <b>' + r.n + '</b>',
        '<br/>Mean score: <b>' + round_number(r.avg_player, 2) + '</b>',
        '&nbsp;&nbsp;(<i>' + good_mean + '</i>; computer: ' + round_number(r.avg_mean, 2) + ')<br>',

        '<strong>Zero-score games</strong>: <b>' + percent(r.hzeros, r.n, 2) + '%</b> (<i>' + good_zeros + '%</i>)',
        ', but at least <strong>' + percent(r.hsolvable, r.n, 2) + '%</strong> (<i>' + good_solvable + '%</i>) were solvable. <br>You solved <b>' + percent(r.hzeros, r.hsolvable, 2) + '%</b> (<i>' + good_solvsolv + '%</i>) of solvable games.<br><br>',

        '<h3>Comparisons to the random tapping "strategy"</h3>',

        '<strong>Best result</strong>: Achieved in <b>' + percent(r.n - r.hcbetter, r.n, 2) + '%</b> (<i>' + good_best + '%</i>) ',
        ' of the games.</p>',

        '</p><strong>Compared to all attempts</strong>: In <b>' + round_number(r.avg_more + r.avg_equal, 2) + '%</b> of the attempts, you performed at least as well as the computer (<i>' +
        good_be + '%</i>) - ',
        'better <strong>' + round_number(r.avg_more, 1) + '%</strong>, equal <strong>' + round_number(r.avg_equal, 1) + '%</strong>, worse <strong>' + round_number(r.avg_less, 1) + '%</strong></p>',
/*         '<strong>Mean result</strong>: <b>' + round_number(r.avg_result, 2) + '%</b> (<i>' + good_meanres + '%</i>)<br/>',
        'The result of a single game is the percentage of computer\'s scores worse than your\'s (mean: <strong>' + round_number(r.avg_more, 2) + '</strong>) plus half of the drawn attempts (mean: <strong>' + round_number(r.avg_equal, 2) + ' / 2</strong>). You see this number after a evaluation in the center of ',
        'the horizontal coloured bar.</p>', */

        '<p><strong>Compared to the mean</strong>: In <b>' + percent(r.hwins, r.n, 2) + '%</b> (<i>' + good_bettermean + '%</i>)',
        ' of games, your score was better than the computer’s average over many attempts.</p>',
        // '<p>Games better than computer\'s best: <strong>' + percent(r.hminwins, r.n, 2) + ' %</strong>.',
        // 'With many attempts, the program will sometimes match or exceed your best play.</p><br>',


        '<h3>Other indicators</h3>',
        'Typical game duration: <i>' + game_time + '</i> (including evaluation).<br>',
        'Auto moves: <b>' + percent(r.sum_nauto, r.sum_nmoves, 1) + ' %</b>. ',

        '<br/><br>'

    ].join('');
    // My.print(statText);

    stab = [];
    for (let i = 1; i < global_autostat.length; i++) {
        stab.push({
            "short": shortTxt[i],
            "long": longTxt[i],
            "n": global_autostat[i],
        });
    }

    function compareByN(a, b) {
        return b.n - a.n;
    }
    stab.sort(compareByN);

    let totalauto = global_autostat.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

    rrr = '<h3>Auto move reasons</h3><p><i>T, Twin</i> = card of same suit and rank<br>' + totalauto + ' auto moves.</p><table class="table table-sm statsummary" border="0.0px" style="font-size: 11px">';
    for (let i = 0; i < stab.length; i++) {
        rrr += "<tr><td class='text-start'>" + stab[i].short + "</td><td class='text-start'>" + stab[i].long + "</td><td>" + percent(stab[i].n, totalauto, 2) + "&nbsp;%</td></tr>";
    }
    rrr += "</table></div>";
    statText += rrr;

    var statisticsTextDiv = document.getElementById("statisticstext");
    statisticsTextDiv.innerHTML = statText;
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    // iOS Safari doesn't support a.click() downloads — open in new tab instead
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
        window.open(url, '_blank');
    } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function exportStatisticsAsCsv() {
    let stats;
    try {
        stats = await getIndicators(999999);
    } catch (ex) {
        console.log("ERROR: ", ex.message);
        alert("Fehler beim Lesen der Statistiken: " + ex.message);
        return;
    }

    const csvData = statsToCsv(stats);

    // Optional: global_csv weiterverwenden, falls du es anderswo brauchst
    window.global_csv = csvData;

    // CSV als Blob erzeugen & herunterladen
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const d = new Date();
    const ts = d.getFullYear().toString()
              + String(d.getMonth() + 1).padStart(2, "0")
              + String(d.getDate()).padStart(2, "0");
    downloadFile(blob, `galleryresults${ts}.csv`);
}

async function exportStatisticsAsMail() {
    let stats;
    try {
        stats = await getIndicators(999999);
    } catch (ex) {
        console.log("ERROR: ", ex.message)
    }

    var r = stats,
        csvData = "",
        len = stats.length,
        i,
        obj,
        key;
    for (i = 0; i < len; i += 1) {
        obj = stats[i];
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

    // cordova.plugins.email.open({
    //     subject: 'GallerySolitaire Data, ' + new Date(),
    //     body: global_csv,
    //     isHtml: true
    // })

    const recipient = '';
    const subject = 'GallerySolitaire Data, ' + new Date();
    const body = global_csv;
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
}

async function resetStatistics() {
    var rowsDeleted = await jsstoreCon.remove({
        from: "STAT"
    });
    console.log(rowsDeleted);
}

async function handleStatisticsFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const success = await importStatisticsFromCsv(text);
        if (success) {
            console.log("Statistics imported successfully");
        } else {
            console.log("Failed to import statistics");
        }
    } catch (error) {
        console.error("Error reading file:", error);
    }
}

function statsToCsv(stats) {
    if (!stats || !stats.length) return "";

    const keys = Object.keys(stats[0]);

    const escapeCsv = (val) => {
        if (val === null || val === undefined) return "";
        const s = String(val).replace(/"/g, '""'); // " -> ""
        // Wenn Kommas, Anführungszeichen oder Zeilenumbrüche vorkommen, in Quotes packen
        if (/[",\n]/.test(s)) {
            return `"${s}"`;
        }
        return s;
    };

    const lines = [];

    // Header-Zeile
    lines.push(
        keys.map(escapeCsv).join(",") + ",$"
    );

    // Daten-Zeilen
    for (const row of stats) {
        const line = keys.map(k => escapeCsv(row[k])).join(",") + ",$";
        lines.push(line);
    }

    return lines.join("\n");
}

async function importStatisticsFromCsv(csvText) {
    try {
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim()).filter(h => h !== '$');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',').map(v => v.trim()).filter(v => v !== '$');
            if (values.length !== headers.length) continue;

            const row = {};
            headers.forEach((header, index) => {
                // Convert string values to appropriate types based on the schema
                const value = values[index];
                if (header === 'datetime') {
                    row[header] = value;
                } else {
                    row[header] = parseFloat(value);
                }
            });
            data.push(row);
        }

        if (data.length === 0) {
            throw new Error('No valid data found in CSV');
        }

        // Insert data into database
        await jsstoreCon.insert({
            into: 'STAT',
            values: data,
            upsert: true // If record with same primary key exists, update it
        });

        // Refresh statistics display
        await doStatTable();
        return true;
    } catch (ex) {
        console.error("Error importing CSV:", ex);
        return false;
    }
}

// Export all preferences as an object
function exportPreferencesAsJson() {
    return {
        helplevel: get1Pref("helplevel", 0),
        steps: get1Pref("steps", 30),
        speed: get1Pref("speed", 250),
        cardface: get1Pref("cardface", 1),
        resimg: get1Pref('resimg', '---'),
        auto: get1Pref("auto", 1),
        autostat: get1Pref("autostat", ""),
        colorblind: get1Pref("cardfacecolorblind", false)
    };
}
   

function exportPreferences() {
    console.log("Exporting preferences to file");
    const exportData = {
        version: 1,
        date: new Date().toISOString(),
        preferences: exportPreferencesAsJson()
    };

    // Convert to JSON string
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    // Download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = 'gallery-solitaire-preferences-' + new Date().toISOString().split('T')[0] + '.json';
    downloadFile(blob, filename);
}

function importPreferences(prefs) {
    if (!prefs) return;
    
    if (prefs.helplevel !== undefined) set1Pref("helplevel", prefs.helplevel);
    if (prefs.steps !== undefined) set1Pref("steps", prefs.steps);
    if (prefs.speed !== undefined) set1Pref("speed", prefs.speed);
    if (prefs.cardface !== undefined) global_cardface = prefs.cardface;
    if (prefs.resimg !== undefined) set1Pref("resimg", prefs.resimg);
    if (prefs.auto !== undefined) set1Pref("auto", prefs.auto);
    if (prefs.autostat !== undefined) set1Pref("autostat", prefs.autostat);
    if (prefs.colorblind !== undefined) set1Pref("cardfacecolorblind", prefs.colorblind);
    
    // Apply the imported preferences
    getAllPrefs();
}

// Import preferences from a file content (JSON) and apply them
async function importPreferencesFromFile(fileContent) {
    try {
        const importData = JSON.parse(fileContent);
        if (importData && importData.preferences) {
            importPreferences(importData.preferences);
            return true;
        }
        throw new Error('Invalid preferences file');
    } catch (err) {
        console.error('Failed to import preferences from file:', err);
        return false;
    }
}

// Handle selection of a preferences file from a file input
async function handlePreferencesFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return false;
    try {
        const content = await file.text();
        const ok = await importPreferencesFromFile(content);
        if (ok) console.log('Preferences imported from', file.name);
        return ok;
    } catch (err) {
        console.error('Error reading preferences file:', err);
        return false;
    }
}

// Programmatically open a file dialog to pick a preferences file
function openPreferencesFileDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', handlePreferencesFileSelect);
    document.body.appendChild(input);
    input.click();
    // remove after a short delay to allow the change event to fire
    setTimeout(() => document.body.removeChild(input), 1500);
}

// expose globally for inline onclick handlers
window.openPreferencesFileDialog = openPreferencesFileDialog;

