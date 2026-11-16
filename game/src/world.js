// Emberfall: the world — every entity and the rules that move them. The world
// knows nothing about the canvas or the DOM: it updates plain state, and
// render.js draws it. Phases: 'menu' | 'playing' | 'upgrade' | 'gameover'.

import { CANVAS_W, CANVAS_H, PLAYER, ENEMIES, WAVE, SCORE, UPGRADES } from './config.js';
import { rollOffers } from './upgrades.js';

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(rng, audio) {
  const state = {
    phase: 'menu',
    time: 0,
    wave: 0,
    score: 0,
    kills: 0,
    shards: 0,
    streak: 0,
    streakTimer: 0,
    shake: 0,
    flash: 0,
    spawnQueue: 0,
    spawnTimer: 0,
    intermission: 0,
    offers: [],
    taken: {},
    best: 0,
    player: null,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    particles: [],
    floaters: [],
    orbitAngle: 0,
  };

  try {
    state.best = Number(window.localStorage.getItem('emberfall-best') || 0) || 0;
  } catch {
    state.best = 0;
  }

  function freshPlayer() {
    return {
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: PLAYER.radius,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      speed: PLAYER.speed,
      fireInterval: PLAYER.fireInterval,
      fireTimer: 0,
      bulletDamage: PLAYER.bulletDamage,
      bulletSpeed: PLAYER.bulletSpeed,
      multishot: 1,
      pierce: 0,
      magnetRadius: PLAYER.magnetRadius,
      critChance: PLAYER.critChance,
      critMult: PLAYER.critMult,
      orbiters: 0,
      slowOnHit: false,
      invulnTimer: 0,
    };
  }

  function reset() {
    state.phase = 'menu';
    state.time = 0;
    state.wave = 0;
    state.score = 0;
    state.kills = 0;
    state.shards = 0;
    state.streak = 0;
    state.streakTimer = 0;
    state.shake = 0;
    state.flash = 0;
    state.spawnQueue = 0;
    state.spawnTimer = 0;
    state.intermission = 0;
    state.offers = [];
    state.taken = {};
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.pickups = [];
    state.particles = [];
    state.floaters = [];
    state.orbitAngle = 0;
    state.player = freshPlayer();
  }

  function streakMultiplier() {
    return Math.min(1 + state.streak * SCORE.streakStep, SCORE.streakMax);
  }

  function addScore(base, x, y) {
    const gained = Math.round(base * streakMultiplier());
    state.score += gained;
    return gained;
  }

  function burst(x, y, color, count, speed, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = rng.next() * Math.PI * 2;
      const s = speed * (0.3 + rng.next() * 0.7);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.4 + rng.next() * 0.4,
        maxLife: 0.8,
        size: size * (0.6 + rng.next() * 0.8),
        color,
      });
    }
  }

  function addFloater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 0.9 });
  }

  function edgePoint() {
    const side = rng.int(0, 3);
    const m = 30;
    if (side === 0) return { x: rng.range(0, CANVAS_W), y: -m };
    if (side === 1) return { x: CANVAS_W + m, y: rng.range(0, CANVAS_H) };
    if (side === 2) return { x: rng.range(0, CANVAS_W), y: CANVAS_H + m };
    return { x: -m, y: rng.range(0, CANVAS_H) };
  }

  function spawnEnemyAt(type, x, y) {
    const base = ENEMIES[type];
    const hpScale = 1 + WAVE.hpScale * (state.wave - 1);
    const spScale = 1 + Math.min(WAVE.speedScale * (state.wave - 1), 0.5);
    const enemy = {
      type,
      x, y,
      vx: 0, vy: 0,
      hp: Math.round(base.hp * hpScale),
      maxHp: Math.round(base.hp * hpScale),
      speed: base.speed * spScale * rng.range(0.9, 1.1),
      radius: base.radius,
      score: base.score,
      damage: base.damage,
      color: base.color,
      slowTimer: 0,
      shootTimer: rng.range(1, 2),
      lungeTimer: rng.range(2, 3.5),
      lungeState: 'chase',
      lungeClock: 0,
      orbiterCooldown: 0,
      flashTimer: 0,
    };
    state.enemies.push(enemy);
    return enemy;
  }

  function spawnEnemy(type) {
    const p = edgePoint();
    return spawnEnemyAt(type, p.x, p.y);
  }

  function pickSpawnType() {
    const unlocked = Object.keys(ENEMIES).filter((t) => {
      const e = ENEMIES[t];
      return e.unlockWave <= state.wave && e.weight > 0;
    });
    // Brutes are capped: at most one per three waves of budget.
    let total = 0;
    for (const t of unlocked) total += ENEMIES[t].weight;
    let roll = rng.next() * total;
    for (const t of unlocked) {
      roll -= ENEMIES[t].weight;
      if (roll <= 0) return t;
    }
    return 'wraith';
  }

  function startWave(n) {
    state.wave = n;
    state.phase = 'playing';
    state.spawnQueue = WAVE.baseCount + WAVE.perWave * (n - 1);
    state.spawnTimer = 0.5;
    state.offers = [];
  }

  function startRun() {
    reset();
    state.phase = 'playing';
    startWave(1);
  }

  function waveCleared() {
    const bonus = 100 * state.wave;
    state.score += bonus;
    addFloater(state.player.x, state.player.y - 40, `WAVE ${state.wave} CLEAR  +${bonus}`, '#ffd97a');
    audio.waveClear();
    state.offers = rollOffers(rng, state.taken);
    state.phase = 'upgrade';
    state.intermission = WAVE.intermissionSec;
  }

  function chooseUpgrade(index) {
    const offer = state.offers[index];
    if (!offer) return false;
    offer.apply(state.player);
    state.taken[offer.id] = (state.taken[offer.id] || 0) + 1;
    burst(state.player.x, state.player.y, '#ffd97a', 24, 220, 4);
    audio.upgrade();
    startWave(state.wave + 1);
    return true;
  }

  function fireBullet(angle) {
    const p = state.player;
    const spread = 0.09;
    const count = p.multishot;
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const a = angle + offset;
      const crit = rng.next() < p.critChance;
      state.bullets.push({
        x: p.x + Math.cos(a) * (p.radius + 6),
        y: p.y + Math.sin(a) * (p.radius + 6),
        vx: Math.cos(a) * p.bulletSpeed,
        vy: Math.sin(a) * p.bulletSpeed,
        damage: p.bulletDamage * (crit ? p.critMult : 1),
        radius: PLAYER.bulletRadius + (crit ? 2 : 0),
        pierceLeft: p.pierce,
        crit,
      });
    }
    audio.shoot();
  }

  function damageEnemy(enemy, dmg, isCrit) {
    enemy.hp -= dmg;
    enemy.flashTimer = 0.08;
    addFloater(enemy.x + rng.range(-8, 8), enemy.y - enemy.radius - 4, String(Math.round(dmg)), isCrit ? '#ffd97a' : '#f4ead8');
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    enemy.dead = true;
    state.kills += 1;
    state.streak += 1;
    state.streakTimer = SCORE.streakWindowSec;
    const gained = addScore(enemy.score, enemy.x, enemy.y);
    addFloater(enemy.x, enemy.y - enemy.radius - 18, `+${gained}`, '#ffc94d');
    burst(enemy.x, enemy.y, '#b9a7e6', 14, 200);
    burst(enemy.x, enemy.y, '#ff7a3c', 8, 140);
    state.shake = Math.max(state.shake, enemy.type === 'brute' ? 9 : 3);
    audio.enemyDie();
    if (enemy.type === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const mote = spawnEnemyAt('mote', enemy.x + rng.range(-14, 14), enemy.y + rng.range(-14, 14));
        mote.hp = mote.maxHp;
      }
    }
    if (rng.next() < WAVE.shardChance) {
      state.pickups.push({ kind: 'shard', x: enemy.x, y: enemy.y, vx: rng.range(-40, 40), vy: rng.range(-40, 40), value: SCORE.shard });
    }
    if (rng.next() < WAVE.heartChance) {
      state.pickups.push({ kind: 'heart', x: enemy.x, y: enemy.y, vx: rng.range(-30, 30), vy: rng.range(-30, 30), value: 20 });
    }
  }

  function damagePlayer(dmg, fromX, fromY) {
    const p = state.player;
    if (p.invulnTimer > 0 || state.phase !== 'playing') return;
    p.hp -= dmg;
    p.invulnTimer = 0.7;
    state.flash = 0.35;
    state.shake = Math.max(state.shake, 10);
    state.streak = 0;
    burst(p.x, p.y, '#ff5d5d', 16, 240, 4);
    audio.hurt();
    const dx = p.x - fromX;
    const dy = p.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    p.vx += (dx / d) * 260;
    p.vy += (dy / d) * 260;
    if (p.hp <= 0) {
      p.hp = 0;
      state.phase = 'gameover';
      burst(p.x, p.y, '#ffd97a', 60, 320, 5);
      burst(p.x, p.y, '#ff7a3c', 40, 220, 4);
      audio.gameOver();
      if (state.score > state.best) {
        state.best = state.score;
        try {
          window.localStorage.setItem('emberfall-best', String(state.best));
        } catch {
          /* storage unavailable; best score just is not kept */
        }
      }
    }
  }

  function updatePlayer(dt, input) {
    const p = state.player;
    const mv = input.moveVector();
    p.vx += mv.x * p.speed * 6 * dt;
    p.vy += mv.y * p.speed * 6 * dt;
    // Friction keeps the drift tight and the movement responsive.
    p.vx *= Math.pow(0.0001, dt);
    p.vy *= Math.pow(0.0001, dt);
    const sp = Math.hypot(p.vx, p.vy);
    const max = p.speed * 1.15;
    if (sp > max) {
      p.vx = (p.vx / sp) * max;
      p.vy = (p.vy / sp) * max;
    }
    p.x = clamp(p.x + p.vx * dt, p.radius, CANVAS_W - p.radius);
    p.y = clamp(p.y + p.vy * dt, p.radius, CANVAS_H - p.radius);
    p.angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    p.fireTimer -= dt;
    if (input.mouse.down && p.fireTimer <= 0 && state.enemies.length > 0) {
      p.fireTimer = p.fireInterval;
      fireBullet(p.angle);
    }

    // Orbiting flames circle the player and burn what they touch.
    state.orbitAngle += dt * 3.2;
    if (p.orbiters > 0) {
      for (let i = 0; i < p.orbiters; i++) {
        const a = state.orbitAngle + (i / p.orbiters) * Math.PI * 2;
        const ox = p.x + Math.cos(a) * 52;
        const oy = p.y + Math.sin(a) * 52;
        for (const e of state.enemies) {
          if (e.orbiterCooldown > 0) continue;
          const rr = e.radius + 12;
          if (dist2(ox, oy, e.x, e.y) < rr * rr) {
            e.orbiterCooldown = 0.5;
            damageEnemy(e, p.bulletDamage * 0.8, false);
            burst(e.x, e.y, '#ff7a3c', 5, 120);
          }
        }
      }
    }
  }

  function updateEnemies(dt) {
    const p = state.player;
    for (const e of state.enemies) {
      if (e.flashTimer > 0) e.flashTimer -= dt;
      if (e.orbiterCooldown > 0) e.orbiterCooldown -= dt;
      const slow = e.slowTimer > 0 ? 0.65 : 1;
      if (e.slowTimer > 0) e.slowTimer -= dt;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;

      if (e.type === 'spitter') {
        // Keeps its distance and lobs globs.
        const want = 300;
        const dir = d > want + 40 ? 1 : d < want - 60 ? -1 : 0;
        e.vx = nx * e.speed * slow * dir;
        e.vy = ny * e.speed * slow * dir;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && d < 560) {
          e.shootTimer = 2.3;
          state.enemyBullets.push({
            x: e.x, y: e.y,
            vx: nx * 190, vy: ny * 190,
            damage: e.damage, radius: 7,
          });
          burst(e.x, e.y, '#7ee0a3', 4, 80);
        }
      } else if (e.type === 'darter') {
        // Chases, telegraphs, then lunges.
        e.lungeTimer -= dt;
        if (e.lungeState === 'chase') {
          e.vx = nx * e.speed * slow;
          e.vy = ny * e.speed * slow;
          if (e.lungeTimer <= 0 && d < 320) {
            e.lungeState = 'windup';
            e.lungeClock = 0.45;
          }
        } else if (e.lungeState === 'windup') {
          e.vx = 0;
          e.vy = 0;
          e.lungeClock -= dt;
          if (e.lungeClock <= 0) {
            e.lungeState = 'lunge';
            e.lungeClock = 0.32;
            e.vx = nx * e.speed * 3.4;
            e.vy = ny * e.speed * 3.4;
          }
        } else {
          e.lungeClock -= dt;
          if (e.lungeClock <= 0) {
            e.lungeState = 'chase';
            e.lungeTimer = rng.range(2, 3.5);
          }
        }
      } else {
        e.vx = nx * e.speed * slow;
        e.vy = ny * e.speed * slow;
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Touching the keeper hurts.
      const rr = e.radius + p.radius - 2;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        damagePlayer(e.damage, e.x, e.y);
        e.x -= nx * 14;
        e.y -= ny * 14;
      }
    }
    state.enemies = state.enemies.filter((e) => !e.dead);
  }

  function updateBullets(dt) {
    const p = state.player;
    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > CANVAS_W + 20 || b.y < -20 || b.y > CANVAS_H + 20) {
        b.dead = true;
        continue;
      }
      for (const e of state.enemies) {
        if (e.dead) continue;
        const rr = e.radius + b.radius;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          if (p.slowOnHit) e.slowTimer = 1.5;
          damageEnemy(e, b.damage, b.crit);
          burst(b.x, b.y, '#ffd97a', 4, 110, 2);
          audio.hit();
          if (b.pierceLeft > 0) {
            b.pierceLeft -= 1;
          } else {
            b.dead = true;
          }
          break;
        }
      }
    }
    state.bullets = state.bullets.filter((b) => !b.dead);

    for (const b of state.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > CANVAS_W + 20 || b.y < -20 || b.y > CANVAS_H + 20) {
        b.dead = true;
        continue;
      }
      const rr = b.radius + p.radius - 2;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        damagePlayer(b.damage, b.x - b.vx, b.y - b.vy);
        b.dead = true;
      }
    }
    state.enemyBullets = state.enemyBullets.filter((b) => !b.dead);
  }

  function updatePickups(dt) {
    const p = state.player;
    for (const pk of state.pickups) {
      const d = Math.hypot(p.x - pk.x, p.y - pk.y) || 1;
      if (d < p.magnetRadius) {
        const pull = 900 * (1 - d / (p.magnetRadius + 1));
        pk.vx += ((p.x - pk.x) / d) * pull * dt;
        pk.vy += ((p.y - pk.y) / d) * pull * dt;
      }
      pk.vx *= Math.pow(0.05, dt);
      pk.vy *= Math.pow(0.05, dt);
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      if (d < 26) {
        pk.dead = true;
        if (pk.kind === 'shard') {
          state.shards += 1;
          state.score += pk.value;
          burst(pk.x, pk.y, '#ffc94d', 5, 100, 2);
          audio.pickup();
        } else {
          p.hp = Math.min(p.maxHp, p.hp + pk.value);
          addFloater(p.x, p.y - 30, `+${pk.value} HP`, '#ff6b81');
          burst(pk.x, pk.y, '#ff6b81', 8, 120, 3);
          audio.heal();
        }
      }
    }
    state.pickups = state.pickups.filter((pk) => !pk.dead);
  }

  function updateParticles(dt) {
    for (const pt of state.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.pow(0.05, dt);
      pt.vy *= Math.pow(0.05, dt);
    }
    state.particles = state.particles.filter((pt) => pt.life > 0);
    for (const f of state.floaters) {
      f.life -= dt;
      f.y -= 34 * dt;
    }
    state.floaters = state.floaters.filter((f) => f.life > 0);
  }

  function update(dt, input) {
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (state.streakTimer > 0) {
      state.streakTimer -= dt;
      if (state.streakTimer <= 0) state.streak = 0;
    }

    if (state.phase === 'playing') {
      updatePlayer(dt, input);
      if (state.spawnQueue > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = Math.max(0.35, WAVE.spawnInterval - state.wave * 0.04);
          spawnEnemy(pickSpawnType());
          state.spawnQueue -= 1;
        }
      }
      updateEnemies(dt);
      updateBullets(dt);
      updatePickups(dt);
      if (state.spawnQueue <= 0 && state.enemies.length === 0 && state.phase === 'playing') {
        waveCleared();
      }
    } else if (state.phase === 'upgrade') {
      state.intermission -= dt;
      updateParticles(dt);
      if (state.intermission <= 0) {
        // No choice made in time: the middle card is taken for free.
        chooseUpgrade(1);
      }
    }
    updateParticles(dt);
  }

  reset();

  return {
    state,
    reset,
    startRun,
    startWave,
    chooseUpgrade,
    spawnEnemyAt,
    spawnEnemy,
    burst,
    addFloater,
    streakMultiplier,
    update,
  };
}
