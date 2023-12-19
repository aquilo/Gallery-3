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
    }
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
    return res;
}

async function getIndicators(limit) {
    stats = await jsstoreCon.select({
        from: 'STAT',
        order: {
            by: 'datetime',
            type: 'desc'
        },
        limit: limit
    });
    console.log("statistics, last " + stats.length);
    if (stats.length < 101) console.log(stats);
    return stats;
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

    rrr += '<tr><th>Mean result</th>';
    for (var i = 0; i < len; i++) {
        s = results[i];
        rrr += compareres(s.avg_result, good_meanres, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_meanres + '</td><td>%<td></tr>';

    rrr += '<tr><th>Better than c\'s mean</th>';
    for (var i = 0; i < len; i++) {
        s = results[i];
        rrr += compareres(percent(s.hwins, s.n, 2), good_bettermean, 'valbetter', 'valworse');
    }
    rrr += '<td class="valcompare">' + good_bettermean + '</td><td>%<td></tr>';




    rrr += '</table>';

    statText = [

        rrr, '<br>',

        '<h2>The Indicators</h2>',
        '<strong>Number of games</strong>: <b>' + r.n + '</b>',
        '<br/>Mean score: <b>' + round_number(r.avg_player, 2) + '</b>',
        '&nbsp;&nbsp;(<i>' + good_mean + '%</i>; computer: ' + round_number(r.avg_mean, 2) + ')<br><br>',

        '<h3>Winning Situations</h3>',
        '<strong>Games with score 0</strong>: <b>' + percent(r.hzeros, r.n, 2) + '%</b> (<i>' + good_zeros + '%</i>)',
        ', but solvable were at least <strong>' + percent(r.hsolvable, r.n, 2) + '%</strong> (<i>' + good_solvable + '%</i>). <br>This means that you solved at most <b>' + percent(r.hzeros, r.hsolvable, 2) + '%</b> (<i>' + good_solvsolv + '%</i>) of all solvable games.<br><br>',

        '<h3>Comparisons</h3>',
        'Comparisons to the random tapping "strategy": ',

        '</p><strong>Best Result</strong>: In only <b>' + percent(r.n - r.hcbetter, r.n, 2) + '%</b> (<i>' + good_best + '%</i>) ',
        'you achieved the best possible result.</p>',

        '</p><strong>Perfect Games</strong>: You are at least as good as the computer in <b>' + round_number(r.avg_more + r.avg_equal, 2) + '%</b> (<i>' +
        good_be + '%</i>) ',
        'of the games (compared to the computer your result was better result in <strong>' + round_number(r.avg_more, 1) + '%</strong>, equal in <strong>' + round_number(r.avg_equal, 1) + '%</strong>, and worse in <strong>' + round_number(r.avg_less, 1) + '%</strong>.</p>',
        '<hr>',
        '<strong>Mean result</strong>: <b>' + round_number(r.avg_result, 2) + '%</b> (<i>' + good_meanres + '%</i>)<br/>',
        'The result of a single game is the percentage of computer\'s scores worse than your\'s (mean: <strong>' + round_number(r.avg_more, 2) + '</strong>) plus half of the drawn attempts (mean: <strong>' + round_number(r.avg_equal, 2) + ' / 2</strong>). You see this number after a evaluation in the center of ',
        'the horizontal coloured bar.</p>',

        '<p><strong>Games won</strong>: <b>' + percent(r.hwins, r.n, 2) + '%</b> (<i>' + good_bettermean + '%</i>)',
        '<br>Your score was better than computer\'s mean out of many attempts.</p>',
        '<p>Games better than computer\'s best: <strong>' + percent(r.hminwins, r.n, 2) + ' %</strong>.',
        '<br/>This depends on the number of attempts. With very many attempts the program ',
        'will sometime play the same game as you did - or even a better one.</p><br>',


        '<h3>Other indicators</h3>',
        'Usual duration of a game: <i>' + game_time + '</i> (includes evaluation).<br>',
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

async function exportStatisticsAsCsv() {
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