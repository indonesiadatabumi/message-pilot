import { NextResponse } from 'next/server';
import ApiKey from '@/models/ApiKey';
import jwt from 'jsonwebtoken';
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

export async function POST(request: Request) {
  try {
    const { name, expiration } = await request.json();
    const jwtSecret = process.env.JWT_SECRET;

    if (!name) {
      return NextResponse.json({ message: 'Token name is required' }, { status: 400 });
    }
    if (!jwtSecret) {
        console.error("JWT_SECRET is not set in environment variables.");
        return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    await ensureMongooseConnection();

    const payload = { name, type: 'api-key' };
    
    const tokenOptions: jwt.SignOptions = {};
    if (expiration) {
        const expiresIn = Math.floor((new Date(expiration).getTime() - Date.now()) / 1000);
        if (expiresIn > 0) {
            tokenOptions.expiresIn = expiresIn;
        }
    }
    
    const token = jwt.sign(payload, jwtSecret, tokenOptions);

    const newApiKey = new ApiKey({
      name,
      key: token,
      expiration: expiration ? new Date(expiration) : null,
    });

    await newApiKey.save();

    return NextResponse.json({ success: true, name: newApiKey.name, token: newApiKey.key });

  } catch (error) {
    console.error('Error generating API key:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Error generating API key', error: errorMessage }, { status: 500 });
  }
}
