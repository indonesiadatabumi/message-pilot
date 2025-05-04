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
import { Edit, Ban } from "lucide-react"; // Keep Ban for Cancel
import type { ScheduledMessage } from "@/services/message-service";
import { CancelScheduledMessageAlert } from "./cancel-scheduled-message-alert";
// Placeholder for Edit functionality
// import { EditScheduledMessageDialog } from "./edit-scheduled-message-dialog";
import { useRouter } from 'next/navigation'; // For refresh

// Define the props type including the added displayTime
interface FormattedScheduledMessage extends ScheduledMessage {
  displayTime: string;
}

interface ScheduledMessagesTableProps {
  scheduledMessages: FormattedScheduledMessage[];
}

export function ScheduledMessagesTable({ scheduledMessages: initialMessages }: ScheduledMessagesTableProps) {
    const router = useRouter();
    const [messages, setMessages] = React.useState(initialMessages);
    const [cancelingMessage, setCancelingMessage] = React.useState<FormattedScheduledMessage | null>(null);
    const [isCancelAlertOpen, setIsCancelAlertOpen] = React.useState(false);

    // State for editing (when implemented)
    // const [editingMessage, setEditingMessage] = React.useState<FormattedScheduledMessage | null>(null);
    // const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

     // Update local state if initial props change
    React.useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);


    const handleCancelClick = (message: FormattedScheduledMessage) => {
        setCancelingMessage(message);
        setIsCancelAlertOpen(true);
    };

    // Callback when cancel is confirmed and successful
     const handleCancelSuccess = () => {
        if (!cancelingMessage?._id) return;
        // Optimistically remove the canceled message from the local state
        setMessages(prevMessages => prevMessages.filter(m => m._id !== cancelingMessage._id));
        setIsCancelAlertOpen(false);
        setCancelingMessage(null);
        // Optionally, trigger a full refresh if needed, though optimistic update is smoother
        // router.refresh();
    };

     // Close handler for cancel alert without success
     const handleCancelClose = () => {
        setIsCancelAlertOpen(false);
        setCancelingMessage(null);
    };

    // TODO: Handlers for edit dialog when created
    // const handleEditClick = (message: FormattedScheduledMessage) => { setEditingMessage(message); setIsEditDialogOpen(true); };
    // const handleEditSuccess = (updatedMessage: FormattedScheduledMessage) => { ... };
    // const handleEditClose = () => { setIsEditDialogOpen(false); setEditingMessage(null); };

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
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No pending scheduled messages found.
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message) => (
                // Use _id as key
                <TableRow key={message._id?.toString()}>
                  <TableCell className="font-medium">{message.recipient}</TableCell>
                  <TableCell className="max-w-xs truncate">{message.content}</TableCell>
                  {/* Display the pre-formatted time */}
                  <TableCell>{message.displayTime}</TableCell>
                  <TableCell className="text-right">
                    {/* Edit Button Placeholder - Requires EditScheduledMessageDialog and action */}
                     <Button variant="ghost" size="icon" aria-label="Edit Scheduled Message" disabled title="Edit (Not Implemented)">
                       <Edit className="h-4 w-4 opacity-50" />
                     </Button>

                    {/* Cancel Button & Alert */}
                    <CancelScheduledMessageAlert
                        message={cancelingMessage} // Pass the full message object
                        // Control open state based on the specific message ID
                        open={isCancelAlertOpen && cancelingMessage?._id === message._id}
                        onOpenChange={(open) => { if (!open) handleCancelClose(); }}
                        onConfirmCancel={handleCancelSuccess} // Use success callback
                        triggerButton={
                            <Button variant="ghost" size="icon" onClick={() => handleCancelClick(message)} className="text-destructive hover:text-destructive/90" aria-label="Cancel Scheduled Message">
                                <Ban className="h-4 w-4" />
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

       {/* Edit Dialog Placeholder (when implemented) */}
       {/*
        <EditScheduledMessageDialog
            message={editingMessage}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSaveSuccess={handleEditSuccess}
        />
        */}
    </>
  );
}
