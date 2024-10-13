const logger = require('../utils/logger');
const stockService = require('../services/stockService');

exports.renderHomePage = (req, res) => {
  res.render('index', { title: 'Stock Checker' });
};

exports.checkStock = async (req, res) => {
  try {
    const { url } = req.body;
    logger.info(`Received request to check stock for URL: ${url}`);
    const stockInfo = await stockService.getStockInfo(url);
    logger.info(`Stock info retrieved: ${JSON.stringify(stockInfo)}`);
    res.json(stockInfo);
  } catch (error) {
    logger.error('Error checking stock:', error);
    res.status(500).json({ error: 'An error occurred while checking stock' });
  }
};

exports.getQuantity = async (req, res) => {
  try {
    const { materialNumberId, size } = req.body;
    logger.info(`Received request to get quantity for materialNumberId: ${materialNumberId}, size: ${size}`);
    const quantity = await stockService.getQuantity(materialNumberId, size);
    logger.info(`Quantity retrieved: ${quantity}`);
    res.json({ quantity });
  } catch (error) {
    logger.error('Error getting quantity:', error);
    res.status(500).json({ error: 'An error occurred while getting quantity' });
  }
};