// ── Sound System (Web Audio API) ─────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function ensureAudio() {
  if (audioCtx.state === 'suspended') {
    const resume = audioCtx.resume();
    if (resume && resume.then) resume.then(() => {
      if (typeof Music !== 'undefined' && Music._wake) Music._wake();
    });
  } else if (typeof Music !== 'undefined' && Music._wake) {
    Music._wake();
  }
  if (typeof SFX !== 'undefined' && SFX.loadSamples) SFX.loadSamples();
}
document.addEventListener('keydown', ensureAudio, { once: true });
document.addEventListener('click', ensureAudio, { once: true });
document.addEventListener('mousedown', ensureAudio, { once: true });
document.addEventListener('mousemove', ensureAudio, { once: true });
document.addEventListener('touchstart', ensureAudio, { once: true });
document.addEventListener('pointerdown', ensureAudio, { once: true });

const SFX = {
  muted: false,
  pulseGain: 2.25,
  _samplesReady: false,
  _lastMonsterHurtAt: -999,
  _lastMonsterDeathAt: -999,
  samplePaths: {
    shuriken: ['assets/sfx/shuriken_toss.wav', 'assets/sfx/shuriken.wav'],
    struck: ['assets/sfx/struck.wav'],
    shieldStruck: ['assets/sfx/shield_struck.wav'],
    hurtMale: ['assets/sfx/hurt_male.wav'],
    hurtFemale: ['assets/sfx/hurt_female.wav'],
    monsterHurt: ['assets/sfx/monster_hurt_1.wav', 'assets/sfx/monster_hurt_2.wav'],
    monsterDeath: ['assets/sfx/monster_death.wav'],
    playerDeath: ['assets/sfx/player_death.wav'],
    chain: ['assets/sfx/chain_1.wav', 'assets/sfx/chain_2.wav', 'assets/sfx/chain_3.wav', 'assets/sfx/chain_4.wav', 'assets/sfx/chain_5.wav', 'assets/sfx/chain_6.wav']
  },
  samples: {},
  loadSamples() {
    if (this._samplesReady) return;
    this._samplesReady = true;
    this.samples = {};
    for (const [name, paths] of Object.entries(this.samplePaths)) {
      this.samples[name] = paths.map(path => {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.load();
        return audio;
      });
    }
  },
  sample(name, fallback, volume = 1) {
    if (this.muted) return;
    this.loadSamples();
    const bank = this.samples[name] || [];
    const ready = bank.filter(a => a.readyState >= 2);
    const src = ready.length ? ready[Math.floor(Math.random() * ready.length)] : bank[0];
    if (!src || src.readyState < 2) {
      if (fallback) fallback();
      return;
    }
    const inst = src.cloneNode(true);
    inst.volume = Math.max(0, Math.min(1, volume));
    const p = inst.play();
    if (p && p.catch) p.catch(() => { if (fallback) fallback(); });
  },
  play(freq, type, duration, vol = 0.15, slide = 0) {
    if (this.muted) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, audioCtx.currentTime + duration);
    const outVol = Math.max(0.001, vol * this.pulseGain);
    g.gain.setValueAtTime(outVol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + duration);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  },
  noise(duration, vol = 0.08) {
    if (this.muted) return;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    const g = audioCtx.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    src.connect(g); g.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + duration);
    src.onended = () => { src.disconnect(); g.disconnect(); };
  },
  filteredNoise(duration, vol = 0.08, type = 'bandpass', freq = 1200, q = 0.8, attack = 0.002) {
    if (this.muted) return;
    const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    src.buffer = buf;
    filter.type = type;
    filter.frequency.setValueAtTime(freq, audioCtx.currentTime);
    filter.Q.setValueAtTime(q, audioCtx.currentTime);
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + duration);
    src.onended = () => { src.disconnect(); filter.disconnect(); g.disconnect(); };
  },
  noiseSweep(duration, vol = 0.08, type = 'bandpass', startFreq = 900, endFreq = 3000, q = 1.0, attack = 0.002) {
    if (this.muted) return;
    const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    src.buffer = buf;
    filter.type = type;
    filter.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), audioCtx.currentTime + duration);
    filter.Q.setValueAtTime(q, audioCtx.currentTime);
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + duration);
    src.onended = () => { src.disconnect(); filter.disconnect(); g.disconnect(); };
  },
  tone(freq, type, duration, vol = 0.08, slide = 0, attack = 0.003) {
    if (this.muted) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), audioCtx.currentTime + duration);
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + duration);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  },
  thump(freq = 80, vol = 0.14, duration = 0.18) {
    this.tone(freq, 'sine', duration, vol, -Math.max(20, freq * 0.45), 0.001);
    this.filteredNoise(duration * 0.75, vol * 0.45, 'lowpass', 180, 0.7, 0.001);
  },
  metal(freq = 900, vol = 0.08, duration = 0.12) {
    this.tone(freq, 'triangle', duration, vol, -freq * 0.18, 0.001);
    this.tone(freq * 1.52, 'sine', duration * 0.75, vol * 0.45, -freq * 0.12, 0.001);
    this.filteredNoise(duration * 0.65, vol * 0.55, 'bandpass', freq * 1.8, 3.5, 0.001);
  },
  bladeSwish(power = 1) {
    const p = Math.max(0.5, Math.min(1.8, power));
    this.noiseSweep(0.13 + p * 0.025, 0.07 * p, 'highpass', 650, 3600 + p * 900, 0.55, 0.001);
    this.noiseSweep(0.08, 0.035 * p, 'bandpass', 2200, 5200, 1.4, 0.001);
    this.tone(1150 + Math.random() * 220, 'sine', 0.045, 0.018 * p, 180, 0.001);
  },
  chainSwish() {
    this.noiseSweep(0.11, 0.075, 'highpass', 900, 5200, 0.65, 0.001);
    this.noiseSweep(0.07, 0.035, 'bandpass', 3200, 7600, 1.7, 0.001);
    this.metal(1450 + Math.random() * 420, 0.025, 0.05);
  },
  vocalGrunt(gender = 'male') {
    if (this.muted) return;
    const female = gender === 'female';
    const now = audioCtx.currentTime;
    const dur = female ? 0.18 : 0.21;
    const base = female ? 235 + Math.random() * 35 : 112 + Math.random() * 28;
    const end = base * (female ? 0.72 : 0.64);
    const src = audioCtx.createOscillator();
    const formA = audioCtx.createBiquadFilter();
    const formB = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    src.type = 'sawtooth';
    src.frequency.setValueAtTime(base, now);
    src.frequency.exponentialRampToValueAtTime(end, now + dur);
    formA.type = 'bandpass';
    formA.frequency.setValueAtTime(female ? 880 : 560, now);
    formA.Q.setValueAtTime(female ? 5.5 : 4.5, now);
    formB.type = 'bandpass';
    formB.frequency.setValueAtTime(female ? 1850 : 1120, now);
    formB.Q.setValueAtTime(3.2, now);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(female ? 0.055 : 0.075, now + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(formA); src.connect(formB);
    formA.connect(g); formB.connect(g); g.connect(audioCtx.destination);
    src.start(now); src.stop(now + dur);
    src.onended = () => { src.disconnect(); formA.disconnect(); formB.disconnect(); g.disconnect(); };
    this.filteredNoise(dur * 0.55, female ? 0.018 : 0.024, 'bandpass', female ? 1450 : 820, 1.1, 0.004);
  },
  hurtVoiceForNinja(ninjaType) {
    const femaleTypes = { wind: true, bubble: true, crystal: true };
    const maleTypes = { earth: true, shadow: true, storm: true, fire: true };
    if (femaleTypes[ninjaType]) return 'female';
    if (maleTypes[ninjaType]) return 'male';
    return Math.random() < 0.5 ? 'female' : 'male';
  },
  attack() {
    this.bladeSwish(1);
  },
  hit() {
    this.sample('struck', () => {
      this.filteredNoise(0.075, 0.06, 'bandpass', 900, 1.5, 0.001);
      this.filteredNoise(0.035, 0.04, 'highpass', 2700, 0.8, 0.001);
    });
  },
  enemyHurt() {
    const now = audioCtx.currentTime;
    if (now - this._lastMonsterHurtAt < 0.5) return;
    this._lastMonsterHurtAt = now;
    this.sample('monsterHurt', () => {
      this.filteredNoise(0.12, 0.07, 'bandpass', 360, 1.2, 0.001);
      this.tone(120 + Math.random() * 35, 'sawtooth', 0.16, 0.045, -55, 0.002);
    }, 0.58);
  },
  enemyDie() {
    const now = audioCtx.currentTime;
    if (now - this._lastMonsterDeathAt < 0.5) return;
    this._lastMonsterDeathAt = now;
    this.sample('monsterDeath', () => {
      this.thump(70, 0.16, 0.23);
      this.filteredNoise(0.28, 0.12, 'lowpass', 520, 0.8, 0.003);
      this.filteredNoise(0.16, 0.055, 'bandpass', 1300, 1.2, 0.001);
    }, 0.72);
  },
  playerHurt(ninjaType) {
    const gender = this.hurtVoiceForNinja(ninjaType);
    this.sample(gender === 'female' ? 'hurtFemale' : 'hurtMale', () => {
      this.vocalGrunt(gender);
      this.filteredNoise(0.09, 0.045, 'bandpass', 760, 1.2, 0.001);
    }, 0.45);
  },
  playerDie() {
    this.sample('playerDeath', () => {
      this.vocalGrunt('male');
      this.thump(54, 0.18, 0.34);
      this.filteredNoise(0.34, 0.11, 'lowpass', 480, 0.8, 0.004);
    }, 0.72);
  },
  jump() {
    this.play(260, 'square', 0.1, 0.06, 180);
  },
  special() {
    this.play(500, 'triangle', 0.15, 0.1, 200);
    setTimeout(() => this.play(760, 'triangle', 0.10, 0.075, 120), 55);
  },
  parry() {
    this.metal(1250, 0.12, 0.12);
    this.metal(1850, 0.07, 0.09);
  },
  parryFail() {
    this.metal(420, 0.055, 0.12);
    this.filteredNoise(0.08, 0.04, 'bandpass', 500, 1.4, 0.001);
  },
  shuriken() {
    this.sample('shuriken', () => {
      this.noiseSweep(0.08, 0.055, 'highpass', 1800, 6200, 0.8, 0.001);
      this.metal(1650, 0.035, 0.055);
    });
  },
  bossDie() {
    this.thump(42, 0.23, 0.46);
    this.filteredNoise(0.55, 0.18, 'lowpass', 420, 0.9, 0.004);
    setTimeout(() => this.thump(34, 0.18, 0.38), 120);
  },
  bossSpawn() {
    this.thump(48, 0.18, 0.36);
    this.filteredNoise(0.38, 0.12, 'lowpass', 300, 1.0, 0.004);
  },
  wave() { this.play(440, 'triangle', 0.15, 0.1); setTimeout(() => this.play(660, 'triangle', 0.15, 0.1), 120); setTimeout(() => this.play(880, 'triangle', 0.2, 0.1), 240); },
  armor() {
    this.sample('shieldStruck', () => {
      this.metal(620, 0.10, 0.15);
      this.filteredNoise(0.09, 0.055, 'bandpass', 1200, 2.2, 0.001);
    });
  },
  chain() {
    this.play(700, 'square', 0.05, 0.08, 200);
    this.chainSwish();
    this.sample('chain', null, 0.72);
  },
  slam() {
    this.thump(52, 0.22, 0.26);
    this.filteredNoise(0.22, 0.13, 'lowpass', 260, 0.8, 0.001);
  },
  pickup() { this.play(520, 'triangle', 0.08, 0.1); setTimeout(() => this.play(780, 'triangle', 0.1, 0.1), 80); },
  reflect() {
    this.metal(1900, 0.11, 0.09);
    this.filteredNoise(0.055, 0.045, 'highpass', 3200, 1.1, 0.001);
  },
  miss() {
    this.filteredNoise(0.11, 0.045, 'highpass', 1100, 0.55, 0.001);
  },
  backstab() {
    this.bladeSwish(1.25);
    this.filteredNoise(0.055, 0.045, 'bandpass', 760, 1.5, 0.001);
  },
  counterSwish() {
    this.bladeSwish(1.5);
    this.metal(1050, 0.07, 0.11);
  },
  glassBreak() {
    this.filteredNoise(0.18, 0.12, 'highpass', 2600, 1.2, 0.001);
    this.metal(1800, 0.08, 0.08);
    this.metal(2450, 0.055, 0.06);
  },
  shock() {
    this.filteredNoise(0.13, 0.07, 'bandpass', 2400, 4.5, 0.001);
    this.metal(720, 0.055, 0.11);
  },
  windCrash() {
    this.filteredNoise(0.22, 0.16, 'highpass', 700, 0.55, 0.001);
    this.thump(58, 0.17, 0.18);
  },
  victory() { [440,550,660,880].forEach((f,i) => setTimeout(() => this.play(f, 'triangle', 0.25, 0.12), i * 150)); },
  bossRoar() {
    // Deep, sustained growl — layered low oscillators + rumble
    this.play(38, 'sawtooth', 0.9, 0.2, -15);
    this.play(42, 'square', 0.8, 0.1, -10);
    this.play(55, 'sawtooth', 0.7, 0.14, -25);
    this.noise(0.7, 0.18);
    setTimeout(() => {
      this.play(32, 'sawtooth', 0.6, 0.18, -12);
      this.play(48, 'square', 0.5, 0.08, -18);
      this.noise(0.5, 0.14);
    }, 250);
    setTimeout(() => {
      this.play(28, 'sawtooth', 0.5, 0.15, -8);
      this.noise(0.4, 0.1);
    }, 550);
  },
};
