const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/stock.db'
  : path.join(__dirname, '..', 'stock.db');

let db;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Could not connect to database', err);
        reject(err);
      } else {
        logger.info('Connected to SQLite database');
        createTable().then(resolve).catch(reject);
      }
    });
  });
}

function createTable() {
  return new Promise((resolve, reject) => {
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
        reject(err);
      } else {
        logger.info('Stock table created or already exists');
        resolve();
      }
    });
  });
}

module.exports = {
  initializeDatabase,
  getDatabase: () => db
};
