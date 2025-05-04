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
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')} // Active state logic
                  tooltip={item.label}
                >
                  <a>
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
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
