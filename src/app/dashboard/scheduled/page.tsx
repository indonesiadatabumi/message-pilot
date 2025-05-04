import { ScheduledMessagesTable } from '@/components/scheduled/scheduled-messages-table';
import type { ScheduledMessage } from "@/services/message-service"; // Keep type import
import { getPendingScheduledMessages } from '@/actions/scheduled-message-actions'; // Import server action
import { format } from "date-fns"; // Import format for display

export default async function ScheduledMessagesPage() {
  // Fetch PENDING scheduled messages using the server action
  const scheduledMessages: ScheduledMessage[] = await getPendingScheduledMessages();

  // Format date for display on the server before passing to client component
  const formattedMessages = scheduledMessages.map(msg => ({
      ...msg,
      // Ensure scheduledTime is a Date object before formatting
      displayTime: msg.scheduledTime ? format(new Date(msg.scheduledTime), "PPP p") : "Invalid Date", // Format like "Jan 1, 2024 10:00 AM"
      // Ensure _id is stringified
      _id: msg._id?.toString(),
  }));

  // Add displayTime to the type for the client component prop
  type FormattedScheduledMessage = ScheduledMessage & { displayTime: string };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Scheduled Messages</h1>
        {/* Add button could go here - might link to /dashboard/send with schedule pre-selected */}
      </div>
       <p className="text-muted-foreground mb-4">
        View or cancel messages scheduled to be sent later. Only pending messages are shown here.
      </p>
      {/* Pass formatted messages */}
      <ScheduledMessagesTable scheduledMessages={formattedMessages as FormattedScheduledMessage[]} />
    </div>
  );
}

// Augmenting the original interface is tricky with server/client boundaries.
// It's often cleaner to define a new type for the component prop if needed,
// or ensure the transformation happens correctly before passing.
// Let's rely on the mapping above and pass the enriched type.

// // Extend ScheduledMessage interface if needed (e.g., for displayTime)
// declare module "@/services/message-service" {
//     interface ScheduledMessage {
//         displayTime?: string; // Add display formatted time
//     }
// }
