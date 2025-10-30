import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: "connection_request" | "connection_accepted" | "connection_withdrawn" | "message" | "review" | "system";
  title: string;
  message: string;
  data?: {
    connectionRequestId?: string;
    profileUrl?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationModel extends Model<INotification> {
  createNotification(
    recipientId: string,
    type: string,
    title: string,
    message: string,
    senderId?: string,
    data?: any
  ): Promise<INotification>;
  getUserNotifications(
    userId: string,
    filter?: "all" | "read" | "unread",
    limit?: number,
    skip?: number
  ): Promise<INotification[]>;
  getUnreadCount(userId: string): Promise<number>;
  markAllAsRead(userId: string): Promise<any>;
}

const notificationSchema = new Schema<INotification, INotificationModel>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    type: {
      type: String,
      enum: ["connection_request", "connection_accepted", "connection_withdrawn", "message", "review", "system"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient querying
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

// Virtual to populate sender details
notificationSchema.virtual("senderDetails", {
  ref: "User",
  localField: "sender",
  foreignField: "_id",
  justOne: true,
});

// Method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (
  recipientId: string,
  type: string,
  title: string,
  message: string,
  senderId?: string,
  data?: any
) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    data: data || {},
  });
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function (
  userId: string,
  filter: "all" | "read" | "unread" = "all",
  limit: number = 20,
  skip: number = 0
) {
  const query: any = { recipient: userId };
  
  if (filter === "read") {
    query.read = true;
  } else if (filter === "unread") {
    query.read = false;
  }

  return this.find(query)
    .populate("sender", "clerkId firstName lastName fullName avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function (userId: string) {
  return this.countDocuments({ recipient: userId, read: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function (userId: string) {
  return this.updateMany(
    { recipient: userId, read: false },
    { read: true }
  );
};

const Notification: INotificationModel =
  (mongoose.models.Notification as INotificationModel) ||
  mongoose.model<INotification, INotificationModel>("Notification", notificationSchema);

export default Notification;
