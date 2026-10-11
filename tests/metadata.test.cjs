// Removing or misdescribing the distributable/runtime metadata must fail this contract.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
test('app metadata describes the existing standalone output and network policy', () => {
  assert.ok(fs.existsSync(path.join(root, 'app.config.json')), 'app.config.json is required');
  const config = JSON.parse(read('app.config.json'));
  assert.equal(config.build?.output, 'dist/index.html');
  assert.equal(config.build?.blockRuntimeNetwork, true);
  assert.equal(config.version, '1.0.4');
  assert.equal(config.build.selfExtract.output, 'dist/index.self-extract.html');
  assert.match(read('dist/index.html'), /connect-src 'none'/);
});
