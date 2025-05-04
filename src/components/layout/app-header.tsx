"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";

export function AppHeader() {
  const router = useRouter();

  const handleLogout = () => {
     // Remove token from local storage
     if (typeof window !== 'undefined') {
       localStorage.removeItem('authToken');
     }
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.push('/login'); // Redirect to login page
  };

  return (
    <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
      <div className="flex items-center gap-2 md:hidden"> {/* Trigger only visible on mobile */}
        <SidebarTrigger />
        <h1 className="text-xl font-semibold text-primary">MessagePilot</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
          <LogOut className="size-5" />
        </Button>
      </div>
    </header>
  );
}
