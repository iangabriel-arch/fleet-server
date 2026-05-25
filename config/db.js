// config/db.js
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    console.log('🔄 Initiating secure handshakes with MongoDB Atlas...');
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Keeps our IPv4 routing priority locked in to prevent network timeouts
      family: 4, 
    });

    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);

    // Robust runtime connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error(`❌ Live MongoDB runtime error encountered: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB connection severed. Attempting automated reconnection sequence...');
    });

  } catch (error) {
    console.error(`❌ MongoDB initial connection ignition failed: ${error.message}`);
    process.exit(1); // Safely terminate process so nodemon can retry on configuration updates
  }
};