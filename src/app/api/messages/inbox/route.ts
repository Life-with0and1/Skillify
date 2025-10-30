import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import User from "@/models/User";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .lean();

    const otherIds = conversations.map((c: any) => c.participants.find((p: string) => p !== userId));
    const users = await User.find({ clerkId: { $in: otherIds } })
      .select("clerkId fullName avatar")
      .lean();
    const userByClerkId = new Map(users.map((u: any) => [u.clerkId, u]));

    const data = conversations.map((c: any) => {
      const otherId = c.participants.find((p: string) => p !== userId);
      const other = userByClerkId.get(otherId) || { clerkId: otherId, fullName: "Unknown", avatar: "/default-avatar.png" };
      return {
        id: String(c._id),
        other: { clerkId: other.clerkId, name: other.fullName, avatar: other.avatar || "/default-avatar.png" },
        lastMessage: c.lastMessage || "",
        lastSenderId: c.lastSenderId || null,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ conversations: data });
  } catch (e) {
    console.error("Inbox error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
