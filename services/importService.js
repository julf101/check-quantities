const { Readable } = require('stream');
const csv = require('csv-parser');
const { readSheet } = require('read-excel-file/node');
const mongoose = require('mongoose');
const Atp = require('../models/Atp');
const ImportRun = require('../models/ImportRun');
const ImportFile = require('../models/ImportFile');
const logger = require('../utils/logger');
const { invalidateCatalog } = require('./catalogService');
const { notifyImportSuccess } = require('./slackService');

const BATCH_SIZE = 5000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const KEEP_FILES = 12; // uploaded files kept for download; older ones are pruned

// Columns the app cannot work without; the rest are optional.
const REQUIRED_HEADERS = [
  'Material Number ID',
  'Cross Plant Configurable Material',
  'Characteristic Value For Main Sizes Of Variants ID',
  'ATP Current Week 30plus',
  'Style',
  'Color (nrf Color Code)'
];

/** `code` lets the front end translate the message; `message` is a French fallback. */
class ImportError extends Error {
  constructor(code, message, params = {}) {
    super(message);
    this.code = code;
    this.params = params;
  }
}

const normalizeHeader = (h) => String(h ?? '').replace(/^﻿/, '').trim();
const text = (v) => (v === null || v === undefined ? '' : String(v).trim());

function mapRow(row) {
  return {
    brandId: text(row['Brand ID']),
    plant: text(row['Plant']),
    crossPlantConfigurableMaterial: text(row['Cross Plant Configurable Material']),
    style: text(row['Style']),
    materialNumberId: text(row['Material Number ID']),
    materialNumberText: text(row['Material Number Text']),
    colorNrfColorCode: text(row['Color (nrf Color Code)']),
    characteristicValueForMainSizesOfVariantsId: text(row['Characteristic Value For Main Sizes Of Variants ID']),
    fashionInformationField1: text(row['Fashion Information Field 1']),
    hs2ProductCategory: text(row['HS2 Product Category']),
    brandTerritory: text(row['Brand Territory']),
    lastSeasonYearSeasonEMEA: text(row['Last Season Year/Season EMEA']),
    lotLogoFullbleedDesktop: text(row['Lot Logo fullbleed-desktop']),
    atpCurrentWeek30plus: parseInt(text(row['ATP Current Week 30plus']), 10) || 0
  };
}

function assertHeaders(headers) {
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) {
    throw new ImportError('MISSING_COLUMNS', `Colonnes manquantes dans le fichier : ${missing.join(', ')}`, { columns: missing.join(', ') });
  }
}

/** Detects csv/xlsx from the file name and content (never trusts the name alone). */
function detectFormat(filename, buffer) {
  const ext = String(filename || '').toLowerCase().split('.').pop();
  const isZip = buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b; // "PK"
  if (ext === 'xlsx') {
    if (!isZip) throw new ImportError('INVALID_XLSX', 'Ce fichier .xlsx est invalide ou corrompu.');
    return 'xlsx';
  }
  if (ext === 'csv') {
    if (isZip || buffer.includes(0)) throw new ImportError('BINARY_CSV', 'Ce fichier .csv semble être un fichier binaire.');
    return 'csv';
  }
  throw new ImportError('UNSUPPORTED_FORMAT', 'Format non supporté : utilisez un fichier .csv ou .xlsx.');
}

async function* rowsFromCsv(buffer) {
  const stream = Readable.from([buffer]).pipe(csv({ mapHeaders: ({ header }) => normalizeHeader(header) }));
  let checked = false;
  for await (const row of stream) {
    if (!checked) { assertHeaders(Object.keys(row)); checked = true; }
    yield row;
  }
  if (!checked) throw new ImportError('EMPTY_FILE', 'Le fichier ne contient aucune ligne.');
}

async function* rowsFromXlsx(buffer) {
  let sheet;
  try {
    sheet = await readSheet(buffer);
  } catch (err) {
    throw new ImportError('UNREADABLE_XLSX', 'Impossible de lire ce fichier Excel (fichier invalide ou corrompu).');
  }
  if (sheet.length < 2) throw new ImportError('EMPTY_FILE', 'Le fichier ne contient aucune ligne.');
  const headers = sheet[0].map(normalizeHeader);
  assertHeaders(headers);
  for (const cells of sheet.slice(1)) {
    if (!cells.some((c) => c !== null && c !== undefined && c !== '')) continue; // blank row
    const row = {};
    headers.forEach((h, i) => { if (h) row[h] = cells[i]; });
    yield row;
  }
}

/**
 * Loads rows into a temporary collection in batches, then swaps it in for the
 * live one. A failed import leaves the existing stock data untouched.
 */
async function loadRows(rows) {
  const db = mongoose.connection.db;
  const liveName = Atp.collection.collectionName;
  const tempName = `${liveName}_import`;
  await db.collection(tempName).drop().catch(() => {});
  const temp = db.collection(tempName);

  let batch = [];
  let imported = 0;
  let skipped = 0;
  const flush = async () => {
    if (!batch.length) return;
    await temp.insertMany(batch, { ordered: false });
    imported += batch.length;
    batch = [];
  };

  try {
    for await (const row of rows) {
      const doc = mapRow(row);
      if (!doc.materialNumberId || !doc.crossPlantConfigurableMaterial) { skipped++; continue; }
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) await flush();
    }
    await flush();
    if (imported === 0) throw new ImportError('NO_VALID_ROWS', 'Aucune ligne valide : les données existantes sont conservées.');
    await temp.createIndex({ materialNumberId: 1 });
    await temp.rename(liveName, { dropTarget: true });
    invalidateCatalog();
    return { rows: imported, skipped };
  } catch (err) {
    await temp.drop().catch(() => {});
    throw err;
  }
}

async function importBuffer(buffer, filename) {
  const format = detectFormat(filename, buffer);
  const rows = format === 'xlsx' ? rowsFromXlsx(buffer) : rowsFromCsv(buffer);
  return { format, ...(await loadRows(rows)) };
}

// --- tracked imports (used by the upload page) -------------------------------
let running = false;

async function markStaleRunsFailed() {
  await ImportRun.updateMany(
    { status: 'running' },
    { status: 'failed', error: 'Interrompu (redémarrage du serveur)', errorCode: 'INTERRUPTED', finishedAt: new Date() }
  );
}

/** Keeps the files of the newest KEEP_FILES runs; frees the space of older ones. */
async function pruneOldFiles() {
  const old = await ImportRun.find({ fileStored: true }).sort({ startedAt: -1 }).skip(KEEP_FILES).select('_id').lean();
  if (!old.length) return;
  const ids = old.map((r) => r._id);
  await ImportFile.deleteMany({ run: { $in: ids } });
  await ImportRun.updateMany({ _id: { $in: ids } }, { fileStored: false });
}

/** Starts an import in the background and returns its history record straight away. */
async function startImport(buffer, filename) {
  if (running) throw new ImportError('IMPORT_RUNNING', 'Un import est déjà en cours. Réessayez dans un instant.');
  const format = detectFormat(filename, buffer); // fail fast, before creating a run
  running = true;
  const run = await ImportRun.create({ filename, format, sizeBytes: buffer.length });
  try {
    await ImportFile.create({
      run: run._id, filename, data: buffer,
      contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
    });
    await ImportRun.findByIdAndUpdate(run._id, { fileStored: true });
    run.fileStored = true;
  } catch (err) {
    logger.error('Could not store the uploaded file (import continues):', err);
  }

  (async () => {
    try {
      const result = await importBuffer(buffer, filename);
      await ImportRun.findByIdAndUpdate(run._id, { status: 'success', rows: result.rows, skipped: result.skipped, finishedAt: new Date() });
      logger.info(`Import ${filename} done: ${result.rows} rows, ${result.skipped} skipped`);
      notifyImportSuccess({ filename, rows: result.rows, skipped: result.skipped }); // fire and forget
    } catch (err) {
      const known = err instanceof ImportError;
      if (!known) logger.error('Import failed:', err);
      await ImportRun.findByIdAndUpdate(run._id, {
        status: 'failed',
        error: known ? err.message : 'Erreur interne pendant l\'import.',
        errorCode: known ? err.code : 'INTERNAL',
        errorParams: known ? err.params : undefined,
        finishedAt: new Date()
      }).catch(() => {});
    } finally {
      running = false;
      pruneOldFiles().catch((err) => logger.error('Pruning old uploads failed:', err));
    }
  })();

  return run;
}

module.exports = {
  ImportError, KEEP_FILES, MAX_UPLOAD_BYTES, REQUIRED_HEADERS,
  mapRow, detectFormat, rowsFromCsv, rowsFromXlsx, importBuffer, startImport, markStaleRunsFailed
};
