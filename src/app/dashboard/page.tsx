import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Contact, LayoutTemplate, MessageSquareText, Clock } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome to MessagePilot! Manage your communications effectively.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quick Actions */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Contact className="text-accent" /> Contacts
            </CardTitle>
            <CardDescription>View and manage your contacts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/contacts" passHref>
              <Button variant="outline" className="w-full">Go to Contacts</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutTemplate className="text-accent" /> Templates
            </CardTitle>
            <CardDescription>Create and manage message templates.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/templates" passHref>
              <Button variant="outline" className="w-full">Go to Templates</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareText className="text-accent" /> Send Message
            </CardTitle>
            <CardDescription>Send private or broadcast messages.</CardDescription>
          </CardHeader>
          <CardContent>
             <Link href="/dashboard/send" passHref>
              <Button variant="default" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Send Now</Button>
             </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="text-accent" /> Scheduled
            </CardTitle>
            <CardDescription>View and manage scheduled messages.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/scheduled" passHref>
              <Button variant="outline" className="w-full">View Scheduled</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for potential future widgets like stats or recent activity */}
      {/*
      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No recent activity to display.</p>
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}
