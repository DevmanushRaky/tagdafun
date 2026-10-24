// Pure logic for the Water Sorting puzzle — no React Native imports, so this
// module can be unit-tested with plain Node.

export interface WaterColor {
  name: string;
  hex: string;
  /** Text glyph drawn on each layer so colors stay distinct for color-blind users. */
  symbol: string;
}

export const WATER_COLORS: WaterColor[] = [
  { name: 'Red',    hex: '#E74C3C', symbol: '●' },
  { name: 'Blue',   hex: '#1E90FF', symbol: '▲' },
  { name: 'Green',  hex: '#2ED573', symbol: '■' },
  { name: 'Yellow', hex: '#F0A500', symbol: '★' },
  { name: 'Purple', hex: '#A55EEA', symbol: '♥' },
  { name: 'Orange', hex: '#FF6B00', symbol: '◆' },
  { name: 'Pink',   hex: '#FF6B81', symbol: '✚' },
  { name: 'Teal',   hex: '#00B4D8', symbol: '◉' },
  { name: 'Lime',   hex: '#9BDB3B', symbol: '▼' },
  { name: 'Brown',  hex: '#8D5A2B', symbol: '✦' },
];

export const BOTTLE_CAPACITY = 4;
export const START_COLORS = 3;
export const MAX_COLORS = 10;
export const EMPTY_BOTTLES = 2;

/** Bottles of color indices, each ordered bottom -> top. */
export type Bottles = number[][];

/** +1 color per level up to 8 (level 6), then +1 every 3 levels up to MAX_COLORS (level 12). */
export const colorsForLevel = (level: number): number => {
  const lv = Math.max(1, level);
  if (lv <= 6) return START_COLORS + lv - 1;
  return Math.min(8 + Math.floor((lv - 6) / 3), MAX_COLORS);
};

export interface Difficulty {
  name: string;
  color: string;
}

export function difficultyForLevel(level: number): Difficulty {
  if (level <= 3) return { name: 'Easy', color: '#2ED573' };
  if (level <= 8) return { name: 'Medium', color: '#1E90FF' };
  if (level <= 14) return { name: 'Hard', color: '#F0A500' };
  if (level <= 24) return { name: 'Expert', color: '#E74C3C' };
  return { name: 'Master', color: '#A55EEA' };
}

export const bottleCountForLevel = (level: number): number =>
  colorsForLevel(level) + EMPTY_BOTTLES;

export const cloneBottles = (bottles: Bottles): Bottles => bottles.map(b => [...b]);

/** Same-color run sitting on top of a bottle (null when empty). */
export function topRun(bottle: number[]): { color: number; count: number } | null {
  if (bottle.length === 0) return null;
  const color = bottle[bottle.length - 1];
  let count = 1;
  for (let i = bottle.length - 2; i >= 0 && bottle[i] === color; i--) count++;
  return { color, count };
}

export function isCompleteBottle(bottle: number[]): boolean {
  if (bottle.length !== BOTTLE_CAPACITY) return false;
  return bottle.every(c => c === bottle[0]);
}

export interface PourMove {
  from: number;
  to: number;
  count: number;
}

/**
 * Units that would move for a pour, or 0 when illegal: empty source, full or
 * mismatched target. Pouring a finished bottle into an empty one is also
 * rejected — it can never help and only wastes a move.
 */
export function pourAmount(bottles: Bottles, from: number, to: number): number {
  if (from === to) return 0;
  const src = bottles[from];
  const dst = bottles[to];
  if (!src || !dst || src.length === 0) return 0;
  const space = BOTTLE_CAPACITY - dst.length;
  if (space <= 0) return 0;
  const run = topRun(src);
  if (!run) return 0;
  if (dst.length > 0 && dst[dst.length - 1] !== run.color) return 0;
  if (dst.length === 0 && isCompleteBottle(src)) return 0;
  return Math.min(run.count, space);
}

export function legalMoves(bottles: Bottles): PourMove[] {
  const moves: PourMove[] = [];
  for (let from = 0; from < bottles.length; from++) {
    for (let to = 0; to < bottles.length; to++) {
      const count = pourAmount(bottles, from, to);
      if (count > 0) moves.push({ from, to, count });
    }
  }
  // Prefer stacking onto a matching color — better hints, faster solver.
  moves.sort((a, b) => Number(bottles[b.to].length > 0) - Number(bottles[a.to].length > 0));
  return moves;
}

export function applyPour(bottles: Bottles, move: PourMove): Bottles {
  const next = cloneBottles(bottles);
  for (let i = 0; i < move.count; i++) {
    const unit = next[move.from].pop();
    if (unit === undefined) break;
    next[move.to].push(unit);
  }
  return next;
}

export function isSolved(bottles: Bottles): boolean {
  return bottles.every(b => b.length === 0 || isCompleteBottle(b));
}

function stateKey(bottles: Bottles): string {
  return bottles.map(b => b.join(',')).join('|');
}

export interface SolveResult {
  solvable: boolean;
  moves: PourMove[];
  nodes: number;
}

/**
 * Bounded breadth-first search. Returns the SHORTEST solution when one is
 * found inside maxNodes; otherwise solvable=false (a solution may still exist
 * beyond the budget — callers must treat that as "unknown", not unsolvable).
 */
export function solveBounded(initial: Bottles, maxNodes = 40000): SolveResult {
  if (isSolved(initial)) return { solvable: true, moves: [], nodes: 1 };
  const visited = new Set<string>([stateKey(initial)]);
  // Parent-pointer queue (head index, no shift) to stay fast and lean.
  const states: Bottles[] = [initial];
  const parents: number[] = [-1];
  const via: (PourMove | null)[] = [null];
  let head = 0;
  let nodes = 1;
  while (head < states.length) {
    const state = states[head];
    for (const move of legalMoves(state)) {
      const next = applyPour(state, move);
      const key = stateKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      nodes++;
      states.push(next);
      parents.push(head);
      via.push(move);
      if (isSolved(next)) {
        const path: PourMove[] = [];
        let idx = states.length - 1;
        while (via[idx]) {
          path.unshift(via[idx] as PourMove);
          idx = parents[idx];
        }
        return { solvable: true, moves: path, nodes };
      }
      if (nodes >= maxNodes) return { solvable: false, moves: [], nodes };
    }
    head++;
  }
  return { solvable: false, moves: [], nodes };
}

/** Order-independent state key: bottles that hold the same contents are interchangeable. */
function canonicalKey(bottles: Bottles): string {
  return bottles.map(b => b.join(',')).sort().join('|');
}

/** Lower-bound-ish estimate of pours left: units sitting above a bottle's bottom color run. */
function remainingEstimate(bottles: Bottles): number {
  let h = 0;
  for (const b of bottles) {
    if (b.length === 0) continue;
    let run = 1;
    while (run < b.length && b[run] === b[0]) run++;
    // Everything above the bottom run must move at least once; mixed bottles need a second hop.
    if (run < b.length) h += b.length - run;
  }
  return h;
}

/**
 * Weighted A* search: finds a good (not always shortest) solution on boards too
 * big for plain BFS. Used for par on large levels and for hints.
 */
export function solveGood(initial: Bottles, maxNodes = 12000, weight = 2): SolveResult {
  if (isSolved(initial)) return { solvable: true, moves: [], nodes: 1 };

  const states: Bottles[] = [initial];
  const parents: number[] = [-1];
  const via: (PourMove | null)[] = [null];
  const depth: number[] = [0];
  const seen = new Set<string>([canonicalKey(initial)]);

  // Binary min-heap of [priority, stateIndex].
  const heap: [number, number][] = [[weight * remainingEstimate(initial), 0]];
  const push = (item: [number, number]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop() as [number, number];
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };

  let expanded = 0;
  while (heap.length > 0 && expanded < maxNodes) {
    const [, idx] = pop();
    expanded++;
    const state = states[idx];
    for (const move of legalMoves(state)) {
      const next = applyPour(state, move);
      const key = canonicalKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      states.push(next);
      parents.push(idx);
      via.push(move);
      const d = depth[idx] + 1;
      depth.push(d);
      const ni = states.length - 1;
      if (isSolved(next)) {
        const path: PourMove[] = [];
        for (let i = ni; via[i]; i = parents[i]) path.unshift(via[i] as PourMove);
        return { solvable: true, moves: path, nodes: states.length };
      }
      push([d + weight * remainingEstimate(next), ni]);
    }
  }
  return { solvable: false, moves: [], nodes: states.length };
}

export interface GeneratedLevel {
  bottles: Bottles;
  /** Move count of the solver's solution (within ~1 of the true best). */
  par: number;
}

/** Deterministic mixed puzzle used only if random scrambling keeps failing. */
function fallbackLevel(colors: number, total: number): GeneratedLevel {
  const bottles: Bottles = Array.from({ length: total }, () => [] as number[]);
  for (let i = 0; i < colors; i++) {
    bottles[i] = [i, (i + 1) % colors, (i + 2) % colors, (i + 3) % colors];
  }
  let par = colors * 6;
  const sol = solveGood(bottles);
  if (sol.solvable && sol.moves.length > 0) par = sol.moves.length;
  return { bottles, par: Math.max(4, par) };
}

/** Fully shuffled board: every color's units spread randomly over the filled bottles. */
export function randomBoard(colors: number, total: number): Bottles {
  const units: number[] = [];
  for (let c = 0; c < colors; c++) for (let k = 0; k < BOTTLE_CAPACITY; k++) units.push(c);
  for (let i = units.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [units[i], units[j]] = [units[j], units[i]];
  }
  return Array.from({ length: total }, (_, i) =>
    i < colors ? units.slice(i * BOTTLE_CAPACITY, (i + 1) * BOTTLE_CAPACITY) : []
  );
}

/** Adjacent same-color pairs: higher = more pre-grouped = easier to sort. */
function groupedScore(bottles: Bottles): number {
  let score = 0;
  for (const b of bottles) for (let i = 1; i < b.length; i++) if (b[i] === b[i - 1]) score++;
  return score;
}

/**
 * Level generator. Difficulty scales with the level in two ways: more colors
 * (colorsForLevel) and how tangled the board is. Several shuffled boards are
 * drawn and ranked by how pre-grouped they are; early levels take an easy one,
 * later levels (up to level ~31) take the most tangled one.
 */
export function generateLevel(level: number): GeneratedLevel {
  const colors = colorsForLevel(level);
  const total = bottleCountForLevel(level);
  const hardness = Math.min(1, Math.max(0, (level - 1) / 30));

  const candidates: { bottles: Bottles; score: number }[] = [];
  for (let attempt = 0; attempt < 60 && candidates.length < 8; attempt++) {
    const bottles = randomBoard(colors, total);
    if (bottles.some(isCompleteBottle) || isSolved(bottles)) continue;
    candidates.push({ bottles, score: groupedScore(bottles) });
  }
  if (candidates.length === 0) return fallbackLevel(colors, total);

  candidates.sort((x, y) => y.score - x.score); // easiest first
  const pick = Math.round(hardness * (candidates.length - 1));

  // Par = the solver's own solution length, so it is always achievable and
  // never an estimate. Boards the solver cannot finish are skipped.
  for (let k = 0; k < candidates.length; k++) {
    const cand = candidates[(pick + k) % candidates.length];
    const sol = solveGood(cand.bottles);
    if (sol.solvable && sol.moves.length > 0) return { bottles: cand.bottles, par: sol.moves.length };
  }
  return fallbackLevel(colors, total);
}

/** Best next move: first step of a short solution, else any sensible pour. */
export function suggestHint(bottles: Bottles): PourMove | null {
  const sol = solveGood(bottles);
  if (sol.solvable && sol.moves.length > 0) return sol.moves[0];
  const moves = legalMoves(bottles);
  return moves.length > 0 ? moves[0] : null;
}

/** Stars for a cleared level: 3★ within 20% over par, 2★ within 60%, otherwise 1★. */
export function waterStars(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= Math.ceil(par * 1.2)) return 3;
  if (moves <= Math.ceil(par * 1.6)) return 2;
  return 1;
}
