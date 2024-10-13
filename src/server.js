const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('../config/logger');
const { parseUrl } = require('./urlParser');
const { checkStock } = require('./stockChecker');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// View engine setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.set('layout', 'layout');

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Stock Checker' });
});

app.post('/check-stock', async (req, res) => {
  const { url } = req.body;
  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return res.render('index', { title: 'Stock Checker', error: 'Invalid URL' });
  }

  const { articleCode, colorCode } = parsedUrl;
  const stockItems = await checkStock(articleCode, colorCode);

  if (stockItems.length === 0) {
    return res.render('index', { title: 'Stock Checker', error: 'No matching items found' });
  }

  res.render('stock-results', { title: 'Stock Results', stockItems, url });
});

app.post('/select-size', async (req, res) => {
  const { url, size } = req.body;
  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return res.render('index', { title: 'Stock Checker', error: 'Invalid URL' });
  }

  const { articleCode, colorCode } = parsedUrl;
  const stockItems = await checkStock(articleCode, colorCode);
  const selectedItem = stockItems.find(item => item.characteristic_value === size);

  if (!selectedItem) {
    return res.render('index', { title: 'Stock Checker', error: 'Selected size not available' });
  }

  res.render('quantity-selection', { title: 'Select Quantity', selectedItem, url });
});

app.post('/confirm-order', (req, res) => {
  const { url, size, quantity } = req.body;
  // Here you would typically process the order, update inventory, etc.
  res.render('order-confirmation', { title: 'Order Confirmation', url, size, quantity });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
