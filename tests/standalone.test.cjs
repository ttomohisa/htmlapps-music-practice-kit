const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');

test('built HTML contains the current source, and the Browser Kitty alias is byte-identical', () => {
  const normalize = text => text.replace(/const APP_CONFIG = .*;/, 'const APP_CONFIG = CONFIG;').replace(/const BUILD_MANIFEST = .*;/, 'const BUILD_MANIFEST = MANIFEST;').replace(/const EMBEDDED_ASSET_BUNDLE_BASE64 = .*;/, 'const EMBEDDED_ASSET_BUNDLE_BASE64 = ASSETS;');
  assert.equal(normalize(html), normalize(source));
  assert.deepEqual(fs.readFileSync(path.join(root, 'music-practice-kit.html')), Buffer.from(html));
});

test('self-extracting release restores the exact standalone HTML', () => {
  const loader = fs.readFileSync(path.join(root, 'dist/index.self-extract.html'), 'utf8');
  const payload = loader.match(/const b='([^']+)'/)[1];
  assert.deepEqual(zlib.gunzipSync(Buffer.from(payload, 'base64')), Buffer.from(html));
});

test('standalone source has valid JavaScript, unique IDs, and no remote runtime dependency', () => {
  for (const match of html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /__(?:APP_CONFIG_JSON|BUILD_MANIFEST_JSON|EMBEDDED_ASSET_BUNDLE_BASE64)__/);
  assert.doesNotMatch(html, /<script\s+[^>]*src\s*=|<link\s+[^>]*href\s*=\s*["']https?:\/\/|@import\s+url|fetch\s*\(|XMLHttpRequest|WebSocket\s*\(/);
});

test('all localization keys, including ramp labels and help, exist in both languages', () => {
  const block = source.slice(source.indexOf('const translations = '), source.indexOf('let settings = loadSettings();'));
  const translations = vm.runInNewContext(`${block}; translations;`);
  assert.deepEqual(Object.keys(translations.ja).sort(), Object.keys(translations.en).sort());
  for (const match of source.matchAll(/data-i18n(?:-title|-aria-label)?="([^"]+)"/g)) {
    for (const language of ['ja', 'en']) assert.ok(translations[language][match[1]], `${language}: ${match[1]}`);
  }
  assert.match(translations.en.helpRampBody, /interrupted bar/);
  assert.match(translations.ja.helpRampBody, /小節/);
});
