const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.DATABASE_URI;

  if (!uri) {
    throw new Error('DATABASE_URI is not set');
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
