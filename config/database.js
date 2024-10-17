const mongoose = require('mongoose');
const logger = require('../utils/logger');

const uri = process.env.MONGODB_URI;

async function connectToDatabase() {
  try {
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
