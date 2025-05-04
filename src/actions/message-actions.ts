
// src/actions/message-actions.ts
'use server';

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import type { Contact, MessageTemplate, TemplateParams } from '@/services/message-service';
import { scheduleNewMessage } from './scheduled-message-actions'; // Import schedule action
import { sendSms } from '@/services/sms-service'; // Import the SMS sending service
import { extractParams } from '@/lib/template-utils'; // Import helper from new file

// --- Schemas for Message Sending Forms ---

const SCHEDULE_BUFFER_MS = 5000; // 5 seconds buffer

// Helper for scheduled time validation
const scheduledTimeValidation = (data: { scheduleEnabled: boolean, scheduledDateTime?: Date }) => {
    if (!data.scheduleEnabled) return true; // Not scheduled, validation passes
    if (!data.scheduledDateTime) return false; // Scheduled but no date/time provided
    const now = Date.now();
    const scheduledTime = data.scheduledDateTime.getTime();
    console.log(`[Validation] Now: ${now}, Scheduled: ${scheduledTime}, Diff: ${scheduledTime - now}`);
    // Check if scheduled time is in the future, allowing for a small buffer
    return scheduledTime > (now - SCHEDULE_BUFFER_MS);
};

// Private Message Schema (matches form, expects combined DateTime)
const PrivateMessageSchema = z.object({
    recipient: z.custom<Contact>((val) => val instanceof Object && '_id' in val && 'name' in val && 'phone' in val, {
        message: "Please select a recipient.",
    }),
    content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, { message: "Message too long." }),
    scheduleEnabled: z.boolean().default(false),
    scheduledDateTime: z.date().optional(), // Combined Date and Time
}).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
    message: "Please select a valid date and time for scheduled messages.",
    path: ["scheduledDateTime"], // Point error to the combined field
}).refine(scheduledTimeValidation, {
    message: "Scheduled time must be in the future.",
    path: ["scheduledDateTime"], // Point error to the combined field
});
type PrivateMessageFormValues = z.infer<typeof PrivateMessageSchema>;

// Broadcast Message Schema (matches form, expects combined DateTime)
const BroadcastMessageSchema = z.object({
    recipients: z.array(z.custom<Contact>((val): val is Contact => val instanceof Object && '_id' in val && 'phone' in val)).min(1, { message: "Please select at least one recipient." }),
    content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, { message: "Message too long." }),
    scheduleEnabled: z.boolean().default(false),
    scheduledDateTime: z.date().optional(), // Combined Date and Time
}).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
    message: "Please select a valid date and time for scheduled messages.",
    path: ["scheduledDateTime"],
}).refine(scheduledTimeValidation, {
    message: "Scheduled time must be in the future.",
    path: ["scheduledDateTime"],
});
type BroadcastMessageFormValues = z.infer<typeof BroadcastMessageSchema>;


// --- Template Message Schemas ---

// Helper: Dynamically create schema for parameters of a *single* recipient
const createRecipientParamsSchema = (params: string[]) => {
    const paramsSchema = params.reduce((acc, paramName) => {
        acc[paramName] = z.string().min(1, { message: `Required.` }); // Updated message
        return acc;
    }, {} as Record<string, z.ZodString>);

    return z.object({
        recipient: z.custom<Contact>((val): val is Contact => val instanceof Object && '_id' in val && 'phone' in val),
        parameters: z.object(paramsSchema)
    });
};

// Schema for Bulk Template Messages (matches the updated form structure)
const createBulkTemplateMessageSchema = (params: string[]) => {
    return z.object({
        template: z.custom<MessageTemplate>((val): val is MessageTemplate => val instanceof Object && '_id' in val, {
            message: "Please select a template.",
        }),
        recipientsData: z.array(createRecipientParamsSchema(params))
            .min(1, { message: "Please add at least one recipient and fill their parameters." }),
        scheduleEnabled: z.boolean().default(false),
        scheduledDateTime: z.date().optional(), // Combined Date and Time
    }).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
        message: "Please select a valid date and time for scheduled messages.",
        path: ["scheduledDateTime"],
    }).refine(scheduledTimeValidation, {
        message: "Scheduled time must be in the future.",
        path: ["scheduledDateTime"],
    });
};

// Type placeholder for dynamic bulk schema
type BulkTemplateMessageFormValues = z.infer<ReturnType<typeof createBulkTemplateMessageSchema>>;


// --- Send/Schedule Private Message Action ---
type SendPrivateMessageResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// formData now expected to contain scheduledDateTime instead of scheduledDate/Time
export async function handleSendPrivateMessage(formData: unknown): Promise<SendPrivateMessageResult> {
    console.log("[Action] handleSendPrivateMessage received formData:", formData);
    const validatedFields = PrivateMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        console.error("[Action Error] Private Message Validation Failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the form fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipient, content, scheduleEnabled, scheduledDateTime } = validatedFields.data;
    console.log("[Action] Private Message Validated Data:", { recipient: recipient.name, content, scheduleEnabled, scheduledDateTime });


    try {
        if (scheduleEnabled && scheduledDateTime) {
            console.log(`[Action] Scheduling private message to ${recipient.phone} for ${scheduledDateTime.toISOString()}`);
            // Pass the validated Date object directly
            const result = await scheduleNewMessage({
                recipient: recipient.phone,
                content: content,
                scheduledTime: scheduledDateTime, // Pass the Date object
            });
            if (!result.success) throw new Error(result.error); // Propagate scheduling error
            return { success: true, message: `Message to ${recipient.name} scheduled successfully.` };

        } else {
            // --- Send SMS immediately using the service ---
            console.log(`[Action] Sending private message NOW via API to ${recipient.name} (${recipient.phone}).`);
            const smsResult = await sendSms(recipient.phone, content);
            if (!smsResult.success) {
                // Propagate API error back to the form/user
                return { success: false, error: smsResult.message };
            }
            // --- ---
            return { success: true, message: smsResult.message }; // Use message from API result
        }
    } catch (error: any) {
        console.error("[Action Error] Error in handleSendPrivateMessage:", error);
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} message.` };
    }
}

// --- Send/Schedule Broadcast Message Action ---
type SendBroadcastMessageResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// formData now expected to contain scheduledDateTime instead of scheduledDate/Time
export async function handleSendBroadcastMessage(formData: unknown): Promise<SendBroadcastMessageResult> {
    console.log("[Action] handleSendBroadcastMessage received formData:", formData);
    const validatedFields = BroadcastMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        console.error("[Action Error] Broadcast Message Validation Failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the form fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipients, content, scheduleEnabled, scheduledDateTime } = validatedFields.data;
    const recipientPhones = recipients.map(r => r.phone);
    console.log("[Action] Broadcast Message Validated Data:", { recipients: recipients.map(r => r.name), content, scheduleEnabled, scheduledDateTime });


    try {
        if (scheduleEnabled && scheduledDateTime) {
            console.log(`[Action] Scheduling broadcast message to ${recipientPhones.length} contacts for ${scheduledDateTime.toISOString()}`);
            // Schedule one message per recipient in the database
            const schedulePromises = recipientPhones.map(phone =>
                scheduleNewMessage({
                    recipient: phone,
                    content: content,
                    scheduledTime: scheduledDateTime, // Pass the Date object
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
            console.log(`[Action] Sending broadcast message NOW via API to ${recipients.length} contacts.`);
            const sendPromises = recipientPhones.map(phone => sendSms(phone, content));
            const results = await Promise.all(sendPromises);
            const apiFailures = results.filter(r => !r.success);

            if (apiFailures.length > 0) {
                console.error(`[Action Error] Failed to send broadcast to ${apiFailures.length} recipients. Errors:`, apiFailures.map(f => f.message));
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
        console.error("[Action Error] Error in handleSendBroadcastMessage:", error);
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} broadcast.` };
    }
}


// --- Send/Schedule Bulk Template Message Action ---
type SendBulkTemplateMessageResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, any> }; // fieldErrors might be nested

export async function handleSendBulkTemplateMessage(
    formData: unknown, // Raw form data from the updated form
): Promise<SendBulkTemplateMessageResult> {
    console.log("[Action] handleSendBulkTemplateMessage received formData:", formData);

    // Get template content from formData to determine params for schema creation
    const template = (formData as any)?.template as MessageTemplate | undefined;
    if (!template?.content) {
        // This should ideally be caught by form validation before submission
        console.error("[Action Error] Bulk Template Send: Template or template content missing in formData.");
        return { success: false, error: "Template not selected or is invalid." };
    }
    const templateParamsList = extractParams(template.content);

    // Create the dynamic schema based on the selected template's parameters
    const BulkTemplateMessageSchema = createBulkTemplateMessageSchema(templateParamsList);
    const validatedFields = BulkTemplateMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        console.error("[Action Error] Bulk Template Message Validation failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the template parameters for each recipient and other fields.",
            // Map RHF field array errors if possible, otherwise flatten
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipientsData, template: selectedTemplate, scheduleEnabled, scheduledDateTime } = validatedFields.data;
    const totalRecipients = recipientsData.length;
    console.log("[Action] Bulk Template Validated Data:", { templateName: selectedTemplate.name, numRecipients: totalRecipients, scheduleEnabled, scheduledDateTime });


    try {
        // Prepare data for sending/scheduling: Array of { recipient: string, content: string }
        const messagesToSend: { recipient: string; content: string }[] = [];
        for (const item of recipientsData) {
            let filledContent = selectedTemplate.content;
            try {
                Object.entries(item.parameters).forEach(([key, value]) => {
                    filledContent = filledContent.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
                });
                // Optional: Check for remaining placeholders
                if (/\{\{.*?\}\}/.test(filledContent)) {
                    console.warn(`[Action Warn] Template for ${item.recipient.phone} might still contain unfilled parameters:`, filledContent);
                    // Decide if this should cause an error for this specific recipient
                }
                messagesToSend.push({ recipient: item.recipient.phone, content: filledContent });
            } catch (renderError: any) {
                console.error(`[Action Error] Error rendering template for ${item.recipient.phone}:`, renderError);
                // Decide how to handle: skip this recipient or fail the whole batch?
                // For now, let's throw an error to fail the batch
                throw new Error(`Failed to prepare message content for recipient ${item.recipient.name} (${item.recipient.phone}).`);
            }
        }

        // --- Scheduling Logic ---
        if (scheduleEnabled && scheduledDateTime) {
            console.log(`[Action] Scheduling ${totalRecipients} bulk template messages for ${scheduledDateTime.toISOString()}`);
            const schedulePromises = messagesToSend.map(msg =>
                scheduleNewMessage({
                    recipient: msg.recipient,
                    content: msg.content,
                    scheduledTime: scheduledDateTime, // Use the single selected schedule time
                })
            );
            const results = await Promise.all(schedulePromises);
            const scheduleFailures = results.filter(r => !r.success);

            if (scheduleFailures.length > 0) {
                throw new Error(`Failed to schedule messages for ${scheduleFailures.length} recipients.`);
            }
            return { success: true, message: `Bulk template messages scheduled successfully for ${totalRecipients} contacts.` };

            // --- Immediate Sending Logic ---
        } else {
            console.log(`[Action] Sending ${totalRecipients} bulk template messages NOW via API...`);
            const sendPromises = messagesToSend.map(msg => sendSms(msg.recipient, msg.content));
            const results = await Promise.all(sendPromises);
            const apiFailures = results.filter(r => !r.success);

            if (apiFailures.length > 0) {
                console.error(`[Action Error] Failed to send bulk template messages to ${apiFailures.length} recipients. Errors:`, apiFailures.map(f => f.message));
                return {
                    success: false, // Mark as failure if any send fails
                    error: `Messages sent to ${totalRecipients - apiFailures.length} contacts, but failed for ${apiFailures.length}. Check logs.`
                };
            }
            return { success: true, message: `Bulk template messages sent successfully to all ${totalRecipients} contacts.` };
        }

    } catch (error: any) {
        console.error("[Action Error] Error in handleSendBulkTemplateMessage:", error);
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} bulk template messages.` };
    }
}

// --- Original handleSendTemplateMessage (for single recipient - can be kept or deprecated) ---
type SendTemplateMessageResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, any> };

// This function assumes a form structure with a single recipient and parameters directly under formData.parameters
// It's kept for potential backward compatibility or specific single-send scenarios.
// If the UI only supports bulk, this might become unused.
export async function handleSendTemplateMessage(
    formData: any, // Use 'any' for simplicity, assuming old structure
    templateParamsList: string[] // Still need this for dynamic schema creation
): Promise<SendTemplateMessageResult> {
    console.log("[Action] handleSendTemplateMessage (single) received formData:", formData);

    // Helper schema for single template send (similar to original)
    const createSingleTemplateMessageSchema = (params: string[]) => {
        const paramsSchema = params.reduce((acc, paramName) => {
            acc[paramName] = z.string().min(1, { message: `Parameter '{{${paramName}}}' cannot be empty.` });
            return acc;
        }, {} as Record<string, z.ZodString>);

        return z.object({
            recipient: z.custom<Contact>((val): val is Contact => val instanceof Object && '_id' in val && 'phone' in val, {
                message: "Please select a recipient.",
            }),
            template: z.custom<MessageTemplate>((val): val is MessageTemplate => val instanceof Object && '_id' in val, {
                message: "Please select a template.",
            }),
            parameters: z.object(paramsSchema),
            scheduleEnabled: z.boolean().default(false),
            scheduledDateTime: z.date().optional(), // Combined Date and Time
        }).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
            message: "Please select a valid date and time for scheduled messages.",
            path: ["scheduledDateTime"],
        }).refine(scheduledTimeValidation, {
            message: "Scheduled time must be in the future.",
            path: ["scheduledDateTime"],
        });
    };


    const TemplateMessageSchema = createSingleTemplateMessageSchema(templateParamsList);
    const validatedFields = TemplateMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        console.error("[Action Error] Single Template Message Validation failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the template parameters and other fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { recipient, template, parameters, scheduleEnabled, scheduledDateTime } = validatedFields.data;
    console.log("[Action] Single Template Validated Data:", { recipient: recipient.name, templateName: template.name, parameters, scheduleEnabled, scheduledDateTime });

    // Render the template content with parameters
    let filledContent = template.content;
    try {
        Object.entries(parameters).forEach(([key, value]) => {
            filledContent = filledContent.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
        });
        if (/\{\{.*?\}\}/.test(filledContent)) {
            console.warn("[Action Warn] Single Template: Template might still contain unfilled parameters:", filledContent);
        }
    } catch (renderError: any) {
        console.error("[Action Error] Single Template: Error rendering template:", renderError);
        return { success: false, error: "Failed to prepare message content from template." };
    }

    try {
        if (scheduleEnabled && scheduledDateTime) {
            console.log(`[Action] Scheduling single template message to ${recipient.phone} for ${scheduledDateTime.toISOString()}`);
            const result = await scheduleNewMessage({
                recipient: recipient.phone,
                content: filledContent, // Schedule the rendered content
                scheduledTime: scheduledDateTime, // Pass the Date object
            });
            if (!result.success) throw new Error(result.error);
            return { success: true, message: `Template message to ${recipient.name} scheduled successfully.` };

        } else {
            console.log(`[Action] Sending single template message NOW via API to ${recipient.name} (${recipient.phone}) using template "${template.name}"`);
            const smsResult = await sendSms(recipient.phone, filledContent);
            if (!smsResult.success) {
                return { success: false, error: smsResult.message };
            }
            return { success: true, message: smsResult.message }; // Use message from API result
        }
    } catch (error: any) {
        console.error("[Action Error] Error in handleSendTemplateMessage (single):", error);
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} template message.` };
    }
}
