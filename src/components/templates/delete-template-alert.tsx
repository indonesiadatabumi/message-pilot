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
import { MessageTemplate } from "@/services/message-service";

interface DeleteTemplateAlertProps {
  template: MessageTemplate | null;
  triggerButton?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete?: () => void;
}

export function DeleteTemplateAlert({ template, triggerButton, open, onOpenChange, onConfirmDelete }: DeleteTemplateAlertProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!template?.id) return;

    setIsLoading(true);
    console.log(`Deleting template ${template.id}: ${template.name}`);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Assume success
      toast({
        title: "Template Deleted",
        description: `Template "${template.name}" has been removed.`,
      });
      onOpenChange(false); // Close dialog
      onConfirmDelete?.(); // Call callback
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete template. Please try again.",
      });
       setIsLoading(false);
       onOpenChange(false);
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
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
            style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
