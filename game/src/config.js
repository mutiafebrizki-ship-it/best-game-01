// Emberfall: tuning and content tables. One place for every number the game
// balances on, so a change here retunes the whole game without touching logic.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

export const PALETTE = {
  bg0: '#0b0714',
  bg1: '#171029',
  bg2: '#241735',
  ring: '#3b2a5e',
  ringGlow: '#6b4fa3',
  ember: '#ffb347',
  emberHot: '#ffd97a',
  flame: '#ff7a3c',
  ash: '#8d84a6',
  wraith: '#b9a7e6',
  wraithCore: '#e6dcff',
  spitter: '#7ee0a3',
  splitter: '#e87ea1',
  brute: '#e05d5d',
  player: '#ffd97a',
  playerCore: '#fff3c4',
  heart: '#ff6b81',
  shard: '#ffc94d',
  text: '#f4ead8',
  textDim: '#b3a6c9',
  card: '#221739',
  cardEdge: '#6b4fa3',
  danger: '#ff5d5d',
};

export const PLAYER = {
  radius: 14,
  speed: 265,
  maxHp: 100,
  fireInterval: 0.22,
  bulletSpeed: 620,
  bulletDamage: 16,
  bulletRadius: 5,
  magnetRadius: 90,
  critChance: 0.05,
  critMult: 2,
};

// Enemy type table: everything a wave spawns is one of these.
export const ENEMIES = {
  wraith:   { hp: 22,  speed: 78,  radius: 15, score: 50,  damage: 10, color: 'wraith',  unlockWave: 1, weight: 10 },
  darter:   { hp: 14,  speed: 150, radius: 11, score: 80,  damage: 8,  color: 'wraith',  unlockWave: 2, weight: 6 },
  spitter:  { hp: 30,  speed: 55,  radius: 15, score: 120, damage: 8,  color: 'spitter', unlockWave: 3, weight: 5 },
  splitter: { hp: 26,  speed: 66,  radius: 16, score: 100, damage: 10, color: 'splitter', unlockWave: 4, weight: 5 },
  mote:     { hp: 8,   speed: 120, radius: 8,  score: 25,  damage: 5,  color: 'splitter', unlockWave: 4, weight: 0 },
  brute:    { hp: 170, speed: 42,  radius: 26, score: 400, damage: 20, color: 'brute',   unlockWave: 5, weight: 3 },
};

export const WAVE = {
  baseCount: 7,
  perWave: 4,
  spawnInterval: 0.85,
  intermissionSec: 6,
  hpScale: 0.14,
  speedScale: 0.03,
  shardChance: 0.55,
  heartChance: 0.045,
};

// Upgrade pool: one of three is offered between waves. `apply` mutates the
// player's stats object; `max` caps how often it can be taken.
export const UPGRADES = [
  { id: 'twin',    name: 'Twin Embers',   desc: '+1 ember per shot',                    max: 3, apply: (s) => { s.multishot += 1; } },
  { id: 'rapid',   name: 'Rapid Burn',    desc: '+25% fire rate',                      max: 4, apply: (s) => { s.fireInterval *= 0.8; } },
  { id: 'heavy',   name: 'Heavy Coals',   desc: '+40% ember damage',                   max: 5, apply: (s) => { s.bulletDamage *= 1.4; } },
  { id: 'pierce',  name: 'Piercing Light',desc: 'Embers pierce +1 enemy',              max: 3, apply: (s) => { s.pierce += 1; } },
  { id: 'swift',   name: 'Swift Steps',   desc: '+12% move speed',                     max: 4, apply: (s) => { s.speed *= 1.12; } },
  { id: 'heart',   name: 'Kindled Heart', desc: '+25 max health, heal 25',            max: 4, apply: (s) => { s.maxHp += 25; s.hp = Math.min(s.maxHp, s.hp + 25); } },
  { id: 'magnet',  name: 'Ember Magnet',  desc: '+70% shard pickup range',            max: 3, apply: (s) => { s.magnetRadius *= 1.7; } },
  { id: 'orbit',   name: 'Orbiting Flame',desc: '+1 ember orbiting you, hurting foes', max: 3, apply: (s) => { s.orbiters += 1; } },
  { id: 'crit',    name: 'Bright Strike', desc: '+12% critical chance (2x damage)',   max: 3, apply: (s) => { s.critChance += 0.12; } },
  { id: 'frost',   name: 'Cold Ash',      desc: 'Hits slow enemies by 35% for 1.5s',   max: 2, apply: (s) => { s.slowOnHit = true; } },
];

export const SCORE = {
  shard: 10,
  streakWindowSec: 2.5,
  streakStep: 0.1,
  streakMax: 3,
};
