import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SendPrivateMessageForm } from "@/components/messaging/send-private-message-form";
import { SendBroadcastMessageForm } from "@/components/messaging/send-broadcast-message-form";
import { SendTemplateMessageForm } from "@/components/messaging/send-template-message-form";
import { getContacts } from "@/actions/contact-actions"; // Import contact action
import { getTemplates } from "@/actions/template-actions"; // Import template action
import type { Contact, MessageTemplate } from "@/services/message-service"; // Keep type imports

export default async function SendMessagePage() {
  // Fetch contacts and templates using server actions
  // Use Promise.all for parallel fetching
  const [contacts, templates] = await Promise.all([
    getContacts(),
    getTemplates()
  ]);

  // Ensure IDs are strings for client components if necessary (actions already do this)
   const formattedContacts: Contact[] = contacts.map(c => ({ ...c, _id: c._id?.toString() }));
   const formattedTemplates: MessageTemplate[] = templates.map(t => ({ ...t, _id: t._id?.toString() }));

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Send Message</h1>

      <Tabs defaultValue="private" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="private">Private Message</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          <TabsTrigger value="template">Use Template</TabsTrigger>
        </TabsList>

        <Card>
          <TabsContent value="private">
            <CardHeader>
              <CardTitle>Send Private Message</CardTitle>
              <CardDescription>Send a message to a single contact.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pass fetched contacts */}
              <SendPrivateMessageForm contacts={formattedContacts} />
            </CardContent>
          </TabsContent>

          <TabsContent value="broadcast">
             <CardHeader>
              <CardTitle>Send Broadcast Message</CardTitle>
              <CardDescription>Send the same message to multiple contacts.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* Pass fetched contacts */}
              <SendBroadcastMessageForm contacts={formattedContacts} />
            </CardContent>
          </TabsContent>

          <TabsContent value="template">
            <CardHeader>
              <CardTitle>Send Message Using Template</CardTitle>
              <CardDescription>Select a template and recipient(s), then fill in parameters.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* Pass fetched contacts and templates */}
              <SendTemplateMessageForm contacts={formattedContacts} templates={formattedTemplates} />
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
