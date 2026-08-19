// backend/config/db.js - OPTIMIZED

const mongoose = require('mongoose');

const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      console.log('🔄 Connecting to MongoDB...');
      
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        family: 4, // Force IPv4
        // 5s is comfortable for a local mongod but tight for a first Atlas
        // connection, which has to resolve the SRV record and negotiate TLS
        // across the network. Too low and a healthy cluster looks unreachable.
        serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 15000),
        socketTimeoutMS: 45000,
      });

      console.log('✅ MongoDB Connected Successfully');
      console.log(`📊 Database: ${conn.connection.name}`);
      console.log(`🏠 Host: ${conn.connection.host}`);
      
      // Setup event listeners after successful connection
      setupEventListeners();
      
      return; // Exit the retry loop on success
      
    } catch (error) {
      retries++;
      console.error(`❌ MongoDB connection error: ${error.message}`);
      
      if (retries < MAX_RETRIES) {
        console.log(`🔄 Retrying connection... (${retries}/${MAX_RETRIES})`);
        console.log('⏳ Waiting 5 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('');
        console.error('╔════════════════════════════════════════════════╗');
        console.error('║  ❌ MONGODB CONNECTION FAILED AFTER 5 RETRIES  ║');
        console.error('╚════════════════════════════════════════════════╝');
        console.error('');
        console.error('💡 Troubleshooting Steps:');
        console.error('');
        console.error('1. Check your .env file:');
        console.error('   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname');
        console.error('');
        console.error('2. Verify MongoDB Atlas settings:');
        console.error('   • IP Address is whitelisted (0.0.0.0/0 for testing)');
        console.error('   • Username and password are correct');
        console.error('   • Database user has "Read and Write" permissions');
        console.error('');
        console.error('3. Check MongoDB Atlas status:');
        console.error('   https://status.mongodb.com/');
        console.error('');
        
        process.exit(1);
      }
    }
  }
};

// Setup MongoDB event listeners
const setupEventListeners = () => {
  mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to MongoDB');
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected from MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err.message);
  });
};

module.exports = connectDB;