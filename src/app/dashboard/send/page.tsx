import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SendPrivateMessageForm } from "@/components/messaging/send-private-message-form";
import { SendBroadcastMessageForm } from "@/components/messaging/send-broadcast-message-form";
import { SendTemplateMessageForm } from "@/components/messaging/send-template-message-form";
import { Contact, MessageTemplate } from "@/services/message-service";

// Mock data - Replace with API fetching
const mockContacts: Contact[] = [
  { id: '1', name: 'Alice Wonderland', phoneNumber: '+1234567890' },
  { id: '2', name: 'Bob The Builder', phoneNumber: '+0987654321' },
  { id: '3', name: 'Charlie Chaplin', phoneNumber: '+1122334455' },
];

const mockTemplates: MessageTemplate[] = [
  { id: 't1', name: 'Welcome Message', content: 'Hi {{name}}, welcome aboard!' },
  { id: 't2', name: 'Appointment Reminder', content: 'Reminder: Your appointment is on {{date}} at {{time}}.' },
  { id: 't3', name: 'Promotional Offer', content: 'Special offer for {{product}}! Get {{discount}} off today.' },
];


export default async function SendMessagePage() {
  // TODO: Fetch contacts and templates from API
  const contacts = mockContacts;
  const templates = mockTemplates;

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
              <SendPrivateMessageForm contacts={contacts} />
            </CardContent>
          </TabsContent>

          <TabsContent value="broadcast">
             <CardHeader>
              <CardTitle>Send Broadcast Message</CardTitle>
              <CardDescription>Send the same message to multiple contacts.</CardDescription>
            </CardHeader>
            <CardContent>
              <SendBroadcastMessageForm contacts={contacts} />
            </CardContent>
          </TabsContent>

          <TabsContent value="template">
            <CardHeader>
              <CardTitle>Send Message Using Template</CardTitle>
              <CardDescription>Select a template and recipient(s), then fill in parameters.</CardDescription>
            </CardHeader>
            <CardContent>
              <SendTemplateMessageForm contacts={contacts} templates={templates} />
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
