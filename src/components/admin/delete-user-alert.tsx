typescriptreact
"use client";

import { useState, useTransition } from "react";
import {
    AlertDialog,
    AlertDialogContent, // Assuming your UI library path
    AlertDialogHeader, // Assuming your UI library path
    AlertDialogTitle, // Assuming your UI library path
    AlertDialogDescription, // Assuming your UI library path
    AlertDialogFooter, // Assuming your UI library path
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button"; // Assuming your UI library path
import { toast } from "@/hooks/use-toast"; // Assuming your toast hook path
import type { User } from "@prisma/client"; // Assuming Prisma user type
import { deleteUser } from "@/actions/user-actions"; // Import the server action

interface DeleteUserAlertProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmDelete: (userId: string) => void; // Callback after successful deletion
}

export function DeleteUserAlert({
    user,
    open,
    onOpenChange,
    onConfirmDelete,
}: DeleteUserAlertProps) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = async () => {
        if (!user) return;

        startTransition(async () => {
            const result = await deleteUser({ userId: user.id });

            if (result.success) {
                toast({
                    title: "User Deleted",
                    description: result.message,
                });
                onConfirmDelete(user.id); // Call the success callback
                onOpenChange(false); // Close the dialog
            } else {
                toast({
                    variant: "destructive",
                    title: "Deletion Failed",
                    description: result.error || "An unexpected error occurred.",
                });
            }
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the user{" "}
                        {user?.username ? `"${user.username}"` : "this user"} and remove
                        their data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                        {isPending ? "Deleting..." : "Continue"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}