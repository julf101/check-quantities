const logger = require('../utils/logger');
const Atp = require('../models/Atp');

function parseUrl(url) {
  logger.info(`Parsing URL: ${url}`);
  let articleCode;

  // Updated regex to handle both NF0A and NF00 patterns
  const matches = url.match(/NF0[0A][A-Z0-9]+/);
  if (matches) {
    articleCode = matches[0];
    logger.info(`Found article code: ${articleCode}`);
    return { articleCode };
  } else {
    logger.warn(`Invalid URL format: ${url}`);
    throw new Error('INVALID_URL_FORMAT');
  }
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
  logger.info(`Checking stock for URL: ${url}`);
  const { articleCode } = parseUrl(url);

  try {
    // Find all items matching the article code
    const query = { 
      materialNumberId: { $regex: articleCode, $options: 'i' }
    };
    logger.info(`Executing query:`, query);

    const results = await Atp.find(query);
    logger.info(`Found ${results.length} matching records`);

    if (results.length === 0) {
      logger.info('No matching records found');
      return { error: 'NO_STOCK' };
    }

    // Group results by color
    const colorGroups = results.reduce((acc, item) => {
      const color = item.colorNrfColorCode;
      if (!acc[color]) {
        acc[color] = {
          colorCode: color,
          image: item.lotLogoFullbleedDesktop,
          sizes: {}
        };
      }
      
      // Aggregate quantities for same sizes
      const size = item.characteristicValueForMainSizesOfVariantsId;
      if (!acc[color].sizes[size]) {
        acc[color].sizes[size] = 0;
      }
      acc[color].sizes[size] += item.atpCurrentWeek30plus || 0;
      
      return acc;
    }, {});

    return {
      articleCode,
      colors: Object.values(colorGroups)
    };
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
