# PIMC-Verbesserung (pimcWorker.js) – Stand 13.10.2026

## Befund
- Rollout `greedyChooseMove` ist faktisch **zufällig** (zufälliger Kartenzug, Deal nur wenn kein Kartenzug) → PIMC misst „Zufallsspieler nach diesem Zug“.
- Kein Common Random Numbers: jeder Kandidat bekommt eigene Stock-Mischungen.
- Äquivalente Züge (gleiche Karte → Slots mit identischem Inhalt) werden mehrfach mit je 160 Samples bewertet.
- `cloneGame` ruft Konstruktor auf → baut/mischt/teilt jedes Mal ein ganzes Deck (verschwendet).
- `findOneAutoMove` ruft pro Durchlauf `_isForcedMove()` → `getLegalMoves()` auch bei vollem Stock.
- Strategy Fusion aktuell kein Problem (Rollout nutzt Stock-Wissen nicht).

## Messung (Node, 12 Zufallsvorlagen, je 1 Partie; Dedupe aktiv, ohne J/Q/K-Penalty)

| Variante | Ø Score | Siege | Zeit/Partie |
|---|---|---|---|
| 160 Samples | 13.8 | 1 | ~3.5 s |
| 160 + CRN | 11.8 | 3 | ~3.5 s |
| 640 Samples | 14.6 | 2 | ~12 s |
| 640 + CRN | 10.8 | 4 | ~12 s |

→ Mehr Samples allein nützen nichts (Bias, nicht Varianz). CRN hilft vermutlich. Zeitbudget: ~2 min pro Partie (Spielzeit des Menschen), heute 3–5 s.

## Plan
1. CRN + Dedupe + `skipInit`-Klon + `_isForcedMove` nur bei leerem Stock.
2. Heuristischer Rollout mit ε-Zufall (z. B. 80/20), Features analog jam_threat_score / safe_to_deal_score.
3. Danach: Nested MC Level 2, ggf. nur in der Endphase (Stock leer = perfekte Information → exakte Suche möglich).
4. Evaluation: ≥ 50–100 feste dealOrders, gepaarter Vergleich, PIMC-Eigenstreuung pro Vorlage messen.

## Testskript
`docs/pimc-exp.js` (aus `www/` heraus): `node docs/pimc-exp.js <N> <crn 0|1> <from> <to>`
Beispiel: `node docs/pimc-exp.js 160 1 0 12`

## Benchmark PIMC (aktuell) vs. Random – 13.10.2026
`node docs/pimc-bench.js [--deals 0-50] [--random 1000] [--alpha 0.01] [--reps 3] [--samples 160] [--threads 7]`
(aus `www/`; parallel via worker_threads; Rohdaten → `docs/results/bench-*.json`).
Dealorders = `randDeal(1000+d)` wie in pimc-exp.js → direkt vergleichbar. PIMC = unverändertes `playOnePimcGame` (160 Samples, inkl. J/Q/K-Penalty).

**Masse:** Hauptmass = „besser+gleich %“ = Anteil der Random-Partien, die PIMC übertrifft oder mit ihm gleichzieht (pro PIMC-Partie, dann gemittelt; wie „better-or-equal %“ in Statistics.js). Nebenindikator = Anteil PIMC-Partien mit Score ≤ Random-Minimum. Siegrate nur noch Info. Tote Lagen (alle Random-Partien gleich) zählen nicht.

Lauf `bench-2026-10-13T17-36-30.json` (50 Lagen, davon 48 gewertet, × 3 PIMC-Partien, 1000 Random/Lage, 165 s Wandzeit):

| PIMC 160 (aktuell) | Wert |
|---|---|
| **besser+gleich %** | **86.4 % ± 2.2** (SE), Median 88.2 % |
| ≤ Random-Minimum | 23.6 % der Partien (in 38 % der Lagen mind. einmal) |
| Info: Ø Score / Siegrate | PIMC 15.0 / 16 % — Random 27.9 / 3.2 % |

- **PIMC-Eigenstreuung sd ≈ 5** pro Lage (z. B. Lage 13: 0/0/19 → 100/100/2.8 %) → für Variantenvergleiche mehrere reps und gleiche Seeds nötig.
- Tote Lagen: 24 und 26 (Random min = max = 96 bzw. 83).
- **Systematische Schwachstellen** (besser+gleich % in allen 3 Partien tief): **30** (27 %), **49** (56 %), **3** (37 %). Gute Kandidaten für Zug-für-Zug-Analyse.

## Benchmark v2: Startbarkeits-Prüfung + Variantenvergleich – 13.10.2026
`node docs/pimc-bench.js --variant <current|crn> [--deals 0-100] [--reps 6] [--ref docs/results/<datei>.json]`
- Lagen werden wie in `newGame()` so lange neu gemischt, bis `checkStartable()` && `checkFoundationHasChance()` erfüllt sind (in 0–99 betrifft das Lage 24 und 84). Lage 26 besteht die Prüfung, ist aber trotzdem tot → weiterhin über „tot“ ausgeklammert.
- Varianten im Skript (`VARIANTS`): `current` = unverändertes `playOnePimcGame`; `crn` = gleiche Stock-Mischungen für alle Kandidaten + Dedupe gleichwertiger Züge, sonst identisch (inkl. J/Q/K-Penalty).
- `--ref`: gepaarter Vergleich Lage für Lage; prüft, dass die dealOrders identisch sind.

**Referenz:** `docs/results/ref-current-100x6.json` (99 Lagen gewertet × 6 PIMC-Partien, 1000 Random/Lage)

| Variante | besser+gleich % | ≤ Random-Min | Ø Score | Siegrate | s/Partie |
|---|---|---|---|---|---|
| current | **86.3 ± 1.3** (Median 89.0) | 24.2 % | 17.9 | 13.1 % | 8.9 |
| crn | **88.3 ± 1.3** (Median 93.6) | 30.1 % | 16.7 | 15.5 % | 9.7 |

Gepaart crn − current: **+2.0 ± 1.3** (SE, < 2 SE), ≤ Min **+5.9 Pp**, Lagen besser/gleich/schlechter **63 / 6 / 30**.
→ Mittelwert allein knapp nicht signifikant (einzelne Ausreisser, z. B. Lage 95: −38.6), aber 63 vs. 30 Lagen ist im Vorzeichentest deutlich (p ≈ 0.001). CRN + Dedupe ist eine echte, wenn auch kleine Verbesserung → als neue Basis übernehmen.

## Schritt 2: Heuristischer Rollout – 13.10.2026
Vorab als eigenständiger Spieler getestet (ohne PIMC, 99 Lagen × 40 Seeds, Masse gegen die Random-Verteilung aus ref-current):

| Policy | besser+gleich % |
|---|---|
| Random-Rollout (zufälliger Kartenzug) | 59.4 |
| + falsche F-Karte zuerst, Aufdecken, Stapeltiefe | 69.4 |
| + Ketten-Bonus (Nachfolger +3/+6/+9 spielbereit) = **heur** | **77.7** |

Wichtigste Regeln: falsche Foundation-Karte zuerst wegspielen (umgekehrte Priorität → nur 60 %) und Ketten-Bonus. Gewichte in `heurMoveScore()` in pimc-bench.js.

In PIMC (Basis crn, 99 Lagen × 6, Referenz `ref-crn-100x6.json`):

| Variante | besser+gleich % | Diff zu crn | Lagen +/=/− | ≤ Min |
|---|---|---|---|---|
| crn | 88.3 | – | – | 30.1 % |
| crn-heur (ε=0) | 88.9 | +0.6 ± 1.3 | 43/11/45 | 29.5 % |
| crn-heur20 (ε=0.2) | 89.3 | +1.0 ± 1.1 | 45/14/40 | 29.5 % |

→ **Kein messbarer Gewinn.** Obwohl der Rollout als Spieler viel besser ist (59 → 78 %), wählt PIMC damit kaum andere/bessere Züge. PIMC vergleicht Züge relativ; der Bias des Zufalls-Rollouts trifft offenbar alle Kandidaten ähnlich. Zum Vergleich: heur allein 77.7 %, PIMC ~88–89 % → PIMC selbst bringt ~11 Pp.
Folgerung: Der Engpass liegt woanders → nächste Kandidaten: Zug-für-Zug-Analyse der schwachen Lagen (30, 3, 49), exakte Suche in der Endphase (Stock leer), Nested MC.

## Frühes Austeilen (α) – 13.10.2026
Beobachtung (Adi): Austeilen, obwohl Kartenzüge möglich sind, ist manchmal besser.
- Bestätigt fürs **beste von 1000**: Random α=0 → Ø Minimum 13.96, 22/99 Lagen mit Sieg; α=0.01 → 10.52, **35/99**; α=0.05 → 8.95, 38/99.
- Aber pro Partie schadet blindes α: Random b+g 59.5 → 55.3 % (α=0.01), Heuristik 77.7 → 72.8 %.
- PIMC (current) teilt auf oberster Ebene bereits in ~11 % der Entscheidungen früh aus (wo beides möglich). Rollouts tun es nie.

| Variante (vs. crn, 99 × 6) | b+g % | Diff | Lagen +/=/− | ≤ Min |
|---|---|---|---|---|
| crn-a01: Rollout mit α=0.01 | 88.9 | +0.6 ± 0.9 | 39/13/47 | +0.5 Pp |
| crn-best4: 40 Hypothesen × bestes von 4 Rollouts (α=0.01) | 86.2 | −2.1 ± 1.2 | 36/5/58 | −5.2 Pp |

→ α im Rollout: kein Effekt. Best-of-k: eher **schlechter** (Vorzeichentest 36 vs. 58, p ≈ 0.03) – vermutlich weil (a) nur 40 statt 160 Stock-Hypothesen → mehr Unsicherheit über den Stock, und (b) „bestes von k“ auf bekanntem Stock ist zu optimistisch (kennt in der Simulation die Stock-Reihenfolge → Strategy Fusion).
Der Vorteil des frühen Austeilens kommt bei 1000 Random-Versuchen von der Auswahl im Nachhinein; PIMC muss sich aber vor dem Aufdecken entscheiden.

## Analyse Lage 30 – 13.10.2026
Werkzeug: `docs/pimc-analyse.js` (wins / takeover / eval / truth, s. Kopf der Datei). Gewinnpartien-Cache: `docs/results/wins-lage30.json`.
- Lage 30 ist für Random leicht (8 Siege in den ersten 40 Seeds, meist ohne frühes Austeilen); PIMC (crn) endet trotzdem meist bei 15–27.
- **Übernahme-Test** entlang Gewinn #1: PIMC übernimmt nach k Zügen → k ≤ 26: 15–16, k ≥ 27: fast immer 0. Entscheidende Weiche = **Zug 26**.
- Stellung: zwei ♦10 – eine **falsch auf F17**, eine **allein auf T4**; Ziel ♦7 in F20. Reihe 1 hat bereits einen leeren Platz (F10).

| Zug | Rollout-Ø (PIMC heute) | PIMC zu Ende gespielt (24 Stock-Hypothesen, gepaart) |
|---|---|---|
| ♦10 F17→F20 (F-Platz frei) | **18.3** (gewählt) | 12.96, 5 Siege |
| ♦10 T4→F20 (T4 leer) | 19.6 (letzter Platz) | **10.25**, 7 Siege (gepaart 10 besser / 2 schlechter) |
| früh austeilen | 19.1 | 10.50, 8 Siege |

→ **Die Rollouts bewerten diese Zwillings-Entscheidung falsch**; mit vollem Weiterspielen kehrt sich die Rangfolge um. Begründung: falsche F-Karten können nie zugedeckt werden, Tableau-Karten schon.
- Als allgemeine Regel taugt „Tableau-Zwilling zuerst“ aber nicht (Heuristik als Spieler: 77.8 % → 66.7 %; nur wenn Reihe schon Lücke: 72.9 %; nur Einzelkarte + Lücke: 77.0 %). Die richtige Wahl hängt von der Situation ab → braucht Vorausschau, keine feste Regel.
- Folgerung: Hebel = **bessere Bewertung knapper Entscheidungen** (hier lagen die Rollout-Werte nur 1.3 Punkte auseinander). Idee: zweistufig – zuerst normale Rollouts, dann nur bei knappen Entscheidungen die besten 2–3 Kandidaten mit PIMC-Weiterspielen (Nested MC Level 2, mit reduzierten Samples) nachbewerten.

## Schritt 3: Nested MC Stufe 2 bei knappen Entscheidungen – 14.10.2026
Variante `crn-n2t` in pimc-bench.js (`n2ChooseMove`): Stufe 1 wie crn. Liegen weitere Kandidaten ≤ δ=2 hinter dem besten **und** konkurrieren Zwillinge (gleiche Karte, andere Quelle) oder ist frühes Austeilen dabei, werden die besten k=3 nachbewertet: H=32 gemeinsame Stock-Hypothesen, inneres crn-PIMC mit S=16 Samples spielt zu Ende.
- Kalibrierung an Lage 30 / Zug 26 (48 Hypothesen): inneres PIMC mit S=16 ordnet T4 knapp richtig vor F17 (10.69 vs. 11.06), mit S=8 falsch → S=16 ist Minimum.
- Ohne Zwillings-Filter (`crn-n2`): 566 s/Partie (fast jede Entscheidung „knapp“). Mit Filter: 18.6 Auslösungen/Partie, davon 8.7 mit anderem Zug als Stufe 1; **~390 s/Partie** (Budget ~120 s).

Lauf `bench-crn-n2t-2026-10-13T22-11-21.json` (Lagen 0–49, 2 Partien/Lage) vs. crn auf denselben 49 Lagen:

| | b+g % | ≤ Min | Siege | Ø Score |
|---|---|---|---|---|
| crn | 88.4 | 29.6 % | 18.7 % | 14.1 |
| crn-n2t | 90.0 | 34.7 % | 23.5 % | 13.7 |

Gepaart: +1.5 ± 2.2 (n. s.), Lagen besser/gleich/schlechter 25/7/17, höhere Siegquote in 10 vs. 6 Lagen.
→ Alle Masse leicht besser, aber keines signifikant (nur 98 Partien). Schwaches positives Signal bei 3× Zeitbudget.

## Übernahme crn in pimcWorker.js – 17.10.2026
`pimcChooseMove()` in `js/pimcWorker.js` = crn (Dedupe + Common Random Numbers, J/Q/K-Penalty bleibt). Geprüft: Benchmark-Variante `worker` (= aktueller Worker via `playOnePimcGame`) reproduziert `ref-crn-100x6.json` exakt (Lagen 0–5, je 2 Partien), Replay-Gegenprobe ok.
Die alte Version ist in pimc-bench.js als `legacyChooseMove` (Variante `current`) erhalten → `ref-current-100x6.json` bleibt reproduzierbar.
Neue Basis für weitere Vergleiche: `ref-crn-100x6.json`.

## Schritt 4: Exakte Endphase (Stock leer) – 19.10.2026
Bei leerem Stock senkt jeder Kartenzug den Score um genau 1 und ist unumkehrbar → bester Endscore = längste Zugfolge, exakt per Tiefensuche mit Memo (`endxSolve` in pimc-bench.js; Zustand = Stapelhöhen + sortierte Reiheninhalte, AutoMoves laufen mit). Fair gegenüber dem Menschen, da Undo innerhalb einer Phase erlaubt ist.
- `crn-endx`: crn, aber bei leerem Stock exakt.
- `crn-endxr`: zusätzlich jeder Rollout ab leerem Stock exakt zu Ende gerechnet.

| Variante (vs. crn, 99 × 6) | b+g % | Diff | Lagen +/=/− | ≤ Min | s/Partie |
|---|---|---|---|---|---|
| crn-endx | 88.3 | +0.0 ± 0.0 | 1/98/0 | +0.2 Pp | 9.9 |
| crn-endxr | 88.8 | +0.5 ± 0.9 | 36/16/47 | +2.4 Pp | 25.2 |

→ **Kein Gewinn.** Endphase klein (2.1 Suchen/Partie, Ø 48 Knoten); crn wählt dort zwar 0.7×/Partie einen anderen Zug, aber mit gleichem Ergebnis → crn spielt die Endphase bereits optimal. Exakter Rollout-Schluss: n. s. (Vorzeichen eher negativ), 2.5× Zeit.
Folgerung: Die Verluste entstehen früher, vor dem letzten Austeilen.

## Schritt 5: Phasenweise Entscheidung (Austeil-Stellung wählen) – 19.10.2026
Idee (Adi): Innerhalb einer Phase (zwischen zwei Austeilungen) ist Undo erlaubt und alles bekannt → die eigentliche Entscheidung ist, **in welcher erreichbaren Stellung ausgeteilt wird** (frühes Austeilen inbegriffen).
Variante `crn-phase` (`playPhase`/`phasePlan` in pimc-bench.js): am Phasenanfang alle erreichbaren Stellungen aufzählen (wie endx), jede per CRN bewerten (Stock mischen, austeilen, Zufalls-Rollout), zweistufig: alle mit 16 Samples, die besten max(8, 10 %) mit 160. Weg zur besten Stellung nachspielen, austeilen. Stock leer → endx. Gleichstand → tieferer aktueller Score.
Stellungen pro Phase (21 crn-Partien gezählt): Median ~20, 90 %-Quantil ~800, max ~5500; im Benchmark Ø 229.

| Variante (vs. crn, 99 × 6) | b+g % | Diff | Lagen +/=/− | ≤ Min | Siege | s/Partie |
|---|---|---|---|---|---|---|
| crn | 88.3 | – | – | 30.1 % | 15.5 % | 9.7 |
| **crn-phase** | **92.8** (Median 97.2) | **+4.5 ± 1.0** | **62/7/30** | **40.9 %** | **20.7 %** | 29.3 |

→ **Deutlicher Gewinn** (> 4 SE, grösster Schritt bisher), Eigenstreuung sd 4.9 → 4.2. Zeit 29 s/Partie, im Budget (~120 s).
Auffällig: 4.2 von 9 Phasen enden mit frühem Austeilen (spielbare Tableau-Karte wird zugedeckt; falsche F-Karten zählen nicht, da sie nicht zugedeckt werden). Ob echt oder Auswahleffekt (bestes von ~229 verrauschten Schätzungen) ist offen.
Rohdaten: `docs/results/bench-crn-phase-2026-10-19T19-13-31.json`.

Mögliche nächste Schritte:
- Auswahleffekt prüfen: Stufe 2 mit frischen Seeds (nicht die 16 aus Stufe 1 wiederverwenden), mehr Samples für die Finalisten, oder die gewählte Stellung gegen die beste fertig gespielte vergleichen.
- Mit dem Zeitbudget: mehr Samples / grösserer Finalisten-Anteil; heuristischer Rollout nach dem Austeilen (jetzt evtl. wirksamer, da die Phase selbst nicht mehr zufällig gespielt wird).
- Übernahme in pimcWorker.js (Web-Worker-Zeit im Browser prüfen; grosse Phasen ggf. mit Obergrenze).

### Auswahleffekt geprüft – 19.10.2026
`crn-phase-fresh`: Finalisten nur auf 160 frischen Mischungen bewertet (ohne die 16 aus Stufe 1). Gepaart vs. crn-phase: **+0.0 ± 0.5**, Lagen 38/18/43, ≤ Min −0.8 Pp → kein Auswahleffekt; das frühe Austeilen (weiterhin 4.2/Partie) ist echt.

### Was wird beim frühen Austeilen liegen gelassen? (Lagen 0–13, je 1 Partie crn-phase)
Erfahrung Adi: Bildkarten, die tief unten in einer Kolonne liegen, sind „parkiert“ und sicher, sie können in der Endphase gespielt werden. Gefährlich ist ihr Zwilling, weil er später etwas zudeckt. Wird der Platz jetzt mit der parkierten Karte belegt, muss der Zwilling warten und blockiert seine Kolonne.
Die KI tut genau das, ohne dass es ihr gesagt wurde. Häufigster Fall: **J/Q/K mit 0–3 Karten darunter, Zwilling noch im Stock** (z. B. Lage 2: ♥Q, ♦J, ♥J je zuunterst; Lage 13: ♦K über drei Phasen liegen gelassen; Lage 4: ♣Q mit 4 Karten darunter, Zwilling auf T1 unter 2 Karten).
Daneben einige Basiskarten (2/3/4), deren Zwilling schon gespielt ist (z. B. Lage 6: ♣2 mit 5 Karten darunter über zwei Phasen). Diese wirken weniger einleuchtend: vielleicht ist die Karte darunter unwichtig, vielleicht sind die beiden Stellungen fast gleichwertig → bei Bedarf Zug für Zug ansehen.
Analyseskript: `onChoice`-Hook in `phasePlan`; pimc-bench.js exportiert bei `require()` `makeDeal`, `playPhase`, `VARIANTS`.

## Obergrenze und Übernahme in pimcWorker.js – 20.10.2026
Ohne Grenze lange Ausreisser: Zeit/Lage (Benchmark, 7 Threads) Median 16.7 s, 90 % 60 s, **max 254 s**.
`crn-phase-cap`: Stufe 1 höchstens 4800 Rollouts/Phase (= 16 × 300 Stellungen; bei mehr Stellungen weniger Samples, mind. 2), höchstens 30 Finalisten → Phasen bis 300 Stellungen unverändert.

| Variante (99 × 6) | b+g % | Diff | Lagen +/=/− | ≤ Min | Siege | Zeit/Lage Median / 90 % / max |
|---|---|---|---|---|---|---|
| crn-phase | 92.8 | – | – | 40.9 % | 20.7 % | 16.7 / 60 / 254 s |
| **crn-phase-cap** | 92.0 | −0.8 ± 0.5 (vs. crn-phase) | 19/51/29 | 41.1 % | 20.2 % | **7.9 / 11.2 / 19.9 s** |

→ Kein signifikanter Verlust, gegenüber crn weiterhin ~+3.7 Pp; Ausreisser beseitigt.
**Übernommen** in `js/pimcWorker.js` (`phasePlan`, `endgameChooseMove`, Konstanten `PHASE_*`; `pimcChooseMove` = crn bleibt Rückfall). Gegenprobe: Benchmark-Variante `worker` reproduziert `crn-phase-cap` exakt (Lagen 0–13 × 2), Replay ok.
Browser (headless Chrome, M3, Worker-Nachricht wie galleryjs.js: 1000 Random + 1 PIMC): PIMC-Partie 1.6–3.5 s (Lagen 0–4), 5.5–10.9 s bei den drei langsamsten Lagen (29, 43, 73). Vorher (crn) 2.5–4.9 s. iPhone/Safari nicht gemessen.
Neue Referenz für weitere Vergleiche: `docs/results/bench-crn-phase-cap-2026-10-19T22-11-38.json`.

## Freiheitsgrad: erreichbare Stellungen pro Phase – 22.10.2026
Frage (Adi): Wovon hängt die PIMC-Zeit ab, und misst sie eine Art Komplexität?
Die Zeit ist im Wesentlichen Rollouts × Rollout-Länge. Die Zahl der Rollouts pro Phase hängt von N ab, der Zahl der verschiedenen Stellungen, die vor dem nächsten Austeilen erreichbar sind (`phaseEnumerate`; Foundation-Slots innerhalb einer Reihe sind schon über `phaseKey` zusammengefasst). Wegen der Obergrenze wächst sie nur bis N ≈ 300 deutlich, ab N > 20 000 folgt der Rückfall auf `pimcChooseMove`.
Als Kennzahl, die nicht von Obergrenze und Gerät abhängt: **Freiheit = Σ log₂ N über die 9 Phasen** (bit). `playOnePimcGame` liefert jetzt `phaseStates` (N je Phase, −1 = über 20 000, dann mit 20 000 gerechnet → Untergrenze), der Worker schickt sie als `pimcPhaseStates`.

Lauf `docs/pimc-freedom.js`: Lagen 0–999 (wie pimc-bench.js), je 1 PIMC-Partie (160 Samples) + 1000 Random-Partien (α 0.01), 7 Threads, 23 min. 1 tote Lage, 13 Lagen mit einer Phase > 20 000, keine Replay-Fehler, PIMC 194 Siege. Freiheit Min/Median/Max 4.0 / 44.7 / 63.0 bit.

| Freiheit [bit] (Fünftel) | PIMC | Random-Mittel | Random-sd | Vorsprung PIMC | b+g % | s/Partie |
|---|---|---|---|---|---|---|
| 4.0 – 39.4 | 24.0 | 37.7 | 7.7 | 13.6 | 89.7 | 5.9 |
| 39.4 – 43.0 | 14.8 | 30.8 | 7.6 | 16.0 | 93.7 | 7.7 |
| 43.0 – 46.0 | 15.7 | 30.4 | 8.0 | 14.7 | 90.0 | 9.0 |
| 46.0 – 49.3 | 13.3 | 28.4 | 7.5 | 15.1 | 92.5 | 10.5 |
| 49.3 – 63.0 | 12.1 | 26.5 | 7.3 | 14.4 | 91.4 | 12.6 |

Korrelation mit der Freiheit: PIMC-Score −0.38, Random-Mittel −0.36, Random-sd −0.02, Vorsprung (Random-Mittel − PIMC) 0.00, b+g % −0.02, Rechenzeit +0.65. PIMC-Score vs. Random-Mittel +0.62.

Erkenntnisse:
- **Freiheit misst Leichtigkeit:** mehr Freiheit → beide spielen besser; am stärksten im untersten Fünftel (Lagen, die früh blockieren).
- **Freiheit sagt nicht, ob kluges Spiel zählt:** der Vorsprung von PIMC bleibt in allen Fünfteln bei ~14–16 Punkten. (Der Probelauf mit 14 Lagen hatte das Gegenteil angedeutet.)
- **Zeit ist nur ein grobes Mass für Freiheit** (+0.65): Obergrenze, Rollout-Länge und Rückfall verzerren sie.
- **Teilweise zirkulär:** N in späteren Phasen hängt von PIMCs eigenen früheren Entscheidungen ab. Eigenschaft der Lage selbst ist nur **Phase 1** (noch nichts entschieden): log₂ N₁ korreliert mit Random-Mittel −0.50, PIMC −0.34, Vorsprung −0.20 → bei viel Anfangsfreiheit kommt auch der Zufallsspieler weit, kluges Spiel bringt etwas weniger.

In der App: Statistik-Tab zeigt unter der Rechenzeit `Freedom: x bit [N₁ … N₉]`. Gespeichert pro Partie als `aiBits` (Summe) und `aiPhases` (N je Phase, leerzeichengetrennt, −1 = über 20 000), auch im CSV-Export/-Import; wie `aiScore` nachgetragen, falls PIMC beim Speichern noch nicht fertig war. Nicht indexierte Spalten → keine neue DB-Version nötig.
Offen: Bei N > 20 000 ruft `playOnePimcGame` `phasePlan` vor jedem Zug der Phase neu auf (zählt jedes Mal bis zur Grenze) – Merker pro Phase würde Zeit sparen.
Rohdaten: `docs/results/freedom-2026-10-22T12-21-54.json`.

## Optimum und Lösbarkeit bei bekanntem Stock – 24.10.2026
Frage (Adi): Kennt man den Stock, ist das Spiel deterministisch – was ist pro Lage das Optimum, bzw. ist sie überhaupt lösbar?
Zu entscheiden ist wie in Schritt 5 nur, in welcher erreichbaren Stellung jeder Phase ausgeteilt wird. Werkzeug: `docs/pimc-optimum.js`; die Verfahren selbst liegen in `js/pimcWorker.js` (Abschnitt „Lösbarkeit bei bekanntem Stock“), dieselben Funktionen nutzt die App für die Ampel.
- **Vollständige Suche** über alle Austeil-Stellungen (Memo über Phasenanfänge): bricht schon bei Lagen ab, die PIMC gewinnt (Median ~2^45 Pfade).
- **Strahlsuche** `solvBeam`: pro Phase die besten B Austeil-Stellungen, bewertet mit dem besten von K Zufalls-Rollouts auf dem echten Stock. Liefert eine gespielte Partie (Replay geprüft) → obere Schranke des Optimums.
- **Siegprüfung** `solvWinCheck` (notwendige Bedingung): frühester Phasenindex je Karte, auch für künftig ausgeteilte (Karte da, Vorgänger liegt bzw. Platz frei, Karte darüber noch nicht ausgeteilt oder schon weg). Bei einem Sieg werden *alle* Karten gelegt → zusätzlich: beide Kopien eines Rangs brauchen verschiedene Vorgänger-Kopien, und es braucht so viele Plätze wie fehlende Basiskarten. Stufe „locker“ bis zum Stillstand, danach „strikt“ verschärfen (strikt direkt ab ∞ ist falsch: über beide Kopien verschränkte Ketten blieben hängen – erste Version meldete dadurch gewinnbare Lagen als unlösbar).
- **Tiefensuche** `solvWin`: über alle Austeil-Stellungen, Memo, Äste ohne Siegchance abgeschnitten. Kann als Einzige Unlösbarkeit beweisen.

Lauf `optimum-2026-10-24T11-00-35.json` (Lagen 0–99, Strahl B=200/K=8, Tiefensuche ≤ 3 Mio. Knoten, 41 min mit 7 Threads), Vergleich mit `bench-crn-phase-cap` (99 gewertete Lagen):

| | Lagen |
|---|---|
| lösbar | **70** (65 per Strahlsuche, 5 nur per Tiefensuche, z. B. 14, 85) |
| sicher unlösbar | 2 (32; 26 = tote Lage) |
| offen | 28 |

| Ø Score (99 Lagen) | |
|---|---|
| Random, Mittel | 29.7 |
| PIMC, eine Partie | 15.2 |
| Random, bestes von 1000 | 10.6 |
| PIMC, bestes von 6 | 9.5 |
| **beste bekannte Partie mit Stock-Kenntnis** | **3.1** |

- PIMC gewinnt 20 % aller Partien, in den lösbaren Lagen 29 %. **37 lösbare Lagen hat PIMC in keiner von 6 Partien gewonnen** (u. a. 3, 30, 49 – die früher als „systematisch schwach“ aufgefallenen).
- Nicht als lösbar erkannte Lagen: beste bekannte Partie Ø 10.5, PIMC Ø 22.8. Optimum dort nicht bewiesen.
- Der Abstand PIMC ↔ Hellseher (~12 Punkte) ist nur teilweise einholbar (PIMC kennt den Stock nicht) → Obergrenze, kein Ziel.
- Beweis der Unlösbarkeit klappt kaum: Die Siegprüfung schlägt meist erst ab Phase 6–7 an; davor gilt fast jede Stock-Karte als „könnte klappen“. Hebel wären stärkere frühe Stau-Erkennung (Abhängigkeiten über die ganze Austeilfolge) oder Zusammenlegen gleichwertiger Stellungen.

### Ampel in der App
`checkSolvable(dealOrder, { timeMs })` im eigenen Worker (`startBackgroundSolve()` in galleryjs.js), parallel zu Random + PIMC: Siegprüfung → Tiefensuche (20 % der Zeit; findet Siege schnell oder gar nicht) → Strahlsuchen B/K = 10/2, 50/4, 200/8 bis zum Zeitlimit. Grün zusätzlich, wenn Spieler, Random-Minimum oder PIMC 0 erreichen.

| Zeitlimit (Node, M3, 4 parallel) | grün | orange | rot |
|---|---|---|---|
| 4 s | 50 (+3 über Random/PIMC) | 45 | 2 |
| 8 s | 54 (+2) | 42 | 2 |
| **15 s** (App) | **60 (+2)** | 36 | 2 |

Zum Vergleich: alte Reihenfolge (Strahlsuche zuerst) bei 8 s nur 44 grün. Zeit bis grün (15 s): Median 2.3 s, 90 % 6.5 s. Headless Chrome reproduziert die Node-Resultate (Lagen 3, 14, 32, 0, 12).
Anzeige: Punkt unten rechts im Statistik-Panel (grün = Sieg gefunden, orange = kein Sieg gefunden, rot = sicher unlösbar, grauer Ring = läuft), Textzeile `Known stock: …` unter Freedom. Erst nach der Partie sichtbar (kein Spoiler). Gespeichert als `solvable` (1 = ja, 0 = nein, −1 = eventuell; ohne die Random/PIMC-Abkürzung), nachgetragen wie `aiScore`, auch im CSV. Nicht indexiert → keine neue DB-Version.
