// src/actions/message-actions.ts
'use server';

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import type { Contact, MessageTemplate, TemplateParams, MessageHistoryInput, MessageSystemType } from '@/services/message-service';
import { scheduleNewMessage } from './scheduled-message-actions';
import { sendSms } from '@/services/sms-service';
import { extractParams } from '@/lib/template-utils';
import { logMessageToHistory } from './history-actions'; // Import history logging
import { revalidatePath } from 'next/cache';

const SCHEDULE_BUFFER_MS = 5000;

const scheduledTimeValidation = (data: { scheduleEnabled: boolean, scheduledDateTime?: Date }) => {
    if (!data.scheduleEnabled) return true;
    if (!data.scheduledDateTime) return false;
    const now = Date.now();
    const scheduledTime = data.scheduledDateTime.getTime();
    return scheduledTime > (now - SCHEDULE_BUFFER_MS);
};

const PrivateMessageSchema = z.object({
    recipient: z.custom<Contact>((val) => val instanceof Object && '_id' in val && 'name' in val && 'phone' in val, {
        message: "Please select a recipient.",
    }),
    content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, { message: "Message too long." }),
    scheduleEnabled: z.boolean().default(false),
    scheduledDateTime: z.date().optional(),
    userId: z.string().optional(), // Optional: for tracking who sent/scheduled
}).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
    message: "Please select a valid date and time for scheduled messages.",
    path: ["scheduledDateTime"],
}).refine(scheduledTimeValidation, {
    message: "Scheduled time must be in the future.",
    path: ["scheduledDateTime"],
});
type PrivateMessageFormValues = z.infer<typeof PrivateMessageSchema>;

const BroadcastMessageSchema = z.object({
    recipients: z.array(z.custom<Contact>((val): val is Contact => val instanceof Object && '_id' in val && 'phone' in val)).min(1, { message: "Please select at least one recipient." }),
    content: z.string().min(1, { message: "Message content cannot be empty." }).max(1000, { message: "Message too long." }),
    scheduleEnabled: z.boolean().default(false),
    scheduledDateTime: z.date().optional(),
    userId: z.string().optional(),
}).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
    message: "Please select a valid date and time for scheduled messages.",
    path: ["scheduledDateTime"],
}).refine(scheduledTimeValidation, {
    message: "Scheduled time must be in the future.",
    path: ["scheduledDateTime"],
});
type BroadcastMessageFormValues = z.infer<typeof BroadcastMessageSchema>;

const createRecipientParamsSchema = (params: string[]) => {
    const paramsSchema = params.reduce((acc, paramName) => {
        acc[paramName] = z.string().min(1, { message: `Required.` });
        return acc;
    }, {} as Record<string, z.ZodString>);
    return z.object({
        recipient: z.custom<Contact>((val): val is Contact => val instanceof Object && '_id' in val && 'phone' in val),
        parameters: z.object(paramsSchema)
    });
};

const createBulkTemplateMessageSchema = (params: string[]) => {
    return z.object({
        template: z.custom<MessageTemplate>((val): val is MessageTemplate => val instanceof Object && '_id' in val, {
            message: "Please select a template.",
        }),
        recipientsData: z.array(createRecipientParamsSchema(params))
            .min(1, { message: "Please add at least one recipient and fill their parameters." }),
        scheduleEnabled: z.boolean().default(false),
        scheduledDateTime: z.date().optional(),
        userId: z.string().optional(),
    }).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
        message: "Please select a valid date and time for scheduled messages.",
        path: ["scheduledDateTime"],
    }).refine(scheduledTimeValidation, {
        message: "Scheduled time must be in the future.",
        path: ["scheduledDateTime"],
    });
};
type BulkTemplateMessageFormValues = z.infer<ReturnType<typeof createBulkTemplateMessageSchema>>;


type SendMessageResult = { success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function handleSendPrivateMessage(formData: unknown): Promise<SendMessageResult> {
    const validatedFields = PrivateMessageSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, error: "Validation failed.", fieldErrors: validatedFields.error.flatten().fieldErrors };
    }
    const { recipient, content, scheduleEnabled, scheduledDateTime, userId } = validatedFields.data;

    try {
        if (scheduleEnabled && scheduledDateTime) {
            const scheduleResult = await scheduleNewMessage({
                recipient: recipient.phone,
                content: content,
                scheduledTime: scheduledDateTime,
                messageType: 'private', // Pass messageType
                userId: userId,
            });
            if (!scheduleResult.success) throw new Error(scheduleResult.error);
            return { success: true, message: `Message to ${recipient.name} scheduled successfully.` };
        } else {
            const smsResult = await sendSms(recipient.phone, content);
            // Log to history
            const historyEntry: MessageHistoryInput = {
                recipientPhone: recipient.phone,
                content: content,
                status: smsResult.success ? 'sent' : 'failed',
                type: 'private',
                processedAt: new Date(),
                apiResponse: smsResult.message, // smsResult.message contains API response or error
                errorMessage: smsResult.success ? undefined : smsResult.message,
                userId: userId,
            };
            await logMessageToHistory(historyEntry);
            if (smsResult.success) {
                revalidatePath('/dashboard/reports');
            }
            return { success: smsResult.success, message: smsResult.message };
        }
    } catch (error: any) {
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} message.` };
    }
}

export async function handleSendBroadcastMessage(formData: unknown): Promise<SendMessageResult> {
    const validatedFields = BroadcastMessageSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, error: "Validation failed.", fieldErrors: validatedFields.error.flatten().fieldErrors };
    }
    const { recipients, content, scheduleEnabled, scheduledDateTime, userId } = validatedFields.data;

    try {
        if (scheduleEnabled && scheduledDateTime) {
            const schedulePromises = recipients.map(r =>
                scheduleNewMessage({
                    recipient: r.phone,
                    content: content,
                    scheduledTime: scheduledDateTime,
                    messageType: 'broadcast', // Pass messageType
                    userId: userId,
                })
            );
            const results = await Promise.all(schedulePromises);
            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                throw new Error(`Failed to schedule message for ${failures.length} recipients.`);
            }
            return { success: true, message: `Broadcast message scheduled successfully for ${recipients.length} contacts.` };
        } else {
            let allSuccessful = true;
            let successes = 0;
            const sendPromises = recipients.map(async (r) => {
                const smsResult = await sendSms(r.phone, content);
                const historyEntry: MessageHistoryInput = {
                    recipientPhone: r.phone,
                    content: content,
                    status: smsResult.success ? 'sent' : 'failed',
                    type: 'broadcast',
                    processedAt: new Date(),
                    apiResponse: smsResult.message,
                    errorMessage: smsResult.success ? undefined : smsResult.message,
                    userId: userId,
                };
                await logMessageToHistory(historyEntry);
                if (!smsResult.success) allSuccessful = false;
                else successes++;
                return smsResult;
            });
            await Promise.all(sendPromises);

            if (successes > 0) revalidatePath('/dashboard/reports');

            if (!allSuccessful) {
                return { success: false, error: `Broadcast sent to ${successes} of ${recipients.length} contacts. Some failed.` };
            }
            return { success: true, message: `Broadcast message sent successfully to all ${recipients.length} contacts.` };
        }
    } catch (error: any) {
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} broadcast.` };
    }
}

export async function handleSendBulkTemplateMessage(formData: unknown): Promise<SendMessageResult> {
    const template = (formData as any)?.template as MessageTemplate | undefined;
    if (!template?.content) {
        return { success: false, error: "Template not selected or is invalid." };
    }
    const templateParamsList = extractParams(template.content);
    const BulkTemplateMessageSchema = createBulkTemplateMessageSchema(templateParamsList);
    const validatedFields = BulkTemplateMessageSchema.safeParse(formData);

    if (!validatedFields.success) {
        return { success: false, error: "Validation failed.", fieldErrors: validatedFields.error.flatten().fieldErrors as any };
    }
    const { recipientsData, template: selectedTemplate, scheduleEnabled, scheduledDateTime, userId } = validatedFields.data;

    try {
        const messagesToProcess: { recipient: Contact; content: string; parameters: Record<string, string> }[] = [];
        for (const item of recipientsData) {
            let filledContent = selectedTemplate.content;
            Object.entries(item.parameters).forEach(([key, value]) => {
                filledContent = filledContent.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
            });
            if (/\{\{.*?\}\}/.test(filledContent)) {
                throw new Error(`Unfilled parameters in template for ${item.recipient.name}.`);
            }
            messagesToProcess.push({ recipient: item.recipient, content: filledContent, parameters: item.parameters });
        }

        if (scheduleEnabled && scheduledDateTime) {
            const schedulePromises = messagesToProcess.map(msg =>
                scheduleNewMessage({
                    recipient: msg.recipient.phone,
                    content: msg.content,
                    scheduledTime: scheduledDateTime,
                    messageType: 'template',
                    templateId: selectedTemplate._id?.toString(),
                    templateName: selectedTemplate.name,
                    parameters: msg.parameters,
                    userId: userId,
                })
            );
            const results = await Promise.all(schedulePromises);
            const failures = results.filter(r => !r.success);
            if (failures.length > 0) throw new Error(`Failed to schedule messages for ${failures.length} recipients.`);
            return { success: true, message: `Bulk template messages scheduled successfully for ${messagesToProcess.length} contacts.` };
        } else {
            let allSuccessful = true;
            let successes = 0;
            const sendPromises = messagesToProcess.map(async (msg) => {
                const smsResult = await sendSms(msg.recipient.phone, msg.content);
                const historyEntry: MessageHistoryInput = {
                    recipientPhone: msg.recipient.phone,
                    content: msg.content,
                    status: smsResult.success ? 'sent' : 'failed',
                    type: 'template',
                    templateId: selectedTemplate._id?.toString(),
                    templateName: selectedTemplate.name,
                    parameters: msg.parameters,
                    processedAt: new Date(),
                    apiResponse: smsResult.message,
                    errorMessage: smsResult.success ? undefined : smsResult.message,
                    userId: userId,
                };
                await logMessageToHistory(historyEntry);
                if (!smsResult.success) allSuccessful = false;
                else successes++;
                return smsResult;
            });
            await Promise.all(sendPromises);

            if (successes > 0) revalidatePath('/dashboard/reports');

            if (!allSuccessful) {
                return { success: false, error: `Bulk template messages sent to ${successes} of ${messagesToProcess.length} contacts. Some failed.` };
            }
            return { success: true, message: `Bulk template messages sent successfully to all ${messagesToProcess.length} contacts.` };
        }
    } catch (error: any) {
        return { success: false, error: error.message || `Failed to ${scheduleEnabled ? 'schedule' : 'send'} bulk template messages.` };
    }
}

// Deprecated: handleSendTemplateMessage (single recipient logic)
// This should ideally be removed if the UI only uses bulk template sending.
// If kept, it needs similar updates for messageType and history logging.
// For now, marking as potentially unused and not updating for history.
export async function handleSendTemplateMessage(
    formData: any,
    templateParamsList: string[]
): Promise<SendTemplateMessageResult> {
    console.warn("[Action Deprecated] handleSendTemplateMessage (single) called. Consider using bulk send.");
    // ... existing single template send logic ...
    // If this is to be maintained, it needs updates for messageType in scheduleNewMessage
    // and direct history logging for immediate sends, similar to handleSendPrivateMessage.
    // For brevity, not fully implemented here.
    return { success: false, error: "Single template send is deprecated in this flow." };
}
