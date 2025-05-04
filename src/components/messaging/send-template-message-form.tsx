
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form"; // Import useFieldArray
import * as z from "zod";
import { CalendarIcon, Trash2, Upload } from "lucide-react"; // Added Upload icon
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
import { handleSendBulkTemplateMessage } from "@/actions/message-actions"; // Update action import
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"; // For styling recipient sections
import { extractParams } from "@/lib/template-utils"; // Import from new utility file

// Helper for scheduled time validation
const scheduledTimeValidation = (data: { scheduleEnabled: boolean, scheduledDateTime?: Date }) => {
  if (!data.scheduleEnabled) return true;
  if (!data.scheduledDateTime) return false;
  return data.scheduledDateTime.getTime() > (Date.now() - 5000); // Allow 5 sec buffer
};


// Define the schema for a single recipient's data entry
const createRecipientParamsSchema = (params: string[]) => {
  const paramsSchema = params.reduce((acc, paramName) => {
    // Use z.string() which defaults to required, add .optional() if needed
    acc[paramName] = z.string().min(1, { message: `Required.` });
    return acc;
  }, {} as Record<string, z.ZodString>);

  return z.object({
    recipient: z.custom<Contact>((val): val is Contact => val instanceof Object && '_id' in val && 'phone' in val),
    parameters: z.object(paramsSchema)
  });
};


// Define the main form schema using the recipient params schema within an array
const createBulkTemplateMessageSchema = (params: string[]) => {
  return z.object({
    template: z.custom<MessageTemplate>((val): val is MessageTemplate => val instanceof Object && '_id' in val, {
      message: "Please select a template.",
    }),
    // Array to hold data for each selected recipient
    recipientsData: z.array(createRecipientParamsSchema(params))
      .min(1, { message: "Please add at least one recipient and fill their parameters." }),
    scheduleEnabled: z.boolean().default(false),
    scheduledDateTime: z.date().optional(), // Combined Date and Time object
  }).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
    message: "Please select a valid date and time for scheduled messages.",
    path: ["scheduledDateTime"],
  }).refine(scheduledTimeValidation, {
    message: "Scheduled time must be in the future.",
    path: ["scheduledDateTime"],
  });
};

// Update the form component type placeholder
type DynamicBulkTemplateMessageFormValues = z.infer<ReturnType<typeof createBulkTemplateMessageSchema>>;


interface SendTemplateMessageFormProps {
  contacts: Contact[];
  templates: MessageTemplate[];
}

export function SendTemplateMessageForm({ contacts, templates }: SendTemplateMessageFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);
  const [currentParams, setCurrentParams] = React.useState<string[]>([]);
  // State to hold the list of contacts selected in the ContactSelector
  const [selectedContacts, setSelectedContacts] = React.useState<Contact[]>([]);
  // Initialize with an empty schema, it will be updated by useEffect
  const [currentSchema, setCurrentSchema] = React.useState(() => createBulkTemplateMessageSchema([]));
  // Local state for date and time inputs
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = React.useState<string>(""); // HH:MM
  const fileInputRef = React.useRef<HTMLInputElement>(null); // Ref for file input

  // Initialize form with the dynamic schema
  const form = useForm<DynamicBulkTemplateMessageFormValues>({
    resolver: zodResolver(currentSchema), // Use the state variable for the schema
    defaultValues: {
      template: undefined,
      recipientsData: [], // Initialize as empty array
      scheduleEnabled: false,
      scheduledDateTime: undefined,
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({
    control: form.control,
    name: "recipientsData",
    keyName: "fieldId" // Use a different key name than default 'id' to avoid potential conflicts
  });

  const selectedTemplate = form.watch("template");
  const scheduleEnabled = form.watch("scheduleEnabled");

  // --- Effect to Update Schema and Reset Parameters When Template Changes ---
  React.useEffect(() => {
    const newParams = extractParams(selectedTemplate?.content);
    // Check if params actually changed
    if (JSON.stringify(newParams) !== JSON.stringify(currentParams)) {
      console.log("Template changed, updating params and schema:", newParams);
      setCurrentParams(newParams);
      const newSchema = createBulkTemplateMessageSchema(newParams);
      setCurrentSchema(newSchema); // Update the schema state

      // Update parameters for existing fields in useFieldArray
      const defaultParams = newParams.reduce((acc, param) => ({ ...acc, [param]: '' }), {});
      fields.forEach((field, index) => {
        update(index, {
          recipient: field.recipient, // Keep existing recipient
          parameters: defaultParams, // Reset parameters based on new template
        });
      });

      // Reset selected contacts and recipientsData if template params change significantly
      setSelectedContacts([]);
      replace([]); // Clear the field array

      // Trigger validation after parameters are potentially reset
      setTimeout(() => form.trigger("recipientsData"), 0);
    }
  }, [selectedTemplate, form, currentParams, fields, update, replace]); // Added replace dependency


  // --- Effect to Update Form Resolver ---
  React.useEffect(() => {
    // Update the resolver in the form instance when the schema changes
    // @ts-ignore - Accessing internal RHF property to update resolver
    form.control.resolver = zodResolver(currentSchema);
    // Trigger validation after updating the resolver, focusing on recipientsData
    setTimeout(() => form.trigger("recipientsData"), 0);
  }, [currentSchema, form]);


  // --- Effect to Sync ContactSelector with useFieldArray ---
  React.useEffect(() => {
    // This effect now only reacts to changes initiated by the file import
    // Manual selection/deselection via ContactSelector directly updates selectedContacts state
    // which then updates the field array through another effect (or directly if preferred).
    // Let's simplify: we'll manage the field array based *only* on selectedContacts state.

    const currentRecipientIds = new Set(fields.map(f => f.recipient._id?.toString()));
    const selectedRecipientIds = new Set(selectedContacts.map(c => c._id?.toString()));

    const defaultParams = currentParams.reduce((acc, param) => ({ ...acc, [param]: '' }), {});

    // Add new selections to the field array
    selectedContacts.forEach(contact => {
      if (contact._id && !currentRecipientIds.has(contact._id.toString())) {
        console.log("Appending recipient from selectedContacts:", contact.name);
        append({ recipient: contact, parameters: defaultParams });
      }
    });

    // Remove deselections from the field array
    const indicesToRemove: number[] = [];
    fields.forEach((field, index) => {
      if (field.recipient._id && !selectedRecipientIds.has(field.recipient._id.toString())) {
        indicesToRemove.push(index);
      }
    });
    indicesToRemove.reverse().forEach(index => {
      console.log("Removing recipient based on selectedContacts:", fields[index].recipient.name);
      remove(index);
    });

  }, [selectedContacts, fields, append, remove, currentParams]); // Depend on selectedContacts and field array


  // Effect to combine date and time into scheduledDateTime
  React.useEffect(() => {
    if (scheduleEnabled && selectedDate && selectedTime) {
      try {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const combinedDateTime = new Date(selectedDate);
        combinedDateTime.setHours(hours, minutes, 0, 0);
        if (form.getValues("scheduledDateTime")?.getTime() !== combinedDateTime.getTime()) {
          form.setValue("scheduledDateTime", combinedDateTime, { shouldValidate: true });
        }
      } catch (e) {
        console.error("Error combining date/time:", e);
        if (form.getValues("scheduledDateTime") !== undefined) {
          form.setValue("scheduledDateTime", undefined, { shouldValidate: true });
        }
      }
    } else if (!scheduleEnabled) {
      if (form.getValues("scheduledDateTime") !== undefined) {
        form.setValue("scheduledDateTime", undefined, { shouldValidate: true });
      }
    }
  }, [selectedDate, selectedTime, scheduleEnabled, form]);

  // Effect to clear local date/time state
  React.useEffect(() => {
    if (!scheduleEnabled) {
      setSelectedDate(undefined);
      setSelectedTime("");
    }
  }, [scheduleEnabled]);


  // --- CSV Import Logic ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTemplate) {
      toast({ variant: "destructive", title: "Error", description: "Please select a template before importing." });
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a CSV file." });
      return;
    }

    setIsParsing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ variant: "destructive", title: "Error", description: "Could not read file content." });
        setIsParsing(false);
        return;
      }

      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== ''); // Split lines and remove empty ones
        if (lines.length < 2) {
          throw new Error("CSV must contain at least a header row and one data row.");
        }

        // Parse header, converting to lower case for case-insensitive matching
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const phoneHeaderIndex = headers.indexOf('phone');
        if (phoneHeaderIndex === -1) {
          throw new Error("CSV must contain a 'phone' column.");
        }

        const templateParams = extractParams(selectedTemplate.content);
        const paramIndices: { [key: string]: number } = {};
        const missingParams: string[] = [];

        // Find indices for required template parameters in the CSV header
        templateParams.forEach(param => {
          const index = headers.indexOf(param.toLowerCase());
          if (index === -1) {
            missingParams.push(param);
          } else {
            paramIndices[param] = index;
          }
        });

        if (missingParams.length > 0) {
          throw new Error(`CSV is missing required columns for parameters: ${missingParams.join(', ')}`);
        }

        const importedRecipientsData: DynamicBulkTemplateMessageFormValues['recipientsData'] = [];
        const importedContacts: Contact[] = [];
        const errors: string[] = [];

        // Process data rows
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const phone = values[phoneHeaderIndex]?.trim();

          if (!phone) {
            errors.push(`Row ${i + 1}: Missing phone number.`);
            continue;
          }

          // Find contact object using phone number
          const contact = contacts.find(c => c.phone === phone);
          if (!contact) {
            errors.push(`Row ${i + 1}: Contact with phone ${phone} not found.`);
            continue;
          }

          // Extract parameters for this contact
          const parameters: { [key: string]: string } = {};
          let rowHasMissingParamValue = false;
          templateParams.forEach(param => {
            const value = values[paramIndices[param]]?.trim();
            if (!value) {
              rowHasMissingParamValue = true;
              errors.push(`Row ${i + 1} (Phone: ${phone}): Missing value for parameter '{{${param}}}'.`);
            }
            parameters[param] = value || ''; // Assign empty string if missing, error already logged
          });

          // Only add if no essential data is missing (phone found, no missing param values for this row)
          if (contact && !rowHasMissingParamValue) {
            importedRecipientsData.push({ recipient: contact, parameters });
            importedContacts.push(contact);
          }
        } // End row processing loop


        if (errors.length > 0) {
          // Show errors, but still proceed with successfully parsed rows if any
          toast({
            variant: "destructive",
            title: `Import Errors (${errors.length})`,
            description: (
              <div className="max-h-40 overflow-y-auto">
                <ul className="list-disc pl-5">
                  {errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {errors.length > 5 && <li>... and {errors.length - 5} more errors.</li>}
                </ul>
              </div>
            ),
            duration: 10000 // Longer duration for errors
          });
        }

        if (importedRecipientsData.length > 0) {
          // Replace the entire field array with imported data
          replace(importedRecipientsData);
          // Update the ContactSelector state
          setSelectedContacts(importedContacts);
          toast({
            title: "Import Successful",
            description: `Imported data for ${importedRecipientsData.length} recipients. Please review the parameters.`
          });
        } else if (errors.length === 0) {
          toast({
            variant: "default",
            title: "Import Warning",
            description: "No valid recipient data found in the CSV."
          });
        }


      } catch (error: any) {
        console.error("Error parsing CSV:", error);
        toast({ variant: "destructive", title: "Import Failed", description: error.message });
        replace([]); // Clear fields on error
        setSelectedContacts([]);
      } finally {
        setIsParsing(false);
        // Reset file input value so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to read the file." });
      setIsParsing(false);
    };

    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    if (!selectedTemplate) {
      toast({ variant: "destructive", title: "Select Template First", description: "Please choose a template before importing recipient data." });
      return;
    }
    fileInputRef.current?.click();
  };
  // --- End CSV Import Logic ---


  const onSubmit = async (values: DynamicBulkTemplateMessageFormValues) => {
    setIsLoading(true);
    console.log("Submitting bulk template values:", values);

    // Ensure template is selected (should be caught by validation)
    if (!values.template) {
      toast({ variant: "destructive", title: "Error", description: "Please select a template." });
      setIsLoading(false);
      return;
    }

    // Ensure recipientsData is not empty (should be caught by validation)
    if (!values.recipientsData || values.recipientsData.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least one recipient and fill their parameters." });
      setIsLoading(false);
      return;
    }


    try {
      // Call the updated server action for bulk sending/scheduling
      const result = await handleSendBulkTemplateMessage(values);

      if (result.success) {
        toast({
          title: scheduleEnabled ? "Bulk Template Messages Scheduled" : "Bulk Template Messages Sent",
          description: result.message,
        });
        form.reset(); // Reset form
        setCurrentParams([]); // Reset local param state
        setSelectedContacts([]); // Clear selected contacts UI
        replace([]); // Clear field array
        setSelectedDate(undefined);
        setSelectedTime("");
        // Reset the field array manually if reset doesn't clear it
        // remove(); // Removes all fields
      } else {
        // Handle validation or server errors from the action
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            // Handle nested errors like 'recipientsData.0.parameters.name'
            const fieldName = field as keyof DynamicBulkTemplateMessageFormValues | `recipientsData.${number}.${string}` | `recipientsData.${number}.parameters.${string}`;
            if (messages && messages.length > 0) {
              if (field === 'scheduledDateTime') {
                form.setError('scheduledDateTime', { type: 'server', message: messages[0] });
              } else {
                form.setError(fieldName as any, { // Use 'any' for dynamic field names
                  type: 'server',
                  message: messages[0],
                });
              }
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
            description: result.error || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} bulk template messages.`,
          });
        }
      }
    } catch (error) {
      console.error("Error submitting bulk template message form:", error);
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
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  disabled={isLoading || isParsing}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact Selector (Multiple) */}
          <FormItem className="flex flex-col">
            <div className="flex justify-between items-center">
              <FormLabel>Recipients</FormLabel>
              {/* Import Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerFileInput}
                disabled={isLoading || isParsing || !selectedTemplate}
                title={!selectedTemplate ? "Select a template first" : "Import recipients & parameters from CSV"}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isParsing ? "Parsing..." : "Import CSV"}
              </Button>
            </div>
            <ContactSelector
              contacts={contacts}
              selected={selectedContacts} // Use local state for the selector UI
              onSelect={(selection) => {
                // Update local state for ContactSelector
                const newSelection = Array.isArray(selection) ? selection : (selection ? [selection] : []);
                setSelectedContacts(newSelection);
                // Let the useEffect handle syncing with useFieldArray
              }}
              placeholder="Select contacts manually or import"
              multiple
              disabled={isLoading || isParsing || !selectedTemplate} // Disable if no template selected
            />
            <FormMessage>{form.formState.errors.recipientsData?.message}</FormMessage>
            <FormDescription>
              Select contacts manually or import a CSV. Required CSV columns: 'phone'{currentParams.length > 0 ? `, ${currentParams.join(', ')}` : ''}.
            </FormDescription>
          </FormItem>
        </div>


        {/* Display template content preview */}
        {selectedTemplate && (
          <Alert variant="default">
            <AlertDescription>
              <span className="font-semibold">Template Preview:</span>
              <pre className="mt-1 text-xs whitespace-pre-wrap font-mono bg-muted p-2 rounded">{selectedTemplate.content}</pre>
              {currentParams.length === 0 && <p className="mt-1 text-xs text-muted-foreground">This template has no parameters.</p>}
              {currentParams.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Parameters: {currentParams.map(p => `{{${p}}}`).join(', ')}</p>}
            </AlertDescription>
          </Alert>
        )}

        {/* Dynamic Parameter Inputs per Recipient */}
        {fields.length > 0 && (
          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2"> {/* Added scroll */}
            <h3 className="text-lg font-medium text-foreground sticky top-0 bg-background py-1 z-10">Fill Parameters for Recipients ({fields.length})</h3> {/* Added count and sticky */}
            {fields.map((field, index) => (
              <Card key={field.fieldId} className="relative"> {/* Use fieldId for key */}
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">
                    {field.recipient.name} ({field.recipient.phone})
                  </CardTitle>
                  {/* Remove button via ContactSelector is preferred now */}
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentParams.length === 0 && <p className="text-sm text-muted-foreground">No parameters required for this template.</p>}
                  {currentParams.map((paramName) => (
                    <FormField
                      key={`${field.fieldId}-${paramName}`}
                      control={form.control}
                      name={`recipientsData.${index}.parameters.${paramName}`}
                      render={({ field: paramField }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Parameter: <code className="bg-muted px-1 rounded text-sm font-mono">{`{{${paramName}}}`}</code>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`Enter value for ${paramName}`}
                              {...paramField}
                              disabled={isLoading || isParsing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  {/* Display root error for this recipient item if exists */}
                  {form.formState.errors.recipientsData?.[index]?.root && (
                    <FormMessage>{form.formState.errors.recipientsData[index]?.root?.message}</FormMessage>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Message when recipients are selected but template has no params */}
        {fields.length > 0 && currentParams.length === 0 && selectedTemplate && (
          <Alert variant="default">
            <AlertDescription>This template has no parameters to fill for the selected recipients.</AlertDescription>
          </Alert>
        )}
        {/* Placeholder when no recipients are added */}
        {fields.length === 0 && selectedTemplate && (
          <Alert variant="outline">
            <AlertDescription>Please select recipients manually or import a CSV file.</AlertDescription>
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
                  disabled={isLoading || isParsing}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Schedule Messages</FormLabel>
                <FormDescription>
                  Send these template messages at a specific date and time.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {scheduleEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-md relative">
            {/* Date Input */}
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      disabled={isLoading || isParsing}
                    >
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage>{form.formState.errors.scheduledDateTime?.message}</FormMessage>
            </FormItem>

            {/* Time Input */}
            <FormItem className="flex flex-col">
              <FormLabel>Time (24-hour format)</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full"
                  disabled={isLoading || isParsing}
                />
              </FormControl>
              {/* <FormMessage>{form.formState.errors.scheduledDateTime?.message}</FormMessage> */}
            </FormItem>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={isLoading || isParsing || !selectedTemplate || fields.length === 0} // Disable if no template or no recipients
        >
          {isLoading ? (scheduleEnabled ? 'Scheduling...' : 'Sending...') : (scheduleEnabled ? `Schedule ${fields.length} Message(s)` : `Send ${fields.length} Message(s)`)}
        </Button>
      </form>
    </Form>
  );
}
