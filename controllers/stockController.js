const logger = require('../utils/logger');
const stockService = require('../services/stockService');

const isNonEmptyString = (v, max = 500) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

exports.renderHomePage = (req, res) => {
  res.render('index', { title: 'Stock Checker' });
};

exports.checkStock = async (req, res) => {
  try {
    const url = req.body && req.body.url;
    if (!isNonEmptyString(url, 2000)) {
      return res.status(400).json({ error: 'INVALID_URL_FORMAT' });
    }
    const stockInfo = await stockService.getStockInfo(url);
    res.json(stockInfo);
  } catch (error) {
    if (error.message === 'INVALID_URL_FORMAT') {
      return res.status(400).json({ error: 'INVALID_URL_FORMAT' });
    }
    logger.error('Error checking stock:', error);
    res.status(500).json({ error: 'An error occurred while checking stock' });
  }
};

exports.getQuantity = async (req, res) => {
  try {
    const { materialNumberId, size } = req.body || {};
    // Strings only: objects here would be interpreted as MongoDB query operators
    if (!isNonEmptyString(materialNumberId, 50) || !isNonEmptyString(size, 20)) {
      return res.status(400).json({ error: 'INVALID_PARAMETERS' });
    }
    const quantity = await stockService.getQuantity(materialNumberId, size);
    res.json({ quantity });
  } catch (error) {
    logger.error('Error getting quantity:', error);
    res.status(500).json({ error: 'An error occurred while getting quantity' });
  }
};
