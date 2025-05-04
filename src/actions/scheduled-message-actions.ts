// src/actions/scheduled-message-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { Db, ObjectId } from 'mongodb'; // Import Db type
import { z } from 'zod';
import type { ScheduledMessage } from '@/services/message-service';
import { sendSms } from '@/services/sms-service'; // Import the SMS sending service

const SCHEDULE_BUFFER_MS = 5000; // 5 seconds buffer

// Schema for scheduling a message (can be simplified if needed, or match form exactly)
const ScheduleMessageSchema = z.object({
    recipient: z.string().min(1, "Recipient phone number is required."),
    content: z.string().min(1, "Message content cannot be empty.").max(1000, "Message too long."),
    scheduledTime: z.date().refine(date => {
        const now = Date.now();
        const scheduledTime = date.getTime();
        console.log(`[Validation - Schedule] Now: ${now}, Scheduled: ${scheduledTime}, Diff: ${scheduledTime - now}`);
        // Compare milliseconds since epoch to avoid timezone issues
        // Add a buffer to prevent race conditions
        return scheduledTime > (now - SCHEDULE_BUFFER_MS);
    }, {
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
    console.log("[Action] scheduleNewMessage received formData:", formData);
    const validatedFields = ScheduleMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        console.error("[Action Error] Schedule Message Validation Failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the form fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipient, content, scheduledTime } = validatedFields.data;
    console.log("[Action] Schedule Message Validated Data:", { recipient, content, scheduledTime: scheduledTime.toISOString() });

    const newMessage: Omit<ScheduledMessage, '_id' | 'createdAt' | 'status'> & { status: 'pending'; createdAt: Date } = {
        recipient,
        content,
        scheduledTime,
        status: 'pending',
        createdAt: new Date(),
    };

    try {
        const db = await getDb();
        console.log(`[Action] Inserting scheduled message for ${recipient} at ${scheduledTime.toISOString()} into DB.`);
        const result = await db.collection<Omit<ScheduledMessage, '_id'>>('scheduled_messages').insertOne(newMessage);

        if (!result.insertedId) {
            throw new Error('Failed to insert scheduled message into database.');
        }

        console.log(`[Action] Successfully scheduled message ID ${result.insertedId.toString()}. Revalidating path.`);
        revalidatePath('/dashboard/scheduled'); // Revalidate the scheduled messages page cache
        return {
            success: true,
            message: {
                ...newMessage,
                _id: result.insertedId.toString(),
            },
        };
    } catch (error: any) {
        console.error("[Action Error] Error scheduling message:", error);
        return { success: false, error: error.message || "Database error occurred while scheduling message." };
    }
}

// --- Cancel a Scheduled Message ---
type CancelScheduledResult = { success: true } | { success: false; error: string };

export async function cancelScheduledMessage(id: string): Promise<CancelScheduledResult> {
    console.log(`[Action] cancelScheduledMessage called for ID: ${id}`);
    if (!ObjectId.isValid(id)) {
        console.error("[Action Error] Invalid message ID format:", id);
        return { success: false, error: "Invalid message ID format." };
    }
    const objectId = new ObjectId(id);

    try {
        const db = await getDb();
        console.log(`[Action] Attempting to update message ID ${id} status to 'canceled'.`);
        const result = await db.collection<ScheduledMessage>('scheduled_messages').findOneAndUpdate(
            { _id: objectId, status: 'pending' }, // Can only cancel pending messages
            { $set: { status: 'canceled' } }
        );

        if (!result) {
            console.warn(`[Action Warn] Scheduled message ID ${id} not found or not pending.`);
            return { success: false, error: "Scheduled message not found, already sent, or already canceled." };
        }

        console.log(`[Action] Successfully canceled message ID ${id}. Revalidating path.`);
        revalidatePath('/dashboard/scheduled');
        return { success: true };
    } catch (error: any) {
        console.error("[Action Error] Error canceling scheduled message:", error);
        return { success: false, error: error.message || "Database error occurred while canceling message." };
    }
}

// --- Update a Scheduled Message (Example - might need more complex logic) ---
// This is a basic update, typically you might only allow updating time/content before sending.
type UpdateScheduledResult = { success: true; message: ScheduledMessage } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateScheduledMessage(id: string, formData: unknown): Promise<UpdateScheduledResult> {
    console.log(`[Action] updateScheduledMessage called for ID: ${id} with data:`, formData);
    if (!ObjectId.isValid(id)) {
        console.error("[Action Error] Invalid message ID format:", id);
        return { success: false, error: "Invalid message ID format." };
    }
    const objectId = new ObjectId(id);

    const validatedFields = ScheduleMessageSchema.safeParse(formData); // Reuse schema for validation
    if (!validatedFields.success) {
        console.error("[Action Error] Update Scheduled Message Validation Failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the form fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    const { recipient, content, scheduledTime } = validatedFields.data;
    console.log("[Action] Update Scheduled Validated Data:", { recipient, content, scheduledTime: scheduledTime.toISOString() });


    try {
        const db = await getDb();
        // Find the message first to ensure it's still pending
        console.log(`[Action] Checking status for message ID ${id} before update.`);
        const existingMessage = await db.collection<ScheduledMessage>('scheduled_messages').findOne({ _id: objectId });

        if (!existingMessage) {
            console.warn(`[Action Warn] Scheduled message ID ${id} not found for update.`);
            return { success: false, error: "Scheduled message not found." };
        }
        if (existingMessage.status !== 'pending') {
            console.warn(`[Action Warn] Cannot update message ID ${id} with status "${existingMessage.status}".`);
            return { success: false, error: `Cannot update message with status "${existingMessage.status}".` };
        }


        console.log(`[Action] Attempting to update message ID ${id}.`);
        const result = await db.collection<ScheduledMessage>('scheduled_messages').findOneAndUpdate(
            { _id: objectId, status: 'pending' }, // Ensure status is still pending during update
            { $set: { recipient, content, scheduledTime } },
            { returnDocument: 'after' }
        );

        if (!result) {
            // This might happen in a race condition if status changed between findOne and findOneAndUpdate
            console.warn(`[Action Warn] Failed to update message ID ${id}. Status might have changed.`);
            return { success: false, error: "Failed to update message. It might have been sent or canceled just now." };
        }

        console.log(`[Action] Successfully updated message ID ${id}. Revalidating path.`);
        revalidatePath('/dashboard/scheduled');
        return {
            success: true,
            message: { // Ensure the returned message has _id as string
                ...result,
                _id: result._id.toString(),
            }
        };
    } catch (error: any) {
        console.error("[Action Error] Error updating scheduled message:", error);
        return { success: false, error: error.message || "Database error occurred while updating message." };
    }
}


// --- Process Pending Messages (Background Task Logic) ---
// This function should be triggered periodically (e.g., cron job, scheduled task).
// It finds messages ready to be sent, attempts to send them via the SMS API,
// and updates their status in the database.

export async function processPendingMessages(): Promise<{ processed: number; sent: number; failed: number }> {
    const now = new Date();
    console.log(`[Background Task] processPendingMessages started at ${now.toISOString()}.`);
    let db: Db | null = null;
    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
        db = await getDb();
        console.log("[Background Task] Fetching pending messages where scheduledTime <= now.");
        const messagesToSend = await db.collection<ScheduledMessage>('scheduled_messages')
            .find({ status: 'pending', scheduledTime: { $lte: now } })
            .toArray();

        processed = messagesToSend.length;
        if (processed === 0) {
            console.log("[Background Task] No scheduled messages ready to be processed.");
            return { processed, sent, failed };
        }

        console.log(`[Background Task] Found ${processed} messages to process...`);

        for (const message of messagesToSend) {
            console.log(`[Background Task] Processing message ID ${message._id} for ${message.recipient}.`);
            // Double-check status in case it changed since the initial query (atomic update later helps too)
            const currentStatusResult = await db.collection('scheduled_messages').findOne({ _id: message._id }, { projection: { status: 1 } });
            if (currentStatusResult?.status !== 'pending') {
                console.log(`[Background Task] Skipping message ID ${message._id} - status changed to ${currentStatusResult?.status}.`);
                // processed--; // Adjust count only if necessary, depends on desired reporting
                continue;
            }

            let finalStatus: ScheduledMessage['status'] = 'failed'; // Default to failed
            try {
                // --- Send SMS using the service ---
                console.log(`[Background Task] Attempting to send SMS for message ID ${message._id} to ${message.recipient}`);
                const smsResult = await sendSms(message.recipient, message.content);
                // --- ---

                if (smsResult.success) {
                    finalStatus = 'sent';
                    sent++;
                    console.log(`[Background Task] Successfully sent message ID ${message._id}. API response: ${smsResult.message}`);
                } else {
                    // finalStatus remains 'failed'
                    failed++;
                    console.error(`[Background Task Error] Failed to send message ID ${message._id}. API Error: ${smsResult.message}`);
                }

            } catch (sendError: any) {
                // Catch errors during the sendSms call itself
                // finalStatus remains 'failed'
                failed++;
                console.error(`[Background Task Error] Unhandled error sending SMS for message ID ${message._id}:`, sendError);
            } finally {
                // Update status in DB regardless of send outcome (unless skipped)
                try {
                    console.log(`[Background Task] Updating message ID ${message._id} status to '${finalStatus}'.`);
                    await db.collection('scheduled_messages').updateOne(
                        { _id: message._id, status: 'pending' }, // Ensure it's still pending before updating (atomicity)
                        { $set: { status: finalStatus } }
                    );
                } catch (dbUpdateError) {
                    // If DB update fails, log critical error, status remains pending for next run
                    console.error(`[CRITICAL] Failed to update status for message ID ${message._id} to '${finalStatus}' after processing:`, dbUpdateError);
                    // Decrement counts if update fails, as the message wasn't successfully processed
                    if (finalStatus === 'sent') sent--;
                    if (finalStatus === 'failed') failed--;
                    // Consider adding a retry mechanism or alerting
                }
            }
        } // End loop

        console.log(`[Background Task] Finished processing. Attempted: ${processed}, Sent: ${sent}, Failed: ${failed}.`);

        if (sent > 0 || failed > 0) {
            console.log("[Background Task] Revalidating scheduled messages path due to status changes.");
            revalidatePath('/dashboard/scheduled'); // Revalidate if statuses changed
        }

        return { processed, sent, failed }; // Return counts based on DB update success

    } catch (error: any) {
        console.error("[Background Task Error] Error during processPendingMessages:", error);
        // Depending on the error, you might want to throw it or handle differently
        return { processed: 0, sent, failed }; // Return counts up to the point of failure
    }
}
