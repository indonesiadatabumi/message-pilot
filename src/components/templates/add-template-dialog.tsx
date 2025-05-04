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

interface AddTemplateDialogProps {
  triggerButton: React.ReactNode;
  // TODO: Add function to refresh data on successful add
}

export function AddTemplateDialog({ triggerButton }: AddTemplateDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // TODO: Replace with actual API call
  const handleAddTemplate = async (values: { name: string; content: string }) => {
    setIsLoading(true);
    console.log("Adding template:", values);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Assume success
      toast({
        title: "Template Added",
        description: `Template "${values.name}" has been created.`,
      });
      setOpen(false); // Close dialog on success
      // TODO: Call refresh function here
    } catch (error) {
      console.error("Failed to add template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add template. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md"> {/* Adjusted width */}
        <DialogHeader>
          <DialogTitle>Add New Template</DialogTitle>
          <DialogDescription>
            Create a reusable message template. Use <code className="bg-muted px-1 rounded text-sm font-mono">{`{{parameter_name}}`}</code> for variables.
          </DialogDescription>
        </DialogHeader>
        <TemplateForm onSubmit={handleAddTemplate} isLoading={isLoading} submitButtonText="Add Template"/>
      </DialogContent>
    </Dialog>
  );
}
