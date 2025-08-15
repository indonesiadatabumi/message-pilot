import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendBulkMessage } from '@/services/message-service'; // This service function will be added/updated
import mongoose from 'mongoose';
import clientPromise from '@/lib/mongodb';

// Helper to ensure Mongoose is connected
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

const sendBulkSchema = z.object({
  recipientIds: z.array(z.string()).min(1), // Must be an array of at least one contact ID
  messageBody: z.string().min(1), // The actual message content
});

export async function POST(request: Request) {
  try {
    await ensureMongooseConnection();

    const json = await request.json();
    const validatedData = sendBulkSchema.safeParse(json);

    if (!validatedData.success) {
      return NextResponse.json({ success: false, error: validatedData.error.format() }, { status: 400 });
    }
    
    const { recipientIds, messageBody } = validatedData.data;

    const result = await sendBulkMessage(recipientIds, messageBody);

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('Error sending bulk message:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
