// src/components/reports/message-stats-display.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { MessageStats } from "@/services/message-service";
import { TrendingUp, TrendingDown, AlertCircle, Clock, MessageSquareText, Users, CheckCircle, XCircle } from "lucide-react"; // Import appropriate icons

interface MessageStatsDisplayProps {
    stats: MessageStats;
}

const StatCard: React.FC<{ title: string; value: number; description?: string; icon?: React.ReactNode, className?: string }> = ({ title, value, description, icon, className }) => (
    <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon && <div className="text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);


export function MessageStatsDisplay({ stats }: MessageStatsDisplayProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard title="Total Sent" value={stats.totalSent} icon={<CheckCircle className="h-5 w-5 text-green-500" />} description="Successfully delivered messages." />
            <StatCard title="Total Failed" value={stats.totalFailed} icon={<XCircle className="h-5 w-5 text-red-500" />} description="Messages that failed to send." />
            <StatCard title="Total Canceled" value={stats.totalCanceled} icon={<AlertCircle className="h-5 w-5 text-yellow-500" />} description="Scheduled messages that were canceled." />
            <StatCard title="Total Pending" value={stats.totalPending} icon={<Clock className="h-5 w-5 text-blue-500" />} description="Messages currently scheduled and waiting." />

            <Card className="col-span-1 md:col-span-2 lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg">Sent by Type</CardTitle>
                    <CardDescription>Breakdown of successfully sent messages by their type.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center p-3 rounded-md border">
                        <MessageSquareText className="h-6 w-6 text-primary mb-1" />
                        <p className="text-sm font-medium">Private</p>
                        <p className="text-xl font-bold">{stats.byType.private.sent}</p>
                        <p className="text-xs text-muted-foreground">Failed: {stats.byType.private.failed}</p>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-md border">
                        <Users className="h-6 w-6 text-primary mb-1" />
                        <p className="text-sm font-medium">Broadcast</p>
                        <p className="text-xl font-bold">{stats.byType.broadcast.sent}</p>
                        <p className="text-xs text-muted-foreground">Failed: {stats.byType.broadcast.failed}</p>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-md border">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary mb-1 lucide lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
                        <p className="text-sm font-medium">Template</p>
                        <p className="text-xl font-bold">{stats.byType.template.sent}</p>
                        <p className="text-xs text-muted-foreground">Failed: {stats.byType.template.failed}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

declare module "@/services/message-service" {
    interface MessageStats {
        totalSent: number;
        totalFailed: number;
        totalCanceled: number;
        totalPending: number; // Messages in 'scheduled_messages' with status 'pending'
        byType: {
            private: { sent: number; failed: number };
            broadcast: { sent: number; failed: number };
            template: { sent: number; failed: number };
        };
    }
}
