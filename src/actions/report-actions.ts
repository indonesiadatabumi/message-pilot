// src/actions/report-actions.ts
'use server';

import { getDb } from '@/lib/mongodb';
import type { MessageHistoryEntry, MessageStats, MessageSystemType, MessageSystemStatus } from '@/services/message-service';
import { ObjectId } from 'mongodb';
import { format } from 'date-fns'; // For filename timestamp

interface GetMessageHistoryParams {
    page?: number;
    limit?: number;
    filterType?: MessageSystemType;
    filterStatus?: MessageSystemStatus;
    // TODO: Add date range filters, recipient filter, etc.
}

interface GetMessageHistoryResult {
    history: MessageHistoryEntry[];
    totalCount: number;
}

export async function getMessageHistory({
    page = 1,
    limit = 20,
    filterType,
    filterStatus,
}: GetMessageHistoryParams): Promise<GetMessageHistoryResult> {
    try {
        const db = await getDb();
        const skip = (page - 1) * limit;

        const query: any = {};
        if (filterType) query.type = filterType;
        if (filterStatus) query.status = filterStatus;

        const history = await db.collection<MessageHistoryEntry>('message_history')
            .find(query)
            .sort({ processedAt: -1 }) // Show most recent first
            .skip(skip)
            .limit(limit)
            .toArray();

        const totalCount = await db.collection('message_history').countDocuments(query);

        // Convert ObjectId to string for serialization
        const serializedHistory = history.map(entry => ({
            ...entry,
            _id: entry._id.toString(),
            userId: entry.userId?.toString(),
            templateId: entry.templateId?.toString(),
        }));

        return { history: serializedHistory, totalCount };
    } catch (error) {
        console.error("Error fetching message history:", error);
        return { history: [], totalCount: 0 };
    }
}

export async function getMessageStats(): Promise<MessageStats> {
    try {
        const db = await getDb();
        const stats: MessageStats = {
            totalSent: 0,
            totalFailed: 0,
            totalCanceled: 0,
            totalPending: 0,
            byType: {
                private: { sent: 0, failed: 0 },
                broadcast: { sent: 0, failed: 0 },
                template: { sent: 0, failed: 0 },
            },
        };

        // Count total pending from scheduled_messages collection
        stats.totalPending = await db.collection('scheduled_messages').countDocuments({ status: 'pending' });

        // Aggregate stats from message_history collection
        const historyStats = await db.collection('message_history').aggregate([
            {
                $group: {
                    _id: { status: "$status", type: "$type" },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        historyStats.forEach(stat => {
            const status = stat._id.status as MessageSystemStatus;
            const type = stat._id.type as MessageSystemType;
            const count = stat.count;

            if (status === 'sent') {
                stats.totalSent += count;
                if (stats.byType[type]) {
                    stats.byType[type].sent += count;
                }
            } else if (status === 'failed') {
                stats.totalFailed += count;
                if (stats.byType[type]) {
                    stats.byType[type].failed += count;
                }
            } else if (status === 'canceled') {
                stats.totalCanceled += count;
                // Canceled messages typically don't distinguish by type in the same way as sent/failed
            }
            // 'pending_schedule' could also be counted if needed, but totalPending covers active schedules
        });

        return stats;
    } catch (error) {
        console.error("Error fetching message stats:", error);
        // Return default stats on error
        return {
            totalSent: 0, totalFailed: 0, totalCanceled: 0, totalPending: 0,
            byType: { private: { sent: 0, failed: 0 }, broadcast: { sent: 0, failed: 0 }, template: { sent: 0, failed: 0 } },
        };
    }
}


// --- Export Message History to CSV ---
type ExportMessageHistoryResult =
    | { success: true; csvData: string; filename: string }
    | { success: false; error: string };

function escapeCsvField(field: any): string {
    if (field == null) { // handles null and undefined
        return '';
    }
    const stringField = String(field);
    // If the field contains a comma, newline, or double quote, enclose it in double quotes
    // and escape any internal double quotes by doubling them.
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
}

export async function exportMessageHistoryToCsv(filters?: {
    filterType?: MessageSystemType;
    filterStatus?: MessageSystemStatus;
}): Promise<ExportMessageHistoryResult> {
    try {
        const db = await getDb();
        const query: any = {};
        if (filters?.filterType) query.type = filters.filterType;
        if (filters?.filterStatus) query.status = filters.filterStatus;

        // Fetch all matching history entries, not paginated for export
        const allHistory = await db.collection<MessageHistoryEntry>('message_history')
            .find(query)
            .sort({ processedAt: -1 })
            .toArray();

        if (allHistory.length === 0) {
            return { success: false, error: "No message history found for the selected criteria." };
        }

        const headers = [
            'ID', 'Recipient Phone', 'Type', 'Status', 'Template Name', 'Content',
            'Parameters', 'Processed At', 'API Response', 'Error Message', 'User ID', 'Scheduled At', 'Created At (History Entry)'
        ];

        const csvRows = [headers.join(',')]; // Header row

        allHistory.forEach(entry => {
            const row = [
                escapeCsvField(entry._id.toString()),
                escapeCsvField(entry.recipientPhone),
                escapeCsvField(entry.type),
                escapeCsvField(entry.status),
                escapeCsvField(entry.templateName),
                escapeCsvField(entry.content),
                escapeCsvField(entry.parameters ? JSON.stringify(entry.parameters) : ''),
                escapeCsvField(entry.processedAt ? new Date(entry.processedAt).toISOString() : ''),
                escapeCsvField(entry.apiResponse),
                escapeCsvField(entry.errorMessage),
                escapeCsvField(entry.userId?.toString()),
                escapeCsvField(entry.scheduledAt ? new Date(entry.scheduledAt).toISOString() : ''),
                escapeCsvField(entry.createdAt ? new Date(entry.createdAt).toISOString() : ''),
            ];
            csvRows.push(row.join(','));
        });

        const csvData = csvRows.join('\n');
        const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
        const filename = `message_history_export_${timestamp}.csv`;

        return { success: true, csvData, filename };

    } catch (error: any) {
        console.error("Error exporting message history to CSV:", error);
        return { success: false, error: error.message || "Failed to export message history." };
    }
}
