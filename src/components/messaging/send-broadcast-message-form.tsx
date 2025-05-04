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
import { Contact, sendBroadcastMessage, scheduleMessage } from "@/services/message-service";

const formSchema = z.object({
  recipients: z.array(z.custom<Contact>()).min(1, { message: "Please select at least one recipient."}),
  content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, {message: "Message too long."}),
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


type BroadcastMessageFormValues = z.infer<typeof formSchema>;

interface SendBroadcastMessageFormProps {
  contacts: Contact[];
}

export function SendBroadcastMessageForm({ contacts }: SendBroadcastMessageFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<BroadcastMessageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: [],
      content: "",
      scheduleEnabled: false,
      scheduledDate: undefined,
      scheduledTime: "",
    },
  });

  const scheduleEnabled = form.watch("scheduleEnabled");

  const onSubmit = async (values: BroadcastMessageFormValues) => {
    setIsLoading(true);
    const { recipients, content, scheduleEnabled, scheduledDate, scheduledTime } = values;
    const recipientPhoneNumbers = recipients.map(c => c.phoneNumber);

    try {
       if (scheduleEnabled && scheduledDate && scheduledTime) {
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            const scheduledDateTime = new Date(scheduledDate);
            scheduledDateTime.setHours(hours, minutes, 0, 0);

            // Need to schedule one message per recipient for broadcast scheduling
            // Or adjust scheduleMessage service if it supports bulk scheduling
            await Promise.all(recipientPhoneNumbers.map(phone =>
                 scheduleMessage({
                     recipient: phone,
                     content: content,
                     scheduledTime: scheduledDateTime,
                 })
             ));

            toast({
                title: "Broadcast Scheduled",
                description: `Your message to ${recipients.length} contacts is scheduled for ${format(scheduledDateTime, "PPP p")}.`,
             });

       } else {
           await sendBroadcastMessage(recipientPhoneNumbers, content);
           toast({
             title: "Broadcast Sent",
             description: `Your message has been sent to ${recipients.length} contacts.`,
           });
       }
       form.reset(); // Reset form on success
    } catch (error) {
       console.error("Failed to send/schedule broadcast:", error);
       toast({
         variant: "destructive",
         title: "Error",
         description: `Failed to ${scheduleEnabled ? 'schedule' : 'send'} broadcast. Please try again.`,
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

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          {isLoading ? (scheduleEnabled ? 'Scheduling...' : 'Sending...') : (scheduleEnabled ? 'Schedule Broadcast' : 'Send Broadcast')}
        </Button>
      </form>
    </Form>
  );
}
