"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { Contact } from "@/services/message-service";
import { addContact, updateContact } from "@/actions/contact-actions"; // Import server actions

// Schema should match server action schema
const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }).max(100, {message: "Name too long."}),
  // Use 'phone' to match the server action and Contact interface
  phone: z.string().regex(phoneRegex, { message: "Invalid phone number format." }).min(5, {message: "Phone number too short."}).max(20, {message: "Phone number too long."}),
});

type ContactFormValues = z.infer<typeof formSchema>;

interface ContactFormProps {
  initialData?: Contact | null;
  // onSubmitSuccess is called with the new/updated contact data after a successful action
  onSubmitSuccess: (contact: Contact) => void;
  onCancel?: () => void; // Optional: Function to call when closing/canceling
  submitButtonText?: string;
}

export function ContactForm({
  initialData,
  onSubmitSuccess,
  onCancel,
  submitButtonText = "Save Contact",
}: ContactFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "", // Use 'phone' here
    },
  });

   // Reset form if initialData changes
  React.useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      phone: initialData?.phone || "", // Use 'phone' here
    });
  }, [initialData, form]);

  const handleSubmit = async (values: ContactFormValues) => {
    setIsLoading(true);
    try {
      let result;
      if (initialData?._id) {
        // Update existing contact
        result = await updateContact(initialData._id.toString(), values);
      } else {
        // Add new contact
        result = await addContact(values);
      }

      if (result.success) {
        toast({
          title: initialData ? "Contact Updated" : "Contact Added",
          description: `${result.contact.name} has been successfully ${initialData ? 'updated' : 'added'}.`,
        });
        onSubmitSuccess(result.contact); // Pass the result back
        form.reset(); // Reset form on success
      } else {
        // Handle validation errors from server action
        if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                 if (messages && messages.length > 0) {
                    form.setError(field as keyof ContactFormValues, {
                        type: 'server',
                        message: messages[0], // Show the first error message
                    });
                 }
            });
             toast({
                variant: "destructive",
                title: "Validation Error",
                description: result.error || "Please check the highlighted fields.",
             });
        } else {
             // Handle general server errors
             toast({
                variant: "destructive",
                title: "Error",
                description: result.error || `Failed to ${initialData ? 'update' : 'add'} contact.`,
             });
        }
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `An unexpected error occurred. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Form {...form}>
      {/* Use handleSubmit from React Hook Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter contact name" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone" // Ensure this matches the schema and interface
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter phone number (e.g., +1234567890)" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="flex justify-end gap-2">
           {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
           )}
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
            {isLoading ? "Saving..." : submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  );
}
