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
import { Input } from "@/components/ui/input"; // For time input
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ContactSelector } from "./contact-selector";
import { Contact, sendPrivateMessage, scheduleMessage } from "@/services/message-service";

const formSchema = z.object({
  recipient: z.custom<Contact>((val) => val instanceof Object && 'id' in val && 'name' in val && 'phoneNumber' in val, {
    message: "Please select a recipient.",
  }),
  content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, {message: "Message too long."}),
  scheduleEnabled: z.boolean().default(false),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(), // Store time as HH:MM string
}).refine(data => {
    // If schedule is enabled, date and time must be provided
    if (data.scheduleEnabled) {
      return data.scheduledDate && data.scheduledTime && /^\d{2}:\d{2}$/.test(data.scheduledTime);
    }
    return true;
}, {
    message: "Please select a valid date and time for scheduled messages.",
    path: ["scheduledTime"], // Point error to time field, but applies if date is missing too
}).refine(data => {
    // If schedule is enabled, ensure the combined date and time is in the future
     if (data.scheduleEnabled && data.scheduledDate && data.scheduledTime) {
        try {
            const [hours, minutes] = data.scheduledTime.split(':').map(Number);
            const scheduledDateTime = new Date(data.scheduledDate);
            scheduledDateTime.setHours(hours, minutes, 0, 0); // Set H, M, S, MS
            return scheduledDateTime > new Date(); // Check if schedule time is in the future
        } catch (e) { return false; } // Invalid time format etc.
     }
     return true;
}, {
    message: "Scheduled time must be in the future.",
    path: ["scheduledTime"],
});


type PrivateMessageFormValues = z.infer<typeof formSchema>;

interface SendPrivateMessageFormProps {
  contacts: Contact[];
}

export function SendPrivateMessageForm({ contacts }: SendPrivateMessageFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<PrivateMessageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: undefined,
      content: "",
      scheduleEnabled: false,
      scheduledDate: undefined,
      scheduledTime: "",
    },
  });

   const scheduleEnabled = form.watch("scheduleEnabled");

  const onSubmit = async (values: PrivateMessageFormValues) => {
    setIsLoading(true);
    const { recipient, content, scheduleEnabled, scheduledDate, scheduledTime } = values;

    try {
       if (scheduleEnabled && scheduledDate && scheduledTime) {
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            const scheduledDateTime = new Date(scheduledDate);
            scheduledDateTime.setHours(hours, minutes, 0, 0);

            await scheduleMessage({
                 recipient: recipient.phoneNumber, // Assuming service takes phone number
                 content: content,
                 scheduledTime: scheduledDateTime,
            });
            toast({
                title: "Message Scheduled",
                description: `Your message to ${recipient.name} is scheduled for ${format(scheduledDateTime, "PPP p")}.`,
             });

       } else {
           await sendPrivateMessage(recipient.phoneNumber, content); // Assuming service takes phone number
           toast({
             title: "Message Sent",
             description: `Your message has been sent to ${recipient.name}.`,
           });
       }
       form.reset(); // Reset form on success
    } catch (error) {
       console.error("Failed to send/schedule message:", error);
       toast({
         variant: "destructive",
         title: "Error",
         description: `Failed to ${scheduleEnabled ? 'schedule' : 'send'} message. Please try again.`,
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
                          date < new Date(new Date().setDate(new Date().getDate() - 1)) // Disable past dates
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

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          {isLoading ? (scheduleEnabled ? 'Scheduling...' : 'Sending...') : (scheduleEnabled ? 'Schedule Message' : 'Send Message')}
        </Button>
      </form>
    </Form>
  );
}
