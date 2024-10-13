const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');

const dbPath = path.resolve(__dirname, '../stock.db');

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
    material_number_id TEXT,
    characteristic_value TEXT,
    quantity INTEGER
  )`, (err) => {
    if (err) {
      logger.error('Error creating table', err);
    } else {
      logger.info('Stock table created or already exists');
    }
  });
}

module.exports = db;