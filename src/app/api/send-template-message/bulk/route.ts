import { NextResponse } from 'next/server';
import { handleSendBulkTemplateMessage } from '@/actions/message-actions';
import { z } from 'zod';

// Define the schema for a single recipient's data within the bulk request
const recipientDataSchema = z.object({
  recipient: z.object({
    phone: z.string().min(1, { message: "Recipient phone is required." }),
    name: z.string().optional().nullable(),
  }),
  parameters: z.record(z.string(), z.any()).optional().nullable(), // Allow any parameters as a record
});

// Define the main schema for the bulk template message request body
const bulkTemplateMessageRequestSchema = z.object({
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  recipientsData: z.array(recipientDataSchema).min(1, { message: "At least one recipient is required for bulk sending." }),
  scheduleEnabled: z.boolean().optional().default(false),
  scheduledDateTime: z.string().optional().nullable(), // Expect string for parsing date/time
}).refine(data => data.templateId || data.templateName, {
  message: "Either templateId or templateName must be provided.",
}).refine(data => !data.scheduleEnabled || data.scheduledDateTime, {
  message: "scheduledDateTime is required when scheduleEnabled is true.",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate the request body
    const validationResult = bulkTemplateMessageRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: "Invalid request body",
        fieldErrors: validationResult.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Prepare the data for the server action
    // Note: The server action handleSendBulkTemplateMessage expects recipientsData
    // to have a Contact object structure, not just { phone, name }.
    // It also expects the date object for scheduledDateTime.
    // You might need to adapt the server action or fetch full contact details here
    // based on the phone number if the action requires a full Contact object.
    // For this API, we will pass the basic recipient structure and parameters.
    // The action should handle looking up the full contact if necessary.

    let scheduledDateTime: Date | undefined = undefined;
    if (validatedData.scheduleEnabled && validatedData.scheduledDateTime) {
      try {
        scheduledDateTime = new Date(validatedData.scheduledDateTime);
        // Basic check if date is valid
        if (isNaN(scheduledDateTime.getTime())) {
           return NextResponse.json({
              success: false,
              error: "Invalid scheduledDateTime format.",
            }, { status: 400 });
        }
         // Optional: Add a check if the scheduled time is in the future
         if (scheduledDateTime.getTime() < Date.now()) {
            return NextResponse.json({
               success: false,
               error: "Scheduled time must be in the future.",
             }, { status: 400 });
         }

      } catch (e) {
         console.error("Failed to parse scheduledDateTime:", e);
         return NextResponse.json({
            success: false,
            error: "Invalid scheduledDateTime format.",
          }, { status: 400 });
      }
    }


    // Call the server action
    const actionResult = await handleSendBulkTemplateMessage({
      templateId: validatedData.templateId,
      templateName: validatedData.templateName,
      recipientsData: validatedData.recipientsData.map(item => ({
         recipient: item.recipient, // Pass the basic recipient object
         parameters: item.parameters || {}, // Ensure parameters is an object
      })),
      scheduleEnabled: validatedData.scheduleEnabled,
      scheduledDateTime: scheduledDateTime,
    });

    if (actionResult.success) {
      return NextResponse.json({ success: true, message: actionResult.message });
    } else {
      // Pass errors from the action, including fieldErrors if any
      return NextResponse.json({
        success: false,
        error: actionResult.error || "Failed to send bulk template messages.",
        fieldErrors: actionResult.fieldErrors,
      }, { status: 500 }); // Use 500 for server action failures
    }

  } catch (error) {
    console.error("API Error sending bulk template message:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}

// Add OPTIONS handler for CORS preflight requests if needed
// export async function OPTIONS(request: Request) {
//   return NextResponse.json({}, { status: 200 });
// }