typescriptreact
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Import Form components
import { Input } from "@/components/ui/input"; // Keep Input for now
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Button } from "@/components/ui/button";
import { updateUser } from "@/actions/user-actions"; // Import the server action
import { toast } from "@/hooks/use-toast"; // Import toast
import type { User } from "@prisma/client"; // Assuming User type from Prisma

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: () => void;
}

// Define Zod schema for validation
const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  role: z.enum(["ADMIN", "USER"], { // Assuming roles are ADMIN and USER
    message: "Please select a valid role.",
  }),
});

type EditUserFormValues = z.infer<typeof formSchema>;

export function EditUserDialog({ user, open, onOpenChange, onSaveSuccess }: EditUserDialogProps) {
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      role: user?.role || "USER", // Default to USER if role is null/undefined
    },
  });

 // Reset form values when the user prop changes
  React.useEffect(() => {
    if (user) {
      form.reset({ username: user.username || "", email: user.email || "", role: user.role || "USER" });
    } else {
      form.reset({ username: "", email: "", role: "USER" });
    }
  }, [user, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        {/* Use the Form component from shadcn/ui */}
        <Form {...form}>
        <form onSubmit={form.handleSubmit(async (values) => {
             if (!user) return; // Should not happen if dialog is opened with a user
             // setIsLoading(true); // Loading is handled by form.formState.isSubmitting

            const result = await updateUser({
                userId: user.id,
                updatedData: values, // Pass validated form values
            });

            // setIsLoading(false);

            if (result.success) {
                toast({
                    title: "User updated successfully",
                    description: `User ${values.username} has been updated.`,
                });
                onSaveSuccess();
                onOpenChange(false);
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to update user",
                    description: result.error || "An unexpected error occurred.",
                });
                // Optionally set form errors if fieldErrors are returned
                if (result.fieldErrors) {
                   Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                       if (messages && messages.length > 0) {
                           form.setError(field as keyof EditUserFormValues, {
                               type: 'server',
                               message: messages[0],
                           });
                       }
                   });
                }
            }

        })} className="grid gap-4 py-4"> {/* Integrate form with dialog content */}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                    <FormItem className="col-span-3">
                        <FormControl>
                            <Input id="username" {...field} disabled={form.formState.isSubmitting} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
             />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
             <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem className="col-span-3">
                        <FormControl>
                            <Input id="email" {...field} disabled={form.formState.isSubmitting} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
             />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                     <FormItem className="col-span-3">
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={form.formState.isSubmitting}>
                         <FormControl>
                           <SelectTrigger>
                             <SelectValue placeholder="Select a role" />
                           </SelectTrigger>
                         </FormControl>
                         <SelectContent>
                           <SelectItem value="USER">User</SelectItem>
                           <SelectItem value="ADMIN">Admin</SelectItem>
                         </SelectContent>
                       </Select>
                       <FormMessage />
                     </FormItem>
                 )}
             />
          </div>
           {/* Error message display if needed (react-hook-form handles field errors) */}
        </div>
         <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}