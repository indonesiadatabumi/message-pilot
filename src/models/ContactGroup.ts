import mongoose, { Document, Schema } from 'mongoose';

export interface IContactGroup extends Document {
  name: string;
  contacts: mongoose.Types.ObjectId[] | string[]; // Array of Contact IDs
}

const ContactGroupSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  contacts: [{ type: Schema.Types.ObjectId, ref: 'Contact' }], // Reference to Contact model
});

const ContactGroup = mongoose.models.ContactGroup || mongoose.model<IContactGroup>('ContactGroup', ContactGroupSchema);

export default ContactGroup;