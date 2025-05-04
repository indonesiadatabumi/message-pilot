// src/services/sms-service.ts
'use server';

const apiKey = process.env.SMS_API_KEY;
const apiHost = process.env.SMS_API_HOST;

if (!apiKey) {
  console.warn('SMS_API_KEY environment variable is not set. SMS sending will be disabled.');
}
if (!apiHost) {
  console.warn('SMS_API_HOST environment variable is not set. SMS sending will be disabled.');
}

interface SendSmsResult {
  success: boolean;
  message: string; // API response message or error message
}

/**
 * Sends an SMS message using the external API.
 * @param phone - The recipient's phone number.
 * @param message - The message content.
 * @returns Promise resolving to SendSmsResult.
 */
export async function sendSms(phone: string, message: string): Promise<SendSmsResult> {
  if (!apiKey || !apiHost) {
    const errorMsg = 'SMS API credentials not configured.';
    console.error(`Failed to send SMS to ${phone}: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }

  const endpoint = `${apiHost.replace(/\/$/, '')}/sendMessage`; // Ensure no trailing slash before adding endpoint

  try {
    console.log(`Attempting to send SMS to ${phone}...`);

    const body = new URLSearchParams();
    body.append('apiKey', apiKey);
    body.append('phone', phone);
    body.append('message', message);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    // Log raw response for debugging
    const responseText = await response.text();
    console.log(`SMS API Raw Response for ${phone}: Status ${response.status}, Body: ${responseText}`);


    if (!response.ok) {
       // Try to parse error if possible, otherwise use raw text
       let errorDetails = responseText;
       try {
          const errorJson = JSON.parse(responseText);
          errorDetails = errorJson.message || JSON.stringify(errorJson);
       } catch {
          // Ignore parsing error, use raw text
       }
      throw new Error(`API request failed with status ${response.status}: ${errorDetails}`);
    }

     // Assuming successful response means the message was accepted for sending
     // The actual API response structure might vary, adjust parsing as needed.
    let responseMessage = `SMS successfully sent/queued to ${phone}.`;
    try {
        const responseJson = JSON.parse(responseText);
        // Adapt based on the actual successful response structure
        responseMessage = responseJson.message || responseMessage;
    } catch {
        // Use default message if response is not JSON or doesn't have a 'message' field
    }


    console.log(responseMessage);
    return { success: true, message: responseMessage };

  } catch (error: any) {
    console.error(`Error sending SMS to ${phone}:`, error);
    return { success: false, message: error.message || 'Failed to send SMS due to an unexpected error.' };
  }
}

// Placeholder for potential future bulk sending function
// export async function sendBulkSms(phones: string[], message: string): Promise<any> {
//   // Implement bulk sending logic if the API supports it
//   console.log(`Bulk SMS to ${phones.length} recipients is not implemented yet.`);
//   return { success: false, message: "Bulk SMS not implemented." };
// }
