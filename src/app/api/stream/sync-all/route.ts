import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { StreamChat } from "stream-chat";

async function syncAllImpl() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const API_KEY = process.env.STREAM_KEY;
  const API_SECRET = process.env.STREAM_SECRET;
  if (!API_KEY || !API_SECRET) {
    return NextResponse.json({ error: "Stream credentials missing" }, { status: 500 });
  }

  await dbConnect();
  const users = await User.find({}, "clerkId fullName firstName lastName avatar");

  const streamUsers = users.map((u: any) => ({
    id: u.clerkId,
    name: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
    image: u.avatar || undefined,
  }));

  const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
  await serverClient.upsertUsers(streamUsers);

  return NextResponse.json({ count: streamUsers.length, message: "Stream users synced" });
}

export async function POST(_req: NextRequest) {
  try {
    return await syncAllImpl();
  } catch (e) {
    console.error("Sync-all Stream users failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    return await syncAllImpl();
  } catch (e) {
    console.error("Sync-all Stream users failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
