
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Contact, MessageSquareText, Clock, LayoutTemplate, LogOut, Home } from 'lucide-react'; // Added Home icon
import { Button } from '../ui/button';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home }, // Added Dashboard link
  { href: '/dashboard/contacts', label: 'Contacts', icon: Contact },
  { href: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/dashboard/send', label: 'Send Message', icon: MessageSquareText },
  { href: '/dashboard/scheduled', label: 'Scheduled', icon: Clock },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // Remove token and admin status from local storage and cookies
    if (typeof window !== 'undefined') {
      console.log("[AppSidebar] Initiating logout...");
      localStorage.removeItem('authToken');
      localStorage.removeItem('isAdmin');
      console.log("[AppSidebar] localStorage cleared.");

      // Clear cookies by setting expiry date to the past
      const cookieOptions = `path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      document.cookie = `authToken=; ${cookieOptions}`;
      document.cookie = `isAdmin=; ${cookieOptions}`;
      console.log("[AppSidebar] Cookies cleared. Current document.cookie:", document.cookie);
    } else {
      console.warn("[AppSidebar] Cannot clear auth state: window is undefined.");
    }
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    console.log("[AppSidebar] Redirecting to /login...");
    router.push('/login'); // Redirect to login page
    console.log("[AppSidebar] router.push('/login') called.");
  };

  return (
    <>
      <SidebarHeader className="hidden md:flex items-center gap-2"> {/* Hidden on mobile */}
        {/* Optional: Add Logo/Brand here */}
        <MessageSquareText className="h-6 w-6 text-accent" />
        <h1 className="text-xl font-semibold text-primary">MessagePilot</h1>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
 <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')} // Active state logic
                tooltip={item.label}
              >
 <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
 </Link>
                </SidebarMenuButton>
 </SidebarMenuItem>
 ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="hidden md:flex p-2"> {/* Hidden on mobile */}
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
          <LogOut className="size-4" />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
    </>
  );
}

