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
import type { MessageTemplate } from "@/services/message-service"; // Use type import
import { EditTemplateDialog } from "./edit-template-dialog";
import { DeleteTemplateAlert } from "./delete-template-alert";
import { useRouter } from 'next/navigation'; // For potential refresh

interface TemplateTableProps {
  templates: MessageTemplate[];
}

export function TemplateTable({ templates: initialTemplates }: TemplateTableProps) {
    const router = useRouter();
    const [templates, setTemplates] = React.useState(initialTemplates);
    const [editingTemplate, setEditingTemplate] = React.useState<MessageTemplate | null>(null);
    const [deletingTemplate, setDeletingTemplate] = React.useState<MessageTemplate | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    // Update local state if initial props change
    React.useEffect(() => {
        setTemplates(initialTemplates);
    }, [initialTemplates]);

    const handleEditClick = (template: MessageTemplate) => {
        setEditingTemplate(template);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (template: MessageTemplate) => {
        setDeletingTemplate(template);
        setIsDeleteDialogOpen(true);
    };

    // Callback when edit is successful
    const handleEditSuccess = (updatedTemplate: MessageTemplate) => {
        setTemplates(prevTemplates =>
            prevTemplates.map(t => (t._id === updatedTemplate._id ? updatedTemplate : t))
        );
        setIsEditDialogOpen(false);
        setEditingTemplate(null);
        // router.refresh(); // Alternative: full refresh
    };

    // Callback when delete is confirmed and successful
    const handleDeleteSuccess = () => {
        if (!deletingTemplate?._id) return;
        setTemplates(prevTemplates => prevTemplates.filter(t => t._id !== deletingTemplate._id));
        setIsDeleteDialogOpen(false);
        setDeletingTemplate(null);
        // router.refresh(); // Alternative: full refresh
    };

     // Close handlers without success action
     const handleEditClose = () => {
        setIsEditDialogOpen(false);
        setEditingTemplate(null);
    };
     const handleDeleteClose = () => {
        setIsDeleteDialogOpen(false);
        setDeletingTemplate(null);
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
                 // Use _id as the key
                <TableRow key={template._id?.toString()}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{template.content}</TableCell>
                  <TableCell className="text-right">
                     {/* Edit Dialog */}
                     <EditTemplateDialog
                       template={editingTemplate} // Pass the template being edited
                       // Ensure open state is tied to the specific template's ID
                       open={isEditDialogOpen && editingTemplate?._id === template._id}
                       onOpenChange={(open) => { if (!open) handleEditClose(); }}
                       triggerButton={
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(template)} aria-label="Edit Template">
                          <Edit className="h-4 w-4" />
                        </Button>
                       }
                       onSaveSuccess={handleEditSuccess} // Use success callback
                    />
                    {/* Delete Alert */}
                    <DeleteTemplateAlert
                        template={deletingTemplate} // Pass the template being deleted
                        // Ensure open state is tied to the specific template's ID
                        open={isDeleteDialogOpen && deletingTemplate?._id === template._id}
                        onOpenChange={(open) => { if (!open) handleDeleteClose(); }}
                        onConfirmDelete={handleDeleteSuccess} // Use success callback
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

// No longer need declare module augmentation
