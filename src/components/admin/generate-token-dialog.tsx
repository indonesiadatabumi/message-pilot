"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GenerateTokenForm } from "./generate-token-form";
import type { User } from "@/services/user-service";

interface GenerateTokenDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenGenerated?: () => void;
}

export function GenerateTokenDialog({ user, open, onOpenChange, onTokenGenerated }: GenerateTokenDialogProps) {
  if (!user) return null;

  const handleTokenGenerated = () => {
    if (onTokenGenerated) {
      onTokenGenerated();
    }
    onOpenChange(false); // Close dialog on success
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Token for {user.name}</DialogTitle>
          <DialogDescription>
            Select an expiration for the new token. The generated token will have admin privileges.
          </DialogDescription>
        </DialogHeader>
        <GenerateTokenForm user={user} onTokenGenerated={handleTokenGenerated} />
      </DialogContent>
    </Dialog>
  );
}
