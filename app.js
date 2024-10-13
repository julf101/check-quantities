const express = require('express');
const bodyParser = require('body-parser'); // Add this line
const path = require('path');
const stockController = require('./controllers/stockController');
const logger = require('./utils/logger');
const db = require('./config/database');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', stockController.renderHomePage);
app.post('/check-stock', stockController.checkStock);
app.post('/get-quantity', stockController.getQuantity);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;