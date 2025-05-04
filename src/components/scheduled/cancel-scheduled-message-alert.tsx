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
import { Button } from "@/components/ui/button"; // For trigger styling if needed
import { toast } from "@/hooks/use-toast";
import type { ScheduledMessage } from "@/services/message-service";
import { cancelScheduledMessage } from "@/actions/scheduled-message-actions"; // Import server action
import { cn } from "@/lib/utils"; // Import cn utility

// Define props type, including potential displayTime if passed
interface CancelScheduledMessageAlertProps {
  message: (ScheduledMessage & { displayTime?: string }) | null; // Message to cancel
  triggerButton?: React.ReactNode; // Trigger element
  open: boolean; // Controlled externally
  onOpenChange: (open: boolean) => void; // Update external state
  onConfirmCancel: () => void; // Callback on successful cancel
}

export function CancelScheduledMessageAlert({
    message,
    triggerButton,
    open,
    onOpenChange,
    onConfirmCancel
}: CancelScheduledMessageAlertProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCancel = async () => {
    if (!message?._id) {
       toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot cancel message: Invalid message data.",
        });
        onOpenChange(false);
        return;
    }

    setIsLoading(true);
    try {
      // Call the server action
      const result = await cancelScheduledMessage(message._id.toString());

      if (result.success) {
        toast({
          title: "Message Canceled",
          description: `The scheduled message to ${message.recipient} has been canceled.`,
        });
        onConfirmCancel(); // Notify parent component (ScheduledMessagesTable)
        // Parent should handle closing the dialog
        // onOpenChange(false); // Or close explicitly here
      } else {
        toast({
          variant: "destructive",
          title: "Error Canceling Message",
          description: result.error || "Failed to cancel scheduled message. It might have already been sent or canceled.",
        });
         onOpenChange(false); // Close dialog on error
      }
    } catch (error) {
      console.error("Failed to cancel scheduled message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while canceling the message.",
      });
      onOpenChange(false); // Close on unexpected error
    } finally {
       // Ensure isLoading is reset
       if (React.version) {
          setIsLoading(false);
       }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {triggerButton && <AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will cancel the scheduled message to{" "}
            <span className="font-semibold">{message?.recipient}</span> scheduled for{" "}
             {/* Use displayTime if available, otherwise format raw date (might cause hydration issues if not careful) */}
             <span className="font-semibold">{message?.displayTime ?? (message?.scheduledTime ? new Date(message.scheduledTime).toLocaleString() : 'N/A')}</span>.
             The message will not be sent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={() => onOpenChange(false)}>Keep Scheduled</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isLoading}
             className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? "Canceling..." : "Cancel Message"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
