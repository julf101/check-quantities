// CLI import: npm run import-atp [-- path/to/file.csv|xlsx]
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { importBuffer } = require('../services/importService');

const filePath = path.resolve(process.argv[2] || path.join(__dirname, 'ATP.csv'));

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not defined');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`Starting import from ${filePath}`);
    const result = await importBuffer(fs.readFileSync(filePath), path.basename(filePath));
    logger.info(`Import completed: ${result.rows} rows (${result.skipped} skipped)`);
  } catch (error) {
    logger.error('An error occurred during the import process:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
