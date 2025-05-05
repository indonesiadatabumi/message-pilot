import type { ReactNode } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/layout/admin-header'; // Create this component

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <AdminHeader />
            <main className="flex-1 bg-secondary/30 p-4 md:p-6">
                {/* Optional: Add a simple sidebar or navigation specific to admin if needed */}
                {/* <aside className="w-64 bg-background p-4 border-r">
                <nav>
                    <ul>
                        <li><Link href="/admin/dashboard" className="text-primary hover:underline">Dashboard</Link></li>
                        <li><Link href="/admin/users" className="text-primary hover:underline">Manage Users</Link></li>
                    </ul>
                </nav>
            </aside> */}
                <div className="container mx-auto py-4">
                    {children}
                </div>
            </main>
        </div>
    );
}
