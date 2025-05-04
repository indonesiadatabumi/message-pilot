"use client";

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
import { Contact } from "@/services/message-service"; // Assuming Contact type is defined here

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }).max(100, {message: "Name too long."}),
  phoneNumber: z.string().regex(phoneRegex, { message: "Invalid phone number format." }).min(5, {message: "Phone number too short."}).max(20, {message: "Phone number too long."}),
});

type ContactFormValues = z.infer<typeof formSchema>;

interface ContactFormProps {
  initialData?: Contact | null; // Make initialData optional and nullable
  onSubmit: (values: ContactFormValues) => Promise<void> | void;
  isLoading?: boolean;
  submitButtonText?: string;
}

export function ContactForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = "Save Contact",
}: ContactFormProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      phoneNumber: initialData?.phoneNumber || "",
    },
  });

  // Reset form if initialData changes (e.g., when opening edit dialog for a different contact)
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        phoneNumber: initialData.phoneNumber,
      });
    } else {
      form.reset({
          name: "",
          phoneNumber: ""
      })
    }
  }, [initialData, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          name="phoneNumber"
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
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          {isLoading ? "Saving..." : submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
