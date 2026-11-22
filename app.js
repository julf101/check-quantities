require('dotenv').config();
const express = require('express');
const path = require('path');
const catalogRoutes = require('./routes/catalogRoutes');
const importRoutes = require('./routes/importRoutes');
const { markStaleRunsFailed } = require('./services/importService');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { connectToDatabase } = require('./config/database');

const app = express();

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API
app.use('/api', catalogRoutes);
app.use('/api', importRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// Front end (built by `npm run build`)
const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectToDatabase();
    await markStaleRunsFailed();
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start when run directly, so the app can be required in tests
if (require.main === module) {
  startServer();
}

module.exports = app;
