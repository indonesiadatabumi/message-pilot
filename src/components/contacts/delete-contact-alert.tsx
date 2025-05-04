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
import { Button } from "@/components/ui/button"; // Keep for potential trigger styling
import { toast } from "@/hooks/use-toast";
import type { Contact } from "@/services/message-service";
import { deleteContact } from "@/actions/contact-actions"; // Import server action

interface DeleteContactAlertProps {
  contact: Contact | null; // The contact to delete
  triggerButton?: React.ReactNode; // The button or element that triggers the dialog
  open: boolean; // Control the dialog's visibility externally
  onOpenChange: (open: boolean) => void; // Function to update the external state
  onConfirmDelete: () => void; // Callback after successful deletion confirmation
}

export function DeleteContactAlert({
    contact,
    triggerButton,
    open,
    onOpenChange,
    onConfirmDelete
}: DeleteContactAlertProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleDelete = async () => {
    // Ensure contact and _id exist before proceeding
    if (!contact?._id) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot delete contact: Invalid contact data.",
        });
        onOpenChange(false); // Close dialog if contact data is invalid
        return;
    }

    setIsLoading(true);
    try {
      // Call the server action with the contact's ID (converted to string)
      const result = await deleteContact(contact._id.toString());

      if (result.success) {
        toast({
          title: "Contact Deleted",
          description: `${contact.name} has been removed from your contacts.`,
        });
        onConfirmDelete(); // Call the success callback provided by the parent
        // Parent component (ContactTable) should handle closing the dialog via onOpenChange
        // or directly via the success callback if preferred. Let's assume parent handles it.
        // onOpenChange(false); // Explicitly close here if parent doesn't
      } else {
        // Handle error from server action
        toast({
          variant: "destructive",
          title: "Error Deleting Contact",
          description: result.error || "Failed to delete contact. Please try again.",
        });
         onOpenChange(false); // Close dialog even on error
      }
    } catch (error) {
      // Handle unexpected errors during the action call
      console.error("Failed to delete contact:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while deleting the contact.",
      });
       onOpenChange(false); // Close dialog on unexpected error
    } finally {
      // Ensure loading state is reset regardless of outcome
      // Check if component is still mounted before setting state if needed, though usually fine here.
       if (React.version) { // Basic check if component might be unmounted
         setIsLoading(false);
       }
    }
  };

  return (
    // Controlled AlertDialog using 'open' and 'onOpenChange' props
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* Render trigger only if provided */}
      {triggerButton && <AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the contact{" "}
            {/* Use contact?.phone */}
            <span className="font-semibold">{contact?.name}</span> ({contact?.phone}).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Disable Cancel button while loading */}
          <AlertDialogCancel disabled={isLoading} onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            // Apply destructive styling using Button's variant or direct styles
            className={cn(
               "bg-destructive text-destructive-foreground hover:bg-destructive/90",
               isLoading && "opacity-50 cursor-not-allowed"
            )}
            // style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Helper for class names - create if not existing
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
