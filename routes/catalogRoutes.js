const express = require('express');
const logger = require('../utils/logger');
const catalog = require('../services/catalogService');

const router = express.Router();

router.get('/catalog', async (req, res) => {
  try {
    res.json(catalog.queryCatalog(await catalog.getCatalog(), req.query));
  } catch (error) {
    logger.error('Error loading catalog:', error);
    res.status(500).json({ error: 'An error occurred while loading the catalog' });
  }
});

router.get('/catalog/:code', async (req, res) => {
  try {
    if (!/^[A-Za-z0-9]{8}$/.test(req.params.code)) {
      return res.status(400).json({ error: 'INVALID_CODE' });
    }
    const model = await catalog.getModel(req.params.code);
    if (!model) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(model);
  } catch (error) {
    logger.error('Error loading model:', error);
    res.status(500).json({ error: 'An error occurred while loading the product' });
  }
});

module.exports = router;
