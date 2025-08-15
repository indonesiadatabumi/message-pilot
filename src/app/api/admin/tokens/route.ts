import { NextResponse } from 'next/server';
import User from '@/models/User';
import { v4 as uuidv4 } from 'uuid';
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
    await ensureMongooseConnection();

    const { userId, expiration } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'admin') {
        return NextResponse.json({ message: 'Tokens can only be generated for admin users' }, { status: 403 });
    }

    const token = uuidv4();
    
    user.adminToken = token;
    user.adminTokenExpires = expiration ? new Date(expiration) : null;

    await user.save();

    return NextResponse.json({ success: true, token, name: user.name });

  } catch (error) {
    console.error('Error generating token:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Error generating token', error: errorMessage }, { status: 500 });
  }
}
