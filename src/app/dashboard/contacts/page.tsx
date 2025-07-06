import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactTable } from '@/components/contacts/contact-table';
import ContactGroupTable from '@/components/contacts/contact-group-table'; // Corrected import
import { AddContactDialog } from '@/components/contacts/add-contact-dialog';
import { ImportContactsDialog } from '@/components/contacts/import-contact-dialog'; // Import the new dialog
import { Button } from '@/components/ui/button';
import { Plus, Upload, Users } from 'lucide-react'; // Import Upload and Users icon
import { getContacts } from '@/actions/contact-actions'; // Import server action
import type { Contact } from '@/services/message-service';

export default async function ContactsPage() {
  // Fetch contacts using the server action
  const contacts: Contact[] = await getContacts();

  // TODO: Implement fetching contact groups here. This is a placeholder.
  const groups: { id: string; name: string }[] = [];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6 gap-2"> {/* Added gap */}
        <h1 className="text-3xl font-bold text-foreground">Contacts & Groups</h1>
        <div className="flex gap-2"> {/* Group buttons */}
          <ImportContactsDialog triggerButton={
            <Button variant="outline">
              {/* Update icon and text */}
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          } />
          <AddContactDialog triggerButton={
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add Contact
            </Button>
          } />
        </div>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList className="grid w-fit grid-cols-2"> {/* Adjusted grid */}
          <TabsTrigger value="contacts">
            <Users className="mr-2 h-4 w-4" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="groups">
             <Users className="mr-2 h-4 w-4" /> Groups
          </TabsTrigger>
        </TabsList>
        <Card className="mt-4"> {/* Added margin top */}
          <TabsContent value="contacts">
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>Manage your individual contacts.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* Pass fetched contacts */}
              <ContactTable contacts={contacts} />
            </CardContent>
          </TabsContent>
          <TabsContent value="groups">
            <CardHeader>
              <CardTitle>Groups</CardTitle>
              <CardDescription>Manage your contact groups.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* TODO: Fetch contact groups */}
               {/* Pass fetched groups */}
              <ContactGroupTable groups={groups} />
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
