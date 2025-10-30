import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { Types } from "mongoose";

interface ConnectionUser {
  clerkId: string;
  fullName: string;
  avatar?: string;
  _id: Types.ObjectId;
}

interface ConnectionResponse {
  users: Array<{
    clerkId: string;
    name: string;
    avatar: string;
  }>;
}

// GET /api/connections/list - return connected users for the current user
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ clerkId: userId })
      .select("connections")
      .lean();
    
    if (!user) {
      return NextResponse.json<ConnectionResponse>({ users: [] });
    }

    // Safely handle connections array
    const connectionIds = Array.isArray(user.connections) 
      ? user.connections
      : [];

    if (connectionIds.length === 0) {
      return NextResponse.json<ConnectionResponse>({ users: [] });
    }

    const users = await User.find(
      { _id: { $in: connectionIds } },
      { clerkId: 1, fullName: 1, avatar: 1 }
    ).lean<ConnectionUser[]>();

    const data = users.map((user) => ({
      clerkId: user.clerkId,
      name: user.fullName || 'Unknown User',
      avatar: user.avatar || "/default-avatar.png",
    }));

    return NextResponse.json<ConnectionResponse>({ users: data });
  } catch (error) {
    console.error("List connections error:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" }, 
      { status: 500 }
    );
  }
}
