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
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ScheduledMessage } from "@/services/message-service";

interface CancelScheduledMessageAlertProps {
  message: ScheduledMessage | null;
  triggerButton?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmCancel?: () => void; // Callback after confirmation
}

export function CancelScheduledMessageAlert({ message, triggerButton, open, onOpenChange, onConfirmCancel }: CancelScheduledMessageAlertProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  // TODO: Replace with actual API call to cancel scheduled message
  const handleCancel = async () => {
    if (!message?.id) return;

    setIsLoading(true);
    console.log(`Canceling scheduled message ${message.id} to ${message.recipient}`);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Assume success
      toast({
        title: "Message Canceled",
        description: `The scheduled message to ${message.recipient} has been canceled.`,
      });
      onOpenChange(false); // Close dialog
      onConfirmCancel?.(); // Call callback
    } catch (error) {
      console.error("Failed to cancel scheduled message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel scheduled message. Please try again.",
      });
      setIsLoading(false);
      onOpenChange(false);
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
             <span className="font-semibold">{message?.displayTime}</span>. The message will not be sent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Scheduled</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isLoading}
            className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
            // Style as destructive action
            style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
          >
            {isLoading ? "Canceling..." : "Cancel Message"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
