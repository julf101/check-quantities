const mongoose = require('mongoose');

// The uploaded file itself, kept separately from the (light) history records.
const importFileSchema = new mongoose.Schema({
  run: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportRun', index: true },
  filename: String,
  contentType: String,
  data: Buffer
});

module.exports = mongoose.model('ImportFile', importFileSchema);
