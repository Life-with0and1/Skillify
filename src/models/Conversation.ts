import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversation extends Document {
  participants: string[]; // Clerk IDs
  lastMessage?: string;
  lastSenderId?: string; // Clerk ID
  updatedAt: Date;
  createdAt: Date;
}

export interface IConversationModel extends Model<IConversation> {
  findBetween: (a: string, b: string) => Promise<IConversation | null>;
  upsertBetween: (a: string, b: string) => Promise<IConversation>;
}

const conversationSchema = new Schema<IConversation, IConversationModel>({
  participants: { type: [String], required: true, index: true },
  lastMessage: { type: String },
  lastSenderId: { type: String },
}, { timestamps: true });

conversationSchema.index({ participants: 1 });

conversationSchema.statics.findBetween = function(a: string, b: string) {
  const set = [a, b].sort();
  return this.findOne({ participants: set });
};

conversationSchema.statics.upsertBetween = async function(a: string, b: string) {
  const set = [a, b].sort();
  const existing = await this.findOne({ participants: set });
  if (existing) return existing;
  return this.create({ participants: set });
};

const Conversation: IConversationModel = (mongoose.models.Conversation as IConversationModel) || mongoose.model<IConversation, IConversationModel>("Conversation", conversationSchema);

export default Conversation;
