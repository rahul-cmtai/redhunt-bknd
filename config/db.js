import mongoose from 'mongoose';
import dotenv from 'dotenv';

export async function connectDB() {
  // Load .env (safe to call multiple times)
  dotenv.config();

  mongoose.set('strictQuery', true);

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/redhunt';

  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.warn(
      'MONGO_URI not set; falling back to mongodb://127.0.0.1:27017/redhunt'
    );
  }

  await mongoose.connect(mongoUri, { autoIndex: true });

  mongoose.connection.on('connected', () => {
    console.log(
      `MongoDB connected to ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`
    );
  });
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  return mongoose.connection;
}

export default connectDB;


