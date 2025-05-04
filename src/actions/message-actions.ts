// src/actions/message-actions.ts
'use server';

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import type { Contact, MessageTemplate, TemplateParams } from '@/services/message-service';
import { scheduleNewMessage } from './scheduled-message-actions'; // Import schedule action
import { sendSms } from '@/services/sms-service'; // Import the SMS sending service

// --- Schemas for Message Sending Forms ---

// Private Message Schema (matches form)
const PrivateMessageSchema = z.object({
  recipient: z.custom<Contact>((val) => val instanceof Object && '_id' in val && 'name' in val && 'phone' in val, {
    message: "Please select a recipient.",
  }),
  content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, {message: "Message too long."}),
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
type PrivateMessageFormValues = z.infer<typeof PrivateMessageSchema>;

// Broadcast Message Schema (matches form)
const BroadcastMessageSchema = z.object({
  recipients: z.array(z.custom<Contact>((val): val is Contact => val instanceof Object && '_id' in val && 'phone' in val)).min(1, { message: "Please select at least one recipient."}),
  content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, {message: "Message too long."}),
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
type BroadcastMessageFormValues = z.infer<typeof BroadcastMessageSchema>;


// Helper: Dynamically create schema based on selected template parameters
const createTemplateMessageSchema = (params: string[]) => {
   const paramsSchema = params.reduce((acc, paramName) => {
        acc[paramName] = z.string().min(1, { message: `Parameter '{{${paramName}}}' cannot be empty.` });
        return acc;
    }, {} as Record<string, z.ZodString>);

  return z.object({
     recipient: z.custom<Contact>((val) => val instanceof Object && '_id' in val && 'phone' in val, {
         message: "Please select a recipient.",
      }),
      template: z.custom<MessageTemplate>((val) => val instanceof Object && '_id' in val, {
          message: "Please select a template.",
      }),
      parameters: z.object(paramsSchema),
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

// Type placeholder for dynamic schema
type TemplateMessageFormValues = z.infer<ReturnType<typeof createTemplateMessageSchema>>;


// --- Combine Date and Time ---
function combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
}


// --- Send/Schedule Private Message Action ---
type SendPrivateMessageResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function handleSendPrivateMessage(formData: unknown): Promise<SendPrivateMessageResult> {
    const validatedFields = PrivateMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        return {
            success: false,
            error: "Validation failed. Please check the form fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipient, content, scheduleEnabled, scheduledDate, scheduledTime } = validatedFields.data;

    try {
        if (scheduleEnabled && scheduledDate && scheduledTime) {
            const scheduledDateTime = combineDateTime(scheduledDate, scheduledTime);
            const result = await scheduleNewMessage({
                recipient: recipient.phone,
                content: content,
                scheduledTime: scheduledDateTime,
            });
            if (!result.success) throw new Error(result.error); // Propagate scheduling error
            return { success: true, message: `Message to ${recipient.name} scheduled successfully.` };

        } else {
            // --- Send SMS immediately using the service ---
            console.log(`ACTION: Sending private message NOW via API to ${recipient.name} (${recipient.phone}).`);
            const smsResult = await sendSms(recipient.phone, content);
            if (!smsResult.success) {
                 // Propagate API error back to the form/user
                 return { success: false, error: smsResult.message };
            }
            // --- ---
            return { success: true, message: smsResult.message }; // Use message from API result
        }
    } catch (error: any) {
        console.error("Error in handleSendPrivateMessage:", error);
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} message.` };
    }
}

// --- Send/Schedule Broadcast Message Action ---
type SendBroadcastMessageResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function handleSendBroadcastMessage(formData: unknown): Promise<SendBroadcastMessageResult> {
    const validatedFields = BroadcastMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        return {
            success: false,
            error: "Validation failed. Please check the form fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

     const { recipients, content, scheduleEnabled, scheduledDate, scheduledTime } = validatedFields.data;
     const recipientPhones = recipients.map(r => r.phone);

    try {
        if (scheduleEnabled && scheduledDate && scheduledTime) {
            const scheduledDateTime = combineDateTime(scheduledDate, scheduledTime);
            // Schedule one message per recipient in the database
            const schedulePromises = recipientPhones.map(phone =>
                 scheduleNewMessage({
                     recipient: phone,
                     content: content,
                     scheduledTime: scheduledDateTime,
                 })
             );
            const results = await Promise.all(schedulePromises);
            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                // Report only the count of scheduling failures, not API failures yet
                throw new Error(`Failed to schedule message for ${failures.length} recipients.`);
            }
            return { success: true, message: `Broadcast message scheduled successfully for ${recipients.length} contacts.` };

        } else {
             // --- Send SMS immediately using the service (looping) ---
             console.log(`ACTION: Sending broadcast message NOW via API to ${recipients.length} contacts.`);
             const sendPromises = recipientPhones.map(phone => sendSms(phone, content));
             const results = await Promise.all(sendPromises);
             const apiFailures = results.filter(r => !r.success);

             if (apiFailures.length > 0) {
                 console.error(`Failed to send broadcast to ${apiFailures.length} recipients. Errors:`, apiFailures.map(f => f.message));
                 // Return a partial success/error message
                 return {
                    success: false, // Consider it a failure if any send fails
                    error: `Broadcast sent to ${recipients.length - apiFailures.length} contacts, but failed for ${apiFailures.length}. Check logs for details.`
                 };
             }
            // --- ---
            return { success: true, message: `Broadcast message sent successfully to all ${recipients.length} contacts.` };
        }
    } catch (error: any) {
        console.error("Error in handleSendBroadcastMessage:", error);
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} broadcast.` };
    }
}

// --- Send/Schedule Template Message Action ---
type SendTemplateMessageResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, any> }; // fieldErrors might be nested

export async function handleSendTemplateMessage(
    formData: unknown, // Raw form data
    templateParamsList: string[] // List of parameter names for the selected template
): Promise<SendTemplateMessageResult> {

    const TemplateMessageSchema = createTemplateMessageSchema(templateParamsList);
    const validatedFields = TemplateMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        console.log("Template validation failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the template parameters and other fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipient, template, parameters, scheduleEnabled, scheduledDate, scheduledTime } = validatedFields.data;

    // Render the template content with parameters
    let filledContent = template.content;
    try {
        Object.entries(parameters).forEach(([key, value]) => {
            // Basic replacement, consider more robust templating if needed
            filledContent = filledContent.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
        });
         // Check if any placeholders are left (might indicate missing params, though schema should catch this)
         if (/\{\{.*?\}\}/.test(filledContent)) {
            console.warn("Template might still contain unfilled parameters:", filledContent);
            // Decide if this should be an error
            // return { success: false, error: "Failed to fill all template parameters." };
         }
    } catch (renderError: any) {
         console.error("Error rendering template:", renderError);
         return { success: false, error: "Failed to prepare message content from template." };
    }


    try {
        if (scheduleEnabled && scheduledDate && scheduledTime) {
            const scheduledDateTime = combineDateTime(scheduledDate, scheduledTime);
             const result = await scheduleNewMessage({
                recipient: recipient.phone,
                content: filledContent, // Schedule the rendered content
                scheduledTime: scheduledDateTime,
            });
            if (!result.success) throw new Error(result.error);
            return { success: true, message: `Template message to ${recipient.name} scheduled successfully.` };

        } else {
             // --- Send SMS immediately using the service ---
            console.log(`ACTION: Sending template message NOW via API to ${recipient.name} (${recipient.phone}) using template "${template.name}"`);
            const smsResult = await sendSms(recipient.phone, filledContent);
             if (!smsResult.success) {
                 // Propagate API error back to the form/user
                 return { success: false, error: smsResult.message };
            }
            // --- ---
            return { success: true, message: smsResult.message }; // Use message from API result
        }
    } catch (error: any) {
        console.error("Error in handleSendTemplateMessage:", error);
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} template message.` };
    }
}
