const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const stockController = require('./controllers/stockController');
const logger = require('./utils/logger');
const { initializeDatabase, getDatabase } = require('./config/database');
const importAtp = require('./scripts/importAtp');


const app = express();

console.log('Starting application...');

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

// Function to start the server
// We define a startServer function to encapsulate the server start logic.
const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

// Initialize database and start server
initializeDatabase()
  .then(() => {
    if (process.env.IMPORT_DATA === 'true') {
      return importAtp(getDatabase());
    }
  })
  .then(() => {
    startServer();
  })
  .catch((error) => {
    logger.error('Failed to initialize database or import data:', error);
    process.exit(1);
  });

module.exports = app;