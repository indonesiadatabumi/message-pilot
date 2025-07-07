"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";

export function AdminHeader() {
    const router = useRouter();

    const handleLogout = () => {
        // Remove token and admin status from local storage and cookies
        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('isAdmin');
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
        });
        router.push('/login'); // Redirect to login page
    };

    return (
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-4 border-b bg-background px-4 md:px-6">
            <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-6 w-6 text-destructive" />
                <span className="text-lg text-foreground">Admin Panel</span>
            </Link>
            <nav className="ml-auto flex items-center gap-4">
                <Link href="/admin/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">Dashboard</Link>
                <Link href="/admin/users" className="text-sm font-medium text-muted-foreground hover:text-foreground">Manage Users</Link>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
                    <LogOut className="size-5" />
                </Button>
            </nav>
        </header>
    );
}
