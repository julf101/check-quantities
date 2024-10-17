const logger = require('../utils/logger');
const Atp = require('../models/Atp');

function parseUrl(url) {
  logger.info(`Parsing URL: ${url}`);
  let articleCode, colorCode;

  if (url.includes('?color=')) {
    [articleCode, colorCode] = url.split('?color=');
    articleCode = articleCode.split('-').pop();
    logger.info(`URL parsed using '?color=' - Article Code: ${articleCode}, Color Code: ${colorCode}`);
  } else if (url.includes('?variationId=')) {
    [articleCode, variationPart] = url.split('?variationId=');
    articleCode = articleCode.split('-').pop();
    
    // Check if there's a color parameter after variationId
    if (variationPart.includes('&color=')) {
      [, colorCode] = variationPart.split('&color=');
      logger.info(`URL parsed using '?variationId=' and '&color=' - Article Code: ${articleCode}, Color Code: ${colorCode}`);
    } else {
      colorCode = variationPart;
      logger.info(`URL parsed using '?variationId=' - Article Code: ${articleCode}, Color Code: ${colorCode}`);
    }
  } else {
    logger.warn(`URL does not contain expected parameters: ${url}`);
  }

  return { articleCode, colorCode };
}

async function logSampleData() {
  try {
    const sampleData = await Atp.find().limit(5);
    logger.info('Sample data:', sampleData);
    return sampleData;
  } catch (err) {
    logger.error('Error fetching sample data:', err);
    throw err;
  }
}

exports.getStockInfo = async (url) => {
  await logSampleData();
  logger.info(`Checking stock for URL: ${url}`);
  const { articleCode, colorCode } = parseUrl(url);
  logger.info(`Parsed URL - Article Code: ${articleCode}, Color Code: ${colorCode}`);

  const materialId = `${articleCode}${colorCode}`;
  logger.info(`Constructed Material ID: ${materialId}`);

  try {
    const query = { materialNumberId: { $regex: `^${materialId}`, $options: 'i' } };
    logger.info(`Executing query:`, query);

    const results = await Atp.find(query);
    logger.info(`Found ${results.length} matching records`);
    if (results.length > 0) {
      logger.info(`First matching record: ${JSON.stringify(results[0])}`);
    } else {
      logger.info('No matching records found');
    }
    return results;
  } catch (err) {
    logger.error('Database query error:', err);
    throw err;
  }
};

exports.getQuantity = async (materialNumberId, size) => {
  logger.info(`Getting quantity for materialNumberId: ${materialNumberId}, size: ${size}`);
  try {
    const query = { materialNumberId: materialNumberId, characteristicValueForMainSizesOfVariantsId: size };
    logger.info(`Executing query:`, query);

    const result = await Atp.findOne(query);
    const quantity = result ? result.atpCurrentWeek30plus : 0;
    return quantity;
  } catch (err) {
    logger.error('Database query error:', err);
    throw err;
  }
};

module.exports = {
  getStockInfo: exports.getStockInfo,
  getQuantity: exports.getQuantity
};
