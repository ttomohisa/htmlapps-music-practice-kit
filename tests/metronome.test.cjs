const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Run the actual inline app in a small deterministic DOM/Web Audio fixture.
// No runtime test hook or alternate scheduler is shipped in the HTML.
function loadApp(saved = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/index.template.html'), 'utf8');
  let now = 0, nextId = 0;
  const timeouts = new Map(), intervals = new Map(), nodes = [], elements = new Map(), documentEvents = {};
  class Element {
    constructor(id = '') { this.id = id; this.value = ''; this.textContent = ''; this.checked = false; this.disabled = false; this.children = []; this.dataset = {}; this.style = {}; this.events = {}; this.attrs = {}; const classes = new Set(); this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), toggle: (x, enabled) => enabled ? classes.add(x) : classes.delete(x), contains: x => classes.has(x) }; }
    setAttribute(k, v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k]; }
    addEventListener(k, fn) { this.events[k] = fn; }
    replaceChildren() { this.children = []; }
    append(child) { this.children.push(child); }
    getContext() { return { clearRect() {} }; }
    getBoundingClientRect() { return { width: 300, height: 100 }; }
    fire(type) { this.events[type]?.({ target: this }); }
  }
  for (const match of source.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], new Element(match[1]));
  const document = { visibilityState: 'visible', documentElement: { lang: 'en' }, querySelector: s => elements.get(s.slice(1)), querySelectorAll: s => s === '#beatDots .beat-dot' ? elements.get('beatDots').children : [], createElement: () => new Element(), getElementById: id => elements.get(id), addEventListener: (k, fn) => documentEvents[k] = fn };
  const ctx = { state: 'running', sampleRate: 48000, get currentTime() { return now; }, destination: {}, resume: () => Promise.resolve(), addEventListener(k, fn) { this[k] = fn; }, createOscillator() { const node = { frequency: { setValueAtTime(value) { this.value = value; }, setTargetAtTime(value) { this.value = value; } }, connect() {}, disconnect() {}, start(time) { this.time = time; }, stop(time) { this.stopTime = time ?? now; } }; nodes.push(node); return node; }, createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {}, disconnect() {} }; } };
  let stored = JSON.stringify(saved);
  const sandbox = { document, navigator: { language: 'en' }, console, TextDecoder, Uint8Array, Float32Array, atob, performance: { now: () => now * 1000 }, localStorage: { getItem: () => stored, setItem: (_k, value) => stored = value }, setTimeout: (fn, ms) => { const id = ++nextId; timeouts.set(id, { fn, at: now + ms / 1000 }); return id; }, clearTimeout: id => timeouts.delete(id), setInterval: fn => { const id = ++nextId; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id), cancelAnimationFrame() {}, requestAnimationFrame() {}, AudioContext: function () { return ctx; }, addEventListener() {} };
  sandbox.window = sandbox;
  const script = source.match(/<script>\s*([\s\S]*?)<\/script>/)[1]
    .replace('__APP_CONFIG_JSON__', JSON.stringify({ slug: 'music-practice-kit' }))
    .replace('__BUILD_MANIFEST_JSON__', '{}')
    .replace('__EMBEDDED_ASSET_BUNDLE_BASE64__', 'e30=')
    .replace('initControls(); applyLanguage();', `globalThis.app = { startMetronome, stopMetronome, metroScheduler, startDrone, stopDrone, detectPitchYin, setBpm, handleTap, renderBeatDots, loadSettings, initControls, applyLanguage, get settings() { return settings; }, get running() { return metroRunning; } };`);
  vm.runInNewContext(script, sandbox);
  const app = sandbox.app;
  app.renderBeatDots();
  function advance(to, runScheduler = true) {
    now = to;
    let due;
    do { due = [...timeouts].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at); for (const [id, timer] of due) { if (timeouts.delete(id)) timer.fn(); } } while (due.length);
    if (runScheduler) app.metroScheduler();
  }
  function tickUntil(to) { while (now + .025 < to) advance(now + .025); advance(to); }
  return { app, ctx, nodes, elements, intervals, source, advance, tickUntil, saved: () => JSON.parse(stored), visible(value) { document.visibilityState = value; documentEvents.visibilitychange(); }, contextState(value) { ctx.state = value; ctx.statechange?.(); }, clickTimes: () => nodes.filter(n => n.stopTime > n.time).map(n => n.time) };
}
function rampFixture(extra = {}) { return loadApp({ rampEnabled: true, rampStartBpm: 60, rampTargetBpm: 100, rampIncrement: 5, rampEveryBars: 4, ...extra }); }
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`); }

test('ramp changes only after four complete bars and uses the new interval on the boundary', () => {
  const h = rampFixture(); h.app.startMetronome(); h.tickUntil(18);
  const times = h.clickTimes();
  close(times[0], .06); close(times[15], 15.06); close(times[16], 16.06); close(times[17] - times[16], 60 / 65);
  assert.equal(h.elements.get('bpmNumber').textContent, 65);
});

for (const beatsPerBar of [2, 3, 4, 5, 6, 7]) {
  test(`ramp counts full ${beatsPerBar}-beat bars, clamps a non-divisible target, then holds`, () => {
    const h = rampFixture({ beatsPerBar, rampStartBpm: 296, rampTargetBpm: 300, rampIncrement: 3, rampEveryBars: 1 });
    h.app.startMetronome(); h.tickUntil(6);
    const times = h.clickTimes();
    for (let i = 1; i <= beatsPerBar; i++) close(times[i] - times[i - 1], 60 / 296);
    for (let i = beatsPerBar + 1; i <= 2 * beatsPerBar; i++) close(times[i] - times[i - 1], 60 / 299);
    for (let i = 2 * beatsPerBar + 1; i < times.length; i++) close(times[i] - times[i - 1], .2);
    assert.equal(h.elements.get('bpmNumber').textContent, 300);
  });
}

test('30 BPM and equal start/target stay bounded without a zero interval', () => {
  const h = rampFixture({ rampStartBpm: 30, rampTargetBpm: 30, rampEveryBars: 1 });
  h.app.startMetronome(); h.tickUntil(12);
  assert.equal(h.clickTimes().length, 7);
  h.clickTimes().slice(1).forEach((time, i) => close(time - h.clickTimes()[i], 2));
});

test('repeated start is idempotent; stop cancels pending clicks and restart starts from the configured BPM', () => {
  const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1 });
  h.app.startMetronome(); h.app.startMetronome(); assert.equal(h.intervals.size, 1);
  h.tickUntil(3); h.app.stopMetronome(false);
  assert.equal(h.intervals.size, 0); assert.equal(h.app.running, false);
  assert.ok(h.nodes.every(n => n.stopTime <= h.ctx.currentTime));
  h.advance(10); const index = h.nodes.length; h.app.startMetronome(); h.tickUntil(11.2);
  close(h.nodes[index + 1].time - h.nodes[index].time, 1);
});

test('manual BPM exits ramp, persists the chosen tempo, and uses it while running', () => {
  const h = rampFixture(); h.app.startMetronome(); h.tickUntil(.5); h.app.setBpm(90); h.tickUntil(4);
  assert.equal(h.app.settings.rampEnabled, false); assert.equal(h.saved().bpm, 90);
  assert.equal(h.elements.get('bpmNumber').textContent, 90);
  const times = h.clickTimes().filter(t => t > .5); for (let i = 1; i < times.length; i++) close(times[i] - times[i - 1], 60 / 90);
});

test('the first TAP immediately exits ramp; three taps still measure the normal tempo', () => {
  const h = rampFixture(); h.app.startMetronome(); h.tickUntil(2.1); h.app.handleTap();
  assert.equal(h.app.settings.rampEnabled, false);
  h.advance(2.6); h.app.handleTap(); h.advance(3.1); h.app.handleTap();
  assert.equal(h.app.settings.bpm, 120);
});

test('slider and stepper use the currently audible ramp BPM when returning to manual mode', () => {
  const h = rampFixture(); h.app.startMetronome(); h.tickUntil(.2);
  h.elements.get('bpmPlus1').fire('click'); assert.equal(h.app.settings.bpm, 61); assert.equal(h.app.settings.rampEnabled, false);
  h.elements.get('bpmSlider').value = '155'; h.elements.get('bpmSlider').fire('input'); assert.equal(h.app.settings.bpm, 155);
});

test('long scheduler gap rebases one future click instead of a burst or skipped ramp levels', () => {
  const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1 }); h.app.startMetronome(); h.tickUntil(.2);
  const index = h.nodes.length; h.advance(100);
  assert.equal(h.nodes.length - index, 1); assert.ok(h.nodes[index].time > 100);
  h.tickUntil(101.2); assert.equal(h.elements.get('bpmNumber').textContent, 60);
});

test('hidden page pauses; returning repeats the interrupted bar without auto acceleration', () => {
  const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1 }); h.app.startMetronome(); h.tickUntil(2.3);
  assert.equal(h.elements.get('bpmNumber').textContent, 65);
  h.visible('hidden'); const count = h.nodes.length; h.advance(90); assert.equal(h.nodes.length, count);
  h.visible('visible'); h.tickUntil(90.2); assert.equal(h.nodes.length, count + 1); assert.equal(h.elements.get('bpmNumber').textContent, 65);
  h.app.stopMetronome(false); h.visible('hidden'); h.visible('visible'); assert.equal(h.app.running, false);
});

test('suspended AudioContext queues no clicks, and resumes without catch-up', () => {
  const h = rampFixture(); h.contextState('suspended'); h.app.startMetronome(); assert.equal(h.nodes.length, 0);
  h.advance(30); assert.equal(h.nodes.length, 0); h.contextState('running'); h.app.metroScheduler(); h.tickUntil(30.2);
  assert.equal(h.nodes.length, 1); assert.ok(h.nodes[0].time > 30);
});

test('invalid saved ramp/meter values are normalized to finite bounded integers', () => {
  const h = loadApp({ bpm: -7, beatsPerBar: 999, rampEnabled: 'false', rampStartBpm: null, rampTargetBpm: -1, rampIncrement: 0, rampEveryBars: 1.5 });
  const s = h.app.settings;
  assert.equal(s.rampEnabled, false); assert.equal(s.bpm, 30); assert.equal(s.beatsPerBar, 7);
  assert.equal(s.rampStartBpm, 60); assert.equal(s.rampTargetBpm, 60); assert.equal(s.rampIncrement, 1); assert.equal(s.rampEveryBars, 2);
  const bad = loadApp({ rampStartBpm: 'oops', rampTargetBpm: 999, rampIncrement: 999, rampEveryBars: 999 }).app.settings;
  assert.equal(bad.rampStartBpm, 60); assert.equal(bad.rampTargetBpm, 300); assert.equal(bad.rampIncrement, 270); assert.equal(bad.rampEveryBars, 64);
});

test('ramp controls have bounded labels, expose progress, and never start on load', () => {
  const h = rampFixture();
  for (const id of ['rampToggle', 'rampStartBpm', 'rampTargetBpm', 'rampIncrement', 'rampEveryBars', 'rampStatus']) assert.ok(h.elements.has(id), id);
  assert.match(h.source, /id="rampStatus"[^>]*aria-live="polite"/);
  assert.equal(h.app.running, false); assert.equal(h.nodes.length, 0);
  h.app.startMetronome(); h.tickUntil(.2); assert.match(h.elements.get('rampStatus').textContent, /4.*bar/);
  h.tickUntil(4.2); assert.match(h.elements.get('rampStatus').textContent, /3.*bar/);
});

test('scheduler progress never overwrites a ramp setting being edited in normal mode', () => {
  const h = loadApp(); h.app.startMetronome(); h.tickUntil(.2);
  h.elements.get('rampStartBpm').value = '80'; h.tickUntil(.3);
  assert.equal(h.elements.get('rampStartBpm').value, '80');
});

test('ramp input validation rejects blank, fractional, and inverted targets while preserving settings', () => {
  const h = rampFixture();
  for (const [id, value] of [['rampStartBpm', ''], ['rampTargetBpm', '59'], ['rampEveryBars', '1.5'], ['rampIncrement', '0']]) {
    const before = h.app.settings[id]; const input = h.elements.get(id); input.value = value; input.fire('change');
    assert.equal(h.app.settings[id], before); assert.equal(Number(input.value), before); assert.match(h.elements.get('toast').textContent, /whole numbers/);
  }
  const input = h.elements.get('rampStartBpm'); input.value = '80'; input.fire('change'); assert.equal(h.saved().rampStartBpm, 80);
});

test('queued ramp boundary cannot update BPM early, survive stop, or survive manual override', () => {
  const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1 }); h.app.startMetronome(); h.tickUntil(2);
  assert.equal(h.elements.get('bpmNumber').textContent, 60);
  h.app.setBpm(77); h.tickUntil(3); assert.equal(h.elements.get('bpmNumber').textContent, 77);
  h.app.stopMetronome(false); h.tickUntil(5); assert.equal(h.elements.get('bpmNumber').textContent, 77);
});

test('resume at an already-increased bar does not apply its increment twice', () => {
  const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1 }); h.app.startMetronome(); h.tickUntil(2.3);
  h.visible('hidden'); h.advance(10); h.visible('visible'); h.tickUntil(10.2);
  assert.equal(h.elements.get('bpmNumber').textContent, 65);
  h.tickUntil(12.1); assert.equal(h.elements.get('bpmNumber').textContent, 70);
});

test('fresh and persisted initialization preserve ramp values, never auto-run, and switch JA/EN progress', () => {
  for (const persisted of [false, true]) {
    const h = loadApp(persisted ? { rampEnabled: true, rampStartBpm: 80, rampTargetBpm: 90 } : {});
    h.app.initControls(); h.app.applyLanguage();
    assert.equal(h.app.running, false); assert.equal(h.nodes.length, 0);
    assert.equal(h.elements.get('rampToggle').checked, persisted);
    assert.equal(Number(h.elements.get('rampStartBpm').value), persisted ? 80 : 60);
    if (!persisted) { h.elements.get('rampToggle').checked = true; h.elements.get('rampToggle').fire('change'); }
    h.app.startMetronome(); h.tickUntil(.2); assert.match(h.elements.get('rampStatus').textContent, /Current/);
    h.elements.get('languageButton').fire('click'); assert.match(h.elements.get('rampStatus').textContent, /現在/);
    assert.equal(h.app.settings.rampEnabled, true);
    h.app.stopMetronome(false); assert.equal(h.elements.get('rampStartBpm').disabled, false);
  }
});

test('toggle changes restart from the start BPM without duplicate schedulers or pending old clicks', () => {
  const h = loadApp(); h.app.initControls(); h.app.startMetronome(); h.tickUntil(.2);
  h.elements.get('rampToggle').checked = true; h.elements.get('rampToggle').fire('change'); h.tickUntil(.4);
  assert.equal(h.elements.get('bpmNumber').textContent, 60); assert.equal(h.intervals.size, 1);
  assert.equal(h.elements.get('rampStartBpm').disabled, true); assert.equal(h.elements.get('beatsPerBar').disabled, true);
  h.elements.get('rampToggle').checked = false; h.elements.get('rampToggle').fire('change'); h.tickUntil(1.8);
  assert.equal(h.elements.get('bpmNumber').textContent, 60); assert.equal(h.intervals.size, 1); assert.equal(h.app.settings.rampEnabled, false);
});

test('maximum 64-bar interval at 30 BPM waits for every beat, then caps a large increase', () => {
  const h = rampFixture({ beatsPerBar: 7, rampStartBpm: 30, rampTargetBpm: 100, rampIncrement: 270, rampEveryBars: 64 });
  h.app.startMetronome(); h.tickUntil(896.7);
  const times = h.clickTimes(); close(times[448], 896.06); close(times[449] - times[448], .6);
  assert.equal(h.elements.get('bpmNumber').textContent, 100);
});

test('manual metronome retains accent, mute setting, and meter changes', () => {
  const h = loadApp({ bpm: 120, beatsPerBar: 3 }); h.app.startMetronome(); h.tickUntil(1.7);
  assert.deepEqual(h.nodes.slice(0, 4).map(n => n.frequency.value), [1450, 980, 980, 1450]);
  h.elements.get('accentToggle').checked = false; h.elements.get('accentToggle').fire('change');
  h.elements.get('metroVolume').value = '0'; h.elements.get('metroVolume').fire('input');
  h.elements.get('beatsPerBar').value = '7'; h.elements.get('beatsPerBar').fire('change'); h.tickUntil(2);
  assert.equal(h.app.settings.metroVolume, 0); assert.equal(h.app.settings.beatsPerBar, 7); assert.equal(h.nodes.at(-1).frequency.value, 980);
});

test('stopping metronome leaves an independent drone running and drone stops normally', () => {
  const h = rampFixture(); h.app.startDrone(); const drone = h.nodes[0];
  assert.equal(drone.frequency.value, 220);
  h.app.startMetronome(); h.tickUntil(.2); h.app.stopMetronome(false); assert.equal(drone.stopTime, undefined);
  h.app.stopDrone(false); close(drone.stopTime, .32);
});

test('existing tuner pitch detector still detects reference tones without microphone access', () => {
  const h = loadApp();
  for (const frequency of [41.2034, 82.4069, 110, 261.6256, 440, 880, 1318.51]) {
    const signal = Float32Array.from({ length: 4096 }, (_, i) => .5 * Math.sin(2 * Math.PI * frequency * i / 48000));
    const result = h.app.detectPitchYin(signal, 48000);
    assert.ok(Math.abs(1200 * Math.log2(result.frequency / frequency)) < 1, String(frequency));
    assert.ok(result.confidence > .66);
  }
});

test('English ramp status uses singular bar for one and plural bars for larger counts', () => {
  const single = rampFixture({ rampEveryBars: 1 }); single.app.initControls();
  assert.match(single.elements.get('rampStatus').textContent, /every 1 bar · Ready/);
  single.app.startMetronome(); single.tickUntil(.2);
  assert.match(single.elements.get('rampStatus').textContent, /1 bar until next change/);
  const multiple = rampFixture(); multiple.app.initControls();
  assert.match(multiple.elements.get('rampStatus').textContent, /every 4 bars · Ready/);
  multiple.app.startMetronome(); multiple.tickUntil(.2);
  assert.match(multiple.elements.get('rampStatus').textContent, /4 bars until next change/);
  multiple.tickUntil(12.2);
  assert.match(multiple.elements.get('rampStatus').textContent, /1 bar until next change/);
  multiple.elements.get('languageButton').fire('click');
  assert.match(multiple.elements.get('rampStatus').textContent, /あと1小節/);
});
