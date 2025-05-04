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
import { Edit, Trash2, Ban } from "lucide-react"; // Added Ban for Cancel
import { ScheduledMessage } from "@/services/message-service";
// Import Edit/Cancel components when created
// import { EditScheduledMessageDialog } from "./edit-scheduled-message-dialog";
import { CancelScheduledMessageAlert } from "./cancel-scheduled-message-alert";
import { toast } from "@/hooks/use-toast";


interface ScheduledMessagesTableProps {
  scheduledMessages: ScheduledMessage[]; // Use the extended type with displayTime
  // TODO: Add functions for refresh/update data after edits/cancels
}

export function ScheduledMessagesTable({ scheduledMessages }: ScheduledMessagesTableProps) {
    // State for managing the cancel alert dialog
    const [cancelingMessage, setCancelingMessage] = React.useState<ScheduledMessage | null>(null);
    const [isCancelAlertOpen, setIsCancelAlertOpen] = React.useState(false);

    // TODO: State for editing dialog when created
    // const [editingMessage, setEditingMessage] = React.useState<ScheduledMessage | null>(null);
    // const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

    const handleCancelClick = (message: ScheduledMessage) => {
        setCancelingMessage(message);
        setIsCancelAlertOpen(true);
    };

     const handleCancelClose = (canceled: boolean) => {
        setIsCancelAlertOpen(false);
        setCancelingMessage(null);
        if (canceled) {
           // TODO: Potentially refresh data here or optimistically remove from list
           console.log("Scheduled message potentially canceled, refresh needed.");
        }
    };

    // TODO: Handlers for edit dialog when created
    // const handleEditClick = (message: ScheduledMessage) => { ... };
    // const handleEditClose = () => { ... };

  return (
    <>
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Scheduled Time</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scheduledMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No scheduled messages found.
                </TableCell>
              </TableRow>
            ) : (
              scheduledMessages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="font-medium">{message.recipient}</TableCell>
                  <TableCell className="max-w-xs truncate">{message.content}</TableCell>
                  <TableCell>{message.displayTime}</TableCell> {/* Display formatted time */}
                  <TableCell className="text-right">
                    {/* Edit Button Placeholder - Implement when EditScheduledMessageDialog exists */}
                    {/*
                    <EditScheduledMessageDialog
                        message={editingMessage}
                        open={isEditDialogOpen && editingMessage?.id === message.id}
                        onOpenChange={(open) => { if (!open) handleEditClose(); }}
                        triggerButton={
                           <Button variant="ghost" size="icon" onClick={() => handleEditClick(message)} aria-label="Edit Scheduled Message">
                             <Edit className="h-4 w-4" />
                           </Button>
                        }
                        onSaveSuccess={handleEditClose}
                     />
                     */}
                     <Button variant="ghost" size="icon" aria-label="Edit Scheduled Message" disabled> {/* Disabled for now */}
                       <Edit className="h-4 w-4 opacity-50" />
                     </Button>

                    {/* Cancel Button */}
                    <CancelScheduledMessageAlert
                        message={cancelingMessage}
                        open={isCancelAlertOpen && cancelingMessage?.id === message.id}
                        onOpenChange={(open) => { if (!open) handleCancelClose(false); }}
                        onConfirmCancel={() => handleCancelClose(true)}
                        triggerButton={
                            <Button variant="ghost" size="icon" onClick={() => handleCancelClick(message)} className="text-destructive hover:text-destructive/90" aria-label="Cancel Scheduled Message">
                                <Ban className="h-4 w-4" /> {/* Use Ban icon for Cancel */}
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
