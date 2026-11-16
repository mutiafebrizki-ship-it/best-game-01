// Emberfall: bootstrap and the game loop. Owns the canvas, the fixed-step
// loop, the phase machine (menu / playing / upgrade / gameover / paused) and
// the autopilot that plays the game for screenshots and demos.

import { CANVAS_W, CANVAS_H } from './config.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import {
  drawWorld, drawMenu, drawUpgrade, drawGameOver, drawPaused, upgradeCardRects,
} from './render.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const demo = params.get('demo') === '1';
const seed = Number(params.get('seed') || '20261116');
const rng = makeRng(seed);

const input = createInput(canvas);
const audio = createAudio();
const world = createWorld(rng, audio);
const state = world.state;

let paused = false;
let autopilot = demo || shot === 'play';

// The autopilot plays the keeper for screenshots and demos: it circles the
// Heartflame, aims at the nearest wraith and holds the trigger down.
function autopilotInput() {
  const p = state.player;
  let target = null;
  let best = Infinity;
  for (const e of state.enemies) {
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < best) {
      best = d;
      target = e;
    }
  }
  const t = state.time;
  const cx = CANVAS_W / 2 + Math.cos(t * 0.45) * 190;
  const cy = CANVAS_H / 2 + Math.sin(t * 0.45) * 130;
  const mx = cx - p.x;
  const my = cy - p.y;
  const ml = Math.hypot(mx, my) || 1;
  const ax = target ? target.x : p.x + Math.cos(t);
  const ay = target ? target.y : p.y + Math.sin(t);
  return {
    moveVector() {
      return { x: mx / ml, y: my / ml };
    },
    mouse: { x: ax, y: ay, down: true, clicked: false },
    consumeClick() {
      return false;
    },
    pressed() {
      return false;
    },
  };
}

function effectiveInput() {
  return autopilot ? autopilotInput() : input;
}

function startGame() {
  audio.unlock();
  audio.click();
  world.startRun();
  paused = false;
}

function togglePause() {
  if (state.phase !== 'playing') return;
  paused = !paused;
  audio.click();
}

function handleKey(event) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === 'p' || key === 'Escape') {
    togglePause();
    return;
  }
  if (key === 'm') {
    audio.toggleMute();
    return;
  }
  if (state.phase === 'menu' && (key === 'Enter' || key === ' ')) {
    startGame();
  } else if (state.phase === 'upgrade' && ['1', '2', '3'].includes(key)) {
    world.chooseUpgrade(Number(key) - 1);
  } else if (state.phase === 'gameover' && (key === 'r' || key === 'Enter' || key === ' ')) {
    startGame();
  }
}

function handleClick() {
  audio.unlock();
  if (state.phase === 'menu') {
    startGame();
  } else if (state.phase === 'upgrade') {
    const rects = upgradeCardRects();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (
        input.mouse.x >= r.x && input.mouse.x <= r.x + r.w &&
        input.mouse.y >= r.y && input.mouse.y <= r.y + r.h
      ) {
        world.chooseUpgrade(i);
        break;
      }
    }
  } else if (state.phase === 'gameover') {
    startGame();
  }
}

window.addEventListener('keydown', handleKey);
canvas.addEventListener('mousedown', () => {
  // The input module already records the click; this handler routes it by phase.
  handleClick();
});

if (shot) {
  setupShot(world, rng, shot);
  if (shot === 'play') autopilot = true;
} else {
  world.reset();
}

// Exposed for play-tests: the shot script can watch the world settle.
window.__emberfall = { world, state, canvas };

const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    if (!paused) world.update(STEP, effectiveInput());
    acc -= STEP;
    steps += 1;
  }
  if (steps === 5) acc = 0;

  if (state.phase === 'menu') {
    drawMenu(ctx, state, state.time);
  } else if (state.phase === 'upgrade') {
    drawUpgrade(ctx, state, state.time);
  } else if (state.phase === 'gameover') {
    drawGameOver(ctx, state);
  } else {
    drawWorld(ctx, state, state.time);
    if (paused) drawPaused(ctx);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
