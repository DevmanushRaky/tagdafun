// Tic-Tac-Toe: rules and the computer player. No UI here.

export type Mark = 'X' | 'O';
export type Cell = Mark | null;

export const LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const other = (m: Mark): Mark => (m === 'X' ? 'O' : 'X');

export interface Win { mark: Mark; line: [number, number, number] }

export function winnerOf(cells: Cell[]): Win | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return { mark: cells[a] as Mark, line };
  }
  return null;
}

export const isFull = (cells: Cell[]) => cells.every(c => c !== null);

/** Score for `me` with `turn` to play: +1 win, 0 draw, -1 loss, preferring quicker wins and slower losses. */
function minimax(cells: Cell[], turn: Mark, me: Mark, depth: number): number {
  const w = winnerOf(cells);
  if (w) return w.mark === me ? 10 - depth : depth - 10;
  if (isFull(cells)) return 0;
  let best = turn === me ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (cells[i]) continue;
    cells[i] = turn;
    const s = minimax(cells, other(turn), me, depth + 1);
    cells[i] = null;
    best = turn === me ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}

/** Chance the computer plays a random square instead of the best one, so it can be beaten. */
export const SLIP_CHANCE = 0.25;

/**
 * The computer's square. Mostly perfect play, but sometimes a random slip,
 * so a careful player can win. There are no levels.
 */
export function computerMove(cells: Cell[], me: Mark): number {
  const open: number[] = [];
  for (let i = 0; i < 9; i++) if (!cells[i]) open.push(i);
  if (Math.random() < SLIP_CHANCE) return open[Math.floor(Math.random() * open.length)];
  const work = cells.slice();
  let best: number[] = [];
  let bestScore = -Infinity;
  for (const i of open) {
    work[i] = me;
    const s = minimax(work, other(me), me, 1);
    work[i] = null;
    if (s > bestScore) { bestScore = s; best = [i]; }
    else if (s === bestScore) best.push(i);
  }
  return best[Math.floor(Math.random() * best.length)];
}
