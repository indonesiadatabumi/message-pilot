// src/app/dashboard/reports/page.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getMessageHistory, getMessageStats } from "@/actions/report-actions"; // Actions to be created
import type { MessageHistoryEntry, MessageStats, MessageSystemType, MessageSystemStatus } from "@/services/message-service"; // Types to be created/updated
import { MessageHistoryTable } from "@/components/reports/message-history-table"; // Component to be created
import { MessageStatsDisplay } from "@/components/reports/message-stats-display"; // Component to be created
import { ExportHistoryButton } from "@/components/reports/export-history-button"; // Import the export button
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { revalidatePath } from "next/cache";


export default async function ReportsPage({
    searchParams
}: {
    searchParams?: { [key: string]: string | string[] | undefined }
}) {
    // Basic pagination and filtering (can be expanded)
    const page = typeof searchParams?.page === 'string' ? Number(searchParams.page) : 1;
    const limit = typeof searchParams?.limit === 'string' ? Number(searchParams.limit) : 20;
    const filterType = typeof searchParams?.type === 'string' ? searchParams.type as MessageSystemType : undefined;
    const filterStatus = typeof searchParams?.status === 'string' ? searchParams.status as MessageSystemStatus : undefined;

    const { history, totalCount } = await getMessageHistory({
        page,
        limit,
        filterType: filterType,
        filterStatus: filterStatus,
    });
    const stats = await getMessageStats();

    async function handleRefresh() {
        'use server';
        revalidatePath('/dashboard/reports');
    }


    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6 gap-2">
                <h1 className="text-3xl font-bold text-foreground">Message Reports</h1>
                <div className="flex items-center gap-2">
                    <ExportHistoryButton filterType={filterType} filterStatus={filterStatus} />
                    <form action={handleRefresh}>
                        <Button variant="outline" type="submit">
                            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Data
                        </Button>
                    </form>
                </div>
            </div>
            <p className="text-muted-foreground mb-8">
                View statistics and history for all sent, scheduled, and processed messages.
            </p>

            {/* Statistics Display */}
            <MessageStatsDisplay stats={stats} />

            {/* Message History Table */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Detailed Message History</CardTitle>
                    <CardDescription>A log of all message activities. Status 'pending_schedule' means it was scheduled but not yet processed.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* TODO: Add client-side filters for type, status, date range */}
                    <MessageHistoryTable
                        historyEntries={history}
                        totalCount={totalCount}
                        currentPage={page}
                        itemsPerPage={limit}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
