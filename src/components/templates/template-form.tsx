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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { MessageTemplate } from "@/services/message-service";
import { addTemplate, updateTemplate } from "@/actions/template-actions"; // Import server actions

// Schema should match server action schema
const formSchema = z.object({
    name: z.string().min(1, { message: "Template name is required." }).max(100, {message: "Name too long."}),
    content: z.string().min(1, { message: "Template content cannot be empty." }).max(1000, {message: "Content too long."})
      .refine(val => !val.includes('{}') && !val.includes('{ }'), { message: "Empty braces {} are not allowed. Use {{parameterName}}."})
      .refine(val => {
          const matches = val.match(/\{\{[^\{\}]*?\}\}/g) || [];
          // Find single braces not part of double braces
          const invalidMatches = val.match(/\{[^{}]*?\}/g)?.filter(m => !matches.includes(m)) || [];
          return invalidMatches.length === 0;
      }, { message: "Use double curly braces for parameters, e.g., {{name}}."}),
});


type TemplateFormValues = z.infer<typeof formSchema>;

interface TemplateFormProps {
  initialData?: MessageTemplate | null;
  onSubmitSuccess: (template: MessageTemplate) => void; // Callback with new/updated template
  onCancel?: () => void; // Optional cancel handler
  submitButtonText?: string;
}

export function TemplateForm({
  initialData,
  onSubmitSuccess,
  onCancel,
  submitButtonText = "Save Template",
}: TemplateFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
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

  const handleSubmit = async (values: TemplateFormValues) => {
      setIsLoading(true);
      try {
        let result;
        if (initialData?._id) {
          // Update existing template
          result = await updateTemplate(initialData._id.toString(), values);
        } else {
          // Add new template
          result = await addTemplate(values);
        }

        if (result.success) {
          toast({
            title: initialData ? "Template Updated" : "Template Added",
            description: `Template "${result.template.name}" has been successfully ${initialData ? 'updated' : 'added'}.`,
          });
          onSubmitSuccess(result.template); // Pass the result back
          form.reset(); // Reset form on success
        } else {
           // Handle validation errors from server action
            if (result.fieldErrors) {
                Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                    if (messages && messages.length > 0) {
                        form.setError(field as keyof TemplateFormValues, {
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
                    description: result.error || `Failed to ${initialData ? 'update' : 'add'} template.`,
                });
            }
        }
      } catch (error) {
        console.error("Error submitting template form:", error);
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  placeholder="Enter the message content. Use {{parameterName}} for variables."
                  className="min-h-[150px] resize-y" // Allow vertical resizing
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
               <p className="text-xs text-muted-foreground pt-1">
                 Example: <code className="bg-muted px-1 rounded text-sm font-mono">{`Hi {{name}}, your appointment is on {{date}}.`}</code>
               </p>
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
