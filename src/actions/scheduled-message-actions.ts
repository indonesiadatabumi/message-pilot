// src/actions/scheduled-message-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { Db, ObjectId } from 'mongodb'; // Import Db type
import { z } from 'zod';
import type { ScheduledMessage, MessageSystemType, MessageHistoryInput } from '@/services/message-service';
import { sendSms } from '@/services/sms-service'; // Import the SMS sending service
import { logMessageToHistory } from './history-actions'; // Import history logging

const SCHEDULE_BUFFER_MS = 5000; // 5 seconds buffer

// Updated schema to include new fields for richer history logging
const ScheduleMessageSchema = z.object({
    recipient: z.string().min(1, "Recipient phone number is required."),
    content: z.string().min(1, "Message content cannot be empty.").max(1000, "Message too long."),
    scheduledTime: z.date().refine(date => {
        const now = Date.now();
        const scheduledTime = date.getTime();
        return scheduledTime > (now - SCHEDULE_BUFFER_MS);
    }, {
        message: "Scheduled time must be in the future.",
    }),
    // New fields
    messageType: z.custom<MessageSystemType>((val) => ['private', 'broadcast', 'template'].includes(val as string), {
        message: "Invalid message type for scheduling.",
    }),
    templateId: z.string().optional(),
    templateName: z.string().optional(),
    parameters: z.record(z.string()).optional(), // Assuming parameters are string key-value pairs
    userId: z.string().optional(),
});

// --- Get All Pending Scheduled Messages ---
export async function getPendingScheduledMessages(): Promise<ScheduledMessage[]> {
    try {
        const db = await getDb();
        const messages = await db.collection<ScheduledMessage>('scheduled_messages')
            .find({ status: 'pending' })
            .sort({ scheduledTime: 1 })
            .toArray();
        return messages.map(msg => ({
            ...msg,
            _id: msg._id?.toString(),
        }));
    } catch (error) {
        console.error("Error fetching scheduled messages:", error);
        return [];
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
            error: "Validation failed. Please check the form fields for scheduling.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipient, content, scheduledTime, messageType, templateId, templateName, parameters, userId } = validatedFields.data;
    console.log("[Action] Schedule Message Validated Data:", { recipient, content, scheduledTime: scheduledTime.toISOString(), messageType });

    const newMessageData: Omit<ScheduledMessage, '_id' | 'createdAt' | 'status'> & { status: 'pending'; createdAt: Date } = {
        recipient,
        content,
        scheduledTime,
        messageType,
        templateId,
        templateName,
        parameters,
        userId,
        status: 'pending',
        createdAt: new Date(),
    };

    try {
        const db = await getDb();
        console.log(`[Action] Inserting scheduled message for ${recipient} at ${scheduledTime.toISOString()} into DB.`);
        const result = await db.collection<Omit<ScheduledMessage, '_id'>>('scheduled_messages').insertOne(newMessageData);

        if (!result.insertedId) {
            throw new Error('Failed to insert scheduled message into database.');
        }
        const scheduledMessageId = result.insertedId.toString();

        // Log 'pending_schedule' to history
        const historyEntry: MessageHistoryInput = {
            recipientPhone: recipient,
            content: content,
            status: 'pending_schedule',
            type: messageType,
            templateId: templateId,
            templateName: templateName,
            parameters: parameters,
            userId: userId,
            scheduledAt: scheduledTime,
            processedAt: new Date(), // Time of scheduling
            // apiMessageId, apiResponse, errorMessage are not applicable here
        };
        await logMessageToHistory(historyEntry);


        console.log(`[Action] Successfully scheduled message ID ${scheduledMessageId}. Revalidating path.`);
        revalidatePath('/dashboard/scheduled');
        revalidatePath('/dashboard/reports'); // Revalidate reports page
        return {
            success: true,
            message: {
                ...newMessageData,
                _id: scheduledMessageId,
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
        // Fetch the message before updating to get its details for history logging
        const messageToCancel = await db.collection<ScheduledMessage>('scheduled_messages').findOne({ _id: objectId, status: 'pending' });

        if (!messageToCancel) {
            console.warn(`[Action Warn] Scheduled message ID ${id} not found or not pending for cancellation.`);
            return { success: false, error: "Scheduled message not found, already sent, or already canceled." };
        }

        const result = await db.collection<ScheduledMessage>('scheduled_messages').findOneAndUpdate(
            { _id: objectId, status: 'pending' },
            { $set: { status: 'canceled' } }
        );

        if (!result) { // Should not happen if findOne above succeeded, but good check
            console.warn(`[Action Warn] Failed to update scheduled message ID ${id} to 'canceled'.`);
            return { success: false, error: "Failed to cancel scheduled message." };
        }

        // Log 'canceled' to history
        const historyEntry: MessageHistoryInput = {
            recipientPhone: messageToCancel.recipient,
            content: messageToCancel.content,
            status: 'canceled',
            type: messageToCancel.messageType,
            templateId: messageToCancel.templateId,
            templateName: messageToCancel.templateName,
            parameters: messageToCancel.parameters,
            userId: messageToCancel.userId,
            scheduledAt: messageToCancel.scheduledTime,
            processedAt: new Date(), // Time of cancellation
        };
        await logMessageToHistory(historyEntry);

        console.log(`[Action] Successfully canceled message ID ${id}. Revalidating path.`);
        revalidatePath('/dashboard/scheduled');
        revalidatePath('/dashboard/reports');
        return { success: true };
    } catch (error: any) {
        console.error("[Action Error] Error canceling scheduled message:", error);
        return { success: false, error: error.message || "Database error occurred while canceling message." };
    }
}

// --- Update a Scheduled Message ---
type UpdateScheduledResult = { success: true; message: ScheduledMessage } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateScheduledMessage(id: string, formData: unknown): Promise<UpdateScheduledResult> {
    console.log(`[Action] updateScheduledMessage called for ID: ${id} with data:`, formData);
    if (!ObjectId.isValid(id)) {
        return { success: false, error: "Invalid message ID format." };
    }
    const objectId = new ObjectId(id);

    // Use a modified schema for update if needed, or reuse ScheduleMessageSchema if appropriate
    // For simplicity, reusing ScheduleMessageSchema, assuming all fields can be updated.
    const validatedFields = ScheduleMessageSchema.safeParse(formData);
    if (!validatedFields.success) {
        return {
            success: false,
            error: "Validation failed. Please check the form fields for updating schedule.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    const { recipient, content, scheduledTime, messageType, templateId, templateName, parameters, userId } = validatedFields.data;

    try {
        const db = await getDb();
        const existingMessage = await db.collection<ScheduledMessage>('scheduled_messages').findOne({ _id: objectId });

        if (!existingMessage) {
            return { success: false, error: "Scheduled message not found." };
        }
        if (existingMessage.status !== 'pending') {
            return { success: false, error: `Cannot update message with status "${existingMessage.status}".` };
        }

        const updateData: Partial<ScheduledMessage> = {
            recipient,
            content,
            scheduledTime,
            messageType,
            templateId,
            templateName,
            parameters,
            userId,
            // status remains 'pending'
        };

        const result = await db.collection<ScheduledMessage>('scheduled_messages').findOneAndUpdate(
            { _id: objectId, status: 'pending' },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return { success: false, error: "Failed to update message. It might have been sent or canceled." };
        }

        // Log update to history? This could be noisy. For now, only terminal states are logged.
        // If needed, a different type of history log for 'updated_schedule' could be made.

        revalidatePath('/dashboard/scheduled');
        revalidatePath('/dashboard/reports');
        return {
            success: true,
            message: { ...result, _id: result._id.toString() }
        };
    } catch (error: any) {
        console.error("[Action Error] Error updating scheduled message:", error);
        return { success: false, error: error.message || "Database error occurred while updating message." };
    }
}


// --- Process Pending Messages (Background Task Logic) ---
export async function processPendingMessages(): Promise<{ processed: number; sent: number; failed: number }> {
    const now = new Date();
    console.log(`[Background Task] processPendingMessages started at ${now.toISOString()}.`);
    let db: Db | null = null;
    let processedCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    try {
        db = await getDb();
        const messagesToProcess = await db.collection<ScheduledMessage>('scheduled_messages')
            .find({ status: 'pending', scheduledTime: { $lte: now } })
            .toArray();

        processedCount = messagesToProcess.length;
        if (processedCount === 0) {
            console.log("[Background Task] No scheduled messages ready to be processed.");
            return { processed: processedCount, sent: sentCount, failed: failedCount };
        }

        console.log(`[Background Task] Found ${processedCount} messages to process...`);

        for (const scheduledMsg of messagesToProcess) {
            let finalDbStatus: ScheduledMessage['status'] = 'failed'; // Default to failed for DB update
            let historyStatus: MessageHistoryInput['status'] = 'failed'; // Default for history log
            let smsApiMessageId: string | undefined = undefined;
            let smsApiResponse: string | undefined = undefined;
            let smsErrorMessage: string | undefined = undefined;

            try {
                // Attempt to send SMS
                const smsResult = await sendSms(scheduledMsg.recipient, scheduledMsg.content);
                smsApiResponse = smsResult.message; // Capture API response text

                if (smsResult.success) {
                    finalDbStatus = 'sent';
                    historyStatus = 'sent';
                    sentCount++;
                    // smsApiMessageId = smsResult.messageId; // Assuming sendSms might return messageId
                    console.log(`[Background Task] Successfully sent message ID ${scheduledMsg._id}. API response: ${smsResult.message}`);
                } else {
                    // finalDbStatus remains 'failed'
                    // historyStatus remains 'failed'
                    failedCount++;
                    smsErrorMessage = smsResult.message;
                    console.error(`[Background Task Error] Failed to send message ID ${scheduledMsg._id}. API Error: ${smsResult.message}`);
                }

            } catch (sendError: any) {
                failedCount++;
                smsErrorMessage = sendError.message || 'Unknown error during SMS send';
                console.error(`[Background Task Error] Unhandled error sending SMS for message ID ${scheduledMsg._id}:`, sendError);
            } finally {
                // Update status in scheduled_messages collection
                try {
                    await db.collection('scheduled_messages').updateOne(
                        { _id: scheduledMsg._id, status: 'pending' },
                        { $set: { status: finalDbStatus } }
                    );
                } catch (dbUpdateError) {
                    console.error(`[CRITICAL] Failed to update status for scheduled_messages ID ${scheduledMsg._id} to '${finalDbStatus}':`, dbUpdateError);
                    // Adjust counts if DB update fails, message will be re-processed.
                    if (finalDbStatus === 'sent') sentCount--; else failedCount--;
                    continue; // Skip history logging if DB update failed for scheduled_messages
                }

                // Log to message_history
                const historyEntry: MessageHistoryInput = {
                    recipientPhone: scheduledMsg.recipient,
                    content: scheduledMsg.content,
                    status: historyStatus,
                    type: scheduledMsg.messageType,
                    templateId: scheduledMsg.templateId,
                    templateName: scheduledMsg.templateName,
                    parameters: scheduledMsg.parameters,
                    userId: scheduledMsg.userId,
                    scheduledAt: scheduledMsg.scheduledTime,
                    processedAt: new Date(), // Time of this processing attempt
                    apiMessageId: smsApiMessageId,
                    apiResponse: smsApiResponse,
                    errorMessage: smsErrorMessage,
                };
                await logMessageToHistory(historyEntry);
            }
        } // End loop

        console.log(`[Background Task] Finished processing. Attempted: ${processedCount}, Sent: ${sentCount}, Failed: ${failedCount}.`);

        if (sentCount > 0 || failedCount > 0) {
            console.log("[Background Task] Revalidating paths due to status changes.");
            revalidatePath('/dashboard/scheduled');
            revalidatePath('/dashboard/reports');
        }

        return { processed: processedCount, sent: sentCount, failed: failedCount };

    } catch (error: any) {
        console.error("[Background Task Error] Error during processPendingMessages:", error);
        return { processed: 0, sent: sentCount, failed: failedCount };
    }
}
