import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/popcorn_cinema';
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected:', uri);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    throw err;
  }
}
