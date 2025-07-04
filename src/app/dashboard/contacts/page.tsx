import { ContactTable } from '@/components/contacts/contact-table';
import { AddContactDialog } from '@/components/contacts/add-contact-dialog';
import { ImportContactsDialog } from '@/components/contacts/import-contact-dialog'; // Import the new dialog
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react'; // Import Upload icon
import { getContacts } from '@/actions/contact-actions'; // Import server action
import type { Contact } from '@/services/message-service'; // Keep type import

export default async function ContactsPage() {
  // Fetch contacts using the server action
  const contacts: Contact[] = await getContacts();

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6 gap-2"> {/* Added gap */}
        <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
        <div className="flex gap-2"> {/* Group buttons */}
          <ImportContactsDialog triggerButton={
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Import Contacts
            </Button>
          } />
          <AddContactDialog triggerButton={
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add Contact
            </Button>
          } />
        </div>
      </div>
      <p className="text-muted-foreground mb-4">
        Manage your contacts or import multiple contacts using a CSV file (required columns: `name`, `phone`).
      </p>
      {/* Pass fetched contacts to the table */}
      <ContactTable contacts={contacts} />
    </div>
  );
}
