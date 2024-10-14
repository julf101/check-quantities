const db = require('../config/database');
const fs = require('fs');
const csv = require('csv-parser');
const logger = require('../config/logger');
const path = require('path');

const csvFilePath = path.resolve(__dirname, 'ATP.csv');

async function deleteExistingRecords(db) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM stock', function(err) {
      if (err) {
        logger.error('Error deleting existing records:', err);
        reject(err);
      } else {
        logger.info(`Deleted ${this.changes} existing records`);
        resolve(this.changes);
      }
    });
  });
}

async function importData(db) {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    let lastRecord = null;

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        lastRecord = row;

        const sql = `INSERT INTO stock (
          brandId, plant, crossPlantConfigurableMaterial, style, materialNumberId, 
          materialNumberText, colorNrfColorCode, characteristicValueForMainSizesOfVariantsId, 
          fashionInformationField1, hs2ProductCategory, brandTerritory, 
          lastSeasonYearSeasonEMEA, lotLogoFullbleedDesktop, atpCurrentWeek30plus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [
          row['Brand ID'],
          row['Plant'],
          row['Cross Plant Configurable Material'],
          row['Style'],
          row['Material Number ID'],
          row['Material Number Text'],
          row['Color (nrf Color Code)'],
          row['Characteristic Value For Main Sizes Of Variants ID'],
          row['Fashion Information Field 1'],
          row['HS2 Product Category'],
          row['Brand Territory'],
          row['Last Season Year/Season EMEA'],
          row['Lot Logo fullbleed-desktop'],
          parseInt(row['ATP Current Week 30plus']) || 0
        ];

        db.run(sql, values, (err) => {
          if (err) {
            logger.error(`Error inserting row ${rowCount}:`, err);
          }
        });
      })
      .on('end', () => {
        logger.info(`CSV file successfully processed. Total rows imported: ${rowCount}`);
        resolve({ rowCount, lastRecord });
      })
      .on('error', (error) => {
        logger.error(`Error processing CSV: ${error.message}`);
        reject(error);
      });
  });
}

async function main(db) {
  try {
    logger.info('Starting import process');
    const deletedCount = await deleteExistingRecords(db);
    const { rowCount, lastRecord } = await importData(db);
    logger.info(`Import process completed. Deleted ${deletedCount} records, imported ${rowCount} records.`);
    logger.info('Last record imported:', JSON.stringify(lastRecord, null, 2));
  } catch (error) {
    logger.error('An error occurred during the import process:', error);
    throw error;
  }
}

module.exports = main;
