"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose // Import DialogClose for explicit closing if needed elsewhere
} from "@/components/ui/dialog";
import { ContactForm } from "./contact-form";
import type { Contact } from "@/services/message-service";
import { useRouter } from 'next/navigation'; // Import useRouter for refresh

interface AddContactDialogProps {
  triggerButton: React.ReactNode;
  // Consider adding an optional onAddSuccess callback if parent needs to react
  // onAddSuccess?: (newContact: Contact) => void;
}

export function AddContactDialog({ triggerButton /*, onAddSuccess */ }: AddContactDialogProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter(); // Get router instance

  // This function will be called by ContactForm upon successful submission
  const handleAddSuccess = (newContact: Contact) => {
    setOpen(false); // Close the dialog
    // Optional: Call parent callback if provided
    // onAddSuccess?.(newContact);

    // Revalidate data on the client side by refreshing the page router
    // This is simpler than managing complex state updates across components
    router.refresh();
  };

  // Handler to close the dialog from the form's Cancel button
  const handleCancel = () => {
    setOpen(false);
  };

  return (
    // Control the dialog's open state
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Enter the details for the new contact. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        {/*
          ContactForm now handles the submission via server actions internally.
          We pass onSubmitSuccess to close the dialog and potentially refresh data.
          We pass onCancel to allow the form's cancel button to close the dialog.
        */}
        <ContactForm
            onSubmitSuccess={handleAddSuccess}
            onCancel={handleCancel}
            submitButtonText="Add Contact"
            // No initialData needed for adding
        />
        {/*
           No separate footer/buttons needed here if they are inside ContactForm
           If ContactForm didn't have buttons, you'd add DialogFooter and buttons here,
           triggering form submission via a ref or state.
        */}
      </DialogContent>
    </Dialog>
  );
}
