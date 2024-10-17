const mongoose = require('mongoose');
const logger = require('../utils/logger');
require('dotenv').config(); // Add this line to ensure .env is loaded

const uri = process.env.MONGODB_URI;

async function connectToDatabase() {
  try {
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('Connected to MongoDB Atlas');
  } catch (error) {
    logger.error('Error connecting to MongoDB Atlas:', error);
    throw error;
  }
}

function getDatabase() {
  return mongoose.connection;
}

module.exports = {
  connectToDatabase,
  getDatabase
};
