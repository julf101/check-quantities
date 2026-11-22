require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Atp = require('../models/Atp');

const csvFilePath = path.resolve(process.argv[2] || path.join(__dirname, 'ATP.csv'));
const BATCH_SIZE = 5000;

function mapRow(row) {
  return {
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
    atpCurrentWeek30plus: parseInt(row['ATP Current Week 30plus'], 10) || 0
  };
}

/**
 * Streams the CSV and inserts it in batches into a temporary collection, so the
 * whole file is never held in memory. The live collection is only replaced once
 * the full import succeeded; a failed import leaves existing data untouched.
 */
async function importAtp() {
  const db = mongoose.connection.db;
  const liveName = Atp.collection.collectionName;
  const tempName = `${liveName}_import`;

  await db.collection(tempName).drop().catch(() => {}); // leftover from a failed run
  const temp = db.collection(tempName);

  let batch = [];
  let total = 0;
  const flush = async () => {
    if (batch.length === 0) return;
    await temp.insertMany(batch, { ordered: false });
    total += batch.length;
    batch = [];
    logger.info(`Imported ${total} rows so far`);
  };

  try {
    const stream = fs.createReadStream(csvFilePath, { encoding: 'utf8' })
      .pipe(csv({ mapHeaders: ({ header }) => header.replace(/^﻿/, '').trim() }));
    for await (const row of stream) {
      batch.push(mapRow(row));
      if (batch.length >= BATCH_SIZE) await flush();
    }
    await flush();

    if (total === 0) throw new Error('CSV contained no rows; keeping existing data');

    await temp.createIndex({ materialNumberId: 1 });
    await temp.rename(liveName, { dropTarget: true });
    logger.info(`Import completed. Imported ${total} records.`);
    return total;
  } catch (err) {
    await temp.drop().catch(() => {});
    throw err;
  }
}

module.exports = importAtp;

if (require.main === module) {
  (async () => {
    try {
      if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not defined');
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info(`Starting import from ${csvFilePath}`);
      await importAtp();
    } catch (error) {
      logger.error('An error occurred during the import process:', error);
      process.exitCode = 1;
    } finally {
      await mongoose.connection.close();
    }
  })();
}
