import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKey extends Document {
  key: string;
  name: string;
  expiration: Date | null;
  createdAt: Date;
  active: boolean;
}

const ApiKeySchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  expiration: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
});

const ApiKey = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

export default ApiKey;