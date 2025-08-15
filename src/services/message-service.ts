import MessageTemplate, { IMessageTemplate } from '@/models/MessageTemplate';
import Contact, { IContact } from '@/models/Contact';
import { Types } from 'mongoose';

interface SendMessageResult {
    success: boolean;
    message?: string;
    sentCount?: number;
    failedCount?: number;
    errors?: { recipientId: string; error: string }[];
}

/**
 * Sends a template message to one or more recipients.
 */
export async function sendTemplateMessage(
    templateId: string,
    recipientIds: string | string[],
    placeholders?: { [key: string]: string }
): Promise<SendMessageResult> {
    try {

        const template: IMessageTemplate | null = await MessageTemplate.findById(templateId);
        if (!template) {
            return { success: false, message: 'Template not found.' };
        }

        const idsToFetch = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
        const objectIdsToFetch = idsToFetch.map(id => new Types.ObjectId(id));

        const recipients: IContact[] = await Contact.find({ _id: { $in: objectIdsToFetch } });

        if (recipients.length === 0) {
            return { success: false, message: 'No valid recipients found.' };
        }

        let sentCount = 0;
        let failedCount = 0;
        const errors: { recipientId: string; error: string }[] = [];

        for (const recipient of recipients) {
            let messageBody = template.body;

            if (template.placeholders && template.placeholders.length > 0) {
                for (const placeholderKey of template.placeholders) {
                    const placeholderValue = placeholders?.[placeholderKey] || `{${placeholderKey}}`;
                    messageBody = messageBody.replace(new RegExp(`{{\s*${placeholderKey}\s*}}`, 'g'), placeholderValue);
                }
            }

            messageBody = messageBody.replace(/{{name}}/g, recipient.name);
            messageBody = messageBody.replace(/{{phone}}/g, recipient.phone);
            messageBody = messageBody.replace(/{{email}}/g, recipient.email || '');

            console.log(`Prepared message for ${recipient.name} (${recipient.phone}): ${messageBody}`);

            const messageSentSuccessfully = true; // Simulate success

            if (messageSentSuccessfully) {
                sentCount++;
            } else {
                failedCount++;
                errors.push({ recipientId: recipient._id.toString(), error: 'Failed to send via SMS provider' });
            }
        }

        if (sentCount > 0) {
            return { success: true, message: `Successfully processed ${sentCount} messages.`, sentCount, failedCount, errors };
        } else {
            return { success: false, message: `Failed to send any messages.`, sentCount, failedCount, errors };
        }

    } catch (error: any) {
        console.error('Error in sendTemplateMessage service:', error);
        return { success: false, message: error.message || 'An unexpected error occurred in message service.' };
    }
}


/**
 * Sends a direct message to one or more recipients (bulk).
 */
export async function sendBulkMessage(
    recipientIds: string[],
    messageBody: string
): Promise<SendMessageResult> {
    try {

        const objectIdsToFetch = recipientIds.map(id => new Types.ObjectId(id));
        const recipients: IContact[] = await Contact.find({ _id: { $in: objectIdsToFetch } });

        if (recipients.length === 0) {
            return { success: false, message: 'No valid recipients found.' };
        }

        let sentCount = 0;
        let failedCount = 0;
        const errors: { recipientId: string; error: string }[] = [];

        for (const recipient of recipients) {
            console.log(`Sending bulk message to ${recipient.name} (${recipient.phone}): ${messageBody}`);

            const messageSentSuccessfully = true; // Simulate success

            if (messageSentSuccessfully) {
                sentCount++;
            } else {
                failedCount++;
                errors.push({ recipientId: recipient._id.toString(), error: 'Failed to send via SMS provider' });
            }
        }

        if (sentCount > 0) {
            return { success: true, message: `Successfully sent ${sentCount} bulk messages.`, sentCount, failedCount, errors };
        } else {
            return { success: false, message: `Failed to send any bulk messages.`, sentCount, failedCount, errors };
        }

    } catch (error: any) {
        console.error('Error in sendBulkMessage service:', error);
        return { success: false, message: error.message || 'An unexpected error occurred in bulk message service.' };
    }
}


/**
 * Sends a direct message to a single recipient (private).
 */
export async function sendPrivateMessage(
    recipientId: string,
    messageBody: string
): Promise<SendMessageResult> {
    try {
        const objectIdToFetch = new Types.ObjectId(recipientId);
        const recipient: IContact | null = await Contact.findById(objectIdToFetch);

        if (!recipient) {
            return { success: false, message: 'No valid recipient found.' };
        }

        console.log(`Sending private message to ${recipient.name} (${recipient.phone}): ${messageBody}`);

        let sentCount = 0;
        let failedCount = 0;
        const errors: { recipientId: string; error: string }[] = [];

        const messageSentSuccessfully = true; // Simulate success

        if (messageSentSuccessfully) {
            sentCount++;
        } else {
            failedCount++;
            errors.push({ recipientId: recipient._id.toString(), error: 'Failed to send via SMS provider' });
        }

        return {
            success: true,
            message: `Successfully sent private message to ${recipient.name}.`,
            sentCount,
            failedCount,
            errors,
        };

    } catch (error: any) {
        console.error('Error in sendPrivateMessage service:', error);
        return { success: false, message: error.message || 'An unexpected error occurred in private message service.' };
    }
}
