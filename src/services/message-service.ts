// src/services/message-service.ts
import type { ObjectId } from 'mongodb';

/**
 * Represents a contact with name and phone number.
 * Includes MongoDB ObjectId if fetched from DB.
 */
export interface Contact {
  _id?: ObjectId | string; // Use ObjectId or string for ID flexibility
  name: string;
  phone: string; // Renamed from phoneNumber for consistency
}

/**
 * Represents a message template with a name and content.
 * Includes MongoDB ObjectId if fetched from DB.
 */
export interface MessageTemplate {
  _id?: ObjectId | string;
  name: string;
  content: string;
}

/**
 * Represents a scheduled message with recipient, content, and scheduled time.
 * Includes MongoDB ObjectId if fetched from DB.
 */
export interface ScheduledMessage {
    _id?: ObjectId | string;
    recipient: string;
    content: string;
    scheduledTime: Date;
    status: 'pending' | 'sent' | 'canceled' | 'failed'; // Add status tracking
    createdAt: Date; // Track creation time
}


// NOTE: Functions like sendPrivateMessage, sendBroadcastMessage, scheduleMessage, etc.,
// were removed from here. Their logic is now implemented in Server Actions
// (e.g., src/actions/message-actions.ts, src/actions/scheduled-message-actions.ts)
// which directly interact with the database or external APIs.

// Type for template parameters
export interface TemplateParams {
  [key: string]: string;
}
