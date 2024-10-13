const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/', stockController.renderHomePage);
router.post('/check-stock', stockController.checkStock);
router.post('/get-quantity', stockController.getQuantity);

module.exports = router;