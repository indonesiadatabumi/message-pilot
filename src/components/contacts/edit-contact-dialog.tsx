"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ContactForm } from "./contact-form";
import { toast } from "@/hooks/use-toast"; // Correct import path
import { Contact } from "@/services/message-service";

interface EditContactDialogProps {
  contact: Contact | null;
  triggerButton?: React.ReactNode; // Make trigger optional if controlled externally
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess?: () => void; // Callback for successful save
}

export function EditContactDialog({ contact, triggerButton, open, onOpenChange, onSaveSuccess }: EditContactDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  // TODO: Replace with actual API call
  const handleEditContact = async (values: { name: string; phoneNumber: string }) => {
    if (!contact?.id) return; // Need ID to edit

    setIsLoading(true);
    console.log(`Editing contact ${contact.id}:`, values);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Assume success
      toast({
        title: "Contact Updated",
        description: `${values.name}'s information has been updated.`,
      });
      onOpenChange(false); // Close dialog
      onSaveSuccess?.(); // Call success callback
    } catch (error) {
      console.error("Failed to edit contact:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update contact. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure the dialog only renders content when a contact is provided
  // And reset the form via ContactForm's useEffect when contact changes

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update the contact details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        {/* Pass contact data to the form */}
        <ContactForm
            initialData={contact}
            onSubmit={handleEditContact}
            isLoading={isLoading}
            submitButtonText="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
