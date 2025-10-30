import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User, { IUser } from "@/models/User";

interface ConnectionUser {
  clerkId: string;
  fullName: string;
  avatar?: string;
  _id: any; // MongoDB _id
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
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    await dbConnect();

    const me = await User.findOne({ clerkId: userId }).select("connections").lean();
    if (!me) {
      return NextResponse.json<ConnectionResponse>({ users: [] });
    }

    // Ensure connections is an array of MongoDB ObjectIds
    const connectionIds = Array.isArray(me.connections) 
      ? me.connections
      : [];

    if (connectionIds.length === 0) {
      return NextResponse.json<ConnectionResponse>({ users: [] });
    }

    const users = await User.find({ _id: { $in: connectionIds } })
      .select<keyof ConnectionUser>("clerkId fullName avatar")
      .lean<ConnectionUser[]>();

    const data = users.map((user: ConnectionUser) => ({
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
