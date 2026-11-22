const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { detectFormat, mapRow, rowsFromCsv, rowsFromXlsx, ImportError } = require('../services/importService');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name));
const collect = async (gen) => { const out = []; for await (const r of gen) out.push(r); return out; };

test('detectFormat checks the extension and the file content', () => {
  assert.strictEqual(detectFormat('ATP.CSV', fixture('sample.csv')), 'csv');
  assert.strictEqual(detectFormat('ATP.xlsx', fixture('sample.xlsx')), 'xlsx');
  assert.throws(() => detectFormat('notes.txt', Buffer.from('a,b')), ImportError);
  assert.throws(() => detectFormat('fake.xlsx', Buffer.from('a,b,c')), /invalide/);
  assert.throws(() => detectFormat('fake.csv', fixture('sample.xlsx')), /binaire/);
});

test('csv: reads rows, strips the BOM from the first header', async () => {
  const rows = await collect(rowsFromCsv(fixture('sample.csv')));
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0]['Brand ID'], 'NF');
  assert.strictEqual(mapRow(rows[1]).atpCurrentWeek30plus, 31);
});

test('xlsx: reads rows, skips blank rows, matches the csv result', async () => {
  const xlsx = (await collect(rowsFromXlsx(fixture('sample.xlsx')))).map(mapRow);
  const csv = (await collect(rowsFromCsv(fixture('sample.csv')))).map(mapRow);
  assert.strictEqual(xlsx.length, 2);
  assert.deepStrictEqual(xlsx, csv);
});

test('files without the required columns are rejected with a clear message', async () => {
  await assert.rejects(collect(rowsFromXlsx(fixture('missing-columns.xlsx'))), /Colonnes manquantes.*Material Number ID/);
  await assert.rejects(collect(rowsFromCsv(Buffer.from('Style,Plant\nX,Y\n'))), /Colonnes manquantes/);
});

test('empty files are rejected', async () => {
  await assert.rejects(collect(rowsFromCsv(Buffer.from(''))), /aucune ligne/);
});

test('corrupt xlsx is reported as an ImportError, not a crash', async () => {
  const bogus = Buffer.concat([Buffer.from('PK'), Buffer.from('not really a zip')]);
  await assert.rejects(collect(rowsFromXlsx(bogus)), ImportError);
});

test('mapRow trims text and defaults the quantity to 0', () => {
  const doc = mapRow({ 'Material Number ID': ' NF1 ', 'ATP Current Week 30plus': 'abc' });
  assert.strictEqual(doc.materialNumberId, 'NF1');
  assert.strictEqual(doc.atpCurrentWeek30plus, 0);
});
