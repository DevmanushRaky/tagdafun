// Sher aur Bakri: rules and the computer player. No UI here.
// The board is an n×n lattice of points (n is odd, so there is a centre point and a centre row).
// Every point links to its orthogonal neighbours; points where (row + col) is even also link
// diagonally, as on the traditional board.
//
// Start, Medium and Hard: five bakri stand on the centre point and the four points around it, and the sher
// wait on the centre row, one at each end. The rest of the bakri enter one at a time, next to a bakri
// already on the board, so the herd spreads out from the middle and takes the board.
// Start, Easy: all 16 bakri are on the board from the first move, four to a "ghar" on each of the four
// points that make the corners of the middle four squares, as pieces sit at home in Ludo. A sher can jump
// a stack and takes one bakri from it.

export type Side = 'bakri' | 'sher';
export type Cell = 0 | 1 | 2;   // empty, bakri, sher
export const EMPTY = 0;
export const BAKRI = 1;
export const SHER = 2;

export type Difficulty = 'easy' | 'hard';

/** Bakri standing on the board before the first move on the plus-shaped start: the centre point and its four neighbours. */
export const START_BAKRI = 5;

export interface Setup {
  n: number;            // points per side, odd
  sher: number;         // 2 stand on the centre row; 4 also take the top and bottom of the centre column
  bakri: number;        // bakri in total, the first START_BAKRI already on the board
  minBakri: number;     // fewest bakri that can still block the sher: the sher win once fewer are left
  aiDepth: number;      // how far ahead the computer looks
  aiRandom: number;     // chance it plays a random move instead (makes Easy beatable)
  homes?: boolean;      // true: every bakri starts at home, in equal stacks on four points
}

/** Bakri already on the board at the start; the rest are placed one at a time. */
export const startingBakri = (s: Setup) => (s.homes ? s.bakri : START_BAKRI);

// Tuned by simulating a decent player (3 moves ahead) against the computer on both sides.
export const SETUPS: Record<Difficulty, Setup> = {
  easy:   { n: 5, sher: 1, bakri: 16, minBakri: 7, aiDepth: 1, aiRandom: 0.3, homes: true },
  hard:   { n: 5, sher: 2, bakri: 20, minBakri: 9, aiDepth: 3, aiRandom: 0, homes: true },
};

/** Bakri the sher must hunt before too few are left to block them. */
export const huntGoal = (s: Setup) => s.bakri - s.minBakri + 1;

export interface Move {
  kind: 'place' | 'move' | 'jump';
  from: number;         // -1 for a placement
  to: number;
  over: number;         // the bakri jumped over, -1 otherwise
}

export interface Board {
  n: number;
  cells: Cell[];
  count: number[];      // bakri on each point (0 unless the point holds bakri)
  turn: Side;
  toPlace: number;
  captured: number;
  setup: Setup;
}

export type Result = { winner: Side; reason: 'captured' | 'trapped' } | null;

// ── Geometry ────────────────────────────────────────────────────────────────
const linkCache = new Map<number, { dirs: [number, number][]; links: number[][] }>();

/** For each point, the directions it has lines in, as [dr, dc]. */
function geometry(n: number) {
  let g = linkCache.get(n);
  if (g) return g;
  const all: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  const links: number[][] = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const out: number[] = [];
    for (let d = 0; d < all.length; d++) {
      const [dr, dc] = all[d];
      if (dr !== 0 && dc !== 0 && (r + c) % 2 !== 0) continue;   // diagonals only from even points
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) out.push(d);
    }
    links.push(out);
  }
  g = { dirs: all, links };
  linkCache.set(n, g);
  return g;
}

const step = (n: number, i: number, [dr, dc]: [number, number]) => {
  const r = Math.floor(i / n) + dr;
  const c = (i % n) + dc;
  return r >= 0 && r < n && c >= 0 && c < n ? r * n + c : -1;
};

/** Every line segment on the board, for drawing. */
export function boardLines(n: number): [number, number][] {
  const { dirs, links } = geometry(n);
  const out: [number, number][] = [];
  for (let i = 0; i < n * n; i++) {
    for (const d of links[i]) {
      const j = step(n, i, dirs[d]);
      if (j > i) out.push([i, j]);
    }
  }
  return out;
}

// ── Setup ───────────────────────────────────────────────────────────────────
/** The centre point and the four points around it. */
function bakriStarts(n: number): number[] {
  const m = (n - 1) / 2;
  const mid = m * n + m;
  return [mid, mid - n, mid + n, mid - 1, mid + 1];
}

/** The corners of the middle four squares: where the four homes stand on the Easy board. */
function homePoints(n: number): number[] {
  const m = (n - 1) / 2;
  return [(m - 1) * n + m - 1, (m - 1) * n + m + 1, (m + 1) * n + m - 1, (m + 1) * n + m + 1];
}

/** Sher start on the centre row, one at each end (one sher: the left end; three: also the top of the centre column; four: also the bottom). */
function sherStarts(n: number, count: number): number[] {
  const m = (n - 1) / 2;
  const row = count === 1 ? [m * n] : [m * n, m * n + n - 1];
  if (count >= 4) return [...row, m, (n - 1) * n + m];
  return count === 3 ? [...row, m] : row;
}

export function newBoard(difficulty: Difficulty): Board {
  const setup = SETUPS[difficulty];
  const cells: Cell[] = Array(setup.n * setup.n).fill(EMPTY);
  const count: number[] = Array(setup.n * setup.n).fill(0);
  if (setup.homes) {
    const homes = homePoints(setup.n);
    for (const i of homes) { cells[i] = BAKRI; count[i] = setup.bakri / homes.length; }
  } else {
    for (const i of bakriStarts(setup.n)) { cells[i] = BAKRI; count[i] = 1; }
  }
  for (const i of sherStarts(setup.n, setup.sher)) cells[i] = SHER;
  return { n: setup.n, cells, count, turn: 'bakri', toPlace: setup.bakri - startingBakri(setup), captured: 0, setup };
}

// ── Moves ───────────────────────────────────────────────────────────────────
export function legalMoves(b: Board): Move[] {
  const { dirs, links } = geometry(b.n);
  const moves: Move[] = [];
  if (b.turn === 'bakri') {
    if (b.toPlace > 0) {
      // A new bakri enters beside one already on the board, so the herd grows outward from the centre.
      const open = new Set<number>();
      for (let i = 0; i < b.cells.length; i++) {
        if (b.cells[i] !== BAKRI) continue;
        for (const d of links[i]) {
          const j = step(b.n, i, dirs[d]);
          if (b.cells[j] === EMPTY) open.add(j);
        }
      }
      for (const j of open) moves.push({ kind: 'place', from: -1, to: j, over: -1 });
      if (moves.length > 0) return moves;
      // Hemmed in with no free point beside the herd: move a bakri instead.
    }
    for (let i = 0; i < b.cells.length; i++) {
      if (b.cells[i] !== BAKRI) continue;
      for (const d of links[i]) {
        const j = step(b.n, i, dirs[d]);
        if (b.cells[j] === EMPTY) {
          moves.push({ kind: 'move', from: i, to: j, over: -1 });
        }
      }
    }
    return moves;
  }
  for (let i = 0; i < b.cells.length; i++) {
    if (b.cells[i] !== SHER) continue;
    for (const d of links[i]) {
      const j = step(b.n, i, dirs[d]);
      if (b.cells[j] === EMPTY) {
        moves.push({ kind: 'move', from: i, to: j, over: -1 });
      } else if (b.cells[j] === BAKRI && links[j].includes(d)) {
        // Jump along the same line: the bakri's point must continue the line too.
        const k = step(b.n, j, dirs[d]);
        if (k >= 0 && b.cells[k] === EMPTY) moves.push({ kind: 'jump', from: i, to: k, over: j });
      }
    }
  }
  return moves;
}

export function apply(b: Board, m: Move): Board {
  const cells = b.cells.slice() as Cell[];
  const count = b.count.slice();
  let { toPlace, captured } = b;
  if (m.kind === 'place') {
    cells[m.to] = BAKRI;
    count[m.to] = 1;
    toPlace -= 1;
  } else if (cells[m.from] === BAKRI) {
    // One bakri steps off its point; the rest of a stack stay.
    count[m.from] -= 1;
    if (count[m.from] === 0) cells[m.from] = EMPTY;
    cells[m.to] = BAKRI;
    count[m.to] += 1;
  } else {
    cells[m.to] = cells[m.from];
    cells[m.from] = EMPTY;
    if (m.kind === 'jump') {
      // The sher takes one bakri; the rest of a stack stay where they are.
      count[m.over] -= 1;
      if (count[m.over] === 0) cells[m.over] = EMPTY;
      captured += 1;
    }
  }
  return { ...b, cells, count, toPlace, captured, turn: b.turn === 'bakri' ? 'sher' : 'bakri' };
}

export function result(b: Board): Result {
  if (b.captured >= huntGoal(b.setup)) return { winner: 'sher', reason: 'captured' };
  if (b.turn === 'sher' && legalMoves(b).length === 0) return { winner: 'bakri', reason: 'trapped' };
  if (b.turn === 'bakri' && legalMoves(b).length === 0) return { winner: 'sher', reason: 'trapped' };
  return null;
}

/** Bakri a sher could take on its next move: what the UI warns about. */
export function threatened(b: Board): Set<number> {
  const asSher = b.turn === 'sher' ? b : { ...b, turn: 'sher' as Side };
  return new Set(legalMoves(asSher).filter(m => m.kind === 'jump').map(m => m.over));
}

// ── Computer player ─────────────────────────────────────────────────────────
/** Positive is good for the sher. */
function evaluate(b: Board): number {
  const r = result(b);
  if (r) return r.winner === 'sher' ? 10000 : -10000;
  const asSher = b.turn === 'sher' ? b : { ...b, turn: 'sher' as Side };
  const sherMoves = legalMoves(asSher);
  const jumps = sherMoves.filter(m => m.kind === 'jump').length;
  // Trapped sher are what the bakri aim for: count sher that can't move at all.
  const movable = new Set(sherMoves.map(m => m.from)).size;
  const stuck = b.setup.sher - movable;
  // A bakri left open to a jump is nearly as bad as a lost one.
  return b.captured * 400 + jumps * 170 + sherMoves.length * 30 - stuck * 200;
}

function search(b: Board, depth: number, alpha: number, beta: number): number {
  const r = result(b);
  if (depth === 0 || r) return evaluate(b) + (r ? Math.sign(evaluate(b)) * depth : 0);
  const moves = legalMoves(b);
  if (b.turn === 'sher') {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(apply(b, m), depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    best = Math.min(best, search(apply(b, m), depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

/** The computer's move for whoever's turn it is. */
export function bestMove(b: Board): Move | null {
  const moves = legalMoves(b);
  if (moves.length === 0) return null;
  if (Math.random() < b.setup.aiRandom) return moves[Math.floor(Math.random() * moves.length)];
  // Jumps first, so alpha-beta prunes more.
  moves.sort((a, c) => (c.kind === 'jump' ? 1 : 0) - (a.kind === 'jump' ? 1 : 0));
  const sherTurn = b.turn === 'sher';
  let best: Move[] = [];
  let bestScore = sherTurn ? -Infinity : Infinity;
  for (const m of moves) {
    const s = search(apply(b, m), b.setup.aiDepth - 1, -Infinity, Infinity);
    if ((sherTurn && s > bestScore) || (!sherTurn && s < bestScore)) { bestScore = s; best = [m]; }
    else if (s === bestScore) best.push(m);
  }
  return best[Math.floor(Math.random() * best.length)];
}

/** Stars for a win: bakri lost (playing bakri) or how quickly the sher won (playing sher). */
export function sherBakriStars(side: Side, b: Board, sherMoves: number): 1 | 2 | 3 {
  if (side === 'bakri') return b.captured === 0 ? 3 : b.captured <= 1 ? 2 : 1;
  const quick = b.setup.bakri + 6;
  return sherMoves <= quick ? 3 : sherMoves <= quick * 1.6 ? 2 : 1;
}
