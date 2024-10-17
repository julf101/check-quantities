require('dotenv').config();
const { connectToDatabase } = require('./config/database');
const importAtp = require('./scripts/importAtp');

async function runImport() {
  try {
    await connectToDatabase();
    await importAtp();
    console.log('Import completed successfully');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    process.exit(0);
  }
}

runImport();
