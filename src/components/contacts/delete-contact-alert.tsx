"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Contact } from "@/services/message-service";

interface DeleteContactAlertProps {
  contact: Contact | null;
  triggerButton?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete?: () => void; // Callback after confirmation
}

export function DeleteContactAlert({ contact, triggerButton, open, onOpenChange, onConfirmDelete }: DeleteContactAlertProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!contact?.id) return;

    setIsLoading(true);
    console.log(`Deleting contact ${contact.id}: ${contact.name}`);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Assume success
      toast({
        title: "Contact Deleted",
        description: `${contact.name} has been removed from your contacts.`,
      });
      onOpenChange(false); // Close dialog
      onConfirmDelete?.(); // Call callback
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete contact. Please try again.",
      });
      setIsLoading(false); // Ensure loading state is reset on error
       onOpenChange(false); // Close dialog even on error
    }
    // No finally block needed here as state is handled in success/error paths
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {triggerButton && <AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the contact{" "}
            <span className="font-semibold">{contact?.name}</span> ({contact?.phoneNumber}).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
            // Apply destructive variant styling directly if needed, or rely on theme
             style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
