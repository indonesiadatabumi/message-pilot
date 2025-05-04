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

interface AddContactDialogProps {
  triggerButton: React.ReactNode;
  // TODO: Add function to refresh data on successful add
}

export function AddContactDialog({ triggerButton }: AddContactDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // TODO: Replace with actual API call
  const handleAddContact = async (values: { name: string; phoneNumber: string }) => {
    setIsLoading(true);
    console.log("Adding contact:", values);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Assume success
      toast({
        title: "Contact Added",
        description: `${values.name} has been added to your contacts.`,
      });
      setOpen(false); // Close dialog on success
      // TODO: Call refresh function here
    } catch (error) {
      console.error("Failed to add contact:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add contact. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Enter the details for the new contact. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <ContactForm onSubmit={handleAddContact} isLoading={isLoading} submitButtonText="Add Contact"/>
      </DialogContent>
    </Dialog>
  );
}
