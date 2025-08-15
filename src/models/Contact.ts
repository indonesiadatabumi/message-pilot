import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  name: string;
  phone: string; // Assuming phone numbers are stored as strings
  email?: string;
  groups: mongoose.Schema.Types.ObjectId[]; // References to ContactGroup
}

const ContactSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' }]
}, { timestamps: true });

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
