"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { MessageTemplate } from "@/services/message-service"; // Assuming MessageTemplate type is defined here
import { EditTemplateDialog } from "./edit-template-dialog";
import { DeleteTemplateAlert } from "./delete-template-alert";

interface TemplateTableProps {
  templates: MessageTemplate[];
  // TODO: Add functions for refresh/update data after edits/deletes
}

export function TemplateTable({ templates }: TemplateTableProps) {
    const [editingTemplate, setEditingTemplate] = React.useState<MessageTemplate | null>(null);
    const [deletingTemplate, setDeletingTemplate] = React.useState<MessageTemplate | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    const handleEditClick = (template: MessageTemplate) => {
        setEditingTemplate(template);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (template: MessageTemplate) => {
        setDeletingTemplate(template);
        setIsDeleteDialogOpen(true);
    };

     const handleEditClose = () => {
        setIsEditDialogOpen(false);
        setEditingTemplate(null);
        // TODO: Potentially refresh data here
    };

    const handleDeleteClose = (deleted: boolean) => {
        setIsDeleteDialogOpen(false);
        setDeletingTemplate(null);
        if (deleted) {
           // TODO: Potentially refresh data here or optimistically remove from list
           console.log("Template potentially deleted, refresh needed.");
        }
    };

  return (
    <>
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No templates found.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{template.content}</TableCell>
                  <TableCell className="text-right">
                     <EditTemplateDialog
                       template={editingTemplate}
                       open={isEditDialogOpen && editingTemplate?.id === template.id}
                       onOpenChange={(open) => { if (!open) handleEditClose(); }}
                       triggerButton={
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(template)} aria-label="Edit Template">
                          <Edit className="h-4 w-4" />
                        </Button>
                       }
                       onSaveSuccess={handleEditClose}
                    />
                    <DeleteTemplateAlert
                        template={deletingTemplate}
                        open={isDeleteDialogOpen && deletingTemplate?.id === template.id}
                        onOpenChange={(open) => { if (!open) handleDeleteClose(false); }}
                        onConfirmDelete={() => handleDeleteClose(true)}
                        triggerButton={
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(template)} className="text-destructive hover:text-destructive/90" aria-label="Delete Template">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// Add id to MessageTemplate interface if it doesn't exist
declare module "@/services/message-service" {
  interface MessageTemplate {
    id?: string; // Make ID optional or required based on your API
  }
}
