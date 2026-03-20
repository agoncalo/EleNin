// ── Music System (Procedural step sequencer) ─────────────────
// Uses Web Audio API via audioCtx from audio.js
// In-sen scale (Japanese): A Bb D E G — gives ninja/samurai feel

const MUSIC_TRACKS = {
  // ── Menu — sparse, mysterious, koto-like ──
  menu: {
    bpm: 72, len: 64,
    ch: [
      // Melody — slow, contemplative (triangle)
      { w: 'triangle', v: 0.07, d: 0.5, p: [
        69,0,0,0, 0,0,0,0, 74,0,0,0, 76,0,74,0,
        70,0,0,0, 74,0,0,0, 69,0,0,0, 0,0,0,0,
        67,0,0,0, 0,0,0,0, 69,0,0,0, 74,0,0,0,
        76,0,0,0, 0,0,74,0, 69,0,0,0, 0,0,0,0,
      ]},
      // Low drone (sine)
      { w: 'sine', v: 0.05, d: 1.2, p: [
        45,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
        46,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
        45,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
        50,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
      ]},
      // High chime (triangle, very soft)
      { w: 'triangle', v: 0.03, d: 0.6, p: [
        0,0,0,0, 0,0,0,0, 0,0,81,0, 0,0,0,0,
        0,0,0,0, 0,0,0,0, 0,0,0,0, 82,0,0,0,
        0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,81,0,
        0,0,0,0, 0,0,0,0, 79,0,0,0, 0,0,0,0,
      ]},
    ]
  },

  // ── Stage 1 (waves 1–3) — moderate energy, driving ──
  stage1: {
    bpm: 126, len: 32,
    ch: [
      // Melody (square)
      { w: 'square', v: 0.05, d: 0.12, p: [
        69,0,74,0, 76,0,74,0, 69,0,67,0, 64,0,0,0,
        62,0,64,0, 69,0,74,0, 76,0,74,0, 69,0,0,0,
      ]},
      // Bass (sawtooth)
      { w: 'sawtooth', v: 0.06, d: 0.12, p: [
        45,0,0,45, 0,0,45,0, 50,0,0,50, 0,0,50,0,
        46,0,0,46, 0,0,46,0, 45,0,0,45, 0,50,0,0,
      ]},
      // Kick
      { t: 'k', v: 0.09, p: [
        1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0,
        1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0,
      ]},
      // Hihat (offbeats)
      { t: 'h', v: 0.03, p: [
        0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
        0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
      ]},
    ]
  },

  // ── Stage 2 (waves 4–6) — more ornamental, busier ──
  stage2: {
    bpm: 138, len: 32,
    ch: [
      // Melody (square)
      { w: 'square', v: 0.05, d: 0.1, p: [
        69,0,70,74, 76,0,74,70, 69,0,67,0, 64,62,64,0,
        69,0,74,76, 79,0,76,74, 69,0,70,0, 67,64,62,0,
      ]},
      // Harmony arpeggio (triangle)
      { w: 'triangle', v: 0.035, d: 0.08, p: [
        0,57,0,62, 0,64,0,57, 0,62,0,64, 0,67,0,64,
        0,58,0,62, 0,64,0,58, 0,57,0,52, 0,57,0,62,
      ]},
      // Bass (sawtooth)
      { w: 'sawtooth', v: 0.07, d: 0.1, p: [
        45,0,45,0, 50,0,50,0, 46,0,46,0, 45,0,50,0,
        52,0,52,0, 50,0,50,0, 46,0,45,0, 46,0,0,0,
      ]},
      // Kick
      { t: 'k', v: 0.09, p: [
        1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0,
        1,0,0,0, 1,0,0,1, 1,0,0,0, 1,0,1,0,
      ]},
      // Hihat (8ths)
      { t: 'h', v: 0.03, p: [
        1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
        1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
      ]},
      // Snare (beats 2 & 4)
      { t: 's', v: 0.05, p: [
        0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
        0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
      ]},
    ]
  },

  // ── Stage 3 (waves 7–10) — intense, fast arpeggios ──
  stage3: {
    bpm: 150, len: 32,
    ch: [
      // Melody (square, fast runs)
      { w: 'square', v: 0.05, d: 0.08, p: [
        69,74,76,0, 79,76,74,69, 67,64,62,0, 64,67,69,74,
        76,79,0,76, 74,69,67,64, 62,0,64,67, 69,74,76,0,
      ]},
      // Bass (sawtooth, heavy)
      { w: 'sawtooth', v: 0.08, d: 0.08, p: [
        45,0,45,45, 0,0,50,0, 50,0,50,50, 0,0,52,0,
        46,0,46,46, 0,0,50,0, 45,0,45,0, 50,0,52,0,
      ]},
      // Kick (syncopated)
      { t: 'k', v: 0.1, p: [
        1,0,0,1, 1,0,0,0, 1,0,0,1, 1,0,0,0,
        1,0,0,1, 1,0,0,1, 1,0,0,0, 1,0,1,1,
      ]},
      // Hihat (driving)
      { t: 'h', v: 0.03, p: [
        1,1,1,0, 1,1,1,0, 1,1,1,0, 1,1,1,0,
        1,1,1,0, 1,1,1,0, 1,1,1,0, 1,1,1,1,
      ]},
      // Snare
      { t: 's', v: 0.06, p: [
        0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
        0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0,
      ]},
    ]
  },

  // ── Boss — dark, heavy, menacing ──
  boss: {
    bpm: 152, len: 32,
    ch: [
      // Melody (sawtooth, low & aggressive)
      { w: 'sawtooth', v: 0.05, d: 0.12, s: -20, p: [
        57,0,62,0, 57,0,58,0, 55,0,0,0, 57,62,0,57,
        64,0,62,0, 58,0,57,0, 55,0,52,0, 50,46,45,0,
      ]},
      // Power stab (square)
      { w: 'square', v: 0.06, d: 0.18, p: [
        0,0,0,0, 0,0,0,0, 57,0,0,0, 0,0,0,0,
        0,0,0,0, 0,0,0,0, 0,0,0,0, 62,0,58,0,
      ]},
      // Bass (sawtooth, very heavy)
      { w: 'sawtooth', v: 0.09, d: 0.1, p: [
        33,0,33,33, 0,33,0,0, 38,0,38,38, 0,38,0,0,
        34,0,34,34, 0,34,0,0, 33,0,33,38, 0,33,0,0,
      ]},
      // Kick (aggressive double-time feel)
      { t: 'k', v: 0.11, p: [
        1,0,1,0, 1,0,0,1, 1,0,1,0, 1,0,0,1,
        1,0,1,0, 1,0,0,1, 1,0,1,0, 1,0,1,1,
      ]},
      // Snare (heavy)
      { t: 's', v: 0.07, p: [
        0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
        0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,0,
      ]},
      // Hihat
      { t: 'h', v: 0.03, p: [
        1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
        1,0,1,0, 1,0,1,0, 1,0,1,0, 1,1,1,1,
      ]},
    ]
  },

  // ── Final Boss — maximum intensity, relentless ──
  finalBoss: {
    bpm: 166, len: 32,
    ch: [
      // Melody (square, frantic)
      { w: 'square', v: 0.055, d: 0.08, p: [
        69,74,76,0, 70,76,74,69, 67,64,0,69, 70,74,76,79,
        76,74,0,70, 69,67,64,62, 58,0,62,64, 67,69,74,0,
      ]},
      // Counter melody (triangle)
      { w: 'triangle', v: 0.04, d: 0.1, p: [
        0,57,0,62, 0,64,0,57, 0,58,0,57, 0,62,0,64,
        0,62,0,58, 0,57,0,52, 0,50,0,52, 0,57,0,62,
      ]},
      // Bass (sawtooth, relentless)
      { w: 'sawtooth', v: 0.1, d: 0.08, p: [
        33,33,0,33, 33,0,38,0, 38,38,0,38, 33,0,33,0,
        34,34,0,34, 33,0,38,0, 40,0,38,0, 33,34,33,0,
      ]},
      // Sub bass (sine, rumble)
      { w: 'sine', v: 0.07, d: 0.3, p: [
        33,0,0,0, 0,0,0,0, 38,0,0,0, 0,0,0,0,
        34,0,0,0, 0,0,0,0, 33,0,0,0, 0,0,0,0,
      ]},
      // Kick (relentless 8ths)
      { t: 'k', v: 0.11, p: [
        1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
        1,0,1,0, 1,0,1,1, 1,0,1,0, 1,1,1,1,
      ]},
      // Snare
      { t: 's', v: 0.07, p: [
        0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1,
        0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,1,
      ]},
      // Hihat (constant 16ths)
      { t: 'h', v: 0.025, p: [
        1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
        1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
      ]},
    ]
  },
};

// ── Sequencer Engine ─────────────────────────────────────────
const Music = {
  playing: false,
  current: null,
  step: 0,
  master: null,
  timer: null,
  vol: 0.18,

  _ntof(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  _init() {
    if (this.master) return;
    this.master = audioCtx.createGain();
    this.master.gain.value = 0;
    this.master.connect(audioCtx.destination);
  },

  _osc(freq, type, dur, vol, slide) {
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.linearRampToValueAtTime(vol * 0.4, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(t + dur);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  },

  _noise(dur, vol) {
    const t = audioCtx.currentTime;
    const len = Math.max(1, audioCtx.sampleRate * dur | 0);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = audioCtx.createBufferSource();
    const g = audioCtx.createGain();
    s.buffer = buf;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(g);
    g.connect(this.master);
    s.start();
    s.stop(t + dur);
    s.onended = () => { s.disconnect(); g.disconnect(); };
  },

  _kick(vol) {
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.1);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(t + 0.15);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  },

  _snare(vol) {
    this._noise(0.1, vol);
    this._osc(180, 'triangle', 0.06, vol * 0.4, -80);
  },

  play(name) {
    if (this.current === name && this.playing) return;
    const track = MUSIC_TRACKS[name];
    if (!track) return;
    this._init();

    // Stop previous timer
    if (this.timer) { clearInterval(this.timer); this.timer = null; }

    this.current = name;
    this.playing = true;
    this.step = 0;

    // Crossfade
    const t = audioCtx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(this.vol, t + 0.6);

    const interval = (60 / track.bpm / 4) * 1000;
    this.timer = setInterval(() => {
      if (audioCtx.state === 'suspended') return;
      const s = this.step % track.len;
      const stepDur = 60 / track.bpm / 4;
      for (const ch of track.ch) {
        const val = ch.p[s % ch.p.length];
        if (!val) continue;
        if (ch.t === 'k') this._kick(ch.v || 0.1);
        else if (ch.t === 'h') this._noise(0.03, ch.v || 0.03);
        else if (ch.t === 's') this._snare(ch.v || 0.05);
        else this._osc(this._ntof(val), ch.w || 'triangle', ch.d || stepDur * 2, ch.v || 0.06, ch.s || 0);
      }
      this.step++;
    }, interval);
  },

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.master) {
      const t = audioCtx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + 0.5);
    }
    this.playing = false;
    this.current = null;
  },
};
