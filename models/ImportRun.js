const mongoose = require('mongoose');

const importRunSchema = new mongoose.Schema({
  filename: String,
  format: { type: String, enum: ['csv', 'xlsx'] },
  sizeBytes: Number,
  status: { type: String, enum: ['running', 'success', 'failed'], default: 'running' },
  rows: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  error: String,
  errorCode: String,
  errorParams: mongoose.Schema.Types.Mixed,
  fileStored: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date
});

module.exports = mongoose.model('ImportRun', importRunSchema);
