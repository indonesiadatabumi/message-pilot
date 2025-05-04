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
import { Contact } from "@/services/message-service"; // Assuming Contact type is defined here
import { EditContactDialog } from "./edit-contact-dialog";
import { DeleteContactAlert } from "./delete-contact-alert";

interface ContactTableProps {
  contacts: Contact[];
  // TODO: Add functions for refresh/update data after edits/deletes
}

export function ContactTable({ contacts }: ContactTableProps) {
    const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
    const [deletingContact, setDeletingContact] = React.useState<Contact | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    const handleEditClick = (contact: Contact) => {
        setEditingContact(contact);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (contact: Contact) => {
        setDeletingContact(contact);
        setIsDeleteDialogOpen(true);
    };

    const handleEditClose = () => {
        setIsEditDialogOpen(false);
        setEditingContact(null); // Clear editing contact when closing
        // TODO: Potentially refresh data here
    };

    const handleDeleteClose = (deleted: boolean) => {
        setIsDeleteDialogOpen(false);
        setDeletingContact(null); // Clear deleting contact when closing
        if (deleted) {
           // TODO: Potentially refresh data here or optimistically remove from list
           console.log("Contact potentially deleted, refresh needed.");
        }
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
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.phoneNumber}</TableCell>
                  <TableCell className="text-right">
                    <EditContactDialog
                       contact={editingContact} // Pass the contact being edited
                       open={isEditDialogOpen && editingContact?.id === contact.id}
                       onOpenChange={(open) => {
                           if (!open) handleEditClose();
                           // This ensures the dialog state is controlled correctly
                           // setIsEditDialogOpen(open) might not be needed if controlled externally
                       }}
                       triggerButton={
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(contact)} aria-label="Edit Contact">
                            <Edit className="h-4 w-4" />
                         </Button>
                       }
                       onSaveSuccess={handleEditClose} // Close dialog on success
                    />
                    <DeleteContactAlert
                        contact={deletingContact} // Pass the contact being deleted
                        open={isDeleteDialogOpen && deletingContact?.id === contact.id}
                        onOpenChange={(open) => {
                            if (!open) handleDeleteClose(false);
                        }}
                        onConfirmDelete={() => handleDeleteClose(true)} // Close and indicate deletion
                        triggerButton={
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(contact)} className="text-destructive hover:text-destructive/90" aria-label="Delete Contact">
                               <Trash2 className="h-4 w-4" />
                           </Button>
                        }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Render dialogs outside the table loop to avoid multiple instances if needed,
          or ensure they are correctly controlled by their state.
          Keeping them inline as above works if state management is correct. */}
    </>
  );
}

// Add id to Contact interface if it doesn't exist
declare module "@/services/message-service" {
  interface Contact {
    id?: string; // Make ID optional or required based on your API
  }
}
