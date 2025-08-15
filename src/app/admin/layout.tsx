import { ReactNode } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/layout/admin-header';

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <AdminHeader />
            <div className="flex flex-1">
                <aside className="w-64 bg-background p-4 border-r">
                    <nav>
                        <ul className="space-y-2">
                            <li><Link href="/admin/dashboard" className="text-primary hover:underline">Dashboard</Link></li>
                            <li><Link href="/admin/users" className="text-primary hover:underline">User Management</Link></li>
                            <li><Link href="/admin/api-keys" className="text-primary hover:underline">API Key Management</Link></li>
                            <li><Link href="/admin/api-playground" className="text-primary hover:underline">API Playground</Link></li>
                        </ul>
                    </nav>
                </aside>
                <main className="flex-1 bg-secondary/30 p-4 md:p-6">
                    <div className="container mx-auto py-4">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
