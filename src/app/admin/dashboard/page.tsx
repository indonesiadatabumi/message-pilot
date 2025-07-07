import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Settings } from "lucide-react"; // Example icons

export default function AdminDashboardPage() {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mb-8">Welcome to the administration area.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="text-accent" /> Manage Users
                        </CardTitle>
                        <CardDescription>Register new users or manage existing ones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/admin/users">Go to User Management</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Add more admin-specific cards here */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Settings className="text-accent" /> System Settings
                        </CardTitle>
                        <CardDescription>Configure application settings (placeholder).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" disabled>Go to Settings (TBD)</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
