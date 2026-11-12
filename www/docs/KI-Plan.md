Hier ist ein praktikabler Plan, wie du deine PIMC-KI um ein **gelerntes Rollout-Policy** erweiterst. Ziel ist nicht, die PIMC-Struktur zu ersetzen, sondern die 160 Zufalls-Partien „intelligenter“ ausspielen zu lassen.

## 1. Was du trainierst

Ein kleines **Policy-Netz**, das aus einer Spielstellung und einem möglichen Zug einen Score berechnet:

```
score ≈ P(dieser Zug führt langfristig zum Sieg)
```

Statt in der Monte-Carlo-Simulation komplett zufällig zu ziehen, wählt die KI Züge gewichtet nach diesem Score. Das reduziert Rauschen und findet bessere Aktionen.

## 2. State + Move als Input

Das Netz braucht einen festen Zahlenvektor. Ein Beispiel für Gallery Solitaire:

- **Global**: Karten auf Foundations, verbleibende Stock-Durchläufe, leere Spalten, offene/verdeckte Karten, Hand-Karten.
- **Zug-spezifisch**: Herkunft (Tableau-Spalte, Stock, Hand), Ziel (Foundation, leere Spalte, auf andere Karte), Rang/Farbe der beteiligten Karten, ob der Zug verdeckte Karten freilegt.

```
inputSize ≈ 80–120 Features
```

## 3. Architektur

Ein einfaches Netz reicht:

```
Input(80–120) → Dense(128, ReLU) → Dense(64, ReLU) → Output(1, Sigmoid)
```

Für den Browser empfehle ich **TensorFlow.js**. Alternativ ein handgeschriebenes Netz, wenn du keine externe Bibliothek möchtest.

## 4. Integration in die Simulation

```javascript
function selectRolloutMove(state, legalMoves, network, epsilon = 0.1) {
  if (legalMoves.length === 0) return null;

  // Mit epsilon-Wahrscheinlichkeit zufällig ziehen (Exploration)
  if (Math.random() < epsilon) {
    return random(legalMoves);
  }

  // Sonst: Bewerte jeden legalen Zug
  const scores = legalMoves.map(move => {
    const features = encode(state, move);
    return network.predict(features);
  });

  // Gewichtet einen Zug auswählen
  const total = scores.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < legalMoves.length; i++) {
    r -= scores[i];
    if (r <= 0) return legalMoves[i];
  }
  return legalMoves[legalMoves.length - 1];
}
```

Diese Funktion ersetzt deinen aktuellen `randomLegalMove()` in der Simulationsphase.

## 5. Training durch Self-Play

1. **Spiele generieren**: Lass die aktuelle Policy viele Partien gegen sich selbst spielen.
2. **Daten sammeln**: Speichere für jeden Zug `(state, move, result)` mit `result = +1` bei Sieg, `-1` bei Niederlage.
3. **Netz trainieren**: Minimiere `MSE(predictedScore, result)`.
4. **Wiederholen**: Trainierte Policy wird zur neuen Rollout-Policy. Neue Spiele generieren.

```javascript
async function train(network, episodes = 10000) {
  for (let i = 0; i < episodes; i++) {
    const game = new GalleryGame();
    const history = [];

    while (!game.isOver()) {
      const moves = game.legalMoves();
      const move = selectRolloutMove(game.state, moves, network, 0.2);
      history.push({ state: game.state, move });
      game.play(move);
    }

    const result = game.won ? 1 : -1;
    for (const step of history) {
      // Training-Daten anreichern
      dataset.push({ ...step, result });
    }
  }

  await network.fit(dataset);
}
```

## 6. Tipps & Fallstricke

- **Starte klein**: Ein Netz mit 64–128 Neuronen und wenigen Tausend Trainingspartien bringt oft schon deutliche Verbesserungen.
- **Trainiere außerhalb des Browsers**: Für Millionen Spiele ist **Node.js** oder **Python** viel schneller. Exportiere das fertige Modell nach JS.
- **Feature-Engineering ist wichtiger als große Netze**: Gut gewählte Features schlagen oft ein tiefes Modell.
- **PIMC bleibt PIMC**: Das Netz verbessert nur die Rollout-Qualität. Die 160 Simulationen und der Durchschnitt bleiben gleich.

Möchtest du, dass ich ein konkretes, kleines TensorFlow.js-Beispiel für dein Gallery-Modell aufsetze?