// src/actions/history-actions.ts
'use server';
import { getDb } from '@/lib/mongodb';
import type { MessageHistoryEntry, MessageHistoryInput } from '@/services/message-service';
import { ObjectId } from 'mongodb';

/**
 * Logs a message event to the message_history collection.
 * @param entryData - The data for the message history entry.
 * @returns Promise resolving to an object indicating success or failure.
 */
export async function logMessageToHistory(
    entryData: MessageHistoryInput
): Promise<{ success: boolean; entryId?: string; error?: string }> {
    try {
        const db = await getDb();
        const fullEntry: Omit<MessageHistoryEntry, '_id'> = {
            ...entryData,
            createdAt: new Date(), // System-generated timestamp for the history record
        };

        // Ensure processedAt is a Date object if it's coming from forms potentially as string
        if (typeof fullEntry.processedAt === 'string') {
            fullEntry.processedAt = new Date(fullEntry.processedAt);
        }
        if (fullEntry.scheduledAt && typeof fullEntry.scheduledAt === 'string') {
            fullEntry.scheduledAt = new Date(fullEntry.scheduledAt);
        }


        const result = await db.collection<Omit<MessageHistoryEntry, '_id'>>('message_history').insertOne(fullEntry);

        if (!result.insertedId) {
            console.error("Failed to insert message into history, DB result negative.", { entryData });
            throw new Error('Failed to insert message into history.');
        }
        console.log(`[HistoryAction] Logged message to history, ID: ${result.insertedId.toString()}`);
        return { success: true, entryId: result.insertedId.toString() };
    } catch (error: any) {
        console.error("[HistoryAction Error] Error logging message to history:", error, { entryData });
        return { success: false, error: error.message || "Database error occurred while logging message history." };
    }
}
