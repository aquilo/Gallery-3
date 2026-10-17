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
