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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Contact } from "@/services/message-service"; // Use type import
import { handleSendPrivateMessage } from "@/actions/message-actions"; // Import the server action

// Helper for scheduled time validation
const scheduledTimeValidation = (data: { scheduleEnabled: boolean, scheduledDateTime?: Date }) => {
  if (!data.scheduleEnabled) return true; // Not scheduled, validation passes
  if (!data.scheduledDateTime) return false; // Scheduled but no date/time provided
  // Compare milliseconds since epoch to avoid timezone issues
  // Add a small buffer (e.g., 1 second)
  return data.scheduledDateTime.getTime() > (Date.now() - 1000);
};


// Schema now uses scheduledDateTime directly
const formSchema = z.object({
  // Allow recipient to be a Contact object or a valid phone number string
  recipient: z.union([
    z.custom<Contact>((val) => val instanceof Object && '_id' in val && 'name' in val && 'phone' in val && typeof val.phone === 'string', {
      message: "Invalid contact object.",
    }),
    z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."), // Basic international phone number regex
  ], { message: "Please select a valid recipient or enter a valid phone number." }),
  scheduleEnabled: z.boolean().default(false),
  content: z.string().min(1, { message: "Message content cannot be empty." }),
  scheduledDateTime: z.date().optional(), // Combined Date and Time object
}).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
  message: "Please select a valid date and time for scheduled messages.",
  path: ["scheduledDateTime"],
}).refine(scheduledTimeValidation, {
  message: "Scheduled time must be in the future.",
  path: ["scheduledDateTime"],
}); // Missing closing parenthesis and curly brace here

type PrivateMessageFormValues = z.infer<typeof formSchema>;

interface SendPrivateMessageFormProps {
  contacts: Contact[];
}

export function SendPrivateMessageForm({ contacts }: SendPrivateMessageFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  // Local state to manage date and time inputs separately
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = React.useState<string>(""); // HH:MM
  // State for the recipient input value and suggestions
  const [recipientInput, setRecipientInput] = React.useState("");
  const [openSuggestions, setOpenSuggestions] = React.useState(false);

  const form = useForm<PrivateMessageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: undefined,
      content: "",
      scheduleEnabled: false,
      scheduledDateTime: undefined, // Initialize as undefined
    },
  });

  // Filter contacts for suggestions
  const filteredContacts = React.useMemo(() => {
    if (!recipientInput) return [];
    const lowercasedInput = recipientInput.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(lowercasedInput) ||
      contact.phone.toLowerCase().includes(lowercasedInput)
    );
  }, [recipientInput, contacts]);

  // Update recipient input when a contact is selected via the form value
  React.useEffect(() => {
    const currentRecipient = form.getValues("recipient");
    if (currentRecipient && typeof currentRecipient !== 'string') setRecipientInput(currentRecipient.name || currentRecipient.phone || ""); // Use name for display if available
  }, [form.watch("recipient")]); // Watch for changes in the form's recipient value

  const scheduleEnabled = form.watch("scheduleEnabled");

  // Effect to combine date and time into scheduledDateTime for the form
  React.useEffect(() => {
    if (scheduleEnabled && selectedDate && selectedTime) {
      try {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const combinedDateTime = new Date(selectedDate);
        combinedDateTime.setHours(hours, minutes, 0, 0);
        // Only update if the value is different to prevent infinite loops
        if (form.getValues("scheduledDateTime")?.getTime() !== combinedDateTime.getTime()) {
          form.setValue("scheduledDateTime", combinedDateTime, { shouldValidate: true });
        }
      } catch (e) {
        console.error("Error combining date/time:", e);
        // Clear the combined value if inputs are invalid
        if (form.getValues("scheduledDateTime") !== undefined) {
          form.setValue("scheduledDateTime", undefined, { shouldValidate: true });
        }
      }
    } else if (!scheduleEnabled) {
      // Clear scheduledDateTime if scheduling is disabled
      if (form.getValues("scheduledDateTime") !== undefined) {
        form.setValue("scheduledDateTime", undefined, { shouldValidate: true });
      }
    }
  }, [selectedDate, selectedTime, scheduleEnabled, form]);

  // Effect to clear local date/time state when schedule is disabled or form resets
  React.useEffect(() => {
    if (!scheduleEnabled) {
      setSelectedDate(undefined);
      setSelectedTime("");
    }
  }, [scheduleEnabled]);

  const onSubmit = async (values: PrivateMessageFormValues) => {
    setIsLoading(true);
    // The 'values' object now correctly contains scheduledDateTime if enabled

    let recipientPhone: string;
    let recipientName: string | undefined = undefined;

    if (typeof values.recipient !== 'string') {
      // It's a Contact object
      recipientPhone = values.recipient.phone;
      recipientName = values.recipient.name;
    } else {
      recipientPhone = values.recipient; // It's a phone number string
    }
    try {
      // Call the server action directly with the form values
      const result = await handleSendPrivateMessage(values);

      if (result.success) {
        toast({
          title: scheduleEnabled ? "Message Scheduled" : "Message Sent",
          description: result.message, // Use message from action result
        });
        form.reset(); // Reset form on success
        // Clear local state as well
        setSelectedDate(undefined);
        setSelectedTime("");
      } else {
        // Handle validation or server errors from the action
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              // Map scheduledDateTime error back to date/time fields if needed for UI,
              // or just show a general error. For simplicity, let's map it back.
              if (field === 'scheduledDateTime') {
                form.setError('scheduledDateTime', { type: 'server', message: messages[0] });
                // Optionally set errors on date/time inputs too?
                // form.setError('scheduledDate', { type: 'server', message: messages[0] });
                // form.setError('scheduledTime', { type: 'server', message: messages[0] });
              } else {
                form.setError(field as keyof PrivateMessageFormValues, {
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
            description: result.error || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} message.`,
          });
        }
      }
    } catch (error) {
      // Handle unexpected errors during action call
      console.error("Error submitting private message form:", error);
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
        {/* Add a hidden input for the actual form value */}
        <input type="hidden" {...form.register("recipient")} />

        {/* Use a separate FormField for the visual input and suggestions */}
        <FormField
          control={form.control}
          name="recipient"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Recipient (Start typing name or phone number)</FormLabel>
              <Command shouldFilter={false}> {/* Disable built-in filtering */}
                <CommandInput
                  placeholder="Search contacts..."
                  value={recipientInput}
                  onValueChange={(value) => {
                    setRecipientInput(value);
                    setOpenSuggestions(true); // Open suggestions when typing
                  }}
                  disabled={isLoading}
                />
                <CommandList> {/* moved closing tag here */}
                  {openSuggestions && filteredContacts.length > 0 && (
                    <CommandGroup heading="Suggestions">
                      {filteredContacts.map((contact) => (
                        <CommandItem
                          key={contact._id?.toString()}
                          value={contact.name || contact.phone} // Value for selection
                          onSelect={() => {
                            form.setValue("recipient", contact, { shouldValidate: true });
                            setRecipientInput(contact.name || contact.phone || ""); // Update input display
                            setOpenSuggestions(false);
                          }}
                        >
                          {contact.name} ({contact.phone})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {openSuggestions && filteredContacts.length === 0 && recipientInput && (
                    <CommandEmpty>No contacts found.</CommandEmpty>
                  )}
                </CommandList>
              </Command>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Type your message here..."
                  className="min-h-[120px]"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                <FormLabel>Schedule Message</FormLabel>
                <FormDescription>
                  Send this message at a specific date and time.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {scheduleEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-md relative">
            {/* Date Input (uses local state) */}
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
                      disabled={isLoading}
                    >
                      {selectedDate ? (
                        format(selectedDate, "PPP")
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
                    selected={selectedDate}
                    onSelect={setSelectedDate} // Update local state
                    disabled={(date) =>
                      date < new Date(new Date().setDate(new Date().getDate() - 1)) // Disable past dates
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {/* Display validation error for scheduledDateTime if it exists */}
              <FormMessage>{form.formState.errors.scheduledDateTime?.message}</FormMessage>
            </FormItem>

            {/* Time Input (uses local state) */}
            <FormItem className="flex flex-col">
              <FormLabel>Time (24-hour format)</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)} // Update local state
                  className="w-full"
                  disabled={isLoading}
                />
              </FormControl>
              {/* Optionally link time error message to scheduledDateTime too */}
              {/* <FormMessage>{form.formState.errors.scheduledDateTime?.message}</FormMessage> */}
            </FormItem>

            {/* Hidden Field for RHF validation (optional, can rely on effect) */}
            {/* <FormField
                control={form.control}
                name="scheduledDateTime"
                render={({ field }) => <input type="hidden" {...field} />}
             /> */}
          </div>
        )}

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          {isLoading ? (scheduleEnabled ? 'Scheduling...' : 'Sending...') : (scheduleEnabled ? 'Schedule Message' : 'Send Message')}
        </Button>
      </form>
    </Form>
  );
}
