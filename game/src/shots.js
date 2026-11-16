// Emberfall: deterministic screenshot states. `?shot=start|play|upgrade|end`
// puts the game into a scene worth photographing, so the screenshots the
// maker hands in show the whole loop: title, combat, a choice, the end.

import { CANVAS_W, CANVAS_H } from './config.js';
import { rollOffers } from './upgrades.js';

export function setupShot(world, rng, shot) {
  const state = world.state;

  if (shot === 'start') {
    world.reset();
    return;
  }

  if (shot === 'play') {
    world.startRun();
    world.startWave(3);
    state.score = 2450;
    state.kills = 31;
    state.shards = 18;
    state.streak = 6;
    state.streakTimer = 2.5;
    state.player.x = CANVAS_W / 2 - 80;
    state.player.y = CANVAS_H / 2 + 60;
    state.player.hp = 78;
    const spots = [
      ['wraith', 300, 180], ['wraith', 950, 150], ['wraith', 1050, 480],
      ['darter', 420, 560], ['darter', 880, 600], ['spitter', 1120, 260],
      ['splitter', 220, 380], ['wraith', 700, 120], ['brute', 980, 380],
      ['wraith', 480, 260], ['wraith', 820, 480], ['darter', 560, 420],
      ['spitter', 180, 220], ['splitter', 760, 180],
    ];
    for (const [type, x, y] of spots) world.spawnEnemyAt(type, x, y);
    for (const [x, y] of [[500, 300], [760, 420], [880, 240], [380, 460]]) {
      state.pickups.push({ kind: 'shard', x, y, vx: 0, vy: 0, value: 10 });
    }
    world.burst(640, 300, '#ffd97a', 10, 160);
    world.burst(950, 150, '#b9a7e6', 8, 140);
    return;
  }

  if (shot === 'upgrade') {
    world.startRun();
    world.startWave(2);
    state.wave = 2;
    state.score = 1830;
    state.kills = 19;
    state.shards = 11;
    state.phase = 'upgrade';
    state.intermission = 6;
    state.offers = rollOffers(rng, {});
    state.enemies = [];
    state.bullets = [];
    state.player.x = CANVAS_W / 2;
    state.player.y = CANVAS_H / 2 + 40;
    return;
  }

  if (shot === 'end') {
    world.startRun();
    world.startWave(6);
    state.wave = 6;
    state.score = 18420;
    state.kills = 143;
    state.shards = 96;
    state.best = 18420;
    state.player.hp = 0;
    state.phase = 'gameover';
    state.enemies = [];
    world.burst(640, 360, '#ffd97a', 40, 260, 5);
    world.burst(640, 360, '#ff7a3c', 24, 180, 4);
    return;
  }
}
