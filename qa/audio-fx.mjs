import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// The real audio module runs against a small Web Audio graph mock. This checks
// gating, scheduling and cleanup, not audible quality or browser autoplay policy.
const source = fs.readFileSync(fileURLToPath(new URL('../audio.js', import.meta.url)), 'utf8');
const contexts = [], timers = new Map();
let timerId = 0;
class Param {
  value = 0; events = [];
  setValueAtTime(value, at) { this.value = value; this.events.push(['set', value, at]); }
  linearRampToValueAtTime(value, at) { this.events.push(['linear', value, at]); }
  exponentialRampToValueAtTime(value, at) { this.events.push(['exponential', value, at]); }
  setTargetAtTime(value, at, speed) { this.events.push(['target', value, at, speed]); }
  cancelScheduledValues(at) { this.events.push(['cancel', at]); }
}
class Node {
  constructor(context, kind) {
    this.context = context; this.kind = kind; this.connections = []; this.disconnected = false;
    for (const key of ['gain','frequency','detune','Q','pan','threshold','knee','ratio','attack','release']) this[key] = new Param();
    context.nodes.push(this);
  }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; }
  start(at = 0) { this.startAt = at; this.context.sources.push(this); }
  stop(at = this.context.currentTime) { this.stopAt = at; }
}
class AudioContextMock {
  state = 'suspended'; currentTime = 0; sampleRate = 12000; nodes = []; sources = [];
  constructor() { contexts.push(this); this.destination = new Node(this, 'destination'); }
  createGain() { return new Node(this, 'gain'); }
  createBiquadFilter() { return new Node(this, 'filter'); }
  createStereoPanner() { return new Node(this, 'pan'); }
  createOscillator() { return new Node(this, 'oscillator'); }
  createBufferSource() { return new Node(this, 'buffer'); }
  createDynamicsCompressor() { return new Node(this, 'compressor'); }
  createConvolver() { return new Node(this, 'convolver'); }
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { getChannelData: index => data[index], duration: length / sampleRate };
  }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
  advance(seconds) {
    this.currentTime += seconds;
    for (const node of this.sources) if (!node.ended && node.stopAt <= this.currentTime) {
      node.ended = true; node.onended?.();
    }
  }
}
const document = { hidden: false };
const sandbox = { window: { AudioContext: AudioContextMock }, document,
  setInterval(fn) { const id = ++timerId; timers.set(id, fn); return id; }, clearInterval(id) { timers.delete(id); } };
vm.createContext(sandbox); vm.runInContext(source, sandbox);
const audio = sandbox.window.RainAudio;
assert.equal(audio.fx('dial'), false); assert.equal(contexts.length, 0, 'Effects cannot initiate autoplay.');
assert.equal(await audio.start(), true);
const ctx = contexts[0];
assert.equal(timers.size, 1);
const names = ['dial','latch','paper','cloth','stitch','unthread','key','switch','door','pickup','tick','pulley'];
const fingerprints = new Set();
for (const name of names) {
  ctx.advance(1);
  const before = ctx.sources.length;
  assert.equal(audio.fx(name), true, name);
  const voices = ctx.sources.slice(before);
  assert.ok(voices.length >= 2 && voices.length <= 4, `${name}: distinct compact material layers`);
  assert.equal(audio.fx(name), false, `${name}: rate limited`);
  assert.equal(ctx.sources.length, before + voices.length);
  fingerprints.add(JSON.stringify(voices.map(node => [node.kind, node.frequency.value,
    node.connections[0].frequency.value, Math.round((node.stopAt - node.startAt) * 1000)])));
  for (const voice of voices) {
    assert.ok(voice.stopAt - voice.startAt <= .6, `${name}: bounded source lifetime`);
    const gain = voice.connections[0].connections[0];
    for (const [, value] of gain.gain.events) assert.ok(value >= 0 && value <= .31, `${name}: restrained gain`);
  }
  ctx.advance(.7);
  for (const voice of voices) {
    assert.ok(voice.disconnected, `${name}: source disconnected after ending`);
    assert.ok(voice.connections[0].disconnected, `${name}: filter disconnected`);
    assert.ok(voice.connections[0].connections[0].disconnected, `${name}: envelope disconnected`);
  }
}
assert.equal(fingerprints.size, names.length, 'Every semantic effect has a distinct graph/timing signature.');
let count = ctx.sources.length;
assert.equal(audio.fx('unknown'), false);
assert.equal(audio.fx('dial', 0), false);
assert.equal(audio.fx('dial', -1), false);
assert.equal(ctx.sources.length, count);
ctx.advance(1); assert.equal(audio.fx('dial', 999), true);
let voices = ctx.sources.slice(count);
assert.ok(voices.every(node => node.connections[0].connections[0].gain.events.every(([,v]) => v <= .31)));
ctx.advance(1);
document.hidden = true;
count = ctx.sources.length; assert.equal(audio.fx('paper'), false); assert.equal(ctx.sources.length, count);
document.hidden = false;
count = ctx.sources.length; assert.equal(audio.fx('pulley'), true); voices = ctx.sources.slice(count);
audio.suspend(); assert.equal(audio.fx('switch'), false); assert.ok(voices.every(node => node.disconnected));
assert.equal(timers.size, 0); assert.equal(audio.isOn, true);
await audio.resume(); assert.equal(audio.fx('switch'), true); assert.equal(timers.size, 1);
count = ctx.sources.length; audio.fx('cloth'); voices = ctx.sources.slice(count);
assert.equal(await audio.toggle(), false); assert.ok(voices.every(node => node.disconnected));
assert.equal(audio.fx('key'), false); assert.equal(timers.size, 0);
await audio.resume(); assert.equal(audio.isOn, false); assert.equal(audio.fx('key'), false);
await audio.toggle();
// A rapid mixed storm remains bounded even when events use different materials.
ctx.advance(1); count = ctx.sources.length;
for (let i = 0; i < 100; i++) audio.fx(names[i % names.length]);
assert.ok(ctx.sources.length - count <= 24, 'At most 24 active effect voices.');
voices = ctx.sources.slice(count); audio.stop();
assert.ok(voices.every(node => node.disconnected));
assert.equal(ctx.state, 'closed'); assert.equal(timers.size, 0); assert.equal(audio.fx('dial'), false);
await audio.start(); assert.equal(contexts.length, 2); assert.equal(audio.fx('dial'), true);
audio.stop(); assert.equal(timers.size, 0);
console.log('PASS: all 12 semantic effects, distinct graphs, per-material rate limits, bounded lifetime/gain/voice count, zero-intensity/unknown names, hidden/mute/pause/stop gating, immediate cleanup and restart.');
