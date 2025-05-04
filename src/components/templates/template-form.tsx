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
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { MessageTemplate } from "@/services/message-service";

const formSchema = z.object({
  name: z.string().min(1, { message: "Template name is required." }).max(100, {message: "Name too long."}),
  content: z.string().min(1, { message: "Template content cannot be empty." }).max(1000, {message: "Content too long."})
    // Optional: Add validation for parameter format (e.g., {{param}})
    .refine(val => !val.includes('{}') && !val.includes('{ }'), { message: "Empty braces {} are not allowed. Use {{parameter_name}}."})
    .refine(val => {
        const matches = val.match(/\{\{[^\{\}]*?\}\}/g) || [];
        const invalidMatches = val.match(/\{[^{}]*?\}/g)?.filter(m => !matches.includes(m)) || [];
        return invalidMatches.length === 0;
    }, { message: "Use double curly braces for parameters, e.g., {{name}}."}),
});

type TemplateFormValues = z.infer<typeof formSchema>;

interface TemplateFormProps {
  initialData?: MessageTemplate | null;
  onSubmit: (values: TemplateFormValues) => Promise<void> | void;
  isLoading?: boolean;
  submitButtonText?: string;
}

export function TemplateForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = "Save Template",
}: TemplateFormProps) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      content: initialData?.content || "",
    },
  });

   // Reset form if initialData changes
  React.useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      content: initialData?.content || "",
    });
  }, [initialData, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter a name for the template" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the message content. Use {{parameter_name}} for variables."
                  className="min-h-[150px] resize-y" // Allow vertical resizing
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
               <p className="text-xs text-muted-foreground pt-1">
                 Example: `Hi {{name}}, your appointment is on {{date}}.`
               </p>
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
