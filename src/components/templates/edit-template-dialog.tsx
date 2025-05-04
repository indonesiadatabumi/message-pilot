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
import { TemplateForm } from "./template-form";
import { toast } from "@/hooks/use-toast";
import { MessageTemplate } from "@/services/message-service";

interface EditTemplateDialogProps {
  template: MessageTemplate | null;
  triggerButton?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess?: () => void;
}

export function EditTemplateDialog({ template, triggerButton, open, onOpenChange, onSaveSuccess }: EditTemplateDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  // TODO: Replace with actual API call
  const handleEditTemplate = async (values: { name: string; content: string }) => {
    if (!template?.id) return;

    setIsLoading(true);
    console.log(`Editing template ${template.id}:`, values);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Assume success
      toast({
        title: "Template Updated",
        description: `Template "${values.name}" has been updated.`,
      });
      onOpenChange(false); // Close dialog
      onSaveSuccess?.(); // Call success callback
    } catch (error) {
      console.error("Failed to edit template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update template. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update the template details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <TemplateForm
          initialData={template}
          onSubmit={handleEditTemplate}
          isLoading={isLoading}
          submitButtonText="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
