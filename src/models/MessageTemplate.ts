import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageTemplate extends Document {
  name: string;
  body: string; // The template string, e.g., "Hello {{name}}, your appointment is at {{time}}."
  placeholders: string[]; // List of required placeholder keys, e.g., ["name", "time"]
}

const MessageTemplateSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  body: { type: String, required: true },
  placeholders: [{ type: String }],
}, { timestamps: true });

export default mongoose.models.MessageTemplate || mongoose.model<IMessageTemplate>('MessageTemplate', MessageTemplateSchema);
