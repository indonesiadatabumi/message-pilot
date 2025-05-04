import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header'; // Import AppHeader

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <AppHeader /> {/* Add the header */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6"> {/* Main content takes remaining space */}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
