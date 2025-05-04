// src/actions/scheduled-message-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { Db, ObjectId } from 'mongodb'; // Import Db type
import { z } from 'zod';
import type { ScheduledMessage } from '@/services/message-service';
import { sendSms } from '@/services/sms-service'; // Import the SMS sending service

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

    const newMessage: Omit<ScheduledMessage, '_id' | 'createdAt' | 'status'> & { status: 'pending'; createdAt: Date } = {
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
        // Find the message first to ensure it's still pending
        const existingMessage = await db.collection<ScheduledMessage>('scheduled_messages').findOne({ _id: objectId });

        if (!existingMessage) {
             return { success: false, error: "Scheduled message not found." };
        }
        if (existingMessage.status !== 'pending') {
            return { success: false, error: `Cannot update message with status "${existingMessage.status}".` };
        }


        const result = await db.collection<ScheduledMessage>('scheduled_messages').findOneAndUpdate(
        { _id: objectId, status: 'pending' }, // Ensure status is still pending during update
        { $set: { recipient, content, scheduledTime } },
        { returnDocument: 'after' }
        );

        if (!result) {
            // This might happen in a race condition if status changed between findOne and findOneAndUpdate
            return { success: false, error: "Failed to update message. It might have been sent or canceled just now." };
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


// --- Process Pending Messages (Background Task Logic) ---
// This function should be triggered periodically (e.g., cron job, scheduled task).
// It finds messages ready to be sent, attempts to send them via the SMS API,
// and updates their status in the database.

export async function processPendingMessages(): Promise<{ processed: number; sent: number; failed: number }> {
    const now = new Date();
    let db: Db | null = null;
    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
        db = await getDb();
        const messagesToSend = await db.collection<ScheduledMessage>('scheduled_messages')
            .find({ status: 'pending', scheduledTime: { $lte: now } })
            .toArray();

        processed = messagesToSend.length;
        if (processed === 0) {
             console.log("No scheduled messages ready to be processed.");
             return { processed, sent, failed };
        }

        console.log(`Processing ${processed} scheduled messages...`);

        for (const message of messagesToSend) {
            // Double-check status in case it changed since the initial query
            const currentStatus = await db.collection('scheduled_messages').findOne({ _id: message._id }, { projection: { status: 1 } });
            if (currentStatus?.status !== 'pending') {
                console.log(`Skipping message ID ${message._id} - status changed to ${currentStatus?.status}.`);
                processed--; // Adjust count as it wasn't truly processed now
                continue;
            }


            try {
                // --- Send SMS using the service ---
                console.log(`Attempting to send scheduled message ID ${message._id} to ${message.recipient}`);
                const smsResult = await sendSms(message.recipient, message.content);
                // --- ---

                let finalStatus: ScheduledMessage['status'];
                if (smsResult.success) {
                    finalStatus = 'sent';
                    sent++;
                    console.log(`Successfully sent scheduled message ID ${message._id}. API response: ${smsResult.message}`);
                } else {
                    finalStatus = 'failed';
                    failed++;
                    console.error(`Failed to send scheduled message ID ${message._id}. API Error: ${smsResult.message}`);
                }

                // Update status in DB
                await db.collection('scheduled_messages').updateOne(
                    { _id: message._id, status: 'pending' }, // Ensure it's still pending before updating
                    { $set: { status: finalStatus } }
                );

            } catch (sendError: any) {
                 // Catch errors during the sendSms call or DB update
                failed++;
                console.error(`Unhandled error processing message ID ${message._id}:`, sendError);
                // Attempt to mark as failed even if sendSms itself threw an error
                try {
                    await db.collection('scheduled_messages').updateOne(
                        { _id: message._id, status: 'pending' }, // Ensure it's still pending
                        { $set: { status: 'failed' } }
                    );
                } catch (dbUpdateError) {
                     console.error(`Failed to update status to 'failed' for message ID ${message._id} after error:`, dbUpdateError);
                }
            }
        } // End loop

        console.log(`Finished processing. Sent: ${sent}, Failed: ${failed}.`);

        if (sent > 0 || failed > 0) {
            revalidatePath('/dashboard/scheduled'); // Revalidate if statuses changed
        }

        return { processed: sent + failed, sent, failed }; // Return counts of messages actually attempted

    } catch (error: any) {
         console.error("Error during processPendingMessages:", error);
         // Depending on the error, you might want to throw it or handle differently
         return { processed, sent, failed }; // Return counts up to the point of failure
    }
}
