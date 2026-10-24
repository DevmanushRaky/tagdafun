// Patang Baazi: game rules and simulation. No drawing here; the component renders this state.
// Coordinates are canvas pixels, y grows downward. Every update is scaled by dt (seconds),
// so the game plays the same at 30 or 60 FPS.

export interface Vec { x: number; y: number }

export interface Kite {
  id: number;
  pos: Vec;
  vel: Vec;
  anchor: Vec;          // where the string is held (below the bottom edge)
  size: number;
  colors: [string, string];
  boss: boolean;
  strength: number;     // how hard this kite pulls in a pench
  aim: Vec;             // where an AI kite is heading
  aimTimer: number;
  falling: number;      // 0 = flying; >0 = seconds since its string was cut
  spin: number;
}

export type KiteEvent =
  | { type: 'cut'; at: Vec; boss: boolean }
  | { type: 'lost'; at: Vec }
  | { type: 'won' }
  | { type: 'gameOver' };

export interface LevelSpec {
  goal: number;         // kites to cut
  maxEnemies: number;   // on screen at once
  strength: number;     // enemy pull in a pench
  speed: number;        // enemy flying speed, px/s
  boss: boolean;        // a boss kite appears once the goal is half done
}

export interface KiteGame {
  w: number;
  h: number;
  level: number;
  spec: LevelSpec;
  player: Kite;
  enemies: Kite[];
  wind: number;         // horizontal push, px/s (negative = to the left)
  windTarget: number;
  windTimer: number;
  lives: number;
  cut: number;
  bossSpawned: boolean;
  bossCut: boolean;
  pench: number;        // -1 (you lose the cross) .. 1 (you cut them)
  touchSpeed: number;   // smoothed finger speed, px/s: how hard you are pulling
  lastTouch: Vec | null;
  penchWith: number | null;
  penchAt: Vec | null;
  respawn: number;      // >0 while your next kite is rising; invulnerable meanwhile
  spawnTimer: number;
  time: number;
  over: boolean;
  won: boolean;
  nextId: number;
}

export const START_LIVES = 3;
const PLAYER_SIZE = 46;
const ENEMY_SIZE = 40;
const BOSS_SIZE = 64;
const STEER = 14;         // spring towards the finger
const DAMPING = 5;
const PULL_FULL = 900;    // finger speed (px/s) that counts as a full pull (khinch) in a pench
const PENCH_RATE = 1.5;
const RESPAWN_S = 1.6;
const FALL_S = 2.4;
const STRING_SAMPLES = 9;

export const ENEMY_COLORS: [string, string][] = [
  ['#E74C3C', '#F5B7B1'], ['#8E44AD', '#D2B4DE'], ['#16A085', '#A3E4D7'],
  ['#2E86C1', '#AED6F1'], ['#D4AC0D', '#F9E79F'], ['#CB4335', '#1C2833'],
];
export const PLAYER_COLORS: [string, string] = ['#FF6B00', '#FFFFFF'];
export const BOSS_COLORS: [string, string] = ['#1C2833', '#F1C40F'];

export function specForLevel(level: number): LevelSpec {
  const lv = Math.max(1, level);
  return {
    goal: Math.min(3 + Math.floor((lv - 1) / 2), 10),
    maxEnemies: Math.min(1 + Math.floor((lv + 1) / 3), 4),
    strength: Math.min(0.32 + lv * 0.035, 0.85),
    speed: Math.min(70 + lv * 8, 170),
    boss: lv % 5 === 0,
  };
}

/** Stars for a cleared level: one per life left. */
export const kiteStars = (lives: number): 1 | 2 | 3 => (lives >= 3 ? 3 : lives === 2 ? 2 : 1);

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function newPlayer(w: number, h: number): Kite {
  return {
    id: 0,
    pos: { x: w / 2, y: h * 0.82 },
    vel: { x: 0, y: -260 },
    anchor: { x: w / 2, y: h + 24 },
    size: PLAYER_SIZE,
    colors: PLAYER_COLORS,
    boss: false,
    strength: 0,
    aim: { x: w / 2, y: h * 0.45 },
    aimTimer: 0,
    falling: 0,
    spin: 0,
  };
}

export function newGame(level: number, w: number, h: number): KiteGame {
  return {
    w, h, level,
    spec: specForLevel(level),
    player: newPlayer(w, h),
    enemies: [],
    wind: rand(-30, 30),
    windTarget: rand(-60, 60),
    windTimer: rand(3, 6),
    lives: START_LIVES,
    cut: 0,
    bossSpawned: false,
    bossCut: false,
    pench: 0,
    touchSpeed: 0,
    lastTouch: null,
    penchWith: null,
    penchAt: null,
    respawn: RESPAWN_S,
    spawnTimer: 0.8,
    time: 0,
    over: false,
    won: false,
    nextId: 1,
  };
}

function spawnEnemy(g: KiteGame, boss: boolean): Kite {
  const fromLeft = Math.random() < 0.5;
  const anchorX = fromLeft ? rand(-60, g.w * 0.25) : rand(g.w * 0.75, g.w + 60);
  return {
    id: g.nextId++,
    pos: { x: fromLeft ? rand(-30, g.w * 0.3) : rand(g.w * 0.7, g.w + 30), y: g.h + 10 },
    vel: { x: 0, y: -140 },
    anchor: { x: anchorX, y: g.h + 30 },
    size: boss ? BOSS_SIZE : ENEMY_SIZE,
    colors: boss ? BOSS_COLORS : ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
    boss,
    strength: boss ? Math.min(g.spec.strength + 0.25, 1) : g.spec.strength * rand(0.85, 1.15),
    aim: { x: rand(g.w * 0.15, g.w * 0.85), y: rand(g.h * 0.15, g.h * 0.5) },
    aimTimer: rand(1, 2.5),
    falling: 0,
    spin: 0,
  };
}

/** The string as a sagging curve from the hand to the kite, sampled as a polyline. */
export function stringPoints(k: Kite, wind: number, n = STRING_SAMPLES): Vec[] {
  const a = k.anchor;
  const b = k.pos;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const c = {
    x: (a.x + b.x) / 2 + wind * 0.35,
    y: (a.y + b.y) / 2 + Math.min(70, len * 0.12),   // gravity sag
  };
  const pts: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
  }
  return pts;
}

/** Control point of the same curve, for drawing it as one smooth quadratic. */
export function stringControl(k: Kite, wind: number): Vec {
  const len = Math.hypot(k.pos.x - k.anchor.x, k.pos.y - k.anchor.y);
  return { x: (k.anchor.x + k.pos.x) / 2 + wind * 0.35, y: (k.anchor.y + k.pos.y) / 2 + Math.min(70, len * 0.12) };
}

function segCross(p1: Vec, p2: Vec, p3: Vec, p4: Vec): Vec | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-6) return null;
  const ua = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const ub = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;
  return { x: p1.x + ua * (p2.x - p1.x), y: p1.y + ua * (p2.y - p1.y) };
}

/** First point where two strings cross, ignoring the stretch near the hands (strings start below the screen). */
function crossing(a: Vec[], b: Vec[], h: number): Vec | null {
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const p = segCross(a[i], a[i + 1], b[j], b[j + 1]);
      if (p && p.y < h - 8) return p;
    }
  }
  return null;
}

function flyKite(k: Kite, target: Vec, g: KiteGame, dt: number, steer: number) {
  const ax = (target.x - k.pos.x) * steer - k.vel.x * DAMPING + g.wind * 1.4;
  const ay = (target.y - k.pos.y) * steer - k.vel.y * DAMPING;
  k.vel.x += ax * dt;
  k.vel.y += ay * dt;
  k.pos.x += k.vel.x * dt;
  k.pos.y += k.vel.y * dt;
  const m = k.size * 0.6;
  k.pos.x = clamp(k.pos.x, m, g.w - m);
  k.pos.y = clamp(k.pos.y, m + 10, g.h * 0.8);
}

function fall(k: Kite, g: KiteGame, dt: number) {
  k.falling += dt;
  k.vel.x += g.wind * 0.6 * dt;
  k.vel.y = Math.min(k.vel.y + 220 * dt, 160);
  k.pos.x += k.vel.x * dt;
  k.pos.y += k.vel.y * dt;
  k.spin += dt * 260;
}

/**
 * Advances the game by dt seconds. `touch` is where the finger is (null when lifted).
 * Returns what happened this step, for sounds, toasts and the result card.
 */
export function step(g: KiteGame, dt: number, touch: Vec | null): KiteEvent[] {
  const events: KiteEvent[] = [];
  if (g.over) return events;
  g.time += dt;

  // Wind drifts to a new strength every few seconds.
  g.windTimer -= dt;
  if (g.windTimer <= 0) {
    g.windTarget = rand(-70, 70) * Math.min(1, 0.5 + g.level * 0.08);
    g.windTimer = rand(3, 6);
  }
  g.wind += (g.windTarget - g.wind) * Math.min(1, dt * 0.8);

  // How fast the finger moves is how hard you pull the string.
  const inst = touch && g.lastTouch && dt > 0 ? Math.hypot(touch.x - g.lastTouch.x, touch.y - g.lastTouch.y) / dt : 0;
  g.touchSpeed += (inst - g.touchSpeed) * Math.min(1, dt * 10);
  g.lastTouch = touch ? { ...touch } : null;

  // Your kite: follows the finger, otherwise hovers where it is and drifts with the wind.
  const p = g.player;
  if (p.falling > 0) {
    fall(p, g, dt);
    if (p.falling > FALL_S) {
      g.player = newPlayer(g.w, g.h);
      g.respawn = RESPAWN_S;
    }
  } else {
    if (g.respawn > 0) g.respawn -= dt;
    const target = g.respawn > 0 && !touch
      ? { x: g.w / 2, y: g.h * 0.45 }
      : touch ?? { x: p.pos.x + g.wind * 0.4, y: p.pos.y + Math.sin(g.time * 2) * 6 };
    flyKite(p, target, g, dt, touch ? STEER : STEER * 0.5);
  }

  // Bring in new kites up to the level's limit, and the boss halfway through.
  const flying = g.enemies.filter(e => e.falling === 0);
  const remaining = g.spec.goal - g.cut;
  g.spawnTimer -= dt;
  if (g.spec.boss && !g.bossSpawned && g.cut >= Math.floor(g.spec.goal / 2)) {
    g.enemies.push(spawnEnemy(g, true));
    g.bossSpawned = true;
  } else if (g.spawnTimer <= 0 && flying.length < Math.min(g.spec.maxEnemies, remaining)) {
    g.enemies.push(spawnEnemy(g, false));
    g.spawnTimer = rand(1.2, 2.4);
  }

  // Enemy kites wander, and the bolder ones go for your string.
  for (const e of g.enemies) {
    if (e.falling > 0) { fall(e, g, dt); continue; }
    e.aimTimer -= dt;
    if (e.aimTimer <= 0) {
      const attack = p.falling === 0 && Math.random() < (e.boss ? 0.8 : 0.45);
      if (attack) {
        const pts = stringPoints(p, g.wind);
        const q = pts[Math.floor(rand(3, pts.length - 2))];
        e.aim = { x: clamp(q.x + rand(-40, 40), 30, g.w - 30), y: clamp(q.y - rand(10, 60), 40, g.h * 0.7) };
      } else {
        e.aim = { x: rand(g.w * 0.1, g.w * 0.9), y: rand(g.h * 0.12, g.h * 0.55) };
      }
      e.aimTimer = rand(1.4, 3);
    }
    const steer = (g.spec.speed / 120) * (e.boss ? 1.5 : 1.8);
    flyKite(e, e.aim, g, dt, steer);
  }
  g.enemies = g.enemies.filter(e => e.falling < FALL_S && e.pos.y < g.h + 120);

  // Pench: when strings cross, pulling hard (moving your kite fast) wins.
  g.penchAt = null;
  let rival: Kite | null = null;
  if (p.falling === 0 && g.respawn <= 0) {
    const mine = stringPoints(p, g.wind);
    for (const e of g.enemies) {
      if (e.falling > 0) continue;
      const at = crossing(mine, stringPoints(e, g.wind), g.h);
      if (at) { rival = e; g.penchAt = at; break; }
    }
  }
  if (rival) {
    if (g.penchWith !== rival.id) { g.penchWith = rival.id; g.pench = 0; }
    const pull = Math.min(1.5, g.touchSpeed / PULL_FULL);
    g.pench += (pull * 1.25 - rival.strength) * PENCH_RATE * dt;
    if (g.pench >= 1) {
      rival.falling = 0.0001;
      rival.vel = { x: rival.vel.x * 0.3, y: 0 };
      g.cut += 1;
      if (rival.boss) g.bossCut = true;
      events.push({ type: 'cut', at: g.penchAt!, boss: rival.boss });
      g.pench = 0;
      g.penchWith = null;
    } else if (g.pench <= -1) {
      p.falling = 0.0001;
      p.vel = { x: p.vel.x * 0.3, y: 0 };
      g.lives -= 1;
      events.push({ type: 'lost', at: g.penchAt! });
      g.pench = 0;
      g.penchWith = null;
    }
  } else {
    g.penchWith = null;
    g.pench *= Math.max(0, 1 - dt * 3);
  }

  if (g.lives <= 0) {
    g.over = true;
    events.push({ type: 'gameOver' });
  } else if (g.cut >= g.spec.goal && (!g.spec.boss || g.bossCut)) {
    g.over = true;
    g.won = true;
    events.push({ type: 'won' });
  }
  return events;
}
