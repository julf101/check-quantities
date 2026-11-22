const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const ImportRun = require('../models/ImportRun');
const ImportFile = require('../models/ImportFile');
const logger = require('../utils/logger');
const { startImport, ImportError, MAX_UPLOAD_BYTES } = require('../services/importService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }).single('file');

const toJson = (r) => ({
  id: r._id, filename: r.filename, format: r.format, sizeBytes: r.sizeBytes, status: r.status,
  rows: r.rows, skipped: r.skipped, error: r.error, errorCode: r.errorCode, errorParams: r.errorParams,
  fileStored: Boolean(r.fileStored), startedAt: r.startedAt, finishedAt: r.finishedAt
});

router.post('/imports', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ code: 'TOO_LARGE', params: { max: MAX_UPLOAD_BYTES / 1024 / 1024 }, error: `Fichier trop volumineux (maximum ${MAX_UPLOAD_BYTES / 1024 / 1024} Mo).` });
      }
      return res.status(400).json({ code: 'UPLOAD_FAILED', error: 'Envoi du fichier impossible.' });
    }
    if (!req.file) return res.status(400).json({ code: 'NO_FILE', error: 'Aucun fichier reçu.' });
    try {
      const run = await startImport(req.file.buffer, req.file.originalname);
      res.status(202).json(toJson(run));
    } catch (e) {
      if (e instanceof ImportError) return res.status(e.code === 'IMPORT_RUNNING' ? 409 : 400).json({ code: e.code, params: e.params, error: e.message });
      logger.error('Upload failed:', e);
      res.status(500).json({ error: 'Erreur interne.' });
    }
  });
});

router.get('/imports', async (req, res) => {
  try {
    const runs = await ImportRun.find().sort({ startedAt: -1 }).limit(50).lean();
    res.json(runs.map(toJson));
  } catch (e) {
    logger.error('Listing imports failed:', e);
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

router.get('/imports/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'INVALID_ID' });
    const run = await ImportRun.findById(req.params.id).lean();
    if (!run) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(toJson(run));
  } catch (e) {
    logger.error('Reading import failed:', e);
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

// Date of the data currently in use (latest successful import)
router.get('/status', async (req, res) => {
  try {
    const run = await ImportRun.findOne({ status: 'success' }).sort({ finishedAt: -1 }).lean();
    res.json({ lastImport: run ? { filename: run.filename, rows: run.rows, finishedAt: run.finishedAt } : null });
  } catch (e) {
    logger.error('Reading status failed:', e);
    res.status(500).json({ code: 'INTERNAL', error: 'Erreur interne.' });
  }
});

// Download the file that was uploaded for a given import
router.get('/imports/:id/file', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'INVALID_ID' });
    const file = await ImportFile.findOne({ run: req.params.id });
    if (!file) return res.status(404).json({ error: 'NOT_FOUND' });
    const safe = String(file.filename || 'atp').replace(/[^\w. -]/g, '_');
    res.set({
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(file.filename || 'atp')}`,
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(file.data);
  } catch (e) {
    logger.error('Download failed:', e);
    res.status(500).json({ code: 'INTERNAL', error: 'Erreur interne.' });
  }
});

module.exports = router;
