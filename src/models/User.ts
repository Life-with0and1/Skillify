import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISkillTeaching {
  skill: string;
}

export interface ISkillLearning {
  skill: string;
}

export interface IUser extends Document {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  skillsTeaching: ISkillTeaching[];
  skillsLearning: ISkillLearning[];
  availability: string[];
  rating: number;
  totalReviews: number;
  connections: mongoose.Types.ObjectId[];
  pendingConnectionRequests: {
    sent: mongoose.Types.ObjectId[];
    received: mongoose.Types.ObjectId[];
  };
  onboardingComplete: boolean;
  isActive: boolean;
  joinedAt: Date;
  lastActive: Date;
  updateLastActive: () => Promise<IUser>;
  sendConnectionRequest: (targetUserId: string) => Promise<IUser>;
  receiveConnectionRequest: (fromUserId: string) => Promise<IUser>;
  acceptConnectionRequest: (fromUserId: string) => Promise<IUser>;
  withdrawConnectionRequest: (targetUserId: string) => Promise<IUser>;
  removeReceivedConnectionRequest: (fromUserId: string) => Promise<IUser>;
  getConnectionStatus: (otherUserId: string) => "connected" | "request_sent" | "request_received" | "not_connected";
}

export interface IUserModel extends Model<IUser> {
  findByClerkId: (clerkId: string) => Promise<IUser | null>;
}

const skillTeachingSchema = new Schema({
  skill: { type: String, required: true },
});

const skillLearningSchema = new Schema({
  skill: { type: String, required: true },
});

const userSchema = new Schema<IUser, IUserModel>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    firstName: { type: String },
    lastName: { type: String },
    fullName: { type: String, required: true },
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    location: { type: String },
    skillsTeaching: [skillTeachingSchema],
    skillsLearning: [skillLearningSchema],
    availability: [{ type: String }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    connections: [{ type: Schema.Types.ObjectId, ref: "User" }],
  pendingConnectionRequests: {
    sent: [{ type: Schema.Types.ObjectId, ref: "User" }],
    received: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
    onboardingComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for getting user's skill count
userSchema.virtual("skillCount").get(function () {
  const teachingCount = (this.skillsTeaching || []).length;
  const learningCount = (this.skillsLearning || []).length;
  return {
    teaching: teachingCount,
    learning: learningCount,
    total: teachingCount + learningCount,
  };
});

// Method to update last active
userSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};

// Static method to find by Clerk ID
userSchema.statics.findByClerkId = function (clerkId: string) {
  return this.findOne({ clerkId });
};

// Method to send connection request
userSchema.methods.sendConnectionRequest = function (targetUserId: string) {
  if (!this.pendingConnectionRequests.sent.includes(targetUserId)) {
    this.pendingConnectionRequests.sent.push(targetUserId);
  }
  return this.save();
};

// Method to receive connection request
userSchema.methods.receiveConnectionRequest = function (fromUserId: string) {
  if (!this.pendingConnectionRequests.received.includes(fromUserId)) {
    this.pendingConnectionRequests.received.push(fromUserId);
  }
  return this.save();
};

// Method to accept connection request
userSchema.methods.acceptConnectionRequest = function (fromUserId: string) {
  // Remove from received requests
  this.pendingConnectionRequests.received = this.pendingConnectionRequests.received.filter(
    (id: any) => id.toString() !== fromUserId
  );
  
  // Add to connections if not already connected
  if (!this.connections.includes(fromUserId)) {
    this.connections.push(fromUserId);
  }
  
  return this.save();
};

// Method to withdraw connection request
userSchema.methods.withdrawConnectionRequest = function (targetUserId: string) {
  this.pendingConnectionRequests.sent = this.pendingConnectionRequests.sent.filter(
    (id: any) => id.toString() !== targetUserId
  );
  return this.save();
};

// Method to remove received connection request
userSchema.methods.removeReceivedConnectionRequest = function (fromUserId: string) {
  this.pendingConnectionRequests.received = this.pendingConnectionRequests.received.filter(
    (id: any) => id.toString() !== fromUserId
  );
  return this.save();
};

// Method to check connection status
userSchema.methods.getConnectionStatus = function (otherUserId: string) {
  if (this.connections.includes(otherUserId)) {
    return "connected";
  }
  if (this.pendingConnectionRequests.sent.includes(otherUserId)) {
    return "request_sent";
  }
  if (this.pendingConnectionRequests.received.includes(otherUserId)) {
    return "request_received";
  }
  return "not_connected";
};

// Pre-save middleware to update fullName
userSchema.pre("save", function (next) {
  if (this.firstName && this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
  next();
});

const User: IUserModel =
  (mongoose.models.User as IUserModel) || mongoose.model<IUser, IUserModel>("User", userSchema);

export default User;
