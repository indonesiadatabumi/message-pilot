"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Alert, AlertDescription } from "@/components/ui/alert"; // For showing template preview
import { Contact, MessageTemplate, sendTemplateMessage, scheduleMessage } from "@/services/message-service";

// Helper to extract parameters from template content (e.g., {{name}})
const extractParams = (content: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g;
  const params = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    params.add(match[1].trim());
  }
  return Array.from(params);
};


// Dynamically create schema based on selected template
const createTemplateSchema = (params: string[]) => {
   const paramsSchema = params.reduce((acc, paramName) => {
        // Sanitize paramName if necessary, e.g., replace spaces or special chars if needed for JS keys
        // const safeParamName = paramName.replace(/[^a-zA-Z0-9_]/g, '_');
        acc[paramName] = z.string().min(1, { message: `Parameter '{{${paramName}}}' cannot be empty.` });
        return acc;
    }, {} as Record<string, z.ZodString>);


  return z.object({
    // Recipient can be single or multiple based on a switch/mode, start with single
     recipient: z.custom<Contact>((val) => val instanceof Object && 'id' in val, { // Simplified check
         message: "Please select a recipient.",
      }),
     // recipients: z.array(z.custom<Contact>()).min(1, { message: "Please select at least one recipient."}), // For multi-select later
      template: z.custom<MessageTemplate>((val) => val instanceof Object && 'id' in val, {
          message: "Please select a template.",
      }),
      parameters: z.object(paramsSchema),
      scheduleEnabled: z.boolean().default(false),
      scheduledDate: z.date().optional(),
      scheduledTime: z.string().optional(),
    }).refine(data => {
        if (data.scheduleEnabled) {
        return data.scheduledDate && data.scheduledTime && /^\d{2}:\d{2}$/.test(data.scheduledTime);
        }
        return true;
    }, {
        message: "Please select a valid date and time for scheduled messages.",
        path: ["scheduledTime"],
    }).refine(data => {
        if (data.scheduleEnabled && data.scheduledDate && data.scheduledTime) {
            try {
                const [hours, minutes] = data.scheduledTime.split(':').map(Number);
                const scheduledDateTime = new Date(data.scheduledDate);
                scheduledDateTime.setHours(hours, minutes, 0, 0);
                return scheduledDateTime > new Date();
            } catch (e) { return false; }
        }
        return true;
    }, {
        message: "Scheduled time must be in the future.",
        path: ["scheduledTime"],
    });
};


interface SendTemplateMessageFormProps {
  contacts: Contact[];
  templates: MessageTemplate[];
}

export function SendTemplateMessageForm({ contacts, templates }: SendTemplateMessageFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentParams, setCurrentParams] = React.useState<string[]>([]);
  const [currentSchema, setCurrentSchema] = React.useState(() => createTemplateSchema([])); // Initial empty schema


  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      recipient: undefined,
      template: undefined,
      parameters: {},
      scheduleEnabled: false,
      scheduledDate: undefined,
      scheduledTime: "",
    },
  });

  const selectedTemplate = form.watch("template");
  const scheduleEnabled = form.watch("scheduleEnabled");

   // Update schema and params when template changes
   React.useEffect(() => {
    const newParams = selectedTemplate ? extractParams(selectedTemplate.content) : [];
    setCurrentParams(newParams);
    const newSchema = createTemplateSchema(newParams);
    setCurrentSchema(newSchema);

    // Reset parameters field but keep others
    const currentValues = form.getValues();
    const defaultParams = newParams.reduce((acc, param) => ({ ...acc, [param]: '' }), {});

    form.reset({
        ...currentValues,
        parameters: defaultParams, // Reset only parameters
    }, { keepDirty: false, keepErrors: false, keepValues: true }); // Keep other fields

  }, [selectedTemplate, form]);

    // Re-validate when schema changes
    React.useEffect(() => {
        form.trigger();
    }, [currentSchema, form]);



  const onSubmit = async (values: z.infer<typeof currentSchema>) => {
    setIsLoading(true);
    const { recipient, template, parameters, scheduleEnabled, scheduledDate, scheduledTime } = values;

    try {
        const messageDetails = {
            recipient: recipient.phoneNumber, // Assuming service needs phone number
            template: template,
            params: parameters,
        };

       if (scheduleEnabled && scheduledDate && scheduledTime) {
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            const scheduledDateTime = new Date(scheduledDate);
            scheduledDateTime.setHours(hours, minutes, 0, 0);

            // Currently scheduleMessage might not support templates/params directly.
            // We might need to render the template content first.
            let filledContent = template.content;
            Object.entries(parameters).forEach(([key, value]) => {
                filledContent = filledContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
            });

            await scheduleMessage({
                 recipient: recipient.phoneNumber,
                 content: filledContent, // Send filled content
                 scheduledTime: scheduledDateTime,
            });

            toast({
                title: "Template Message Scheduled",
                description: `Your message using template "${template.name}" to ${recipient.name} is scheduled for ${format(scheduledDateTime, "PPP p")}.`,
             });

       } else {
           await sendTemplateMessage(messageDetails.recipient, messageDetails.template, messageDetails.params);
           toast({
             title: "Template Message Sent",
             description: `Your message using template "${template.name}" has been sent to ${recipient.name}.`,
           });
       }
       form.reset(); // Reset form on success
       setCurrentParams([]); // Clear params state as well
    } catch (error) {
       console.error("Failed to send/schedule template message:", error);
       toast({
         variant: "destructive",
         title: "Error",
         description: `Failed to ${scheduleEnabled ? 'schedule' : 'send'} template message. Please try again.`,
       });
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Recipient Selector (Single for now) */}
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

        {/* Template Selector */}
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

        {/* Dynamic Parameter Inputs */}
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
                        // Use Controller for dynamically nested field names
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
