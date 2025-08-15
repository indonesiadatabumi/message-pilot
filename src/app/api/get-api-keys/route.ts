import { NextResponse } from 'next/server';
import ApiKey from '@/models/ApiKey';
import mongoose from 'mongoose';

// Correctly connect Mongoose
async function ensureMongooseConnection() {
    if (mongoose.connection.readyState === 0) {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('Please define the MONGODB_URI environment variable');
        }
        await mongoose.connect(mongoUri, {
            dbName: process.env.MONGODB_DB,
        });
    }
}

export async function GET() {
  try {
    await ensureMongooseConnection();
    const apiKeys = await ApiKey.find({}).sort({ createdAt: -1 });
    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Error fetching API keys', error: errorMessage }, { status: 500 });
  }
}
