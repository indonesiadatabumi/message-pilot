"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ContactSelector } from "./contact-selector";
import { TemplateSelector } from "./template-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Contact, MessageTemplate } from "@/services/message-service"; // Use type imports
import { handleSendTemplateMessage } from "@/actions/message-actions"; // Import the server action

// Helper to extract parameters from template content (e.g., {{name}})
const extractParams = (content: string | undefined): string[] => {
  if (!content) return [];
  const regex = /\{\{\s*([^}]+?)\s*\}\}/g; // Allow optional spaces around param name
  const params = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    params.add(match[1].trim());
  }
  return Array.from(params);
};

// Dynamically create schema based on selected template parameters
const createTemplateMessageSchema = (params: string[]) => {
   const paramsSchema = params.reduce((acc, paramName) => {
        acc[paramName] = z.string().min(1, { message: `Parameter '{{${paramName}}}' cannot be empty.` });
        return acc;
    }, {} as Record<string, z.ZodString>);

  return z.object({
     recipient: z.custom<Contact>((val) => val instanceof Object && '_id' in val && 'phone' in val, { // Use 'phone'
         message: "Please select a recipient.",
      }),
      template: z.custom<MessageTemplate>((val) => val instanceof Object && '_id' in val, {
          message: "Please select a template.",
      }),
      parameters: z.object(paramsSchema), // Parameters object schema
      scheduleEnabled: z.boolean().default(false),
      scheduledDate: z.date().optional(),
      scheduledTime: z.string().optional(), // HH:MM format
    }).refine(data => !data.scheduleEnabled || (data.scheduledDate && data.scheduledTime && /^\d{2}:\d{2}$/.test(data.scheduledTime)), {
        message: "Please select a valid date and time for scheduled messages.",
        path: ["scheduledTime"],
    }).refine(data => {
        if (data.scheduleEnabled && data.scheduledDate && data.scheduledTime) {
            try {
                const [hours, minutes] = data.scheduledTime.split(':').map(Number);
                const scheduledDateTime = new Date(data.scheduledDate);
                scheduledDateTime.setHours(hours, minutes, 0, 0);
                return scheduledDateTime > new Date();
            } catch { return false; }
        }
        return true;
    }, {
        message: "Scheduled time must be in the future.",
        path: ["scheduledTime"],
    });
};

// Define the type based on the schema creation function for use in the component
type DynamicTemplateMessageFormValues = z.infer<ReturnType<typeof createTemplateMessageSchema>>;


interface SendTemplateMessageFormProps {
  contacts: Contact[];
  templates: MessageTemplate[];
}

export function SendTemplateMessageForm({ contacts, templates }: SendTemplateMessageFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentParams, setCurrentParams] = React.useState<string[]>([]);
  // Initialize with an empty schema, it will be updated by useEffect
  const [currentSchema, setCurrentSchema] = React.useState(() => createTemplateMessageSchema([]));

  // Initialize form with the dynamic schema
  const form = useForm<DynamicTemplateMessageFormValues>({
    resolver: zodResolver(currentSchema), // Use the state variable for the schema
    defaultValues: {
      recipient: undefined,
      template: undefined,
      parameters: {}, // Default to empty object
      scheduleEnabled: false,
      scheduledDate: undefined,
      scheduledTime: "",
    },
  });

  const selectedTemplate = form.watch("template");
  const scheduleEnabled = form.watch("scheduleEnabled");

   // --- Effect to Update Schema and Reset Parameters ---
   React.useEffect(() => {
    const newParams = extractParams(selectedTemplate?.content);
    const needsUpdate = JSON.stringify(newParams) !== JSON.stringify(currentParams);

    if (needsUpdate) {
        setCurrentParams(newParams);
        const newSchema = createTemplateMessageSchema(newParams);
        setCurrentSchema(newSchema); // Update the schema state

        // Reset form with new schema and default parameters
        const currentValues = form.getValues();
        const defaultParams = newParams.reduce((acc, param) => ({ ...acc, [param]: '' }), {});

        form.reset(
            {
                // Keep existing values for non-parameter fields
                recipient: currentValues.recipient,
                template: currentValues.template,
                scheduleEnabled: currentValues.scheduleEnabled,
                scheduledDate: currentValues.scheduledDate,
                scheduledTime: currentValues.scheduledTime,
                parameters: defaultParams, // Reset parameters to defaults for the new template
            },
            {
                // keepStateOptions:
                keepDirty: false, // Mark the form as pristine after reset
                keepErrors: false, // Clear previous errors
                keepIsValid: false, // Re-evaluate validity based on new schema/values
                // keepValues: false // Don't keep old parameter values
            }
        );
         // Force re-validation after schema change and reset
         // Use setTimeout to ensure validation runs after state updates settle
         setTimeout(() => form.trigger(), 0);
    }
  }, [selectedTemplate, form, currentParams]); // Add currentParams dependency


   // --- Effect to Update Form Resolver ---
   React.useEffect(() => {
     // Update the resolver in the form instance when the schema changes
     form.reset(form.getValues(), {
       // keepStateOptions
       keepDirty: true, // Keep dirty state if user was editing
       keepErrors: true, // Keep existing errors unless corrected
       keepIsValid: false, // Need to re-evaluate validity
       keepValues: true, // Keep current field values
     });
     // @ts-ignore - Accessing internal RHF property to update resolver
     form.control.resolver = zodResolver(currentSchema);
      // Trigger validation after updating the resolver
      setTimeout(() => form.trigger(), 0);
   }, [currentSchema, form]);



  const onSubmit = async (values: DynamicTemplateMessageFormValues) => {
    setIsLoading(true);

    // Ensure template is selected (should be caught by validation, but good practice)
    if (!values.template) {
        toast({ variant: "destructive", title: "Error", description: "Please select a template." });
        setIsLoading(false);
        return;
    }

    // Pass the current parameter list needed by the template to the action
    const paramsForAction = extractParams(values.template.content);

    try {
        // Call the server action, passing form values and the expected param list
        const result = await handleSendTemplateMessage(values, paramsForAction);

        if (result.success) {
            toast({
                title: scheduleEnabled ? "Template Message Scheduled" : "Template Message Sent",
                description: result.message,
            });
            form.reset(); // Reset form
            setCurrentParams([]); // Reset local param state
             // Manually reset the schema to empty if needed after successful submission
            // setCurrentSchema(createTemplateMessageSchema([]));
        } else {
            // Handle validation or server errors from the action
            if (result.fieldErrors) {
                 Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                    // Handle potentially nested parameter errors (e.g., 'parameters.name')
                    const fieldName = field as keyof DynamicTemplateMessageFormValues | `parameters.${string}`;
                    if (messages && messages.length > 0) {
                        form.setError(fieldName as any, { // Use 'any' for dynamic field names
                            type: 'server',
                            message: messages[0],
                        });
                    }
                 });
                 toast({
                    variant: "destructive",
                    title: "Validation Error",
                    description: result.error || "Please check the form.",
                 });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} template message.`,
                });
            }
        }
    } catch (error) {
        console.error("Error submitting template message form:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "An unexpected error occurred. Please try again.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         <FormField
          control={form.control}
          name="recipient"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Recipient</FormLabel>
              <ContactSelector
                contacts={contacts}
                selected={field.value}
                onSelect={field.onChange}
                placeholder="Select a contact"
                disabled={isLoading}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="template"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Template</FormLabel>
              <TemplateSelector
                templates={templates}
                selected={field.value}
                onSelect={(template) => {
                    field.onChange(template); // Update RHF state
                }}
                placeholder="Select a template"
                disabled={isLoading}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dynamic Parameter Inputs - Render based on currentParams state */}
        {selectedTemplate && currentParams.length > 0 && (
            <div className="space-y-4 p-4 border rounded-md">
                 <FormLabel className="text-base font-medium">Fill Parameters</FormLabel>
                  <Alert variant="default" className="mb-4">
                      <AlertDescription>
                           <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-2 rounded">{selectedTemplate.content}</pre>
                      </AlertDescription>
                  </Alert>

                 {currentParams.map((paramName) => (
                      <FormField
                        key={paramName}
                        control={form.control}
                        // Use dot notation for nested parameter fields
                        name={`parameters.${paramName}`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Parameter: <code className="bg-muted px-1 rounded text-sm">{`{{${paramName}}}`}</code></FormLabel>
                                <FormControl>
                                <Input
                                    placeholder={`Enter value for ${paramName}`}
                                    {...field}
                                    value={field.value || ''} // Ensure controlled component
                                    disabled={isLoading}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                       />
                 ))}
            </div>
        )}
         {selectedTemplate && currentParams.length === 0 && (
             <Alert variant="default">
                  <AlertDescription>This template has no parameters to fill.</AlertDescription>
             </Alert>
         )}


        {/* Scheduling Section */}
        <FormField
          control={form.control}
          name="scheduleEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Schedule Template Message</FormLabel>
                <FormDescription>
                  Send this template message at a specific date and time.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {scheduleEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-md">
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                           date < new Date(new Date().setDate(new Date().getDate() - 1))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledTime"
               render={({ field }) => (
                 <FormItem className="flex flex-col">
                   <FormLabel>Time (24-hour format)</FormLabel>
                    <FormControl>
                       <Input
                         type="time"
                         {...field}
                         className="w-full"
                         disabled={isLoading}
                       />
                     </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
            />
          </div>
        )}

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading || !selectedTemplate}>
          {isLoading ? (scheduleEnabled ? 'Scheduling...' : 'Sending...') : (scheduleEnabled ? 'Schedule Template Message' : 'Send Template Message')}
        </Button>
      </form>
    </Form>
  );
}
