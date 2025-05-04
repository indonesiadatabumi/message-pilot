import { ScheduledMessagesTable } from '@/components/scheduled/scheduled-messages-table';
import { ScheduledMessage } from "@/services/message-service";
import { format } from "date-fns"; // Import format

// Mock data - Replace with API fetching
const mockScheduledMessages: ScheduledMessage[] = [
  { id: 's1', recipient: '+1234567890', content: 'Meeting reminder!', scheduledTime: new Date(Date.now() + 3600 * 1000 * 24) }, // Tomorrow
  { id: 's2', recipient: '+0987654321', content: 'Happy Birthday!', scheduledTime: new Date(Date.now() + 3600 * 1000 * 48) }, // Day after tomorrow
  { id: 's3', recipient: '+1122334455', content: 'Follow up call.', scheduledTime: new Date(Date.now() + 3600 * 1000 * 72) }, // In 3 days
];

export default async function ScheduledMessagesPage() {
  // TODO: Fetch scheduled messages from API
  const scheduledMessages = mockScheduledMessages;

  // Format date for display
  const formattedMessages = scheduledMessages.map(msg => ({
      ...msg,
      displayTime: format(msg.scheduledTime, "PPP p") // Format like "Jan 1, 2024 10:00 AM"
  }));

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Scheduled Messages</h1>
        {/* Potential Add Scheduled Button/Modal could go here if direct scheduling is needed */}
      </div>
       <p className="text-muted-foreground mb-4">
        View, edit, or cancel messages scheduled to be sent later.
      </p>
      <ScheduledMessagesTable scheduledMessages={formattedMessages} />
    </div>
  );
}

// Extend ScheduledMessage interface if needed (e.g., for displayTime)
declare module "@/services/message-service" {
    interface ScheduledMessage {
        id?: string;
        displayTime?: string; // Add display formatted time
    }
}
