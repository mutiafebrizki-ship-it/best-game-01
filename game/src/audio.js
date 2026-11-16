// Emberfall: every sound is synthesised with WebAudio — no audio files, no
// network. The context is created lazily on the first user gesture; every
// call before that is a safe no-op.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ freq, endFreq, dur, type = 'sine', vol = 0.5, delay = 0 }) {
    if (muted || !ensure()) return;
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      /* sound is decoration; never break the game */
    }
  }

  function noise({ dur, vol = 0.4, delay = 0, low = 400 }) {
    if (muted || !ensure()) return;
    try {
      const t0 = ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = low;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t0);
    } catch {
      /* sound is decoration; never break the game */
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone({ freq: 720, endFreq: 240, dur: 0.09, type: 'triangle', vol: 0.22 });
    },
    hit() {
      noise({ dur: 0.06, vol: 0.25, low: 900 });
    },
    enemyDie() {
      tone({ freq: 320, endFreq: 60, dur: 0.22, type: 'sawtooth', vol: 0.2 });
      noise({ dur: 0.14, vol: 0.2, low: 700 });
    },
    hurt() {
      tone({ freq: 160, endFreq: 70, dur: 0.25, type: 'square', vol: 0.3 });
    },
    pickup() {
      tone({ freq: 880, endFreq: 1320, dur: 0.12, type: 'sine', vol: 0.25 });
    },
    heal() {
      tone({ freq: 520, endFreq: 780, dur: 0.18, type: 'sine', vol: 0.3 });
      tone({ freq: 780, endFreq: 1040, dur: 0.18, type: 'sine', vol: 0.2, delay: 0.09 });
    },
    waveClear() {
      [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.28, delay: i * 0.09 }));
    },
    upgrade() {
      [392, 523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.25, delay: i * 0.07 }));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.28, delay: i * 0.16 }));
    },
    click() {
      tone({ freq: 600, dur: 0.05, type: 'sine', vol: 0.2 });
    },
  };
}
