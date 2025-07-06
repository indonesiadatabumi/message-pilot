// src/components/reports/message-history-table.tsx
"use client";

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MessageHistoryEntry, MessageSystemStatus } from "@/services/message-service";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageHistoryTableProps {
    historyEntries: MessageHistoryEntry[];
    totalCount: number;
    currentPage: number;
    itemsPerPage: number;
}

const getStatusVariant = (status: MessageSystemStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'sent':
            return 'default'; // Greenish or primary
        case 'failed':
            return 'destructive'; // Red
        case 'canceled':
            return 'secondary'; // Gray
        case 'pending':
        case 'processing':
        case 'pending_schedule': // New status for items just added to schedule
            return 'outline'; // Yellowish or neutral outline
        default:
            return 'secondary';
    }
};


export function MessageHistoryTable({
    historyEntries,
    totalCount,
    currentPage,
    itemsPerPage,
}: MessageHistoryTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`/dashboard/reports?${params.toString()}`);
    };

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <div className="rounded-md border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Template</TableHead>
                                <TableHead>Content Snippet</TableHead>
                                <TableHead className="text-right">Processed At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No message history found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                historyEntries.map((entry) => (
                                    <TableRow key={entry._id.toString()}>
                                        <TableCell className="font-medium">{entry.recipientPhone}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{entry.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(entry.status)} className="capitalize">
                                                {entry.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {entry.templateName || "N/A"}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help">{entry.content.substring(0, 30)}{entry.content.length > 30 ? "..." : ""}</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="start" className="max-w-xs break-words">
                                                    <p className="font-bold mb-1">Full Content:</p>
                                                    <p className="text-xs">{entry.content}</p>
                                                    {entry.parameters && Object.keys(entry.parameters).length > 0 && (
                                                        <>
                                                            <p className="font-bold mt-2 mb-1">Parameters:</p>
                                                            <ul className="text-xs list-disc pl-4">
                                                                {Object.entries(entry.parameters).map(([key, value]) => (
                                                                    <li key={key}><strong>{`{{${key}}}`}:</strong> {value}</li>
                                                                ))}
                                                            </ul>
                                                        </>
                                                    )}
                                                    {entry.apiResponse && (
                                                        <>
                                                            <p className="font-bold mt-2 mb-1">API Response:</p>
                                                            <p className="text-xs max-h-20 overflow-y-auto">{entry.apiResponse}</p>
                                                        </>
                                                    )}
                                                    {entry.errorMessage && (
                                                        <>
                                                            <p className="font-bold mt-2 mb-1 text-destructive">Error Message:</p>
                                                            <p className="text-xs text-destructive max-h-20 overflow-y-auto">{entry.errorMessage}</p>
                                                        </>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {format(new Date(entry.processedAt), "MMM d, yyyy HH:mm")}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}. Total {totalCount} records.
                        </div>
                        <div className="space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                            >
                                Next
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
