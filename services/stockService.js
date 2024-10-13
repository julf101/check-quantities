const db = require('../config/database');
const logger = require('../utils/logger');

function parseUrl(url) {
  logger.info(`Parsing URL: ${url}`);
  let articleCode, colorCode;
  if (url.includes('?color=')) {
    [articleCode, colorCode] = url.split('?color=');
    articleCode = articleCode.split('-').pop();
    logger.info(`URL parsed using '?color=' - Article Code: ${articleCode}, Color Code: ${colorCode}`);
  } else if (url.includes('?variationId=')) {
    [articleCode, colorCode] = url.split('?variationId=');
    articleCode = articleCode.split('-').pop();
    logger.info(`URL parsed using '?variationId=' - Article Code: ${articleCode}, Color Code: ${colorCode}`);
  } else {
    logger.warn(`URL does not contain expected parameters: ${url}`);
  }
  return { articleCode, colorCode };
}

exports.getStockInfo = async (url) => {
  logSampleData();
  logger.info(`Checking stock for URL: ${url}`);
  const { articleCode, colorCode } = parseUrl(url);
  logger.info(`Parsed URL - Article Code: ${articleCode}, Color Code: ${colorCode}`);

  // Construct the material ID by concatenating article code and color code
  const materialId = `${articleCode}${colorCode}`;
  logger.info(`Constructed Material ID: ${materialId}`);

  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM stock WHERE materialNumberId LIKE ?';
    const params = [`${materialId}%`];
    logger.info(`Executing query: ${query} with params: ${JSON.stringify(params)}`);

    db.all(query, params, (err, rows) => {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        logger.info(`Found ${rows.length} matching records`);
        if (rows.length > 0) {
          logger.info(`First matching record: ${JSON.stringify(rows[0])}`);
        } else {
          logger.info('No matching records found');
        }
        resolve(rows);
      }
    });
  });
};

exports.getQuantity = async (materialNumberId, size) => {
  logger.info(`Getting quantity for materialNumberId: ${materialNumberId}, size: ${size}`);
  return new Promise((resolve, reject) => {
    const query = 'SELECT atpCurrentWeek30plus FROM stock WHERE materialNumberId = ? AND characteristicValueForMainSizesOfVariantsId = ?';
    const params = [materialNumberId, size];
    logger.info(`Executing query: ${query} with params: ${JSON.stringify(params)}`);

    db.get(query, params, (err, row) => {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        const quantity = row ? row.atpCurrentWeek30plus : 0;
        logger.info(`Quantity found: ${quantity}`);
        resolve(quantity);
      }
    });
  });
};

function logSampleData() {
  db.all('SELECT * FROM stock LIMIT 5', [], (err, rows) => {
    if (err) {
      logger.error('Error fetching sample data:', err);
    } else {
      logger.info('Sample data from stock table:');
      rows.forEach(row => logger.info(JSON.stringify(row)));
    }
  });
}