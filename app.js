require('dotenv').config();
const express = require('express');
const path = require('path');
const stockRoutes = require('./routes/stockRoutes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { connectToDatabase } = require('./config/database');

const app = express();

console.log('Starting application...');

// Middleware
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', stockRoutes);

// Error handler (must be registered after the routes)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Function to start the server
async function startServer() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start when run directly, so the app can be required in tests
if (require.main === module) {
  startServer();
}

module.exports = app;
