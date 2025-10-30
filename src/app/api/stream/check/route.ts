import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { StreamChat } from "stream-chat";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const API_KEY = process.env.STREAM_KEY;
    const API_SECRET = process.env.STREAM_SECRET;
    if (!API_KEY || !API_SECRET) {
      return NextResponse.json({ error: "Stream credentials missing" }, { status: 500 });
    }

    const url = new URL(req.url);
    const clerkIdParam = url.searchParams.get("clerkId");
    const targetId = clerkIdParam || userId;

    const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
    const res = await serverClient.queryUsers({ id: { $eq: targetId } });

    return NextResponse.json({ clerkId: targetId, exists: res.users.length > 0 });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}