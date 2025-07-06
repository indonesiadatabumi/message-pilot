"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { Contact } from "@/services/message-service"; // Use type import
import { EditContactDialog } from "./edit-contact-dialog";
import { DeleteContactAlert } from "./delete-contact-alert";
import { useRouter } from 'next/navigation'; // For potential refresh

interface ContactTableProps {
  contacts: Contact[];
}

export function ContactTable({ contacts: initialContacts }: ContactTableProps) {
    const router = useRouter();
    // Use state to manage contacts locally for optimistic updates or manual refresh
    const [contacts, setContacts] = React.useState(initialContacts);
    const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
    const [deletingContact, setDeletingContact] = React.useState<Contact | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

     // Update local state if initial props change (e.g., after full page refresh)
    React.useEffect(() => {
        setContacts(initialContacts);
    }, [initialContacts]);


    const handleEditClick = (contact: Contact) => {
        setEditingContact(contact);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (contact: Contact) => {
        setDeletingContact(contact);
        setIsDeleteDialogOpen(true);
    };

    // Callback when edit is successful
    const handleEditSuccess = (updatedContact: Contact) => {
        setContacts(prevContacts =>
            prevContacts.map(c => (c._id === updatedContact._id ? updatedContact : c))
        );
        setIsEditDialogOpen(false);
        setEditingContact(null);
        // router.refresh(); // Or use optimistic update as above
    };

    // Callback when delete is confirmed and successful
    const handleDeleteSuccess = () => {
        if (!deletingContact?._id) return;
        setContacts(prevContacts => prevContacts.filter(c => c._id !== deletingContact._id));
        setIsDeleteDialogOpen(false);
        setDeletingContact(null);
         // router.refresh(); // Or use optimistic update as above
    };

    // Close handlers without success action
     const handleEditClose = () => {
        setIsEditDialogOpen(false);
        setEditingContact(null);
    };
     const handleDeleteClose = () => {
        setIsDeleteDialogOpen(false);
        setDeletingContact(null);
    };


  return (
    <>
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No contacts found.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                // Use _id as the key, ensuring it's a string
                (<TableRow key={contact._id?.toString()}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  {/* Display phone */}
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell className="text-right">
                    {/* Edit Dialog */}
                    <EditContactDialog
                       contact={editingContact} // Pass the contact being edited
                       // Ensure open state is tied to the specific contact's ID
                       open={isEditDialogOpen && editingContact?._id === contact._id}
                       onOpenChange={(open) => { if (!open) handleEditClose(); }}
                       triggerButton={
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(contact)} aria-label="Edit Contact">
                            <Edit className="h-4 w-4" />
                         </Button>
                       }
                       onSaveSuccess={handleEditSuccess} // Use success callback
                    />
                    {/* Delete Alert */}
                    <DeleteContactAlert
                        contact={deletingContact} // Pass the contact being deleted
                        // Ensure open state is tied to the specific contact's ID
                        open={isDeleteDialogOpen && deletingContact?._id === contact._id}
                        onOpenChange={(open) => { if (!open) handleDeleteClose(); }}
                        onConfirmDelete={handleDeleteSuccess} // Use success callback
                        triggerButton={
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(contact)} className="text-destructive hover:text-destructive/90" aria-label="Delete Contact">
                               <Trash2 className="h-4 w-4" />
                           </Button>
                        }
                    />
                  </TableCell>
                </TableRow>)
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// No longer need declare module augmentation as _id is part of the base interface
