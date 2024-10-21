const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Atp = require('../models/Atp');

require('dotenv').config(); // Make sure to load environment variables

const csvFilePath = path.resolve(__dirname, 'ATP.csv'); // Update this to your new CSV file name

async function importData() {
  return new Promise((resolve, reject) => {
    const records = [];
    let rowCount = 0;
    let lastRecord = null;

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        lastRecord = row;

        records.push({
          brandId: row['Brand ID'],
          plant: row['Plant'],
          crossPlantConfigurableMaterial: row['Cross Plant Configurable Material'],
          style: row['Style'],
          materialNumberId: row['Material Number ID'],
          materialNumberText: row['Material Number Text'],
          colorNrfColorCode: row['Color (nrf Color Code)'],
          characteristicValueForMainSizesOfVariantsId: row['Characteristic Value For Main Sizes Of Variants ID'],
          fashionInformationField1: row['Fashion Information Field 1'],
          hs2ProductCategory: row['HS2 Product Category'],
          brandTerritory: row['Brand Territory'],
          lastSeasonYearSeasonEMEA: row['Last Season Year/Season EMEA'],
          lotLogoFullbleedDesktop: row['Lot Logo fullbleed-desktop'],
          atpCurrentWeek30plus: parseInt(row['ATP Current Week 30plus']) || 0
        });
      })
      .on('end', () => {
        resolve({ records, rowCount, lastRecord });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function main() {
  try {
    logger.info('Starting import process');
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('Connected to MongoDB');

    await Atp.deleteMany({});
    logger.info('Existing ATP data cleared');

    const { records, rowCount, lastRecord } = await importData();
    
    await Atp.insertMany(records);
    logger.info(`Import process completed. Imported ${rowCount} records.`);
    logger.info('Last record imported:', JSON.stringify(lastRecord, null, 2));
  } catch (error) {
    logger.error('An error occurred during the import process:', error);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

main().catch(console.error);
