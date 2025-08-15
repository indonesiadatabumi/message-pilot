import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPrivateMessage } from '@/services/message-service'; // This function will be added to message-service.ts
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

const sendPrivateSchema = z.object({
  recipientId: z.string(), //  contact ID
  messageBody: z.string().min(1), // The actual message content
});

export async function POST(request: Request) {
  try {
    await ensureMongooseConnection();

    const json = await request.json();
    const validatedData = sendPrivateSchema.safeParse(json);

    if (!validatedData.success) {
      return NextResponse.json({ success: false, error: validatedData.error.format() }, { status: 400 });
    }
    
    const { recipientId, messageBody } = validatedData.data;

    const result = await sendPrivateMessage(recipientId, messageBody);

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('Error sending private message:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
