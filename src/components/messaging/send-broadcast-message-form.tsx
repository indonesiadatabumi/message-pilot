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
import { ContactSelector } from "./contact-selector";
import type { Contact } from "@/services/message-service"; // Use type import
import { handleSendBroadcastMessage } from "@/actions/message-actions"; // Import the server action

// Helper for scheduled time validation
const scheduledTimeValidation = (data: { scheduleEnabled: boolean, scheduledDateTime?: Date }) => {
  if (!data.scheduleEnabled) return true;
  if (!data.scheduledDateTime) return false;
  return data.scheduledDateTime.getTime() > (Date.now() - 1000);
};

// Schema now uses scheduledDateTime directly
const formSchema = z.object({
  recipients: z.array(z.custom<Contact>((val): val is Contact => val instanceof Object && '_id' in val && 'phone' in val)).min(1, { message: "Please select at least one recipient." }),
  content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, { message: "Message too long." }),
  scheduleEnabled: z.boolean().default(false),
  scheduledDateTime: z.date().optional(), // Combined Date and Time object
}).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
  message: "Please select a valid date and time for scheduled messages.",
  path: ["scheduledDateTime"],
}).refine(scheduledTimeValidation, {
  message: "Scheduled time must be in the future.",
  path: ["scheduledDateTime"],
});


type BroadcastMessageFormValues = z.infer<typeof formSchema>;

interface SendBroadcastMessageFormProps {
  contacts: Contact[];
}

export function SendBroadcastMessageForm({ contacts }: SendBroadcastMessageFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  // Local state for date and time inputs
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = React.useState<string>(""); // HH:MM

  const form = useForm<BroadcastMessageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: [],
      content: "",
      scheduleEnabled: false,
      scheduledDateTime: undefined,
    },
  });

  const scheduleEnabled = form.watch("scheduleEnabled");

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


  const onSubmit = async (values: BroadcastMessageFormValues) => {
    setIsLoading(true);
    console.log("Submitting broadcast values:", values);

    try {
      // Call the server action
      const result = await handleSendBroadcastMessage(values);

      if (result.success) {
        toast({
          title: scheduleEnabled ? "Broadcast Scheduled" : "Broadcast Sent",
          description: result.message, // Use message from action result
        });
        form.reset(); // Reset form on success
        setSelectedDate(undefined);
        setSelectedTime("");
      } else {
        // Handle validation or server errors from the action
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              if (field === 'scheduledDateTime') {
                form.setError('scheduledDateTime', { type: 'server', message: messages[0] });
              } else {
                // Handle other potential field errors (like 'recipients' or 'content')
                form.setError(field as keyof BroadcastMessageFormValues, {
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
            description: result.error || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} broadcast.`,
          });
        }
      }
    } catch (error) {
      console.error("Error submitting broadcast message form:", error);
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
          name="recipients"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Recipients</FormLabel>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAllRecipients"
                  checked={field.value.length === contacts.length && contacts.length > 0}
                  onCheckedChange={(checked) => {
                    field.onChange(checked ? contacts : []);
                  }}
                />
                <label htmlFor="selectAllRecipients" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Select All</label>
              </div>
              <ContactSelector
                contacts={contacts}
                selected={field.value}
                onSelect={field.onChange}
                placeholder="Select contacts"
                multiple // Enable multiple selection
                disabled={isLoading}
              />
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
                  placeholder="Type your broadcast message here..."
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
                <FormLabel>Schedule Broadcast</FormLabel>
                <FormDescription>
                  Send this message to the selected contacts at a specific date and time.
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
                      disabled={isLoading}
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
                  disabled={isLoading}
                />
              </FormControl>
              {/* <FormMessage>{form.formState.errors.scheduledDateTime?.message}</FormMessage> */}
            </FormItem>
          </div>
        )}


        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          {isLoading ? (scheduleEnabled ? 'Scheduling...' : 'Sending...') : (scheduleEnabled ? 'Schedule Broadcast' : 'Send Broadcast')}
        </Button>
      </form>
    </Form>
  );
}
