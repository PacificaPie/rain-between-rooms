/* 雨停之前 · original procedural chamber score; no recordings or external requests. */
(() => {
  'use strict';
  const beat = 60 / 62;
  const harmony = [
    [50, 57, 62, 65], [46, 53, 57, 62], [43, 55, 58, 64], [45, 55, 59, 64],
    [50, 57, 60, 65], [48, 55, 58, 64], [46, 53, 57, 62], [45, 52, 59, 65],
    [43, 53, 58, 62], [46, 53, 60, 65], [50, 57, 62, 65], [48, 55, 58, 64],
    [46, 57, 62, 65], [43, 55, 58, 64], [45, 52, 59, 64], [50, 57, 62, 64]
  ];
  // [start beat, MIDI pitch, duration in beats]. Silence is part of the melody.
  const melody = [
    [[0, 69, 1.3], [1.75, 64, .6], [2.5, 65, .45]],
    [[.5, 62, 1.6]],
    [[0, 67, .8], [1.5, 65, .6], [2.25, 64, .5]],
    [[.25, 59, 1.5], [2.25, 61, .5]],
    [[0, 65, 1], [1.5, 69, 1.1]],
    [[.5, 67, .8], [2, 64, .7]],
    [[0, 62, 1.6], [2.25, 60, .45]],
    [[.5, 61, 1.5]],
    [[0, 62, .75], [1.25, 65, .8], [2.25, 67, .5]],
    [[.5, 69, 1.7]],
    [[0, 65, 1.2], [1.75, 64, .6]],
    [[.25, 62, 1], [1.75, 58, .7]],
    [[0, 60, .8], [1.5, 62, .65], [2.5, 65, .4]],
    [[.5, 64, 1.5]],
    [[0, 61, .8], [1.5, 59, .7]],
    [[.25, 62, 2.25]]
  ];
  let ctx, master, dry, wet, reverb, rain;
  let timer = null, enabled = false, paused = false, scene = 0;
  let nextBar = 0, bar = 0, generation = 0;
  const active = new Set();
  const hz = note => 440 * Math.pow(2, (note - 69) / 12);
  let seed = 72531;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  // Close, quiet object sounds use their own bus and random stream. They never
  // alter the score's notes, timing, reverb or seeded rain generation above.
  let fxBus = null, fxWhite = null, fxSoft = null, fxSeed = 90521;
  const fxActive = new Set(), fxLast = new Map();
  const fxGap = { dial: .075, latch: .22, paper: .16, cloth: .16, stitch: .10,
    unthread: .27, key: .18, switch: .12, door: .38, pickup: .13, tick: .065, pulley: .35 };
  const fxRandom = () => ((fxSeed = (fxSeed * 1664525 + 1013904223) >>> 0) / 4294967296);

  function prepareFx() {
    if (fxBus) return;
    fxBus = ctx.createGain(); fxBus.gain.value = .72; fxBus.connect(master);
    fxWhite = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .85), ctx.sampleRate);
    fxSoft = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .85), ctx.sampleRate);
    const white = fxWhite.getChannelData(0), soft = fxSoft.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < white.length; i++) {
      const value = fxRandom() * 2 - 1;
      previous = .91 * previous + .09 * value;
      white[i] = value; soft[i] = previous * 2.4;
    }
  }

  function clearFx() {
    for (const token of [...fxActive]) token.cancel();
    fxLast.clear();
  }

  function objectVoice({ at, duration, volume, center, q = .65, tone = false, endPitch,
    soft = false, flutter = 0, attack = .004 }) {
    if (!ctx || !fxBus || fxActive.size >= 24) return;
    const source = tone ? ctx.createOscillator() : ctx.createBufferSource();
    const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    if (tone) {
      source.type = 'sine'; source.frequency.setValueAtTime(center, at);
      if (endPitch) source.frequency.exponentialRampToValueAtTime(endPitch, at + duration);
      filter.type = 'lowpass'; filter.frequency.value = 2800;
    } else {
      source.buffer = soft ? fxSoft : fxWhite;
      filter.type = 'bandpass'; filter.frequency.value = center;
    }
    filter.Q.value = q;
    source.connect(filter); filter.connect(gain); gain.connect(fxBus);
    const rise = Math.min(attack, duration * .25), peak = Math.max(.00002, volume);
    gain.gain.setValueAtTime(.00001, at);
    gain.gain.linearRampToValueAtTime(peak, at + rise);
    if (flutter) {
      for (let i = 1; i <= flutter; i++) {
        gain.gain.linearRampToValueAtTime(peak * (.24 + fxRandom() * .5),
          at + rise + (duration - rise) * i / (flutter + 1));
      }
    }
    gain.gain.exponentialRampToValueAtTime(.00001, at + duration);
    let disconnected = false;
    const cleanup = () => {
      if (disconnected) return;
      disconnected = true;
      for (const node of [source, filter, gain]) { try { node.disconnect(); } catch (_) {} }
      fxActive.delete(token);
    };
    const token = { cancel() { try { source.stop(); } catch (_) {} cleanup(); } };
    fxActive.add(token); source.onended = cleanup;
    try { source.start(at); source.stop(at + duration + .015); }
    catch (_) { token.cancel(); }
  }

  function fx(name, intensity = 1) {
    if (!ctx || !enabled || paused || document.hidden || ctx.state !== 'running' ||
      !Object.prototype.hasOwnProperty.call(fxGap, name)) return false;
    const input = Number(intensity), amount = Number.isFinite(input) ? Math.max(0, Math.min(1.4, input)) : 1;
    if (amount === 0 || fxActive.size >= 24) return false;
    const now = ctx.currentTime;
    if (now - (fxLast.get(name) ?? -Infinity) < fxGap[name]) return false;
    fxLast.set(name, now);
    try {
      prepareFx();
      const at = now + .008;
      const noise = (delay, duration, volume, center, soft = false, flutter = 0) =>
        objectVoice({ at: at + delay, duration, volume: volume * amount, center, soft, flutter,
          attack: flutter ? .018 : .003 });
      const knock = (delay, duration, volume, center, endPitch) =>
        objectVoice({ at: at + delay, duration, volume: volume * amount, center, endPitch, tone: true });
      switch (name) {
        case 'dial': // One worn brass detent, with a muted wooden body.
          noise(0, .027, .17, 1150); knock(.006, .065, .14, 270, 190); break;
        case 'latch':
          noise(0, .13, .17, 650, true, 3); knock(.035, .12, .20, 210, 125);
          noise(.095, .038, .12, 1430); break;
        case 'paper': // Broad, irregular dry friction rather than a pitched cue.
          noise(0, .29, .19, 1600, false, 9); noise(.07, .18, .10, 650, true, 6); break;
        case 'cloth':
          noise(0, .34, .21, 480, true, 8); noise(.12, .12, .07, 1150, false, 4); break;
        case 'stitch':
          noise(0, .105, .15, 1500, false, 4); knock(.015, .027, .055, 1250, 1050); break;
        case 'unthread':
          noise(0, .37, .18, 1120, false, 12); noise(.09, .26, .12, 440, true, 8); break;
        case 'key': // Short non-harmonic metal taps; deliberately not a chord.
          knock(0, .11, .09, 1630, 1510); knock(.035, .085, .055, 2260, 2170);
          noise(.012, .045, .13, 780); break;
        case 'switch':
          noise(0, .022, .18, 1850); knock(.014, .065, .15, 410, 240); break;
        case 'door':
          noise(0, .39, .15, 380, true, 8); knock(.055, .26, .045, 220, 163);
          knock(.30, .17, .22, 105, 68); noise(.30, .06, .11, 470, true); break;
        case 'pickup':
          noise(0, .095, .11, 750, true, 3); knock(.018, .06, .10, 185, 140); break;
        case 'tick':
          noise(0, .018, .105, 1780); knock(.006, .034, .065, 730, 620); break;
        case 'pulley':
          noise(0, .54, .17, 620, true, 14); noise(.07, .43, .095, 1450, false, 12);
          knock(.09, .07, .06, 270, 210); knock(.31, .075, .055, 245, 185); break;
      }
      return true;
    } catch (_) {
      // Sound feedback must never prevent a physical game action from finishing.
      return false;
    }
  }

  function envelope(node, at, peak, hold, attack, release) {
    node.gain.setValueAtTime(.00001, at);
    node.gain.exponentialRampToValueAtTime(Math.max(.00002, peak), at + attack);
    node.gain.exponentialRampToValueAtTime(Math.max(.00002, peak * .5), at + attack + hold);
    node.gain.exponentialRampToValueAtTime(.00001, at + attack + hold + release);
  }

  function voice(note, at, duration, volume, bowed = false) {
    if (!ctx || !dry) return;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(bowed ? 1350 : 2450, at);
    filter.Q.value = .45;
    const pan = ctx.createStereoPanner();
    pan.pan.value = bowed ? (note % 5 - 2) * .12 : (note - 62) * .025;
    gain.connect(filter); filter.connect(pan); pan.connect(dry); pan.connect(reverb);
    const attack = bowed ? .72 : .014;
    const release = bowed ? 1.05 : 1.6;
    envelope(gain, at, volume, duration, attack, release);
    const end = at + attack + duration + release + .06;
    const group = [];
    // Smooth fundamentals plus quiet partials; no sawtooth, piercing bells or samples.
    const partials = bowed ? [[1, .65, -3], [1, .3, 3], [2, .06, 0]] : [[1, .8, 0], [2, .17, 0], [3, .035, -1]];
    partials.forEach(([ratio, level, cents]) => {
      const osc = ctx.createOscillator();
      const part = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = hz(note) * ratio; osc.detune.value = cents;
      part.gain.value = level;
      osc.connect(part); part.connect(gain);
      osc.start(at); osc.stop(end);
      group.push(osc, part);
    });
    const token = { group, gain, filter, pan };
    active.add(token);
    group[0].onended = () => {
      group.forEach(node => { try { node.disconnect(); } catch (_) {} });
      gain.disconnect(); filter.disconnect(); pan.disconnect(); active.delete(token);
    };
  }

  function scheduleBar(at, index) {
    const i = index % 16, chord = harmony[i];
    const density = [.78, .9, 1, .82][scene];
    voice(chord[0] - 12, at, beat * 2.1, .38 * density);
    // A soft left-hand waltz, deliberately missing occasional beats.
    [1, 2].forEach(b => {
      chord.slice(1).forEach((n, j) => voice(n, at + b * beat + j * .025, beat * .48, .14 * density));
    });
    if (index % 2 === 0) {
      chord.slice(1).forEach(n => voice(n - 12, at + .12, beat * 5.05, .075 * density, true));
    }
    melody[i].forEach(([offset, n, length]) => {
      voice(n, at + offset * beat, length * beat, .43 * density);
      if (scene === 3 && i % 4 === 3) voice(n - 12, at + offset * beat + .02, length * beat, .09);
    });
  }

  function schedule() {
    if (!ctx || ctx.state !== 'running' || !enabled || paused) return;
    // Recover cleanly if a throttled/background timer was delayed.
    if (nextBar < ctx.currentTime - .25) nextBar = ctx.currentTime + .08;
    while (nextBar < ctx.currentTime + .3) {
      scheduleBar(nextBar, bar++);
      nextBar += beat * 3;
    }
  }

  function beginTimer() {
    if (timer === null) timer = setInterval(schedule, 100);
    schedule();
  }

  function clearTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function makeContext() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    ctx = new Audio();
    master = ctx.createGain(); master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -15; limiter.knee.value = 18; limiter.ratio.value = 3;
    limiter.attack.value = .025; limiter.release.value = .35;
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass'; warmth.frequency.value = 3900;
    master.connect(warmth); warmth.connect(limiter); limiter.connect(ctx.destination);
    dry = ctx.createGain(); dry.gain.value = .8; dry.connect(master);
    reverb = ctx.createConvolver(); wet = ctx.createGain(); wet.gain.value = .23;
    reverb.connect(wet); wet.connect(master);
    const tail = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 2.35), ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = tail.getChannelData(channel);
      let smooth = 0;
      for (let n = 0; n < data.length; n++) {
        smooth = smooth * .65 + (random() * 2 - 1) * .35;
        data[n] = smooth * Math.pow(1 - n / data.length, 3.8);
      }
    }
    reverb.buffer = tail;
    const weather = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const samples = weather.getChannelData(0);
    let previous = 0;
    for (let n = 0; n < samples.length; n++) {
      previous = .985 * previous + .015 * (random() * 2 - 1);
      samples[n] = previous * 3;
    }
    rain = ctx.createBufferSource(); rain.buffer = weather; rain.loop = true;
    const rainFilter = ctx.createBiquadFilter(); rainFilter.type = 'lowpass'; rainFilter.frequency.value = 1600;
    const rainGain = ctx.createGain(); rainGain.gain.value = .1;
    rain.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(master); rain.start();
    nextBar = ctx.currentTime + .09; bar = 0;
    return true;
  }

  async function start() {
    const ownGeneration = generation;
    enabled = true;
    try {
      if (!ctx && !makeContext()) { enabled = false; return false; }
      if (paused || document.hidden) return true;
      await ctx.resume();
      if (generation !== ownGeneration || !ctx || !enabled) return false;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(.12, ctx.currentTime, .65);
      beginTimer();
      return true;
    } catch (_) { enabled = false; clearTimer(); return false; }
  }

  async function toggle() {
    if (!enabled) return start();
    enabled = false;
    clearTimer();
    clearFx();
    if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0, ctx.currentTime);
      try { await ctx.suspend(); } catch (_) {}
    }
    return false;
  }

  function suspend() {
    paused = true; clearTimer();
    clearFx();
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  }

  async function resume() {
    paused = false;
    if (enabled) return start();
    return false;
  }

  function stop() {
    generation++;
    enabled = false; paused = false; clearTimer();
    clearFx();
    if (fxBus) { try { fxBus.disconnect(); } catch (_) {} }
    fxBus = fxWhite = fxSoft = null;
    if (ctx) {
      const old = ctx;
      ctx = null;
      try { rain.stop(); } catch (_) {}
      old.close().catch(() => {});
    }
    active.clear();
    master = dry = wet = reverb = rain = null;
  }

  function chime(success = true) {
    if (!ctx || !enabled || paused || ctx.state !== 'running') return;
    const now = ctx.currentTime + .015;
    (success ? [62, 69, 74] : [57, 60]).forEach((n, i) => voice(n, now + i * .14, .25, success ? .3 : .19));
  }

  window.RainAudio = {
    start, toggle, suspend, resume, stop, chime, fx,
    setScene(index) { scene = Math.max(0, Math.min(3, Number(index) || 0)); },
    get isOn() { return enabled; }
  };
})();
