// src/components/reports/export-history-button.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportMessageHistoryToCsv } from "@/actions/report-actions";
import type { MessageSystemStatus, MessageSystemType } from "@/services/message-service";

interface ExportHistoryButtonProps {
    filterType?: MessageSystemType;
    filterStatus?: MessageSystemStatus;
    className?: string;
}

export function ExportHistoryButton({ filterType, filterStatus, className }: ExportHistoryButtonProps) {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleExport = async () => {
        setIsLoading(true);
        try {
            const result = await exportMessageHistoryToCsv({ filterType, filterStatus });

            if (result.success) {
                const blob = new Blob([result.csvData], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                if (link.download !== undefined) { // Feature detection
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", result.filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }
                toast({
                    title: "Export Successful",
                    description: `History exported to ${result.filename}`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Export Failed",
                    description: result.error || "Could not export message history.",
                });
            }
        } catch (error: any) {
            console.error("Export error:", error);
            toast({
                variant: "destructive",
                title: "Export Error",
                description: error.message || "An unexpected error occurred during export.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading}
            className={className}
        >
            <Download className="mr-2 h-4 w-4" />
            {isLoading ? "Exporting..." : "Export to CSV"}
        </Button>
    );
}
