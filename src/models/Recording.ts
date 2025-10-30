import mongoose, { Schema, models, model } from "mongoose";

export interface IRecording {
  userId: string; // owner/initiator
  otherUserId?: string;
  callId: string;
  title: string;
  url?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RecordingSchema = new Schema<IRecording>(
  {
    userId: { type: String, required: true, index: true },
    otherUserId: { type: String },
    callId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    url: { type: String },
  },
  { timestamps: true }
);

export default models.Recording || model<IRecording>("Recording", RecordingSchema);
