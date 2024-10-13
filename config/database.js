const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/stock.db'
  : path.join(__dirname, '..', 'stock.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Could not connect to database', err);
  } else {
    logger.info('Connected to SQLite database');
    createTable();
  }
});

function createTable() {
  db.run(`CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brandId TEXT,
    plant TEXT,
    crossPlantConfigurableMaterial TEXT,
    style TEXT,
    materialNumberId TEXT,
    materialNumberText TEXT,
    colorNrfColorCode TEXT,
    characteristicValueForMainSizesOfVariantsId TEXT,
    fashionInformationField1 TEXT,
    hs2ProductCategory TEXT,
    brandTerritory TEXT,
    lastSeasonYearSeasonEMEA TEXT,
    lotLogoFullbleedDesktop TEXT,
    atpCurrentWeek30plus INTEGER
  )`, (err) => {
    if (err) {
      logger.error('Error creating table', err);
    } else {
      logger.info('Stock table created or already exists');
    }
  });
}

module.exports = db;