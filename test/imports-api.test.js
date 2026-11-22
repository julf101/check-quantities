const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ImportRun = require('../models/ImportRun');
const ImportFile = require('../models/ImportFile');
const app = require('../app');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name));
let server;
let base;

test.before(async () => {
  // No database in tests: stub the history collection.
  ImportRun.create = async (doc) => ({ _id: '64b7f0c2a1b2c3d4e5f60718', ...doc, status: 'running', rows: 0, skipped: 0, startedAt: new Date() });
  ImportRun.findByIdAndUpdate = async () => null;
  ImportRun.updateMany = async () => null;
  ImportFile.create = async () => ({});
  ImportRun.find = () => ({ sort: () => ({ skip: () => ({ select: () => ({ lean: async () => [] }) }) }) });
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
  const body = await res.json();
  assert.strictEqual(body.code, 'UNSUPPORTED_FORMAT');
  assert.match(body.error, /csv ou \.xlsx/);
});

test('rejects files over 5 MB', async () => {
  const res = await upload(Buffer.alloc(5 * 1024 * 1024 + 1, 97), 'big.csv');
  assert.strictEqual(res.status, 413);
  const body = await res.json();
  assert.strictEqual(body.code, 'TOO_LARGE');
  assert.strictEqual(body.params.max, 5);
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
  assert.strictEqual(body.fileStored, true);
  await new Promise((r) => setTimeout(r, 300)); // let the background job settle
});

test('history endpoint rejects malformed ids', async () => {
  assert.strictEqual((await fetch(`${base}/api/imports/not-an-id`)).status, 400);
});

test('status endpoint returns the latest successful import, or null', async () => {
  const chain = (value) => ({ sort: () => ({ lean: async () => value }) });
  ImportRun.findOne = () => chain({ filename: 'ATP.xlsx', rows: 10, finishedAt: new Date('2026-11-22T11:22:00Z') });
  let body = await (await fetch(`${base}/api/status`)).json();
  assert.strictEqual(body.lastImport.filename, 'ATP.xlsx');
  assert.strictEqual(body.lastImport.finishedAt, '2026-11-22T11:22:00.000Z');
  ImportRun.findOne = () => chain(null);
  body = await (await fetch(`${base}/api/status`)).json();
  assert.strictEqual(body.lastImport, null);
});

test('download returns the stored file as an attachment with a safe name', async () => {
  const bytes = fixture('sample.csv');
  ImportFile.findOne = async () => ({ filename: 'ATP "week" 46\r\n.csv', contentType: 'text/csv', data: bytes });
  const res = await fetch(`${base}/api/imports/64b7f0c2a1b2c3d4e5f60718/file`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/csv/);
  const disposition = res.headers.get('content-disposition');
  assert.match(disposition, /^attachment; filename="ATP _week_ 46__\.csv"/); // quotes and newlines neutralised
  assert.deepStrictEqual(Buffer.from(await res.arrayBuffer()), bytes);
});

test('download answers 404 when the file was pruned and 400 for bad ids', async () => {
  ImportFile.findOne = async () => null;
  assert.strictEqual((await fetch(`${base}/api/imports/64b7f0c2a1b2c3d4e5f60718/file`)).status, 404);
  assert.strictEqual((await fetch(`${base}/api/imports/nope/file`)).status, 400);
});
