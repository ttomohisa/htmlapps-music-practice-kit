const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Run the actual inline app in a small deterministic DOM/Web Audio fixture.
// No runtime test hook or alternate scheduler is shipped in the HTML.
function loadApp(saved = {}, options = {}) {
  const source = fs.readFileSync(options.sourcePath || process.env.MUSIC_TEST_SOURCE || path.join(__dirname, '../src/index.template.html'), 'utf8');
  let now = 0, nextId = 0;
  const timeouts = new Map(), intervals = new Map(), nodes = [], gains = [], elements = new Map(), documentEvents = {};
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
  for (const match of source.matchAll(/<[^>]+(?:\bid|\bdata-i18n(?:-title|-aria-label)?)="[^"]*"[^>]*>/g)) {
    const id = match[0].match(/\bid="([^"]+)"/)?.[1] || `anonymous-${elements.size}`;
    const element = new Element(id);
    for (const attr of match[0].matchAll(/([\w-]+)="([^"]*)"/g)) {
      element.attrs[attr[1]] = attr[2];
      if (attr[1].startsWith('data-')) element.dataset[attr[1].slice(5).replace(/-([a-z])/g, (_all, letter) => letter.toUpperCase())] = attr[2];
    }
    elements.set(id, element);
  }
  const document = { visibilityState: 'visible', documentElement: { lang: 'en' }, querySelector: s => elements.get(s.slice(1)), querySelectorAll: s => s === '#beatDots .beat-dot' ? elements.get('beatDots').children : /^\[data-i18n/.test(s) ? [...elements.values()].filter(e => e.attrs[s.slice(1, -1)]) : [], createElement: () => new Element(), getElementById: id => elements.get(id), addEventListener: (k, fn) => documentEvents[k] = fn };
  const faults = {};
  function boundary(name) { if (faults[name]) throw new Error(`Injected ${name} failure`); }
  const ctx = {
    state: 'running', sampleRate: 48000, get currentTime() { return now; }, destination: {},
    resume: () => Promise.resolve(), addEventListener(k, fn) { this[k] = fn; },
    createOscillator() {
      boundary('createOscillator');
      const node = { frequency: { setValueAtTime(value) { this.value = value; }, setTargetAtTime(value) { this.value = value; } },
        connect() { boundary('oscillatorConnect'); }, disconnect() { this.disconnected = true; },
        start(time) { boundary('oscillatorStart'); this.time = time; },
        stop(time) { this.stopTime = time ?? now; boundary('oscillatorStop'); }
      }; nodes.push(node); return node;
    },
    createGain() {
      boundary('createGain');
      const gain = { calls: [], gain: {}, connect() { boundary('gainConnect'); }, disconnect() { this.disconnected = true; } };
      for (const method of ['setValueAtTime', 'exponentialRampToValueAtTime', 'cancelScheduledValues', 'setTargetAtTime']) {
        gain.gain[method] = (...args) => { boundary(method); gain.calls.push({ method, args }); };
      }
      gains.push(gain); return gain;
    }
  };
  let stored = JSON.stringify(saved);
  const sandbox = { document, navigator: { language: 'en' }, console, TextDecoder, Uint8Array, Float32Array, atob, performance: { now: () => now * 1000 }, localStorage: { getItem: () => stored, setItem: (_k, value) => stored = value }, setTimeout: (fn, ms) => { const id = ++nextId; timeouts.set(id, { fn, at: now + ms / 1000 }); return id; }, clearTimeout: id => timeouts.delete(id), setInterval: fn => { const id = ++nextId; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id), cancelAnimationFrame() {}, requestAnimationFrame() {}, AudioContext: function () { boundary('AudioContext'); return ctx; }, addEventListener() {} };
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
  return { app, ctx, nodes, gains, faults, elements, document, intervals, timeouts, source, advance, tickUntil, saved: () => JSON.parse(stored), visible(value) { document.visibilityState = value; documentEvents.visibilitychange(); }, contextState(value) { ctx.state = value; ctx.statechange?.(); }, clickTimes: () => nodes.filter(n => n.stopTime > n.time).map(n => n.time) };
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

function restart(h) {
  const button = h.elements.get('rampRestartButton');
  assert.ok(button, 'Restart ramp button exists');
  button.fire('click');
}
function assertStopped(h) {
  assert.equal(h.app.running, false);
  assert.equal(h.intervals.size, 0);
  assert.equal(h.elements.get('metroPlayButton').getAttribute('aria-pressed'), 'false');
  assert.match(h.elements.get('metroStatusText').textContent, /Stopped|停止中/);
}

test('zero metronome volume schedules only zero gain while beats and ramp progress continue', () => {
  const h = rampFixture({ metroVolume: 0, beatsPerBar: 2, rampEveryBars: 1 });
  h.app.startMetronome(); h.tickUntil(.07);
  assert.ok(h.elements.get('beatDots').children[0].classList.contains('active'));
  h.tickUntil(2.2);
  assert.equal(h.elements.get('bpmNumber').textContent, 65);
  assert.ok(h.gains.length >= 3);
  for (const gain of h.gains) {
    assert.ok(gain.calls.length > 0);
    assert.ok(gain.calls.every(call => call.method === 'setValueAtTime' && call.args[0] === 0));
  }
});

test('muting cancels queued click envelopes immediately without touching the drone or visual schedule', () => {
  const h = loadApp({ bpm: 120 }); h.app.startDrone(); const droneGain = h.gains[0];
  const droneCalls = droneGain.calls.length; h.app.startMetronome(); h.tickUntil(.5);
  const metroGains = h.gains.slice(1);
  assert.ok(metroGains.length >= 2, 'second click is already queued');
  h.elements.get('metroVolume').value = '0'; h.elements.get('metroVolume').fire('input');
  for (const gain of metroGains) {
    assert.deepEqual(gain.calls.slice(-2), [
      { method: 'cancelScheduledValues', args: [.5] },
      { method: 'setValueAtTime', args: [0, .5] }
    ]);
  }
  assert.equal(droneGain.calls.length, droneCalls); h.tickUntil(.57);
  assert.ok(h.elements.get('beatDots').children[1].classList.contains('active'));
  assert.equal(h.intervals.size, 1);
});

for (const fault of ['AudioContext', 'createOscillator', 'createGain', 'setValueAtTime', 'exponentialRampToValueAtTime', 'oscillatorConnect', 'gainConnect', 'oscillatorStart', 'oscillatorStop']) {
  test(`failed metronome startup at ${fault} cleans partial resources and can retry`, () => {
    const h = rampFixture(); h.app.initControls(); h.faults[fault] = true;
    assert.doesNotThrow(() => h.elements.get('metroPlayButton').fire('click'));
    assertStopped(h);
    assert.match(h.elements.get('toast').textContent, /audio.*try again/i);
    assert.equal(h.elements.get('rampStartBpm').disabled, false);
    assert.ok(h.nodes.every(node => node.disconnected));
    assert.ok(h.gains.every(gain => gain.disconnected));
    h.faults[fault] = false; h.elements.get('metroPlayButton').fire('click'); h.tickUntil(.07);
    assert.equal(h.app.running, true); assert.equal(h.intervals.size, 1);
    assert.equal(h.elements.get('bpmNumber').textContent, 60);
  });
}

test('failure after startup stops only the metronome and invalidates pending visual callbacks', () => {
  const h = rampFixture(); h.app.startDrone(); const drone = h.nodes[0]; h.app.startMetronome();
  const oldCallbacks = [...h.timeouts.values()].map(timer => timer.fn); h.faults.createGain = true;
  assert.doesNotThrow(() => h.tickUntil(1)); assertStopped(h);
  assert.equal(drone.stopTime, undefined); assert.equal(drone.disconnected, undefined);
  h.faults.createGain = false; h.app.startMetronome(); h.tickUntil(1.08);
  const before = h.elements.get('beatDots').children.map(dot => dot.classList.contains('active'));
  oldCallbacks.forEach(fn => fn());
  assert.deepEqual(h.elements.get('beatDots').children.map(dot => dot.classList.contains('active')), before);
  assert.equal(h.intervals.size, 1);
});

test('resume rejection reports a retryable error but an old rejection cannot stop a new session', async () => {
  const h = rampFixture(); h.contextState('suspended'); let reject;
  h.ctx.resume = () => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; });
  h.app.startMetronome(); reject(new Error('resume denied')); await Promise.resolve();
  assertStopped(h); assert.match(h.elements.get('toast').textContent, /audio.*try again/i);
  h.app.startMetronome(); const oldReject = reject; h.app.stopMetronome(false);
  h.contextState('running'); h.app.startMetronome(); oldReject(new Error('late denial')); await Promise.resolve();
  assert.equal(h.app.running, true); assert.equal(h.intervals.size, 1);
});

test('restart mid-ramp resets start BPM, first beat and complete-bar countdown while keeping settings', () => {
  const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1, accent: false, metroVolume: .25 });
  h.app.initControls(); h.app.startMetronome(); h.tickUntil(3.2);
  assert.equal(h.elements.get('bpmNumber').textContent, 65);
  const settings = JSON.stringify(h.app.settings), index = h.nodes.length; restart(h);
  assert.equal(JSON.stringify(h.app.settings), settings);
  assert.equal(h.elements.get('bpmNumber').textContent, 60); assert.equal(h.intervals.size, 1);
  assert.ok(h.nodes.slice(0, index).every(n => n.stopTime <= 3.2));
  close(h.nodes[index].time, 3.26); h.tickUntil(3.27);
  assert.ok(h.elements.get('beatDots').children[0].classList.contains('active'));
  assert.match(h.elements.get('rampStatus').textContent, /1 bar until/);
  h.tickUntil(5.25); assert.equal(h.elements.get('bpmNumber').textContent, 60);
  h.tickUntil(5.27); assert.equal(h.elements.get('bpmNumber').textContent, 65);
});

test('restart at target holding tempo resets and does not duplicate the independent drone', () => {
  const h = rampFixture({ beatsPerBar: 2, rampTargetBpm: 65, rampEveryBars: 1 });
  h.app.startDrone(); const drone = h.nodes[0]; h.app.startMetronome(); h.tickUntil(5);
  assert.match(h.elements.get('rampStatus').textContent, /Holding target/); restart(h); h.tickUntil(5.07);
  assert.equal(h.elements.get('bpmNumber').textContent, 60); assert.equal(drone.stopTime, undefined);
  assert.equal(h.intervals.size, 1);
});

test('rapid restarts at a queued boundary cannot revive old scheduler or visual callbacks', () => {
  const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1 }); h.app.startMetronome(); h.tickUntil(2);
  const oldCallbacks = [...h.timeouts.values()].map(timer => timer.fn), oldIntervals = [...h.intervals.values()];
  for (let i = 0; i < 10; i++) restart(h);
  const count = h.nodes.length; h.tickUntil(2.07);
  oldCallbacks.forEach(fn => fn()); oldIntervals.forEach(fn => fn());
  assert.equal(h.nodes.length, count); assert.equal(h.intervals.size, 1);
  assert.equal(h.elements.get('bpmNumber').textContent, 60);
  assert.ok(h.elements.get('beatDots').children[0].classList.contains('active'));
  h.tickUntil(4.05); assert.equal(h.elements.get('bpmNumber').textContent, 60);
  h.tickUntil(4.07); assert.equal(h.elements.get('bpmNumber').textContent, 65);
});

test('old beat-off callback cannot clear the new first beat after restart', () => {
  const h = rampFixture(); h.app.startMetronome(); h.tickUntil(.07);
  const oldOff = [...h.timeouts.values()].filter(timer => Math.abs(timer.at - .16) < .001).map(timer => timer.fn);
  assert.equal(oldOff.length, 1); restart(h); h.tickUntil(.14); oldOff.forEach(fn => fn());
  assert.ok(h.elements.get('beatDots').children[0].classList.contains('active'));
});

for (const action of ['manual', 'tap', 'stop']) {
  test(`${action} after restart cancels the ramp and stale work cannot resurrect it`, () => {
    const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1 }); h.app.startMetronome(); h.tickUntil(2); restart(h);
    const oldCallbacks = [...h.timeouts.values()].map(timer => timer.fn);
    if (action === 'manual') h.app.setBpm(77);
    if (action === 'tap') h.app.handleTap();
    if (action === 'stop') h.app.stopMetronome(false);
    oldCallbacks.forEach(fn => fn()); h.tickUntil(5);
    assert.equal(h.elements.get('rampRestartButton').disabled, true);
    if (action === 'stop') assertStopped(h);
    else { assert.equal(h.app.settings.rampEnabled, false); assert.equal(h.elements.get('bpmNumber').textContent, action === 'manual' ? 77 : 60); }
    const count = h.nodes.length; restart(h); assert.equal(h.nodes.length, count);
  });
}

test('hidden and suspended restarts stay paused and resume at the first beat without catch-up', () => {
  for (const interruption of ['hidden', 'suspended']) {
    const h = rampFixture({ beatsPerBar: 2, rampEveryBars: 1 }); h.app.startMetronome(); h.tickUntil(3);
    if (interruption === 'hidden') h.visible('hidden'); else h.contextState('suspended');
    restart(h); const count = h.nodes.length; h.advance(100);
    assert.equal(h.nodes.length, count); assert.equal(h.elements.get('bpmNumber').textContent, 60);
    assert.equal(h.elements.get('rampRestartButton').disabled, false);
    if (interruption === 'hidden') h.visible('visible'); else h.contextState('running');
    h.tickUntil(100.07); assert.equal(h.nodes.length, count + 1);
    assert.equal(h.elements.get('bpmNumber').textContent, 60);
    assert.ok(h.elements.get('beatDots').children[0].classList.contains('active'));
  }
});

test('restart failure shows localized stopped state and a normal start can retry', () => {
  const h = rampFixture({ language: 'ja' }); h.app.initControls(); h.app.startMetronome(); h.tickUntil(2);
  h.faults.createGain = true; assert.doesNotThrow(() => restart(h)); assertStopped(h);
  assert.match(h.elements.get('toast').textContent, /音声.*もう一度/);
  assert.equal(h.elements.get('rampRestartButton').disabled, true);
  h.faults.createGain = false; h.app.startMetronome(); h.tickUntil(2.07);
  assert.equal(h.app.running, true); assert.equal(h.intervals.size, 1);
});

test('restart button has JA/EN labels and is enabled only for active ramp sessions', () => {
  const h = loadApp(); h.app.initControls(); h.app.applyLanguage();
  assert.match(h.source, /<button[^>]+id="rampRestartButton"[^>]+type="button"[^>]+disabled/);
  const button = h.elements.get('rampRestartButton'); assert.ok(button);
  assert.equal(button.textContent, 'Restart ramp'); assert.equal(button.disabled, true);
  restart(h); assert.equal(h.app.running, false); h.app.startMetronome(); assert.equal(button.disabled, true);
  h.elements.get('rampToggle').checked = true; h.elements.get('rampToggle').fire('change'); assert.equal(button.disabled, false);
  h.elements.get('languageButton').fire('click'); assert.equal(button.textContent, '最初から練習');
  h.app.stopMetronome(false); assert.equal(button.disabled, true);
});

test('restart preserves validated increasing-only settings after a decreasing target is rejected', () => {
  const h = rampFixture(); h.app.initControls();
  const target = h.elements.get('rampTargetBpm'); target.value = '30'; target.fire('change');
  assert.equal(h.app.settings.rampTargetBpm, 100); h.app.startMetronome(); h.tickUntil(18);
  restart(h); assert.equal(h.app.settings.rampTargetBpm, 100); assert.equal(h.elements.get('bpmNumber').textContent, 60);
});

test('muted restart and stop cancel cleanly while positive volume retains the click envelope', () => {
  const h = rampFixture({ metroVolume: 0 }); h.app.startMetronome(); h.tickUntil(1); restart(h); h.tickUntil(1.07);
  assert.ok(h.gains.every(gain => gain.calls.every(call => call.args[0] === 0)));
  h.app.stopMetronome(false); assertStopped(h);
  h.elements.get('metroVolume').value = '0.5'; h.elements.get('metroVolume').fire('input'); h.app.startMetronome();
  assert.deepEqual(h.gains.at(-1).calls.map(call => call.args[0]), [.0001, .21, .0001]);
});

test('late node completion cannot remove or disconnect a restarted session click', () => {
  const h = rampFixture(); h.app.startMetronome(); const oldClick = h.nodes[0]; restart(h);
  const currentClick = h.nodes.at(-1), currentGain = h.gains.at(-1);
  oldClick.onended();
  assert.equal(currentClick.disconnected, undefined); assert.equal(currentGain.disconnected, undefined);
  h.elements.get('metroVolume').value = '0'; h.elements.get('metroVolume').fire('input');
  assert.equal(currentGain.calls.at(-1).args[0], 0); assert.equal(h.intervals.size, 1);
});

test('late audio resume after stopping cannot recreate a canceled metronome', async () => {
  const h = rampFixture(); h.contextState('suspended'); let resolve;
  h.ctx.resume = () => new Promise(resolvePromise => { resolve = resolvePromise; });
  h.app.startMetronome(); h.app.stopMetronome(false); resolve(); await Promise.resolve();
  h.contextState('running'); h.tickUntil(3); assertStopped(h); assert.equal(h.nodes.length, 0);
});

test('ramp restart leaves an independent timer running and normal timer pause/reset still works', () => {
  const h = rampFixture({ timerMinutes: 5 }); h.app.initControls();
  h.elements.get('timerStartButton').fire('click'); const timerTick = [...h.intervals.values()][0];
  h.app.startMetronome(); h.tickUntil(30); timerTick(); assert.equal(h.elements.get('timerDisplay').textContent, '04:30');
  restart(h); assert.equal(h.intervals.size, 2); h.tickUntil(31); timerTick();
  assert.equal(h.elements.get('timerDisplay').textContent, '04:29');
  h.elements.get('timerStartButton').fire('click'); h.tickUntil(60); timerTick();
  assert.equal(h.elements.get('timerDisplay').textContent, '04:29');
  h.elements.get('timerResetButton').fire('click'); assert.equal(h.elements.get('timerDisplay').textContent, '05:00');
  assert.equal(h.app.running, true); assert.equal(h.intervals.size, 1);
});


// Removing the localized attributes or restoring the verbose Japanese privacy
// copy must fail these runtime checks, including repeat switches and reload.
for (const language of ['ja', 'en']) {
  test(`header language control names its ${language === 'ja' ? 'English' : 'Japanese'} target in ${language} UI`, () => {
    const h = loadApp({ language });
    h.app.applyLanguage();
    const button = h.elements.get('languageButton');
    assert.equal(button.textContent, language === 'ja' ? 'EN' : 'JA');
    assert.equal(button.getAttribute('aria-label'), language === 'ja' ? '英語に切り替え' : 'Switch to Japanese');
    assert.equal(button.title, language === 'ja' ? '英語に切り替え' : 'Switch to Japanese');
    assert.equal(h.document.documentElement.lang, language);
  });
}

test('header privacy copy and Help names stay localized across repeated switches and saved reloads', () => {
  let h = loadApp({ language: 'ja' });
  for (const language of ['ja', 'en', 'ja', 'en', 'ja']) {
    h.app.applyLanguage();
    const help = h.elements.get('helpButton');
    const privacy = [...h.elements.values()].find(el => el.dataset.i18n === 'privacyStrip');
    assert.equal(help.getAttribute('aria-label'), language === 'ja' ? '使い方と注意事項' : 'How to use & notes');
    assert.equal(help.title, language === 'ja' ? '使い方と注意事項' : 'How to use & notes');
    assert.equal(privacy.textContent, language === 'ja' ? '完全ローカル処理' : 'Audio is processed in your browser and is not uploaded.');
    h.elements.get('languageButton').fire('click');
    const next = language === 'ja' ? 'en' : 'ja';
    assert.equal(h.saved().language, next);
    h = loadApp(h.saved());
    h.app.applyLanguage();
    assert.equal(h.elements.get('languageButton').textContent, next === 'ja' ? 'EN' : 'JA');
    assert.equal(h.elements.get('languageButton').getAttribute('aria-label'), next === 'ja' ? '英語に切り替え' : 'Switch to Japanese');
    assert.equal(h.elements.get('languageButton').title, next === 'ja' ? '英語に切り替え' : 'Switch to Japanese');
  }
});
