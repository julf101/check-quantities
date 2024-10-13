const logger = require('../config/logger');

function parseUrl(url) {
  logger.info(`Parsing URL: ${url}`);
  let articleCode, colorCode;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    if (pathname.includes('/p/')) {
      articleCode = pathname.split('/').pop().split('-').pop();
      colorCode = searchParams.get('color');
    } else if (pathname.includes('/shop/')) {
      articleCode = pathname.split('-').pop();
      colorCode = searchParams.get('variationId');
    }

    if (!articleCode || !colorCode) {
      throw new Error('Unable to extract article code or color code');
    }

    logger.info(`Parsed Article Code: ${articleCode}, Color Code: ${colorCode}`);
    return { articleCode, colorCode };
  } catch (error) {
    logger.error('Error parsing URL', error);
    return null;
  }
}

module.exports = { parseUrl };
