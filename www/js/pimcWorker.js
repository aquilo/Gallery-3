// game.js (NEW, refactored)

class GallerySolitaire {
  constructor(seed = null, opts = {}) {
    this.seed = seed ?? null;
    this.rng = this._createRNG(this.seed);

    // 8 Tableau piles
    this.t = Array.from({ length: 8 }, () => []);

    // 3 rows x 8 slots Foundation: null or {r,s}
    this.f = Array.from({ length: 3 }, () => Array(8).fill(null));

    // Stock: list of {r,s}
    this.stock = [];

    // Optional undo history (can disable if you want)
    this.history = [];

    // ✅ NEU: AutoMove Statistics
    this.autoMoveStats = {
      "twin-ok": 0,
      "two-possibilities": 0,
      "safe-base": 0,
      "twin-at-bottom": 0,
      "twin-below-same-stack": 0,
      "twin-blocked": 0,
      "both-twins-ready": 0,
      "just-one": 0
    };

    this._initDeckAndDeal(opts.initialDeck || null);
  }

  // -----------------------------
  // RNG (deterministic if seed given)
  // -----------------------------
  _createRNG(seed) {
    if (seed === null || seed === undefined) {
      return () => Math.random();
    }
    // Simple LCG
    let x = (seed >>> 0) || 123456789;
    return () => {
      x = (1664525 * x + 1013904223) >>> 0;
      return x / 0x100000000;
    };
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // -----------------------------
  // Card encoding helpers
  // -----------------------------
  static SUITS = ["C", "D", "H", "S"]; // 0..3
  static RANK_STR = { 11: "J", 12: "Q", 13: "K" };
  static STR_RANK = { J: 11, Q: 12, K: 13 };

  // Mapping Live-App-Suitindex (js/Card.js: suitStr = ["Club","Hearts","Spade","Diamond"])
  // -> unser Suitindex (SUITS = ["C","D","H","S"]).
  static LIVE_SUIT_MAP = { 0: 0, 1: 2, 2: 3, 3: 1 };

  // Dekodiert die von der Live-App gespeicherte "dealOrder" (siehe
  // js/galleryjs.js newGame(): window.currentDealOrder, Kodierung
  // suit*13+(rank-1) pro Karte, komma-separiert, 104 Werte) in unser
  // {r,s}-Kartenformat, in derselben Indexreihenfolge (Index 0 = wird
  // zuletzt ausgeteilt, Index 103 = wird zuerst ausgeteilt).
  static decodeDealOrder(dealOrderStr) {
    const values = dealOrderStr.split(",").map(Number);
    if (values.length !== 104) {
      throw new Error(`dealOrder muss 104 Werte enthalten, hat ${values.length}`);
    }
    return values.map((v) => {
      const suitLive = Math.floor(v / 13);
      const rank = (v % 13) + 1;
      const s = GallerySolitaire.LIVE_SUIT_MAP[suitLive];
      if (s === undefined || rank < 1 || rank > 13) {
        throw new Error(`Ungueltiger dealOrder-Wert: ${v}`);
      }
      return { r: rank, s };
    });
  }

  // Erzeugt ein Spiel aus einer von der Live-App exportierten dealOrder -
  // reproduziert exakt dieselbe Vorlage, die ein Mensch dort gespielt hat.
  static fromDealOrder(dealOrderStr, seed = null) {
    const initialDeck = GallerySolitaire.decodeDealOrder(dealOrderStr);
    return new GallerySolitaire(seed, { initialDeck });
  }

/* 
  _encCard(c) {
    if (!c) return null;
    const rAbs = Math.abs(c.r);
    const rStr = (rAbs <= 10) ? String(rAbs) : (GallerySolitaire.RANK_STR[rAbs] ?? String(rAbs));
    return { r: c.r, s: GallerySolitaire.SUITS[c.s], rs: `${rStr}${GallerySolitaire.SUITS[c.s]}` };
  }
 */

  // -----------------------------
  // Location parsing: T0..T7, F00..F27
  // -----------------------------
  _parseLoc(loc) {
    if (!loc || typeof loc !== "string") throw new Error(`Invalid location: ${loc}`);

    const kind = loc[0];
    if (kind === "T") {
      const idx = parseInt(loc.slice(1), 10);
      if (idx < 0 || idx > 7) throw new Error(`Bad tableau location: ${loc}`);
      return { kind: "T", idx };
    }

    if (kind === "F") {
      const row = parseInt(loc[1], 10);        // 0..2
      const slot = parseInt(loc.slice(2), 10); // 0..7
      if (row < 0 || row > 2 || slot < 0 || slot > 7) throw new Error(`Bad foundation location: ${loc}`);
      return { kind: "F", row, slot };
    }

    throw new Error(`Unknown location kind: ${loc}`);
  }

  // -----------------------------
  // Row logic (2/5/8/J etc) via +3
  // -----------------------------
  _baseForRow(row) {
    return row + 2; // row 0->2, 1->3, 2->4
  }

  _rowForRank(rAbs) {
    // rAbs % 3: 2->row0, 0->row1, 1->row2
    const m = rAbs % 3;
    return (m === 2) ? 0 : (m === 0 ? 1 : 2);
  }

  _levelForRank(rAbs) {
    const row = this._rowForRank(rAbs);
    const base = this._baseForRow(row);
    return (rAbs - base) / 3; // expected 0..3 int if it belongs
  }

  _correctCountInSpot(foundCard) {
    if (!foundCard) return 0;
    if (foundCard.r < 0) return 0; // wrong card never counts as correct
    const lvl = this._levelForRank(foundCard.r);
    if (!Number.isInteger(lvl) || lvl < 0 || lvl > 3) return 0;
    return lvl + 1;
  }

  _canPlaceCorrect(row, foundCard, card) {
    if (!card || card.r <= 0) return false;         // only place positive ranks correctly
    if (foundCard && foundCard.r < 0) return false; // wrong card blocks

    // must belong to that row
    if (this._rowForRank(card.r) !== row) return false;

    if (!foundCard) {
      return card.r === this._baseForRow(row);
    }

    if (foundCard.s !== card.s) return false;
    const top = Math.abs(foundCard.r);
    return card.r === top + 3;
  }

  // -----------------------------
  // Core mechanics
  // -----------------------------
  _removeCard(loc) {
    const p = this._parseLoc(loc);

    if (p.kind === "T") {
      const pile = this.t[p.idx];
      if (!pile.length) throw new Error(`Empty tableau: ${loc}`);
      return pile.pop();
    }

    if (p.kind === "F") {
      const c = this.f[p.row][p.slot];
      if (!c) throw new Error(`Empty foundation: ${loc}`);
      this.f[p.row][p.slot] = null;
      return c;
    }

    throw new Error(`removeCard unsupported: ${loc}`);
  }

 _getCardAt(loc) {
    const p = this._parseLoc(loc);

    if (p.kind === "T") {
      const pile = this.t[p.idx];
      if (!pile.length) return null;
      return pile[pile.length - 1];  // Top card
    }

    if (p.kind === "F") {
      return this.f[p.row][p.slot];
    }

    return null;
}

  _placeCard(loc, card) {
    const p = this._parseLoc(loc);

    if (p.kind === "F") {
      const found = this.f[p.row][p.slot];
      const cPos = { r: Math.abs(card.r), s: card.s }; // on foundation always store as positive
      if (!this._canPlaceCorrect(p.row, found, cPos)) {
        throw new Error(`Illegal place to ${loc}`);
      }
      this.f[p.row][p.slot] = cPos;
      return;
    }

    if (p.kind === "T") {
      // not used by your rules right now
      this.t[p.idx].push(card);
      return;
    }

    throw new Error(`placeCard unsupported: ${loc}`);
  }

  _saveState() {
    const cloneCard = (c) => (c ? { r: c.r, s: c.s } : null);
    return {
      seed: this.seed,
      t: this.t.map(p => p.map(cloneCard)),
      f: this.f.map(row => row.map(cloneCard)),
      stock: this.stock.map(cloneCard),
    };
  }

  _restoreState(st) {
    const cloneCard = (c) => (c ? { r: c.r, s: c.s } : null);
    this.seed = st.seed;
    this.t = st.t.map(p => p.map(cloneCard));
    this.f = st.f.map(row => row.map(cloneCard));
    this.stock = st.stock.map(cloneCard);
  }


  calculateCurrentScore() {
    let correct = 0;
    for (let row = 0; row < 3; row++) {
      for (let slot = 0; slot < 8; slot++) {
        correct += this._correctCountInSpot(this.f[row][slot]);
      }
    }
    return 96 - correct;
  }

  isWon() {
    return this.calculateCurrentScore() === 0;
  }

  // -----------------------------
  // Legal moves
  // -----------------------------
  getLegalMoves() {
    const moves = [];
    if (this.isWon()) return moves;

    // T -> F (only to correct row)
    for (let ti = 0; ti < 8; ti++) {
      const pile = this.t[ti];
      if (!pile.length) continue;
      const c = pile[pile.length - 1];
      const targetRow = this._rowForRank(c.r);

      for (let slot = 0; slot < 8; slot++) {
        const found = this.f[targetRow][slot];
        if (this._canPlaceCorrect(targetRow, found, c)) {
          moves.push({
            type: "move_card",
            from: `T${ti}`,
            to: `F${targetRow}${slot}`
          });
        }
      }
    }

    // F(wrong) -> F(correct)
    for (let row = 0; row < 3; row++) {
      for (let slot = 0; slot < 8; slot++) {
        const c = this.f[row][slot];
        if (!c || c.r >= 0) continue; // only wrong cards

        const cPos = { r: Math.abs(c.r), s: c.s };
        const targetRow = this._rowForRank(cPos.r);

        for (let tslot = 0; tslot < 8; tslot++) {
          const found = this.f[targetRow][tslot];
          if (this._canPlaceCorrect(targetRow, found, cPos)) {
            moves.push({
              type: "move_card",
              from: `F${row}${slot}`,
              to: `F${targetRow}${tslot}`
            });
          }
        }
      }
    }

    if (this.stock.length > 0) {
      moves.push({ type: "deal_stock" });
    }

    return moves;
  }

  // -----------------------------
  // Deal stock: 8 cards -> tableau (one per pile)
  // -----------------------------
  dealStock() {
    for (let i = 0; i < 8; i++) {
      if (!this.stock.length) break;
      const c = this.stock.pop();
      if (c.r === 1) continue;     // Ace: weg
      this.t[i].push(c);
    }
    return;
  }

  undo(n = 1) {
    if (!Number.isInteger(n) || n <= 0) return false;
    if (this.history.length < n) return false;

    while (n-- > 0) {
      const st = this.history.pop();
      this._restoreState(st);
    }
    return true;
  }


  // --- helper: liefert alle movable Karten (Tableau-Top + falsche Foundationkarten) ---
_iterMovables() {
  const out = [];

  // Tableau tops
  for (let ti = 0; ti < 8; ti++) {
    const pile = this.t[ti];
    if (pile.length) {
      out.push({ from: `T${ti}`, card: pile[pile.length - 1] });
    }
  }

  // wrong cards on foundation (negative r)
  for (let row = 0; row < 3; row++) {
    for (let slot = 0; slot < 8; slot++) {
      const c = this.f[row][slot];
      if (c && c.r < 0) out.push({ from: `F${row}${slot}`, card: c });
    }
  }

  return out;
}

// --- helper: findet alle legalen Zielslots auf der korrekten Row ---
_legalTargetsFor(card) {
  const cPos = { r: Math.abs(card.r), s: card.s };
  const row = this._rowForRank(cPos.r);
  const targets = [];

  for (let slot = 0; slot < 8; slot++) {
    const found = this.f[row][slot];
    if (this._canPlaceCorrect(row, found, cPos)) {
      targets.push(`F${row}${slot}`);
    }
  }
  return targets;
}

// --- helper: gibt true falls irgendwo ein korrektes Twin schon liegt ---
_hasTwinOk(card) {
  if (!card) return false;
  
  const r = Math.abs(card.r);
  const s = card.s;
  
  if (r <= 4) return false;
  
  const row = this._rowForRank(r);
  
  for (let slot = 0; slot < 8; slot++) {
    const c = this.f[row][slot];
    if (c && c.r >= r && c.s === s) {
      return true;
    }
  }
  
  return false;
}

// --- helper: Row ist "sauber" = nur korrekt oder leer, keine falschen Karten ---
_rowIsClean(row) {
  for (let slot = 0; slot < 8; slot++) {
    const c = this.f[row][slot];
    if (c && c.r < 0) return false;
  }
  return true;
}

// --- helper: Zwilling liegt zuunterst auf einem Tableau-Stack ---
_twinAtBottom(from, card) {
  const r = Math.abs(card.r);
  const s = card.s;
  if (r < 11) return false;
  
  // ✅ Extrahiere Stack-Index von "from"
  let fromStack = -1;
  if (from.startsWith('T')) {
    fromStack = parseInt(from.slice(1), 10);
  }
  
  // ✅ Suche Zwilling ganz unten auf einem ANDEREN Stack
  for (let ti = 0; ti < 8; ti++) {
    if (ti === fromStack) continue;  // ← Skip eigenen Stack!
    
    const pile = this.t[ti];
    if (pile.length === 0) continue;
    
    const bottom = pile[0];
    if (Math.abs(bottom.r) === r && bottom.s === s) {
      return true;
    }
  }
  
  return false;
}

// --- helper: Zwilling liegt unter der Karte auf demselben Stack ---
_twinBelowOnSameStack(from, card) {
  if (!from.startsWith('T')) return false;
  
  const ti = parseInt(from.slice(1), 10);
  const pile = this.t[ti];
  if (pile.length <= 1) return false;
  
  const r = Math.abs(card.r);
  const s = card.s;
  
  for (let i = 0; i < pile.length - 1; i++) {
    const c = pile[i];
    if (Math.abs(c.r) === r && c.s === s) {
      return true;
    }
  }
  return false;
}

// --- helper: Zwilling ist blockiert (Karte aus gleicher Sequenz liegt drüber) ---
_twinBlocked(card) {
  const r = Math.abs(card.r);
  const s = card.s;
  const row = this._rowForRank(r);
  
  for (let ti = 0; ti < 8; ti++) {
    const pile = this.t[ti];
    if (pile.length < 2) continue;
    
    for (let twinIdx = 0; twinIdx < pile.length; twinIdx++) {
      const twinCard = pile[twinIdx];
      if (Math.abs(twinCard.r) !== r || twinCard.s !== s) continue;
      
      for (let aboveIdx = twinIdx + 1; aboveIdx < pile.length; aboveIdx++) {
        const cardAbove = pile[aboveIdx];
        const rAbove = Math.abs(cardAbove.r);
        
        if (cardAbove.s === s && 
            this._rowForRank(rAbove) === row && 
            rAbove > r) {
          return true;
        }
      }
    }
  }
  return false;
}

// --- helper: Beide Zwillinge liegen FALSCH auf derselben Foundation-Row ---
_bothTwinsReady(card) {
  const r = Math.abs(card.r);
  const s = card.s;
  if (r < 5) return false;  // gilt nur für Ränge 5+

  for (let row = 0; row < 3; row++) {
    let wrongCount = 0;
    for (let slot = 0; slot < 8; slot++) {
      const c = this.f[row][slot];
      if (c && c.r < 0 && Math.abs(c.r) === r && c.s === s) wrongCount++;
    }
    if (wrongCount === 2) return true;
  }
  return false;
}

// --- helper: Stock leer und nur ein Move möglich (forced move) ---
_isForcedMove() {  // ← Rename!
  if (this.stock.length > 0) return false;
  const moves = this.getLegalMoves();
  const nonDealMoves = moves.filter(m => m.type !== "deal_stock");
  return nonDealMoves.length === 1;
}

_formatCard = (card, forceWrong = false) => {
  const suitSolid = ["♣", "♦", "♥", "♠"];
  const suitHollow = ["♧", "♢", "♡", "♤"];

  if (!card) return "   ";
  const isCorrect = forceWrong ? false : (card.r > 0);

  const rankStr = (rAbs) => {
    if (rAbs === 11) return "J";
    if (rAbs === 12) return "Q";
    if (rAbs === 13) return "K";
    return String(rAbs);
  };
    const s = card.s;
    const rAbs = Math.abs(card.r);
    const suit = isCorrect ? suitSolid[s] : suitHollow[s];
    const rank = rankStr(rAbs).padStart(2);
    return `${suit}${rank}`;
};


printState() {
 
  console.log("═══════════════════════════════════════════════════════════════");

  // Foundations: 3 Reihen, 8 Slots
  for (let row = 0; row < 3; row++) {
    const line = this.f[row].map((card) => {
      return this._formatCard(card);
    });
    console.log("  " + line.join("  "));
  }

  console.log("───────────────────────────────────────────────────────────────");

  // Tableau: alle Karten sind “nicht korrekt” => hohle Symbole
  const maxHeight = Math.max(...this.t.map(p => p.length), 1);
  for (let r = 0; r < maxHeight; r++) {
    let line = "  ";
    for (let col = 0; col < 8; col++) {
      const card = this.t[col][r];
      line += this._formatCard(card, true) + "  ";
    }
    console.log(line);
  }

  console.log("───────────────────────────────────────────────────────────────");
  console.log(`SCORE: ${this.getState().score} | Stock: ${this.stock.length} | `);
  console.log("═══════════════════════════════════════════════════════════════");
}

findOneAutoMove() {
  // const moves = this.getLegalMoves();
  if (this.isWon()) return null;

  const isForcedMove = this._isForcedMove(); 


  for (const { from, card } of this._iterMovables()) {

    const rAbs = Math.abs(card.r);
    if (rAbs === 1) continue;

    const targets = this._legalTargetsFor(card);
    if (!targets.length) continue;

    const row  = this._rowForRank(rAbs);
    const base = this._baseForRow(row);

    // BESTEHENDE AUTOMOVES
    if (this._hasTwinOk(card)) {
      return {
        action: { type: "move_card", from, to: targets[0] },
        reason: "twin-ok"
      };
    }

    if (rAbs >= 5 && targets.length >= 2) {
      return {
        action: { type: "move_card", from, to: targets[0] },
        reason: "two-possibilities"
      };
    }

    if (rAbs === base && this._rowIsClean(row)) {
      return {
        action: { type: "move_card", from, to: targets[0] },
        reason: "safe-base"
      };
    }

    // NEUE AUTOMOVES
    if (this._twinAtBottom(from, card)) {
      return {
        action: { type: "move_card", from, to: targets[0] },
        reason: "twin-at-bottom"
      };
    }

    if (this._twinBelowOnSameStack(from, card)) {
      return {
        action: { type: "move_card", from, to: targets[0] },
        reason: "twin-below-same-stack"
      };
    }

    if (this._twinBlocked(card)) {
      return {
        action: { type: "move_card", from, to: targets[0] },
        reason: "twin-blocked"
      };
    }

    // ✅ KORRIGIERT: Beide Zwillinge FALSCH auf derselben Row
    if (this._bothTwinsReady(card)) {
      return {
        action: { type: "move_card", from, to: targets[0] },
        reason: "both-twins-ready"
      };
    }

    if (isForcedMove) {
      return {
        action: { type: "move_card", from, to: targets[0] },
        reason: "just-one"
      };
    }


  }

  return null;
}


  // -----------------------------
  // Move execution (strict invariants)
  // -----------------------------

  _executeMoveOnce(action) {
    if (action.type === "deal_stock") {
      this.dealStock();
      return;
    }

    if (action.type === "move_card") {
      const c = this._removeCard(action.from);
      this._placeCard(action.to, c);
      return;
    }

    throw new Error("Invalid action");
  }

// CLEAN executeMove - ALWAYS run AutoMoves
// ===========================================
//
// Design:
// - AutoMoves ALWAYS run (no option to disable)
// - ONE history entry before initial move
// - undo(1) restores state from BEFORE initial move (undoes move + all automoves)
//
// Usage:
//   executeMove(action)                    // Normal play
//   executeMove(action, {undoable: false}) // No history (e.g., for undo itself)

executeMove(action, options = {}) {
  const undoable = options.undoable ?? true;

  // ✅ Save state ONCE before EVERYTHING
  if (undoable) {
    this.history.push(this._saveState());
  }
  
  try {
    // Execute the initial move
    this._executeMoveOnce(action);
    
    // ALWAYS execute AutoMoves (no option to skip!)
    const autoLog = [];
    while (true) {
      const auto = this.findOneAutoMove();
      if (!auto) break;

      const cardToMove = this._getCardAt(auto.action.from);

      // Execute AutoMove (no history entry!)
      this._executeMoveOnce(auto.action);
      autoLog.push(auto);

      // Update stats
      if (auto.reason && this.autoMoveStats.hasOwnProperty(auto.reason)) {
        this.autoMoveStats[auto.reason]++;
        if (this.autoMoveStats[auto.reason] < 2) {
          const cardStr = this._formatCard(cardToMove);
          // Optional: console.log(`[AUTO] ${cardStr} from ${auto.action.from} to ${auto.action.to}, Reason: ${auto.reason}`);
        }
      }
    }
    
    // Return result
    return {
      autoMoves: autoLog,
      score: this.calculateCurrentScore()
    };
    
  } catch (e) {
    // Rollback on error
    if (undoable && this.history.length > 0) {
      const st = this.history.pop();
      this._restoreState(st);
    }
    throw e;
  }
}

// Examples:
// 
// Normal play:
//   const result = game.executeMove({type: 'move_card', from: 'T0', to: 'F00'});
//   // → Initial move + AutoMoves executed
//   // → history.push() called once
//   // → undo(1) will undo everything
//
// Result:
//   {
//     autoMoves: [
//       {action: {...}, reason: 'twin-ok'},
//       {action: {...}, reason: 'safe-base'}
//     ],
//     score: 42
//   }

  // -----------------------------
  // State (compact)
  // -----------------------------
  getState() {
    const enc = (c) => (c ? { r: c.r, s: c.s } : null);

    return {
      seed: this.seed,
      t: this.t.map(p => p.map(enc)),
      f: this.f.map(row => row.map(enc)),
      stock: this.stock.length,
      m: this.getLegalMoves().map(a => {
        // wir schicken absichtlich NUR type/from/to (kein card), damit nix driftet
        if (a.type === "deal_stock") return { type: "deal_stock" };
        return { type: "move_card", from: a.from, to: a.to };
      }),
      score: this.calculateCurrentScore(),
      autoMoveStats: this.autoMoveStats,  // ✅ NEU

    };
  }

  // --- helpers für getState ---
  _suitToStr(s) {
    return ["clubs", "diamonds", "hearts", "spades"][s];
  }

  _rankToStr(r) {
    if (r === 1) return "A";
    if (r === 11) return "J";
    if (r === 12) return "Q";
    if (r === 13) return "K";
    return String(r);
  }

  _formatFoundationSlot(row, c) {
    if (!c) return null;
    const isCorrect = (c.r > 0); // bei dir: negative ranks = falsch
    return {
      card: { rank: this._rankToStr(Math.abs(c.r)), suit: this._suitToStr(c.s) },
      isCorrect,
    };
  }

  // -----------------------------
  // Init deck & initial deal
  // -----------------------------
  _initDeckAndDeal(providedDeck = null) {
  // 2 Decks * (2..K + A) = 104
    let deck;
    if (providedDeck) {
      // Externe, bereits feststehende Kartenreihenfolge (z.B. aus der Live-App
      // per dealOrder exportiert) - Index 0 = wird zuletzt ausgeteilt (unten im
      // Stock), Index 103 = wird zuerst ausgeteilt. Kein eigener Shuffle.
      if (providedDeck.length !== 104) {
        throw new Error(`initialDeck muss genau 104 Karten enthalten, hat ${providedDeck.length}`);
      }
      deck = providedDeck.map((c) => ({ r: c.r, s: c.s }));
    } else {
      deck = [];
      for (let d = 0; d < 2; d++) {
        for (let s = 0; s < 4; s++) {
          for (let r = 2; r <= 13; r++) deck.push({ r, s });
          deck.push({ r: 1, s }); // Ace = 1 (wird verworfen, nie gespeichert)
        }
      }
      this._shuffle(deck);
    }

  // 24 Karten S -> F (8 pro Row/Slot), Ass => null, keine Ersatzkarte.
  // WICHTIG: Reihenfolge ROW-MAJOR (erst alle 8 Slots von Row 0/Basis 2,
  // dann alle 8 von Row 1/Basis 3, dann alle 8 von Row 2/Basis 4) - das
  // entspricht exakt der Live-App (galleryjs.js initLayout():
  // moveStock2Foundation(2); moveStock2Foundation(0); moveStock2Foundation(1);
  // -> pops 1-8 = Basis 2, 9-16 = Basis 3, 17-24 = Basis 4).
  // Ein frueherer Bug hier iterierte SLOT-MAJOR (row zyklisch alle 3 Pops),
  // wodurch bei identischem dealOrder bis zu 16 von 24 Karten einer
  // ANDEREN Row/Basis zugeordnet wurden als in der Live-App - vermutliche
  // Hauptursache der grossen Cross-Check-Luecken (s. status.md Update 19/20).
  for (let row = 0; row < 3; row++) {
    for (let slot = 0; slot < 8; slot++) {
      const c = deck.pop();
      if (!c) {
        this.f[row][slot] = null;
        continue;
      }

      if (c.r === 1) { // Ace
        this.f[row][slot] = null;
        continue;
      }

      const base = this._baseForRow(row); // row0=2, row1=3, row2=4
      this.f[row][slot] = { r: (c.r === base) ? c.r : -c.r, s: c.s };
    }
  }
      // Stock gets the rest
    this.stock = deck;

    this.dealStock();

    // Tableau starts empty (you said: stock is dealt to tableau over time)
    // If you want an initial tableau deal, do it here.
  }

/*   restoreState(st) {
    const cloneCard = (c) => (c ? { r: c.r, s: c.s } : null);
    this.seed = st.seed;
    this.t = st.t.map(p => p.map(cloneCard));
    this.f = st.f.map(row => row.map(cloneCard));
    this.stock = st.stock.map(cloneCard);
  } */

}


// ============================================================================
// pimcWorker.js - PROTOTYP: Hintergrund-Auswertung waehrend der Mensch spielt
// ============================================================================
//
// Idee (Nutzer, 05.09.2026): die 1000-Versuche-Random-Baseline (bisher via
// "Evaluate"-Knopf ERST NACH Spielende, blockierend/inkrementell im
// draw()-Loop) soll bereits waehrend der Mensch spielt im Hintergrund
// laufen, damit das Resultat sofort verfuegbar ist, sobald er fertig ist.
//
// Web Worker sind dafuer genau richtig: eigener Thread, blockiert die UI
// nicht. Die Live-App nutzt Worker bereits (worker.js, jsstore.worker.js),
// die Infrastruktur ist also vorhanden.
//
// Dieses Skript enthaelt den JETZT VERIFIZIERTEN Trainings-Engine-Code
// (game.js aus dem separaten KI-Trainings-Repo, Row-Major-Foundation-Deal-
// Fix vom 05.09.2026 - stimmt auf 23 echten Partien eng mit den von der
// Live-App gemeldeten Statistiken ueberein, s. Projekt-Doc Update 20/21).
// Es ist bewusst eine EIGENSTAENDIGE Kopie (keine Aenderung an den
// bestehenden Live-Dateien CardPile.js/SpecialCardPiles.js/galleryjs.js),
// damit dieser Prototyp risikofrei getestet werden kann, ohne das laufende
// Spiel zu beeinflussen.
//
// Protokoll (postMessage):
//   Haupt-Thread -> Worker: { dealOrder: "12,4,...", n: 1000, alpha: 0.01 }
//   Worker -> Haupt-Thread (Fortschritt, alle 100 Spiele):
//     { type: "progress", done: 100, total: 1000 }
//   Worker -> Haupt-Thread (fertig):
//     { type: "done", scores: [...sortiert...], mean, median, minimum,
//       maximum, elapsedMs }
//
// Nutzung im Hauptskript (Beispiel, noch NICHT in galleryjs.js verdrahtet -
// das ist der naechste Schritt nach Validierung dieses Prototyps):
//
//   const worker = new Worker('js/pimcWorker.js');
//   worker.postMessage({ dealOrder: window.currentDealOrder, n: 1000, alpha: 0.01 });
//   worker.onmessage = (e) => {
//     if (e.data.type === 'done') {
//       window.backgroundEvalResult = e.data;  // steht bereit, sobald Mensch fertig ist
//     }
//   };

function makeRandomBaselineAgent(alpha) {
  return function chooseMove(game, rng) {
    const moves = game.getLegalMoves();
    if (moves.length === 0) return null;
    const dealMoves = moves.filter((m) => m.type === "deal_stock");
    const cardMoves = moves.filter((m) => m.type === "move_card");
    if (alpha > 0 && rng() < alpha) {
      if (dealMoves.length) return dealMoves[0];
      if (cardMoves.length) return cardMoves[Math.floor(rng() * cardMoves.length)];
      return moves[0];
    }
    if (cardMoves.length) return cardMoves[Math.floor(rng() * cardMoves.length)];
    if (dealMoves.length) return dealMoves[0];
    return moves[0];
  };
}

function playOneRandomGame(dealOrder, alpha, rng) {
  const game = GallerySolitaire.fromDealOrder(dealOrder);
  const chooseMove = makeRandomBaselineAgent(alpha);
  let guard = 0;
  while (guard++ < 5000) {
    const action = chooseMove(game, rng);
    if (!action) break;
    game.executeMove(action, { undoable: false });
  }
  return game.calculateCurrentScore();
}

// Kleiner, deterministischer PRNG (mulberry32) statt Math.random() im
// Worker - rein aus Testbarkeits-Gruenden (reproduzierbare Ergebnisse bei
// gleichem Startwert); fuer den produktiven Einsatz waere Math.random()
// (echter Zufall pro Simulation) ebenso geeignet.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runEvaluation(dealOrder, n, alpha, postProgress) {
  const t0 = Date.now();
  const scores = [];
  for (let i = 0; i < n; i++) {
    const rng = mulberry32((Date.now() ^ (i * 2654435761)) >>> 0);
    scores.push(playOneRandomGame(dealOrder, alpha, rng));
    if (postProgress && (i + 1) % 100 === 0) postProgress(i + 1, n);
  }
  scores.sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = scores.length % 2
    ? scores[(scores.length - 1) / 2]
    : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2;
  return {
    scores,
    mean: +mean.toFixed(3),
    median,
    minimum: scores[0],
    maximum: scores[scores.length - 1],
    elapsedMs: Date.now() - t0,
  };
}

// --- Worker-Einstiegspunkt (nur aktiv, wenn tatsaechlich als Web Worker
//     geladen; in Node/Test-Kontext bleibt self/onmessage einfach ungenutzt) ---

// ============================================================================
// PIMC-Agent (Prototyp "KI-Version") - Perfect Information Monte Carlo.
// Portiert aus js/agents/pimc.js + js/agents/greedy.js + js/fairApi.js
// (Trainings-Repo), fuer den Worker zusammengefasst (kein require() im
// Browser). Gleiche Logik, gleiche Default-Parameter (numSamples=160,
// Greedy-Rollout) wie in js/eval/analyze_real_games.js verwendet.
// ============================================================================

function cloneGame(game) {
  // Wichtig: ueber den echten Konstruktor gehen (nicht Object.create), da
  // GallerySolitaire Klassenfelder (z.B. _formatCard = (card) => {...})
  // nur beim "new ..."-Aufruf initialisiert werden - s. gameApi.js#clone.
  const g2 = new GallerySolitaire(game.seed ?? 0);
  g2.rng = game.rng;
  g2.history = [];
  g2.autoMoveStats = { ...game.autoMoveStats };
  g2._restoreState(game._saveState());
  return g2;
}

function determinize(game, rng) {
  const clone = cloneGame(game);
  const shuffled = clone.stock.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
  }
  clone.stock = shuffled;
  return clone;
}

function greedyChooseMove(game, rng) {
  const moves = game.getLegalMoves();
  if (moves.length === 0) return null;
  const cardMoves = moves.filter((m) => m.type === "move_card");
  const pool = cardMoves.length > 0 ? cardMoves : moves;
  return pool[Math.floor(rng() * pool.length)];
}

function rolloutScore(game, rng, maxMoves) {
  let moves = 0;
  while (moves < maxMoves) {
    if (game.getLegalMoves().length === 0) break;
    const action = greedyChooseMove(game, rng);
    if (!action) break;
    game.executeMove(action, { undoable: false });
    moves++;
  }
  return game.calculateCurrentScore();
}

// Gezielter heuristischer Kniff (Nutzer-Beobachtung, s. Projektstatus):
// Eine "fertigstellende" Foundation-Karte (J/Q/K - also Rang base+9 der
// jeweiligen Reihe), die von einer Tableau-Pile kommt, in der sie die
// einzige Karte ist (der Zug legt also nichts Neues frei - "schadet
// niemandem und nuetzt auch nichts"), wird leicht abgewertet, WENN ihr
// Zwilling (zweite Kopie, Doppeldeck) noch irgendwo im Spiel ist - der
// koennte spaeter noch als "Deckel" auf einer anderen Pile nuetzlich
// sein. Reine Tie-Break-Praeferenz (kleiner Aufschlag auf den mittleren
// Score, 0=perfekt) - identisch zu js/agents/pimc.js im Trainings-Repo.
const USELESS_COMPLETION_PENALTY = 0.5;

function countCardsElsewhere(game, rank, suit, skipFrom) {
  let count = 0;
  for (const c of game.stock) {
    if (c.r === rank && c.s === suit) count++;
  }
  for (let ti = 0; ti < 8; ti++) {
    const pile = game.t[ti];
    for (let k = 0; k < pile.length; k++) {
      if (skipFrom === `T${ti}` && k === pile.length - 1) continue;
      const c = pile[k];
      if (c.r === rank && c.s === suit) count++;
    }
  }
  for (let row = 0; row < 3; row++) {
    for (let slot = 0; slot < 8; slot++) {
      const c = game.f[row][slot];
      if (!c) continue;
      if (skipFrom === `F${row}${slot}`) continue;
      if (Math.abs(c.r) === rank && c.s === suit) count++;
    }
  }
  return count;
}

function uselessCompletionPenalty(game, action) {
  if (action.type !== "move_card") return 0;
  if (action.from[0] !== "T" || action.to[0] !== "F") return 0;
  const ti = parseInt(action.from.slice(1), 10);
  const pile = game.t[ti];
  if (!pile.length || pile.length !== 1) return 0;
  const card = pile[0];
  const row = parseInt(action.to[1], 10);
  const base = game._baseForRow(row);
  if (card.r !== base + 9) return 0;
  if (countCardsElsewhere(game, card.r, card.s, action.from) === 0) return 0;
  return USELESS_COMPLETION_PENALTY;
}

// Verbesserte Variante (14.10.2026, s. docs/pimc-verbesserung.md, im Benchmark
// "crn": +2 Pp "besser+gleich", 63 vs. 30 Lagen besser):
//  - Dedupe: Zuege derselben Karte auf Slots mit identischem Inhalt (z.B. zwei
//    leere Slots) sind gleichwertig und werden nur einmal bewertet.
//  - Common Random Numbers: alle Kandidaten werden auf denselben Stock-
//    Mischungen/Rollout-Zufallszahlen bewertet -> Unterschiede zwischen den
//    Kandidaten sind weniger vom Zufall verrauscht.
function pimcChooseMove(game, rng, numSamples, maxRolloutMoves) {
  let candidates = game.getLegalMoves();
  if (candidates.length <= 1) return candidates[0] || null;

  const seen = new Set();
  candidates = candidates.filter((a) => {
    if (a.type !== "move_card") return true;
    const p = game._parseLoc(a.to);
    const key = a.from + "|" + JSON.stringify(game.f[p.row][p.slot]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (candidates.length === 1) return candidates[0];

  const seeds = Array.from({ length: numSamples }, () => (rng() * 2 ** 32) >>> 0);
  let best = null;
  let bestMean = Infinity;
  for (const action of candidates) {
    let total = 0;
    for (let i = 0; i < numSamples; i++) {
      const r = mulberry32(seeds[i]);
      const hypothesis = determinize(game, r);
      hypothesis.executeMove(action, { undoable: false });
      total += rolloutScore(hypothesis, r, maxRolloutMoves);
    }
    const mean = total / numSamples + uselessCompletionPenalty(game, action);
    if (mean < bestMean) {
      bestMean = mean;
      best = action;
    }
  }
  return best;
}

// ----------------------------------------------------------------------------
// Phasenweise Entscheidung (20.10.2026, s. docs/pimc-verbesserung.md Schritt 5,
// im Benchmark "crn-phase": +4.5 Pp "besser+gleich" gegenueber crn, 62 vs. 30
// Lagen besser). Innerhalb einer Phase (zwischen zwei Austeilungen) ist alles
// bekannt und Undo erlaubt -> die eigentliche Entscheidung ist, in WELCHER
// erreichbaren Stellung ausgeteilt wird (fruehes Austeilen inbegriffen, z.B.
// "parkierte" Bildkarten tief in einer Kolonne liegen lassen).
//  - Am Phasenanfang alle erreichbaren Stellungen aufzaehlen.
//  - Jede per CRN bewerten (Stock mischen, austeilen, Zufalls-Rollout),
//    zweistufig: alle mit 16 Samples, die besten max(8, 10 %) mit numSamples.
//  - Den Weg zur besten Stellung nachspielen, dann austeilen.
//  - Stock leer: exakte Suche (jeder Kartenzug senkt den Score um genau 1,
//    bester Endscore = laengste Zugfolge).
//  - Obergrenze: Stufe 1 hoechstens PHASE_BUDGET1 Rollouts (bei vielen
//    Stellungen weniger Samples, mind. 2), hoechstens PHASE_MAX_TOP Finalisten
//    (Benchmark "crn-phase-cap": max. Zeit/Partie 254 s -> 20 s, Qualitaet
//    -0.8 +- 0.5 Pp, n. s.).
//  - Zu viele Stellungen -> fuer diese Entscheidung pimcChooseMove (crn).
// Zustand kanonisch: Stapelhoehen (innerhalb einer Phase wird nur abgetragen)
// + je Reihe die sortierten Slot-Inhalte (Slot-Position ist fuer die Regeln
// egal; alle legalen Ziele einer Karte haben denselben Inhalt -> Zug = Quelle).
// ----------------------------------------------------------------------------
const PHASE_ABORT = new Error("phase: Limit");
const PHASE_FIRST_SAMPLES = 16;
const PHASE_MAX_STATES = 20000;
const PHASE_BUDGET1 = 4800; // = 16 Samples x 300 Stellungen
const PHASE_MAX_TOP = 30;
const PHASE_MAX_ENDGAME_NODES = 2e6;
const phaseDummyStats = {};

// Schneller Klon ohne Konstruktor (der baut/mischt jedes Mal ein ganzes Deck).
// Karten werden nie veraendert, nur verschoben -> flache Kopien genuegen.
function phaseClone(g) {
  const c = Object.create(GallerySolitaire.prototype);
  c.seed = g.seed; c.rng = g.rng; c.history = []; c.autoMoveStats = phaseDummyStats;
  c.t = g.t.map((p) => p.slice()); c.f = g.f.map((r) => r.slice()); c.stock = g.stock.slice();
  return c;
}
function phaseKey(g) {
  let k = g.t.map((p) => p.length).join(",");
  for (let row = 0; row < 3; row++) {
    k += "|" + g.f[row].map((c) => (c ? (c.r + 13) * 4 + c.s : -1)).sort((x, y) => x - y).join(",");
  }
  return k;
}
function phaseCardMoves(g) {
  const seen = new Set();
  return g.getLegalMoves().filter((a) => a.type === "move_card" && !seen.has(a.from) && seen.add(a.from));
}

// bestmoeglicher Endscore ab g bei leerem Stock (Tiefensuche mit Memo)
function phaseSolve(g, memo, budget) {
  const key = phaseKey(g);
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  if (--budget.nodes < 0) throw PHASE_ABORT;
  let best = g.calculateCurrentScore();
  // Schranke: hoechstens jede Tableau-Karte und jede falsche F-Karte wird noch abgelegt
  let open = 0;
  for (const p of g.t) open += p.length;
  for (const row of g.f) for (const c of row) if (c && c.r < 0) open++;
  const bound = Math.max(0, best - open);
  for (const a of phaseCardMoves(g)) {
    if (best === bound) break;
    const h = phaseClone(g);
    h.executeMove(a, { undoable: false });
    best = Math.min(best, phaseSolve(h, memo, budget));
  }
  memo.set(key, best);
  return best;
}
function endgameChooseMove(g) {
  const moves = phaseCardMoves(g);
  if (moves.length <= 1) return moves[0] || null;
  const memo = new Map(), budget = { nodes: PHASE_MAX_ENDGAME_NODES };
  try {
    let best = null, bestScore = Infinity;
    for (const a of moves) {
      const h = phaseClone(g);
      h.executeMove(a, { undoable: false });
      const s = phaseSolve(h, memo, budget);
      if (s < bestScore) { bestScore = s; best = a; }
    }
    return best;
  } catch (e) {
    if (e !== PHASE_ABORT) throw e;
    return null;
  }
}

function phaseEnumerate(g) {
  const out = new Map();
  (function rec(h, path) {
    const k = phaseKey(h);
    if (out.has(k)) return;
    if (out.size >= PHASE_MAX_STATES) throw PHASE_ABORT;
    out.set(k, { g: h, path, score: h.calculateCurrentScore() });
    for (const a of phaseCardMoves(h)) {
      const h2 = phaseClone(h);
      h2.executeMove(a, { undoable: false });
      rec(h2, path.concat([a]));
    }
  })(phaseClone(g), []);
  return [...out.values()];
}
function phaseSample(st, seed, maxRolloutMoves) {
  const r = mulberry32(seed);
  const h = phaseClone(st.g);
  const s = h.stock;
  for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = s[i]; s[i] = s[j]; s[j] = t; }
  h.executeMove({ type: "deal_stock" }, { undoable: false });
  return rolloutScore(h, r, maxRolloutMoves);
}
// liefert die Zugfolge bis zur besten Austeil-Stellung oder null (zu viele Stellungen);
// info (optional) erhaelt die Anzahl erreichbarer Stellungen (-1 = mehr als PHASE_MAX_STATES)
function phasePlan(g, rng, numSamples, maxRolloutMoves, info) {
  let states;
  try { states = phaseEnumerate(g); } catch (e) {
    if (e !== PHASE_ABORT) throw e;
    if (info) info.states = -1;
    return null;
  }
  if (info) info.states = states.length;
  if (states.length === 1) return [];
  const s1 = Math.max(2, Math.min(PHASE_FIRST_SAMPLES, numSamples, Math.floor(PHASE_BUDGET1 / states.length)));
  const seeds = Array.from({ length: numSamples }, () => (rng() * 2 ** 32) >>> 0);
  for (const st of states) { st.sum = 0; for (let i = 0; i < s1; i++) st.sum += phaseSample(st, seeds[i], maxRolloutMoves); }
  // Gleichstand -> mehr abgelegte Karten bevorzugen
  const cmp = (x, y) => x.sum - y.sum || x.score - y.score;
  states.sort(cmp);
  const top = states.slice(0, Math.min(PHASE_MAX_TOP, Math.max(8, Math.ceil(states.length / 10))));
  for (const st of top) for (let i = s1; i < numSamples; i++) st.sum += phaseSample(st, seeds[i], maxRolloutMoves);
  top.sort(cmp);
  return top[0].path;
}

// Liest die Karte, die an dieser Position aktuell oben liegt (fuer T)
// bzw. dort abgelegt ist (fuer F) - ohne den Spielzustand zu veraendern.
// Wird nur fuer move_card-Aktionen gebraucht (deal_stock betrifft keine
// einzelne Karte, sondern bis zu 8 auf einmal).
function peekCardAt(game, posStr) {
  const kind = posStr[0];
  if (kind === "T") {
    const ti = parseInt(posStr.slice(1), 10);
    const pile = game.t[ti];
    if (!pile || !pile.length) return null;
    const c = pile[pile.length - 1];
    return { r: c.r, s: c.s };
  }
  if (kind === "F") {
    const row = parseInt(posStr[1], 10);
    const slot = parseInt(posStr[2], 10);
    const c = game.f[row][slot];
    if (!c) return null;
    // c.r kann negativ sein (falsche Reihe) - fuer die Anzeige interessiert
    // uns Rang/Farbe der Karte, nicht das Vorzeichen.
    return { r: Math.abs(c.r), s: c.s };
  }
  return null;
}

// Spielt eine feste Zugliste (wie von playOnePimcGame aufgezeichnet) auf
// einer frischen Partie nach - dient als unabhaengige Gegenprobe, dass die
// aufgezeichneten Zuege tatsaechlich exakt zum gemeldeten Score fuehren.
function replayMoves(dealOrder, moves) {
  const g = GallerySolitaire.fromDealOrder(dealOrder);
  for (const m of moves) {
    g.executeMove(m, { undoable: false });
  }
  return g.calculateCurrentScore();
}

function playOnePimcGame(dealOrder, numSamples, maxRolloutMoves, rng) {
  const game = GallerySolitaire.fromDealOrder(dealOrder);
  const moves = [];
  let plan = null, planIdx = 0;
  // Freiheitsgrad: je Phase (vor jedem Austeilen) die Anzahl erreichbarer Stellungen
  const phaseStates = [];
  let phaseStock = -1;
  const chooseMove = () => {
    if (game.isWon()) return null;
    if (game.stock.length === 0) {
      return endgameChooseMove(game) || pimcChooseMove(game, rng, numSamples, maxRolloutMoves);
    }
    if (!plan) {
      const info = {};
      plan = phasePlan(game, rng, numSamples, maxRolloutMoves, info);
      planIdx = 0;
      if (game.stock.length !== phaseStock) { phaseStock = game.stock.length; phaseStates.push(info.states); }
    }
    if (!plan) return pimcChooseMove(game, rng, numSamples, maxRolloutMoves); // zu viele Stellungen
    if (planIdx < plan.length) return plan[planIdx++];
    plan = null;
    return { type: "deal_stock" };
  };
  let guard = 0;
  while (guard++ < 300) {
    const action = chooseMove();
    if (!action) break;
    const card = action.type === "move_card" ? peekCardAt(game, action.from) : null;
    game.executeMove(action, { undoable: false });
    moves.push(card ? Object.assign({}, action, { card }) : Object.assign({}, action));
  }
  const score = game.calculateCurrentScore();

  // Gegenprobe: dieselbe Zugliste unabhaengig auf einer frischen Partie
  // nachspielen und pruefen, dass exakt derselbe Score herauskommt. Das
  // ist die Grundlage dafuer, dass man sich auf das Replay verlassen kann.
  let movesVerified = false;
  try {
    movesVerified = replayMoves(dealOrder, moves) === score;
  } catch (e) {
    movesVerified = false;
  }

  return { score, moves, movesVerified, phaseStates };
}

function runFullEvaluation(dealOrder, n, alpha, pimcOpts, postProgress) {
  const baseline = runEvaluation(dealOrder, n, alpha, postProgress);

  const t1 = Date.now();
  const numSamples = (pimcOpts && pimcOpts.numSamples) || 160;
  const maxRolloutMoves = (pimcOpts && pimcOpts.maxRolloutMoves) || 300;
  const pimcRng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
  const pimcResult = playOnePimcGame(dealOrder, numSamples, maxRolloutMoves, pimcRng);
  const pimcElapsedMs = Date.now() - t1;

  return Object.assign({}, baseline, {
    pimcScore: pimcResult.score,
    pimcElapsedMs,
    pimcNumSamples: numSamples,
    pimcMoves: pimcResult.moves,
    pimcMovesVerified: pimcResult.movesVerified,
    pimcPhaseStates: pimcResult.phaseStates,
  });
}

// ============================================================================
// Loesbarkeit bei bekanntem Stock ("Ampel") - 24.10.2026
// ============================================================================
// Kennt man den Stock, ist das Spiel deterministisch; zu entscheiden ist nur,
// in welcher erreichbaren Stellung jeder Phase ausgeteilt wird (AutoMoves laufen
// immer mit). checkSolvable() sucht mit Zeitlimit einen Sieg:
//   1. Tiefensuche (solvWin) ueber alle Austeil-Stellungen mit Memo; Aeste
//      ohne Siegchance (solvWinCheck) werden abgeschnitten. Nur sie kann
//      Unloesbarkeit beweisen.
//   2. Strahlsuche (solvBeam): pro Phase die besten B Austeil-Stellungen,
//      bewertet mit dem besten von K Zufalls-Rollouts auf dem echten Stock.
// Ergebnis: 1 = Sieg gefunden (gruen), 0 = sicher unloesbar (rot),
// -1 = innert Zeitlimit kein Sieg gefunden, eventuell loesbar (orange).
// Messung und Herleitung: docs/pimc-optimum.js, docs/pimc-verbesserung.md.
// ----------------------------------------------------------------------------
const SOLVE_MS = 8000;
const SOLVE_SEARCH_SHARE = 0.2; // Anteil des Zeitlimits fuer die Tiefensuche (zuerst) ...
const SOLVE_SEARCH_MAX_MS = 3000; // ... aber hoechstens 3 s (= 20 % von 15 s): bei laengeren
// Limits sonst spaeterer Start der Strahlsuche, die die meisten Siege findet (Messung 45 s, pimc-ampel.js)
// Strahlsuchen [B, K] nacheinander; die breiten (800/3200) erreicht erst eine
// verlaengerte Pruefung (Klick auf die orange Ampel, s. retryBackgroundSolve() in galleryjs.js)
const SOLVE_BEAMS = [[10, 2], [50, 4], [200, 8], [800, 16], [3200, 32]];

// wie phaseKey, plus Stocklaenge (bei bekannter Austeilfolge bestimmen die
// Stapelhoehen den Inhalt) -> eindeutig ueber Phasen hinweg
function solvKey(g) {
  return g.stock.length + ":" + phaseKey(g);
}
// ctx: { nodes, maxNodes, deadline } -> PHASE_ABORT bei Ueberschreitung
function solvTick(ctx) {
  if (++ctx.nodes > ctx.maxNodes || ((ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline)) throw PHASE_ABORT;
}
// alle vor dem naechsten Austeilen erreichbaren Stellungen (mit Zugfolge, falls withPath)
function solvEnumerate(g, ctx, withPath, path0) {
  const out = new Map();
  (function rec(h, p) {
    const k = phaseKey(h);
    if (out.has(k)) return;
    solvTick(ctx);
    out.set(k, { g: h, path: p });
    for (const a of phaseCardMoves(h)) {
      const h2 = phaseClone(h);
      h2.executeMove(a, { undoable: false });
      rec(h2, withPath ? p.concat([a]) : p);
    }
  })(phaseClone(g), path0 || []);
  return [...out.values()];
}
function solvDeal(g) {
  const h = phaseClone(g);
  h.executeMove({ type: "deal_stock" }, { undoable: false });
  return h;
}

// Notwendige Bedingung fuer einen Sieg: false, wenn sicher eine Karte nie gelegt
// werden kann. Relaxation: fruehester Phasenindex E je Karte (auch kuenftig
// ausgeteilte; Phase d = nach dem d-ten Austeilen ab jetzt). Eine Karte kann in
// Phase t gelegt werden, wenn sie da ist, ein Vorgaenger (gleiche Farbe, Rang -3,
// bzw. ein freier Platz der Reihe fuer Basiskarten) bis t liegt bzw. frei ist,
// und die Karte darueber noch nicht ausgeteilt oder schon weg ist.
// Da bei einem Sieg ALLE Karten gelegt werden, gilt zusaetzlich: die beiden
// Kopien eines Rangs brauchen verschiedene Vorgaenger-Kopien, und es braucht so
// viele Plaetze wie fehlende Basiskarten. Ignoriert: Zuordnung ueber mehrere
// Kettenstufen.
function solvWinCheck(g, withDeadlines) {
  const INF = 99;
  const rowOf = (r) => (r % 3 === 2 ? 0 : r % 3 === 0 ? 1 : 2);
  const cards = []; // { r, s, arr, above, aboveArr }
  const tops = new Map(); // Kettenenden je (Farbe, Rang)
  const slotsWrong = [[], [], []], slotsFree = [0, 0, 0], basesMissing = [0, 0, 0];
  for (let row = 0; row < 3; row++) for (const c of g.f[row]) {
    if (!c) { slotsFree[row]++; continue; }
    if (c.r > 0) tops.set(c.s * 14 + c.r, (tops.get(c.s * 14 + c.r) || 0) + 1);
    else { slotsWrong[row].push(cards.length); cards.push({ r: -c.r, s: c.s, arr: 0, above: -1, aboveArr: INF }); }
  }
  const pileTop = [];
  for (let p = 0; p < 8; p++) {
    let prev = -1;
    for (const c of g.t[p]) {
      const i = cards.length;
      cards.push({ r: c.r, s: c.s, arr: 0, above: -1, aboveArr: INF });
      if (prev >= 0) { cards[prev].above = i; cards[prev].aboveArr = 0; }
      prev = i;
    }
    pileTop.push(prev);
  }
  // kuenftige Austeilungen wie dealStock(): je bis 8 Karten, Asse fallen weg
  const st = g.stock;
  for (let k = st.length - 1, d = 1; k >= 0; d++) {
    for (let p = 0; p < 8 && k >= 0; p++, k--) {
      const c = st[k];
      if (c.r === 1) continue;
      const i = cards.length;
      cards.push({ r: c.r, s: c.s, arr: d, above: -1, aboveArr: INF });
      const prev = pileTop[p];
      if (prev >= 0) { cards[prev].above = i; cards[prev].aboveArr = d; }
      pileTop[p] = i;
    }
  }
  const byId = new Map();
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i], id = c.s * 14 + c.r;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(i);
    if (c.r === rowOf(c.r) + 2) basesMissing[rowOf(c.r)]++;
  }
  for (let row = 0; row < 3; row++) if (slotsFree[row] + slotsWrong[row].length < basesMissing[row]) return false;

  const E = new Array(cards.length).fill(INF);
  const at = (i, p) => {
    if (p >= INF) return INF;
    const c = cards[i];
    let t = Math.max(c.arr, p);
    if (t >= c.aboveArr) t = Math.max(t, E[c.above]);
    return t;
  };
  const groups = [...byId.entries()];
  // Ein Durchgang. strict=false: jede Kopie nimmt den fruehesten Vorgaenger (ab
  // INF bis zum Stillstand -> E <= echte Zeiten jeder Siegpartie). strict=true:
  // nur Zuordnungen, bei denen beide Kopien einen eigenen Vorgaenger mit
  // endlicher Zeit haben; aus E <= echt folgt E' <= echt. (Strikt direkt ab INF
  // waere falsch: Ketten, die sich ueber beide Kopien gegenseitig brauchen,
  // blieben dann auf INF stehen.)
  const sweep = (strict) => {
    const N = E.slice();
    for (const [id, inst] of groups) {
      const r = id % 14, row = rowOf(r);
      if (r === row + 2) {
        let p = slotsFree[row] > 0 ? 0 : INF;
        for (const w of slotsWrong[row]) if (E[w] < p) p = E[w];
        for (const i of inst) N[i] = at(i, p);
        continue;
      }
      const src = [];
      for (let k = 0; k < (tops.get(id - 3) || 0); k++) src.push(0);
      for (const j of byId.get(id - 3) || []) src.push(E[j]);
      if (inst.length === 1 || !strict) {
        const p = Math.min(INF, ...src);
        for (const i of inst) N[i] = at(i, p);
        continue;
      }
      const [x, y] = inst;
      if (src.length < 2) { N[x] = N[y] = INF; continue; }
      const A = [at(x, src[0]), at(y, src[1])], B = [at(x, src[1]), at(y, src[0])];
      const okA = A[0] < INF && A[1] < INF, okB = B[0] < INF && B[1] < INF;
      N[x] = Math.min(okA ? A[0] : INF, okB ? B[0] : INF);
      N[y] = Math.min(okA ? A[1] : INF, okB ? B[1] : INF);
    }
    return N;
  };
  for (let guard = 0; guard < 200; guard++) {
    const N = sweep(false);
    let ch = false;
    for (let i = 0; i < N.length; i++) if (N[i] < E[i]) { E[i] = N[i]; ch = true; }
    if (!ch) break;
  }
  for (let round = 0; round < 30; round++) {
    const N = sweep(true);
    let ch = false;
    for (let i = 0; i < N.length; i++) if (N[i] !== E[i]) { E[i] = N[i]; ch = true; }
    if (!ch) break;
  }
  if (!E.every((e) => e < INF)) return false;
  // Teuer (in der Tiefensuche netto weniger Siege) -> nur am Anfang der Pruefung
  return !withDeadlines || solvDeadlinesOk(cards, rowBases(byId, rowOf), slotsFree, slotsWrong, E, sweep);
}

function rowBases(byId, rowOf) {
  const out = [[], [], []];
  for (const [id, inst] of byId) {
    const r = id % 14, row = rowOf(r);
    if (r === row + 2) out[row].push(...inst);
  }
  return out;
}

// Spaeteste Zeitpunkte: Liegt spaeter y auf x und kommt y ohne x gar nicht ins Spiel (Sperrprobe:
// E neu rechnen, als waere x nie gespielt), muss x vor der Austeilung von y weg. Unvertraeglich ist:
//  - x fruehestens erst ab dieser Austeilung spielbar
//  - in einer Reihe muessen bis Phase t mehr Basiskarten liegen, als bis dann Plaetze frei werden
function solvDeadlinesOk(cards, bases, slotsFree, slotsWrong, E, sweep) {
  const INF = 99;
  const deadlineOf = (x) => {
    if (cards[x].above < 0) return INF;
    const keep = E.slice();
    E.fill(INF);
    for (let guard = 0; guard < 200; guard++) {
      const N = sweep(false);
      N[x] = INF;
      let ch = false;
      for (let i = 0; i < N.length; i++) if (N[i] < E[i]) { E[i] = N[i]; ch = true; }
      if (!ch) break;
    }
    let dl = INF;
    for (let y = cards[x].above; y >= 0; y = cards[y].above) {
      if (E[y] >= INF) { dl = cards[y].arr; break; } // Karten darueber: erste, die x braucht
    }
    for (let i = 0; i < E.length; i++) E[i] = keep[i];
    return dl;
  };
  const dl = cards.map((c, x) => deadlineOf(x));
  for (let x = 0; x < cards.length; x++) if (dl[x] < INF && E[x] >= dl[x]) return false;
  for (let row = 0; row < 3; row++) {
    const rel = [];
    for (let k = 0; k < slotsFree[row]; k++) rel.push(0);
    for (const w of slotsWrong[row]) rel.push(E[w]);
    rel.sort((a, b) => a - b);
    const dls = bases[row].map((x) => dl[x]).filter((d) => d < INF).sort((a, b) => a - b);
    for (let k = 0; k < dls.length; k++) if (k < rel.length && rel[k] >= dls[k]) return false;
  }
  return true;
}

// true = Sieg erreichbar ab Phasenanfang g; ctx.memo ueber Phasenanfaenge.
// ctx.next (Map, optional): Phasenanfang -> naechster Phasenanfang auf dem
// gefundenen Gewinnweg (fuer solvWinPath).
function solvWin(g, ctx) {
  const k = solvKey(g);
  const m = ctx.memo.get(k);
  if (m !== undefined) return m;
  let res = false;
  if (g.isWon()) res = true;
  else if (solvWinCheck(g)) {
    const states = solvEnumerate(g, ctx, false);
    if (states.some((st) => st.g.isWon())) res = true;
    else if (g.stock.length > 0) {
      const kids = states.map((st) => solvDeal(st.g)).filter((h) => solvWinCheck(h));
      // mehr abgelegte Karten zuerst
      kids.sort((a, b) => a.calculateCurrentScore() - b.calculateCurrentScore());
      const win = kids.find((h) => solvWin(h, ctx));
      if (win) { res = true; if (ctx.next) ctx.next.set(k, win); }
    }
  }
  ctx.memo.set(k, res);
  return res;
}

// Zugfolge zum Gewinnweg, den solvWin in ctx.next hinterlassen hat
function solvWinPath(g0, ctx) {
  const path = [];
  const free = { nodes: 0, maxNodes: Infinity, deadline: Infinity };
  let g = g0;
  while (!g.isWon()) {
    const next = ctx.next.get(solvKey(g));
    const states = solvEnumerate(g, free, true);
    if (!next) {
      path.push(...states.find((st) => st.g.isWon()).path);
      break;
    }
    const nk = solvKey(next);
    path.push(...states.find((st) => solvKey(solvDeal(st.g)) === nk).path, { type: "deal_stock" });
    g = next;
  }
  return path;
}
// Zuege mit der bewegten Karte ergaenzen (wie pimcMoves, fuer das Replay)
function solvAnnotate(dealOrder, moves) {
  const g = GallerySolitaire.fromDealOrder(dealOrder);
  return moves.map((m) => {
    const card = m.type === "move_card" ? peekCardAt(g, m.from) : null;
    g.executeMove(m, { undoable: false });
    return card ? Object.assign({}, m, { card }) : Object.assign({}, m);
  });
}

function solvRollout(g, rng) {
  const moves = [];
  while (moves.length < 300) {
    const a = greedyChooseMove(g, rng);
    if (!a) break;
    g.executeMove(a, { undoable: false });
    moves.push(a);
  }
  return { score: g.calculateCurrentScore(), moves };
}
// bester gefundener Score und die Zugfolge dazu; bei Zeitablauf das Beste bis dahin
function solvBeam(g0, B, K, deadline) {
  let best = 97, bestPath = null;
  const note = (v, p) => { if (v < best) { best = v; bestPath = p; } };
  let beam = [{ g: g0, path: [] }];
  try {
    while (beam.length && best > 0) {
      const cand = new Map();
      for (const b of beam) {
        const ctx = { nodes: 0, maxNodes: PHASE_MAX_STATES, deadline };
        let states;
        try { states = solvEnumerate(b.g, ctx, true, b.path); } catch (e) {
          if (e !== PHASE_ABORT || Date.now() > deadline) throw e;
          states = [{ g: b.g, path: b.path }];
        }
        if (b.g.stock.length === 0) { for (const st of states) note(st.g.calculateCurrentScore(), st.path); continue; }
        for (const st of states) {
          const h = solvDeal(st.g);
          const k = solvKey(h);
          if (cand.has(k)) continue;
          const path = st.path.concat([{ type: "deal_stock" }]);
          let v = 97;
          for (let i = 0; i < K; i++) {
            const r = solvRollout(phaseClone(h), mulberry32(i * 7919 + 1));
            v = Math.min(v, r.score);
            note(r.score, path.concat(r.moves));
          }
          cand.set(k, { g: h, path, v, sc: h.calculateCurrentScore() });
        }
        if (Date.now() > deadline) throw PHASE_ABORT;
      }
      beam = [...cand.values()].sort((a, b) => a.v - b.v || a.sc - b.sc).slice(0, B);
    }
  } catch (e) {
    if (e !== PHASE_ABORT) throw e;
  }
  return { score: best, path: bestPath };
}

// opts: { timeMs, searchMs, beamFrom, maxNodes }
//   -> { solvable: 1 ja | 0 nein | -1 eventuell, solveMs, solveVia, solveMoves, beamIdx }
// beamFrom: erst ab dieser Strahlsuche (Index in SOLVE_BEAMS) - fuer eine verlaengerte Pruefung,
// die dort weitermacht, wo die vorige abgebrochen hat (beamIdx = zuletzt laufende Strahlsuche)
// solveMoves: bei einem Sieg die Gewinn-Zugfolge (per replayMoves geprueft, mit Karten wie pimcMoves)
// solveVia: "beam" | "search" (Sieg gefunden), "check" | "search" (unloesbar), "timeout" | "exhausted" (eventuell)
function checkSolvable(dealOrder, opts) {
  opts = opts || {};
  const t0 = Date.now();
  const timeMs = opts.timeMs || SOLVE_MS;
  const deadline = t0 + timeMs;
  let beamIdx = opts.beamFrom || 0;
  const done = (solvable, solveVia, moves) =>
    ({ solvable, solveVia, solveMs: Date.now() - t0, solveMoves: moves ? solvAnnotate(dealOrder, moves) : null, beamIdx });
  const g = GallerySolitaire.fromDealOrder(dealOrder);
  if (!solvWinCheck(g, true)) return done(0, "check");
  // Tiefensuche findet Siege schnell oder gar nicht -> zuerst, mit kurzem Limit
  const ctx = { nodes: 0, maxNodes: opts.maxNodes || Infinity, deadline: t0 + (opts.searchMs || Math.min(timeMs * SOLVE_SEARCH_SHARE, SOLVE_SEARCH_MAX_MS)), memo: new Map(), next: new Map() };
  try {
    if (!solvWin(g, ctx)) return done(0, "search");
    const path = solvWinPath(g, ctx);
    if (replayMoves(dealOrder, path) === 0) return done(1, "search", path);
    return done(1, "search"); // sollte nicht vorkommen: Sieg bewiesen, Weg nicht nachspielbar
  } catch (e) {
    if (e !== PHASE_ABORT) throw e;
  }
  // danach Strahlsuche, erst schmal und schnell, dann breiter bis zum Zeitlimit
  // beamIdx bleibt bei Zeitablauf auf der unterbrochenen Strahlsuche stehen
  while (beamIdx < SOLVE_BEAMS.length && Date.now() <= deadline) {
    const [B, K] = SOLVE_BEAMS[beamIdx];
    const bm = solvBeam(g, B, K, deadline);
    if (bm.score === 0 && replayMoves(dealOrder, bm.path) === 0) return done(1, "beam", bm.path);
    if (Date.now() > deadline) break;
    beamIdx++;
  }
  if (beamIdx >= SOLVE_BEAMS.length) return done(-1, "exhausted"); // alle Strahlsuchen durch, keine weitere Pruefung sinnvoll
  return done(-1, "timeout");
}

if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof window === "undefined") {
  self.onmessage = function (e) {
    const { dealOrder, n = 1000, alpha = 0.01, pimc, solve } = e.data || {};
    if (solve) {
      try {
        self.postMessage(Object.assign({ type: "solved", dealOrder: dealOrder }, checkSolvable(dealOrder, solve)));
      } catch (err) {
        self.postMessage({ type: "error", message: err.message, dealOrder: dealOrder });
      }
      return;
    }
    try {
      const result = pimc
        ? runFullEvaluation(dealOrder, n, alpha, pimc, (done, total) => {
            self.postMessage({ type: "progress", done, total, dealOrder });
          })
        : runEvaluation(dealOrder, n, alpha, (done, total) => {
            self.postMessage({ type: "progress", done, total, dealOrder });
          });
      self.postMessage(Object.assign({ type: "done", dealOrder: dealOrder }, result));
    } catch (err) {
      self.postMessage({ type: "error", message: err.message, dealOrder: dealOrder });
    }
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    GallerySolitaire, runEvaluation, playOneRandomGame, mulberry32,
    runFullEvaluation, playOnePimcGame, pimcChooseMove, greedyChooseMove,
    peekCardAt, replayMoves,
    determinize, rolloutScore, uselessCompletionPenalty,
    checkSolvable, solvWinCheck, solvWin, solvBeam, solvEnumerate, solvKey, PHASE_ABORT,
  };
}
