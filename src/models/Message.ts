import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  senderId: string; // Clerk ID
  recipientId: string; // Clerk ID
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  conversation: { type: Schema.Types.ObjectId, ref: "Conversation", index: true, required: true },
  senderId: { type: String, required: true, index: true },
  recipientId: { type: String, required: true, index: true },
  text: { type: String, required: true },
}, { timestamps: true });

const Message: Model<IMessage> = (mongoose.models.Message as Model<IMessage>) || mongoose.model<IMessage>("Message", messageSchema);

export default Message;
