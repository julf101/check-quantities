const test = require('node:test');
const assert = require('node:assert');
const { parseUrl } = require('../services/stockService');

test('parseUrl extracts NF0A and NF00 article codes', () => {
  assert.strictEqual(
    parseUrl('https://www.thenorthface.ch/fr-ch/p/x-211701/veste-NF0A87ZK?color=5NO').articleCode,
    'NF0A87ZK'
  );
  assert.strictEqual(parseUrl('https://x.ch/p/NF00CHA1').articleCode, 'NF00CHA1');
});

test('parseUrl rejects URLs without an article code', () => {
  assert.throws(() => parseUrl('https://example.com/foo'), /INVALID_URL_FORMAT/);
});
