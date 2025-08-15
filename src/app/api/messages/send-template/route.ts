import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendTemplateMessage } from '@/services/message-service';
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

const sendTemplateSchema = z.object({
  templateId: z.string(),
  recipientIds: z.union([z.string(), z.array(z.string())]), 
  placeholders: z.record(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    await ensureMongooseConnection();

    const json = await request.json();
    const validatedData = sendTemplateSchema.safeParse(json);

    if (!validatedData.success) {
      return NextResponse.json({ success: false, error: validatedData.error.format() }, { status: 400 });
    }
    
    const { templateId, recipientIds, placeholders } = validatedData.data;

    const result = await sendTemplateMessage(templateId, recipientIds, placeholders);

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('Error sending template message:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
