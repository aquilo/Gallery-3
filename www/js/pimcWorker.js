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

function pimcChooseMove(game, rng, numSamples, maxRolloutMoves) {
  const candidates = game.getLegalMoves();
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  let best = null;
  let bestMean = Infinity;
  for (const action of candidates) {
    let total = 0;
    for (let i = 0; i < numSamples; i++) {
      const hypothesis = determinize(game, rng);
      hypothesis.executeMove(action, { undoable: false });
      total += rolloutScore(hypothesis, rng, maxRolloutMoves);
    }
    const mean = total / numSamples + uselessCompletionPenalty(game, action);
    if (mean < bestMean) {
      bestMean = mean;
      best = action;
    }
  }
  return best;
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
  let guard = 0;
  while (guard++ < 300) {
    const action = pimcChooseMove(game, rng, numSamples, maxRolloutMoves);
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

  return { score, moves, movesVerified };
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
  });
}

if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof window === "undefined") {
  self.onmessage = function (e) {
    const { dealOrder, n = 1000, alpha = 0.01, pimc } = e.data || {};
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
  };
}
