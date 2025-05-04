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
import { Button } from "@/components/ui/button"; // For trigger styling if needed
import { toast } from "@/hooks/use-toast";
import type { MessageTemplate } from "@/services/message-service";
import { deleteTemplate } from "@/actions/template-actions"; // Import server action
import { cn } from "@/lib/utils"; // Import cn utility

interface DeleteTemplateAlertProps {
  template: MessageTemplate | null; // Template to delete
  triggerButton?: React.ReactNode; // Trigger element
  open: boolean; // Controlled externally
  onOpenChange: (open: boolean) => void; // Update external state
  onConfirmDelete: () => void; // Callback on successful delete
}

export function DeleteTemplateAlert({
    template,
    triggerButton,
    open,
    onOpenChange,
    onConfirmDelete
}: DeleteTemplateAlertProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!template?._id) {
         toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot delete template: Invalid template data.",
        });
        onOpenChange(false);
        return;
    }

    setIsLoading(true);
    try {
      // Call the server action
      const result = await deleteTemplate(template._id.toString());

      if (result.success) {
        toast({
          title: "Template Deleted",
          description: `Template "${template.name}" has been removed.`,
        });
        onConfirmDelete(); // Notify parent component
        // Parent (TemplateTable) should handle closing the dialog
        // onOpenChange(false); // Or close explicitly here
      } else {
         toast({
          variant: "destructive",
          title: "Error Deleting Template",
          description: result.error || "Failed to delete template. Please try again.",
        });
        onOpenChange(false); // Close dialog on error
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while deleting the template.",
      });
       onOpenChange(false); // Close on unexpected error
    } finally {
      // Ensure isLoading is reset, check if component might be unmounted
       if (React.version) {
            setIsLoading(false);
       }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {triggerButton && <AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the template{" "}
            <span className="font-semibold">"{template?.name}"</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
