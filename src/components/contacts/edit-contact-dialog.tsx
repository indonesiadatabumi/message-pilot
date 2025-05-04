"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  // DialogClose // Import if needed
} from "@/components/ui/dialog";
import { ContactForm } from "./contact-form";
import type { Contact } from "@/services/message-service";

interface EditContactDialogProps {
  contact: Contact | null; // The contact to edit
  triggerButton?: React.ReactNode; // Optional trigger if not controlled externally
  open: boolean; // Dialog must be controlled by parent state
  onOpenChange: (open: boolean) => void; // Function to change parent state
  onSaveSuccess: (updatedContact: Contact) => void; // Callback for successful save
}

export function EditContactDialog({
  contact,
  triggerButton,
  open,
  onOpenChange,
  onSaveSuccess
}: EditContactDialogProps) {

  // This function will be called by ContactForm upon successful submission
  const handleEditSuccess = (updatedContact: Contact) => {
    onOpenChange(false); // Close the dialog using the provided handler
    onSaveSuccess(updatedContact); // Call the parent's success handler
  };

  // Handler to close the dialog from the form's Cancel button
  const handleCancel = () => {
    onOpenChange(false);
  };

  // Conditional rendering based on whether a contact is provided
  // This prevents trying to render the form with null data
  if (!contact && open) {
      console.warn("EditContactDialog opened without a contact.");
      // Optionally close the dialog automatically if opened without a contact
      // React.useEffect(() => { onOpenChange(false); }, [onOpenChange]);
      return null; // Or render some placeholder/error state
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only render trigger if provided */}
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update the contact details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        {/*
          Render ContactForm only if 'open' is true and 'contact' is not null.
          Pass the initialData, the success handler, and the cancel handler.
        */}
        {open && contact && (
           <ContactForm
                initialData={contact}
                onSubmitSuccess={handleEditSuccess}
                onCancel={handleCancel}
                submitButtonText="Save Changes"
           />
        )}
      </DialogContent>
    </Dialog>
  );
}
