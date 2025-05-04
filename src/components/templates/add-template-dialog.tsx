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
import { useRouter } from 'next/navigation'; // For refreshing data

interface AddTemplateDialogProps {
  triggerButton: React.ReactNode;
  // onAddSuccess?: (newTemplate: MessageTemplate) => void; // Optional callback
}

export function AddTemplateDialog({ triggerButton /*, onAddSuccess */ }: AddTemplateDialogProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter(); // Get router instance

  // Called by TemplateForm on successful submission
  const handleAddSuccess = (newTemplate: MessageTemplate) => {
    setOpen(false); // Close the dialog
    // onAddSuccess?.(newTemplate); // Call parent callback if provided
    router.refresh(); // Refresh server components/data
  };

  // Called by TemplateForm's Cancel button
  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Template</DialogTitle>
          <DialogDescription>
            Create a reusable message template. Use <code className="bg-muted px-1 rounded text-sm font-mono">{`{{parameterName}}`}</code> for variables.
          </DialogDescription>
        </DialogHeader>
        {/* TemplateForm handles submission internally via server actions */}
        <TemplateForm
            onSubmitSuccess={handleAddSuccess}
            onCancel={handleCancel}
            submitButtonText="Add Template"
            // No initialData needed for adding
        />
      </DialogContent>
    </Dialog>
  );
}
