const logger = require('../utils/logger');
const stockService = require('../services/stockService');

exports.renderHomePage = (req, res) => {
  res.render('index', { title: 'Stock Checker' });
};

exports.checkStock = async (req, res) => {
  try {
    const url = req.body.url;
    const stockInfo = await stockService.getStockInfo(url);
    res.json(stockInfo);
  } catch (error) {
    logger.error('Error checking stock:', error);
    res.status(500).json({ error: 'An error occurred while checking stock' });
  }
};

exports.getQuantity = async (req, res) => {
  try {
    const { materialNumberId, size } = req.body;
    const quantity = await stockService.getQuantity(materialNumberId, size);
    res.json({ quantity });
  } catch (error) {
    logger.error('Error getting quantity:', error);
    res.status(500).json({ error: 'An error occurred while getting quantity' });
  }
};
