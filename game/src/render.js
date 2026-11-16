// Emberfall: every pixel the game shows. The world hands it plain state; it
// draws the background, the entities, the HUD and every menu screen.

import { CANVAS_W, CANVAS_H, PALETTE } from './config.js';
import { makeRng } from './rng.js';

const bgRng = makeRng(20261116);
const STARS = [];
for (let i = 0; i < 130; i++) {
  STARS.push({
    x: bgRng.range(0, CANVAS_W),
    y: bgRng.range(0, CANVAS_H),
    r: bgRng.range(0.6, 2.2),
    tw: bgRng.range(0, Math.PI * 2),
    ember: bgRng.next() < 0.25,
  });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, time) {
  const g = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, 80,
    CANVAS_W / 2, CANVAS_H / 2, 780,
  );
  g.addColorStop(0, PALETTE.bg2);
  g.addColorStop(0.55, PALETTE.bg1);
  g.addColorStop(1, PALETTE.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  for (const s of STARS) {
    const a = 0.25 + 0.45 * Math.abs(Math.sin(time * 0.7 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ember ? PALETTE.ember : '#cfc6e8';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The ruined ring: the Heartflame's circle at the arena's heart.
  ctx.strokeStyle = PALETTE.ring;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.ringGlow;
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 1.3);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Vignette.
  const v = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.45,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.95,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawHeartflame(ctx, time) {
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  const flicker = 1 + 0.12 * Math.sin(time * 5.1) + 0.06 * Math.sin(time * 11.7);
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 74 * flicker);
  g.addColorStop(0, 'rgba(255, 217, 122, 0.85)');
  g.addColorStop(0.4, 'rgba(255, 122, 60, 0.35)');
  g.addColorStop(1, 'rgba(255, 122, 60, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 74 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.emberHot;
  ctx.beginPath();
  ctx.arc(cx, cy, 10 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.flame;
  ctx.beginPath();
  ctx.arc(cx, cy, 6 * flicker, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, p, time) {
  if (p.invulnTimer > 0 && Math.floor(time * 14) % 2 === 0) return;
  // Faint aim line, so the keeper's facing reads at a glance.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 217, 122, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * (p.radius + 4), p.y + Math.sin(p.angle) * (p.radius + 4));
  ctx.lineTo(p.x + Math.cos(p.angle) * (p.radius + 46), p.y + Math.sin(p.angle) * (p.radius + 46));
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y);
  // Lantern glow.
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  g.addColorStop(0, 'rgba(255, 217, 122, 0.5)');
  g.addColorStop(1, 'rgba(255, 122, 60, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  // Cloak: a triangle pointing where the keeper aims.
  ctx.rotate(p.angle);
  ctx.fillStyle = '#3a2a5e';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(3, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flashTimer > 0;
  const color = flash ? '#ffffff' : PALETTE[e.color] || '#b9a7e6';
  if (e.type === 'wraith') {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, -2, e.radius, Math.PI, 0);
    ctx.lineTo(e.radius, 8);
    ctx.lineTo(e.radius * 0.5, 2);
    ctx.lineTo(0, 10);
    ctx.lineTo(-e.radius * 0.5, 2);
    ctx.lineTo(-e.radius, 8);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a1030';
    ctx.beginPath();
    ctx.arc(-5, -4, 2.6, 0, Math.PI * 2);
    ctx.arc(5, -4, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'darter') {
    const ang = Math.atan2(e.vy, e.vx);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(e.radius + 4, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.4, 0);
    ctx.lineTo(-e.radius, e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    if (e.lungeState === 'windup') {
      ctx.strokeStyle = '#ff5d5d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (e.type === 'spitter') {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * e.radius;
      const py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0e2a1a';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'splitter' || e.type === 'mote') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-e.radius * 0.35, 0, e.radius * 0.62, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.35, 0, e.radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a0e1e';
    ctx.beginPath();
    ctx.arc(-e.radius * 0.35, -2, 2, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.35, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'brute') {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.2;
      const px = Math.cos(a) * (e.radius + 6);
      const py = Math.sin(a) * (e.radius + 6);
      const qx = Math.cos(a + 0.4) * e.radius * 0.8;
      const qy = Math.sin(a + 0.4) * e.radius * 0.8;
      ctx.lineTo(px, py);
      ctx.lineTo(qx, qy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a0e0e';
    ctx.beginPath();
    ctx.arc(-7, -4, 3, 0, Math.PI * 2);
    ctx.arc(7, -4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Health bar for the tough ones.
  if (e.maxHp >= 100 && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = PALETTE.danger;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, (w * e.hp) / e.maxHp, 5);
  }
}

function drawHud(ctx, state) {
  const p = state.player;
  ctx.textBaseline = 'alphabetic';
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  rr(ctx, 20, 18, 240, 22, 6);
  ctx.fill();
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = hpFrac > 0.5 ? '#ff6b81' : hpFrac > 0.25 ? '#ffb347' : '#ff5d5d';
  rr(ctx, 22, 20, 236 * hpFrac, 18, 5);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)} / ${p.maxHp}`, 28, 35);

  // Score and wave.
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(String(state.score).padStart(6, '0'), CANVAS_W - 20, 38);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`WAVE ${state.wave}   KILLS ${state.kills}`, CANVAS_W - 20, 60);
  ctx.textAlign = 'left';

  // Streak multiplier.
  if (state.streak >= 3) {
    const mult = Math.min(1 + state.streak * 0.1, 3).toFixed(1);
    ctx.fillStyle = PALETTE.ember;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`STREAK x${mult} (${state.streak})`, 20, 66);
  }

  // Shards.
  ctx.fillStyle = PALETTE.shard;
  ctx.beginPath();
  ctx.arc(30, 92, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`x ${state.shards}`, 42, 97);

  // Controls hint, bottom left.
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD move · Mouse aim · Hold click to shoot · P pause · M mute', 20, CANVAS_H - 16);
}

function drawCenterPanel(ctx, lines) {
  ctx.fillStyle = 'rgba(8, 5, 18, 0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  let y = CANVAS_H / 2 - (lines.length - 1) * 34;
  ctx.textAlign = 'center';
  for (const line of lines) {
    ctx.fillStyle = line.color || PALETTE.text;
    ctx.font = line.font || '20px system-ui, sans-serif';
    ctx.fillText(line.text, CANVAS_W / 2, y);
    y += line.gap || 44;
  }
  ctx.textAlign = 'left';
}

export function drawMenu(ctx, state, time) {
  drawBackground(ctx, time);
  drawHeartflame(ctx, time);
  // Drifting embers.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + time * 0.08;
    const r = 180 + ((i * 37) % 120);
    const x = CANVAS_W / 2 + Math.cos(a) * r;
    const y = CANVAS_H / 2 + Math.sin(a * 1.3) * r * 0.55 - ((time * 12 + i * 53) % 200) * 0.1;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ember;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('EMBERFALL', CANVAS_W / 2, 190);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '22px Georgia, serif';
  ctx.fillText('Defend the last Heartflame against the ash', CANVAS_W / 2, 232);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('WASD to move · Mouse to aim · Hold click to shoot · Pick 1 of 3 boons between waves', CANVAS_W / 2, 268);
  const pulse = 0.8 + 0.2 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.emberHot;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('CLICK TO BEGIN', CANVAS_W / 2, 428);
  ctx.globalAlpha = 1;
  if (state.best > 0) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Best score: ${state.best}`, CANVAS_W / 2, 466);
  }
  ctx.textAlign = 'left';
}

export function upgradeCardRects() {
  const cardW = 300;
  const cardH = 210;
  const gap = 36;
  const total = cardW * 3 + gap * 2;
  let x = (CANVAS_W - total) / 2;
  const rects = [];
  for (let i = 0; i < 3; i++) {
    rects.push({ x, y: 210, w: cardW, h: cardH });
    x += cardW + gap;
  }
  return rects;
}

export function drawUpgrade(ctx, state, time) {
  drawWorld(ctx, state, time);
  ctx.fillStyle = 'rgba(8, 5, 18, 0.66)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ember;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(`WAVE ${state.wave} CLEARED`, CANVAS_W / 2, 110);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Choose a boon — the ash returns soon', CANVAS_W / 2, 146);

  const cardW = 300;
  const cardH = 210;
  const gap = 36;
  const total = cardW * 3 + gap * 2;
  let x = (CANVAS_W - total) / 2;
  const y = 210;
  state.offers.forEach((offer, i) => {
    ctx.fillStyle = PALETTE.card;
    rr(ctx, x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.cardEdge;
    ctx.lineWidth = 2;
    rr(ctx, x, y, cardW, cardH, 12);
    ctx.stroke();
    ctx.fillStyle = PALETTE.emberHot;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`PRESS ${i + 1}`, x + cardW / 2, y + 36);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText(offer.name, x + cardW / 2, y + 84);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '17px system-ui, sans-serif';
    wrapText(ctx, offer.desc, x + cardW / 2, y + 122, cardW - 44, 24);
    x += cardW + gap;
  });

  // Intermission timer.
  const frac = Math.max(0, state.intermission / 6);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(CANVAS_W / 2 - 150, 470, 300, 8);
  ctx.fillStyle = PALETTE.ember;
  ctx.fillRect(CANVAS_W / 2 - 150, 470, 300 * frac, 8);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Next wave in ' + Math.ceil(state.intermission) + 's — no pick means the middle boon', CANVAS_W / 2, 500);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, yy);
}

export function drawGameOver(ctx, state) {
  drawWorld(ctx, state, state.time);
  ctx.fillStyle = 'rgba(8, 5, 18, 0.78)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.danger;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('THE LIGHT FADES', CANVAS_W / 2, 170);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px Georgia, serif';
  ctx.fillText('The ash takes the ring — for now.', CANVAS_W / 2, 210);

  const stats = [
    ['SCORE', String(state.score)],
    ['WAVES SURVIVED', String(Math.max(0, state.wave - 1))],
    ['WRAITHS SLAIN', String(state.kills)],
    ['SHARDS GATHERED', String(state.shards)],
    ['BEST SCORE', String(state.best)],
  ];
  let y = 290;
  for (const [label, value] of stats) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(label, CANVAS_W / 2 - 130, y);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(value, CANVAS_W / 2 - 40, y);
    ctx.textAlign = 'center';
    y += 38;
  }
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.emberHot;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO TRY AGAIN', CANVAS_W / 2, 540);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function drawWorld(ctx, state, time) {
  ctx.save();
  if (state.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackground(ctx, time);
  drawHeartflame(ctx, time);

  for (const pk of state.pickups) {
    if (pk.kind === 'shard') {
      ctx.fillStyle = PALETTE.shard;
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.rotate(time * 2 + pk.x);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    } else {
      ctx.fillStyle = PALETTE.heart;
      ctx.beginPath();
      ctx.arc(pk.x - 4, pk.y - 2, 5, 0, Math.PI * 2);
      ctx.arc(pk.x + 4, pk.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pk.x - 8, pk.y);
      ctx.lineTo(pk.x + 8, pk.y);
      ctx.lineTo(pk.x, pk.y + 9);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (const e of state.enemies) drawEnemy(ctx, e, time);

  // Orbiting flames.
  const p = state.player;
  if (p && p.orbiters > 0) {
    for (let i = 0; i < p.orbiters; i++) {
      const a = state.orbitAngle + (i / p.orbiters) * Math.PI * 2;
      const ox = p.x + Math.cos(a) * 52;
      const oy = p.y + Math.sin(a) * 52;
      ctx.fillStyle = PALETTE.flame;
      ctx.beginPath();
      ctx.arc(ox, oy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.emberHot;
      ctx.beginPath();
      ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (p) drawPlayer(ctx, p, time);

  for (const b of state.bullets) {
    // A short trail and a glow, so a volley reads in a still frame.
    const bl = Math.hypot(b.vx, b.vy) || 1;
    const tx = (b.vx / bl) * 16;
    const ty = (b.vy / bl) * 16;
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.55)';
    ctx.lineWidth = b.radius;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - tx, b.y - ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = b.crit ? PALETTE.emberHot : PALETTE.ember;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, (b.radius + 1) * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of state.enemyBullets) {
    ctx.fillStyle = '#7ee0a3';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / 0.9);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.textAlign = 'left';
  }
  ctx.globalAlpha = 1;

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 40, 40, ${state.flash * 0.5})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  ctx.restore();

  drawHud(ctx, state);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(8, 5, 18, 0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 10);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Press P to keep playing', CANVAS_W / 2, CANVAS_H / 2 + 30);
  ctx.textAlign = 'left';
}
