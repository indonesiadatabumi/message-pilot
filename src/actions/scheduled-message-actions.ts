// src/actions/scheduled-message-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { ScheduledMessage } from '@/services/message-service';

// Schema for scheduling a message (can be simplified if needed, or match form exactly)
const ScheduleMessageSchema = z.object({
  recipient: z.string().min(1, "Recipient phone number is required."),
  content: z.string().min(1, "Message content cannot be empty.").max(1000, "Message too long."),
  scheduledTime: z.date().refine(date => date > new Date(), {
    message: "Scheduled time must be in the future.",
  }),
});

// --- Get All Pending Scheduled Messages ---
export async function getPendingScheduledMessages(): Promise<ScheduledMessage[]> {
  try {
    const db = await getDb();
    const messages = await db.collection<ScheduledMessage>('scheduled_messages')
      .find({ status: 'pending' }) // Only fetch pending messages
      .sort({ scheduledTime: 1 }) // Sort by soonest first
      .toArray();
    // Convert ObjectId to string for serialization
    return messages.map(msg => ({
      ...msg,
      _id: msg._id?.toString(),
    }));
  } catch (error) {
    console.error("Error fetching scheduled messages:", error);
    return []; // Return empty array on error
  }
}

// --- Schedule a New Message ---
type ScheduleMessageResult = { success: true; message: ScheduledMessage } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function scheduleNewMessage(formData: unknown): Promise<ScheduleMessageResult> {
    const validatedFields = ScheduleMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        return {
        success: false,
        error: "Validation failed. Please check the form fields.",
        fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipient, content, scheduledTime } = validatedFields.data;

    const newMessage: Omit<ScheduledMessage, '_id'> = {
        recipient,
        content,
        scheduledTime,
        status: 'pending',
        createdAt: new Date(),
    };

    try {
        const db = await getDb();
        const result = await db.collection<Omit<ScheduledMessage, '_id'>>('scheduled_messages').insertOne(newMessage);

        if (!result.insertedId) {
        throw new Error('Failed to insert scheduled message into database.');
        }

        revalidatePath('/dashboard/scheduled'); // Revalidate the scheduled messages page cache
        return {
        success: true,
        message: {
            ...newMessage,
            _id: result.insertedId.toString(),
        },
        };
    } catch (error: any) {
        console.error("Error scheduling message:", error);
        return { success: false, error: error.message || "Database error occurred while scheduling message." };
    }
}

// --- Cancel a Scheduled Message ---
type CancelScheduledResult = { success: true } | { success: false; error: string };

export async function cancelScheduledMessage(id: string): Promise<CancelScheduledResult> {
    if (!ObjectId.isValid(id)) {
        return { success: false, error: "Invalid message ID format." };
    }
    const objectId = new ObjectId(id);

    try {
        const db = await getDb();
        const result = await db.collection<ScheduledMessage>('scheduled_messages').findOneAndUpdate(
        { _id: objectId, status: 'pending' }, // Can only cancel pending messages
        { $set: { status: 'canceled' } }
        );

        if (!result) {
        return { success: false, error: "Scheduled message not found, already sent, or already canceled." };
        }

        revalidatePath('/dashboard/scheduled');
        return { success: true };
    } catch (error: any) {
        console.error("Error canceling scheduled message:", error);
        return { success: false, error: error.message || "Database error occurred while canceling message." };
    }
}

// --- Update a Scheduled Message (Example - might need more complex logic) ---
// This is a basic update, typically you might only allow updating time/content before sending.
type UpdateScheduledResult = { success: true; message: ScheduledMessage } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateScheduledMessage(id: string, formData: unknown): Promise<UpdateScheduledResult> {
    if (!ObjectId.isValid(id)) {
        return { success: false, error: "Invalid message ID format." };
    }
    const objectId = new ObjectId(id);

    const validatedFields = ScheduleMessageSchema.safeParse(formData); // Reuse schema for validation
     if (!validatedFields.success) {
        return {
        success: false,
        error: "Validation failed. Please check the form fields.",
        fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    const { recipient, content, scheduledTime } = validatedFields.data;


    try {
        const db = await getDb();
        const result = await db.collection<ScheduledMessage>('scheduled_messages').findOneAndUpdate(
        { _id: objectId, status: 'pending' }, // Can only update pending messages
        { $set: { recipient, content, scheduledTime } },
        { returnDocument: 'after' }
        );

        if (!result) {
            return { success: false, error: "Scheduled message not found, already sent, or canceled." };
        }

        revalidatePath('/dashboard/scheduled');
        return {
            success: true,
            message: { // Ensure the returned message has _id as string
                ...result,
                _id: result._id.toString(),
            }
        };
    } catch (error: any) {
        console.error("Error updating scheduled message:", error);
        return { success: false, error: error.message || "Database error occurred while updating message." };
    }
}


// --- Placeholder for Sending Logic ---
// In a real app, you'd have a separate process (e.g., a cron job, serverless function)
// that queries for pending messages whose scheduledTime has passed,
// sends them (using Twilio, etc.), and updates their status to 'sent' or 'failed'.

// Example function ( conceptual - would run in a background task)
export async function processPendingMessages(): Promise<void> {
    const now = new Date();
    const db = await getDb();
    const messagesToSend = await db.collection<ScheduledMessage>('scheduled_messages')
        .find({ status: 'pending', scheduledTime: { $lte: now } })
        .toArray();

    for (const message of messagesToSend) {
        try {
            // --- Integrate with your SMS sending service here ---
            // await sendSmsApi(message.recipient, message.content);
            console.log(`Simulating sending message ID ${message._id} to ${message.recipient}`);
            // --- ---

            // Update status to 'sent' on success
             await db.collection('scheduled_messages').updateOne(
                { _id: message._id },
                { $set: { status: 'sent' } }
            );
        } catch (sendError) {
            console.error(`Failed to send message ID ${message._id}:`, sendError);
            // Update status to 'failed' on error
             await db.collection('scheduled_messages').updateOne(
                { _id: message._id },
                { $set: { status: 'failed' } }
            );
        }
    }

    if (messagesToSend.length > 0) {
        console.log(`Processed ${messagesToSend.length} scheduled messages.`);
        revalidatePath('/dashboard/scheduled'); // Revalidate if needed after processing
    }
}
