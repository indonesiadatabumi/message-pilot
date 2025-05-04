import { ContactTable } from '@/components/contacts/contact-table';
import { AddContactDialog } from '@/components/contacts/add-contact-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// Mock data - Replace with API fetching
const mockContacts = [
  { id: '1', name: 'Alice Wonderland', phoneNumber: '+1234567890' },
  { id: '2', name: 'Bob The Builder', phoneNumber: '+0987654321' },
  { id: '3', name: 'Charlie Chaplin', phoneNumber: '+1122334455' },
];

export default async function ContactsPage() {
  // TODO: Fetch contacts from API
  const contacts = mockContacts;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
        <AddContactDialog triggerButton={
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" /> Add Contact
          </Button>
        } />
      </div>
      <ContactTable contacts={contacts} />
    </div>
  );
}
