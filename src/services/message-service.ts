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

export type MessageSystemStatus = 'pending' | 'sent' | 'canceled' | 'failed' | 'processing';
export type MessageSystemType = 'private' | 'broadcast' | 'template';


/**
 * Represents a scheduled message with recipient, content, and scheduled time.
 * Includes MongoDB ObjectId if fetched from DB.
 */
export interface ScheduledMessage {
  _id?: ObjectId | string;
  recipient: string;
  content: string;
  scheduledTime: Date;
  status: MessageSystemStatus; // Add status tracking
  createdAt: Date; // Track creation time

  // New fields for richer history logging
  messageType: MessageSystemType;
  templateId?: string; // ObjectId as string
  templateName?: string;
  parameters?: Record<string, string>; // For template messages when messageType is 'template'
  userId?: string; // Optional: ObjectId as string, who initiated the schedule
}


// Type for template parameters
export interface TemplateParams {
  [key: string]: string;
}

// --- Message History Types ---
export interface MessageHistoryBase {
  recipientPhone: string;
  content: string;
  status: MessageSystemStatus;
  type: MessageSystemType;
  templateId?: string; // ObjectId as string
  templateName?: string;
  parameters?: Record<string, string>; // For template messages
  userId?: string; // ObjectId as string, if tracking user
  scheduledAt?: Date; // Original scheduled time, if applicable
  processedAt: Date; // Time of actual send attempt or terminal status update (e.g. cancellation)
  apiMessageId?: string; // From SMS provider, if successful send
  apiResponse?: string; // Raw response from SMS provider, for debugging
  errorMessage?: string; // If status is 'failed'
}

export interface MessageHistoryEntry extends MessageHistoryBase {
  _id: ObjectId | string;
  createdAt: Date; // Timestamp of when this history record itself was created
}

// Input type for logging, omits system-generated fields _id and createdAt for the history entry itself
export type MessageHistoryInput = MessageHistoryBase;
