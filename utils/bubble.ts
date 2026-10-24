// Bubble Shooter: rules and simulation, no drawing. Canvas pixels, y grows downward.
// The grid is hexagonal in "offset rows": odd rows sit half a bubble to the right and hold one
// bubble fewer. Updates are scaled by dt, so play is the same at any frame rate.

export interface Vec { x: number; y: number }

/** Special shots: not real colours, never left on the board. */
export const BOMB = -1;      // blasts every bubble around where it lands
export const RAINBOW = -2;   // takes the colour of the biggest neighbouring group

export interface Shot { pos: Vec; vel: Vec; color: number }

/** A bubble leaving the board: popped (bursts in place) or dropped (falls away). */
export interface Leaving { pos: Vec; vel: Vec; color: number; t: number; kind: 'pop' | 'drop' }

export interface BubbleLevel {
  rows: number;          // rows filled at the start
  colors: number;        // distinct colours in play
  missesPerDrop: number; // shots without a pop before the ceiling comes down a row
}

export interface BubbleGame {
  w: number;
  h: number;
  level: number;
  spec: BubbleLevel;
  cols: number;
  r: number;             // bubble radius
  rowH: number;          // vertical distance between rows
  grid: (number | null)[][];   // [row][col] colour index, or null
  ceiling: number;       // rows the ceiling has come down
  misses: number;        // shots since the last pop
  current: number;
  next: number;
  shot: Shot | null;
  leaving: Leaving[];
  shooter: Vec;
  loseY: number;         // a bubble's bottom edge below this line ends the game
  shots: number;
  drops: number;         // times the ceiling came down
  score: number;
  streak: number;        // shots in a row that popped something
  over: boolean;
  won: boolean;
}

export type BubbleEvent =
  | { type: 'stick'; row: number; col: number }
  | { type: 'pop'; count: number; dropped: number; points: number; combo: number }
  | { type: 'bomb'; count: number; dropped: number; points: number }
  | { type: 'special'; kind: 'bomb' | 'rainbow' }
  | { type: 'ceiling' }
  | { type: 'won' }
  | { type: 'lost' };

export const COLS = 9;
export const MAX_ROWS = 14;
const SHOT_SPEED = 1100;   // px/s
const MIN_ANGLE = 12;      // degrees above horizontal the aim is clamped to
const MAX_START_CLUMP = 4;
const POP_POINTS = 10;
const DROP_POINTS = 20;
const BOMB_AT = 6;          // bubbles cleared by one shot that earn a bomb
const RAINBOW_STREAK = 3;   // popping shots in a row that earn a rainbow
const BOMB_RADIUS = 2.15;   // in bubble diameters

export function specForLevel(level: number): BubbleLevel {
  const lv = Math.max(1, level);
  return {
    rows: Math.min(4 + Math.floor(lv / 4), 8),
    colors: Math.min(3 + Math.floor((lv - 1) / 4), 6),
    missesPerDrop: Math.max(4, 7 - Math.floor(lv / 5)),
  };
}

/** Stars for a cleared board: how often the ceiling had to come down. */
export const bubbleStars = (drops: number): 1 | 2 | 3 => (drops <= 1 ? 3 : drops <= 3 ? 2 : 1);

const rowLen = (row: number) => (row % 2 === 0 ? COLS : COLS - 1);
const rand = (n: number) => Math.floor(Math.random() * n);

export function cellCenter(g: BubbleGame, row: number, col: number): Vec {
  return {
    x: g.r + col * g.r * 2 + (row % 2 === 1 ? g.r : 0),
    y: g.r + (row + g.ceiling) * g.rowH,
  };
}

function neighbors(row: number, col: number): [number, number][] {
  const odd = row % 2 === 1;
  const n: [number, number][] = [[row, col - 1], [row, col + 1]];
  if (odd) n.push([row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]);
  else n.push([row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]);
  return n.filter(([r, c]) => r >= 0 && r < MAX_ROWS && c >= 0 && c < rowLen(r));
}

const colorsOnBoard = (g: BubbleGame): number[] => {
  const s = new Set<number>();
  for (const row of g.grid) for (const c of row) if (c !== null) s.add(c);
  return [...s];
};

/** Next colour to load: only colours still on the board, so no shot is useless. */
function pickColor(g: BubbleGame): number {
  const left = colorsOnBoard(g);
  return left.length > 0 ? left[rand(left.length)] : rand(g.spec.colors);
}

export function newGame(level: number, w: number, h: number): BubbleGame {
  const spec = specForLevel(level);
  const r = w / (COLS * 2);
  const g: BubbleGame = {
    w, h, level, spec, cols: COLS, r, rowH: r * Math.sqrt(3),
    grid: Array.from({ length: MAX_ROWS }, (_, row) => Array.from({ length: rowLen(row) }, () => null as number | null)),
    ceiling: 0, misses: 0, current: 0, next: 0, shot: null, leaving: [],
    shooter: { x: w / 2, y: h - r * 1.6 },
    loseY: h - r * 3.4,
    shots: 0, drops: 0, score: 0, streak: 0, over: false, won: false,
  };
  // Fill with small same-colour clumps (so early shots pop something), but never a clump
  // bigger than MAX_START_CLUMP, or one lucky shot would clear half the board.
  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < rowLen(row); col++) {
      const near = neighbors(row, col).map(([nr, nc]) => g.grid[nr][nc]).filter((c): c is number => c !== null);
      const wanted = near.length > 0 && Math.random() < 0.3 ? near[rand(near.length)] : rand(spec.colors);
      const order = [wanted, ...Array.from({ length: spec.colors }, (_, i) => (wanted + 1 + i) % spec.colors)];
      for (const color of order) {
        g.grid[row][col] = color;
        if (sameColorGroup(g, row, col).length <= MAX_START_CLUMP) break;
      }
    }
  }
  g.current = pickColor(g);
  g.next = pickColor(g);
  return g;
}

/** Aim direction from the shooter towards a point, clamped so it always travels upward. */
export function aimFrom(g: BubbleGame, target: Vec): Vec {
  let a = Math.atan2(g.shooter.y - target.y, target.x - g.shooter.x);   // 0 = right, PI/2 = up
  const min = (MIN_ANGLE * Math.PI) / 180;
  a = Math.max(min, Math.min(Math.PI - min, a));
  return { x: Math.cos(a), y: -Math.sin(a) };
}

function hitsBubble(g: BubbleGame, p: Vec): boolean {
  if (p.y - g.r <= g.ceiling * g.rowH) return true;
  for (let row = 0; row < MAX_ROWS; row++) {
    for (let col = 0; col < rowLen(row); col++) {
      if (g.grid[row][col] === null) continue;
      const c = cellCenter(g, row, col);
      if ((c.x - p.x) ** 2 + (c.y - p.y) ** 2 < (g.r * 1.75) ** 2) return true;
    }
  }
  return false;
}

/** The aim line: points along the path, bouncing off the side walls, up to the first contact. */
export function aimPath(g: BubbleGame, dir: Vec, maxBounces = 2): Vec[] {
  const pts: Vec[] = [{ ...g.shooter }];
  const p = { ...g.shooter };
  const d = { ...dir };
  let bounces = 0;
  const stepLen = g.r * 0.5;
  for (let i = 0; i < 400; i++) {
    p.x += d.x * stepLen;
    p.y += d.y * stepLen;
    if (p.x < g.r || p.x > g.w - g.r) {
      p.x = p.x < g.r ? g.r : g.w - g.r;
      d.x = -d.x;
      pts.push({ ...p });
      if (++bounces > maxBounces) return pts;
    }
    if (hitsBubble(g, p)) break;
  }
  pts.push({ ...p });
  return pts;
}

/** Where a shot along this aim path would come to rest, for the ghost-bubble preview. */
export function landingCenter(g: BubbleGame, path: Vec[]): Vec | null {
  const end = path[path.length - 1];
  if (!end || !hitsBubble(g, end)) return null;
  const [row, col] = snapCell(g, end);
  return g.grid[row][col] === null ? cellCenter(g, row, col) : null;
}

export function swap(g: BubbleGame) {
  if (g.shot || g.over) return;
  [g.current, g.next] = [g.next, g.current];
}

export function shoot(g: BubbleGame, dir: Vec): boolean {
  if (g.shot || g.over) return false;
  g.shot = { pos: { ...g.shooter }, vel: { x: dir.x * SHOT_SPEED, y: dir.y * SHOT_SPEED }, color: g.current };
  g.shots += 1;
  g.current = g.next;
  g.next = pickColor(g);
  return true;
}

/** Nearest empty cell to where the shot stopped. */
function snapCell(g: BubbleGame, p: Vec): [number, number] {
  let best: [number, number] = [0, 0];
  let bestD = Infinity;
  const approxRow = Math.round((p.y - g.r) / g.rowH) - g.ceiling;
  for (let row = Math.max(0, approxRow - 2); row <= Math.min(MAX_ROWS - 1, approxRow + 2); row++) {
    for (let col = 0; col < rowLen(row); col++) {
      if (g.grid[row][col] !== null) continue;
      // Only cells touching the top or another bubble; a bubble can't float on its own.
      const supported = row === 0 || neighbors(row, col).some(([nr, nc]) => g.grid[nr][nc] !== null);
      if (!supported) continue;
      const c = cellCenter(g, row, col);
      const dd = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
      if (dd < bestD) { bestD = dd; best = [row, col]; }
    }
  }
  return best;
}

function sameColorGroup(g: BubbleGame, row: number, col: number): [number, number][] {
  const color = g.grid[row][col];
  const seen = new Set<string>([`${row},${col}`]);
  const out: [number, number][] = [];
  const stack: [number, number][] = [[row, col]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    out.push([r, c]);
    for (const [nr, nc] of neighbors(r, c)) {
      const k = `${nr},${nc}`;
      if (!seen.has(k) && g.grid[nr][nc] === color) { seen.add(k); stack.push([nr, nc]); }
    }
  }
  return out;
}

/** Bubbles no longer hanging from the ceiling through other bubbles. */
function floating(g: BubbleGame): [number, number][] {
  const seen = new Set<string>();
  const stack: [number, number][] = [];
  for (let col = 0; col < rowLen(0); col++) if (g.grid[0][col] !== null) { stack.push([0, col]); seen.add(`0,${col}`); }
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [nr, nc] of neighbors(r, c)) {
      const k = `${nr},${nc}`;
      if (!seen.has(k) && g.grid[nr][nc] !== null) { seen.add(k); stack.push([nr, nc]); }
    }
  }
  const out: [number, number][] = [];
  for (let row = 0; row < MAX_ROWS; row++) for (let col = 0; col < rowLen(row); col++) {
    if (g.grid[row][col] !== null && !seen.has(`${row},${col}`)) out.push([row, col]);
  }
  return out;
}

const boardEmpty = (g: BubbleGame) => g.grid.every(row => row.every(c => c === null));

function lowestBottom(g: BubbleGame): number {
  let y = 0;
  for (let row = 0; row < MAX_ROWS; row++) for (let col = 0; col < rowLen(row); col++) {
    if (g.grid[row][col] !== null) y = Math.max(y, cellCenter(g, row, col).y + g.r);
  }
  return y;
}

function settle(g: BubbleGame, events: BubbleEvent[]) {
  const s = g.shot!;
  g.shot = null;
  const [row, col] = snapCell(g, s.pos);
  events.push({ type: 'stick', row, col });

  const popCells = (cells: [number, number][]) => {
    for (const [r, c] of cells) {
      g.leaving.push({ pos: cellCenter(g, r, c), vel: { x: 0, y: 0 }, color: g.grid[r][c]!, t: 0, kind: 'pop' });
      g.grid[r][c] = null;
    }
  };
  const dropLoose = () => {
    const loose = floating(g);
    for (const [r, c] of loose) {
      g.leaving.push({
        pos: cellCenter(g, r, c),
        vel: { x: (Math.random() - 0.5) * 160, y: -60 - Math.random() * 120 },
        color: g.grid[r][c]!, t: 0, kind: 'drop',
      });
      g.grid[r][c] = null;
    }
    return loose.length;
  };
  const earnSpecial = (cleared: number) => {
    if (g.over) return;
    if (cleared >= BOMB_AT) {
      g.next = BOMB;
      events.push({ type: 'special', kind: 'bomb' });
    } else if (g.streak > 0 && g.streak % RAINBOW_STREAK === 0) {
      g.next = RAINBOW;
      events.push({ type: 'special', kind: 'rainbow' });
    }
  };

  let popped = false;
  if (s.color === BOMB) {
    // Everything within the blast goes, whatever its colour.
    const at = cellCenter(g, row, col);
    const hit: [number, number][] = [];
    for (let r = 0; r < MAX_ROWS; r++) for (let c = 0; c < rowLen(r); c++) {
      if (g.grid[r][c] === null) continue;
      const p = cellCenter(g, r, c);
      if ((p.x - at.x) ** 2 + (p.y - at.y) ** 2 <= (BOMB_RADIUS * 2 * g.r) ** 2) hit.push([r, c]);
    }
    popCells(hit);
    const dropped = dropLoose();
    g.streak += 1;
    const points = (hit.length * POP_POINTS + dropped * DROP_POINTS) * Math.min(g.streak, 5);
    g.score += points;
    g.misses = 0;
    popped = true;
    events.push({ type: 'bomb', count: hit.length, dropped, points });
  } else {
    let color = s.color;
    if (color === RAINBOW) {
      // Become whichever neighbouring colour makes the biggest group.
      let best = -1;
      let bestSize = 0;
      for (const [nr, nc] of neighbors(row, col)) {
        const v = g.grid[nr][nc];
        if (v === null) continue;
        g.grid[row][col] = v;
        const size = sameColorGroup(g, row, col).length;
        if (size > bestSize) { bestSize = size; best = v; }
      }
      color = best >= 0 ? best : pickColor(g);
    }
    g.grid[row][col] = color;

    const group = sameColorGroup(g, row, col);
    if (group.length >= 3) {
      popCells(group);
      const dropped = dropLoose();
      g.streak += 1;
      const combo = Math.min(g.streak, 5);
      const points = (group.length * POP_POINTS + dropped * DROP_POINTS) * combo;
      g.score += points;
      g.misses = 0;
      popped = true;
      events.push({ type: 'pop', count: group.length, dropped, points, combo });
      earnSpecial(group.length + dropped);
    }
  }

  if (!popped) {
    g.streak = 0;
    g.misses += 1;
    if (g.misses >= g.spec.missesPerDrop) {
      g.misses = 0;
      g.ceiling += 1;
      g.drops += 1;
      events.push({ type: 'ceiling' });
    }
  }

  if (boardEmpty(g)) {
    g.over = true; g.won = true;
    events.push({ type: 'won' });
  } else if (lowestBottom(g) > g.loseY || row >= MAX_ROWS - 1) {
    g.over = true;
    events.push({ type: 'lost' });
  } else {
    // Keep loaded colours meaningful after the board changed.
    // Specials (negative) are kept; a plain colour that left the board is swapped out.
    const left = colorsOnBoard(g);
    if (g.current >= 0 && !left.includes(g.current)) g.current = pickColor(g);
    if (g.next >= 0 && !left.includes(g.next)) g.next = pickColor(g);
  }
}

export function step(g: BubbleGame, dt: number): BubbleEvent[] {
  const events: BubbleEvent[] = [];

  for (const b of g.leaving) {
    b.t += dt;
    if (b.kind === 'drop') {
      b.vel.y += 1400 * dt;
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
    }
  }
  g.leaving = g.leaving.filter(b => (b.kind === 'pop' ? b.t < 0.3 : b.pos.y < g.h + 40));

  if (g.shot && !g.over) {
    // Small sub-steps so a fast shot never tunnels through a bubble.
    const dist = Math.hypot(g.shot.vel.x, g.shot.vel.y) * dt;
    const n = Math.max(1, Math.ceil(dist / (g.r * 0.4)));
    for (let i = 0; i < n && g.shot; i++) {
      const s = g.shot;
      s.pos.x += (s.vel.x * dt) / n;
      s.pos.y += (s.vel.y * dt) / n;
      if (s.pos.x < g.r) { s.pos.x = g.r; s.vel.x = Math.abs(s.vel.x); }
      if (s.pos.x > g.w - g.r) { s.pos.x = g.w - g.r; s.vel.x = -Math.abs(s.vel.x); }
      if (hitsBubble(g, s.pos)) settle(g, events);
    }
  }
  return events;
}

/** Bubbles still on the board, for the HUD. */
export const bubblesLeft = (g: BubbleGame) => g.grid.reduce((n, row) => n + row.filter(c => c !== null).length, 0);
