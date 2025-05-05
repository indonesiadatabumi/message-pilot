
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";

export function AppHeader() {
  const router = useRouter();

  const handleLogout = () => {
    // Remove token and admin status from local storage and cookies
    if (typeof window !== 'undefined') {
      console.log("[AppHeader] Initiating logout...");
      localStorage.removeItem('authToken');
      localStorage.removeItem('isAdmin');
      console.log("[AppHeader] localStorage cleared.");

      // Clear cookies by setting expiry date to the past
      const cookieOptions = `path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      document.cookie = `authToken=; ${cookieOptions}`;
      document.cookie = `isAdmin=; ${cookieOptions}`;
      console.log("[AppHeader] Cookies cleared. Current document.cookie:", document.cookie);
    } else {
      console.warn("[AppHeader] Cannot clear auth state: window is undefined.");
    }
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    console.log("[AppHeader] Redirecting to /login...");
    router.push('/login'); // Redirect to login page
    console.log("[AppHeader] router.push('/login') called.");
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

