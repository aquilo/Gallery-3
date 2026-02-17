
// MoveStack -------------------------------------------------------------

class MoveStack {

  constructor(nMax) {
    this.moves = new Array(nMax);
    this.nMoves = 0;
  }

  push(move) {
    this.moves[this.nMoves] = move;
    this.nMoves++;
  }

  peek() {
    if (this.empty()) return null;
    return this.moves[this.nMoves - 1];
  }

  elementAt(ix) {
    if (this.empty()) return null;
    return this.moves[ix];
  }

  setElementAt(move, ix) {
    this.moves[ix] = move;
  }

  pop() {
    if (this.empty()) return null;
    else {
      this.nMoves--;
      return this.moves[this.nMoves];
    }
  }

  empty() {
    return this.nMoves == 0;
  }

  clear() {
    this.nMoves = 0;
  }

  print() {
    for (let i=0; i < this.nMoves; i++) {
      My.print(i + ". " + this.elementAt(i).toString());
    }
    My.print();
  }
}

// Move -------------------------------------------------------------

class Move {
  // CardPile from, to;
  // boolean auto;
  constructor(from, to, auto) {
    this.from = from;
    this.to = to;
    this.auto = auto;
  }

  toString() {
    return this.from.id + " " + this.from.toString() + " > " + this.to.toString() + " " + this.auto;
  }

  toString2() {
    return this.from.id + " " + this.from.base + " > " + this.to.kind + " " + this.from.peek().toString();
  }
}
