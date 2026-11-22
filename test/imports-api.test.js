const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ImportRun = require('../models/ImportRun');
const app = require('../app');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name));
let server;
let base;

test.before(async () => {
  // No database in tests: stub the history collection.
  ImportRun.create = async (doc) => ({ _id: '64b7f0c2a1b2c3d4e5f60718', ...doc, status: 'running', rows: 0, skipped: 0, startedAt: new Date() });
  ImportRun.findByIdAndUpdate = async () => null;
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const upload = (bytes, name, field = 'file') => {
  const form = new FormData();
  form.append(field, new Blob([bytes]), name);
  return fetch(`${base}/api/imports`, { method: 'POST', body: form });
};

test('rejects requests without a file', async () => {
  const res = await upload(Buffer.from('x'), 'a.csv', 'wrong-field');
  assert.strictEqual(res.status, 400);
});

test('rejects unsupported formats', async () => {
  const res = await upload(Buffer.from('hello'), 'notes.txt');
  assert.strictEqual(res.status, 400);
  assert.match((await res.json()).error, /csv ou \.xlsx/);
});

test('rejects files over 5 MB', async () => {
  const res = await upload(Buffer.alloc(5 * 1024 * 1024 + 1, 97), 'big.csv');
  assert.strictEqual(res.status, 413);
  assert.match((await res.json()).error, /5 Mo/);
});

test('rejects a fake xlsx before starting an import', async () => {
  const res = await upload(Buffer.from('plain text'), 'fake.xlsx');
  assert.strictEqual(res.status, 400);
});

test('accepts a valid csv and answers 202 straight away', async () => {
  const res = await upload(fixture('sample.csv'), 'ATP.csv');
  assert.strictEqual(res.status, 202);
  const body = await res.json();
  assert.strictEqual(body.status, 'running');
  assert.strictEqual(body.filename, 'ATP.csv');
  await new Promise((r) => setTimeout(r, 300)); // let the background job settle
});

test('history endpoint rejects malformed ids', async () => {
  assert.strictEqual((await fetch(`${base}/api/imports/not-an-id`)).status, 400);
});
