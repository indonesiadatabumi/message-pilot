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
import type { MessageTemplate } from "@/services/message-service";

interface EditTemplateDialogProps {
  template: MessageTemplate | null; // Template to edit
  triggerButton?: React.ReactNode; // Optional trigger
  open: boolean; // Controlled by parent
  onOpenChange: (open: boolean) => void; // To change parent state
  onSaveSuccess: (updatedTemplate: MessageTemplate) => void; // Callback on success
}

export function EditTemplateDialog({
    template,
    triggerButton,
    open,
    onOpenChange,
    onSaveSuccess
}: EditTemplateDialogProps) {

  // Called by TemplateForm on successful submission
  const handleEditSuccess = (updatedTemplate: MessageTemplate) => {
    onOpenChange(false); // Close the dialog
    onSaveSuccess(updatedTemplate); // Notify parent
  };

  // Called by TemplateForm's Cancel button
  const handleCancel = () => {
    onOpenChange(false);
  };

   // Prevent rendering form with null data if opened incorrectly
  if (!template && open) {
      console.warn("EditTemplateDialog opened without a template.");
      return null;
  }

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
         {/* Render TemplateForm only when open and template is available */}
         {open && template && (
            <TemplateForm
                initialData={template}
                onSubmitSuccess={handleEditSuccess}
                onCancel={handleCancel}
                submitButtonText="Save Changes"
            />
         )}
      </DialogContent>
    </Dialog>
  );
}
