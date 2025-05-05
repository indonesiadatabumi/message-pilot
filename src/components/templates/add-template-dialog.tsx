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
import { addTemplate } from "@/actions/template-actions"; // Import the action

interface AddTemplateDialogProps {
  triggerButton: React.ReactNode;
  // onAddSuccess?: (newTemplate: MessageTemplate) => void; // Optional callback
}

export function AddTemplateDialog({ triggerButton /*, onAddSuccess */ }: AddTemplateDialogProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter(); // Get router instance
  const [isLoading, setIsLoading] = React.useState(false); // Add loading state if form doesn't handle it internally

  // Called by TemplateForm on successful submission
  const handleAddSuccess = (newTemplate: MessageTemplate) => {
    setIsLoading(false); // Stop loading
    setOpen(false); // Close the dialog
    // onAddSuccess?.(newTemplate); // Call parent callback if provided
    router.refresh(); // Refresh server components/data
  };

  // Called by TemplateForm's Cancel button
  const handleCancel = () => {
    if (!isLoading) { // Prevent closing while loading
      setOpen(false);
    }
  };

  // Example submit handler if TemplateForm needs external trigger
  // const handleAddTemplate = async (values: any) => {
  //    setIsLoading(true);
  //    const result = await addTemplate(values);
  //    if (result.success) {
  //        handleAddSuccess(result.template);
  //    } else {
  //         // Handle error (e.g., show toast)
  //         console.error("Failed to add template:", result.error);
  //         setIsLoading(false);
  //    }
  // }


  return (
    <Dialog open={open} onOpenChange={handleCancel}> {/* Use handleCancel for onOpenChange */}
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Template</DialogTitle>
          <DialogDescription>
            {/* Use code tags correctly */}
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
        {/* If TemplateForm needed external submit:
         <TemplateForm ref={formRef} />
         <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>Cancel</Button>
            <Button onClick={() => formRef.current?.submit()} disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Template'}
            </Button>
         </DialogFooter>
         */}
      </DialogContent>
    </Dialog>
  );
}
